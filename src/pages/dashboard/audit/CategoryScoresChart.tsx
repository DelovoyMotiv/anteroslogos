/**
 * Category Scores Bar Chart
 * Shows all 11 category scores with color coding
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CHART_THEME, getScoreGradient } from '../../../../utils/chartTheme';

interface CategoryScoresChartProps {
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    citationPotential: number;
    technicalSEO: number;
    linkAnalysis: number;
    aidAgent: number;
  };
}

export function CategoryScoresChart({ scores }: CategoryScoresChartProps) {
  const data = [
    { name: 'Schema', score: scores.schemaMarkup },
    { name: 'Meta', score: scores.metaTags },
    { name: 'AI Crawlers', score: scores.aiCrawlers },
    { name: 'E-E-A-T', score: scores.eeat },
    { name: 'Structure', score: scores.structure },
    { name: 'Performance', score: scores.performance },
    { name: 'Content', score: scores.contentQuality },
    { name: 'Citation', score: scores.citationPotential },
    { name: 'Tech SEO', score: scores.technicalSEO },
    { name: 'Links', score: scores.linkAnalysis },
    { name: 'AID', score: scores.aidAgent },
  ];

  return (
    <div className="bg-black/20 border border-slate-800/50 p-3 md:p-4">
      <h3 className="text-[10px] md:text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 md:mb-3">
        Category Distribution
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 60, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={CHART_THEME.grid.stroke} 
            strokeOpacity={CHART_THEME.grid.opacity}
          />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            tick={{ fill: CHART_THEME.axis.tick, fontSize: 8 }}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            tick={{ fill: CHART_THEME.axis.tick, fontSize: 9 }}
            width={55}
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
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => {
              const gradient = getScoreGradient(entry.score);
              return <Cell key={`cell-${index}`} fill={gradient.colors[0]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
