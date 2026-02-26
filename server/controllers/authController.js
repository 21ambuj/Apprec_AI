
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate unique alphanumeric IDs based on role
        let uniqueRecruiterId = undefined;
        let uniqueCandidateId = undefined;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        if (role === 'recruiter') {
            uniqueRecruiterId = Array.from({ length: 7 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        } else if (role === 'candidate') {
            // 10 digit unique ID for candidates
            uniqueCandidateId = Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            recruiterCode: uniqueRecruiterId,
            candidateCode: uniqueCandidateId
        });

        if (user) {
            const token = generateToken(user._id);

            // Send HTTP-only cookie identical to login flow
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: token,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            // Send HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                sameSite: 'strict', // Prevent CSRF
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                recruiterCode: user.recruiterCode,
                candidateCode: user.candidateCode,
                skills: user.skills, // Fix missing from original payload config
                profile: user.profile,
                companyProfile: user.companyProfile,
                resumeUrl: user.resumeUrl,
                token: token, // Added the token emission here to fix multi-tenant session bug
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { registerUser, loginUser, logoutUser };
