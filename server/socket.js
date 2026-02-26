const socketIo = require('socket.io');

let io;
// Map to keep track of connected users: userId -> socketId
const userSocketMap = new Map();

// Auto-match Queue
let matchQueue = [];

function getSkillMatchScore(skillsA, skillsB) {
    if (!skillsA || !skillsB || !skillsA.length || !skillsB.length) return 0;
    const lowerA = skillsA.map(s => s.toLowerCase().trim());
    const lowerB = skillsB.map(s => s.toLowerCase().trim());
    const intersection = lowerA.filter(s => lowerB.includes(s));

    // We calculate overlap percentage based on the smaller skill set 
    // to ensure if a junior has 3 skills and senior has 15, they match if the 3 overlap.
    const minLength = Math.min(lowerA.length, lowerB.length);
    if (minLength === 0) return 0;

    return (intersection.length / minLength) * 100;
}

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:5173",
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            console.log('New client connected:', socket.id);

            // When a user successfully logs in or opens the app
            socket.on('register_user', (userId) => {
                if (userId) {
                    userSocketMap.set(userId, socket.id);
                    console.log(`User ${userId} mapped to socket ${socket.id}`);
                    // Notify others that this user is online (optional)
                    io.emit('user_status', { userId, status: 'online' });
                }
            });

            // ---------- CHAT EVENTS ----------
            socket.on('send_message', (data) => {
                // data = { senderId, receiverId, content, timestamp }
                const receiverSocketId = userSocketMap.get(data.receiverId);

                // If receiver is online, emit immediately
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', data);
                }

                // We also echo it back to the sender so their UI updates if they have multiple tabs
                const senderSocketId = userSocketMap.get(data.senderId);
                if (senderSocketId && senderSocketId !== socket.id) {
                    io.to(senderSocketId).emit('receive_message', data);
                }
            });

            // ---------- WEBRTC SIGNALING EVENTS ----------
            // Peer A calls Peer B
            socket.on('call_user', (data) => {
                const { userToCall, signalData, from, fromName, callType, isAutoMatch } = data;
                const receiverSocketId = userSocketMap.get(userToCall);

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('incoming_call', {
                        signal: signalData,
                        from,
                        fromName,
                        callType,
                        isAutoMatch
                    });
                } else {
                    // Tell caller the user is offline
                    socket.emit('call_failed', { reason: 'User is offline' });
                }
            });

            // Peer B answers Peer A
            socket.on('answer_call', (data) => {
                const { to, signal } = data;
                const callerSocketId = userSocketMap.get(to);

                if (callerSocketId) {
                    io.to(callerSocketId).emit('call_answered', signal);
                }
            });

            // Call hang up or reject
            socket.on('end_call', (data) => {
                const { to } = data;
                const otherSocketId = userSocketMap.get(to);

                if (otherSocketId) {
                    io.to(otherSocketId).emit('call_ended');
                }
            });

            // ---------- AUTO-MATCH PRACTICE EVENTS ----------
            socket.on('join_match_queue', (data) => {
                const { userId, name, skills, type } = data; // type: 'voice' | 'video'

                // Remove if already in queue to prevent duplicates
                matchQueue = matchQueue.filter(u => u.userId !== userId);

                // Look for a match
                let matchedUserIndex = -1;
                for (let i = 0; i < matchQueue.length; i++) {
                    const potentialMatch = matchQueue[i];

                    if (potentialMatch.type === type && potentialMatch.userId !== userId) {
                        matchedUserIndex = i;
                        break;
                    }
                }

                if (matchedUserIndex !== -1) {
                    // Match found!
                    const matchedPeer = matchQueue.splice(matchedUserIndex, 1)[0];

                    const myId = userSocketMap.get(userId);
                    const peerId = userSocketMap.get(matchedPeer.userId);

                    if (myId && peerId) {
                        // The user who was waiting (matchedPeer) will be the 'receiver',
                        // the new user joining will be the 'caller'

                        io.to(myId).emit('match_found', {
                            peerId: matchedPeer.userId,
                            peerName: matchedPeer.name,
                            isCaller: true,
                            type
                        });

                        io.to(peerId).emit('match_found', {
                            peerId: userId,
                            peerName: name,
                            isCaller: false,
                            type
                        });
                        console.log(`Auto-Match created between ${name} and ${matchedPeer.name}`);
                    }
                } else {
                    // No match found, join queue
                    matchQueue.push({ userId, name, skills, type, socketId: socket.id });
                    console.log(`User ${name} joined match queue for ${type}`);
                }
            });

            socket.on('leave_match_queue', (userId) => {
                matchQueue = matchQueue.filter(u => u.userId !== userId);
            });

            // Disconnect handling
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                // Find and remove the user from the map
                let disconnectedUserId = null;
                for (const [userId, sId] of userSocketMap.entries()) {
                    if (sId === socket.id) {
                        disconnectedUserId = userId;
                        userSocketMap.delete(userId);
                        break;
                    }
                }

                if (disconnectedUserId) {
                    matchQueue = matchQueue.filter(u => u.userId !== disconnectedUserId);
                    io.emit('user_status', { userId: disconnectedUserId, status: 'offline' });
                }
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    },
    getReceiverSocketId: (userId) => {
        return userSocketMap.get(userId);
    }
};
