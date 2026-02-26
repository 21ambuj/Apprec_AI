
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone, // New
            address: user.address, // New
            bio: user.bio, // New
            profilePicture: user.profilePicture, // New
            socialLinks: user.socialLinks, // New
            role: user.role,
            skills: user.skills, // For candidates
            profile: user.profile, // For detailed info
            companyProfile: user.companyProfile, // For recruiters
            resumeUrl: user.resumeUrl,
            recruiterCode: user.recruiterCode,
            candidateCode: user.candidateCode
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Core identity fields — only update if provided in request body
        if (req.body.name !== undefined) user.name = req.body.name || user.name;
        if (req.body.email !== undefined) user.email = req.body.email || user.email;

        // Update password if provided
        if (req.body.password) {
            user.password = req.body.password;
        }

        // Clearable optional text fields — use has-own check so empty string is honoured
        if ('bio' in req.body) user.bio = req.body.bio;
        if ('phone' in req.body) user.phone = req.body.phone;
        if ('address' in req.body) user.address = req.body.address;
        if ('profilePicture' in req.body) user.profilePicture = req.body.profilePicture;

        // Arrays / nested objects
        if (req.body.skills && Array.isArray(req.body.skills)) user.skills = req.body.skills;
        if (req.body.profile && typeof req.body.profile === 'object') user.profile = req.body.profile;

        if (req.body.socialLinks && typeof req.body.socialLinks === 'object') {
            user.socialLinks = {
                linkedin: req.body.socialLinks.linkedin !== undefined ? req.body.socialLinks.linkedin : (user.socialLinks?.linkedin || ''),
                github: req.body.socialLinks.github !== undefined ? req.body.socialLinks.github : (user.socialLinks?.github || ''),
                portfolio: req.body.socialLinks.portfolio !== undefined ? req.body.socialLinks.portfolio : (user.socialLinks?.portfolio || ''),
            };
        }

        // Update Company Profile securely if the user is a recruiter
        if (req.body.companyProfile && user.role === 'recruiter') {
            user.companyProfile = {
                companyName: req.body.companyProfile.companyName !== undefined ? req.body.companyProfile.companyName : (user.companyProfile?.companyName || ''),
                website: req.body.companyProfile.website !== undefined ? req.body.companyProfile.website : (user.companyProfile?.website || ''),
                description: req.body.companyProfile.description !== undefined ? req.body.companyProfile.description : (user.companyProfile?.description || ''),
                industry: req.body.companyProfile.industry !== undefined ? req.body.companyProfile.industry : (user.companyProfile?.industry || ''),
                logoUrl: req.body.companyProfile.logoUrl !== undefined ? req.body.companyProfile.logoUrl : (user.companyProfile?.logoUrl || ''),
                location: req.body.companyProfile.location !== undefined ? req.body.companyProfile.location : (user.companyProfile?.location || ''),
            };
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            address: updatedUser.address,
            bio: updatedUser.bio,
            profilePicture: updatedUser.profilePicture,
            socialLinks: updatedUser.socialLinks,
            role: updatedUser.role,
            skills: updatedUser.skills,
            profile: updatedUser.profile,
            companyProfile: updatedUser.companyProfile,
            resumeUrl: updatedUser.resumeUrl,
            token: req.cookies?.token || (req.headers.authorization?.split(' ')[1]) || '',
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
};

// @desc    Delete user profile and cascade delete associated data
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const Job = require('../models/Job');
        const Application = require('../models/Application');
        const fs = require('fs');

        if (user.role === 'candidate') {
            // Delete all applications made by this candidate
            await Application.deleteMany({ candidateId: user._id });

            // Remove candidate from all job applicants arrays
            await Job.updateMany(
                { 'applicants.user': user._id },
                { $pull: { applicants: { user: user._id } } }
            );

        } else if (user.role === 'recruiter') {
            // Find all jobs created by this recruiter
            const recruiterJobs = await Job.find({ recruiterId: user._id });
            const jobIds = recruiterJobs.map(job => job._id);

            // Delete all applications targeting the recruiter's jobs
            await Application.deleteMany({ jobId: { $in: jobIds } });

            // Delete all jobs created by the recruiter
            await Job.deleteMany({ recruiterId: user._id });
        }

        // Delete associated resume file if it exists
        if (user.resumeUrl && fs.existsSync(user.resumeUrl)) {
            try {
                fs.unlinkSync(user.resumeUrl);
            } catch (fsError) {
                console.error('Failed to delete resume file during account deletion:', fsError.message);
            }
        }

        // Delete the user record
        await User.findByIdAndDelete(user._id);

        // Clear auth cookie
        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0)
        });

        res.json({ message: 'Account and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete Profile Error:', error);
        res.status(500).json({ message: 'Server error deleting account', error: error.message });
    }
};

// @desc    Toggle saving a job
// @route   PUT /api/users/saved-jobs/:id
// @access  Private (Candidate)
const toggleSavedJob = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const jobId = req.params.id;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'candidate') {
            return res.status(403).json({ message: 'Only candidates can save jobs' });
        }

        const isSaved = user.savedJobs.includes(jobId);

        if (isSaved) {
            user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
        } else {
            user.savedJobs.push(jobId);
        }

        await user.save();

        res.json(user.savedJobs);
    } catch (error) {
        console.error('Toggle Saved Job Error:', error);
        res.status(500).json({ message: 'Server error saving job' });
    }
};

// @desc    Get user's saved jobs
// @route   GET /api/users/saved-jobs
// @access  Private (Candidate)
const getSavedJobs = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('savedJobs');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.savedJobs);
    } catch (error) {
        console.error('Get Saved Jobs Error:', error);
        res.status(500).json({ message: 'Server error getting saved jobs' });
    }
};

module.exports = { getUserProfile, updateUserProfile, deleteUserProfile, toggleSavedJob, getSavedJobs };
