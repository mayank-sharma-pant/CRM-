'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';

const AuthContext = createContext();

// --- AUTH BYPASS CONFIGURATION ---
// Set to true to access dashboard without login (for development)
const BYPASS_AUTH = false;  // Changed to false to use real auth
// ---------------------------------

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (BYPASS_AUTH) {
            setUser({
                id: 999,
                name: 'Demo User',
                email: 'demo@example.com',
                role: 'admin'
            });
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        // Backend uses OAuth2PasswordRequestForm which expects form data
        // with 'username' and 'password' fields
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, user: userData } = response.data;
        localStorage.setItem('token', access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(userData);
        return response.data;
    };

    const requestOTP = async (email) => {
        const response = await api.post('/auth/request-otp', { email });
        return response.data;
    };

    const loginOTP = async (email, otp_code) => {
        const response = await api.post('/auth/login-otp', { email, otp_code });
        const { access_token, user: userData } = response.data;
        localStorage.setItem('token', access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUser(userData);
        return response.data;
    };

    const signup = async (userData) => {
        // Map frontend fields (camelCase) to backend expectations (snake_case)
        const payload = {
            email: userData.email,
            password: userData.password,
            full_name: userData.fullName,
            phone: userData.phone,
            role: 'sales' // Default role for public signup
        };
        const response = await api.post('/auth/signup', payload);
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, requestOTP, loginOTP, signup, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
