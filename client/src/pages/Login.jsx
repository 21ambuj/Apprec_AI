
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/login', { email, password });
            // API returns: { _id, name, email, role, token }
            // API returns: { _id, name, email, role, token }
            login(data, data.token); // Pass user data and token

            if (data.role === 'recruiter') {
                navigate('/recruiter-dashboard');
            } else if (data.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl dark:shadow-gray-900/50 p-6 sm:p-10 relative border border-gray-100 dark:border-gray-700 mx-auto transition-all">
                <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to</span> Home
                </Link>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 dark:text-white mb-8 mt-10">Welcome Back</h2>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-lg"
                    >
                        Sign In
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-600">
                    Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
