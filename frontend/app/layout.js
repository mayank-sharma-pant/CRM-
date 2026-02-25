import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import Layout from '../components/Layout';
import RouteGuard from '../components/RouteGuard';
import ErrorBoundary from '../components/ErrorBoundary';

export const metadata = {
    title: 'LocalCRM - Simple CRM for Service Businesses',
    description: 'A simple, fast CRM that helps local service businesses track leads, automate follow-ups, and grow revenue.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="antialiased">
                <ThemeProvider>
                    <AuthProvider>
                        <ErrorBoundary>
                            <RouteGuard>
                                <Layout>
                                    {children}
                                </Layout>
                            </RouteGuard>
                        </ErrorBoundary>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
