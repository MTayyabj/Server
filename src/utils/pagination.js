const getPagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 0,
});

module.exports = {
  getPagination,
  buildPaginationMeta,
};
