/**
 * Intent Triggers List Component
 * 
 * Displays detected intent triggers that agents can perform.
 * Shows element selectors, confidence levels, and groups by intent type.
 * Highlights high-confidence actions for easy identification.
 * 
 * Requirements: 9.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { Target, ChevronRight, Code, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { IntentTriggersListProps, Confidence } from '../../lib/auxAudit/types';

/**
 * Get color classes and icon based on confidence level
 * - Green: high confidence
 * - Yellow: medium confidence
 * - Gray: low confidence
 */
function getConfidenceStyles(confidence: Confidence): {
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
  label: string;
} {
  switch (confidence) {
    case 'high':
      return {
        textColor: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        icon: CheckCircle2,
        label: 'High Confidence',
      };
    case 'medium':
      return {
        textColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: AlertCircle,
        label: 'Medium Confidence',
      };
    case 'low':
      return {
        textColor: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
        icon: HelpCircle,
        label: 'Low Confidence',
      };
  }
}

/**
 * Get icon and color for intent type
 */
function getIntentIcon(intent: string): {
  icon: string;
  color: string;
} {
  const intentLower = intent.toLowerCase();
  
  if (intentLower.includes('buy') || intentLower.includes('purchase') || intentLower.includes('cart')) {
    return { icon: '🛒', color: 'text-purple-400' };
  }
  if (intentLower.includes('book') || intentLower.includes('reserve')) {
    return { icon: '📅', color: 'text-blue-400' };
  }
  if (intentLower.includes('login') || intentLower.includes('signin') || intentLower.includes('sign in')) {
    return { icon: '🔐', color: 'text-cyan-400' };
  }
  if (intentLower.includes('signup') || intentLower.includes('register') || intentLower.includes('sign up')) {
    return { icon: '✍️', color: 'text-green-400' };
  }
  if (intentLower.includes('search')) {
    return { icon: '🔍', color: 'text-yellow-400' };
  }
  if (intentLower.includes('contact') || intentLower.includes('message')) {
    return { icon: '💬', color: 'text-pink-400' };
  }
  if (intentLower.includes('download')) {
    return { icon: '⬇️', color: 'text-indigo-400' };
  }
  if (intentLower.includes('submit')) {
    return { icon: '📤', color: 'text-orange-400' };
  }
  
  return { icon: '🎯', color: 'text-slate-400' };
}

