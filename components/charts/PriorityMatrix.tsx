import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts';
import type { EnhancedRecommendation } from '../../utils/geoAuditEnhanced';
import { CHART_THEME } from '../../utils/chartTheme';

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
    const colors = CHART_THEME.priorities;
    switch (priority) {
      case 'critical': return colors.critical.solid;
      case 'high': return colors.high.solid;
      case 'medium': return colors.medium.solid;
      case 'low': return colors.low.solid;
      default: return '#60a5fa';
    }
  };

  const getGlow = (priority: string): string => {
    const colors = CHART_THEME.priorities;
    switch (priority) {
      case 'critical': return colors.critical.glow;
      case 'high': return colors.high.glow;
      case 'medium': return colors.medium.glow;
      case 'low': return colors.low.glow;
      default: return 'rgba(96, 165, 250, 0.3)';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const priorityColor = getColor(data.priority);
      return (
        <div 
          className="rounded-xl p-4 shadow-2xl backdrop-blur-md max-w-xs"
          style={{
            backgroundColor: CHART_THEME.tooltip.bg,
            border: `1px solid ${CHART_THEME.tooltip.border}`,
          }}
        >
          <p className="font-bold mb-2" style={{ color: priorityColor, fontSize: '15px' }}>
            {data.title}
          </p>
          <p className="text-xs mb-2" style={{ color: CHART_THEME.axis.tick }}>
            {data.category}
          </p>
          <div className="flex gap-4 text-xs">
            <span style={{ color: priorityColor, fontWeight: 600 }}>
              Priority: {data.priority}
            </span>
            <span style={{ color: CHART_THEME.axis.label, fontWeight: 500 }}>
              Effort: {data.effort}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-[400px] rounded-xl p-6 overflow-hidden">
      {/* Gradient background with blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 via-slate-900/30 to-slate-800/50 backdrop-blur-sm" />
      <div className="absolute inset-0 border border-slate-700/50 rounded-xl" />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-0 w-56 h-56 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-56 h-56 bg-green-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <h3 className="text-lg font-bold mb-4 text-center bg-gradient-to-r from-red-400 via-orange-400 to-green-400 bg-clip-text text-transparent">
          Priority vs Effort Matrix
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
            <defs>
              {data.map((entry, index) => (
                <radialGradient key={`grad-${index}`} id={`dotGradient${index}`}>
                  <stop offset="0%" stopColor={getColor(entry.priority)} stopOpacity={1} />
                  <stop offset="100%" stopColor={getColor(entry.priority)} stopOpacity={0.7} />
                </radialGradient>
              ))}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_THEME.grid.stroke} 
              strokeOpacity={CHART_THEME.grid.opacity}
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0.5, 3.5]}
              ticks={[1, 2, 3]}
              tickFormatter={(value) => {
                const labels = { 1: 'Quick Win', 2: 'Strategic', 3: 'Long-term' };
                return labels[value as keyof typeof labels] || '';
              }}
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
              label={{ 
                value: 'Effort Required →', 
                position: 'bottom', 
                fill: CHART_THEME.axis.label, 
                offset: 20,
                style: { fontWeight: 500 },
              }}
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
              stroke={CHART_THEME.axis.stroke}
              tick={{ fill: CHART_THEME.axis.label, fontSize: 11, fontWeight: 500 }}
              label={{ 
                value: '← Priority', 
                angle: -90, 
                position: 'insideLeft', 
                fill: CHART_THEME.axis.label,
                style: { fontWeight: 500 },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[500, 1000]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} shape="circle">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#dotGradient${index})`}
                  style={{
                    filter: `drop-shadow(0 0 12px ${getGlow(entry.priority)})`,
                  }}
                />
              ))}
            </Scatter>
            
            {/* Quadrant labels with gradient text */}
            <text x="15%" y="25%" textAnchor="middle" fill="#4ade80" fontSize="13" opacity={0.8} fontWeight="600">
              Do First
            </text>
            <text x="85%" y="25%" textAnchor="middle" fill="#fbbf24" fontSize="13" opacity={0.8} fontWeight="600">
              Plan Ahead
            </text>
            <text x="15%" y="75%" textAnchor="middle" fill="#60a5fa" fontSize="13" opacity={0.8} fontWeight="600">
              Nice to Have
            </text>
            <text x="85%" y="75%" textAnchor="middle" fill="#f87171" fontSize="13" opacity={0.8} fontWeight="600">
              Reconsider
            </text>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs">
          {['critical', 'high', 'medium', 'low'].map((priority) => (
            <div key={priority} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: getColor(priority),
                  boxShadow: `0 0 12px ${getGlow(priority)}`,
                }}
              />
              <span 
                className="font-medium capitalize"
                style={{ color: CHART_THEME.axis.label }}
              >
                {priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriorityMatrix;
