import { Zap } from 'lucide-react';

export function Loading() {
    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[50vh] w-full">
            <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-[var(--card-border)] border-t-[var(--accent-blue)] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-[var(--accent-blue)] animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-[var(--text-secondary)] font-medium animate-pulse">Loading...</p>
        </div>
    );
}
