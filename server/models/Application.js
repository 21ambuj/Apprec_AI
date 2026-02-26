
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Job',
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    resumeUrl: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['applied', 'reviewing', 'interview', 'rejected', 'hired'],
        default: 'applied',
    },
    aiScore: {
        type: Number, // 0-100 match score
    },
    aiNotes: {
        type: String,
    },
}, {
    timestamps: true,
});

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
