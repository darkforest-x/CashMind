# 浏览器/PWA 使用说明

CashMind 1.0 先作为浏览器端产品使用。iPhone 上可以通过 Safari 添加到主屏幕，体验接近 App，但不需要 Xcode、签名或 App Store。

## 访问地址

当前 VPS 地址：

```text
http://103.214.174.58:3000
```

首次打开后，需要在设置页保存 `APP_ACCESS_TOKEN`，否则账单读取接口会返回 `401 Unauthorized`。

## 首次配置

1. 用手机浏览器打开 `http://103.214.174.58:3000`。
2. 进入底部导航的“设置”。
3. 在“App 访问 Token”输入 VPS `.env` 里的 `APP_ACCESS_TOKEN`。
4. 点击“保存”。
5. 页面会自动重新拉取账单。
6. 在“快捷指令 Token”输入 `SHORTCUT_TOKEN`，用于复制到 iPhone 快捷指令。

## 添加到 iPhone 主屏幕

Safari:

1. 打开 CashMind 地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 名称保留“管钱花”或改成“CashMind”。
5. 从主屏幕打开。

Chrome iOS:

1. 打开 CashMind 地址。
2. 点击分享。
3. 选择“添加到主屏幕”。

## HTTP 和 HTTPS 的区别

当前 IP 地址是 HTTP，可以正常打开和使用核心记账功能。

但完整 PWA 能力建议使用 HTTPS：

- Service Worker 缓存通常要求 HTTPS 或 localhost。
- iPhone 主屏幕体验更稳定。
- Token 传输更安全。
- 后续接入系统能力和浏览器权限更顺。

建议后续绑定域名，例如：

```text
https://cashmind.your-domain.com
```

然后把快捷指令请求地址从 IP 改成 HTTPS 域名。

## 日常使用流程

```text
刷卡或产生交易
-> 快捷指令自动发送到 VPS
-> 打开 CashMind 浏览器/PWA
-> 查看近期流水
-> 必要时编辑分类、备注、金额
-> 查看统计和预算
```

## 常见问题

### 页面提示连接个人服务失败

通常是下面几种情况：

- `APP_ACCESS_TOKEN` 没填或填错。
- VPS 服务没有启动。
- 手机网络无法访问 VPS。
- 地址用了 HTTPS，但服务器还没有配置证书。

先检查：

```bash
curl http://103.214.174.58:3000/api/health
```

### 已添加到主屏幕，但离线打不开

当前 IP HTTP 部署不保证完整离线缓存。等绑定 HTTPS 域名后，再优化 PWA 缓存策略。

### 换手机后账单没了

账单在 VPS SQLite 数据库里，不在手机本地。换手机后重新打开地址并填入 `APP_ACCESS_TOKEN` 即可。
