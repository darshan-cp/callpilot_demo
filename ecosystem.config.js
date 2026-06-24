module.exports = {
    apps: [
      {
        name: "callpilot-api",
        cwd: "./artifacts/api-server",
        script: "npm",
        args: "run start",
        instances: 1,
        exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        API_PORT: 3003,
      },
        error_file: "/var/log/pm2/callpilot-api-error.log",
        out_file: "/var/log/pm2/callpilot-api-out.log",
        merge_logs: true,
        time: true,
      },
      {
        name: "callpilot-web",
        cwd: "./artifacts/lead-verify",
        script: "npm",
        args: "run serve",
        instances: 1,
        exec_mode: "fork",
        env: {
          NODE_ENV: "production",
          PORT: 3002,
          API_URL: "https://callpilot.cptestserver.com:3003",
          BASE_PATH: "/",
        },
        error_file: "/var/log/pm2/callpilot-web-error.log",
        out_file: "/var/log/pm2/callpilot-web-out.log",
        merge_logs: true,
        time: true,
      },
    ],
  };