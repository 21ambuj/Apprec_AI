const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['candidate', 'recruiter', 'admin'],
        default: 'candidate',
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    recruiterCode: {
        type: String,
        sparse: true,
        unique: true
    },
    candidateCode: {
        type: String,
        sparse: true,
        unique: true
    },
    skills: {
        type: [String],
        default: [],
    },
    resumeUrl: {
        type: String,
        default: '',
    },
    bio: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    profilePicture: {
        type: String,
        default: '',
    },
    socialLinks: {
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
        portfolio: { type: String, default: '' },
    },
    profile: {
        experience: [{
            title: String,
            company: String,
            period: String,
            description: String // Added description for more professional look
        }],
        education: [{
            degree: String,
            institution: String,
            year: String,
        }],
        projects: [{
            name: String,
            description: String,
            link: String,
        }],
        certifications: [{
            name: String,
            issuer: String,
            year: String,
        }],
        languages: [String],
    },
    // Dedicated and isolated storage for Recruiter's Company details
    companyProfile: {
        companyName: { type: String, default: '' },
        website: { type: String, default: '' },
        description: { type: String, default: '' },
        industry: { type: String, default: '' },
        logoUrl: { type: String, default: '' },
        location: { type: String, default: '' }
    },
    embeddings: {
        type: [Number],
        default: [],
        select: false, // Don't return by default
    },
    savedJobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    }]
}, {
    timestamps: true,
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
