import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ComparisonResult } from '../types';

interface ProcessingTimelineProps {
  recentComparisons: ComparisonResult[];
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({ recentComparisons }) => {
  const chartData = [...recentComparisons].reverse().map((c) => ({
    id: c.pair_id.replace('pair_', '#'),
    time: c.processing_time_ms,
    score: c.similarity_score,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="id" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(val: any, name: string) => [
              name === 'time' ? `${val} ms` : `${val}%`,
              name === 'time' ? 'Processing Time' : 'Similarity Score',
            ]}
          />
          <Area
            type="monotone"
            dataKey="time"
            name="time"
            stroke="#0284c7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#blueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
