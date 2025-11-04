import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { getScoreTrend } from '../../utils/auditHistory';
import { CHART_THEME } from '../../utils/chartTheme';

interface ScoreTrendChartProps {
  url: string;
}

const ScoreTrendChart = ({ url }: ScoreTrendChartProps) => {
  const trend = getScoreTrend(url);

  if (trend.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-white/40">
          <p className="text-sm font-semibold mb-1">No Historical Data</p>
          <p className="text-xs">Analyze this site multiple times to see score trends</p>
        </div>
      </div>
    );
  }

  const data = trend.map((item, index) => ({
    name: `Audit ${index + 1}`,
    date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: item.overallScore,
    schema: item.scores.schemaMarkup,
    technical: item.scores.technicalSEO,
    content: item.scores.contentQuality,
  }));

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#60a5fa';
    if (score >= 40) return '#fbbf24';
    return '#f87171';
  };

  const latestScore = data[data.length - 1]?.score || 0;

  return (
    <div className="w-full h-[300px] flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Score History Trend
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Latest:</span>
          <span 
            className={`text-2xl font-bold tabular-nums ${getScoreColor(latestScore)}`}
          >
            {latestScore}
          </span>
        </div>
      </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {/* Multi-layer gradient for overall score */}
              <linearGradient id="trendScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9}/>
                <stop offset="30%" stopColor="#818cf8" stopOpacity={0.7}/>
                <stop offset="70%" stopColor="#60a5fa" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
              {/* Gradient for schema line */}
              <linearGradient id="trendSchemaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              {/* Gradient for technical line */}
              <linearGradient id="trendTechnicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
              {/* Gradient for content line */}
              <linearGradient id="trendContentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_THEME.grid.stroke} 
              strokeOpacity={CHART_THEME.grid.opacity}
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
              label={{ 
                value: 'Score', 
                angle: -90, 
                position: 'insideLeft', 
                fill: CHART_THEME.axis.label,
                style: { fontWeight: 500 },
              }}
            />
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
                fontSize: '12px', 
                paddingTop: '10px',
                fontWeight: 500,
              }}
              iconType="line"
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#a78bfa"
              strokeWidth={3}
              fill="url(#trendScoreGradient)"
              name="Overall Score"
              style={{ filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.4))' }}
            />
            <Area
              type="monotone"
              dataKey="schema"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#trendSchemaGradient)"
              dot={{ fill: '#34d399', r: 5, strokeWidth: 2, stroke: '#10b981' }}
              name="Schema"
            />
            <Area
              type="monotone"
              dataKey="technical"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#trendTechnicalGradient)"
              dot={{ fill: '#fbbf24', r: 5, strokeWidth: 2, stroke: '#f59e0b' }}
              name="Technical"
            />
            <Area
              type="monotone"
              dataKey="content"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#trendContentGradient)"
              dot={{ fill: '#22d3ee', r: 5, strokeWidth: 2, stroke: '#06b6d4' }}
              name="Content"
            />
          </AreaChart>
          </ResponsiveContainer>
        </div>
    </div>
  );
};

export default ScoreTrendChart;
