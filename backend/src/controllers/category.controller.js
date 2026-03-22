const Category = require('../models/Category');
const Expense = require('../models/Expense');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

// ─── POST /api/v1/categories ──────────────────────────
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, color } = req.body;

  const category = await Category.create({
    name,
    icon,
    color,
    createdBy: req.user._id,
  });

  sendSuccess(res, 201, category, 'Category created successfully');
});

// ─── GET /api/v1/categories ───────────────────────────
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select('name icon color')
    .sort({ name: 1 });

  sendSuccess(res, 200, categories, 'Categories fetched successfully');
});

// ─── DELETE /api/v1/categories/:id ───────────────────
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 404, 'Category not found');
  }

  // Block deletion if any expenses reference this category
  const expenseCount = await Expense.countDocuments({ categoryId: req.params.id });
  if (expenseCount > 0) {
    return sendError(
      res,
      400,
      `Cannot delete — ${expenseCount} expense(s) are using this category`
    );
  }

  await category.deleteOne();
  sendSuccess(res, 200, null, 'Category deleted successfully');
});

module.exports = { createCategory, getCategories, deleteCategory };
