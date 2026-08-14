const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("strictQuery", true);

const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== "production",
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
