const { paginationQuery, dateRangeQuery } = require("./common.validators");

const list = {
  query: paginationQuery.merge(dateRangeQuery),
};

module.exports = {
  list,
};
