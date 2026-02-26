
import axios from 'axios';

const getBaseURL = () => {
    // In production, the frontend and backend are on the same domain
    // Using relative path '/api' ensures compatibility with hosting services like Render
    if (process.env.NODE_ENV === 'production' || !window.location.hostname.includes('localhost')) {
        return '/api';
    }
    // Default to localhost for local development if needed, 
    // but '/api' works locally too if we use a proxy or serve static files.
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,
});

// Add a request interceptor to inject the token from sessionStorage
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            window.location.href = '/login'; // Force redirect to login on auth failure
        }
        return Promise.reject(error);
    }
);

export default api;
