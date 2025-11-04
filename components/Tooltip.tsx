/**
 * Tooltip Component - Hi-End UX
 * Contextual help with progressive disclosure
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  iconSize?: number;
  delay?: number;
  maxWidth?: string;
}

const Tooltip = ({ 
  content, 
  children, 
  position = 'top',
  showIcon = true,
  iconSize = 16,
  delay = 300,
  maxWidth = '300px'
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      adjustPosition();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const adjustPosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let newPosition = position;

    // Check if tooltip goes off screen and adjust
    if (position === 'top' && tooltipRect.top < 0) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && tooltipRect.bottom > viewportHeight) {
      newPosition = 'top';
    } else if (position === 'left' && tooltipRect.left < 0) {
      newPosition = 'right';
    } else if (position === 'right' && tooltipRect.right > viewportWidth) {
      newPosition = 'left';
    }

    setActualPosition(newPosition);
  };

  const getPositionClasses = () => {
    const base = 'absolute z-50 pointer-events-none';
    switch (actualPosition) {
      case 'top':
        return `${base} bottom-full left-1/2 -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${base} top-full left-1/2 -translate-x-1/2 mt-2`;
      case 'left':
        return `${base} right-full top-1/2 -translate-y-1/2 mr-2`;
      case 'right':
        return `${base} left-full top-1/2 -translate-y-1/2 ml-2`;
      default:
        return `${base} bottom-full left-1/2 -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const base = 'absolute w-2 h-2 bg-gray-800 border border-gray-700 transform rotate-45';
    switch (actualPosition) {
      case 'top':
        return `${base} -bottom-1 left-1/2 -translate-x-1/2`;
      case 'bottom':
        return `${base} -top-1 left-1/2 -translate-x-1/2`;
      case 'left':
        return `${base} -right-1 top-1/2 -translate-y-1/2`;
      case 'right':
        return `${base} -left-1 top-1/2 -translate-y-1/2`;
      default:
        return `${base} -bottom-1 left-1/2 -translate-x-1/2`;
    }
  };

  return (
    <div 
      className="relative inline-flex items-center"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* Trigger */}
      <div className="flex items-center gap-1 cursor-help">
        {children}
        {showIcon && (
          <HelpCircle 
            size={iconSize} 
            className="text-white/40 hover:text-white/60 transition-colors"
          />
        )}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={getPositionClasses()}
          style={{ maxWidth }}
        >
          <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
            <div className="text-sm text-white/90 leading-relaxed">
              {content}
            </div>
          </div>
          <div className={getArrowClasses()} />
        </div>
      )}
    </div>
  );
};

// Helper component for inline help icons
export const HelpIcon = ({ tooltip, size = 14 }: { tooltip: string; size?: number }) => {
  return (
    <Tooltip content={tooltip} showIcon={false}>
      <HelpCircle 
        size={size} 
        className="text-white/40 hover:text-brand-accent transition-colors cursor-help"
      />
    </Tooltip>
  );
};

// Progressive Disclosure component for collapsible sections
export const Disclosure = ({ 
  title, 
  children, 
  defaultOpen = false,
  badge
}: { 
  title: string; 
  children: ReactNode; 
  defaultOpen?: boolean;
  badge?: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-brand-accent transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-white">{title}</span>
          {badge}
        </div>
        <span className="text-xs text-white/40">
          {isOpen ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>
      
      {isOpen && (
        <div className="px-6 py-4 bg-white/5 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
