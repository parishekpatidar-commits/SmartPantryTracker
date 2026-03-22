const Expense = require('../models/Expense');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

// ─── Helper: date range boundaries ────────────────────
const getDateRange = (type) => {
  const now = new Date();
  let start, end;

  if (type === 'weekly') {
    // Monday → Sunday of the CURRENT week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...6=Sat
    const diffToMonday = (dayOfWeek + 6) % 7; // Days since Monday
    start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'monthly') {
    // 1st → last day of CURRENT month
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

// ─── Shared base query for non-deleted expenses ────────
const baseFilter = () => ({ isDeleted: { $ne: true } });

// ─────────────────────────────────────────────────────
// POST /api/v1/expenses
// ─────────────────────────────────────────────────────
const addExpense = asyncHandler(async (req, res) => {
  const { item, categoryId, amount, quantity, unit, date, notes } = req.body;

  // Verify the category exists
  const category = await Category.findById(categoryId);
  if (!category || !category.isActive) {
    return sendError(res, 404, 'Category not found');
  }

  const expense = await Expense.create({
    item,
    categoryId,
    amount,
    quantity,
    unit,
    date,
    notes,
    createdBy: req.user._id,
    totalAmount: amount * quantity, // also auto-computed in pre-save
  });

  // Populate for the response
  await expense.populate('categoryId', 'name icon color');
  await expense.populate('createdBy', 'name email');

  sendSuccess(res, 201, expense, 'Expense added successfully');
});

// ─────────────────────────────────────────────────────
// GET /api/v1/expenses
// Query: ?page=1&limit=20&categoryId=xxx&startDate=2026-03-01&endDate=2026-03-31&search=tea
// ─────────────────────────────────────────────────────
const getExpenses = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = baseFilter();

  // Category filter
  if (req.query.categoryId) {
    filter.categoryId = req.query.categoryId;
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // Item name search (case-insensitive)
  if (req.query.search) {
    filter.item = { $regex: req.query.search.trim(), $options: 'i' };
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate('categoryId', 'name icon color')
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(filter),
  ]);

  sendSuccess(res, 200, expenses, 'Expenses fetched successfully', {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ─────────────────────────────────────────────────────
// GET /api/v1/expenses/weekly
// Returns current week's expenses + summary
// ─────────────────────────────────────────────────────
const getWeeklyExpenses = asyncHandler(async (req, res) => {
  const { start, end } = getDateRange('weekly');

  const filter = {
    ...baseFilter(),
    date: { $gte: start, $lte: end },
  };

  const expenses = await Expense.find(filter)
    .populate('categoryId', 'name icon color')
    .populate('createdBy', 'name')
    .sort({ date: -1 });

  // Aggregation for summary
  const summary = await Expense.aggregate([
    { $match: { ...filter, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        totalTransactions: { $sum: 1 },
        averagePerDay: { $avg: '$totalAmount' },
      },
    },
  ]);

  // Group by category
  const byCategory = await Expense.aggregate([
    { $match: { ...filter, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $project: {
        categoryName: '$category.name',
        categoryIcon: '$category.icon',
        categoryColor: '$category.color',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  sendSuccess(
    res,
    200,
    {
      period: { start, end },
      summary: summary[0] || { totalAmount: 0, totalTransactions: 0, averagePerDay: 0 },
      byCategory,
      expenses,
    },
    'Weekly expenses fetched successfully'
  );
});

// ─────────────────────────────────────────────────────
// GET /api/v1/expenses/monthly
// Query: ?year=2026&month=3 (defaults to current month)
// ─────────────────────────────────────────────────────
const getMonthlyExpenses = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-indexed

  if (month < 1 || month > 12) {
    return sendError(res, 400, 'Month must be between 1 and 12');
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const filter = {
    ...baseFilter(),
    date: { $gte: start, $lte: end },
  };

  const expenses = await Expense.find(filter)
    .populate('categoryId', 'name icon color')
    .populate('createdBy', 'name')
    .sort({ date: -1 });

  // Overall summary
  const summary = await Expense.aggregate([
    { $match: { ...filter, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        totalTransactions: { $sum: 1 },
      },
    },
  ]);

  // Daily breakdown (for charts)
  const dailyBreakdown = await Expense.aggregate([
    { $match: { ...filter, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', total: 1, count: 1, _id: 0 } },
  ]);

  // Category breakdown
  const byCategory = await Expense.aggregate([
    { $match: { ...filter, isDeleted: { $ne: true } } },
    { $group: { _id: '$categoryId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    {
      $project: {
        categoryName: '$category.name',
        categoryIcon: '$category.icon',
        categoryColor: '$category.color',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  sendSuccess(
    res,
    200,
    {
      period: {
        year,
        month,
        start,
        end,
        label: start.toLocaleString('default', { month: 'long', year: 'numeric' }),
      },
      summary: summary[0] || { totalAmount: 0, totalTransactions: 0 },
      dailyBreakdown,
      byCategory,
      expenses,
    },
    'Monthly expenses fetched successfully'
  );
});

// ─────────────────────────────────────────────────────
// GET /api/v1/expenses/:id
// ─────────────────────────────────────────────────────
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .populate('categoryId', 'name icon color')
    .populate('createdBy', 'name email');

  if (!expense) {
    return sendError(res, 404, 'Expense not found');
  }

  sendSuccess(res, 200, expense, 'Expense fetched successfully');
});

// ─────────────────────────────────────────────────────
// PUT /api/v1/expenses/:id
// ─────────────────────────────────────────────────────
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!expense) {
    return sendError(res, 404, 'Expense not found');
  }

  // Only admin or the creator can edit
  if (req.user.role !== 'admin' && expense.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not authorized to update this expense');
  }

  const allowedFields = ['item', 'categoryId', 'amount', 'quantity', 'unit', 'date', 'notes'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      expense[field] = req.body[field];
    }
  });

  await expense.save(); // Triggers totalAmount pre-save hook

  await expense.populate('categoryId', 'name icon color');
  await expense.populate('createdBy', 'name email');

  sendSuccess(res, 200, expense, 'Expense updated successfully');
});

// ─────────────────────────────────────────────────────
// DELETE /api/v1/expenses/:id  (soft delete)
// ─────────────────────────────────────────────────────
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id }).select('+isDeleted');

  if (!expense || expense.isDeleted) {
    return sendError(res, 404, 'Expense not found');
  }

  if (req.user.role !== 'admin' && expense.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not authorized to delete this expense');
  }

  expense.isDeleted = true;
  await expense.save();

  sendSuccess(res, 200, null, 'Expense deleted successfully');
});

module.exports = {
  addExpense,
  getExpenses,
  getWeeklyExpenses,
  getMonthlyExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
