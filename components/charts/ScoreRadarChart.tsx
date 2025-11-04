import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CHART_THEME } from '../../utils/chartTheme';

interface ScoreRadarChartProps {
  scores: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
  comparison?: {
    schemaMarkup: number;
    metaTags: number;
    aiCrawlers: number;
    eeat: number;
    structure: number;
    performance: number;
    contentQuality: number;
    technicalSEO: number;
    linkAnalysis: number;
  };
}

const ScoreRadarChart = ({ scores, comparison }: ScoreRadarChartProps) => {
  const data = [
    { category: 'Schema', current: scores.schemaMarkup, previous: comparison?.schemaMarkup || 0 },
    { category: 'AI Crawlers', current: scores.aiCrawlers, previous: comparison?.aiCrawlers || 0 },
    { category: 'E-E-A-T', current: scores.eeat, previous: comparison?.eeat || 0 },
    { category: 'Technical', current: scores.technicalSEO, previous: comparison?.technicalSEO || 0 },
    { category: 'Links', current: scores.linkAnalysis, previous: comparison?.linkAnalysis || 0 },
    { category: 'Meta', current: scores.metaTags, previous: comparison?.metaTags || 0 },
    { category: 'Content', current: scores.contentQuality, previous: comparison?.contentQuality || 0 },
    { category: 'Structure', current: scores.structure, previous: comparison?.structure || 0 },
    { category: 'Performance', current: scores.performance, previous: comparison?.performance || 0 },
  ];

  return (
    <div className="w-full h-[400px] flex flex-col">
      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">
        Category Performance Radar
      </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradientCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#818cf8" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="radarGradientPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
              </linearGradient>
              <filter id="radarGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <PolarGrid 
              stroke={CHART_THEME.grid.stroke} 
              strokeOpacity={CHART_THEME.grid.opacity}
              strokeWidth={1}
            />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fill: CHART_THEME.axis.label, fontSize: 12, fontWeight: 500 }}
              stroke={CHART_THEME.axis.stroke}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: CHART_THEME.axis.tick, fontSize: 10 }}
              stroke={CHART_THEME.axis.stroke}
              strokeOpacity={0.5}
            />
            <Radar
              name="Current Score"
              dataKey="current"
              stroke="#a78bfa"
              fill="url(#radarGradientCurrent)"
              fillOpacity={1}
              strokeWidth={3}
              filter="url(#radarGlow)"
            />
            {comparison && (
              <Radar
                name="Previous Score"
                dataKey="previous"
                stroke="#22d3ee"
                fill="url(#radarGradientPrevious)"
                fillOpacity={1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: CHART_THEME.tooltip.bg,
                border: `1px solid ${CHART_THEME.tooltip.border}`,
                borderRadius: '12px',
                color: CHART_THEME.tooltip.text,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
              labelStyle={{ 
                color: '#a78bfa', 
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            />
            <Legend 
              wrapperStyle={{ 
                color: CHART_THEME.axis.label, 
                fontSize: '13px',
                fontWeight: 500,
              }}
              iconType="circle"
            />
          </RadarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

export default ScoreRadarChart;
