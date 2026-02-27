import { useState, useEffect } from 'react';
import api from '../services/api';
import { User, MessageSquare, Briefcase, Award, Video, Calendar, Star, CheckCircle, Users, Phone, Loader2, X, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

const SkillPractice = () => {
    const { user } = useAuth();
    const { socket, callUser } = useCall();
    const navigate = useNavigate();

    const [matches, setMatches] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Scheduling Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedPeer, setSelectedPeer] = useState(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleMessage, setScheduleMessage] = useState('');
    const [scheduling, setScheduling] = useState(false);

    // Auto-Match State
    const [isSearching, setIsSearching] = useState(false);
    const [searchType, setSearchType] = useState(null); // 'voice' | 'video'
    const [searchTimeoutError, setSearchTimeoutError] = useState(false);
    const searchTimerRef = useRef(null);

    const fetchData = async () => {
        try {
            const [matchesRes, requestsRes] = await Promise.all([
                api.get('/users/matches'),
                api.get('/practice/requests')
            ]);
            setMatches(matchesRes.data);
            setIncomingRequests(requestsRes.data.incoming);
            setOutgoingRequests(requestsRes.data.outgoing);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to load practice data');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen for socket match events
    useEffect(() => {
        if (!socket) return;

        const handleSkipMatch = (e) => {
            const { type } = e.detail;
            if (type) {
                setTimeout(() => {
                    handleJoinQueue(type);
                }, 100); // Wait briefly for state tear down
            }
        };
        window.addEventListener('PRACTICE_SKIP_MATCH', handleSkipMatch);

        const handleMatchFound = (data) => {
            const { peerId, type, isCaller } = data;

            setIsSearching(false);
            setSearchType(null);
            setSearchTimeoutError(false);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

            // Initiate the call if this user is designated as the caller
            if (isCaller) {
                // Pass true as the 3rd argument to enable auto-match/auto-pickup
                callUser(peerId, type === 'video', true);
            }
        };

        socket.on('match_found', handleMatchFound);

        return () => {
            socket.off('match_found', handleMatchFound);
            window.removeEventListener('PRACTICE_SKIP_MATCH', handleSkipMatch);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [socket, callUser, user]);

    const handleJoinQueue = (type) => {
        if (!socket || !user) return;

        setIsSearching(true);
        setSearchType(type);
        setSearchTimeoutError(false);

        // Set 30 second timeout
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        searchTimerRef.current = setTimeout(() => {
            setIsSearching(false);
            setSearchTimeoutError(type); // Store which type failed to show error on that card
            socket.emit('leave_match_queue', user._id);

            // Auto hide error after 5 seconds
            setTimeout(() => {
                setSearchTimeoutError(false);
            }, 5000);
        }, 30000);

        socket.emit('join_match_queue', {
            userId: user._id,
            name: user.name,
            skills: user.skills,
            type
        });
    };

    const handleCancelSearch = () => {
        if (!socket || !user) return;
        setIsSearching(false);
        setSearchType(null);
        setSearchTimeoutError(false);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        socket.emit('leave_match_queue', user._id);
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        setScheduling(true);
        try {
            await api.post('/practice/request', {
                receiverId: selectedPeer._id,
                scheduledDate: scheduleDate,
                scheduledTime: scheduleTime,
                message: scheduleMessage
            });
            setShowModal(false);
            alert('Practice request sent successfully!');
            fetchData(); // refresh requests
        } catch (err) {
            console.error('Failed to schedule', err);
            alert(err.response?.data?.message || 'Failed to schedule');
        } finally {
            setScheduling(false);
        }
    };

    const handleRequestAction = async (requestId, status) => {
        try {
            await api.put(`/practice/request/${requestId}`, { status });
            fetchData(); // refresh 
        } catch (err) {
            console.error('Failed to update request', err);
        }
    };

    const handleChatClick = async (peerId) => {
        try {
            await api.post(`/messages/send/${peerId}`, { message: 'Hi! Let\'s practice.' });
            navigate('/chat');
        } catch (err) {
            console.error('Error starting chat', err);
            navigate('/chat');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 relative">
            <div className="container mx-auto px-6">

                {/* Hero Header */}
                <header className="mb-8 md:mb-12 text-center bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-12 md:py-16 rounded-3xl shadow-lg relative overflow-hidden mx-1">
                    <div className="absolute top-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-white opacity-5 rounded-full blur-3xl -ml-20 -mt-20"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 md:w-80 md:h-80 bg-blue-400 opacity-10 rounded-full blur-3xl -mr-20 -mb-20"></div>

                    <div className="relative z-10 px-6">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4 md:mb-6 backdrop-blur-sm border border-white/20">
                            <Users size={28} className="text-blue-100" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 md:mb-6 tracking-tight leading-tight">Mock Interviews</h1>
                        <p className="text-blue-100 max-w-2xl mx-auto text-base md:text-xl leading-relaxed opacity-90">
                            Practice your technical skills with peers at your level. Connect via Auto-Match or schedule a session.
                        </p>
                    </div>
                </header>

                <div className="mb-10 px-1">
                    <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                        <Star className="text-amber-500 fill-amber-500" size={20} /> Instant Practice
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Audio Call Card */}
                        <div className={`p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${isSearching && searchType === 'voice' ? 'bg-blue-50 border-blue-400 shadow-xl shadow-blue-100' : 'bg-white border-blue-100 shadow-md hover:border-blue-300 hover:shadow-lg'}`}>
                            {isSearching && searchType === 'voice' && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4">
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full animate-ping absolute"></div>
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                                            <Phone className="text-white" size={20} />
                                        </div>
                                    </div>
                                    <h3 className="text-blue-900 font-bold text-base sm:text-lg mb-3 text-center">Finding match...</h3>
                                    <button onClick={handleCancelSearch} className="px-5 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {searchTimeoutError === 'voice' && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                        <X size={24} />
                                    </div>
                                    <h3 className="text-gray-900 font-bold text-base mb-2 text-center">No peers online</h3>
                                    <button onClick={() => setSearchTimeoutError(false)} className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                    <Phone size={28} />
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Voice Interview</h3>
                            <p className="text-gray-500 text-sm mb-6">Connect instantly with a matched peer for a quick audio-only technical discussion.</p>
                            <button
                                onClick={() => handleJoinQueue('voice')}
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                            >
                                Find Voice Match
                            </button>
                        </div>

                        {/* Video Call Card */}
                        <div className={`p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${isSearching && searchType === 'video' ? 'bg-indigo-50 border-indigo-400 shadow-xl shadow-indigo-100' : 'bg-white border-indigo-100 shadow-md hover:border-indigo-300 hover:shadow-lg'}`}>
                            {isSearching && searchType === 'video' && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-10 flex flex-col items-center justify-center p-4">
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full animate-ping absolute"></div>
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 rounded-full flex items-center justify-center relative z-10 shadow-lg">
                                            <Video className="text-white" size={20} />
                                        </div>
                                    </div>
                                    <h3 className="text-indigo-900 font-bold text-base sm:text-lg mb-3 text-center">Finding match...</h3>
                                    <button onClick={handleCancelSearch} className="px-5 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {searchTimeoutError === 'video' && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                                        <X size={24} />
                                    </div>
                                    <h3 className="text-gray-900 font-bold text-base mb-2 text-center">No peers online</h3>
                                    <button onClick={() => setSearchTimeoutError(false)} className="px-5 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Video size={28} />
                                </div>
                                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Video Interview</h3>
                            <p className="text-gray-500 text-sm mb-6">Simulate a real technical interview face-to-face with a peer sharing your exact tech stack.</p>
                            <button
                                onClick={() => handleJoinQueue('video')}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                            >
                                Find Video Match
                            </button>
                        </div>
                    </div>
                </div>

                {/* Incoming Requests Section */}
                {incomingRequests.filter(r => r.status === 'pending').length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            Incoming Requests
                        </h2>
                        <div className="grid gap-4">
                            {incomingRequests.filter(r => r.status === 'pending').map((req) => (
                                <div key={req._id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 flex flex-col lg:flex-row items-center justify-between gap-5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                                    <div className="flex items-center gap-4 w-full lg:w-auto">
                                        <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-50 rounded-full flex items-center justify-center text-amber-700 font-extrabold text-lg">
                                            {req.requesterId.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900">{req.requesterId.name}</h3>
                                            <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                                                <Calendar size={12} className="text-gray-400" /> {req.scheduledDate} • {req.scheduledTime}
                                            </p>
                                        </div>
                                    </div>
                                    {req.message && (
                                        <div className="bg-gray-50 p-3 rounded-xl text-sm italic text-gray-600 flex-1 w-full md:w-auto border border-gray-100">
                                            "{req.message}"
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 w-full lg:w-auto mt-2 lg:mt-0">
                                        <button onClick={() => handleRequestAction(req._id, 'accepted')} className="flex-1 lg:flex-none px-5 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all text-sm shadow-md">
                                            Accept
                                        </button>
                                        <button onClick={() => handleRequestAction(req._id, 'rejected')} className="flex-1 lg:flex-none px-5 py-2 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm border border-gray-200">
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Scheduled / Accepted Sessions */}
                {(incomingRequests.filter(r => r.status === 'accepted').length > 0 || outgoingRequests.filter(r => r.status === 'accepted').length > 0) && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2 border-l-4 border-green-500 pl-3">
                            Upcoming Scheduled Practice
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[...incomingRequests, ...outgoingRequests].filter(r => r.status === 'accepted').map((req) => {
                                const isIncoming = req.receiverId === user._id || (typeof req.receiverId === 'object' && req.receiverId._id === user._id);
                                const peer = isIncoming ? req.requesterId : req.receiverId;

                                return (
                                    <div key={req._id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-200/50 flex flex-col relative group">
                                        <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-tight">
                                            <CheckCircle size={10} /> Confirmed
                                        </div>
                                        <div className="flex items-center gap-3.5 mb-5">
                                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-700 font-bold text-base">
                                                {peer.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{peer.name}</h3>
                                                <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} /> {req.scheduledDate} • {req.scheduledTime}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleChatClick(peer._id)} className="w-full py-2.5 mt-auto bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 border border-green-200 transition-all flex justify-center items-center gap-2 text-sm active:scale-95">
                                            <MessageSquare size={16} /> Open Chat
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Match Grid */}
                <div>
                    <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2 px-1">
                        <Users className="text-blue-600" size={20} /> Peer Directory
                    </h2>
                    {loading ? (
                        <div className="text-center py-20 flex flex-col items-center">
                            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                            Finding matched peers...
                        </div>
                    ) : error ? (
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-center max-w-2xl mx-auto border border-yellow-200">
                            {error}
                            <br />
                            <span className="text-sm mt-2 block">Make sure you have uploaded a resume first!</span>
                        </div>
                    ) : matches.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {matches.map((peer) => {
                                // Check if an outgoing request is already pending
                                const hasPendingRequest = outgoingRequests.some(r => r.status === 'pending' && (r.receiverId._id === peer._id || r.receiverId === peer._id));

                                return (
                                    <div key={peer._id} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-green-500 to-emerald-500 text-white text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-bl-xl font-bold flex items-center gap-1 shadow-sm uppercase tracking-wider">
                                            <Star size={10} className="fill-current" /> {peer.matchScore}% Match
                                        </div>

                                        <div className="flex items-center gap-4 mb-6 mt-4">
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-full flex items-center justify-center text-blue-700 font-extrabold text-xl sm:text-2xl border-2 border-white shadow-sm">
                                                    {peer.name.charAt(0)}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{peer.name}</h3>
                                                <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-1 font-medium mt-0.5">
                                                    <Briefcase size={12} className="text-gray-400 shrink-0" /> <span className="truncate">{peer.period || peer.profile?.experience?.[0]?.title || 'Engineer'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100/50">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                                                <Award size={12} /> Shared Skills
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {peer.skills.slice(0, 4).map((skill, index) => (
                                                    <span key={index} className="bg-white border border-gray-200 text-gray-600 text-[10px] sm:text-xs px-2 py-0.5 rounded-lg font-bold shadow-sm">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {peer.skills.length > 4 && (
                                                    <span className="text-[10px] text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded-lg">+{peer.skills.length - 4}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2.5">
                                            {hasPendingRequest ? (
                                                <button disabled className="w-full bg-gray-50 text-gray-400 py-3 rounded-xl font-bold border border-gray-200 flex items-center justify-center gap-2 cursor-not-allowed text-sm">
                                                    <Calendar size={16} /> Request Sent
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { setSelectedPeer(peer); setShowModal(true); }}
                                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                                                >
                                                    <Calendar size={16} /> Schedule Session
                                                </button>
                                            )}

                                            <button onClick={() => handleChatClick(peer._id)} className="w-full bg-white text-gray-700 border border-gray-200 py-2.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 text-sm active:scale-95">
                                                <MessageSquare size={16} /> Chat
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm p-8">
                            <User size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No Matches Found Yet</h3>
                            <p>We couldn't find any peers with 70% skill similarity right now.</p>
                            <p className="text-sm mt-2">Try updating your resume to include more skills!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {showModal && selectedPeer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                            <div className="relative z-10">
                                <h2 className="text-xl sm:text-2xl font-bold">Schedule Practice</h2>
                                <p className="text-blue-100 text-xs sm:text-sm mt-1">Connecting with {selectedPeer.name}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10 shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleScheduleSubmit} className="p-6 sm:p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="mb-6 space-y-1.5">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Message</label>
                                <textarea
                                    rows="3"
                                    placeholder="Hi! Wanted to practice React topics..."
                                    value={scheduleMessage}
                                    onChange={(e) => setScheduleMessage(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm font-medium"
                                ></textarea>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all text-sm border border-gray-100 order-last sm:order-first">
                                    Cancel
                                </button>
                                <button type="submit" disabled={scheduling} className="w-full sm:flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 text-sm active:scale-95">
                                    {scheduling ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />}
                                    Send Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillPractice;
