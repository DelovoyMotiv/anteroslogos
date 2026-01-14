import React from 'react';

export interface AuditCardProps {
  domain: string;
  score: number;
  grade: string;
}

// Grade color mapping based on design document
const gradeColors: Record<string, string> = {
  'A+': 'text-green-400 bg-green-400/10 border-green-400/30',
  'A': 'text-green-400 bg-green-400/10 border-green-400/30',
  'B': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'C': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  'D': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  'F': 'text-red-400 bg-red-400/10 border-red-400/30',
};

const AuditCard: React.FC<AuditCardProps> = React.memo(({ domain, score, grade }) => {
  // Round score to nearest integer per requirements 2.5
  const displayScore = Math.round(score);
  
  // Get grade color classes, fallback to neutral if grade not found
  const gradeColorClass = gradeColors[grade] || 'text-white/70 bg-white/10 border-white/30';
  
  return (
    <article
      className="flex-shrink-0 w-[180px] sm:w-[200px] lg:w-[220px] bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-brand-accent/50 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      aria-label={`Audit result for ${domain}`}
      role="listitem"
      tabIndex={0}
    >
      {/* Domain name with truncation */}
      <h3 
        className="text-white font-medium text-sm mb-3 truncate"
        title={domain}
      >
        {domain}
      </h3>
      
      {/* Score and Grade in compact layout */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-white/50 text-xs mb-0.5">Score</p>
          <p 
            className="text-brand-accent text-2xl font-bold leading-none"
            aria-label={`Score: ${displayScore} out of 100`}
          >
            {displayScore}
          </p>
        </div>
        
        {/* Compact grade badge */}
        <div
          className={`px-3 py-1.5 rounded-md text-sm font-semibold ${gradeColorClass} transition-all duration-300`}
          aria-label={`Grade: ${grade}`}
          role="status"
        >
          {grade}
        </div>
      </div>
      
      {/* Compact score bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-accent rounded-full transition-all duration-500 group-hover:bg-blue-400"
          style={{ width: `${displayScore}%` }}
          role="progressbar"
          aria-valuenow={displayScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Score progress: ${displayScore} percent`}
        />
      </div>
    </article>
  );
});

AuditCard.displayName = 'AuditCard';

export default AuditCard;
