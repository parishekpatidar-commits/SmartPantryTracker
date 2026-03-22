const express = require('express');
const router = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Public
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected
router.get('/me', protect, getMe);

module.exports = router;
