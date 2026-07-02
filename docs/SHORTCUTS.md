# iPhone 快捷指令配置

CashMind 的无感采集依赖 iPhone 快捷指令把交易推送到 VPS。浏览器/PWA 只负责查看和管理账单，不负责后台监听手机交易。

## 地址和配置包

生产地址：

```text
http://103.214.174.58:3000
```

`SHORTCUT_TOKEN` 由服务端自动生成。用户不需要去 `.env` 复制它，也不需要在快捷指令里手动配置 Header。

先用设置链接授权浏览器，然后在 CashMind 设置页点击“复制完整配置包”。配置包会包含已封装 token 的万能入口 URL。

万能入口：

```text
POST http://103.214.174.58:3000/api/shortcut/capture?token=...
```

旧接口 `/api/ingest/wallet` 和 `/api/ingest/text` 仍保留，但 1.0 配置优先使用万能入口。

## 方案 A: Wallet / Apple Pay 交易自动化

适用场景：Apple Pay 或 Wallet 支付后，系统触发快捷指令。

快捷指令自动化：

1. 打开“快捷指令”App。
2. 进入“自动化”。
3. 新建个人自动化。
4. 选择“交易”或 Wallet 相关触发器。
5. 选择要监听的卡片。
6. 设置为立即运行，关闭运行前询问。
7. 添加“获取 URL 内容”动作。

请求配置：

```text
URL: 设置页复制的万能入口 URL
Method: POST
Request Body: JSON
```

JSON Body 示例：

```json
{
  "amount": "快捷指令输入里的金额",
  "merchant": "快捷指令输入里的商户",
  "card": "快捷指令输入里的卡片",
  "currency": "CNY",
  "source": "wallet"
}
```

不同 iOS 版本暴露出来的 Wallet 字段名称可能不同。关键是至少传入 `amount`，最好同时传入 `merchant`；没有时间字段时服务端会自动使用当前时间。

## 方案 B: 短信触发导入

适用场景：银行卡消费短信、信用卡短信、银行通知短信。

快捷指令自动化：

1. 新建个人自动化。
2. 选择“信息”触发器。
3. 限定发件人或关键词，例如“消费”“支出”“人民币”“交易”。
4. 添加“获取 URL 内容”。

请求地址使用同一个万能入口。

JSON Body 示例：

```json
{
  "text": "短信正文",
  "source": "sms"
}
```

服务端会优先用 Gemini 解析金额、商户、时间和分类；不可用时使用本地规则兜底。

## 方案 C: 邮件账单导入

适用场景：银行、信用卡、支付平台发送消费邮件。

请求地址使用同一个万能入口。

JSON Body 示例：

```json
{
  "text": "邮件标题和正文",
  "source": "email"
}
```

建议优先过滤发件人和关键词，避免把非交易邮件发到服务端。

## 方案 D: OCR 文本导入

适用场景：微信、支付宝、银行 App 截图账单。

流程：

1. 截图账单。
2. 用快捷指令提取图片文字。
3. 把 OCR 文本发到万能入口。

JSON Body 示例：

```json
{
  "text": "OCR 识别出的账单文本",
  "source": "ocr"
}
```

## 验证快捷指令是否成功

在 VPS 上看日志：

```bash
ssh root@103.214.174.58
pm2 logs cashmind
```

用浏览器打开 CashMind，查看“近期流水”是否出现新账单。

也可以用 curl 模拟：

```bash
curl -X POST "设置页复制的万能入口 URL" \
  -H "Content-Type: application/json" \
  -d '{"amount":18.8,"merchant":"测试商户","currency":"CNY"}'
```

## 重要边界

- 快捷指令不能读取所有 App 的通知内容。
- 浏览器/PWA 不能在后台监听 Wallet、短信、微信、支付宝。
- 部分触发器可能需要 iOS 版本支持。
- 如果某个支付渠道没有系统触发器，优先走短信、邮件、OCR 或手动补记。
- 快捷指令密钥只能写入，不能读取账单。
- 万能入口 URL 带有 token，不要截图公开。
