/**
 * Consistent JSON response helpers.
 * All controllers use these — keeps the envelope uniform.
 */

const sendSuccess = (res, statusCode = 200, data = {}, message = 'Success', meta = {}) => {
  const payload = { success: true, message, data };
  if (Object.keys(meta).length > 0) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode = 500, message = 'Error', details = []) => {
  const payload = { success: false, message };
  if (details.length > 0) payload.details = details;
  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
