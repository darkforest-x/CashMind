# CashMind API

Base URL:

```text
http://103.214.174.58:3000
```

## 鉴权模型

CashMind 1.0 有两个 token。

### `APP_ACCESS_TOKEN`

用于浏览器/PWA 的读写能力：

```text
Authorization: Bearer YOUR_APP_ACCESS_TOKEN
```

保护范围：

- 读取账单
- 新增、编辑、删除账单
- 读取和设置预算
- AI 分类

### `SHORTCUT_TOKEN`

用于 iPhone 快捷指令写入能力：

```text
Authorization: Bearer YOUR_SHORTCUT_TOKEN
```

保护范围：

- 万能捕获入口
- Wallet 导入
- 文本导入

`SHORTCUT_TOKEN` 不能读取账单，避免快捷指令 token 泄露后暴露全部财务数据。

## 公共接口

### 健康检查

```http
GET /api/health
```

响应：

```json
{"status":"ok"}
```

### App Token 状态

```http
GET /api/app/token
```

生产环境只返回是否配置和尾号：

```json
{
  "configured": true,
  "hint": "eb44"
}
```

### 快捷指令 Token 状态

```http
GET /api/shortcut/token
```

生产环境只返回是否配置和尾号：

```json
{
  "configured": true,
  "hint": "oken"
}
```

## 浏览器/PWA 接口

以下接口都需要 `APP_ACCESS_TOKEN`。

### 读取账单

```http
GET /api/transactions
```

示例：

```bash
curl http://103.214.174.58:3000/api/transactions \
  -H "Authorization: Bearer YOUR_APP_ACCESS_TOKEN"
```

### 新增账单

```http
POST /api/transactions
```

Body:

```json
{
  "amount": 32.5,
  "type": "expense",
  "category": "food",
  "date": "2026-07-02T10:00:00.000Z",
  "note": "星巴克拿铁",
  "source": "manual",
  "currency": "CNY"
}
```

### 更新账单

```http
PUT /api/transactions/:id
```

### 删除账单

```http
DELETE /api/transactions/:id
```

### 读取预算

```http
GET /api/budgets
```

### 设置预算

```http
POST /api/budgets
```

Body:

```json
{
  "amount": 5000,
  "month": "2026-07"
}
```

### AI 分类

```http
POST /api/ai/classify
```

Body:

```json
{
  "amount": 28,
  "note": "午餐 外卖"
}
```

## 快捷指令写入接口

以下接口都需要 `SHORTCUT_TOKEN`。

### 万能捕获入口

```http
POST /api/shortcut/capture
```

推荐给快捷指令使用这个入口。token 可以放在 Header、`x-cashmind-token`、JSON body 的 `token` 字段，或 URL query 的 `token` 字段。

Wallet / Apple Pay Body:

```json
{
  "token": "YOUR_SHORTCUT_TOKEN",
  "amount": 28,
  "merchant": "星巴克",
  "card": "招商银行",
  "currency": "CNY",
  "source": "wallet"
}
```

短信 / 邮件 / OCR Body:

```json
{
  "token": "YOUR_SHORTCUT_TOKEN",
  "text": "您尾号1234卡消费人民币28.00元，商户：星巴克",
  "source": "sms"
}
```

成功响应示例：

```json
{
  "success": true,
  "mode": "structured",
  "duplicate": false,
  "transaction": {
    "id": "..."
  },
  "confidence": 0.95
}
```

### Wallet 导入

```http
POST /api/ingest/wallet
```

兼容旧快捷指令。必须通过 Header 传 token：

```text
Authorization: Bearer YOUR_SHORTCUT_TOKEN
```

### 文本导入

```http
POST /api/ingest/text
```

兼容旧快捷指令。必须通过 Header 传 token。

Body:

```json
{
  "text": "您尾号1234卡消费人民币28.00元，商户：星巴克",
  "source": "sms"
}
```

`source` 可选：

- `sms`
- `email`
- `ocr`
- `shortcut`

## 错误响应

未授权：

```json
{"error":"Unauthorized"}
```

缺少必要字段：

```json
{"error":"A valid amount is required"}
```

文本无法识别交易：

```json
{
  "success": false,
  "error": "No transaction detected"
}
```

## 安全注意

- 不要把完整 token 写进文档、截图或聊天记录。
- 生产环境下 `/api/app/token` 和 `/api/shortcut/token` 不应该返回完整 token。
- 如果 token 泄露，立刻在 VPS `.env` 中替换并重启 PM2。
- 绑定 HTTPS 域名前，尽量不要在公共 Wi-Fi 下输入 token。
