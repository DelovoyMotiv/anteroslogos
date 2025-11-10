import React from 'react';

/**
 * PulseLine - Organic animated pulse line with varied, natural-looking spikes
 * Single continuous line that deforms with multiple pulse patterns
 * Non-repeating appearance through complex staggered animations
 */
const PulseLine: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-12 sm:h-16 w-full max-w-2xl mx-auto overflow-hidden relative">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pulse-line-svg"
        aria-hidden="true"
      >
        {/* Continuous animated pulse line with varied spikes */}
        <path
          d="M -50,30 L 50,30 L 55,30 L 58,22 L 61,38 L 64,26 L 67,30 L 120,30 L 125,30 L 127,20 L 130,40 L 132,18 L 135,42 L 137,25 L 140,30 L 210,30 L 214,30 L 216,25 L 218,35 L 220,28 L 222,30 L 290,30 L 295,30 L 297,15 L 301,45 L 304,20 L 308,40 L 311,28 L 314,30 L 380,30 L 384,30 L 386,24 L 388,36 L 390,27 L 392,30 L 460,30 L 464,30 L 466,18 L 469,42 L 471,22 L 474,38 L 476,26 L 479,30 L 550,30 L 554,30 L 556,23 L 558,37 L 560,29 L 562,30 L 630,30 L 634,30 L 636,16 L 640,44 L 643,21 L 647,39 L 650,27 L 653,30 L 720,30 L 850,30"
          stroke="url(#pulseGradient)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="main-pulse-line"
        />
        
        {/* Glow layer for depth */}
        <path
          d="M -50,30 L 50,30 L 55,30 L 58,22 L 61,38 L 64,26 L 67,30 L 120,30 L 125,30 L 127,20 L 130,40 L 132,18 L 135,42 L 137,25 L 140,30 L 210,30 L 214,30 L 216,25 L 218,35 L 220,28 L 222,30 L 290,30 L 295,30 L 297,15 L 301,45 L 304,20 L 308,40 L 311,28 L 314,30 L 380,30 L 384,30 L 386,24 L 388,36 L 390,27 L 392,30 L 460,30 L 464,30 L 466,18 L 469,42 L 471,22 L 474,38 L 476,26 L 479,30 L 550,30 L 554,30 L 556,23 L 558,37 L 560,29 L 562,30 L 630,30 L 634,30 L 636,16 L 640,44 L 643,21 L 647,39 L 650,27 L 653,30 L 720,30 L 850,30"
          stroke="url(#pulseGlowGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.25"
          filter="url(#glow)"
          className="glow-pulse-line"
        />
        
        {/* Subtle particles following the pulse */}
        <circle r="2" fill="#3B82F6" opacity="0.8" className="particle particle-1" />
        <circle r="1.5" fill="#60A5FA" opacity="0.7" className="particle particle-2" />
        <circle r="2" fill="#93C5FD" opacity="0.6" className="particle particle-3" />
        
        {/* Definitions */}
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
            <stop offset="70%" stopColor="#93C5FD" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
          </linearGradient>
          
          <linearGradient id="pulseGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.2" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
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
        
        .main-pulse-line {
          animation: flowRight 6s linear infinite;
          filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.4));
        }
        
        .glow-pulse-line {
          animation: flowRight 6s linear infinite, glowPulse 2.3s ease-in-out infinite;
        }
        
        .particle {
          animation: particleFlow1 5.2s linear infinite;
        }
        
        .particle-2 {
          animation: particleFlow2 6.7s linear infinite;
        }
        
        .particle-3 {
          animation: particleFlow3 7.8s linear infinite;
        }
        
        @keyframes flowRight {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(50px);
          }
        }
        
        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.2;
          }
          33% {
            opacity: 0.35;
          }
          66% {
            opacity: 0.25;
          }
        }
        
        @keyframes particleFlow1 {
          0% {
            transform: translate(-50px, 30px);
            opacity: 0;
          }
          5% {
            opacity: 0.8;
          }
          20% {
            transform: translate(120px, 30px);
          }
          25% {
            opacity: 0;
          }
          100% {
            transform: translate(850px, 30px);
            opacity: 0;
          }
        }
        
        @keyframes particleFlow2 {
          0% {
            transform: translate(-50px, 30px);
            opacity: 0;
          }
          15% {
            opacity: 0;
          }
          18% {
            opacity: 0.7;
          }
          35% {
            transform: translate(295px, 30px);
          }
          40% {
            opacity: 0;
          }
          100% {
            transform: translate(850px, 30px);
            opacity: 0;
          }
        }
        
        @keyframes particleFlow3 {
          0% {
            transform: translate(-50px, 30px);
            opacity: 0;
          }
          25% {
            opacity: 0;
          }
          28% {
            opacity: 0.6;
          }
          48% {
            transform: translate(464px, 30px);
          }
          52% {
            opacity: 0;
          }
          100% {
            transform: translate(850px, 30px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PulseLine;
