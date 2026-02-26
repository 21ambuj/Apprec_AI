const mongoose = require('mongoose');

const practiceRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduledDate: {
        type: String, // YYYY-MM-DD
        required: true
    },
    scheduledTime: {
        type: String, // HH:MM
        required: true
    },
    message: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

const PracticeRequest = mongoose.model('PracticeRequest', practiceRequestSchema);

module.exports = PracticeRequest;
