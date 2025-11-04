import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
    <div className="w-full h-[400px] bg-gradient-to-br from-white/5 to-transparent border border-brand-secondary rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4 text-center">Category Performance Radar</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#3b4252" strokeOpacity={0.5} />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ fill: '#e5e9f0', fontSize: 12 }}
            stroke="#4c566a"
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: '#d8dee9', fontSize: 10 }}
            stroke="#4c566a"
          />
          <Radar
            name="Current Score"
            dataKey="current"
            stroke="#5e81ac"
            fill="#5e81ac"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          {comparison && (
            <Radar
              name="Previous Score"
              dataKey="previous"
              stroke="#88c0d0"
              fill="#88c0d0"
              fillOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#2e3440',
              border: '1px solid #4c566a',
              borderRadius: '8px',
              color: '#e5e9f0',
            }}
            labelStyle={{ color: '#88c0d0', fontWeight: 'bold' }}
          />
          <Legend 
            wrapperStyle={{ color: '#e5e9f0', fontSize: '14px' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreRadarChart;
