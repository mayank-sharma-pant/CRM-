import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';

export const metadata = {
    title: 'Local Service CRM',
    description: 'A simple CRM built for local service businesses',
};

import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
