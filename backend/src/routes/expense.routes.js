const express = require('express');
const router = express.Router();

const {
  addExpense,
  getExpenses,
  getWeeklyExpenses,
  getMonthlyExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require('../controllers/expense.controller');

const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createExpenseSchema, updateExpenseSchema } = require('../validators/expense.validator');

// All expense routes require authentication
router.use(protect);

// ⚠️ Specific routes MUST be defined before /:id to prevent Express
//    from treating 'weekly' or 'monthly' as an ID parameter.
router.get('/weekly', getWeeklyExpenses);
router.get('/monthly', getMonthlyExpenses);

router.route('/')
  .get(getExpenses)
  .post(validate(createExpenseSchema), addExpense);

router.route('/:id')
  .get(getExpenseById)
  .put(validate(updateExpenseSchema), updateExpense)
  .delete(deleteExpense);

module.exports = router;
