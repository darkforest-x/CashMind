# Deploy CashMind Server to VPS

The active deployment guide is now maintained in:

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)

Current production target:

- Web: `http://103.214.174.58:3000`
- VPS directory: `/var/www/cashmind`
- PM2 process: `cashmind`

Quick redeploy:

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
