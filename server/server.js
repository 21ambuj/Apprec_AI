
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();

// 1. CORS Middleware (Must be FIRST to handle preflights)
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', /\.puter\.site$/, /\.puter\.com$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier deployment of Pollinations/Vite components
}));
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Specific Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Strict limit for auth
    message: 'Too many login attempts, please try again later'
});
app.use('/api/auth/login', authLimiter);

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50, // Limit AI usage to control costs
    message: 'AI quota exceeded for this hour'
});
app.use('/api/resume', aiLimiter);
app.use('/api/interview', aiLimiter);

// Middleware
app.use(express.json());

// Database Connection
connectDB();

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const practiceRoutes = require('./routes/practiceRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/practice', practiceRoutes);

// Serving static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

const PORT = process.env.PORT || 5000;

// Init Socket.io on top of the HTTP Server
const http = require('http');
const server = http.createServer(app);
const { init } = require('./socket');
init(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
