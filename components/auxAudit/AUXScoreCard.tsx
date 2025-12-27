/**
 * AUX Score Card Component
 * 
 * Displays the AUX (Agent Experience) Score prominently with color coding,
 * classification label, and summary text.
 * 
 * Requirements: 9.1
 */

import React from 'react';
import { Bot, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AUXScoreCardProps } from '../../lib/auxAudit/types';

/**
 * Get color classes and styling based on AUX Score
 * - Red: score < 50 (Agent-Blind)
 * - Yellow: 50 <= score <= 80 (Agent-Capable)
 * - Green: score > 80 (Agent-Ready)
 */
function getScoreColors(score: number): {
  textColor: string;
  bgColor: string;
  borderColor: string;
  gradientColor: string;
  icon: typeof AlertTriangle;
} {
  if (score < 50) {
    return {
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      gradientColor: 'from-red-500 to-red-700',
      icon: AlertTriangle,
    };
  }
  
  if (score <= 80) {
    return {
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      gradientColor: 'from-yellow-500 to-orange-500',
      icon: TrendingUp,
    };
  }
  
  return {
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    gradientColor: 'from-green-500 to-emerald-600',
    icon: CheckCircle,
  };
}

/**
 * Get description text based on classification
 */
function getClassificationDescription(classification: string): string {
  switch (classification) {
    case 'Agent-Blind':
      return 'Your site has significant barriers preventing autonomous agents from completing tasks. Critical improvements needed.';
    case 'Agent-Capable':
      return 'Your site supports basic agent interactions but has room for improvement. Address key friction points to enhance actionability.';
    case 'Agent-Ready':
      return 'Excellent! Your site is well-optimized for autonomous agent interactions with minimal friction.';
    default:
      return '';
  }
}

export default function AUXScoreCard({ score, classification, summary }: AUXScoreCardProps) {
  const colors = getScoreColors(score);
  const Icon = colors.icon;
  const description = getClassificationDescription(classification);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-slate-100">
        <Bot className="w-5 h-5 text-blue-400" />
        AUX Score
      </h3>
      
      <div className={`p-6 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border ${colors.borderColor} rounded-lg`}>
        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-2">
              <span className={`text-5xl font-bold tabular-nums ${colors.textColor}`}>
                {score}
              </span>
              <span className="text-2xl text-slate-500 font-medium">/ 100</span>
            </div>
            
            {/* Classification Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${colors.bgColor} ${colors.textColor}`}>
                <Icon className="w-4 h-4" />
                {classification}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
          
          {/* Circular Progress Indicator */}
          <div className="relative w-24 h-24 flex-shrink-0 ml-6">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-800"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                className={colors.textColor}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot className={`w-8 h-8 ${colors.textColor}`} />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 bg-gradient-to-r ${colors.gradientColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Summary Section */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">
            Analysis Summary
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {summary}
          </p>
        </div>

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 leading-snug">
            AUX Score measures how well your website supports autonomous AI agents (OpenAI Operator, Claude Computer Use) 
            in completing tasks like purchasing, booking, or logging in.
          </p>
        </div>
      </div>
    </div>
  );
}
