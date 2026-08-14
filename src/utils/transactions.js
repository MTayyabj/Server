const mongoose = require("mongoose");

const withTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  withTransaction,
};
