import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MarketGrowthChartProps {
  variant?: 'line' | 'area';
}

const MarketGrowthChart: React.FC<MarketGrowthChartProps> = ({ variant = 'area' }) => {
  const marketData = [
    { year: '2024', aiSeo: 1.7, geo: 0.5, transformation: 1070 },
    { year: '2025', aiSeo: 2.2, geo: 1.2, transformation: 1350 },
    { year: '2026', aiSeo: 2.8, geo: 2.0, transformation: 1680 },
    { year: '2027', aiSeo: 3.6, geo: 3.2, transformation: 2150 },
    { year: '2028', aiSeo: 4.6, geo: 4.5, transformation: 2850 },
    { year: '2029', aiSeo: 5.5, geo: 5.5, transformation: 3620 },
    { year: '2030', aiSeo: 6.5, geo: 6.1, transformation: 4600 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-bg border border-white/20 rounded-lg p-4 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value}B
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (variant === 'line') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={marketData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis 
            dataKey="year" 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
            label={{ value: 'Market Size ($B)', angle: -90, position: 'insideLeft', fill: '#ffffff60' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="aiSeo" 
            name="AI-Powered SEO"
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="geo" 
            name="GEO Market"
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={marketData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAiSeo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorGeo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis 
          dataKey="year" 
          stroke="#ffffff60"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#ffffff60"
          style={{ fontSize: '12px' }}
          label={{ value: 'Market Size ($B)', angle: -90, position: 'insideLeft', fill: '#ffffff60' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="rect"
        />
        <Area 
          type="monotone" 
          dataKey="aiSeo" 
          name="AI-Powered SEO"
          stroke="#3b82f6" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorAiSeo)" 
        />
        <Area 
          type="monotone" 
          dataKey="geo" 
          name="GEO Market (45%+ CAGR)"
          stroke="#10b981" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorGeo)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default MarketGrowthChart;
