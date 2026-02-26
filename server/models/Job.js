
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    recruiterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    title: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    requirements: {
        type: [String],
        required: true,
    },
    salaryRange: {
        min: Number,
        max: Number,
    },
    embeddings: {
        type: [Number], // For AI matching
        default: [],
    },
    applicants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['applied', 'reviewed', 'interviewing', 'rejected', 'hired'],
            default: 'applied'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    applicationDeadline: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
