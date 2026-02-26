
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, User, LogOut, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();

    // Hide navbar completely on admin routes for isolation
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-gray-900 shadow dark:shadow-gray-800/50 py-4 border-b border-transparent dark:border-gray-800">
            <div className="container mx-auto px-6 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Briefcase size={24} />
                    Apprec AI
                </Link>

                <div className="flex items-center gap-6">
                    {user?.role === 'recruiter' ? (
                        <>
                            <Link to="/recruiter-dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Dashboard</Link>
                            <Link to="/post-job" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Post Job</Link>
                            <Link to="/chat" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1">
                                <MessageCircle size={18} /> Inbox
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/jobs" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Find Jobs</Link>
                            <Link to="/practice" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Skill Practice</Link>
                            {user && <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Dashboard</Link>}
                            {user && (
                                <Link to="/chat" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1">
                                    <MessageCircle size={18} /> Inbox
                                </Link>
                            )}
                        </>
                    )}

                    {/* Dark Mode Quick Toggle */}
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle dark mode"
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-4">
                            {user?.role === 'candidate' && (
                                <Link to="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1">
                                    <User size={18} /> Profile
                                </Link>
                            )}
                            {user?.role === 'recruiter' && (
                                <Link to="/recruiter-dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1">
                                    <User size={18} /> Company Profile
                                </Link>
                            )}
                            {/* Settings gear only for candidates */}
                            {user?.role === 'candidate' && (
                                <Link to="/settings" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center">
                                    <Settings size={18} />
                                </Link>
                            )}
                            <button onClick={handleLogout} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 border border-transparent dark:border-red-800/30 transition-colors flex items-center gap-2">
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
