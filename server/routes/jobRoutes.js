
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { createJob, getJobs, getMyJobs, getJobById, updateJob, deleteJob, getSmartMatches, applyToJob, getJobApplicants, analyzeJobMatch, getBestMatchesForJob, getUnappliedBestMatches } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

// Middleware to handle validation errors uniformly
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

router.get('/smart-match', protect, getSmartMatches);
router.get('/recruiter/my-jobs', protect, getMyJobs);

router.route('/')
    .get(getJobs)
    .post(
        protect,
        [
            check('title', 'Job title is required').not().isEmpty(),
            check('company', 'Company name is required').not().isEmpty(),
            check('location', 'Location is required').not().isEmpty(),
            check('type', 'Job type is required').not().isEmpty(),
            check('description', 'Description is required').not().isEmpty(),
            check('requirements', 'Please provide at least one requirement').isArray({ min: 1 }),
            check('applicationDeadline', 'Application deadline is required').not().isEmpty(),
            validateRequest
        ],
        createJob
    );

router.route('/:id')
    .get(getJobById)
    .put(protect, updateJob)
    .delete(protect, deleteJob);

router.post('/:id/apply', protect, applyToJob);
router.post('/:id/match-analyze', protect, analyzeJobMatch);
router.get('/:id/applicants', protect, getJobApplicants);
router.get('/:id/best-matches', protect, getBestMatchesForJob);
router.get('/:id/unapplied-matches', protect, getUnappliedBestMatches);

module.exports = router;
