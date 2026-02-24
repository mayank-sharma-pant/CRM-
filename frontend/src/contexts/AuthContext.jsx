'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api/api';

const AuthContext = createContext();

// Role → dashboard path mapping
const ROLE_DASHBOARDS = {
    sales: '/sales/dashboard',
    manager: '/manager/dashboard',
    md: '/md/dashboard',
    purchase: '/purchase/dashboard',
    admin: '/admin/dashboard',
};

function getDashboardPath(role) {
    return ROLE_DASHBOARDS[role] || '/sales/dashboard';
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // On mount: check for existing token and fetch user
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser().catch(() => {
                // Token expired or invalid — clear it
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/me');
            setUser(res.data);
            return res.data;
        } catch (err) {
            setUser(null);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        // Backend uses OAuth2PasswordRequestForm (form-urlencoded)
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/api/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, user: userData } = res.data;

        // Store token and set default header
        localStorage.setItem('token', access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

        setUser(userData);
        return { user: userData, token: access_token };
    };

    const signup = async (userData) => {
        // Backend expects: { email, full_name, password, role, phone }
        const payload = {
            email: userData.email,
            full_name: userData.fullName,
            password: userData.password,
            role: 'md', // Default role for company signup
            phone: userData.phone || null,
        };

        const res = await api.post('/api/auth/signup', payload);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, fetchUser, getDashboardPath }}>
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
