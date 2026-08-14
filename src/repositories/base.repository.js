class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(data, options = {}) {
    return this.model.create([data], { session: options.session }).then(([doc]) => doc);
  }

  insertMany(data, options = {}) {
    return this.model.insertMany(data, { session: options.session, ordered: true });
  }

  findById(id, options = {}) {
    let query = this.model.findById(id);
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.session) query = query.session(options.session);
    return query;
  }

  findOne(filter, options = {}) {
    let query = this.model.findOne(filter);
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.session) query = query.session(options.session);
    return query;
  }

  find(filter = {}, options = {}) {
    let query = this.model.find(filter);
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    if (options.session) query = query.session(options.session);
    return query;
  }

  updateById(id, data, options = {}) {
    return this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      session: options.session,
    });
  }

  deleteById(id, options = {}) {
    return this.model.findByIdAndDelete(id, { session: options.session });
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async paginate(filter = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    let query = this.model.find(filter).skip(skip).limit(limit);
    if (options.populate) query = query.populate(options.populate);
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);

    const [items, total] = await Promise.all([query, this.model.countDocuments(filter)]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}

module.exports = BaseRepository;
