/**
 * Friction Points List Component
 * 
 * Displays a list of detected friction points that prevent or hinder
 * autonomous agent interactions. Shows descriptions and severity levels
 * with color-coded indicators.
 * 
 * Requirements: 9.3
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Shield, Lock, Image, Ban } from 'lucide-react';
import type { FrictionPointsListProps, FrictionType, Severity } from '../../lib/auxAudit/types';

/**
 * Get icon for friction type
 */
function getFrictionIcon(type: FrictionType): typeof AlertTriangle {
  switch (type) {
    case 'captcha':
      return Shield;
    case 'interstitial':
      return Ban;
    case 'canvas':
      return Image;
    case 'auth-wall':
      return Lock;
    default:
      return AlertCircle;
  }
}

/**
 * Get color classes based on severity
 * - Red: high severity
 * - Yellow: medium severity
 * - Blue: low severity
 */
function getSeverityColors(severity: Severity): {
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: typeof AlertTriangle;
} {
  switch (severity) {
    case 'high':
      return {
        textColor: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        textColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: AlertCircle,
      };
    case 'low':
      return {
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        icon: Info,
      };
  }
}

/**
 * Get display name for friction type
 */
function getFrictionTypeName(type: FrictionType): string {
  switch (type) {
    case 'captcha':
      return 'CAPTCHA';
    case 'interstitial':
      return 'Interstitial';
    case 'canvas':
      return 'Canvas UI';
    case 'auth-wall':
      return 'Authentication Wall';
    default:
      return 'Other';
  }
}

export default function FrictionPointsList({ frictionPoints }: FrictionPointsListProps) {
  // Group friction points by severity for better organization
  const highSeverity = frictionPoints.filter(fp => fp.severity === 'high');
  const mediumSeverity = frictionPoints.filter(fp => fp.severity === 'medium');
  const lowSeverity = frictionPoints.filter(fp => fp.severity === 'low');

  const totalCount = frictionPoints.length;
  const highCount = highSeverity.length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Friction Points
        </h3>
        <span className="text-sm text-slate-400">
          {totalCount} {totalCount === 1 ? 'issue' : 'issues'} detected
        </span>
      </div>

      {totalCount === 0 ? (
        // No friction points - show success message
        <div className="p-6 bg-gradient-to-br from-green-900/20 to-green-900/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="text-lg font-semibold text-green-400">
              No Friction Detected
            </h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Excellent! No significant barriers were found that would prevent autonomous agents 
            from interacting with your site. Your site appears to be agent-friendly.
          </p>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className={`p-4 mb-4 rounded-lg border ${
            highCount > 0 
              ? 'bg-red-500/10 border-red-500/30' 
              : mediumSeverity.length > 0
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}>
            <p className="text-sm text-slate-300">
              {highCount > 0 ? (
                <>
                  <span className="text-red-400 font-semibold">{highCount} critical {highCount === 1 ? 'issue' : 'issues'}</span> detected. 
                  These barriers significantly impact agent actionability and should be addressed immediately.
                </>
              ) : mediumSeverity.length > 0 ? (
                <>
                  <span className="text-yellow-400 font-semibold">{mediumSeverity.length} moderate {mediumSeverity.length === 1 ? 'issue' : 'issues'}</span> detected. 
                  These may hinder some agent interactions and should be reviewed.
                </>
              ) : (
                <>
                  <span className="text-blue-400 font-semibold">{lowSeverity.length} minor {lowSeverity.length === 1 ? 'issue' : 'issues'}</span> detected. 
                  These have minimal impact but could be improved.
                </>
              )}
            </p>
          </div>

          {/* Friction points list */}
          <div className="space-y-3">
            {/* High severity first */}
            {highSeverity.map((friction, index) => (
              <FrictionPointCard key={`high-${index}`} friction={friction} />
            ))}
            
            {/* Medium severity */}
            {mediumSeverity.map((friction, index) => (
              <FrictionPointCard key={`medium-${index}`} friction={friction} />
            ))}
            
            {/* Low severity */}
            {lowSeverity.map((friction, index) => (
              <FrictionPointCard key={`low-${index}`} friction={friction} />
            ))}
          </div>

          {/* Info footer */}
          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-500 leading-snug">
              Friction points are barriers that prevent or hinder autonomous agents from completing tasks. 
              Addressing high-severity issues will significantly improve your AUX Score.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Individual friction point card
 */
function FrictionPointCard({ friction }: { friction: FrictionPointsListProps['frictionPoints'][0] }) {
  const severityColors = getSeverityColors(friction.severity);
  const FrictionIcon = getFrictionIcon(friction.type);
  const SeverityIcon = severityColors.icon;
  const typeName = getFrictionTypeName(friction.type);

  return (
    <div className={`p-4 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border ${severityColors.borderColor} rounded-lg`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 ${severityColors.bgColor} rounded-lg flex-shrink-0`}>
          <FrictionIcon className={`w-5 h-5 ${severityColors.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with type and severity */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold text-slate-200">
              {typeName}
            </h4>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors.bgColor} ${severityColors.textColor}`}>
              <SeverityIcon className="w-3 h-3" />
              {friction.severity.charAt(0).toUpperCase() + friction.severity.slice(1)} Severity
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed mb-2">
            {friction.description}
          </p>

          {/* Location (if available) */}
          {friction.location && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Location:</span>
              <code className="text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
                {friction.location}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
