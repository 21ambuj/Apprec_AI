import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        if (user.role === 'recruiter') {
            return <Navigate to="/recruiter-dashboard" replace />;
        } else {
            return <Navigate to="/dashboard" replace />;
        }
    }

    // Implicit role checks for general protected routes
    if (!requiredRole) {
        // If a Recruiter tries to access /profile or /dashboard, redirect them
        if (user.role === 'recruiter' && (window.location.pathname === '/dashboard' || window.location.pathname === '/profile' || window.location.pathname === '/practice')) {
            return <Navigate to="/recruiter-dashboard" replace />;
        }

        // If Candidate tries to access Recruiter routes (handled by requiredRole, but good fallback)
        if (user.role === 'candidate' && window.location.pathname.includes('recruiter')) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
