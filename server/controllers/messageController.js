const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getReceiverSocketId, getIo } = require('../socket');

// @desc    Get all conversations for a user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user._id] }
        })
            .populate('participants', 'name email profile.avatar role companyProfile.companyName')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (error) {
        console.error("Error getting conversations:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Get messages for a specific user
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { userId: userToChatId } = req.params;
        const senderId = req.user._id;

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, userToChatId] }
        });

        if (!conversation) {
            return res.status(200).json([]);
        }

        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
        res.status(200).json(messages);

    } catch (error) {
        console.error("Error getting messages:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Send a message
// @route   POST /api/messages/send/:userId
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const { userId: receiverId } = req.params;
        const senderId = req.user._id;

        if (!message) {
            return res.status(400).json({ message: "Message content cannot be empty" });
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId]
            });
        }

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            content: message,
            conversationId: conversation._id
        });

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // Emit through socket if user is online
        const io = getIo();
        const receiverSocketId = getReceiverSocketId(receiverId);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { getMessages, sendMessage, getConversations };
