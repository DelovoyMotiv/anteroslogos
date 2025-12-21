import React from 'react';
import { LogosJSON } from '../lib/agentManifest/types';

export interface JSONDisplayProps {
  json: LogosJSON;
  className?: string;
}

/**
 * JSONDisplay Component
 * Displays formatted JSON with syntax highlighting for logos.json manifests
 * 
 * @param json - The LogosJSON object to display
 * @param className - Optional additional CSS classes
 */
export const JSONDisplay: React.FC<JSONDisplayProps> = ({ json, className = '' }) => {
  // Format JSON with 2-space indentation
  const formattedJSON = JSON.stringify(json, null, 2);

  return (
    <div className={`relative ${className}`}>
      <pre 
        className="bg-brand-secondary/20 border border-brand-secondary/40 rounded-xl p-6 overflow-x-auto"
        role="region"
        aria-label="Generated manifest JSON code"
        tabIndex={0}
      >
        <code className="text-sm font-mono text-brand-text/90 leading-relaxed whitespace-pre">
          {formattedJSON}
        </code>
      </pre>
    </div>
  );
};

export default JSONDisplay;
