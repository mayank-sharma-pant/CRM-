import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Prefer this app’s lockfile when a parent directory also has package-lock.json (quiets Playwright/dev noise).
    outputFileTracingRoot: join(__dirname),

    async rewrites() {
        const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
        return [
            {
                source: '/api/:path*',
                destination: `${backend}/api/:path*`,
            },
            {
                source: '/platform/:path*',
                destination: `${backend}/platform/:path*`,
            },
        ];
    },
};

export default nextConfig;
