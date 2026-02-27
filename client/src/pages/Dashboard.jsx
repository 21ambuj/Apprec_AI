import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, User, FileText, Settings, LogOut, ChevronRight, MapPin, IndianRupee, Clock, Trash2, CheckCircle, Bookmark, X, Sparkles, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [latestJobs, setLatestJobs] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [applying, setApplying] = useState(false);
    const [saving, setSaving] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0); // used to trigger manual refresh

    const handleApplyJob = async (jobId) => {
        if (!user) return alert('Please login');
        if (user.role === 'recruiter' || user.role === 'admin') return alert('Role restricted: Other logins cannot change application status or apply.');

        setApplying(true);
        try {
            await api.post('/applications', { jobId, resumeUrl: user.resumeUrl || 'Profile-applied' });
            alert('Application submitted successfully!');
            const appsRes = await api.get('/applications/my');
            setMyApplications(appsRes.data);
            setSelectedJob(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit application.');
        } finally {
            setApplying(false);
        }
    };

    const handleSaveJob = async (jobId) => {
        if (!user) return alert('Please login');
        if (user.role === 'recruiter' || user.role === 'admin') return alert('Role restricted: Only candidates can save jobs.');

        setSaving(true);
        try {
            await api.put(`/users/saved-jobs/${jobId}`);
            const savedRes = await api.get('/users/saved-jobs');
            if (savedRes && savedRes.data) {
                setSavedJobs(savedRes.data);
            }
        } catch (error) {
            alert('Failed to update saved job');
        } finally {
            setSaving(false);
        }
    };

    // Stable dependency: only re-fetch when the user ID changes, not on every login() call.
    // Using the whole `user` object caused unnecessary re-fetches every time the auth
    // context created a new reference (e.g. after profile save), which hit the rate limiter.
    const userId = user?._id;
    const userRole = user?.role;

    useEffect(() => {
        if (!userId || userRole !== 'candidate') return;

        let cancelled = false; // prevent state updates on unmounted component

        const fetchDashboardData = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const [jobsRes, appsRes, savedRes] = await Promise.all([
                    api.get('/jobs'),
                    api.get('/applications/my'),
                    api.get('/users/saved-jobs')
                ]);

                if (cancelled) return;

                const filterActiveJobs = (jobList) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return jobList.filter(job => !job.applicationDeadline || new Date(job.applicationDeadline) >= today);
                };

                setLatestJobs(filterActiveJobs(jobsRes.data).slice(0, 3));
                setMyApplications(appsRes.data);
                if (savedRes?.data) setSavedJobs(savedRes.data);
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load dashboard data:', error);
                    setFetchError('Failed to load data. Please check your connection and try again.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchDashboardData();

        return () => { cancelled = true; };
    }, [userId, userRole, refreshTick]);

    // Safety fallback (ProtectedRoute should handle this, but just in case)
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar (Desktop only) */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow border-r border-gray-100 dark:border-gray-700 hidden lg:flex flex-col h-screen sticky top-0 shrink-0">
                <div className="px-6 py-6 flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xl">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                    </div>
                </div>
                <nav className="mt-2 text-sm font-medium flex-1">
                    <NavItem icon={<Home size={18} />} label="Home" onClick={() => navigate('/')} />
                    <NavItem icon={<User size={18} />} label="Overview" active />
                    <NavItem icon={<Briefcase size={18} />} label="Find Jobs" onClick={() => navigate('/jobs')} />
                    <NavItem icon={<Sparkles size={18} />} label="Skill Practice" onClick={() => navigate('/practice')} />
                    <NavItem icon={<FileText size={18} />} label="Profile" onClick={() => navigate('/profile')} />
                    <NavItem icon={<Settings size={18} />} label="Settings" onClick={() => navigate('/settings')} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto w-full">
                <header className="mb-10 pt-2 md:pt-0 text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight px-2">Welcome back, {user.name.split(' ')[0]}!</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-base sm:text-lg">Here is what is happening with your job search today.</p>
                </header>

                {/* Error Banner */}
                {fetchError && (
                    <div className="flex items-center justify-between gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 px-5 py-3 rounded-xl mb-8">
                        <span className="text-sm font-medium">{fetchError}</span>
                        <button
                            onClick={() => setRefreshTick(t => t + 1)}
                            className="text-sm font-bold bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 px-4 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Main Dashboard Split Layout */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Main Content (Takes up 2 cols on large screens) */}
                    <div className="lg:col-span-2">

                        {/* Stats Cards Row (Now 2 columns) */}
                        <div className="grid sm:grid-cols-2 gap-6 mb-10">
                            <StatCard title="Saved Jobs" value={savedJobs.length.toString()} color="blue" subtitle="Keep looking!" />
                            <StatCard title="Applications" value={myApplications.length.toString()} color="green" subtitle="Awaiting review" />
                        </div>

                        {/* My Applications */}
                        {myApplications.length > 0 && (
                            <div className="mb-10">
                                <div className="flex justify-between items-end mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">My Applications</h2>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                    {myApplications.slice(0, 3).map(app => (
                                        <div key={app._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{app.jobId?.title || 'Unknown Job'}</h3>
                                                <p className="text-blue-600 font-medium">{app.jobId?.company || 'Unknown Company'}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-gray-500 items-center">
                                                    <span className="flex items-center gap-1"><Clock size={14} /> Applied on {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</span>
                                                    {app.status === 'hired' ? (
                                                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-200 shadow-sm animate-pulse">
                                                            <CheckCircle size={14} /> YOU ARE HIRED!
                                                        </span>
                                                    ) : app.status === 'rejected' ? (
                                                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-red-200">
                                                            <X size={14} /> Application Closed
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold capitalize border border-blue-200">{app.status || 'applied'}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedJob(app.jobId)}
                                                className="w-full sm:w-auto px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                                            >
                                                View Job
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Saved Jobs */}
                        {savedJobs.length > 0 && (
                            <div className="mb-10">
                                <div className="flex justify-between items-end mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Saved Jobs</h2>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                    {savedJobs.slice(0, 3).map(job => (
                                        <div key={job._id || job} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{job.title || 'Unknown Job'}</h3>
                                                <p className="text-blue-600 font-medium">{job.company || 'Unknown Company'}</p>
                                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location || 'Remote'}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedJob(job)}
                                                className="w-full sm:w-auto px-6 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Latest Opportunities</h2>
                            <Link to="/jobs" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                                View all <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Loading latest jobs...</div>
                            ) : latestJobs.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {latestJobs.map(job => (
                                        <div key={job._id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{job.title}</h3>
                                                <p className="text-blue-600 font-medium">{job.company}</p>
                                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                                                    <span className="flex items-center gap-1"><Clock size={14} /> {job.type}</span>
                                                    {job.salaryRange && job.salaryRange.min && (
                                                        <span className="flex items-center gap-1"><IndianRupee size={14} /> ₹{job.salaryRange.min.toLocaleString('en-IN')} - ₹{job.salaryRange.max.toLocaleString('en-IN')}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedJob(job)}
                                                className="w-full sm:w-auto px-6 py-2 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    No new jobs posted recently. Check back soon!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Profile Setup OR Inline Job Match Details Split Pane */}
                    <div className="lg:col-span-1">
                        {selectedJob ? (
                            <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden sticky top-6">
                                <div className="bg-blue-600 p-6 text-white relative">
                                    <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-white hover:bg-white/20 p-1 rounded-full border border-blue-400"><X size={20} /></button>
                                    <h2 className="text-xl font-bold mb-1 pr-8">{selectedJob.title}</h2>
                                    <p className="text-blue-100 font-medium">{selectedJob.company}</p>
                                    <div className="flex flex-wrap gap-3 mt-3 m-0 p-0 text-sm text-blue-100">
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {selectedJob.location}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {selectedJob.type}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-bold text-gray-800 mb-2">Description</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-4">{selectedJob.description}</p>

                                    {selectedJob.requirements?.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="font-bold text-gray-800 mb-2">Requirements</h3>
                                            <ul className="space-y-1">
                                                {selectedJob.requirements.slice(0, 3).map((req, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" /> <span className="line-clamp-1">{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {selectedJob.salaryRange?.min && (
                                        <div className="mb-6 flex items-center gap-2 text-green-700 font-bold bg-green-50 p-3 rounded-lg text-sm">
                                            <IndianRupee size={16} /> ₹{selectedJob.salaryRange.min.toLocaleString('en-IN')} - ₹{selectedJob.salaryRange.max.toLocaleString('en-IN')}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleApplyJob(selectedJob._id)}
                                            disabled={applying || myApplications.some(app => app.jobId?._id === selectedJob._id || app.jobId === selectedJob._id)}
                                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition"
                                        >
                                            {applying ? 'Submitting...' : (myApplications.some(app => app.jobId?._id === selectedJob._id || app.jobId === selectedJob._id) ? 'Applied ✓' : 'Apply Now')}
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveJob(selectedJob._id)}
                                                disabled={saving}
                                                className={`flex-1 border-2 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${savedJobs.some(j => (j._id || j) === selectedJob._id) ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <Bookmark size={16} className={savedJobs.some(j => (j._id || j) === selectedJob._id) ? "fill-current" : ""} />
                                                {savedJobs.some(j => (j._id || j) === selectedJob._id) ? 'Saved' : 'Save'}
                                            </button>
                                            <button onClick={() => navigate(`/jobs/${selectedJob._id}`)} className="flex-1 bg-gray-50 text-gray-700 px-4 font-bold border-2 border-gray-100 rounded-xl hover:bg-gray-100 hover:border-gray-200 transition text-sm">
                                                Full Page
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Boost Your Profile</h2>

                                {(user?.skills?.length > 0 || user?.profile?.experience?.length > 0) ? (
                                    <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-md p-6 text-white text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>

                                        <FileText size={48} className="mx-auto mb-4 opacity-90" />
                                        <h3 className="font-bold text-xl mb-2">Profile Completed!</h3>
                                        <p className="text-green-100 mb-6 text-sm">
                                            Your skills and experience are active. Our AI is matching you with the perfect jobs.
                                        </p>
                                        <button
                                            onClick={() => navigate('/profile')}
                                            className="w-full py-2 bg-white text-green-700 font-bold rounded-lg mb-3 shadow hover:bg-green-50 transition-colors"
                                        >
                                            Update Profile
                                        </button>

                                        {user?.resumeUrl && (
                                            <div className="flex gap-2 w-full mt-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.get('/resume/download', {
                                                                responseType: 'blob',
                                                                headers: {
                                                                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                                                                }
                                                            });
                                                            // Fix for downloading vs opening in browser
                                                            const file = new Blob([res.data], { type: 'application/pdf' });
                                                            const fileURL = window.URL.createObjectURL(file);
                                                            window.open(fileURL, "_blank"); // Open in new tab instead of forcing download
                                                        } catch (e) {
                                                            console.error("Failed to view resume:", e);
                                                            alert("Failed to view resume. Please try uploading it again.");
                                                        }
                                                    }}
                                                    className="flex-1 py-2 bg-green-600 border border-green-400 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-1 text-sm"
                                                >
                                                    <FileText size={16} /> View CV
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Are you sure you want to delete your resume?')) {
                                                            try {
                                                                const { data } = await api.put('/users/profile', { resumeUrl: '' });
                                                                // Update global state
                                                                login(data, sessionStorage.getItem('token'));
                                                                alert("Resume deleted.");
                                                            } catch (e) {
                                                                alert("Failed to delete resume.");
                                                            }
                                                        }
                                                    }}
                                                    className="px-3 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition flex items-center justify-center"
                                                    title="Delete CV"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md p-6 text-white text-center relative overflow-hidden">
                                        {/* Decorative background element */}
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>

                                        <FileText size={48} className="mx-auto mb-4 opacity-90" />
                                        <h3 className="font-bold text-xl mb-2">Upload Your Resume</h3>
                                        <p className="text-blue-100 mb-6 text-sm">
                                            Let our AI analyze your skills to instantly match you with the perfect jobs.
                                        </p>
                                        <button
                                            onClick={() => navigate('/profile')}
                                            className="w-full py-3 bg-white text-blue-700 font-bold rounded-lg shadow hover:bg-blue-50 transition-colors"
                                        >
                                            Setup Profile
                                        </button>
                                    </div>
                                )}
                            </>
                        )}


                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                            <h3 className="font-bold text-lg mb-2 text-gray-800">Skill Practice Matches</h3>
                            <p className="text-gray-500 text-sm mb-4">You have access to peer-to-peer interview practice. Connect with others at your skill level.</p>
                            <button
                                onClick={() => navigate('/practice')}
                                className="w-full py-2 bg-green-50 text-green-700 border border-green-200 font-bold rounded-lg hover:bg-green-100 transition-colors"
                            >
                                Find Practice Partner
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-6 py-3 font-medium transition-colors ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-4 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'}`}
    >
        {icon} {label}
    </button>
);

const StatCard = ({ title, value, color, subtitle }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };

    return (
        <div className={`p-6 rounded-xl border bg-opacity-50 relative overflow-hidden ${colorClasses[color]}`}>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-20 ${colorClasses[color].split(' ')[0].replace('50', '200')}`}></div>
            <h3 className="font-medium text-sm mb-1 uppercase tracking-wider opacity-80">{title}</h3>
            <p className="text-5xl font-extrabold mb-1">{value}</p>
            <p className="text-xs font-semibold opacity-70 mt-2">{subtitle}</p>
        </div>
    );
};

export default Dashboard;
