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
                <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-slate-100 flex flex-col bg-slate-50 relative z-10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-10 text-center text-slate-400 font-medium">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-medium">No messages yet</div>
                        ) : (
                            conversations.map(conv => {
                                const otherUser = getOtherUser(conv);
                                const isActive = activeChat?._id === conv._id;

                                return (
                                    <div
                                        key={conv._id}
                                        onClick={() => setActiveChat(conv)}
                                        className={`p-4 border-b border-slate-100/50 cursor-pointer transition-all flex gap-3 items-center ${isActive ? 'bg-blue-50 border-blue-200 shadow-inner' : 'hover:bg-white bg-transparent'}`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-sm">
                                            {otherUser?.profile?.avatar ? <img src={otherUser.profile.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="font-bold text-slate-800 truncate text-sm">{otherUser?.name || 'Unknown User'}</h4>
                                                <span className="text-[10px] text-slate-400 font-medium">{conv.lastMessage?.createdAt && new Date(conv.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate leading-tight">
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
                <div className={`flex-1 flex flex-col bg-slate-50 h-full ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                    {!activeChat ? (
                        <div className="text-center text-slate-300">
                            <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                                <Send size={32} className="text-slate-200" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-400">Select a Chat</h3>
                            <p className="text-sm">Pick a contact to start messaging</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="p-3 md:p-5 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-20 shrink-0">
                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                    <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-1 text-slate-400 hover:text-slate-600 transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                                        {getOtherUser(activeChat)?.profile?.avatar ? <img src={getOtherUser(activeChat).profile.avatar} className="w-full h-full object-cover" /> : <User size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{getOtherUser(activeChat)?.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 md:gap-2 shrink-0">
                                    {user?.role === 'recruiter' && (
                                        <>
                                            <button onClick={() => setShowScheduleModal(true)} className="p-2 md:p-2.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100" title="Schedule Call">
                                                <Calendar size={18} />
                                            </button>
                                            <button onClick={() => handleCall(false)} className="p-2 md:p-2.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-green-600 transition-all border border-transparent hover:border-slate-100" title="Voice Call">
                                                <Phone size={18} />
                                            </button>
                                            <button onClick={() => handleCall(true)} className="p-2 md:p-2.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100" title="Video Call">
                                                <Video size={18} />
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
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4 custom-scrollbar">
                                {messages.map((msg, i) => {
                                    const isMe = msg.sender === user._id;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            key={msg._id || i}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                                <div className={`text-[10px] mt-1.5 flex items-center gap-1 font-medium ${isMe ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0 shadow-lg">
                                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 px-4 md:px-5 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm md:text-base"
                                        placeholder="Message..."
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                                    >
                                        <Send size={18} className="md:translate-x-0.5" />
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
