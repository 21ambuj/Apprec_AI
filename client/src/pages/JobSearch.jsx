
import { useState, useEffect } from 'react';
import { Search, MapPin, IndianRupee, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CheckCircle2, XCircle, Sparkles, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const JobSearch = () => {
    const [search, setSearch] = useState('');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [smartMatches, setSmartMatches] = useState([]);
    const [analyzingJobId, setAnalyzingJobId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const { user } = useAuth();

    const filterActiveJobs = (jobList) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return jobList.filter(job => !job.applicationDeadline || new Date(job.applicationDeadline) >= today);
    };

    useEffect(() => {
        const fetchInitialJobs = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/jobs');
                setJobs(filterActiveJobs(data));

                // Fetch smart matches if user is logged in
                if (user) {
                    try {
                        const { data: matches } = await api.get('/jobs/smart-match');
                        setSmartMatches(filterActiveJobs(matches));
                    } catch (err) {
                        console.error('Failed to fetch smart matches', err);
                    }
                }
            } catch (error) {
                console.error('Error fetching initial jobs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialJobs();
    }, [user]);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.get(`/jobs?keyword=${search}`);
            setJobs(filterActiveJobs(data));
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (jobId) => {
        if (!user) {
            alert('Please login to apply for jobs.');
            return;
        }
        if (user.role === 'recruiter') {
            alert('Recruiters cannot apply for jobs.');
            return;
        }

        try {
            await api.post(
                '/applications',
                { jobId, resumeUrl: user.resumeUrl || 'Profile-applied' }
            );
            alert('Application submitted successfully!');
            // Optionally, we could update the local state to show 'Applied'
        } catch (error) {
            console.error('Failed to apply:', error);
            alert(error.response?.data?.message || 'Failed to submit application.');
        }
    };

    const handleAnalyzeMatch = async (jobId) => {
        if (!user) {
            alert('Please login as a candidate to use the AI Analyzer.');
            return;
        }
        setAnalyzingJobId(jobId);
        setAnalysisResult(null);
        setShowAnalysisModal(true);

        try {
            const { data } = await api.post(`/jobs/${jobId}/match-analyze`);
            setAnalysisResult(data);
        } catch (error) {
            console.error('Failed to analyze match:', error);
            alert(error.response?.data?.message || 'Failed to analyze match. Please ensure your profile is complete.');
            setShowAnalysisModal(false);
        } finally {
            setAnalyzingJobId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="container mx-auto px-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">Find Your Next Opportunity</h1>

                {/* Smart Matches Section */}
                {user && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="text-blue-600">✨</span> Smart Matches for You
                        </h2>
                        {smartMatches.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {smartMatches.map((job) => (
                                    <div key={job._id} className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 p-5 sm:p-6 rounded-xl shadow-md border border-blue-100 dark:border-blue-800/50 hover:shadow-lg transition-all relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold ${job.matchScore >= 75 ? 'bg-emerald-600' :
                                            job.matchScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}>
                                            Recommended
                                        </div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-1 pr-6">{job.title}</h3>
                                                <div className="flex items-center gap-1">
                                                    <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">{job.company}</p>
                                                    {job.recruiterId?.isVerified && (
                                                        <CheckCircle2 size={14} className="text-blue-500 fill-blue-50" title="Verified Recruiter" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                <MapPin size={16} className="shrink-0" /> {job.location}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                <IndianRupee size={16} className="shrink-0" /> {job.salaryRange ? `₹${job.salaryRange.min.toLocaleString('en-IN')} - ₹${job.salaryRange.max.toLocaleString('en-IN')}` : 'Salary not specified'}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                                            <button onClick={() => handleAnalyzeMatch(job._id)} className="flex-1 flex justify-center items-center gap-1 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors text-sm">
                                                <Sparkles size={14} /> AI Pre-Check
                                            </button>
                                            <div className="flex gap-2 flex-1">
                                                <Link to={`/jobs/${job._id}`} className="flex-1 text-center bg-white border border-blue-600 text-blue-600 font-bold py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm">
                                                    Details
                                                </Link>
                                                <button onClick={() => handleApply(job._id)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                                <p className="text-gray-500 dark:text-gray-400">No high-probability matches found yet. Keep updating your profile skills for better recommendations!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4 px-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by job title or keywords..."
                                className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Job Grid */}
                {loading ? (
                    <div className="text-center py-20">Loading jobs...</div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">All Jobs</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobs.length > 0 ? (
                                jobs.map((job) => (
                                    <div key={job._id} className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-1 truncate">{job.title}</h3>
                                                <div className="flex items-center gap-1">
                                                    <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">{job.company}</p>
                                                    {job.recruiterId?.isVerified && (
                                                        <CheckCircle2 size={14} className="text-blue-500 fill-blue-50" title="Verified Recruiter" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-1 rounded-full font-bold uppercase shrink-0">
                                                {job.type}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-6 flex-1">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                <MapPin size={16} className="shrink-0" /> {job.location}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                                <IndianRupee size={16} className="shrink-0" /> {job.salaryRange ? `₹${job.salaryRange.min.toLocaleString('en-IN')}` : 'Salary Hidden'}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mt-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg italic line-clamp-2">
                                                <Briefcase size={14} className="shrink-0" /> {job.requirements.join(', ')}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                                            <button onClick={() => handleAnalyzeMatch(job._id)} className="flex-1 flex justify-center items-center gap-1 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors text-xs">
                                                <Sparkles size={14} /> AI Analysis
                                            </button>
                                            <div className="flex gap-2 flex-1">
                                                <Link to={`/jobs/${job._id}`} className="flex-1 text-center border-2 border-blue-600 text-blue-600 font-bold py-2 rounded-lg hover:bg-blue-50 transition-colors text-xs">
                                                    Info
                                                </Link>
                                                <button onClick={() => handleApply(job._id)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs">
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-20 text-gray-500">
                                    No jobs found. Try a different search.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            {/* AI Analysis Modal */}
            <AnimatePresence>
                {showAnalysisModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-gray-900/60 w-full max-w-xl overflow-y-auto max-h-[90vh] custom-scrollbar"
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white relative flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="text-indigo-200" />
                                    <h2 className="text-2xl font-bold">AI Resume Match Analysis</h2>
                                </div>
                                <button onClick={() => setShowAnalysisModal(false)} className="text-white/70 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8">
                                {analyzingJobId ? (
                                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                        <div className="animate-spin text-indigo-600">
                                            <Sparkles size={48} />
                                        </div>
                                        <p className="text-slate-500 font-medium animate-pulse">Our AI is analyzing your CV against this job...</p>
                                    </div>
                                ) : analysisResult ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-6">
                                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="276.46" strokeDashoffset={`${276.46 - (276.46 * analysisResult.matchPercentage) / 100}`} className={`${analysisResult.matchPercentage >= 75 ? 'text-emerald-500' : analysisResult.matchPercentage >= 50 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`} />
                                                </svg>
                                                <span className="absolute text-2xl font-black text-slate-800">{analysisResult.matchPercentage}%</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-800 mb-1">
                                                    {analysisResult.matchPercentage >= 75 ? 'Excellent Fit! 🎯' : analysisResult.matchPercentage >= 50 ? 'Good Potential ✨' : 'Needs Improvement 📈'}
                                                </h3>
                                                <p className="text-slate-600 text-sm leading-relaxed">{analysisResult.feedback}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                                <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-3">
                                                    <CheckCircle2 size={18} /> What you have
                                                </h4>
                                                <ul className="space-y-2">
                                                    {analysisResult.matchingSkills?.length > 0 ? analysisResult.matchingSkills.map((skill, i) => (
                                                        <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span> {skill}
                                                        </li>
                                                    )) : <li className="text-sm text-emerald-600/70 italic">No exact matches found.</li>}
                                                </ul>
                                            </div>
                                            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                                                <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                                                    <XCircle size={18} /> What you're missing
                                                </h4>
                                                <ul className="space-y-2">
                                                    {analysisResult.missingSkills?.length > 0 ? analysisResult.missingSkills.map((skill, i) => (
                                                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5"></span> {skill}
                                                        </li>
                                                    )) : <li className="text-sm text-red-600/70 italic">None! You meet all listed requirements.</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setShowAnalysisModal(false)} className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default JobSearch;
