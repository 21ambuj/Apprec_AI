
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import JobDetails from './pages/JobDetails';
import SkillPractice from './pages/SkillPractice';
import Profile from './pages/Profile';
import AIInterview from './pages/AIInterview';
import Chat from './pages/Chat'; // NEW
import SettingsPage from './pages/Settings';

// Admin Routes
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './context/CallContext'; // NEW
import { ThemeProvider } from './context/ThemeContext'; // Global Dark Mode
import ProtectedRoute from './components/ProtectedRoute';

import RecruiterDashboard from './pages/RecruiterDashboard';
import PostJob from './pages/PostJob';
import JobApplicants from './pages/JobApplicants';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
              <Navbar />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* General Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                {/* Recruiter Routes */}
                <Route path="/recruiter-dashboard" element={<ProtectedRoute requiredRole="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
                <Route path="/post-job" element={<ProtectedRoute requiredRole="recruiter"><PostJob /></ProtectedRoute>} />
                <Route path="/job/:id/applicants" element={<ProtectedRoute requiredRole="recruiter"><JobApplicants /></ProtectedRoute>} />

                {/* Candidate Routes */}
                <Route path="/jobs" element={<JobSearch />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/jobs/:id/interview" element={<ProtectedRoute requiredRole="candidate"><AIInterview /></ProtectedRoute>} />
                <Route path="/practice" element={<ProtectedRoute requiredRole="candidate"><SkillPractice /></ProtectedRoute>} />

                {/* Secure Admin Routes */}
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Routes>
            </div>
          </Router>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
