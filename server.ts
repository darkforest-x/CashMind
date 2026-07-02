import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createHash, randomUUID } from "crypto";
import Database from "better-sqlite3";
import { formatISO, subDays } from "date-fns";
import { GoogleGenAI, Type } from "@google/genai";
import { buildTokenStatus, isAppSessionAuthorized, isBearerAuthorized, setAppSessionCookie } from "./server/auth";
import { loadRuntimeEnv } from "./server/runtimeEnv";

loadRuntimeEnv();

let ai: GoogleGenAI | null = null;

type TransactionType = "income" | "expense";
type CurrencyCode = "CNY" | "USD" | "EUR" | "JPY";
type IngestSource = "shortcut" | "wallet" | "sms" | "email" | "ocr" | "import";

type ParsedTransaction = {
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
  source: IngestSource;
  currency: CurrencyCode;
  confidence: number;
};

type StoredTransaction = Omit<ParsedTransaction, "confidence"> & {
  id: string;
};

type ParsedIngestResult = {
  transaction: ParsedTransaction | null;
  parser: "gemini" | "rules";
  reason?: string;
};

const VALID_CATEGORIES = new Set([
  "food",
  "shopping",
  "transport",
  "coffee",
  "entertainment",
  "housing",
  "salary",
  "other",
]);

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: "coffee", keywords: ["咖啡", "星巴克", "瑞幸", "茶", "奶茶", "饮品", "cafe", "coffee"] },
  { category: "food", keywords: ["餐", "饭", "外卖", "美团", "饿了么", "食", "店", "麦当劳", "肯德基", "盒马", "超市"] },
  { category: "transport", keywords: ["打车", "滴滴", "地铁", "公交", "停车", "高铁", "机票", "交通", "taxi", "uber"] },
  { category: "shopping", keywords: ["淘宝", "京东", "拼多多", "购物", "商场", "便利店", "超市", "mall", "store"] },
  { category: "entertainment", keywords: ["电影", "游戏", "娱乐", "会员", "音乐", "视频", "票"] },
  { category: "housing", keywords: ["房租", "物业", "水电", "燃气", "宽带", "居住"] },
  { category: "salary", keywords: ["工资", "薪资", "奖金", "收入", "转入", "收款"] },
];

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite Database
const db = new Database(path.join(dataDir, "cashmind.db"));

// Create transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    source TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY'
  )
`);

// Support existing databases by adding currency column if it doesn't exist
try {
  db.exec("ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'CNY'");
} catch (e) {
  // Column likely already exists
}

// Create budgets table
db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    month TEXT NOT NULL UNIQUE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ingest_events (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    transaction_id TEXT,
    raw_payload TEXT,
    created_at TEXT NOT NULL
  )
`);

// Seed initial data if empty
const countStmt = db.prepare("SELECT COUNT(*) as count FROM transactions");
const { count } = countStmt.get() as { count: number };

if (count === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, amount, type, category, date, note, source, currency)
    VALUES (@id, @amount, @type, @category, @date, @note, @source, @currency)
  `);
  
  const today = new Date();
  const initialData = [
    { id: 't1', amount: 32.5, type: 'expense', category: 'coffee', date: formatISO(today), note: '星巴克拿铁', source: 'shortcut', currency: 'CNY' },
    { id: 't2', amount: 15.0, type: 'expense', category: 'transport', date: formatISO(today), note: '打车', source: 'shortcut', currency: 'CNY' },
    { id: 't3', amount: 120.0, type: 'expense', category: 'food', date: formatISO(subDays(today, 1)), note: '外卖晚餐', source: 'shortcut', currency: 'CNY' },
    { id: 't4', amount: 50.0, type: 'expense', category: 'shopping', date: formatISO(subDays(today, 1)), note: '便利店', source: 'manual', currency: 'CNY' },
    { id: 't5', amount: 15000.0, type: 'income', category: 'salary', date: formatISO(subDays(today, 2)), note: '本月工资', source: 'manual', currency: 'CNY' },
  ];

  const insertMany = db.transaction((data) => {
    for (const item of data) {
      insertStmt.run(item);
    }
  });
  insertMany(initialData);
}

const insertTransactionStmt = db.prepare(`
  INSERT INTO transactions (id, amount, type, category, date, note, source, currency)
  VALUES (@id, @amount, @type, @category, @date, @note, @source, @currency)
