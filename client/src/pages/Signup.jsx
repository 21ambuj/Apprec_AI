
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('candidate');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/signup', { name, email, password, role });
            // API returns: { _id, name, email, role, token }
            // API returns: { _id, name, email, role, token }
            login(data, data.token);

            if (data.role === 'recruiter') {
                navigate('/recruiter-dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/50 p-6 sm:p-10 relative border border-gray-100 dark:border-gray-700 mx-auto transition-all">
                <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to</span> Home
                </Link>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-8 mt-10">Create Account</h2>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@company.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">I am a...</label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="role"
                                    value="candidate"
                                    checked={role === 'candidate'}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-4 h-4 accent-blue-600 transition-transform group-hover:scale-110"
                                />
                                <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Job Seeker</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="role"
                                    value="recruiter"
                                    checked={role === 'recruiter'}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-4 h-4 accent-blue-600 transition-transform group-hover:scale-110"
                                />
                                <span className="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Recruiter</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-lg mt-4"
                    >
                        Create Account
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-600">
                    Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
