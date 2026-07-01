const VPS_DIR = process.env.VPS_DIR || "/var/www/cashmind";
const VPS_PORT = Number(process.env.VPS_PORT || 3000);
const VPS_HOST = process.env.VPS_HOST_BIND || "0.0.0.0";
const VPS_PROJECT_NAME = process.env.VPS_PROJECT_NAME || "cashmind";

module.exports = {
  apps: [
    {
      name: VPS_PROJECT_NAME,
      script: "npm",
      args: "run start:prod",
      cwd: VPS_DIR,
      env: {
        NODE_ENV: "production",
        PORT: VPS_PORT,
        HOST: VPS_HOST,
      },
    },
  ],
};
