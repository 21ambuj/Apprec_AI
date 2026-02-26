
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { calculateSimilarity } = require('../services/aiService');
const { getUserProfile, updateUserProfile, deleteUserProfile, toggleSavedJob, getSavedJobs } = require('../controllers/userController');

// @desc    Get peer matches (>70% similarity)
// @route   GET /api/users/matches
// @access  Private
const getPeerMatches = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+embeddings');

        if (!user.embeddings || user.embeddings.length === 0) {
            return res.status(400).json({ message: 'Please upload a resume first to generate your profile embedding.' });
        }

        // Get all other users with embeddings
        // In a real app, use a vector DB or limit this query
        const candidates = await User.find({
            _id: { $ne: user._id },
            embeddings: { $exists: true, $not: { $size: 0 } },
            role: 'candidate' // Only match with other candidates
        }).select('+embeddings name skills profile');

        const matches = candidates.map(candidate => {
            const score = calculateSimilarity(user.embeddings, candidate.embeddings);
            return {
                _id: candidate._id,
                name: candidate.name,
                skills: candidate.skills,
                period: candidate.profile.experience[0]?.title || 'Peer',
                matchScore: Math.round(score)
            };
        })
            .filter(match => match.matchScore >= 70) // Filter > 70%
            .sort((a, b) => b.matchScore - a.matchScore);

        res.json(matches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

router.get('/matches', protect, getPeerMatches);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile).delete(protect, deleteUserProfile);
router.route('/saved-jobs').get(protect, getSavedJobs);
router.route('/saved-jobs/:id').put(protect, toggleSavedJob);

module.exports = router;
