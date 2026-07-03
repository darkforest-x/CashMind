# CashMind / 管钱花

CashMind 1.0 是一个先跑通浏览器端的无感记账产品：iPhone 快捷指令负责把交易推送到 VPS，浏览器/PWA 负责查看、补记、编辑、预算和统计。

当前 1.0 不优先做原生 iOS App。核心链路是：

```text
iPhone 快捷指令自动化
-> CashMind VPS API
-> 浏览器/PWA 查看和管理账单
```

## 当前部署

- VPS: `103.214.174.58`
- Web: `http://103.214.174.58:3000`
- Health: `http://103.214.174.58:3000/api/health`
- 远端目录: `/var/www/cashmind`
- 进程管理: `pm2`，进程名 `cashmind`

公网 IP 地址现在是 HTTP。浏览器可直接使用；完整 PWA 安装体验、Service Worker 缓存和更稳的 iPhone 主屏幕体验，后续建议绑定域名并启用 HTTPS。

## 1.0 范围

已包含：

- 手机浏览器/PWA 使用
- 浏览器/PWA 直接读取、编辑、预算和 AI 分类，不再要求授权码
- 服务端自动生成 `SHORTCUT_TOKEN`
- 快捷指令模板自动封装写入 token，用户不需要手拼 Header
- Wallet / Apple Pay 结构化导入
- 短信、邮件、OCR 文本导入
- SQLite 本地服务端数据库
- PM2 部署到 VPS

暂缓：

- 原生 iOS App、Xcode 签名、TestFlight、App Store
- 自动读取所有手机交易通知
- 多用户账号体系
- 银行/微信/支付宝官方账单直连

## 本地运行

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`.env.local` 至少需要：

```bash
HOST=127.0.0.1
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
```

`SHORTCUT_TOKEN` 可以不填；服务端首次启动会自动生成并写入 `.env`。本地如需固定测试值，也可以手动放进 `.env.local`。

`GEMINI_API_KEY` 缺失或不可用时，文本导入会尝试使用本地规则兜底，但 AI 分类和复杂文本解析效果会下降。

## 生产部署

常用部署方式：

```bash
git push origin main
ssh root@103.214.174.58
cd /var/www/cashmind
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

详细部署、回滚、备份和 token 轮换见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 和 [docs/OPERATIONS.md](docs/OPERATIONS.md)。

## 文档

- [文档索引](docs/INDEX.md)
- [1.0 产品范围](docs/PRODUCT_1_0.md)
- [浏览器/PWA 使用说明](docs/PWA_BROWSER.md)
- [iPhone 快捷指令配置](docs/SHORTCUTS.md)
- [API 接口说明](docs/API.md)
- [VPS 部署说明](docs/DEPLOYMENT.md)
- [运维手册](docs/OPERATIONS.md)

## 验证命令

```bash
npm run lint
npm run build
curl http://103.214.174.58:3000/api/health
```

期望健康检查返回：

```json
{"status":"ok"}
```
