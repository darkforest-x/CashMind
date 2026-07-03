# VPS 部署说明

本文档描述 CashMind 1.0 浏览器/PWA 版本的部署方式。

## 当前生产环境

- VPS IPv4: `103.214.174.58`
- 系统: Debian 12
- 用户: `root`
- 项目目录: `/var/www/cashmind`
- 进程名: `cashmind`
- 端口: `3000`
- Web: `http://103.214.174.58:3000`

## 环境变量

生产环境 `.env` 位于：

```text
/var/www/cashmind/.env
```

必须包含：

```bash
HOST=0.0.0.0
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=
```

以下密钥可以不手动填。服务端首次启动时会自动生成并追加到 `.env`：

```bash
SHORTCUT_TOKEN=
```

说明：

- 浏览器/PWA 直接读写个人 VPS 账本。
- `SHORTCUT_TOKEN`: iPhone 快捷指令写入账单用；设置页会自动把它封装到快捷指令模板。
- `GEMINI_API_KEY`: AI 分类和文本解析用；不可用时会降级为本地规则。
- `VITE_API_BASE_URL`: 浏览器同源部署时可以为空；未来如果前后端分域再配置。

## 首次部署

```bash
ssh root@103.214.174.58
mkdir -p /var/www
cd /var/www
git clone https://github.com/darkforest-x/CashMind.git cashmind
cd /var/www/cashmind
cp .env.example .env
nano .env
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 start ./node_modules/.bin/tsx --name cashmind -- server.ts
pm2 save
```

## 日常部署

```bash
ssh root@103.214.174.58
cd /var/www/cashmind
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

本地也可以用脚本部署：

```bash
VPS_HOST=103.214.174.58 npm run deploy:vps
```

脚本只会要求输入 `GEMINI_API_KEY`。`SHORTCUT_TOKEN` 可通过环境变量指定；不指定时会优先保留 VPS 现有 `.env`，缺失时由服务端启动后自动生成。

## 部署后验证

公网健康检查：

```bash
curl http://103.214.174.58:3000/api/health
```

期望：

```json
{"status":"ok"}
```

裸访问账单应直接返回数据：

```bash
curl -i http://103.214.174.58:3000/api/transactions
```

期望：

```text
HTTP/1.1 200 OK
```

快捷指令 token 状态接口返回配置状态和完整 token，用于前端自动生成配置包：

```bash
curl http://103.214.174.58:3000/api/shortcut/token
```

期望类似：

```json
{"configured":true,"hint":"xxxx","token":"cm_shortcut_..."}
```

## PM2 管理

```bash
pm2 status cashmind
pm2 logs cashmind
pm2 restart cashmind --update-env
pm2 save
pm2 env 0 | grep -E 'NODE_ENV|HOST|PORT'
```

生产环境必须确认：

```text
NODE_ENV: production
HOST: 0.0.0.0
PORT: 3000
```

## 数据库

SQLite 数据库路径：

```text
/var/www/cashmind/data/cashmind.db
```

这个文件必须持久化。部署代码时不要删除 `data/`。

## HTTPS 建议

当前 IP HTTP 部署可以先跑通 1.0。但建议下一步绑定域名并配置 HTTPS：

1. 域名 A 记录指向 `103.214.174.58`。
2. 安装 Nginx。
3. 配置反向代理到 `127.0.0.1:3000`。
4. 用 Certbot 申请证书。
5. 把快捷指令 URL 改成 HTTPS 域名。

Nginx 示例：

```nginx
server {
    listen 80;
    server_name cashmind.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
