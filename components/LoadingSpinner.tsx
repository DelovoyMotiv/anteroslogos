import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg">
            <div className="relative">
                {/* Spinning ring */}
                <div className="w-16 h-16 border-4 border-white/10 border-t-brand-accent rounded-full animate-spin"></div>
                
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-brand-accent rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
