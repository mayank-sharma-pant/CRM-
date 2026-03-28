'use client';

/**
 * Skeleton Primitive
 * Provides a base pulse animation for loading states.
 */
export default function Skeleton({ className = '', ...props }) {
    return (
        <div 
            className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} 
            {...props} 
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-1/2" />
            <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50">
            <div className="w-[30%] space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 opacity-60" />
            </div>
            <div className="w-[20%] flex justify-center">
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex-1">
                <Skeleton className="h-4 w-full" />
            </div>
            <div className="w-8">
                <Skeleton className="h-4 w-4" />
            </div>
        </div>
    );
}
