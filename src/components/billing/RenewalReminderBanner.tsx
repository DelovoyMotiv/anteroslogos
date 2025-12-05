// @ts-nocheck
/**
 * Renewal Reminder Banner Component
 * Displays prominent notification when subscription renewal is approaching (< 7 days)
 */

import { useState, useEffect } from 'react';
import { Clock, X, CreditCard } from 'lucide-react';
import { type USDCSubscription } from '../../../lib/dashboard/billing-client';

interface RenewalReminderBannerProps {
  subscription: USDCSubscription;
  onRenewNow: () => void;
}

export function RenewalReminderBanner({ subscription, onRenewNow }: RenewalReminderBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissedKey = `renewal-reminder-dismissed-${subscription.subscription_id}`;
    const dismissed = localStorage.getItem(dismissedKey);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Re-show banner if it was dismissed more than 24 hours ago
      if (now.getTime() - dismissedDate.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(dismissedKey);
      } else {
        setIsDismissed(true);
      }
    }
  }, [subscription.subscription_id]);

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const periodEnd = new Date(subscription.current_period_end);
      const now = new Date();
      const diff = periodEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription.current_period_end]);

  // Check if renewal is within 7 days
  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const shouldShow = daysUntilRenewal <= 7 && daysUntilRenewal > 0 && subscription.status === 'active';

  const handleDismiss = () => {
    const dismissedKey = `renewal-reminder-dismissed-${subscription.subscription_id}`;
    localStorage.setItem(dismissedKey, new Date().toISOString());
    setIsDismissed(true);
  };

  if (!shouldShow || isDismissed) {
    return null;
  }

  // Determine urgency level
  const urgencyLevel = daysUntilRenewal <= 2 ? 'critical' : daysUntilRenewal <= 4 ? 'warning' : 'info';
  
  const urgencyStyles = {
    critical: {
      bg: 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      border: 'border-red-300 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20',
      border: 'border-yellow-300 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      icon: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      border: 'border-blue-300 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = urgencyStyles[urgencyLevel];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-6 shadow-lg animate-slide-down`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className={`p-3 rounded-full bg-white dark:bg-gray-900 ${styles.icon}`}>
            <Clock className="w-6 h-6" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${styles.text} mb-2`}>
              {urgencyLevel === 'critical' && '🚨 Subscription Expiring Soon!'}
              {urgencyLevel === 'warning' && '⚠️ Renewal Reminder'}
              {urgencyLevel === 'info' && '📅 Upcoming Renewal'}
            </h3>
            <p className={`text-sm ${styles.text} mb-4`}>
              Your subscription will renew in{' '}
              <span className="font-bold">
                {timeRemaining.days > 0 && `${timeRemaining.days} day${timeRemaining.days !== 1 ? 's' : ''}`}
                {timeRemaining.days > 0 && timeRemaining.hours > 0 && ', '}
                {timeRemaining.hours > 0 && `${timeRemaining.hours} hour${timeRemaining.hours !== 1 ? 's' : ''}`}
                {timeRemaining.days === 0 && timeRemaining.hours > 0 && timeRemaining.minutes > 0 && ', '}
                {timeRemaining.days === 0 && timeRemaining.minutes > 0 && `${timeRemaining.minutes} minute${timeRemaining.minutes !== 1 ? 's' : ''}`}
              </span>
              . Make sure you have sufficient USDC in your wallet for automatic renewal.
            </p>

            {/* Countdown Timer */}
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-sm">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {timeRemaining.days}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Days</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-sm">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {timeRemaining.hours}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Hours</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-sm">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {timeRemaining.minutes}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Minutes</div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onRenewNow}
              className={`${styles.button} px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md hover:shadow-lg`}
            >
              <CreditCard className="w-4 h-4" />
              Renew Now
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className={`p-2 hover:bg-white/50 dark:hover:bg-gray-900/50 rounded-lg transition-colors ${styles.icon}`}
          title="Dismiss for 24 hours"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
