import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Plus, Users, Briefcase, MapPin, IndianRupee, Clock, Building2, CheckCircle2, Sparkles, X, Target, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RecruiterDashboard = () => {
    const { user, login } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [companyData, setCompanyData] = useState({
        companyName: user?.companyProfile?.companyName || '',
        industry: user?.companyProfile?.industry || '',
        location: user?.companyProfile?.location || '',
        website: user?.companyProfile?.website || '',
        description: user?.companyProfile?.description || '',
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [showBestMatchesModal, setShowBestMatchesModal] = useState(false);
    const [bestMatches, setBestMatches] = useState([]);
    const [loadingBestMatches, setLoadingBestMatches] = useState(false);
    const [selectedJobForMatches, setSelectedJobForMatches] = useState(null);
    const [matchType, setMatchType] = useState('applied'); // 'applied' or 'unapplied'
    const navigate = useNavigate();

    // Stable: only re-fetch when the user ID changes, not every login() reference change
    const userId = user?._id;

    useEffect(() => {
        if (!userId) return;

        let cancelled = false;

        const fetchMyJobs = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const { data } = await api.get('/jobs/recruiter/my-jobs');
                if (!cancelled) setJobs(data);
            } catch (error) {
                console.error('Failed to fetch recruiter jobs', error);
                if (!cancelled) setFetchError('Failed to load your job listings. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchMyJobs();

        // Show modal if company profile is completely empty
        if (!user?.companyProfile?.companyName) {
            setShowProfileModal(true);
        }

        return () => { cancelled = true; };
    }, [userId, refreshTick]);

    const handleDelete = async (jobId) => {
        if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            try {
                await api.delete(`/jobs/${jobId}`);
                setJobs(jobs.filter(job => job._id !== jobId));
                alert("Job successfully deleted.");
            } catch (error) {
                console.error("Failed to delete job", error);
                alert("Failed to delete job. Please try again.");
            }
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const { data } = await api.put('/users/profile', { companyProfile: companyData });
            // Update auth context with new data
            login(data, data.token);
            setShowProfileModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to save profile");
        } finally {
            setSavingProfile(false);
        }
    };

    const calculateDaysLeft = (deadline) => {
        if (!deadline) return 'No deadline';
        const diff = new Date(deadline).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        if (days < 0) return 'Closed';
        if (days === 0) return 'Closes today';
        return `${days} days left`;
    };

    // Animation variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    const totalApplicants = jobs.reduce((acc, job) => acc + (job.applicants ? job.applicants.length : 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeJobsList = jobs.filter(j => {
        if (!j.applicationDeadline) return true;
        const deadline = new Date(j.applicationDeadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline.getTime() >= today.getTime();
    });

    const pastJobsList = jobs.filter(j => {
        if (!j.applicationDeadline) return false;
        const deadline = new Date(j.applicationDeadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline.getTime() < today.getTime();
    });

    const displayedJobs = activeTab === 'active' ? activeJobsList : pastJobsList;

    const handleUpdateDeadline = async (jobId, newDateStr) => {
        try {
            await api.put(`/jobs/${jobId}`, { applicationDeadline: newDateStr });
            setJobs(jobs.map(j => j._id === jobId ? { ...j, applicationDeadline: newDateStr } : j));
            alert("Deadline updated successfully!");
        } catch (error) {
            console.error("Failed to update deadline", error);
            alert("Failed to update deadline");
        }
    };

    const handleViewBestMatches = async (job, type = 'applied') => {
        setSelectedJobForMatches(job);
        setLoadingBestMatches(true);
        setMatchType(type);
        setShowBestMatchesModal(true);
        try {
            const endpoint = type === 'applied' ? `/jobs/${job._id}/best-matches` : `/jobs/${job._id}/unapplied-matches`;
            const { data } = await api.get(endpoint);
            setBestMatches(data);
        } catch (error) {
            console.error("Failed to fetch matches", error);
            alert("Failed to calculate matches");
        } finally {
            setLoadingBestMatches(false);
        }
    };

    const handleConnect = async (candidate) => {
        try {
            await api.post(`/messages/send/${candidate._id}`, {
                message: `Hi ${candidate.candidateName}, I came across your profile and think you'd be a great fit for our ${selectedJobForMatches?.title} position. Let's connect!`
            });
            navigate('/chat');
        } catch (err) {
            console.error("Failed to connect", err);
            navigate('/chat');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Top Stat Header */}
            <div className="bg-slate-900 pt-16 pb-32">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                            <h1 className="text-4xl font-extrabold text-white mb-2">Recruiter Center</h1>
                            <p className="text-slate-400 text-lg flex items-center gap-2">
                                <Building2 size={18} /> {user?.companyProfile?.companyName || 'Set up your company profile'}
                                {user?.companyProfile?.companyName && <button onClick={() => setShowProfileModal(true)} className="text-blue-400 text-sm hover:underline ml-2">(Edit)</button>}
                            </p>
                            {user?.recruiterCode && (
                                <p className="text-blue-400 text-sm mt-2 bg-blue-900/30 px-3 py-1 rounded-full inline-block border border-blue-800/50">
                                    Recruiter ID: <span className="font-mono font-bold tracking-wider">{user.recruiterCode}</span>
                                </p>
                            )}
                        </div>
                        <Link to="/post-job" className="group flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95">
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Post New Job
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-20 relative z-10">
                {/* Error Banner */}
                {fetchError && (
                    <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl mb-8">
                        <span className="text-sm font-medium">{fetchError}</span>
                        <button
                            onClick={() => setRefreshTick(t => t + 1)}
                            className="text-sm font-bold bg-red-100 hover:bg-red-200 px-4 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Stats Row */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Briefcase size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Active Jobs</p>
                            <h3 className="text-3xl font-black text-slate-800">{activeJobsList.length}</h3>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Applicants</p>
                            <h3 className="text-3xl font-black text-slate-800">{totalApplicants}</h3>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl shadow-blue-900/20 text-white flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={20} /> Pro Tip</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">Jobs with a complete company profile receive 40% more applications.</p>
                    </motion.div>
                </motion.div>

                {/* Job Listings Filters */}
                <div className="flex items-center gap-6 border-b border-slate-200 mb-8 mt-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`text-lg font-bold pb-3 border-b-2 transition-colors ${activeTab === 'active' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Active Postings <span className="ml-2 text-sm bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full">{activeJobsList.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`text-lg font-bold pb-3 border-b-2 transition-colors ${activeTab === 'past' ? 'text-slate-800 border-slate-800' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Past Jobs <span className="ml-2 text-sm bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full">{pastJobsList.length}</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : displayedJobs.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <Briefcase className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">{activeTab === 'active' ? 'No active jobs' : 'No past jobs'}</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            {activeTab === 'active' ? 'Start building your dream team today. Create your first job posting to attract top talent.' : 'Jobs that have passed their application deadline will appear here.'}
                        </p>
                        {activeTab === 'active' && (
                            <Link to="/post-job" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700 transition-colors">
                                <Plus size={20} /> Create First Job
                            </Link>
                        )}
                    </motion.div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayedJobs.map(job => {
                            const daysLeft = calculateDaysLeft(job.applicationDeadline);
                            const isClosed = daysLeft === 'Closed';

                            return (
                                <motion.div variants={itemVariants} key={job._id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col group overflow-hidden">
                                    <div className={`h-2 w-full ${isClosed ? 'bg-slate-300' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="pr-4">
                                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{job.title}</h3>
                                                <p className="text-slate-500 font-medium">{job.company}</p>
                                            </div>
                                            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${job.type === 'Full-time' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {job.type}
                                            </span>
                                        </div>

                                        <div className="space-y-3 mb-6 flex-1">
                                            <div className="flex items-center text-slate-600 text-sm">
                                                <MapPin size={16} className="mr-3 text-slate-400" /> {job.location}
                                            </div>
                                            <div className="flex items-center text-slate-600 text-sm">
                                                <IndianRupee size={16} className="mr-3 text-slate-400 shrink-0" /> {job.salaryRange && job.salaryRange.min ? `₹${job.salaryRange.min.toLocaleString('en-IN')} - ₹${job.salaryRange.max.toLocaleString('en-IN')}` : 'Not specified'}
                                            </div>

                                            {job.description && (
                                                <div className="text-slate-600 text-sm mt-2 line-clamp-2">
                                                    {job.description}
                                                </div>
                                            )}

                                            {job.requirements && job.requirements.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {job.requirements.slice(0, 3).map((req, idx) => (
                                                        <span key={idx} className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                                            {req}
                                                        </span>
                                                    ))}
                                                    {job.requirements.length > 3 && (
                                                        <span className="text-slate-400 text-[10px] font-medium px-1 py-0.5">+{job.requirements.length - 3} more</span>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`flex flex-col text-sm font-medium pt-2 border-t border-slate-100 ${isClosed ? 'text-red-500' : 'text-amber-600'}`}>
                                                <div className="flex items-center mb-2">
                                                    <Clock size={16} className="mr-3 shrink-0" />
                                                    <span>{daysLeft}</span>
                                                </div>
                                                <div className="flex items-center mb-2 mt-1 text-slate-500">
                                                    <Clock size={16} className="mr-3 shrink-0" />
                                                    <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 pl-7 mt-1">
                                                    <span className="text-xs text-slate-400">Update deadline:</span>
                                                    <input
                                                        type="date"
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none focus:border-blue-500"
                                                        value={job.applicationDeadline ? job.applicationDeadline.split('T')[0] : ''}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => handleUpdateDeadline(job._id, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-5 flex flex-col gap-3 mt-auto">
                                            <div className="flex justify-between items-center w-full">
                                                <Link to={`/job/${job._id}/applicants`} className="flex-1 bg-blue-50 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors flex justify-center items-center gap-2 group-hover:bg-blue-600 group-hover:text-white">
                                                    <Users size={16} />
                                                    <span>Applicants</span>
                                                    <span className="bg-white/20 text-current text-xs py-0.5 px-2 rounded-full ml-1">{job.applicants?.length || 0}</span>
                                                </Link>
                                                <button onClick={() => handleDelete(job._id)} className="ml-3 p-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-transparent hover:border-red-600" title="Delete Job">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleViewBestMatches(job, 'applied')}
                                                className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                            >
                                                <Sparkles size={16} /> Applied Applicant Skill Matching
                                            </button>
                                            <button
                                                onClick={() => handleViewBestMatches(job, 'unapplied')}
                                                className="w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 font-bold py-2 rounded-lg hover:bg-purple-600 hover:text-white transition-all border border-purple-100"
                                            >
                                                <Target size={16} /> Unapplied Applicant Skill Matching
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>

            {/* Profile Setup Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-slate-900 p-6 text-white shrink-0">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Building2 /> Company Profile Setup
                                </h2>
                                <p className="text-slate-400 mt-1">Complete your profile to attract higher-quality talent.</p>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form id="profile-form" onSubmit={handleProfileSave} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                                        <input required name="companyName" value={companyData.companyName} onChange={e => setCompanyData({ ...companyData, companyName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Acme Corp" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Industry</label>
                                            <input name="industry" value={companyData.industry} onChange={e => setCompanyData({ ...companyData, industry: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Fintech" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">HQ Location</label>
                                            <input name="location" value={companyData.location} onChange={e => setCompanyData({ ...companyData, location: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. San Francisco" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Website URL</label>
                                        <input type="url" name="website" value={companyData.website} onChange={e => setCompanyData({ ...companyData, website: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="https://example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Company Description</label>
                                        <textarea rows="4" name="description" value={companyData.description} onChange={e => setCompanyData({ ...companyData, description: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Tell candidates about your company culture and mission..." />
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center gap-3">
                                {user?.companyProfile?.companyName && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm("CRITICAL WARNING: Are you sure you want to delete your account? This action is permanent and will delete all your data, jobs, and all applications from candidates to those jobs.")) {
                                                try {
                                                    await api.delete('/users/profile');
                                                    alert("Account and all associated jobs successfully deleted.");
                                                    window.location.href = '/login';
                                                } catch (err) {
                                                    alert("Failed to delete account. " + (err.response?.data?.message || err.message));
                                                }
                                            }
                                        }}
                                        className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-transparent hover:border-red-200"
                                    >
                                        Delete Account
                                    </button>
                                )}
                                <div className="flex gap-3 ml-auto">
                                    {user?.companyProfile?.companyName && (
                                        <button onClick={() => setShowProfileModal(false)} className="px-6 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                    )}
                                    <button type="submit" form="profile-form" disabled={savingProfile} className="px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {savingProfile ? 'Saving...' : <><CheckCircle2 size={18} /> Save Profile</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Best Matches Modal */}
            <AnimatePresence>
                {showBestMatchesModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className={`bg-gradient-to-r ${matchType === 'applied' ? 'from-indigo-600 to-purple-700' : 'from-purple-600 to-pink-700'} p-6 text-white shrink-0 flex justify-between items-center`}>
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        {matchType === 'applied' ? <Sparkles className="text-indigo-200" /> : <Target className="text-purple-200" />}
                                        {matchType === 'applied' ? 'Applied Applicant Skill Matching' : 'Unapplied Applicant Skill Matching'}
                                    </h2>
                                    <p className="text-indigo-100 text-sm mt-1">{selectedJobForMatches?.title}</p>
                                </div>
                                <button onClick={() => setShowBestMatchesModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-gray-800">
                                {loadingBestMatches ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <div className="animate-spin text-indigo-600"><Sparkles size={40} /></div>
                                        <p className="text-slate-500 font-medium">Analyzing applicant skills...</p>
                                    </div>
                                ) : bestMatches.length === 0 ? (
                                    <div className="py-12 text-center text-slate-500">
                                        <Target className="mx-auto text-slate-300 mb-4" size={48} />
                                        <p className="text-lg mb-1">No matching candidates found.</p>
                                        <p className="text-sm">{matchType === 'applied' ? 'No one has applied with matching skills yet.' : 'Try adjusting the job requirements to find more talent.'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {bestMatches.map((match, idx) => (
                                            <div key={match._id} className="bg-white dark:bg-gray-700 p-5 rounded-2xl border border-slate-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 relative">
                                                {idx === 0 && <div className={`absolute top-0 right-0 ${matchType === 'applied' ? 'bg-yellow-400 text-yellow-900' : 'bg-pink-500 text-white'} text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider`}>{matchType === 'applied' ? 'Top Match' : 'High Potential'}</div>}

                                                <div className="flex flex-col items-center justify-center shrink-0 border-r border-slate-100 dark:border-gray-600 pr-6">
                                                    <div className="relative w-16 h-16 flex items-center justify-center mb-1">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-gray-600" />
                                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * match.matchScore) / 100} className={`${match.matchScore >= 75 ? 'text-emerald-500' : match.matchScore >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
                                                        </svg>
                                                        <span className="absolute text-sm font-black text-slate-800 dark:text-white">{match.matchScore}%</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Match Score</span>
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{match.candidateName}</h3>
                                                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-3">{match.candidateEmail}</p>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                                <CheckCircle2 size={12} /> Matching Skills
                                                            </p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {match.matchingSkills.length > 0 ? match.matchingSkills.map((skill, sidx) => (
                                                                    <span key={sidx} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                                                                        {skill}
                                                                    </span>
                                                                )) : <span className="text-xs text-slate-400 italic">No direct keyword matches found.</span>}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Candidate Skills</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {match.candidateSkills.slice(0, 8).map((skill, sidx) => (
                                                                    <span key={sidx} className="bg-slate-100 dark:bg-gray-600 text-slate-600 dark:text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex gap-2">
                                                        <button
                                                            onClick={() => handleConnect(match)}
                                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${matchType === 'applied' ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-pink-600 text-white hover:bg-pink-700 shadow-md shadow-pink-200'}`}
                                                        >
                                                            <MessageCircle size={14} /> {matchType === 'applied' ? 'Chat with Applicant' : 'Connect with Candidate'}
                                                        </button>
                                                        {matchType === 'applied' && (
                                                            <Link
                                                                to={`/job/${selectedJobForMatches?._id}/applicants`}
                                                                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                                                            >
                                                                Full View
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-700 text-center shrink-0">
                                <Link to={`/job/${selectedJobForMatches?._id}/applicants`} className="text-blue-600 font-bold hover:underline text-sm">View Full Applicant Details</Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecruiterDashboard;
