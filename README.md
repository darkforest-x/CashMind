<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/23ba0bf0-1ce8-40eb-9e8a-f92d6fa6803a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 1.0 自动记账入口

CashMind 1.0 的核心是把 iPhone 快捷指令采集到的交易统一导入服务端，再由服务端完成解析、分类和去重。

所有自动化请求都需要带请求头：

```text
Authorization: Bearer YOUR_SHORTCUT_TOKEN
Content-Type: application/json
```

`YOUR_SHORTCUT_TOKEN` 来自服务端 `.env` 里的 `SHORTCUT_TOKEN`。生产部署后 `/api/shortcut/token` 只返回是否已配置和尾号，不会在公网展示完整 Token；在 App 的设置页把这个 Token 粘贴并保存到本机后，再复制到 iPhone 快捷指令的请求头里。

### Wallet / Apple Pay 全自动

快捷指令自动化触发器选择 **交易 / Wallet**，在刷 Wallet 卡后自动请求：

```http
POST /api/ingest/wallet
```

JSON Body 示例：

```json
{
  "amount": "Shortcut Input -> Amount",
  "merchant": "Shortcut Input -> Merchant",
  "currency": "CNY",
  "id": "optional-wallet-transaction-id"
}
```

### 短信、邮件、OCR 文本导入

短信、邮件和截图 OCR 都走同一个文本入口：

```http
POST /api/ingest/text
```

JSON Body 示例：

```json
{
  "text": "您尾号1234卡消费人民币28.00元，商户：星巴克",
  "source": "sms"
}
```

`source` 可选：`sms`、`email`、`ocr`、`shortcut`。服务端会优先使用 Gemini 解析；如果没有配置 `GEMINI_API_KEY` 或解析失败，会用本地规则兜底。重复请求会通过幂等键自动去重。

## Build iOS App (Capacitor)

1. Install dependencies:
   `npm install`
2. Build web assets:
   `npm run build`
3. Initialize Capacitor (first time only):
   `npx cap init`
4. Add iOS platform:
   `npm run cap:add:ios`
5. Sync assets:
   `npm run cap:sync`
6. Open Xcode:
   `npm run cap:open`

### Native API configuration

When running inside iOS app, browser origin is not an HTTP domain, so `/api/*` needs an explicit base URL.

Add this environment variable before build:

```
VITE_API_BASE_URL=https://your-backend-domain.com
```

Then run `npm run build && npm run cap:sync` again.

## Build, Archive, and Export iOS App

1. Make sure you have a valid backend URL set before building:
```bash
VITE_API_BASE_URL=https://your-backend-domain.com npm run build
```

2. Sync latest web assets to native project:
```bash
npm run cap:sync
```

3. Open Xcode:
```bash
npm run cap:open
```

4. In Xcode:
- Select **Product → Scheme → App** and **Any iOS Device**
- Set app version / build if needed:
  - `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`
- Choose **Product → Archive**

5. In the Organizer, export an `.ipa`:
- For App Store Connect: **Distribute App** -> App Store Connect
- For test distribution: **Distribute App** -> Ad Hoc / Development

### Command-line export (recommended for repeatable builds)

```bash
VITE_API_BASE_URL=https://your-backend-domain.com \
APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID \
IOS_EXPORT_METHOD=app-store \
npm run ios:archive
```

Optional env vars:
- `DEVELOPMENT_TEAM` / `APPLE_TEAM_ID` (default: empty, used to satisfy signing in archive + export)
- `IOS_SCHEME` (default: `App`)
- `IOS_CONFIGURATION` (default: `Release`)
- `IOS_WORKSPACE` (default: `ios/App/App.xcworkspace`)
- `IOS_EXPORT_PATH` (default: `ios/App/build/ipa`)
- `IOS_ARCHIVE_PATH` (default: `ios/App/build/cashmind.xcarchive`)
- `SKIP_WEB_BUILD=1` (skip `npm run build && npm run cap:sync`)
- `SKIP_SIGNING=1` (skip signing in archive for local validation, not for App Store upload)
- `SKIP_EXPORT=1` (archive only; skip `.ipa` export)
- `ALLOW_PROVISIONING_UPDATES=1` (default, allow Xcode to fetch provisioning when signed with Apple account)

### Note

For production use, set `VITE_API_BASE_URL` to HTTPS.

## Deploy API Backend to VPS

See [DEPLOY_VPS.md](/Users/zhangzc/Documents/指标/CashMind/DEPLOY_VPS.md) for a full deployment guide with PM2 + Nginx + `.env` and maintenance commands.
