import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/dashboard/auth-guard';
import { Search } from 'lucide-react';

interface GeoAnalysisFormProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAnalyzing: boolean;
  compact?: boolean;
}

const GeoAnalysisForm: React.FC<GeoAnalysisFormProps> = ({
  url,
  onUrlChange,
  onSubmit,
  isAnalyzing,
  compact = false
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require authentication
    if (!user) {
      navigate(`/auth/signup?redirect=${encodeURIComponent('/geo-audit?url=' + url)}`);
      return;
    }
    
    onSubmit(e);
  };

  return (
    <div className={`${compact ? 'max-w-3xl' : 'max-w-2xl'} mx-auto space-y-4`}>
      <form onSubmit={handleSubmit}>
      {/* Desktop: Input with button inside */}
      <div className="hidden lg:block relative">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter your website URL (e.g., example.com)"
          className="w-full px-6 py-5 pr-40 bg-white/5 border-2 border-brand-secondary focus:border-brand-accent rounded-xl text-lg focus:outline-none transition-colors"
          disabled={isAnalyzing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          maxLength={2048}
          pattern="[^<>{}[\]|;`]*"
          title="Enter a valid website URL"
        />
        <button
          type="submit"
          disabled={isAnalyzing}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Analyze</span>
            </>
          )}
        </button>
      </div>
      
      {/* Mobile: Stacked input and button */}
      <div className="lg:hidden space-y-4">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter URL (e.g., example.com)"
          className="w-full px-6 py-4 bg-white/5 border-2 border-brand-secondary focus:border-brand-accent rounded-xl text-base focus:outline-none transition-colors"
          disabled={isAnalyzing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          maxLength={2048}
          pattern="[^<>{}[\]|;`]*"
          title="Enter a valid website URL"
        />
        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full bg-brand-accent hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing Your Site...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Analyze Website</span>
            </>
          )}
        </button>
      </div>
      </form>
      
      {/* Auth Info Banner */}
      {!user && (
        <div className="text-center">
          <p className="text-sm text-white/70">
            Free analysis requires a free account · Sign up in 30 seconds · No credit card · 100 free credits
          </p>
        </div>
      )}
    </div>
  );
};

export default GeoAnalysisForm;
