import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CHART_THEME, getScoreGradient } from '../../utils/chartTheme';

interface CategoryBarChartProps {
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
}

const CategoryBarChart = ({ scores }: CategoryBarChartProps) => {
  const data = [
    { name: 'Schema Markup', score: scores.schemaMarkup, weight: '16%' },
    { name: 'AI Crawlers', score: scores.aiCrawlers, weight: '15%' },
    { name: 'E-E-A-T', score: scores.eeat, weight: '15%' },
    { name: 'Technical GEO', score: scores.technicalSEO, weight: '13%' },
    { name: 'Link Analysis', score: scores.linkAnalysis, weight: '12%' },
    { name: 'Meta Tags', score: scores.metaTags, weight: '9%' },
    { name: 'Content Quality', score: scores.contentQuality, weight: '9%' },
    { name: 'Structure', score: scores.structure, weight: '6%' },
    { name: 'Performance', score: scores.performance, weight: '5%' },
  ];

  const getGradientId = (_score: number, index: number): string => {
    return `categoryBarGradient${index}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const gradient = getScoreGradient(data.score);
      return (
        <div 
          className="rounded-xl p-4 shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: CHART_THEME.tooltip.bg,
            border: `1px solid ${CHART_THEME.tooltip.border}`,
          }}
        >
          <p className="font-bold mb-2" style={{ color: gradient.colors[0], fontSize: '15px' }}>
            {data.name}
          </p>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: CHART_THEME.tooltip.text }}>
              Score: <span className="font-bold text-lg">{data.score}/100</span>
            </p>
            <p className="text-xs" style={{ color: CHART_THEME.axis.tick }}>
              Weight: {data.weight}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] flex flex-col">
      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">
        Category Scores (Weighted by Importance)
      </h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <defs>
              {data.map((entry, index) => {
                const gradient = getScoreGradient(entry.score);
                return (
                  <linearGradient key={`grad-${index}`} id={getGradientId(entry.score, index)} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={gradient.colors[0]} stopOpacity={0.9} />
                    <stop offset="50%" stopColor={gradient.colors[1]} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={gradient.colors[2] || gradient.colors[1]} stopOpacity={0.8} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_THEME.grid.stroke} 
              strokeOpacity={CHART_THEME.grid.opacity} 
              horizontal={false} 
            />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
            />
            <YAxis 
              type="category" 
              dataKey="name"
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
              width={110}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} 
            />
            <Bar 
              dataKey="score" 
              radius={[0, 12, 12, 0]}
              label={{ 
                position: 'right', 
                fill: CHART_THEME.axis.label, 
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {data.map((entry, index) => {
                const gradient = getScoreGradient(entry.score);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#${getGradientId(entry.score, index)})`}
                    style={{
                      filter: `drop-shadow(0 0 8px ${gradient.glow})`,
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

export default CategoryBarChart;
