import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, ChevronLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const AIInterview = () => {
    const { id: jobId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [interviewActive, setInterviewActive] = useState(false);
    const [jobContext, setJobContext] = useState(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const startInterviewSession = async () => {
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const { data } = await api.post('/interview/start', { jobId });
                setJobContext(data.jobContext);
                setMessages([
                    { role: 'system', content: "Welcome to your AI Mock Interview. I will be asking you exactly what a technical recruiter would based on this job and your CV. Let's begin!" },
                    { role: 'ai', content: data.question }
                ]);
                setInterviewActive(true);
            } catch (error) {
                console.error("Failed to start interview:", error);
                setMessages([{ role: 'system', content: error.response?.data?.message || "Failed to start interview. Make sure you have filled out your profile completely." }]);
            } finally {
                setLoading(false);
            }
        };

        startInterviewSession();
    }, [jobId, user, navigate]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !interviewActive) return;

        const userMsg = input.trim();
        setInput('');

        // Find the last AI question asked
        const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai')?.content;

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const { data } = await api.post('/interview/reply', {
                question: lastAiMsg,
                answer: userMsg,
                jobContext
            });

            // Display AI Feedback silently as a system note
            setMessages(prev => [
                ...prev,
                { role: 'feedback', content: `Feedback: ${data.feedback} (Score: ${data.score}/10)` },
                { role: 'ai', content: data.nextQuestion || "Thank you, that concludes our mock interview!" }
            ]);

            if (!data.nextQuestion) {
                setInterviewActive(false);
            }
        } catch (error) {
            console.error("Failed to process reply:", error);
            setMessages(prev => [...prev, { role: 'system', content: "Network error. Please try answering again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleEndInterview = () => {
        if (window.confirm("Are you sure you want to end this practice session?")) {
            navigate('/jobs');
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex flex-col items-center py-8 px-4">

            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col h-[80vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={handleEndInterview} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="End Session">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles size={20} className="text-blue-200" /> AI Interview Simulator
                            </h1>
                            <p className="text-blue-200 text-sm">Practicing strictly for your chosen job role</p>
                        </div>
                    </div>
                    {interviewActive ? (
                        <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-sm font-medium text-emerald-100">Session Active</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-500/20 px-3 py-1 rounded-full border border-slate-500/30">
                            <span className="text-sm font-medium text-slate-200">Session Ended</span>
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                    {/* Avatar */}
                                    <div className="shrink-0 mt-1">
                                        {msg.role === 'ai' && (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                                                <Bot size={20} className="text-indigo-600" />
                                            </div>
                                        )}
                                        {msg.role === 'user' && (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                                                <User size={20} className="text-blue-600" />
                                            </div>
                                        )}
                                        {msg.role === 'system' && (
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                <AlertCircle size={20} className="text-amber-600" />
                                            </div>
                                        )}
                                        {msg.role === 'feedback' && (
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <Sparkles size={16} className="text-emerald-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`
                                        p-4 rounded-2xl shadow-sm text-sm md:text-base
                                        ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : ''}
                                        ${msg.role === 'ai' ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm' : ''}
                                        ${msg.role === 'system' ? 'bg-amber-50 border border-amber-200 text-amber-800 italic rounded-tl-sm' : ''}
                                        ${msg.role === 'feedback' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-tl-sm' : ''}
                                    `}>
                                        {msg.content}
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                        {loading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                <div className="flex max-w-[80%] gap-3 flex-row">
                                    <div className="shrink-0 mt-1 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-indigo-100">
                                        <Loader2 size={20} className="text-indigo-400 animate-spin" />
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 rounded-tl-sm flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-3 relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder={interviewActive ? "Type your answer here... (Shift+Enter for new line)" : "Interview has ended."}
                            disabled={!interviewActive || loading}
                            className="flex-1 resize-none h-[60px] max-h-[120px] rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 pr-14 text-slate-700 bg-slate-50 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !interviewActive || loading}
                            className="absolute right-3 top-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <div className="text-center mt-3">
                        <p className="text-xs text-slate-400">Our AI uses the job description and your profile to provide dynamic, realistic questions.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AIInterview;
