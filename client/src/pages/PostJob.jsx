import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PostJob = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: '',
        type: 'Full-time',
        description: '',
        requirements: '',
        salaryMin: '',
        salaryMax: '',
        applicationDeadline: ''
    });

    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Transform requirements string to array
            const jobData = {
                ...formData,
                requirements: formData.requirements.split(',').map(req => req.trim()),
                salaryRange: {
                    min: Number(formData.salaryMin),
                    max: Number(formData.salaryMax)
                }
            };

            await api.post('/jobs', jobData);
            navigate('/recruiter-dashboard');
        } catch (err) {
            console.error("Error posting job", err);
            setError(err.response?.data?.message || err.message || "Failed to post job. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-10 border border-gray-100 dark:border-gray-700">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 text-center md:text-left">Post a New Job</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center md:text-left border-b border-gray-50 dark:border-gray-700 pb-4">Fill in the details to reach top candidates.</p>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Title</label>
                        <input name="title" required value={formData.title} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Senior Product Designer" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Company Name</label>
                            <input name="company" required value={formData.company} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Location</label>
                            <input name="location" required value={formData.location} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Remote / Bangalore" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                                <option>Full-time</option>
                                <option>Part-time</option>
                                <option>Contract</option>
                                <option>Freelance</option>
                                <option>Internship</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Min Pay (₹)</label>
                                <input name="salaryMin" type="number" required value={formData.salaryMin} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="50000" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Max Pay (₹)</label>
                                <input name="salaryMax" type="number" required value={formData.salaryMax} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="120000" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                        <textarea name="description" required rows="5" value={formData.description} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Describe the role, responsibilities, and team..." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Requirements (comma-separated)</label>
                            <textarea name="requirements" required rows="3" value={formData.requirements} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="React, Java, Team Leadership..." />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Application Deadline</label>
                            <input name="applicationDeadline" type="date" required value={formData.applicationDeadline} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" min={new Date().toISOString().split('T')[0]} />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                        <button type="button" onClick={() => navigate('/recruiter-dashboard')} className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? 'Posting...' : '🚀 Post Job Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostJob;
