'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            setUser(null);
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

        await fetchUser();
        return response.data;
    };

    const requestOTP = async (email) => {
        const response = await api.post('/auth/request-otp', { email });
        return response.data;
    };

    const loginOTP = async (email, otp_code) => {
        const response = await api.post('/auth/login-otp', { email, otp_code });
        await fetchUser();
        return response.data;
    };

    const signup = async (userData) => {
        // Map frontend fields (camelCase) to backend expectations (snake_case)
        const payload = {
            email: userData.email,
            password: userData.password,
            full_name: userData.fullName,
            phone: userData.phone,
            company_name: userData.businessName,
            role: 'sales' // Backend overrides to 'admin' for company creator
        };
        const response = await api.post('/auth/signup', payload);
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
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
