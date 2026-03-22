const express = require('express');
const router = express.Router();

const {
  createCategory,
  getCategories,
  deleteCategory,
} = require('../controllers/category.controller');

const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createCategorySchema } = require('../validators/category.validator');

// All category routes require authentication
router.use(protect);

router.route('/')
  .get(getCategories)
  .post(authorize('admin'), validate(createCategorySchema), createCategory);

router.route('/:id')
  .delete(authorize('admin'), deleteCategory);

module.exports = router;
