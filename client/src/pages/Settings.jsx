import { useNavigate } from 'react-router-dom';
import { User, Briefcase, FileText, Settings, LogOut, Sparkles, Home, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-6 py-3 font-medium transition-colors ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-4 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'}`}
    >
        {icon} {label}
    </button>
);

const SettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow border-r border-gray-100 dark:border-gray-700 hidden md:flex flex-col h-screen sticky top-0">
                <div className="pt-6"></div>
                <div className="px-6 py-4 flex items-center gap-3 mb-4">
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
                    <NavItem icon={<User size={18} />} label="Overview" onClick={() => navigate('/dashboard')} />
                    <NavItem icon={<Briefcase size={18} />} label="Find Jobs" onClick={() => navigate('/jobs')} />
                    <NavItem icon={<Sparkles size={18} />} label="Skill Practice" onClick={() => navigate('/practice')} />
                    <NavItem icon={<FileText size={18} />} label="Profile" onClick={() => navigate('/profile')} />
                    <NavItem icon={<Settings size={18} />} label="Settings" active />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
                <header className="mb-8 md:mb-10 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-base md:text-lg">Manage your preferences and account settings.</p>
                </header>

                <div className="max-w-3xl space-y-8">
                    {/* Display Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6">Display Settings</h2>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                    {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    Switch between light and dark themes.
                                </p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                aria-label="Toggle dark mode"
                                className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${isDark ? 'translate-x-9' : 'translate-x-1'}`} />
                                {isDark
                                    ? <Moon size={14} className="absolute left-2 text-white pointer-events-none" />
                                    : <Sun size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Account Settings */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6">Account</h2>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-b border-gray-100 dark:border-gray-700 gap-4">
                                <div className="text-center sm:text-left">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">User Profile</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your professional identity.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800 transition-all active:scale-95"
                                >
                                    Manage Profile
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between py-6 gap-4">
                                <div className="text-center sm:text-left">
                                    <h3 className="font-semibold text-red-600 dark:text-red-400 text-lg">Log Out</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Securely end your session.</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
