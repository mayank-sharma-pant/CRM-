import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
