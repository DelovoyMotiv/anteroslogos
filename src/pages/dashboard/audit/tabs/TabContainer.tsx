/**
 * TabContainer Component
 * 
 * Wrapper component for tab navigation interface.
 * Provides consistent styling and layout for tab buttons.
 * 
 * Features:
 * - Horizontal tab bar layout on desktop
 * - Responsive: hides on mobile (use MobileTabDropdown instead)
 * - Bottom border separator
 * - Responsive spacing
 * - Consistent styling across all tabs
 * 
 * Usage:
 * ```tsx
 * <TabContainer>
 *   <TabButton ... />
 *   <TabButton ... />
 * </TabContainer>
 * ```
 */

import React from 'react';

interface TabContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function TabContainer({ children, className = '' }: TabContainerProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Tab Navigation Bar - Hidden on mobile, shown on md+ with enhanced styling */}
      <div className="
        hidden md:flex items-center gap-1 
        border-b-2 border-slate-800/50 
        mb-6
        bg-gradient-to-b from-transparent to-black/10
        pb-1
        shadow-sm
      ">
        {children}
      </div>
    </div>
  );
}
