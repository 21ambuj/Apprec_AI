const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const fs = require('fs');

// @desc    Get all users (Candidates & Recruiters)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });

        // Let's get some stats for each user to display on the dashboard
        const usersWithStats = await Promise.all(users.map(async (user) => {
            let stats = {};
            if (user.role === 'recruiter') {
                const jobsCount = await Job.countDocuments({ recruiterId: user._id });
                stats = { jobsPosted: jobsCount };
            } else if (user.role === 'candidate') {
                const applicationsCount = await Application.countDocuments({ candidateId: user._id });
                stats = { applicationsMade: applicationsCount };
            }
            return { ...user.toObject(), stats };
        }));

        res.json(usersWithStats);
    } catch (error) {
        console.error("Admin Get Users Error:", error);
        res.status(500).json({ message: 'Server error retrieving users' });
    }
};

// @desc    Toggle user block status
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
const toggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot block another admin' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
    } catch (error) {
        res.status(500).json({ message: 'Server error toggling block status' });
    }
};

// @desc    Toggle user verification status (Recruiter only)
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Admin
const toggleVerifyUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'recruiter') {
            return res.status(400).json({ message: 'Only recruiters can be verified' });
        }

        user.isVerified = !user.isVerified;
        await user.save();

        res.json({ message: `User ${user.isVerified ? 'verified' : 'unverified'} successfully`, isVerified: user.isVerified });
    } catch (error) {
        res.status(500).json({ message: 'Server error toggling verification status' });
    }
};

// @desc    Delete user and cascade delete data
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete another admin' });
        }

        if (user.role === 'candidate') {
            await Application.deleteMany({ candidateId: user._id });
            await Job.updateMany(
                { 'applicants.user': user._id },
                { $pull: { applicants: { user: user._id } } }
            );
        } else if (user.role === 'recruiter') {
            const recruiterJobs = await Job.find({ recruiterId: user._id });
            const jobIds = recruiterJobs.map(job => job._id);
            await Application.deleteMany({ jobId: { $in: jobIds } });
            await Job.deleteMany({ recruiterId: user._id });
        }

        if (user.resumeUrl && fs.existsSync(user.resumeUrl)) {
            try {
                fs.unlinkSync(user.resumeUrl);
            } catch (fsError) {
                console.error('Failed to delete resume file:', fsError.message);
            }
        }

        await User.findByIdAndDelete(user._id);
        res.json({ message: 'User and all associated data deleted completely.' });
    } catch (error) {
        console.error('Admin Delete User Error:', error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
};

module.exports = { getAllUsers, toggleBlockUser, deleteUserByAdmin, toggleVerifyUser };
