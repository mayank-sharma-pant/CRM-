'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Global Error Boundary — catches React render errors
 * and shows a user-friendly fallback instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-page px-4">
                    <div className="max-w-md w-full bg-surface rounded-xl border border-border shadow-lg p-8 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-error" />
                        </div>
                        <h2 className="text-lg font-bold text-primary mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-secondary mb-6">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="text-left text-xs bg-surface-elevated border border-border rounded-lg p-3 mb-4 overflow-auto max-h-32 text-error">
                                {this.state.error.toString()}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-2 bg-surface-elevated border border-border text-secondary rounded-lg text-sm font-semibold hover:bg-surface transition-all"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
