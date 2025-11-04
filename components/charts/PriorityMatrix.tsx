import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import type { EnhancedRecommendation } from '../../utils/geoAuditEnhanced';

interface PriorityMatrixProps {
  recommendations: EnhancedRecommendation[];
}

const PriorityMatrix = ({ recommendations }: PriorityMatrixProps) => {
  // Map priority and effort to coordinates
  const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
  const effortMap = { 'quick-win': 1, 'strategic': 2, 'long-term': 3 };

  const data = recommendations.map((rec, index) => ({
    x: effortMap[rec.effort] || 2,
    y: priorityMap[rec.priority] || 2,
    z: 100, // Size of bubble
    title: rec.title,
    category: rec.category,
    priority: rec.priority,
    effort: rec.effort,
    index,
  }));

  const getColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#bf616a';
      case 'high': return '#d08770';
      case 'medium': return '#ebcb8b';
      case 'low': return '#a3be8c';
      default: return '#5e81ac';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2e3440] border border-[#4c566a] rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-bold text-[#88c0d0] mb-1">{data.title}</p>
          <p className="text-xs text-[#d8dee9] mb-1">{data.category}</p>
          <div className="flex gap-3 text-xs">
            <span className="text-[#ebcb8b]">Priority: {data.priority}</span>
            <span className="text-[#88c0d0]">Effort: {data.effort}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-white/5 to-transparent border border-brand-secondary rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4 text-center">Priority vs Effort Matrix</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3b4252" strokeOpacity={0.3} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0.5, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={(value) => {
              const labels = { 1: 'Quick Win', 2: 'Strategic', 3: 'Long-term' };
              return labels[value as keyof typeof labels] || '';
            }}
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
            label={{ value: 'Effort Required →', position: 'bottom', fill: '#e5e9f0', offset: 20 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0.5, 4.5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(value) => {
              const labels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
              return labels[value as keyof typeof labels] || '';
            }}
            stroke="#d8dee9"
            tick={{ fill: '#e5e9f0', fontSize: 11 }}
            label={{ value: '← Priority', angle: -90, position: 'insideLeft', fill: '#e5e9f0' }}
          />
          <ZAxis type="number" dataKey="z" range={[400, 800]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} shape="circle">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.priority)} fillOpacity={0.8} />
            ))}
          </Scatter>
          
          {/* Quadrant labels */}
          <text x="15%" y="25%" textAnchor="middle" fill="#a3be8c" fontSize="12" opacity={0.6}>
            Do First
          </text>
          <text x="85%" y="25%" textAnchor="middle" fill="#ebcb8b" fontSize="12" opacity={0.6}>
            Plan Ahead
          </text>
          <text x="15%" y="75%" textAnchor="middle" fill="#88c0d0" fontSize="12" opacity={0.6}>
            Nice to Have
          </text>
          <text x="85%" y="75%" textAnchor="middle" fill="#bf616a" fontSize="12" opacity={0.6}>
            Reconsider
          </text>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#bf616a]"></div>
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#d08770]"></div>
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ebcb8b]"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#a3be8c]"></div>
          <span>Low</span>
        </div>
      </div>
    </div>
  );
};

export default PriorityMatrix;
