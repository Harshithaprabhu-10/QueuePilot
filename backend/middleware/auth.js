const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/http');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    next(new ApiError(401, 'Session expired. Please sign in again.'));
  }
};
