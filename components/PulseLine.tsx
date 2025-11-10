import React from 'react';

/**
 * PulseLine - Thin horizontal baseline with pulse spikes moving left to right
 * Represents "feeling the internet's pulse in real-time" - like an EKG/heart monitor
 * Pure visual element without text
 */
const PulseLine: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-12 sm:h-16 w-full max-w-lg mx-auto overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pulse-line-svg"
        aria-hidden="true"
      >
        {/* Base horizontal line (thin, continuous) */}
        <line
          x1="0"
          y1="30"
          x2="600"
          y2="30"
          stroke="#3B82F6"
          strokeWidth="1"
          opacity="0.4"
          className="baseline"
        />
        
        {/* Animated pulse spikes group - moves left to right */}
        <g className="pulse-group">
          {/* Pulse spike 1 */}
          <path
            d="M 0,30 L 5,30 L 7,15 L 10,45 L 12,20 L 15,30 L 20,30"
            stroke="#3B82F6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="pulse-spike"
          />
          
          {/* Pulse spike 2 (delayed) */}
          <path
            d="M 150,30 L 155,30 L 157,18 L 159,42 L 161,22 L 163,30 L 168,30"
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="pulse-spike"
            opacity="0.8"
          />
          
          {/* Pulse spike 3 (more delayed) */}
          <path
            d="M 300,30 L 305,30 L 307,16 L 310,44 L 312,21 L 315,30 L 320,30"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="pulse-spike"
            opacity="0.9"
          />
        </g>
        
        {/* Glow effect for spikes */}
        <g className="pulse-group-glow" opacity="0.3" filter="url(#glow)">
          <path
            d="M 0,30 L 5,30 L 7,15 L 10,45 L 12,20 L 15,30 L 20,30"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 150,30 L 155,30 L 157,18 L 159,42 L 161,22 L 163,30 L 168,30"
            stroke="#60A5FA"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 300,30 L 305,30 L 307,16 L 310,44 L 312,21 L 315,30 L 320,30"
            stroke="#93C5FD"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
        
        {/* Filters */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      <style>{`
        .pulse-line-svg {
          opacity: 0.85;
        }
        
        .baseline {
          animation: baselinePulse 3s ease-in-out infinite;
        }
        
        .pulse-group,
        .pulse-group-glow {
          animation: moveRight 4s linear infinite;
        }
        
        .pulse-spike {
          filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.6));
        }
        
        @keyframes moveRight {
          0% {
            transform: translateX(-320px);
          }
          100% {
            transform: translateX(600px);
          }
        }
        
        @keyframes baselinePulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default PulseLine;
