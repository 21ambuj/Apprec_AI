
import axios from 'axios';

const getBaseURL = () => {
    // Check if running in a Puter.com environment
    if (window.location.hostname.includes('puter.site') || window.location.hostname.includes('puter.com')) {
        // Many Puter apps expose backend on port 5000 via a specific subdomain
        // We try to use a relative path if they are on the same domain, or construct the Puter proxy URL
        return '/api';
    }
    // Default to localhost for local development
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
