import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Users, Mail, Phone, MapPin, Briefcase, ArrowLeft, ExternalLink, FileText, Calendar, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';

const JobApplicants = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                const { data } = await api.get(`/jobs/${id}/applicants`);
                setJob(data);
            } catch (error) {
                console.error('Error fetching applicants:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user && user.role === 'recruiter') {
            fetchApplicants();
        }
    }, [id, user]);

    // Connects to our backend endpoint to update application status
    const handleStatusChange = async (applicationId, newStatus) => {
        try {
            await api.put(`/applications/${applicationId}/status`, { status: newStatus });
            setJob({
                ...job,
                applicants: job.applicants.map(app =>
                    app._id === applicationId ? { ...app, status: newStatus } : app
                )
            });
            // Optional: You could use a toast notification here instead of alert
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update applicant status. Please try again.');
        }
    };

    if (!user || user.role !== 'recruiter') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-md">
                    <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">This area is restricted to verified recruiters only.</p>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="min-h-screen flex justify-center pt-32 bg-slate-50">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
    );
    if (!job) return <div className="text-center py-20 bg-slate-50 min-h-screen">Job not found or access denied.</div>;

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const iterVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    return (
        <div className="min-h-screen bg-slate-50 py-10 font-sans">
            <div className="container mx-auto px-6 max-w-6xl">

                <div className="mb-8">
                    <Link to="/recruiter-dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all font-medium shadow-sm">
                        <ArrowLeft size={18} /> Back to Dashboard
                    </Link>
                </div>

                {/* Job Header Card */}
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl shadow-xl p-8 mb-10 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <p className="text-blue-200 font-semibold mb-1 uppercase tracking-wider text-sm">Applicant Review</p>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{job.title}</h1>
                        <div className="flex flex-wrap items-center gap-6 text-slate-300 font-medium mb-4">
                            <span className="flex items-center gap-2"><MapPin size={18} className="text-blue-400" /> {job.location}</span>
                            <span className="flex items-center gap-2"><Briefcase size={18} className="text-blue-400" /> {job.type}</span>
                            <span className="flex items-center gap-2"><Calendar size={18} className="text-amber-400" /> {job.applicationDeadline ? `Closes: ${new Date(job.applicationDeadline).toLocaleDateString()}` : 'No Deadline'}</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full"><Users size={18} className="text-blue-400" /> {job.applicants?.length || 0} Applicants</span>
                        </div>
                        {job.description && (
                            <div className="text-blue-100 text-sm max-w-3xl line-clamp-2 leading-relaxed mb-4">
                                {job.description}
                            </div>
                        )}
                        {job.requirements && job.requirements.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {job.requirements.slice(0, 5).map((req, idx) => (
                                    <span key={idx} className="bg-white/10 text-blue-100 text-xs font-semibold px-2 py-1 rounded border border-white/20">
                                        {req}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <User size={28} className="text-blue-600 p-1.5 bg-blue-100 rounded-lg" />
                        Candidate Pipeline
                    </h2>
                </div>

                {job.applicants?.length === 0 ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center text-slate-500">
                        <Users className="mx-auto h-20 w-20 text-slate-200 mb-6" />
                        <h3 className="text-2xl font-bold text-slate-700 mb-2">No Applications Yet</h3>
                        <p className="max-w-md mx-auto">Once candidates start applying for this position, their profiles and resumes will appear here for you to review.</p>
                    </motion.div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                        {job.applicants.map((application, index) => {
                            const applicant = application.user;

                            if (!applicant) return null; // Safeguard if user account was deleted

                            // Determine status color
                            let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                            if (application.status?.toLowerCase() === 'applied') statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                            if (application.status?.toLowerCase() === 'reviewed') statusColor = "bg-purple-50 text-purple-700 border-purple-200";
                            if (application.status?.toLowerCase() === 'interviewing') statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                            if (application.status?.toLowerCase() === 'hired') statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            if (application.status?.toLowerCase() === 'rejected') statusColor = "bg-red-50 text-red-700 border-red-200";

                            return (
                                <motion.div variants={iterVariants} key={index} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-200 overflow-hidden">
                                    <div className="flex flex-col md:flex-row">

                                        {/* Applicant Main Profile area */}
                                        <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-slate-100">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-400">
                                                        {applicant.name ? applicant.name.charAt(0) : '?'}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-slate-900">{applicant.name || 'Unknown Candidate'}</h3>
                                                        <p className="text-blue-600 font-medium">{applicant.profile?.experience?.[0]?.title || 'Professional'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusColor}`}>
                                                    {application.status}
                                                </span>
                                            </div>

                                            <div className="flex gap-4 mb-6">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.post(`/messages/send/${applicant._id}`, { message: `Hi ${applicant.name}, regarding your application for ${job.title}...` });
                                                            navigate('/chat');
                                                        } catch (err) {
                                                            navigate('/chat');
                                                        }
                                                    }}
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 flex-1 border border-blue-200"
                                                >
                                                    <MessageCircle size={18} /> Chat
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.post(`/messages/send/${applicant._id}`, { message: `Hi ${applicant.name}, I would like to schedule a voice call regarding your application for ${job.title}. Are you available now?` });
                                                            navigate('/chat');
                                                        } catch (err) {
                                                            navigate('/chat');
                                                        }
                                                    }}
                                                    className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 flex-1 border border-green-200"
                                                >
                                                    <Phone size={18} /> Voice Call
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.post(`/messages/send/${applicant._id}`, { message: `Hi ${applicant.name}, I would like to schedule a video interview regarding your application for ${job.title}. Are you available now?` });
                                                            navigate('/chat');
                                                        } catch (err) {
                                                            navigate('/chat');
                                                        }
                                                    }}
                                                    className="bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 flex-1 border border-purple-200"
                                                >
                                                    <User size={18} /> Video Call
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <span className="flex items-center gap-2 font-medium"><Mail size={16} className="text-slate-400" /> {applicant.email}</span>
                                                {applicant.phone && <span className="flex items-center gap-2 font-medium"><Phone size={16} className="text-slate-400" /> {applicant.phone}</span>}
                                                {applicant.address && <span className="flex items-center gap-2 font-medium"><MapPin size={16} className="text-slate-400" /> {applicant.address}</span>}
                                                <span className="flex items-center gap-2 font-medium text-slate-400"><Calendar size={16} /> Applied: {new Date(application.appliedAt).toLocaleDateString()}</span>
                                            </div>

                                            {applicant.bio && (
                                                <div className="mb-6">
                                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider">About</h4>
                                                    <p className="text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">{applicant.bio}</p>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Top Skills</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {applicant.skills && applicant.skills.length > 0 ? applicant.skills.map((skill, i) => (
                                                        <span key={i} className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 shadow-sm">
                                                            {skill}
                                                        </span>
                                                    )) : <span className="text-slate-400 text-sm italic">No skills listed</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Sidebar */}
                                        <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col justify-between">

                                            {/* Links */}
                                            <div className="mb-8">
                                                <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Candidate Links</h4>
                                                <div className="space-y-3">
                                                    {applicant.socialLinks?.linkedin && (
                                                        <a href={applicant.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:shadow-sm transition-all">
                                                            <ExternalLink size={16} /> LinkedIn Profile
                                                        </a>
                                                    )}
                                                    {applicant.socialLinks?.github && (
                                                        <a href={applicant.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:shadow-sm transition-all">
                                                            <ExternalLink size={16} /> GitHub Portfolio
                                                        </a>
                                                    )}
                                                    {applicant.socialLinks?.portfolio && (
                                                        <a href={applicant.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 text-sm font-semibold text-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all">
                                                            <ExternalLink size={16} /> Personal Website
                                                        </a>
                                                    )}
                                                    {(!applicant.socialLinks?.linkedin && !applicant.socialLinks?.github && !applicant.socialLinks?.portfolio) && (
                                                        <div className="text-center p-4 bg-slate-100 rounded-lg text-slate-500 text-sm border border-slate-200 border-dashed">No external links provided</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="space-y-3 mt-auto">
                                                {applicant.resumeUrl ? (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const res = await api.get(`/resume/download/${applicant._id}`, { responseType: 'blob' });
                                                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                                                const link = document.createElement('a');
                                                                link.href = url;
                                                                link.setAttribute('download', `${applicant.name.replace(/\s+/g, '_')}_Resume.pdf`);
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                link.remove();
                                                            } catch (e) {
                                                                alert("Failed to download or view applicant's resume.");
                                                            }
                                                        }}
                                                        className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 shadow-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <FileText size={18} /> Download Resume
                                                    </button>
                                                ) : (
                                                    <button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-xl border-2 border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed">
                                                        <FileText size={18} /> No Resume Attached
                                                    </button>
                                                )}

                                                <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                                    Schedule Interview
                                                </button>

                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <button onClick={() => handleStatusChange(application._id, 'hired')} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                                                        <CheckCircle2 size={16} /> Hire
                                                    </button>
                                                    <button onClick={() => handleStatusChange(application._id, 'rejected')} className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                                                        <XCircle size={16} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default JobApplicants;