`);

const insertIngestEventStmt = db.prepare(`
  INSERT INTO ingest_events (id, source, dedupe_key, transaction_id, raw_payload, created_at)
  VALUES (@id, @source, @dedupe_key, @transaction_id, @raw_payload, @created_at)
`);

const persistIngestedTransaction = db.transaction((transaction: StoredTransaction, event: {
  id: string;
  source: string;
  dedupe_key: string;
  transaction_id: string;
  raw_payload: string;
  created_at: string;
}) => {
  insertTransactionStmt.run(transaction);
  insertIngestEventStmt.run(event);
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function readBoolean(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true || body[key] === "true" || body[key] === 1;
}

function readQueryString(req: express.Request, key: string): string {
  const value = req.query[key];
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const firstString = value.find((item): item is string => typeof item === "string");
    return firstString?.trim() || "";
  }
  return "";
}

function normalizeCurrency(value: unknown): CurrencyCode {
  const text = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (text === "USD") return "USD";
  if (text === "EUR") return "EUR";
  if (text === "JPY") return "JPY";
  return "CNY";
}

function normalizeType(value: unknown, context = ""): TransactionType {
  if (value === "income" || value === "收入") return "income";
  if (value === "expense" || value === "支出") return "expense";

  const text = context.toLowerCase();
  if (/(收入|入账|收款|退款|返现|工资|奖金|转入|refund|income|salary)/i.test(text)) {
    return "income";
  }
  return "expense";
}

function normalizeSource(value: unknown, fallback: IngestSource): IngestSource {
  if (value === "wallet") return "wallet";
  if (value === "sms") return "sms";
  if (value === "email") return "email";
  if (value === "ocr") return "ocr";
  if (value === "import") return "import";
  if (value === "shortcut") return "shortcut";
  return fallback;
}

function normalizeCategory(value: unknown, context = ""): string {
  if (typeof value === "string" && VALID_CATEGORIES.has(value)) {
    return value;
  }
  return inferCategory(context);
}

function inferCategory(context: string): string {
  const text = context.toLowerCase();
  for (const item of CATEGORY_KEYWORDS) {
    if (item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return item.category;
    }
  }
  return "other";
}

function coerceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value);
  }
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return null;
  }

  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }
  return Math.abs(amount);
}

function extractAmountFromText(text: string): number | null {
  const amountPatterns = [
    /(?:实付|支付|付款|消费|支出|扣款|金额|交易金额|人民币|合计|总计)\s*[:：]?\s*[¥￥]?\s*(-?\d+(?:,\d{3})*(?:\.\d{1,2})?)/i,
    /[¥￥]\s*(-?\d+(?:,\d{3})*(?:\.\d{1,2})?)/,
    /(-?\d+(?:,\d{3})*(?:\.\d{1,2}))\s*(?:元|CNY|RMB|人民币)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = coerceAmount(match[1]);
      if (amount !== null) return amount;
    }
  }

  return null;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return formatISO(new Date());
  }

  const text = value.trim();
  const chineseMatch = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日号]?\s*(\d{1,2})?[:：]?(\d{1,2})?/);
  if (chineseMatch) {
    const [, year, month, day, hour = "0", minute = "0"] = chineseMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (!Number.isNaN(parsed.getTime())) {
      return formatISO(parsed);
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatISO(parsed);
  }
  return formatISO(new Date());
}

function normalizeConfidence(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numberValue));
}

function buildFallbackNote(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item && !/^\d+([.,]\d+)?$/.test(item));
  return (line || "自动导入账单").slice(0, 80);
}

function parseTextByRules(text: string, source: IngestSource): ParsedIngestResult {
  const amount = extractAmountFromText(text);
  if (amount === null) {
    return { transaction: null, parser: "rules", reason: "No amount detected" };
  }

  const note = buildFallbackNote(text);
  const transaction: ParsedTransaction = {
    amount,
    type: normalizeType(undefined, text),
    category: inferCategory(text),
    date: normalizeDate(text),
    note,
    source,
    currency: normalizeCurrency(text),
    confidence: 0.55,
  };

  return { transaction, parser: "rules" };
}

function normalizeParsedAiTransaction(value: unknown, rawText: string, source: IngestSource): ParsedTransaction | null {
  if (!isRecord(value)) {
    return null;
  }

  const shouldImport = value.shouldImport !== false;
  const amount = coerceAmount(value.amount);
  if (!shouldImport || amount === null) {
    return null;
  }

  const note = readString(value, ["note", "merchant", "name", "description"]) || buildFallbackNote(rawText);
  return {
    amount,
    type: normalizeType(value.type, rawText),
    category: normalizeCategory(value.category, rawText),
    date: normalizeDate(readString(value, ["date", "time", "createdAt"])),
    note,
    source,
    currency: normalizeCurrency(value.currency),
    confidence: normalizeConfidence(value.confidence, 0.75),
  };
}

async function parseTextTransaction(text: string, source: IngestSource): Promise<ParsedIngestResult> {
  const client = getAiClient();
  if (!client) {
    return parseTextByRules(text, source);
  }

  const prompt = `你是 CashMind 的账单导入解析器。请从下面的 Wallet、短信、邮件或 OCR 文本中识别一笔交易。

