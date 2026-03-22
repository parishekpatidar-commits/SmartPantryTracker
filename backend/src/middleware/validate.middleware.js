const { sendError } = require('../utils/response');

/**
 * Validates req.body against a Joi schema.
 * Usage: validate(myJoiSchema) as route middleware.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,   // Collect ALL errors, not just the first
    stripUnknown: true,  // Remove fields not in schema
  });

  if (error) {
    const details = error.details.map((d) => d.message.replace(/['"]/g, ''));
    return sendError(res, 400, 'Validation failed', details);
  }

  req.body = value; // Replace body with sanitized/defaulted values
  next();
};

module.exports = validate;
