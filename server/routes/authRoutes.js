const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');

// Middleware to handle validation errors uniformly
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return first error message for simplicity on frontend
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

router.post('/signup', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role', 'Role must be either candidate or recruiter').isIn(['candidate', 'recruiter']),
    validateRequest
], registerUser);

router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
    validateRequest
], loginUser);

router.post('/logout', logoutUser);

module.exports = router;
