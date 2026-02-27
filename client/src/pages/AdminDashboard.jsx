import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Shield, Users, Briefcase, FileText, Ban, Trash2, Search, CheckCircle, Activity, LayoutDashboard, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' or 'recruiters'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Enforce admin protection on mount
        if (!user || user.role !== 'admin') {
            navigate('/admin');
            return;
        }
        fetchUsers();
    }, [user, navigate]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/users');
            setUsersList(data);
        } catch (error) {
            console.error("Failed to fetch admin users", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/admin');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBlock = async (id, isCurrentlyBlocked) => {
        const action = isCurrentlyBlocked ? 'Unblock' : 'Block';
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                await api.put(`/admin/users/${id}/block`);
                // Update local state smoothly
                setUsersList(prev => prev.map(u => u._id === id ? { ...u, isBlocked: !isCurrentlyBlocked } : u));
            } catch (err) {
                alert(`Failed to ${action} user`);
            }
        }
    };

    const handleToggleVerify = async (id, isCurrentlyVerified) => {
        const action = isCurrentlyVerified ? 'Unverify' : 'Verify';
        if (window.confirm(`Are you sure you want to ${action} this recruiter? Verified recruiters receive a blue checkmark badge on their jobs.`)) {
            try {
                await api.put(`/admin/users/${id}/verify`);
                // Update local state
                setUsersList(prev => prev.map(u => u._id === id ? { ...u, isVerified: !isCurrentlyVerified } : u));
            } catch (err) {
                alert(`Failed to ${action} user`);
            }
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("CRITICAL: Are you sure you want to permanently delete this user? This will also cascade delete all their jobs and applications. This cannot be undone.")) {
            try {
                await api.delete(`/admin/users/${id}`);
                setUsersList(prev => prev.filter(u => u._id !== id));
            } catch (err) {
                alert("Failed to delete user completely");
            }
        }
    };

    const candidates = usersList.filter(u => u.role?.trim() === 'candidate');
    const recruiters = usersList.filter(u => u.role?.trim() === 'recruiter');

    const displayList = (activeTab === 'candidates' ? candidates : recruiters).filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.candidateCode && u.candidateCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.recruiterCode && u.recruiterCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Global Stats
    const totalUsers = usersList.length;
    const blockedCount = usersList.filter(u => u.isBlocked).length;
    const totalJobs = recruiters.reduce((sum, r) => sum + (r.stats?.jobsPosted || 0), 0);
    const totalApps = candidates.reduce((sum, c) => sum + (c.stats?.applicationsMade || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
            {/* Admin Sidebar - Hidden on mobile, shown on md and up */}
            <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 min-h-screen shrink-0 pb-10 flex-col">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-indigo-500 rounded-lg"><Shield size={24} /></div>
                        <h1 className="text-xl font-black tracking-tight">Admin Portal</h1>
                    </div>
                </div>

                <div className="p-4 flex-1">
                    <div className="space-y-2 text-sm font-medium">
                        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                            <Users size={18} /> Manage Users
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800">
                    <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-full">
                        <LogOut size={18} /> Exit Admin Portal
                    </button>
                </div>
            </div>

            {/* Mobile Header - Visible only on small screens */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <Shield size={20} className="text-indigo-400" />
                    <span className="font-bold tracking-tight">Admin Portal</span>
                </div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-white">
                    <LogOut size={20} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full">

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <StatCard title="Total Users" value={totalUsers} icon={<Users size={20} />} color="blue" />
                    <StatCard title="Active Jobs" value={totalJobs} icon={<Briefcase size={20} />} color="indigo" />
                    <StatCard title="Applications" value={totalApps} icon={<FileText size={20} />} color="emerald" />
                    <StatCard title="Blocked Accounts" value={blockedCount} icon={<Ban size={20} />} color="red" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('candidates')}
                                className={`text-base md:text-lg font-bold pb-2 border-b-2 px-1 transition-colors ${activeTab === 'candidates' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Candidates ({candidates.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('recruiters')}
                                className={`text-base md:text-lg font-bold pb-2 border-b-2 px-1 transition-colors ${activeTab === 'recruiters' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Recruiters ({recruiters.length})
                            </button>
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto bg-slate-50/50">
                        {loading ? (
                            <div className="h-full flex items-center justify-center p-10 text-slate-400 font-medium">Loading directory...</div>
                        ) : displayList.length === 0 ? (
                            <div className="h-full flex items-center justify-center p-10 text-slate-400 font-medium">No users found.</div>
                        ) : (
                            <div className="min-w-full inline-block align-middle">
                                <table className="min-w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 shadow-sm shadow-slate-200/50">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User Name & Email</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Unique ID</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Stats</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Vetting</th>
                                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Admin Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayList.map((u) => (
                                            <tr key={u._id} className="hover:bg-white transition-colors border-b border-slate-100/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                                                    <div className="text-slate-500 text-xs">{u.email}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600 bg-slate-100/30 rounded">
                                                    {activeTab === 'candidates' ? (u.candidateCode || 'N/A') : (u.recruiterCode || 'N/A')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {activeTab === 'candidates' ? (
                                                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded text-[10px] uppercase border border-emerald-100">
                                                            {u.stats?.applicationsMade || 0} Apps
                                                        </span>
                                                    ) : (
                                                        <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded text-[10px] uppercase border border-blue-100">
                                                            {u.stats?.jobsPosted || 0} Jobs
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.isBlocked ? (
                                                        <span className="text-red-600 flex items-center gap-1 font-bold text-[10px] uppercase"><Ban size={12} /> Blocked</span>
                                                    ) : (
                                                        <span className="text-emerald-600 flex items-center gap-1 font-bold text-[10px] uppercase"><CheckCircle size={12} /> Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {activeTab === 'recruiters' && (
                                                        u.isVerified ? (
                                                            <span className="text-blue-600 flex items-center gap-1 font-bold text-[10px] bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                                                                <CheckCircle size={12} fill="currentColor" className="text-white" /> Verified
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 font-bold text-[10px] uppercase">Unverified</span>
                                                        )
                                                    )}
                                                    {activeTab === 'candidates' && <span className="text-slate-300">--</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {activeTab === 'recruiters' && (
                                                            <button
                                                                onClick={() => handleToggleVerify(u._id, u.isVerified)}
                                                                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${u.isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                                                            >
                                                                {u.isVerified ? 'Undo' : 'Verify'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleToggleBlock(u._id, u.isBlocked)}
                                                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${u.isBlocked ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}
                                                        >
                                                            {u.isBlocked ? 'Unblock' : 'Block'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u._id)}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-500 border-blue-100',
        indigo: 'bg-indigo-50 text-indigo-500 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-500 border-emerald-100',
        red: 'bg-red-50 text-red-500 border-red-100',
    };

    return (
        <div className={`p-5 rounded-2xl border ${colorClasses[color]} flex flex-col gap-2 relative overflow-hidden group`}>
            <div className={`absolute -right-4 -bottom-4 opacity-10 scale-150 transition-transform group-hover:scale-[2]`}>
                {icon}
            </div>
            <div className="flex items-center gap-2 font-semibold opacity-80 text-sm uppercase tracking-wider z-10">
                {icon} {title}
            </div>
            <div className="text-3xl font-black z-10 text-slate-800">{value}</div>
        </div>
    );
}

export default AdminDashboard;
