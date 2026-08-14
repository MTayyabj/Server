const app = require("./src/app");
const env = require("./src/config/env");
const { connectDatabase, disconnectDatabase } = require("./src/config/database");

let server;

const start = async () => {
  await connectDatabase();

  server = app.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Closing API server...`);

  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
  shutdown("unhandledRejection");
});

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
