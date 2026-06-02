module.exports = {
  apps: [
    {
      name: "audit-report-generator",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    }
  ]
};
