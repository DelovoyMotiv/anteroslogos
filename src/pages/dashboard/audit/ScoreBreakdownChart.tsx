/**
 * Score Breakdown Chart Component
 * Visualizes core, technical, and content scores with Recharts
 */

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_THEME } from '../../../../utils/chartTheme';

interface ScoreBreakdownChartProps {
  breakdown: {
    core: number;
    technical: number;
    content: number;
    weighted: number;
  };
}

export function ScoreBreakdownChart({ breakdown }: ScoreBreakdownChartProps) {
  const data = [
    { category: 'Core GEO', score: breakdown.core, fullMark: 100 },
    { category: 'Technical', score: breakdown.technical, fullMark: 100 },
    { category: 'Content', score: breakdown.content, fullMark: 100 },
    { category: 'Weighted', score: breakdown.weighted, fullMark: 100 },
  ];

  return (
    <div className="bg-black/20 border border-slate-800/50 p-3 md:p-4">
      <h3 className="text-[10px] md:text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 md:mb-3">
        Score Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke={CHART_THEME.grid.stroke} strokeOpacity={CHART_THEME.grid.opacity} />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ fill: CHART_THEME.axis.tick, fontSize: 9 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: CHART_THEME.axis.tick, fontSize: 8 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_THEME.tooltip.bg,
              border: `1px solid ${CHART_THEME.tooltip.border}`,
              borderRadius: '4px',
              color: CHART_THEME.tooltip.text,
              fontSize: '11px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
