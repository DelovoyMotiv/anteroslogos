/**
 * Hi-End Chart Theme System
 * Inspired by modern tech dashboards with gradient overlays
 */

export const CHART_THEME = {
  // Modern gradient colors for charts
  gradients: {
    primary: {
      start: '#a78bfa', // purple-400
      middle: '#818cf8', // indigo-400
      end: '#60a5fa', // blue-400
    },
    secondary: {
      start: '#34d399', // emerald-400
      middle: '#10b981', // emerald-500
      end: '#06b6d4', // cyan-500
    },
    accent: {
      start: '#f472b6', // pink-400
      middle: '#e879f9', // fuchsia-400
      end: '#c084fc', // purple-400
    },
    success: {
      start: '#4ade80', // green-400
      middle: '#22d3ee', // cyan-400
      end: '#2dd4bf', // teal-400
    },
    warning: {
      start: '#fb923c', // orange-400
      middle: '#fbbf24', // amber-400
      end: '#facc15', // yellow-400
    },
    danger: {
      start: '#f87171', // red-400
      middle: '#fb7185', // rose-400
      end: '#f97316', // orange-500
    },
  },

  // Score-based gradient mapping
  scoreGradients: {
    excellent: { // 80-100
      colors: ['#34d399', '#10b981', '#059669'],
      glow: 'rgba(16, 185, 129, 0.3)',
    },
    good: { // 60-79
      colors: ['#60a5fa', '#3b82f6', '#2563eb'],
      glow: 'rgba(59, 130, 246, 0.3)',
    },
    fair: { // 40-59
      colors: ['#fbbf24', '#f59e0b', '#d97706'],
      glow: 'rgba(245, 158, 11, 0.3)',
    },
    poor: { // 0-39
      colors: ['#f87171', '#ef4444', '#dc2626'],
      glow: 'rgba(239, 68, 68, 0.3)',
    },
  },

  // Category-specific colors with gradients
  categories: {
    schemaMarkup: {
      gradient: ['#a78bfa', '#818cf8'],
      glow: 'rgba(167, 139, 250, 0.4)',
      solid: '#a78bfa',
    },
    aiCrawlers: {
      gradient: ['#60a5fa', '#3b82f6'],
      glow: 'rgba(96, 165, 250, 0.4)',
      solid: '#60a5fa',
    },
    eeat: {
      gradient: ['#34d399', '#10b981'],
      glow: 'rgba(52, 211, 153, 0.4)',
      solid: '#34d399',
    },
    technicalSEO: {
      gradient: ['#fb923c', '#f59e0b'],
      glow: 'rgba(251, 146, 60, 0.4)',
      solid: '#fb923c',
    },
    linkAnalysis: {
      gradient: ['#22d3ee', '#06b6d4'],
      glow: 'rgba(34, 211, 238, 0.4)',
      solid: '#22d3ee',
    },
    metaTags: {
      gradient: ['#c084fc', '#a855f7'],
      glow: 'rgba(192, 132, 252, 0.4)',
      solid: '#c084fc',
    },
    contentQuality: {
      gradient: ['#2dd4bf', '#14b8a6'],
      glow: 'rgba(45, 212, 191, 0.4)',
      solid: '#2dd4bf',
    },
    structure: {
      gradient: ['#f472b6', '#ec4899'],
      glow: 'rgba(244, 114, 182, 0.4)',
      solid: '#f472b6',
    },
    performance: {
      gradient: ['#fbbf24', '#f59e0b'],
      glow: 'rgba(251, 191, 36, 0.4)',
      solid: '#fbbf24',
    },
  },

  // Priority colors
  priorities: {
    critical: {
      gradient: ['#f87171', '#dc2626'],
      glow: 'rgba(248, 113, 113, 0.5)',
      solid: '#ef4444',
    },
    high: {
      gradient: ['#fb923c', '#ea580c'],
      glow: 'rgba(251, 146, 60, 0.5)',
      solid: '#f97316',
    },
    medium: {
      gradient: ['#fbbf24', '#d97706'],
      glow: 'rgba(251, 191, 36, 0.5)',
      solid: '#f59e0b',
    },
    low: {
      gradient: ['#4ade80', '#16a34a'],
      glow: 'rgba(74, 222, 128, 0.5)',
      solid: '#22c55e',
    },
  },

  // Background patterns
  backgrounds: {
    card: 'bg-gradient-to-br from-slate-800/50 via-slate-900/30 to-slate-800/50',
    cardBorder: 'border-slate-700/50',
    chartBg: 'from-slate-800/40 to-transparent',
    overlay: 'backdrop-blur-sm',
  },

  // Grid and axis colors
  grid: {
    stroke: '#334155', // slate-700
    opacity: 0.2,
  },
  axis: {
    stroke: '#64748b', // slate-500
    tick: '#94a3b8', // slate-400
    label: '#cbd5e1', // slate-300
  },
  tooltip: {
    bg: 'rgba(15, 23, 42, 0.95)', // slate-900 with opacity
    border: '#475569', // slate-600
    text: '#f1f5f9', // slate-100
  },
};

/**
 * Get gradient definition for SVG
 */
export function createGradientDef(id: string, colors: string[], vertical = false): string {
  const direction = vertical ? { x1: 0, y1: 0, x2: 0, y2: 1 } : { x1: 0, y1: 0, x2: 1, y2: 0 };
  return `
    <linearGradient id="${id}" x1="${direction.x1}" y1="${direction.y1}" x2="${direction.x2}" y2="${direction.y2}">
      ${colors.map((color, i) => {
        const offset = (i / (colors.length - 1)) * 100;
        return `<stop offset="${offset}%" stopColor="${color}" />`;
      }).join('')}
    </linearGradient>
  `;
}

/**
 * Get score-based gradient
 */
export function getScoreGradient(score: number): { colors: string[], glow: string } {
  if (score >= 80) return CHART_THEME.scoreGradients.excellent;
  if (score >= 60) return CHART_THEME.scoreGradients.good;
  if (score >= 40) return CHART_THEME.scoreGradients.fair;
  return CHART_THEME.scoreGradients.poor;
}

/**
 * Generate CSS gradient string
 */
export function getCSSGradient(colors: string[], angle = 135): string {
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
}
