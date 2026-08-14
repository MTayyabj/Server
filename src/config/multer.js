const multer = require("multer");
const env = require("./env");
const { BadRequestError } = require("../utils/appError");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new BadRequestError("Only image uploads are allowed."));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.uploadMaxBytes,
  },
});

module.exports = upload;
