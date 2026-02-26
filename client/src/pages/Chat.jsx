import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import api from '../services/api';
import { Send, Phone, Video, Search, User, ArrowLeft, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
    const { user } = useAuth();
    const { callUser, socket } = useCall();

    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Schedule Call States
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    // Fetch conversations on load
    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const { data } = await api.get('/messages/conversations');
                setConversations(data);
                if (data.length > 0) setActiveChat(data[0]);
            } catch (err) {
                console.error("Failed to fetch conversations", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConvos();
    }, []);

    // Fetch messages when activeChat changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChat) return;
            try {
                const otherUser = getOtherUser(activeChat);
                const { data } = await api.get(`/messages/${otherUser._id}`);
                setMessages(data);
                scrollToBottom();
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };
        fetchMessages();
    }, [activeChat]);

    // Socket listener for new incoming real-time messages
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMsg = (msg) => {
            // Only push to active window if it belongs to current active chat
            if (activeChat) {
                const otherUser = getOtherUser(activeChat);
                if (msg.sender === otherUser._id || msg.sender === user._id) {
                    setMessages(prev => [...prev, msg]);
                    scrollToBottom();
                }
            }
        };

        socket.on('receive_message', handleReceiveMsg);
        return () => socket.off('receive_message', handleReceiveMsg);
    }, [socket, activeChat, user]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const getOtherUser = (conversation) => {
        return conversation.participants.find(p => p._id !== user._id);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const otherUser = getOtherUser(activeChat);

        try {
            await api.post(`/messages/send/${otherUser._id}`, { message: newMessage });
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const handleCall = (isVideo) => {
        if (activeChat) {
            const otherUser = getOtherUser(activeChat);
            callUser(otherUser._id, isVideo);
        }
    };

    const handleScheduleCallSubmit = async (e) => {
        e.preventDefault();
        if (!scheduleDate || !scheduleTime) return alert("Please select date and time");

        const msg = `📅 [SCHEDULED CALL]\nDate: ${scheduleDate}\nTime: ${scheduleTime}\n\nThe recruiter has requested a scheduled call. Please be online and available in this chat interface at the designated time to receive the incoming call signal.`;

        try {
            const otherUser = getOtherUser(activeChat);
            await api.post(`/messages/send/${otherUser._id}`, { message: msg });
            setShowScheduleModal(false);
            setScheduleDate('');
            setScheduleTime('');
        } catch (err) {
            console.error("Failed to schedule call", err);
            alert("Failed to send scheduled call message");
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 h-full flex overflow-hidden relative">

                {/* Conversations Sidebar */}
                <div className={`w-full md:w-1/3 border-r border-slate-100 flex flex-col bg-slate-50 relative z-10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-center text-slate-500">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">No conversations yet</div>
                        ) : (
                            conversations.map(conv => {
                                const otherUser = getOtherUser(conv);
                                const isActive = activeChat?._id === conv._id;

                                return (
                                    <div
                                        key={conv._id}
                                        onClick={() => setActiveChat(conv)}
                                        className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex gap-4 items-center ${isActive ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-100 bg-white'}`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                            {otherUser?.profile?.avatar ? <img src={otherUser.profile.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 truncate">{otherUser?.name || 'Unknown User'}</h4>
                                            <p className="text-sm text-slate-500 truncate">
                                                {conv.lastMessage?.content || 'Start a conversation'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex col flex-col bg-slate-50 ${!activeChat ? 'hidden md:flex items-center justify-center' : ''}`}>
                    {!activeChat ? (
                        <div className="text-center text-slate-400 m-auto">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-600">Your Messages</h3>
                            <p>Select a conversation to start chatting</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-700">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                                        {getOtherUser(activeChat)?.profile?.avatar ? <img src={getOtherUser(activeChat).profile.avatar} className="w-full h-full object-cover" /> : <User size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{getOtherUser(activeChat)?.name}</h3>
                                        <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Available for Call
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {user?.role === 'recruiter' && (
                                        <>
                                            <button onClick={() => setShowScheduleModal(true)} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Schedule Call">
                                                <Calendar size={20} />
                                            </button>
                                            <button onClick={() => handleCall(false)} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Voice Call">
                                                <Phone size={20} />
                                            </button>
                                            <button onClick={() => handleCall(true)} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Video Call">
                                                <Video size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Schedule Call Modal Overlay */}
                            <AnimatePresence>
                                {showScheduleModal && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.95, y: 10 }}
                                            animate={{ scale: 1, y: 0 }}
                                            exit={{ scale: 0.95, y: 10 }}
                                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                                        >
                                            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    <Calendar size={18} className="text-blue-600" /> Schedule a Call
                                                </div>
                                                <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <form onSubmit={handleScheduleCallSubmit} className="p-5">
                                                <div className="mb-4">
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={scheduleDate}
                                                        onChange={(e) => setScheduleDate(e.target.value)}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="mb-6">
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Time</label>
                                                    <input
                                                        type="time"
                                                        required
                                                        value={scheduleTime}
                                                        onChange={(e) => setScheduleTime(e.target.value)}
                                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                                                    Send Invite Message
                                                </button>
                                            </form>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Messages List bg */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 space-y-4">
                                {messages.map((msg, i) => {
                                    const isMe = msg.sender === user._id;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={msg._id || i}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                                                <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                                <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200 hover:text-white' : 'text-slate-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                                        placeholder="Type your message..."
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5"
                                    >
                                        <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;
