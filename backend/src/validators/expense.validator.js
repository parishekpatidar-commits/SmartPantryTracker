const Joi = require('joi');

const createExpenseSchema = Joi.object({
  item: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Item name cannot be empty',
    'any.required': 'Item name is required',
  }),
  categoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'categoryId must be a valid MongoDB ObjectId',
      'any.required': 'Category is required',
    }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Amount must be greater than 0',
    'any.required': 'Amount is required',
  }),
  quantity: Joi.number().integer().min(1).default(1),
  unit: Joi.string().trim().max(20).optional().allow(''),
  date: Joi.date().iso().required().messages({
    'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
    'any.required': 'Date is required',
  }),
  notes: Joi.string().trim().max(500).optional().allow(''),
});

const updateExpenseSchema = createExpenseSchema.fork(
  ['item', 'categoryId', 'amount', 'date'],
  (field) => field.optional()
);

module.exports = { createExpenseSchema, updateExpenseSchema };
