/**
 * MobileTabDropdown Component
 * 
 * Mobile-optimized tab navigation using a dropdown selector.
 * Replaces horizontal tabs on small screens for better UX.
 * 
 * Features:
 * - Touch-optimized dropdown (min 44x44px touch targets)
 * - Icon + label display
 * - Badge support for notifications
 * - Smooth animations
 * - Accessible (ARIA labels, keyboard navigation)
 * 
 * Usage:
 * ```tsx
 * <MobileTabDropdown
 *   tabs={tabs}
 *   activeTab="overview"
 *   onTabChange={(tabId) => setActiveTab(tabId)}
 * />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TabId } from '../hooks/useAuditNavigation';

export interface MobileTab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  ariaLabel?: string;
}

interface MobileTabDropdownProps {
  tabs: MobileTab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function MobileTabDropdown({
  tabs,
  activeTab,
  onTabChange,
}: MobileTabDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside as EventListener);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleTabSelect = (tabId: TabId) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full md:hidden">
      {/* Dropdown Trigger Button - Min 44x44px touch target */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select tab"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="
          w-full min-h-[44px] px-4 py-3
          bg-black/40 border border-slate-700/50 rounded-lg
          text-slate-200 text-sm font-mono
          flex items-center justify-between gap-3
          hover:bg-black/60 active:bg-black/70
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          shadow-lg hover:shadow-xl
          active:scale-[0.98] transform
        "
      >
        {/* Active Tab Display */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon with animation */}
          <span className="text-blue-400 flex-shrink-0 transition-transform duration-300 hover:scale-110">
            {activeTabData?.icon}
          </span>

          {/* Label */}
          <span className="uppercase tracking-wider truncate">
            {activeTabData?.label}
          </span>

          {/* Badge with pulse */}
          {activeTabData?.badge !== undefined && activeTabData.badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 shadow-lg shadow-red-500/30 animate-pulse">
              {activeTabData.badge > 99 ? '99+' : activeTabData.badge}
            </span>
          )}
        </div>

        {/* Chevron Icon with smooth rotation */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-all duration-300 ease-out ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu with enhanced animation */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Tab selection"
          className="
            absolute top-full left-0 right-0 mt-2 z-50
            bg-slate-900 border border-slate-700/50 rounded-lg
            shadow-2xl shadow-black/60
            animate-in fade-in slide-in-from-top-4 duration-300
            overflow-hidden
          "
        >
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                role="option"
                aria-selected={isActive}
                aria-label={tab.ariaLabel || tab.label}
                className={`
                  w-full min-h-[44px] px-4 py-3
                  flex items-center gap-3
                  text-sm font-mono uppercase tracking-wider
                  transition-all duration-300 ease-out
                  ${
                    isActive
                      ? 'bg-blue-500/20 text-slate-100 border-l-4 border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:bg-black/40 hover:text-slate-200 active:bg-black/60 hover:border-l-4 hover:border-slate-600/50'
                  }
                  focus:outline-none focus:bg-black/40
                  active:scale-[0.98] transform
                `}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Icon with animation */}
                <span
                  className={`flex-shrink-0 transition-all duration-300 ${
                    isActive ? 'text-blue-400 scale-110' : 'text-slate-500'
                  }`}
                >
                  {tab.icon}
                </span>

                {/* Label */}
                <span className="flex-1 text-left truncate">{tab.label}</span>

                {/* Badge with pulse */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0 shadow-lg shadow-red-500/30 animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
