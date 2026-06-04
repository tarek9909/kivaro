const express = require('express');
const authController = require('./auth.controller');
const { loginSchema, updatePasswordSchema, updateProfileSchema } = require('./auth.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateMe));
router.patch('/me/password', authenticate, validate(updatePasswordSchema), asyncHandler(authController.updatePassword));

module.exports = router;
