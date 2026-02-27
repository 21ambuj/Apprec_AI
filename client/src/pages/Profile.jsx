import { useState, useEffect } from 'react';
import api from '../services/api';
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, Edit, Upload, Save, X, Linkedin, Github, Globe, Loader2, Code, Award, Languages } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useAuth } from '../context/AuthContext';

// Set the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const Profile = () => {
    const { login } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null); // { type: 'success'|'error', message: string }
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchProfile();
    }, []);


    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/users/profile');
            setUser(data);

            // Format data for editing
            const formattedData = { ...data };
            if (formattedData.skills) {
                formattedData.skillsString = formattedData.skills.join(', ');
            }
            if (!formattedData.profile) formattedData.profile = {};
            if (!formattedData.profile.experience) formattedData.profile.experience = [];
            if (!formattedData.profile.education) formattedData.profile.education = [];

            setFormData(formattedData);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch profile', error);
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...(prev[parent] || {}), [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleArrayChange = (type, index, field, value) => {
        setFormData(prev => {
            const newArray = [...(prev.profile?.[type] || [])];
            newArray[index] = { ...newArray[index], [field]: value };
            return { ...prev, profile: { ...prev.profile, [type]: newArray } };
        });
    };

    const addArrayItem = (type) => {
        setFormData(prev => {
            const newItem = type === 'experience' ? { title: '', company: '', period: '' } : { degree: '', institution: '', year: '' };
            return { ...prev, profile: { ...prev.profile, [type]: [...(prev.profile?.[type] || []), newItem] } };
        });
    };

    const removeArrayItem = (type, index) => {
        setFormData(prev => {
            const newArray = [...(prev.profile?.[type] || [])];
            newArray.splice(index, 1);
            return { ...prev, profile: { ...prev.profile, [type]: newArray } };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotification(null);
        try {
            // Build a clean payload — do NOT send the whole formData
            // which contains Mongoose fields like savedJobs ObjectIds, __v, etc.
            const payload = {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                bio: formData.bio,
                profilePicture: formData.profilePicture,
                socialLinks: formData.socialLinks,
                profile: formData.profile,
            };

            // Convert the comma-separated skills string into an array
            if (formData.skillsString !== undefined) {
                payload.skills = formData.skillsString
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s);
            }

            // Recruiter company profile
            if (formData.companyProfile) {
                payload.companyProfile = formData.companyProfile;
            }

            const { data } = await api.put('/users/profile', payload);

            // Re-sync local state and global auth context
            setUser(data);
            const formattedData = { ...data };
            if (formattedData.skills) {
                formattedData.skillsString = formattedData.skills.join(', ');
            }
            if (!formattedData.profile) formattedData.profile = {};
            if (!formattedData.profile.experience) formattedData.profile.experience = [];
            if (!formattedData.profile.education) formattedData.profile.education = [];
            setFormData(formattedData);

            if (data.token) {
                login(data, data.token);
            }

            setIsEditing(false);
            setNotification({ type: 'success', message: 'Profile updated successfully!' });
            setTimeout(() => setNotification(null), 4000);
        } catch (error) {
            console.error('Failed to update profile', error);
            const errMsg = error.response?.data?.message || error.message || 'Failed to save profile.';
            setNotification({ type: 'error', message: errMsg });
        } finally {
            setSaving(false);
        }
    };

    const extractTextFromPDF = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }
        return fullText;
    };

    const extractTextFromDocx = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    const extractTextFromTxt = async (file) => {
        return await file.text();
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            console.log('Extracting text from file:', file.name);
            let text = '';

            if (file.type === 'application/pdf') {
                text = await extractTextFromPDF(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                text = await extractTextFromDocx(file);
            } else if (file.type === 'text/plain') {
                text = await extractTextFromTxt(file);
            } else {
                throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
            }

            // Only upload the raw file and extracted text to Backend - let the Server's Pollinations AI handle parsing
            const formData = new FormData();
            formData.append('extractedText', text);
            formData.append('resume', file);

            const uploadRes = await api.post('/resume/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data && uploadRes.data.extractedData) {
                alert('Resume uploaded and parsed successfully! Your profile has been updated.');
            } else {
                alert('Resume uploaded! However, our AI could not extract the details automatically. You may need to fill them manually.');
            }
            // Re-fetch profile and update global state
            const { data } = await api.get('/users/profile');
            setUser(data);
            setFormData(data);
            // Since we don't return token from /resume/upload, rely on sessionStorage token
            login(data, sessionStorage.getItem('token'));
        } catch (error) {
            console.error('Upload/Parse failed', error);
            alert(`Failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="text-center py-20">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
            <div className="container mx-auto px-4 max-w-5xl">

                {/* Notification Banner */}
                {notification && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 font-medium border ${notification.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {notification.message}
                        <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"><X size={16} /></button>
                    </div>
                )}

                {/* Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10"></div>

                    <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mt-4">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white dark:bg-gray-700 p-1 rounded-full shadow-md shrink-0">
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={48} className="text-gray-400" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{user?.name}</h1>
                                {user?.role === 'candidate' && user?.candidateCode && (
                                    <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200" title="Unique Applicant ID">
                                        ID: {user.candidateCode}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 font-medium text-sm sm:text-base">{user?.profile?.experience?.[0]?.title || 'Job Seeker'}</p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mt-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1"><Mail size={16} /> <span className="truncate max-w-[200px]">{user?.email}</span></span>
                                {user?.phone && <span className="flex items-center gap-1"><Phone size={16} /> {user.phone}</span>}
                                {user?.address && <span className="flex items-center gap-1"><MapPin size={16} /> {user.address}</span>}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                            {isEditing ? <X size={18} /> : <Edit size={18} />}
                            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Resume Section - Candidate Only */}
                        {user?.role !== 'recruiter' && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Upload size={20} className="text-blue-600" /> Resume
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Upload a new resume to automatically update your skills and experience.
                                </p>
                                <label className={`block w-full text-center py-3 px-4 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50 text-blue-600 font-bold cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {uploading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" size={20} /> Parsing...
                                        </span>
                                    ) : 'Update Resume (PDF, DOCX, TXT)'}
                                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleResumeUpload} disabled={uploading} />
                                </label>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">Social Links</h3>
                            <div className="space-y-3">
                                {user?.socialLinks?.linkedin && (
                                    <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Linkedin size={20} /> LinkedIn
                                    </a>
                                )}
                                {user?.socialLinks?.github && (
                                    <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <Github size={20} /> GitHub
                                    </a>
                                )}
                                {user?.socialLinks?.portfolio && (
                                    <a href={user.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-600 hover:text-purple-600 p-2 hover:bg-purple-50 rounded-lg transition-colors">
                                        <Globe size={20} /> Portfolio
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Skills - Candidate Only */}
                        {user?.role !== 'recruiter' && (
                            <>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {user?.skills?.length > 0 ? user.skills.map((skill, index) => (
                                            <span key={index} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                                                {skill}
                                            </span>
                                        )) : <p className="text-gray-400 text-sm italic">No skills listed.</p>}
                                    </div>
                                </div>

                                {user?.profile?.languages?.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Languages size={18} className="text-purple-600" /> Languages</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {user.profile.languages.map((lang, index) => (
                                                <span key={index} className="bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                                                    {lang}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right Column - Main Content */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Edit Form */}
                        {isEditing && (
                            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-6 animate-fade-in">
                                <h3 className="font-bold text-gray-800 mb-4 text-lg">Edit Personal Details</h3>
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Professional Summary</label>
                                        <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-800 mb-3 mt-6 border-t pt-4">Social Links</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                        <input type="text" name="socialLinks.linkedin" value={formData.socialLinks?.linkedin || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://linkedin.com/in/..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                                        <input type="text" name="socialLinks.github" value={formData.socialLinks?.github || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://github.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
                                        <input type="text" name="socialLinks.portfolio" value={formData.socialLinks?.portfolio || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                                    </div>
                                </div>

                                {user?.role !== 'recruiter' && (
                                    <>
                                        <h4 className="font-bold text-gray-800 mb-3 mt-6 border-t pt-4">Skills</h4>
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                                            <input type="text" name="skillsString" value={formData.skillsString || ''} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="React, Node.js, Project Management" />
                                        </div>

                                        <h4 className="font-bold text-gray-800 mb-3 mt-6 border-t pt-4 flex justify-between items-center">
                                            Work Experience
                                            <button type="button" onClick={() => addArrayItem('experience')} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium hover:bg-blue-100">+ Add</button>
                                        </h4>
                                        <div className="space-y-4 mb-6">
                                            {formData.profile?.experience?.map((exp, index) => (
                                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-blue-100 bg-gray-50 rounded-lg relative group">
                                                    <button type="button" onClick={() => removeArrayItem('experience', index)} className="absolute -top-3 -right-3 bg-white text-red-500 border border-red-200 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                                                        <input type="text" value={exp.title || ''} onChange={(e) => handleArrayChange('experience', index, 'title', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Software Engineer" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                                        <input type="text" value={exp.company || ''} onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Google" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
                                                        <input type="text" value={exp.period || ''} onChange={(e) => handleArrayChange('experience', index, 'period', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="2020 - Present" />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!formData.profile?.experience || formData.profile.experience.length === 0) && <p className="text-sm text-gray-500 italic">No experience added manually.</p>}
                                        </div>

                                        <h4 className="font-bold text-gray-800 mb-3 mt-6 border-t pt-4 flex justify-between items-center">
                                            Education
                                            <button type="button" onClick={() => addArrayItem('education')} className="text-sm bg-green-50 text-green-600 px-3 py-1 rounded-full font-medium hover:bg-green-100">+ Add</button>
                                        </h4>
                                        <div className="space-y-4 mb-6">
                                            {formData.profile?.education?.map((edu, index) => (
                                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border border-green-100 bg-gray-50 rounded-lg relative group">
                                                    <button type="button" onClick={() => removeArrayItem('education', index)} className="absolute -top-3 -right-3 bg-white text-red-500 border border-red-200 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Degree</label>
                                                        <input type="text" value={edu.degree || ''} onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="B.S. Computer Science" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Institution</label>
                                                        <input type="text" value={edu.institution || ''} onChange={(e) => handleArrayChange('education', index, 'institution', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="MIT" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                                                        <input type="text" value={edu.year || ''} onChange={(e) => handleArrayChange('education', index, 'year', e.target.value)} className="w-full px-3 py-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="2016 - 2020" />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!formData.profile?.education || formData.profile.education.length === 0) && <p className="text-sm text-gray-500 italic">No education added manually.</p>}
                                        </div>
                                    </>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 border-t pt-4 gap-4">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm("CRITICAL WARNING: Are you sure you want to delete your account? This action is permanent and will delete all your data, resumes, applications, and jobs (if recruiter).")) {
                                                try {
                                                    await api.delete('/users/profile');
                                                    alert("Account successfully deleted.");
                                                    window.location.href = '/login'; // Force clear session and redirect
                                                } catch (err) {
                                                    alert("Failed to delete account. " + (err.response?.data?.message || err.message));
                                                }
                                            }
                                        }}
                                        className="w-full sm:w-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-transparent hover:border-red-200 order-last sm:order-first"
                                    >
                                        Delete Account
                                    </button>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                                        <button type="submit" disabled={saving} className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save</>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* About Section */}
                        {user?.bio && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-3 text-lg">About Me</h3>
                                <p className="text-gray-600 leading-relaxed">{user.bio}</p>
                            </div>
                        )}

                        {/* Candidate Only Sections */}
                        {user?.role !== 'recruiter' && (
                            <>
                                {/* Experience Section */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-6 text-lg flex items-center gap-2">
                                        <Briefcase size={20} className="text-blue-600" /> Work Experience
                                    </h3>
                                    <div className="space-y-6">
                                        {user?.profile?.experience?.length > 0 ? (
                                            user.profile.experience.map((exp, index) => (
                                                <div key={index} className="relative pl-6 border-l-2 border-blue-100 last:border-0 pb-6 last:pb-0">
                                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600"></div>
                                                    <h4 className="font-bold text-gray-800">{exp.title}</h4>
                                                    <p className="text-blue-600 font-medium">{exp.company}</p>
                                                    <p className="text-gray-500 text-sm mt-1 mb-2">{exp.period}</p>
                                                    {exp.description && <p className="text-gray-600 text-sm leading-relaxed">{exp.description}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">No experience listed. Upload your resume to populate this instantly!</p>
                                        )}
                                    </div>
                                </div>

                                {/* Education Section */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-6 text-lg flex items-center gap-2">
                                        <GraduationCap size={20} className="text-green-600" /> Education
                                    </h3>
                                    <div className="space-y-6">
                                        {user?.profile?.education?.length > 0 ? (
                                            user.profile.education.map((edu, index) => (
                                                <div key={index} className="relative pl-6 border-l-2 border-green-100 last:border-0 pb-6 last:pb-0">
                                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-100 border-2 border-green-600"></div>
                                                    <h4 className="font-bold text-gray-800">{edu.degree}</h4>
                                                    <p className="text-green-600 font-medium">{edu.institution}</p>
                                                    <p className="text-gray-500 text-sm mt-1">{edu.year}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">No education listed.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Projects Section */}
                                {user?.profile?.projects?.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-6 text-lg flex items-center gap-2">
                                            <Code size={20} className="text-indigo-600" /> Projects
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {user.profile.projects.map((proj, index) => (
                                                <div key={index} className="border border-indigo-100 bg-indigo-50/30 p-4 rounded-lg hover:shadow-md transition-shadow">
                                                    <h4 className="font-bold text-gray-800 flex items-center justify-between">
                                                        {proj.name}
                                                        {proj.link && <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800"><Globe size={16} /></a>}
                                                    </h4>
                                                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{proj.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Certifications Section */}
                                {user?.profile?.certifications?.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-6 text-lg flex items-center gap-2">
                                            <Award size={20} className="text-amber-600" /> Certifications
                                        </h3>
                                        <div className="space-y-4">
                                            {user.profile.certifications.map((cert, index) => (
                                                <div key={index} className="flex items-start gap-4 p-4 border border-amber-100 bg-amber-50/30 rounded-lg">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                        <Award size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{cert.name}</h4>
                                                        <p className="text-amber-700 font-medium text-sm">{cert.issuer}</p>
                                                        {cert.year && <p className="text-gray-500 text-xs mt-1">Issued: {cert.year}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
