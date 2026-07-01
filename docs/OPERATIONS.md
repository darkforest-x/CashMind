# CashMind 运维手册

## 快速状态检查

```bash
ssh root@103.214.174.58
cd /var/www/cashmind
git log -1 --oneline
pm2 status cashmind
curl http://127.0.0.1:3000/api/health
```

公网检查：

```bash
curl http://103.214.174.58:3000/api/health
curl -i http://103.214.174.58:3000/api/transactions
```

`/api/transactions` 裸访问应该返回 `401 Unauthorized`。

## 查看日志

```bash
pm2 logs cashmind
```

只看最近日志：

```bash
pm2 logs cashmind --lines 100
```

## 重启服务

```bash
cd /var/www/cashmind
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

## 更新代码

```bash
cd /var/www/cashmind
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

## 备份数据库

```bash
ssh root@103.214.174.58
mkdir -p /var/backups/cashmind
cp /var/www/cashmind/data/cashmind.db "/var/backups/cashmind/cashmind-$(date +%Y%m%d-%H%M%S).db"
ls -lh /var/backups/cashmind
```

拉回本地：

```bash
scp root@103.214.174.58:/var/www/cashmind/data/cashmind.db ./cashmind.db.backup
```

## 恢复数据库

恢复前先停服务并备份当前数据库：

```bash
ssh root@103.214.174.58
pm2 stop cashmind
cp /var/www/cashmind/data/cashmind.db "/var/backups/cashmind/cashmind-before-restore-$(date +%Y%m%d-%H%M%S).db"
cp /path/to/backup.db /var/www/cashmind/data/cashmind.db
pm2 start cashmind
```

## Token 轮换

### 轮换 App 访问 Token

```bash
ssh root@103.214.174.58
cd /var/www/cashmind
NEW_TOKEN="$(openssl rand -hex 32)"
sed -i "s/^APP_ACCESS_TOKEN=.*/APP_ACCESS_TOKEN=$NEW_TOKEN/" .env
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

然后在浏览器/PWA 设置页重新粘贴新的 `APP_ACCESS_TOKEN`。

### 轮换快捷指令 Token

```bash
ssh root@103.214.174.58
cd /var/www/cashmind
NEW_TOKEN="$(openssl rand -hex 32)"
sed -i "s/^SHORTCUT_TOKEN=.*/SHORTCUT_TOKEN=$NEW_TOKEN/" .env
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```

然后更新 iPhone 快捷指令里的 `Authorization` 请求头。

## 常见故障

### 浏览器看不到账单

检查：

1. `APP_ACCESS_TOKEN` 是否保存正确。
2. `curl http://103.214.174.58:3000/api/health` 是否正常。
3. `pm2 status cashmind` 是否 online。
4. 手机是否能访问 VPS。

### 快捷指令运行成功但没有新账单

检查：

1. 快捷指令 URL 是否正确。
2. `Authorization` 是否使用 `SHORTCUT_TOKEN`。
3. JSON body 是否包含有效 `amount`。
4. 是否被幂等去重判定为重复交易。
5. `pm2 logs cashmind` 是否有解析错误。

### AI 分类或文本解析不准

检查 `GEMINI_API_KEY`：

```bash
cd /var/www/cashmind
grep '^GEMINI_API_KEY=' .env
pm2 logs cashmind --lines 100
```

如果 key 无效或额度不足，服务会降级为本地规则，复杂短信和邮件识别效果会下降。

### 公网能直接看到账单

这是严重问题。立即检查：

```bash
curl -i http://103.214.174.58:3000/api/transactions
pm2 env 0 | grep NODE_ENV
```

期望：

- `/api/transactions` 返回 401。
- `NODE_ENV` 是 `production`。

如果不是，立刻用生产环境重启：

```bash
NODE_ENV=production HOST=0.0.0.0 PORT=3000 pm2 restart cashmind --update-env
pm2 save
```
