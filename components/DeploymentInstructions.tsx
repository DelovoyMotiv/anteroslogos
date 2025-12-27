/**
 * DeploymentInstructions Component
 * 
 * Displays simple, non-technical deployment instructions for agents.json.
 * Designed for users without coding experience.
 * 
 * Features:
 * - Clear, ordered steps
 * - Non-technical language
 * - Platform compatibility note
 * - No mention of HTML editing or link tags
 * - Follows platform design system
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import { CheckCircle } from 'lucide-react';

interface DeploymentInstructionsProps {
  className?: string;
}

export default function DeploymentInstructions({ className = '' }: DeploymentInstructionsProps) {
  const steps = [
    'Download agents.json',
    'Upload it to the root directory of your website hosting (public_html)',
    'Verify it is accessible at https://your-domain.com/agents.json'
  ];

  return (
    <div className={`bg-slate-950 border border-slate-800 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-mono font-bold text-white mb-2">
          Deployment Instructions
        </h3>
        <p className="text-xs sm:text-sm font-mono text-slate-400">
          Follow these simple steps to add agents.json to your website
        </p>
      </div>

      {/* Steps */}
      <ol className="space-y-3 mb-4">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            {/* Step Number */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-400">
                {index + 1}
              </span>
            </div>
            
            {/* Step Text */}
            <p className="text-sm sm:text-base font-mono text-slate-300 leading-relaxed pt-0.5">
              {step}
            </p>
          </li>
        ))}
      </ol>

      {/* Platform Compatibility Note */}
      <div className="flex items-start gap-3 p-3 bg-green-950/20 border border-green-900/30">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm font-mono text-green-400 font-bold mb-1">
            No coding required
          </p>
          <p className="text-[10px] sm:text-xs font-mono text-slate-400">
            Works with WordPress, Shopify, Tilda, and Custom Stacks.
          </p>
        </div>
      </div>
    </div>
  );
}
