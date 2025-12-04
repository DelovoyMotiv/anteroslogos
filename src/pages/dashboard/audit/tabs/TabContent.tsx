/**
 * TabContent Component
 * 
 * Wrapper for tab content with smooth fade-in transitions.
 * Conditionally renders content based on active state.
 * 
 * Features:
 * - Fade-in animation on mount
 * - Slide-up effect for smooth appearance
 * - Conditional rendering (only renders when active)
 * - Consistent spacing and layout
 * 
 * Usage:
 * ```tsx
 * <TabContent isActive={activeTab === 'overview'}>
 *   <OverviewTab result={result} />
 * </TabContent>
 * ```
 */

import React from 'react';

interface TabContentProps {
  /** Whether this content should be displayed */
  isActive: boolean;
  
  /** Content to render when active */
  children: React.ReactNode;
  
  /** Optional additional CSS classes */
  className?: string;
  
  /** Optional ID for the content panel */
  id?: string;
}

export function TabContent({
  isActive,
  children,
  className = '',
  id,
}: TabContentProps) {
  // Don't render if not active (performance optimization)
  if (!isActive) return null;

  return (
    <div
      id={id}
      role="tabpanel"
      aria-hidden={!isActive}
      className={`
        animate-in fade-in slide-in-from-bottom-4 
        duration-500 ease-out
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * CSS Animation Keyframes
 * 
 * Add this to your global CSS file (e.g., index.css or tailwind.css):
 * 
 * @keyframes fadeIn {
 *   from {
 *     opacity: 0;
 *     transform: translateY(10px);
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateY(0);
 *   }
 * }
 * 
 * .animate-fadeIn {
 *   animation: fadeIn 200ms ease-in-out;
 * }
 */
