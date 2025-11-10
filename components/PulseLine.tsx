import React from 'react';

/**
 * PulseLine - Animated sine wave / pulse line representing "feeling the internet's pulse in real-time"
 * Pure visual element without text - allegorical representation of data flow and connectivity
 */
const PulseLine: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-16 sm:h-20 w-full max-w-md mx-auto">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pulse-line-svg"
        aria-hidden="true"
      >
        {/* Main pulse line with animated path */}
        <path
          d="M 0,40 L 60,40 L 80,20 L 100,60 L 120,10 L 140,70 L 160,40 L 180,40 L 200,30 L 220,50 L 240,20 L 260,60 L 280,40 L 300,40 L 320,25 L 340,55 L 360,40 L 400,40"
          stroke="url(#pulseGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="pulse-path"
        />
        
        {/* Glow effect underneath */}
        <path
          d="M 0,40 L 60,40 L 80,20 L 100,60 L 120,10 L 140,70 L 160,40 L 180,40 L 200,30 L 220,50 L 240,20 L 260,60 L 280,40 L 300,40 L 320,25 L 340,55 L 360,40 L 400,40"
          stroke="url(#pulseGlowGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.4"
          filter="url(#glow)"
          className="pulse-glow"
        />
        
        {/* Traveling pulse indicators */}
        <circle r="4" fill="#3B82F6" className="pulse-dot pulse-dot-1">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            path="M 0,40 L 60,40 L 80,20 L 100,60 L 120,10 L 140,70 L 160,40 L 180,40 L 200,30 L 220,50 L 240,20 L 260,60 L 280,40 L 300,40 L 320,25 L 340,55 L 360,40 L 400,40"
          />
        </circle>
        
        <circle r="4" fill="#60A5FA" className="pulse-dot pulse-dot-2">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            begin="0.5s"
            path="M 0,40 L 60,40 L 80,20 L 100,60 L 120,10 L 140,70 L 160,40 L 180,40 L 200,30 L 220,50 L 240,20 L 260,60 L 280,40 L 300,40 L 320,25 L 340,55 L 360,40 L 400,40"
          />
        </circle>
        
        <circle r="4" fill="#93C5FD" className="pulse-dot pulse-dot-3">
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            begin="1s"
            path="M 0,40 L 60,40 L 80,20 L 100,60 L 120,10 L 140,70 L 160,40 L 180,40 L 200,30 L 220,50 L 240,20 L 260,60 L 280,40 L 300,40 L 320,25 L 340,55 L 360,40 L 400,40"
          />
        </circle>
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3">
              <animate
                attributeName="stopOpacity"
                values="0.3;0.8;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3">
              <animate
                attributeName="stopOpacity"
                values="0.3;0.8;0.3"
                dur="2s"
                repeatCount="indefinite"
                begin="1s"
              />
            </stop>
          </linearGradient>
          
          <linearGradient id="pulseGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.2" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      <style>{`
        .pulse-line-svg {
          opacity: 0.9;
        }
        
        .pulse-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 2s ease-out forwards, pulseFlow 4s ease-in-out infinite 2s;
        }
        
        .pulse-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }
        
        .pulse-dot {
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.8));
        }
        
        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes pulseFlow {
          0%, 100% {
            opacity: 0.9;
          }
          50% {
            opacity: 1;
          }
        }
        
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default PulseLine;
