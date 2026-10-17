'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ChatPage from '../../components/chat/ChatPage';

export default function ChatRoute() {
    return (
        <Suspense
            fallback={(
                <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-page">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
            )}
        >
            <ChatPage />
        </Suspense>
    );
}