export default function IntentTriggersList({ intentTriggers }: IntentTriggersListProps) {
  // Group triggers by intent type
  const groupedTriggers = intentTriggers.reduce((acc, trigger) => {
    const intent = trigger.intent;
    if (!acc[intent]) {
      acc[intent] = [];
    }
    acc[intent].push(trigger);
    return acc;
  }, {} as Record<string, typeof intentTriggers>);

  // Sort intents alphabetically
  const sortedIntents = Object.keys(groupedTriggers).sort();

  // Count high-confidence triggers
  const highConfidenceCount = intentTriggers.filter(t => t.confidence === 'high').length;
  const totalCount = intentTriggers.length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
          <Target className="w-5 h-5 text-blue-400" />
          Detected Actions
        </h3>
        <span className="text-sm text-slate-400">
          {totalCount} {totalCount === 1 ? 'action' : 'actions'} detected
        </span>
      </div>

      {totalCount === 0 ? (
        // No intent triggers detected
        <div className="p-6 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <Target className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-300">
              No Actions Detected
            </h4>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            No clear intent triggers were identified on this page. 
            Consider adding semantic labels to interactive elements to help agents understand available actions.
          </p>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className={`p-4 mb-4 rounded-lg border ${
            highConfidenceCount > 0 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <p className="text-sm text-slate-300">
              {highConfidenceCount > 0 ? (
                <>
                  <span className="text-green-400 font-semibold">{highConfidenceCount} high-confidence {highConfidenceCount === 1 ? 'action' : 'actions'}</span> detected. 
                  Agents can reliably perform {highConfidenceCount === 1 ? 'this action' : 'these actions'} on your site.
                </>
              ) : (
                <>
                  <span className="text-yellow-400 font-semibold">No high-confidence actions</span> detected. 
                  Consider improving semantic labels to increase agent confidence.
                </>
              )}
            </p>
          </div>

          {/* Grouped triggers */}
          <div className="space-y-4">
            {sortedIntents.map((intent) => {
              const triggers = groupedTriggers[intent];
              const intentInfo = getIntentIcon(intent);
              
              // Sort triggers by confidence (high > medium > low)
              const sortedTriggers = [...triggers].sort((a, b) => {
                const confidenceOrder = { high: 3, medium: 2, low: 1 };
                return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
              });

              return (
                <IntentGroup
                  key={intent}
                  intent={intent}
                  icon={intentInfo.icon}
                  iconColor={intentInfo.color}
                  triggers={sortedTriggers}
                />
              );
            })}
          </div>

          {/* Info footer */}
          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-500 leading-snug">
              Actions are grouped by intent type and sorted by confidence level. 
              High-confidence actions are most likely to be successfully executed by autonomous agents.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Group of triggers for a specific intent type
 */
function IntentGroup({ 
  intent, 
  icon, 
  iconColor, 
  triggers 
}: { 
  intent: string; 
  icon: string; 
  iconColor: string;
  triggers: IntentTriggersListProps['intentTriggers'];
}) {
  const highConfidenceCount = triggers.filter(t => t.confidence === 'high').length;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700 rounded-lg overflow-hidden">
      {/* Group header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={intent}>
              {icon}
            </span>
            <div>
              <h4 className={`font-semibold ${iconColor}`}>
                {intent.charAt(0).toUpperCase() + intent.slice(1)}
              </h4>
              <p className="text-xs text-slate-400">
                {triggers.length} {triggers.length === 1 ? 'trigger' : 'triggers'} found
                {highConfidenceCount > 0 && (
                  <span className="text-green-400 ml-1">
                    • {highConfidenceCount} high-confidence
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Triggers list */}
      <div className="divide-y divide-slate-700">
        {triggers.map((trigger, index) => (
          <TriggerCard key={`${trigger.selector}-${index}`} trigger={trigger} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual trigger card
 */
function TriggerCard({ trigger }: { trigger: IntentTriggersListProps['intentTriggers'][0] }) {
  const confidenceStyles = getConfidenceStyles(trigger.confidence);
  const ConfidenceIcon = confidenceStyles.icon;
  
  // Highlight high-confidence actions with a different background
  const isHighConfidence = trigger.confidence === 'high';

  return (
    <div className={`p-4 ${isHighConfidence ? 'bg-green-500/5' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Confidence indicator */}
        <div className={`p-2 ${confidenceStyles.bgColor} rounded-lg flex-shrink-0 ${isHighConfidence ? 'ring-2 ring-green-500/30' : ''}`}>
          <ConfidenceIcon className={`w-4 h-4 ${confidenceStyles.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Confidence badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${confidenceStyles.bgColor} ${confidenceStyles.textColor}`}>
              <ConfidenceIcon className="w-3 h-3" />
              {confidenceStyles.label}
            </span>
            {isHighConfidence && (
              <span className="text-xs text-green-400 font-medium">
                ✓ Agent-Ready
              </span>
            )}
          </div>

          {/* Element details */}
          <div className="space-y-2">
            {/* Element tag and text */}
            {trigger.element.text && (
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Element Text:</span>
                  <p className="text-sm text-slate-300 font-medium">
                    "{trigger.element.text}"
                  </p>
                </div>
              </div>
            )}

            {/* ARIA label if present */}
            {trigger.element.ariaLabel && (
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">ARIA Label:</span>
                  <p className="text-sm text-slate-300">
                    {trigger.element.ariaLabel}
                  </p>
                </div>
              </div>
            )}

            {/* Selector */}
            <div className="flex items-start gap-2">
              <Code className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-500 uppercase tracking-wide">CSS Selector:</span>
                <div className="bg-slate-950 rounded px-2 py-1 mt-1 overflow-x-auto">
                  <code className="text-xs text-blue-400 font-mono">
                    {trigger.selector}
                  </code>
                </div>
              </div>
            </div>

            {/* Element type */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 bg-slate-800 rounded">
                {trigger.element.tag}
              </span>
              {trigger.element.role && (
                <span className="px-2 py-0.5 bg-slate-800 rounded">
                  role: {trigger.element.role}
                </span>
              )}
              {trigger.element.type && (
                <span className="px-2 py-0.5 bg-slate-800 rounded">
                  type: {trigger.element.type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
