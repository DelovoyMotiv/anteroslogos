import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { getScoreTrend } from '../../utils/auditHistory';

interface ScoreTrendChartProps {
  url: string;
}

const ScoreTrendChart = ({ url }: ScoreTrendChartProps) => {
  const trend = getScoreTrend(url);

  if (trend.length === 0) {
    return (
      <div className="w-full h-[300px] bg-gradient-to-br from-white/5 to-transparent border border-brand-secondary rounded-xl p-6 flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-lg font-semibold mb-2">No Historical Data</p>
          <p className="text-sm">Analyze this site multiple times to see score trends</p>
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
    if (score >= 80) return '#a3be8c';
    if (score >= 60) return '#ebcb8b';
    if (score >= 40) return '#d08770';
    return '#bf616a';
  };

  const latestScore = data[data.length - 1]?.score || 0;

  return (
    <div className="w-full h-[300px] bg-gradient-to-br from-white/5 to-transparent border border-brand-secondary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Score History Trend</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Latest:</span>
          <span className={`text-2xl font-bold`} style={{ color: getScoreColor(latestScore) }}>
            {latestScore}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5e81ac" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#5e81ac" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3b4252" strokeOpacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
            label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#e5e9f0' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2e3440',
              border: '1px solid #4c566a',
              borderRadius: '8px',
              color: '#e5e9f0',
            }}
            labelStyle={{ color: '#88c0d0', fontWeight: 'bold', marginBottom: '8px' }}
          />
          <Legend 
            wrapperStyle={{ color: '#e5e9f0', fontSize: '12px', paddingTop: '10px' }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#5e81ac"
            strokeWidth={3}
            fill="url(#scoreGradient)"
            name="Overall Score"
          />
          <Line
            type="monotone"
            dataKey="schema"
            stroke="#a3be8c"
            strokeWidth={2}
            dot={{ fill: '#a3be8c', r: 4 }}
            name="Schema"
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="technical"
            stroke="#ebcb8b"
            strokeWidth={2}
            dot={{ fill: '#ebcb8b', r: 4 }}
            name="Technical"
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="content"
            stroke="#88c0d0"
            strokeWidth={2}
            dot={{ fill: '#88c0d0', r: 4 }}
            name="Content"
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreTrendChart;
