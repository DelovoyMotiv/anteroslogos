import React from 'react';

/**
 * PulseLine - Seamless infinite pulse animation
 * Pattern duplicates itself for continuous flow without visible reset
 * Uses modular animation for perfect loop
 */
const PulseLine: React.FC = () => {
  // Repeating pattern segment (400px)
  const patternSegment = "L 0,30 L 50,30 L 55,30 L 58,22 L 61,38 L 64,26 L 67,30 L 110,30 L 115,30 L 117,20 L 120,40 L 122,18 L 125,42 L 127,25 L 130,30 L 180,30 L 184,30 L 186,25 L 188,35 L 190,28 L 192,30 L 240,30 L 245,30 L 247,15 L 251,45 L 254,20 L 258,40 L 261,28 L 264,30 L 310,30 L 314,30 L 316,24 L 318,36 L 320,27 L 322,30 L 370,30 L 374,30 L 376,23 L 378,37 L 380,29 L 382,30 L 400,30";
  
  // Create seamless path by repeating pattern 3 times
  const seamlessPath = `M -50,30 ${patternSegment} ${patternSegment.replace(/L (\d+),/g, (_match, p1) => `L ${parseInt(p1) + 400},`)} ${patternSegment.replace(/L (\d+),/g, (_match, p1) => `L ${parseInt(p1) + 800},`)} L 1250,30`;
  
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
        {/* Main seamless pulse line */}
        <path
          d={seamlessPath}
          stroke="url(#pulseGradient)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="main-pulse-line"
        />
        
        {/* Glow layer */}
        <path
          d={seamlessPath}
          stroke="url(#pulseGlowGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.25"
          filter="url(#glow)"
          className="glow-pulse-line"
        />
        
        {/* Floating particles */}
        <circle r="2" fill="#3B82F6" className="particle particle-1" />
        <circle r="1.5" fill="#60A5FA" className="particle particle-2" />
        <circle r="2" fill="#93C5FD" className="particle particle-3" />
        
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.5" />
          </linearGradient>
          
          <linearGradient id="pulseGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.3" />
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
          animation: seamlessFlow 8s linear infinite;
          filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.4));
        }
        
        .glow-pulse-line {
          animation: seamlessFlow 8s linear infinite, subtleGlow 3.7s ease-in-out infinite;
        }
        
        .particle-1 {
          animation: seamlessParticle1 6.4s linear infinite;
          opacity: 0;
        }
        
        .particle-2 {
          animation: seamlessParticle2 7.9s linear infinite;
          opacity: 0;
        }
        
        .particle-3 {
          animation: seamlessParticle3 9.1s linear infinite;
          opacity: 0;
        }
        
        /* Seamless flow - moves exactly one pattern length (400px) */
        @keyframes seamlessFlow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-400px);
          }
        }
        
        @keyframes subtleGlow {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        /* Particle 1 - appears at spike positions */
        @keyframes seamlessParticle1 {
          0% {
            transform: translate(55px, 30px);
            opacity: 0;
          }
          3% {
            opacity: 0.8;
          }
          8% {
            transform: translate(67px, 30px);
            opacity: 0;
          }
          25% {
            transform: translate(115px, 30px);
            opacity: 0;
          }
          28% {
            opacity: 0.8;
          }
          33% {
            transform: translate(130px, 30px);
            opacity: 0;
          }
          50% {
            transform: translate(245px, 30px);
            opacity: 0;
          }
          53% {
            opacity: 0.8;
          }
          58% {
            transform: translate(264px, 30px);
            opacity: 0;
          }
          75% {
            transform: translate(374px, 30px);
            opacity: 0;
          }
          78% {
            opacity: 0.8;
          }
          83% {
            transform: translate(382px, 30px);
            opacity: 0;
          }
          100% {
            transform: translate(400px, 30px);
            opacity: 0;
          }
        }
        
        /* Particle 2 - different timing */
        @keyframes seamlessParticle2 {
          0% {
            transform: translate(0px, 30px);
            opacity: 0;
          }
          15% {
            transform: translate(184px, 30px);
            opacity: 0;
          }
          17% {
            opacity: 0.7;
          }
          22% {
            transform: translate(192px, 30px);
            opacity: 0;
          }
          40% {
            transform: translate(314px, 30px);
            opacity: 0;
          }
          42% {
            opacity: 0.7;
          }
          47% {
            transform: translate(322px, 30px);
            opacity: 0;
          }
          100% {
            transform: translate(500px, 30px);
            opacity: 0;
          }
        }
        
        /* Particle 3 - slowest timing */
        @keyframes seamlessParticle3 {
          0% {
            transform: translate(-50px, 30px);
            opacity: 0;
          }
          20% {
            transform: translate(117px, 30px);
            opacity: 0;
          }
          22% {
            opacity: 0.6;
          }
          27% {
            transform: translate(127px, 30px);
            opacity: 0;
          }
          55% {
            transform: translate(247px, 30px);
            opacity: 0;
          }
          57% {
            opacity: 0.6;
          }
          62% {
            transform: translate(261px, 30px);
            opacity: 0;
          }
          100% {
            transform: translate(450px, 30px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PulseLine;
