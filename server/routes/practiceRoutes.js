const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendPracticeRequest, getPracticeRequests, updateRequestStatus } = require('../controllers/practiceController');

router.post('/request', protect, sendPracticeRequest);
router.get('/requests', protect, getPracticeRequests);
router.put('/request/:id', protect, updateRequestStatus);

module.exports = router;
