
const express = require('express');
const router = express.Router();
const { startInterview, replyToInterview } = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/start', protect, startInterview);
router.post('/reply', protect, replyToInterview);

module.exports = router;
