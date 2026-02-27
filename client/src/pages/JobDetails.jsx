
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, IndianRupee, Briefcase, Clock, Building, CheckCircle, Sparkles, MessageCircle, Bookmark, Globe, Info } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const jobsRes = await api.get(`/jobs/${id}`);
                setJob(jobsRes.data);

                if (user && user.role === 'candidate') {
                    const [appsRes, savedRes] = await Promise.all([
                        api.get('/applications/my'),
                        api.get('/users/saved-jobs')
                    ]);

                    const appsData = appsRes.data;
                    const savedData = savedRes.data;

                    const alreadyApplied = appsData.some(app =>
                        app.jobId?._id === id || app.jobId === id
                    );
                    if (alreadyApplied) {
                        setHasApplied(true);
                        setMessage('You have already applied for this position.');
                    }

                    const alreadySaved = savedData.some(savedJob =>
                        savedJob._id === id || savedJob === id
                    );
                    if (alreadySaved) {
                        setIsSaved(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching job details:', error);
                setJob(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

    const handleApply = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }

        setApplying(true);
        try {
            // Automatically use the profile's resume or a placeholder if they haven't uploaded one
            await api.post(
                '/applications',
                { jobId: id, resumeUrl: user.resumeUrl || 'Profile-applied' }
            );

            setHasApplied(true);
            setMessage('Application submitted successfully!');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Application failed');
        } finally {
            setApplying(false);
        }
    };

    const handleToggleSave = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setSaving(true);
        try {
            await api.put(`/users/saved-jobs/${id}`);
            setIsSaved(!isSaved);
        } catch (error) {
            console.error('Failed to toggle save job:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!job) return <div className="text-center py-20">Job not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-10">
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 p-6 sm:p-8 text-white">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-3">{job.title}</h1>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-blue-100 text-sm sm:text-base">
                            <span className="flex items-center gap-1">
                                <Building size={16} /> {job.company}
                                {job.recruiterId?.isVerified && (
                                    <CheckCircle size={14} className="text-white fill-blue-500" title="Verified Recruiter" />
                                )}
                            </span>
                            <span className="flex items-center gap-1"><MapPin size={16} /> {job.location}</span>
                            <span className="flex items-center gap-1"><Briefcase size={16} /> {job.type}</span>
                            {job.applicationDeadline && (
                                <span className="flex items-center gap-1 text-amber-200">
                                    <Clock size={16} /> Closes: {new Date(job.applicationDeadline).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {/* Job Description */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Job Description</h2>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                        </div>

                        {/* Requirements */}
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Requirements</h2>
                            <ul className="space-y-2">
                                {job.requirements && job.requirements.length > 0 ? job.requirements.map((req, index) => (
                                    <li key={index} className="flex items-start gap-2 text-gray-600">
                                        <CheckCircle size={18} className="text-green-500 mt-1 shrink-0" />
                                        <span>{req}</span>
                                    </li>
                                )) : (
                                    <li className="text-gray-500 italic">No specific requirements listed.</li>
                                )}
                            </ul>
                        </div>

                        {/* Salary */}
                        {job.salaryRange && (
                            <div className="mb-8 bg-green-50 p-4 rounded-lg inline-block">
                                <span className="flex items-center gap-2 text-green-700 font-bold">
                                    <IndianRupee size={20} />
                                    Salary: ₹{job.salaryRange.min.toLocaleString('en-IN')} - ₹{job.salaryRange.max.toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}

                        {/* About Company Section */}
                        {(job.recruiterId?.companyProfile?.description || job.recruiterId?.companyProfile?.website) && (
                            <div className="mb-8 bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-2xl">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Info className="text-blue-600" size={22} /> About {job.recruiterId?.companyProfile?.companyName || job.company}
                                </h2>

                                {job.recruiterId?.companyProfile?.description && (
                                    <p className="text-gray-600 leading-relaxed mb-6 italic">
                                        "{job.recruiterId.companyProfile.description}"
                                    </p>
                                )}

                                <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 text-sm">
                                    {job.recruiterId?.companyProfile?.website && (
                                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                                            <Globe size={18} />
                                            <a href={job.recruiterId.companyProfile.website.startsWith('http') ? job.recruiterId.companyProfile.website : `https://${job.recruiterId.companyProfile.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                Company Website
                                            </a>
                                        </div>
                                    )}
                                    {job.recruiterId?.companyProfile?.industry && (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Building size={18} />
                                            <span className="line-clamp-1">Industry: {job.recruiterId.companyProfile.industry}</span>
                                        </div>
                                    )}
                                    {(job.recruiterId?.companyProfile?.location || job.location) && (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <MapPin size={18} />
                                            <span className="line-clamp-1">HQ: {job.recruiterId?.companyProfile?.location || job.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Application Section */}
                        <div className="border-t pt-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Apply for this Position</h2>

                            {message && (
                                <div className={`p-4 rounded-lg mb-4 ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message}
                                </div>
                            )}

                            {!user ? (
                                <div className="bg-blue-50 p-6 rounded-lg text-center">
                                    <p className="text-gray-600 mb-4">Please login to apply for this job.</p>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
                                    >
                                        Login to Apply
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-6 rounded-lg text-center">
                                    <p className="text-gray-600 mb-4">
                                        Your profile details and uploaded resume will be submitted to the recruiter.
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/messages/send/${job.recruiterId._id || job.recruiterId}`, { message: 'Hi, I am interested in this job!' });
                                                        navigate('/chat');
                                                    } catch (err) {
                                                        console.error(err);
                                                        navigate('/chat');
                                                    }
                                                }}
                                                className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 flex-1"
                                            >
                                                <MessageCircle size={20} /> <span className="sm:hidden lg:inline">Message</span> Recruiter
                                            </button>
                                            <button
                                                onClick={() => navigate(`/jobs/${id}/interview`)}
                                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 flex-1"
                                            >
                                                <Sparkles size={20} /> Mock Interview
                                            </button>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={handleToggleSave}
                                                disabled={saving}
                                                className={`border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 sm:max-w-[150px] flex-1 ${isSaved ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : ''}`}
                                            >
                                                <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
                                                {isSaved ? 'Saved' : 'Save'}
                                            </button>
                                            <button
                                                onClick={handleApply}
                                                disabled={applying || message.includes('success') || hasApplied}
                                                className={`bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex-1 ${(applying || hasApplied || message.includes('success')) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {applying ? 'Submitting...' : (hasApplied ? 'Applied ✓' : 'Apply Now')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetails;
