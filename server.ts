import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { formatISO, subDays } from "date-fns";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    source TEXT NOT NULL
  )
`);

// Create budgets table
db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    month TEXT NOT NULL UNIQUE
  )
`);

// Seed initial data if empty
const countStmt = db.prepare("SELECT COUNT(*) as count FROM transactions");
const { count } = countStmt.get() as { count: number };

if (count === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, amount, type, category, date, note, source)
    VALUES (@id, @amount, @type, @category, @date, @note, @source)
  `);
  
  const today = new Date();
  const initialData = [
    { id: 't1', amount: 32.5, type: 'expense', category: 'coffee', date: formatISO(today), note: '星巴克拿铁', source: 'shortcut' },
    { id: 't2', amount: 15.0, type: 'expense', category: 'transport', date: formatISO(today), note: '打车', source: 'shortcut' },
    { id: 't3', amount: 120.0, type: 'expense', category: 'food', date: formatISO(subDays(today, 1)), note: '外卖晚餐', source: 'shortcut' },
    { id: 't4', amount: 50.0, type: 'expense', category: 'shopping', date: formatISO(subDays(today, 1)), note: '便利店', source: 'manual' },
    { id: 't5', amount: 15000.0, type: 'income', category: 'salary', date: formatISO(subDays(today, 2)), note: '本月工资', source: 'manual' },
  ];

  const insertMany = db.transaction((data) => {
    for (const item of data) {
      insertStmt.run(item);
    }
  });
  insertMany(initialData);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/transactions", (req, res) => {
    const stmt = db.prepare("SELECT * FROM transactions ORDER BY date DESC");
    const transactions = stmt.all();
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const newTx = {
      id: Date.now().toString(),
      amount: req.body.amount,
      type: req.body.type,
      category: req.body.category,
      date: req.body.date || formatISO(new Date()),
      note: req.body.note || '',
      source: req.body.source || 'manual',
    };
    
    const stmt = db.prepare(`
      INSERT INTO transactions (id, amount, type, category, date, note, source)
      VALUES (@id, @amount, @type, @category, @date, @note, @source)
    `);
    stmt.run(newTx);
    
    res.json(newTx);
  });

  app.get("/api/budgets", (req, res) => {
    const stmt = db.prepare("SELECT * FROM budgets ORDER BY month DESC");
    const budgets = stmt.all();
    res.json(budgets);
  });

  app.post("/api/budgets", (req, res) => {
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

  app.post("/api/ai/classify", async (req, res) => {
    try {
      const { amount, note } = req.body;
      if (!amount || !note) {
        return res.status(400).json({ error: "Amount and note are required" });
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

  app.put("/api/transactions/:id", (req, res) => {
    const { amount, type, category, date, note, source } = req.body;
    const stmt = db.prepare(`
      UPDATE transactions 
      SET amount = @amount, type = @type, category = @category, date = @date, note = @note, source = @source
      WHERE id = @id
    `);
    
    stmt.run({
      id: req.params.id,
      amount,
      type,
      category,
      date,
      note,
      source
    });
    
    res.json({ success: true });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/shortcut/token", (req, res) => {
    const token = process.env.SHORTCUT_TOKEN || '请在 .env 文件中设置 SHORTCUT_TOKEN';
    res.json({ token });
  });

  app.post("/api/shortcut/add", (req, res) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.SHORTCUT_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
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
    };
    
    try {
      const stmt = db.prepare(`
        INSERT INTO transactions (id, amount, type, category, date, note, source)
        VALUES (@id, @amount, @type, @category, @date, @note, @source)
      `);
      stmt.run(newTx);
      res.json({ success: true, transaction: newTx });
    } catch (error) {
      console.error("Failed to add shortcut transaction:", error);
      res.status(500).json({ error: "Failed to save transaction" });
    }
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
