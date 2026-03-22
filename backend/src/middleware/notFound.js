const { sendError } = require('../utils/response');

const notFound = (req, res) => {
  sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

module.exports = notFound;
