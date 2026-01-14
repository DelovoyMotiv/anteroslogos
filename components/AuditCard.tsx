import React from 'react';

export interface AuditCardProps {
  domain: string;
  score: number;
  grade: string;
  timestamp?: string;
  scoreSchemaMarkup?: number;
  scoreEeat?: number;
  scorePerformance?: number;
  scoreAiCrawlers?: number;
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

// Score color for mini metrics
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
};

// Format timestamp to relative time
const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

const AuditCard: React.FC<AuditCardProps> = React.memo(({ 
  domain, 
  score, 
  grade,
  timestamp,
  scoreSchemaMarkup,
  scoreEeat,
  scorePerformance,
  scoreAiCrawlers,
}) => {
  // Round score to nearest integer per requirements 2.5
  const displayScore = Math.round(score);
  
  // Get grade color classes, fallback to neutral if grade not found
  const gradeColorClass = gradeColors[grade] || 'text-white/70 bg-white/10 border-white/30';
  
  // Format relative time
  const relativeTime = formatTimestamp(timestamp);
  
  return (
    <article
      className="flex-shrink-0 w-[160px] sm:w-[180px] lg:w-[200px] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg p-2.5 hover:from-white/15 hover:to-white/10 hover:border-brand-accent/50 hover:shadow-lg hover:shadow-brand-accent/10 transition-all duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 backdrop-blur-sm"
      aria-label={`Audit result for ${domain}`}
      role="listitem"
      tabIndex={0}
    >
      {/* Header: Domain + Timestamp */}
      <div className="mb-2">
        {/* Domain name with truncation */}
        <h3 
          className="text-white font-semibold text-xs mb-0.5 truncate group-hover:text-brand-accent transition-colors"
          title={domain}
        >
          {domain}
        </h3>
        
        {/* Timestamp */}
        {relativeTime && (
          <p className="text-white/40 text-[9px]">
            {relativeTime}
          </p>
        )}
      </div>
      
      {/* Main Score Section */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-white/50 text-[8px] mb-0.5 uppercase tracking-wider">GEO Score</p>
          <p 
            className="text-brand-accent text-xl font-bold leading-none group-hover:scale-105 transition-transform"
            aria-label={`Score: ${displayScore} out of 100`}
          >
            {displayScore}
          </p>
        </div>
        
        {/* Grade badge */}
        <div
          className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColorClass} transition-all duration-300 group-hover:scale-105`}
          aria-label={`Grade: ${grade}`}
          role="status"
        >
          {grade}
        </div>
      </div>
      
      {/* Mini Metrics Grid - No Icons */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Schema Markup */}
        {scoreSchemaMarkup !== undefined && (
          <div className="bg-white/5 rounded p-1.5 group-hover:bg-white/10 transition-colors">
            <p className="text-white/40 text-[8px] uppercase tracking-wide truncate mb-0.5">Schema</p>
            <p className={`text-xs font-bold ${getScoreColor(scoreSchemaMarkup)}`}>
              {Math.round(scoreSchemaMarkup)}
            </p>
          </div>
        )}
        
        {/* E-E-A-T */}
        {scoreEeat !== undefined && (
          <div className="bg-white/5 rounded p-1.5 group-hover:bg-white/10 transition-colors">
            <p className="text-white/40 text-[8px] uppercase tracking-wide truncate mb-0.5">E-E-A-T</p>
            <p className={`text-xs font-bold ${getScoreColor(scoreEeat)}`}>
              {Math.round(scoreEeat)}
            </p>
          </div>
        )}
        
        {/* Performance */}
        {scorePerformance !== undefined && (
          <div className="bg-white/5 rounded p-1.5 group-hover:bg-white/10 transition-colors">
            <p className="text-white/40 text-[8px] uppercase tracking-wide truncate mb-0.5">Speed</p>
            <p className={`text-xs font-bold ${getScoreColor(scorePerformance)}`}>
              {Math.round(scorePerformance)}
            </p>
          </div>
        )}
        
        {/* AI Crawlers */}
        {scoreAiCrawlers !== undefined && (
          <div className="bg-white/5 rounded p-1.5 group-hover:bg-white/10 transition-colors">
            <p className="text-white/40 text-[8px] uppercase tracking-wide truncate mb-0.5">AI Ready</p>
            <p className={`text-xs font-bold ${getScoreColor(scoreAiCrawlers)}`}>
              {Math.round(scoreAiCrawlers)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
});

AuditCard.displayName = 'AuditCard';

export default AuditCard;
