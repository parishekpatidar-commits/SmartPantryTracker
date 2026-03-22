const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Category name cannot be empty',
    'any.required': 'Category name is required',
  }),
  icon: Joi.string().optional().default('📦'),
  color: Joi.string()
    .pattern(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .optional()
    .default('#6366F1')
    .messages({
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF5733)',
    }),
});

module.exports = { createCategorySchema };
