const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken } = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/response');

// ─── POST /api/v1/auth/register ───────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return sendError(res, 409, 'An account with this username already exists');
  }

  const user = await User.create({ name, username, password, role });
  const token = generateToken(user._id, user.role);

  sendSuccess(
    res,
    201,
    {
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
    },
    'Registration successful'
  );
});

// ─── POST /api/v1/auth/login ──────────────────────────
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Explicitly select password since it's `select: false` in schema
  const user = await User.findOne({ username }).select('+password');
  if (!user || !user.isActive) {
    return sendError(res, 401, 'Invalid username or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 401, 'Invalid username or password');
  }

  const token = generateToken(user._id, user.role);

  sendSuccess(
    res,
    200,
    {
      token,
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
    },
    'Login successful'
  );
});

// ─── GET /api/v1/auth/me ──────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, req.user, 'User fetched successfully');
});

module.exports = { register, login, getMe };
