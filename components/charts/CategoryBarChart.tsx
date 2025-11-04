import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
    { name: 'Technical SEO', score: scores.technicalSEO, weight: '13%' },
    { name: 'Link Analysis', score: scores.linkAnalysis, weight: '12%' },
    { name: 'Meta Tags', score: scores.metaTags, weight: '9%' },
    { name: 'Content Quality', score: scores.contentQuality, weight: '9%' },
    { name: 'Structure', score: scores.structure, weight: '6%' },
    { name: 'Performance', score: scores.performance, weight: '5%' },
  ];

  const getColor = (score: number): string => {
    if (score >= 80) return '#a3be8c';
    if (score >= 60) return '#ebcb8b';
    if (score >= 40) return '#d08770';
    return '#bf616a';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2e3440] border border-[#4c566a] rounded-lg p-3 shadow-lg">
          <p className="font-bold text-[#88c0d0] mb-1">{data.name}</p>
          <p className="text-sm text-[#e5e9f0]">Score: <span className="font-bold">{data.score}/100</span></p>
          <p className="text-xs text-[#d8dee9] mt-1">Weight: {data.weight}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-white/5 to-transparent border border-brand-secondary rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4 text-center">Category Scores (Weighted by Importance)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3b4252" strokeOpacity={0.3} horizontal={false} />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
          <Bar 
            dataKey="score" 
            radius={[0, 8, 8, 0]}
            label={{ position: 'right', fill: '#e5e9f0', fontSize: 12 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryBarChart;
