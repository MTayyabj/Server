const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchRegex = (value) => new RegExp(escapeRegex(value), "i");

module.exports = {
  escapeRegex,
  buildSearchRegex,
};