当前时间：${formatISO(new Date())}

可选分类ID：
- food 餐饮
- shopping 购物
- transport 交通
- coffee 咖啡饮品
- entertainment 娱乐
- housing 居住
- salary 工资收入
- other 其他

要求：
1. 只返回 JSON。
2. 如果不是账单或无法确定金额，shouldImport=false，amount=0。
3. date 尽量返回 ISO 8601；没有时间就用当前时间。
4. note 用商户、对方或简短说明。

原文：
${text}`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shouldImport: { type: Type.BOOLEAN },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            note: { type: Type.STRING },
            merchant: { type: Type.STRING },
            currency: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["shouldImport", "amount", "type", "category", "date", "note", "currency", "confidence"],
        },
      },
    });

    const jsonText = response.text?.trim() || "{}";
    const parsed: unknown = JSON.parse(jsonText);
    const transaction = normalizeParsedAiTransaction(parsed, text, source);
    if (transaction) {
      return { transaction, parser: "gemini" };
    }
  } catch (error) {
    console.error("AI ingest parse failed, falling back to rules:", error);
  }

  return parseTextByRules(text, source);
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function findIngestDuplicate(dedupeKey: string): StoredTransaction | null {
  const event = db
    .prepare("SELECT transaction_id FROM ingest_events WHERE dedupe_key = ?")
    .get(dedupeKey) as { transaction_id: string } | undefined;

  if (!event?.transaction_id) {
    return null;
  }

  return (db
    .prepare("SELECT * FROM transactions WHERE id = ?")
    .get(event.transaction_id) as StoredTransaction | undefined) || null;
}

function buildDedupeKey(source: IngestSource, transaction: ParsedTransaction, rawPayload: unknown, externalId = ""): string {
  if (externalId) {
    return `${source}:external:${hashValue(externalId)}`;
  }

  const note = transaction.note.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  const raw = safeStringify(rawPayload).slice(0, 500);
  return `${source}:auto:${hashValue([
    transaction.date.slice(0, 16),
    transaction.amount.toFixed(2),
    transaction.type,
    transaction.category,
    note,
    raw,
  ].join("|"))}`;
}

function saveIngestedTransaction(
  transaction: ParsedTransaction,
  options: { rawPayload: unknown; externalId?: string; dryRun?: boolean },
) {
  const dedupeKey = buildDedupeKey(transaction.source, transaction, options.rawPayload, options.externalId);
  const duplicate = findIngestDuplicate(dedupeKey);
  if (duplicate) {
    return { duplicate: true, transaction: duplicate, dedupeKey };
  }

  const storedTransaction: StoredTransaction = {
    id: randomUUID(),
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    date: transaction.date,
    note: transaction.note,
    source: transaction.source,
    currency: transaction.currency,
  };

  if (options.dryRun) {
    return { duplicate: false, transaction: storedTransaction, dedupeKey };
  }

  try {
    persistIngestedTransaction(storedTransaction, {
      id: randomUUID(),
      source: transaction.source,
      dedupe_key: dedupeKey,
      transaction_id: storedTransaction.id,
      raw_payload: safeStringify(options.rawPayload),
      created_at: formatISO(new Date()),
    });
  } catch (error) {
    const duplicateAfterRace = findIngestDuplicate(dedupeKey);
    if (duplicateAfterRace) {
      return { duplicate: true, transaction: duplicateAfterRace, dedupeKey };
    }
    throw error;
  }

  return { duplicate: false, transaction: storedTransaction, dedupeKey };
}

function buildStructuredTransaction(body: Record<string, unknown>, fallbackSource: IngestSource): ParsedTransaction | null {
  const amount = coerceAmount(body.amount ?? body.Amount ?? body.total ?? body.value);
  if (amount === null) {
    return null;
  }

  const merchant = readString(body, ["merchant", "Merchant", "name", "Name", "payee", "title"]);
  const card = readString(body, ["card", "Card", "account"]);
  const note = readString(body, ["note", "description"]) || merchant || card || "Wallet 交易";
  const sourceText = [merchant, card, note].filter(Boolean).join(" ");
  return {
    amount,
    type: normalizeType(body.type, sourceText),
    category: normalizeCategory(body.category, sourceText),
    date: normalizeDate(readString(body, ["date", "time", "createdAt"])),
    note,
    source: normalizeSource(body.source, fallbackSource),
    currency: normalizeCurrency(body.currency),
    confidence: 0.95,
  };
}

function buildRequestBody(req: express.Request): Record<string, unknown> {
  const body = req.body;
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      return { text: trimmed };
    }
    return { text: trimmed };
  }
  return isRecord(body) ? body : {};
}

function buildShortcutCaptureBody(req: express.Request): Record<string, unknown> {
  return buildRequestBody(req);
}

function isAuthorizedShortcutCaptureRequest(req: express.Request, body: Record<string, unknown>): boolean {
  const expectedToken = process.env.SHORTCUT_TOKEN;
  if (!expectedToken) {
    return false;
  }
  if (isBearerAuthorized(req, expectedToken)) {
    return true;
  }

  const bodyToken = readString(body, ["token", "shortcutToken", "SHORTCUT_TOKEN"]);
  const queryToken = readQueryString(req, "token") || readQueryString(req, "shortcutToken");
  const headerToken = req.get("x-cashmind-token")?.trim() || "";
  return bodyToken === expectedToken || queryToken === expectedToken || headerToken === expectedToken;
}

function isAuthorizedShortcutRequest(req: express.Request): boolean {
  return isBearerAuthorized(req, process.env.SHORTCUT_TOKEN);
}

function isAuthorizedAppRequest(req: express.Request): boolean {
  return isBearerAuthorized(req, process.env.APP_ACCESS_TOKEN) || isAppSessionAuthorized(req, process.env.APP_ACCESS_TOKEN);
}

function isAuthorizedSetupRequest(body: Record<string, unknown>): boolean {
  const expectedToken = process.env.SETUP_TOKEN;
  const setupToken = readString(body, ["setupToken", "setup", "token"]);
  return Boolean(expectedToken && setupToken === expectedToken);
}

function requireAppAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isAuthorizedAppRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function shouldExposeShortcutToken(): boolean {
  return process.env.EXPOSE_SHORTCUT_TOKEN === "1" || process.env.NODE_ENV !== "production";
}

function shouldExposeAppAccessToken(): boolean {
  return process.env.EXPOSE_APP_ACCESS_TOKEN === "1" || process.env.NODE_ENV !== "production";
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  app.use(express.json({ limit: "2mb" }));
  app.use(express.text({ type: "text/plain", limit: "2mb" }));
  app.use(express.urlencoded({ extended: false, limit: "2mb" }));
  const appApi = express.Router();
  appApi.use(requireAppAccess);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/app/session", (req, res) => {
    res.json({ authorized: isAuthorizedAppRequest(req) });
  });

  app.post("/api/app/session", (req, res) => {
    const appAccessToken = process.env.APP_ACCESS_TOKEN;
    if (!appAccessToken || !isAuthorizedSetupRequest(buildRequestBody(req))) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const isSecureRequest = req.secure || req.get("x-forwarded-proto") === "https";
    setAppSessionCookie(res, appAccessToken, isSecureRequest);
    res.json({ success: true });
  });

  appApi.get("/transactions", (req, res) => {
    const stmt = db.prepare("SELECT * FROM transactions ORDER BY date DESC");
    const transactions = stmt.all();
    res.json(transactions);
  });

  appApi.post("/transactions", (req, res) => {
    const newTx = {
      id: Date.now().toString(),
      amount: req.body.amount,
      type: req.body.type,
      category: req.body.category,
      date: req.body.date || formatISO(new Date()),
      note: req.body.note || '',
      source: req.body.source || 'manual',
      currency: req.body.currency || 'CNY',
    };
    
    const stmt = db.prepare(`
      INSERT INTO transactions (id, amount, type, category, date, note, source, currency)
      VALUES (@id, @amount, @type, @category, @date, @note, @source, @currency)
    `);
    stmt.run(newTx);
    
    res.json(newTx);
  });

  appApi.get("/budgets", (req, res) => {
    const stmt = db.prepare("SELECT * FROM budgets ORDER BY month DESC");
    const budgets = stmt.all();
    res.json(budgets);
  });

  appApi.post("/budgets", (req, res) => {
    const { amount, month } = req.body;
    if (!amount || !month) {
      return res.status(400).json({ error: "Amount and month are required" });
    }

    const newBudget = {
      id: Date.now().toString(),
      amount,
      month,
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO budgets (id, amount, month)
        VALUES (@id, @amount, @month)
        ON CONFLICT(month) DO UPDATE SET amount = @amount
      `);
      stmt.run(newBudget);
      res.json(newBudget);
    } catch (error) {
      console.error("Failed to save budget:", error);
      res.status(500).json({ error: "Failed to save budget" });
    }
  });

  appApi.post("/ai/classify", async (req, res) => {
    try {
      const { amount, note } = req.body;
      if (!amount || !note) {
        return res.status(400).json({ error: "Amount and note are required" });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const prompt = `根据以下消费信息，推测最可能的 3 个消费分类及概率。
金额：${amount}
备注：${note}

可选分类ID：
- food (餐饮)
- shopping (购物)
- transport (交通)
- coffee (咖啡/饮品)
- entertainment (娱乐)
- housing (居住)
- salary (工资/收入)
- other (其他)

请返回 JSON 数组，包含 category (分类ID) 和 probability (0-1之间的概率，保留两位小数)。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description: "分类ID",
                },
                probability: {
                  type: Type.NUMBER,
                  description: "概率 (0-1)",
                },
              },
              required: ["category", "probability"],
            },
          },
        },
      });

      const jsonStr = response.text?.trim() || "[]";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error) {
      console.error("AI Classification Error:", error);
      res.status(500).json({ error: "Failed to classify" });
    }
  });

  appApi.put("/transactions/:id", (req, res) => {
    const { amount, type, category, date, note, source, currency } = req.body;
    const stmt = db.prepare(`
      UPDATE transactions 
      SET amount = @amount, type = @type, category = @category, date = @date, note = @note, source = @source, currency = @currency
      WHERE id = @id
    `);
    
    stmt.run({
      id: req.params.id,
      amount,
      type,
      category,
      date,
      note,
      source,
      currency: currency || 'CNY'
    });
    
    res.json({ success: true });
  });

  appApi.delete("/transactions/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/ingest/wallet", (req, res) => {
    if (!isAuthorizedShortcutRequest(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = isRecord(req.body) ? req.body : {};
    const transaction = buildStructuredTransaction(body, "wallet");
    if (!transaction) {
      return res.status(400).json({ error: "A valid amount is required" });
    }

    try {
      const externalId = readString(body, ["id", "transactionId", "externalId"]);
      const saved = saveIngestedTransaction(transaction, {
        rawPayload: body,
        externalId,
        dryRun: readBoolean(body, "dryRun"),
      });

      res.json({
        success: true,
        source: "wallet",
        parser: "structured",
        duplicate: saved.duplicate,
        transaction: saved.transaction,
        confidence: transaction.confidence,
      });
    } catch (error) {
      console.error("Failed to ingest wallet transaction:", error);
      res.status(500).json({ error: "Failed to ingest wallet transaction" });
    }
  });

  app.post("/api/shortcut/capture", async (req, res) => {
    const body = buildShortcutCaptureBody(req);
    if (!isAuthorizedShortcutCaptureRequest(req, body)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const structuredTransaction = buildStructuredTransaction(body, "wallet");
    if (structuredTransaction) {
      try {
        const saved = saveIngestedTransaction(structuredTransaction, {
          rawPayload: body,
          externalId: readString(body, ["id", "transactionId", "externalId"]),
          dryRun: readBoolean(body, "dryRun"),
        });
        return res.json({
          success: true,
          mode: "structured",
          duplicate: saved.duplicate,
          transaction: saved.transaction,
          confidence: structuredTransaction.confidence,
        });
      } catch (error) {
        console.error("Failed to capture structured shortcut transaction:", error);
        return res.status(500).json({ error: "Failed to capture transaction" });
      }
    }

    const text = readString(body, ["text", "rawText", "message", "body", "content"]);
    if (!text) {
      return res.status(400).json({ error: "Amount or text is required" });
    }

    const source = normalizeSource(body.source, "shortcut");
    try {
      const parsed = await parseTextTransaction(text, source);
      if (!parsed.transaction) {
        return res.status(422).json({
          success: false,
          error: "No transaction detected",
          parser: parsed.parser,
          reason: parsed.reason,
        });
      }

      const saved = saveIngestedTransaction(parsed.transaction, {
        rawPayload: body,
        externalId: readString(body, ["id", "messageId", "mailId", "externalId"]),
        dryRun: readBoolean(body, "dryRun"),
      });
      return res.json({
        success: true,
        mode: "text",
        parser: parsed.parser,
        duplicate: saved.duplicate,
        transaction: saved.transaction,
        confidence: parsed.transaction.confidence,
      });
    } catch (error) {
      console.error("Failed to capture shortcut text transaction:", error);
      return res.status(500).json({ error: "Failed to capture transaction" });
    }
  });

  app.post("/api/ingest/text", async (req, res) => {
    if (!isAuthorizedShortcutRequest(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = isRecord(req.body) ? req.body : {};
    const text = readString(body, ["text", "rawText", "message", "body", "content"]);
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const source = normalizeSource(body.source, "shortcut");
    try {
      const parsed = await parseTextTransaction(text, source);
      if (!parsed.transaction) {
        return res.status(422).json({
          success: false,
          error: "No transaction detected",
          parser: parsed.parser,
          reason: parsed.reason,
        });
      }

      const externalId = readString(body, ["id", "messageId", "mailId", "externalId"]);
      const saved = saveIngestedTransaction(parsed.transaction, {
        rawPayload: body,
        externalId,
        dryRun: readBoolean(body, "dryRun"),
      });

      res.json({
        success: true,
        source,
        parser: parsed.parser,
        duplicate: saved.duplicate,
        transaction: saved.transaction,
        confidence: parsed.transaction.confidence,
      });
    } catch (error) {
      console.error("Failed to ingest text transaction:", error);
      res.status(500).json({ error: "Failed to ingest text transaction" });
    }
  });

  app.get("/api/shortcut/token", (req, res) => {
    res.json(buildTokenStatus(process.env.SHORTCUT_TOKEN, isAuthorizedAppRequest(req) || shouldExposeShortcutToken()));
  });

  app.get("/api/app/token", (req, res) => {
    res.json(buildTokenStatus(process.env.APP_ACCESS_TOKEN, shouldExposeAppAccessToken()));
  });

  app.post("/api/shortcut/add", (req, res) => {
    if (!isAuthorizedShortcutRequest(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { amount, type, category, note } = req.body;
    
    if (!amount || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTx = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      type,
      category,
      date: formatISO(new Date()),
      note: note || '',
      source: 'shortcut',
      currency: 'CNY',
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO transactions (id, amount, type, category, date, note, source, currency)
        VALUES (@id, @amount, @type, @category, @date, @note, @source, @currency)
      `);
      stmt.run(newTx);
      res.json({ success: true, transaction: newTx });
    } catch (error) {
      console.error("Failed to add shortcut transaction:", error);
      res.status(500).json({ error: "Failed to save transaction" });
    }
  });

  app.use("/api", appApi);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
