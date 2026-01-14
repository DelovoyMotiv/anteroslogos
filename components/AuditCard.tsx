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
      className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[360px] bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-brand-accent/50 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      aria-label={`Audit result for ${domain}`}
      role="listitem"
      tabIndex={0}
    >
      {/* Domain name with truncation */}
      <h3 
        className="text-white font-semibold text-lg mb-4 truncate"
        title={domain}
      >
        {domain}
      </h3>
      
      {/* Score display */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-white/70 text-sm mb-1">Score</p>
          <p 
            className="text-brand-accent text-4xl font-bold"
            aria-label={`Score: ${displayScore} out of 100`}
          >
            {displayScore}
          </p>
        </div>
        
        {/* Grade display with color coding */}
        <div
          className={`px-4 py-2 rounded-lg border font-semibold text-lg ${gradeColorClass} transition-all duration-300`}
          aria-label={`Grade: ${grade}`}
          role="status"
        >
          {grade}
        </div>
      </div>
      
      {/* Score bar visualization */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
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
