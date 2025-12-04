/**
 * TabButton Component
 * 
 * Individual tab button with active/hover states and optional badge.
 * 
 * Features:
 * - Active state styling (blue border, darker background)
 * - Hover state styling (lighter background)
 * - Icon support with color coding
 * - Optional badge for notifications/counts
 * - Keyboard accessible
 * - Smooth transitions
 * 
 * Usage:
 * ```tsx
 * <TabButton
 *   id="overview"
 *   label="Overview"
 *   icon={<BarChart3 className="w-4 h-4" />}
 *   isActive={activeTab === 'overview'}
 *   onClick={() => setActiveTab('overview')}
 *   badge={5}
 * />
 * ```
 */

import React from 'react';

interface TabButtonProps {
  /** Unique identifier for the tab */
  id: string;
  
  /** Display label for the tab */
  label: string;
  
  /** Icon element to display */
  icon: React.ReactNode;
  
  /** Whether this tab is currently active */
  isActive: boolean;
  
  /** Click handler */
  onClick: () => void;
  
  /** Optional badge count (e.g., number of issues) */
  badge?: number;
  
  /** Optional additional CSS classes */
  className?: string;
  
  /** Optional ARIA label for accessibility */
  ariaLabel?: string;
}

export function TabButton({
  id,
  label,
  icon,
  isActive,
  onClick,
  badge,
  className = '',
  ariaLabel,
}: TabButtonProps) {
  return (
    <button
      id={`tab-${id}`}
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-selected={isActive}
      role="tab"
      className={`
        relative px-4 py-3 flex items-center gap-2.5
        text-xs font-mono uppercase tracking-wider
        border-b-2 transition-all duration-300 ease-out
        ${
          isActive
            ? 'bg-black/40 border-blue-500 text-slate-200 shadow-lg shadow-blue-500/10'
            : 'bg-black/20 border-transparent text-slate-500 hover:bg-black/30 hover:text-slate-300 hover:border-slate-700/50'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
        active:scale-[0.98] transform
        ${className}
      `}
    >
      {/* Icon with conditional color and micro-animation */}
      <span
        className={`transition-all duration-300 ${
          isActive ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:scale-105'
        }`}
      >
        {icon}
      </span>

      {/* Label */}
      <span className="relative">
        {label}
        {/* Active underline indicator */}
        {isActive && (
          <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-400/50 rounded-full" />
        )}
      </span>

      {/* Optional Badge with pulse animation */}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse"
          aria-label={`${badge} items`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
