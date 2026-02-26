const PracticeRequest = require('../models/PracticeRequest');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Send a new practice request
// @route   POST /api/practice/request
// @access  Private (Candidate)
const sendPracticeRequest = async (req, res) => {
    try {
        const { receiverId, scheduledDate, scheduledTime, message } = req.body;
        const requesterId = req.user._id;

        if (requesterId.toString() === receiverId) {
            return res.status(400).json({ message: 'You cannot send a request to yourself' });
        }

        const newRequest = await PracticeRequest.create({
            requesterId,
            receiverId,
            scheduledDate,
            scheduledTime,
            message
        });

        res.status(201).json(newRequest);
    } catch (error) {
        console.error('Send Practice Request Error:', error);
        res.status(500).json({ message: 'Failed to send practice request' });
    }
};

// @desc    Get all practice requests (incoming and outgoing)
// @route   GET /api/practice/requests
// @access  Private
const getPracticeRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const incoming = await PracticeRequest.find({ receiverId: userId })
            .populate('requesterId', 'name profilePicture profile skills')
            .sort({ createdAt: -1 });

        const outgoing = await PracticeRequest.find({ requesterId: userId })
            .populate('receiverId', 'name profilePicture profile skills')
            .sort({ createdAt: -1 });

        res.json({ incoming, outgoing });
    } catch (error) {
        console.error('Get Practice Requests Error:', error);
        res.status(500).json({ message: 'Failed to fetch practice requests' });
    }
};

// @desc    Update request status (Accept/Reject)
// @route   PUT /api/practice/request/:id
// @access  Private
const updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'accepted' or 'rejected'
        const requestId = req.params.id;

        const request = await PracticeRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Only the receiver can accept/reject
        if (request.receiverId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this request' });
        }

        request.status = status;
        await request.save();

        if (status === 'accepted') {
            // Auto-create a conversation between these two peers if it doesn't exist
            let conversation = await Conversation.findOne({
                participants: { $all: [request.requesterId, request.receiverId] }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [request.requesterId, request.receiverId],
                    lastMessage: null
                });
            }
        }

        res.json(request);
    } catch (error) {
        console.error('Update Request Error:', error);
        res.status(500).json({ message: 'Failed to update request' });
    }
};

module.exports = {
    sendPracticeRequest,
    getPracticeRequests,
    updateRequestStatus
};
