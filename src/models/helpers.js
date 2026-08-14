const mongoose = require("mongoose");

const transformDocument = (doc, ret) => {
  if (ret._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }

  delete ret.__v;
  return ret;
};

const schemaOptions = (extra = {}) => ({
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      transformDocument(doc, ret);
      if (extra.transform) extra.transform(doc, ret);
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: transformDocument,
  },
});

const objectId = (ref, required = true) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref,
  required,
  index: true,
});

module.exports = {
  schemaOptions,
  objectId,
};
