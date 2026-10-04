import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PassFailDonutProps {
  passCount: number;
  failCount: number;
  total: number;
}

export const PassFailDonut: React.FC<PassFailDonutProps> = ({ passCount, failCount, total }) => {
  const data = [
    { name: 'PASS', value: passCount, color: '#059669' },
    { name: 'FAIL', value: failCount, color: '#e11d48' },
  ];

  const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative w-full h-56 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={84}
            paddingAngle={4}
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black font-mono text-emerald-700">{passRate}%</span>
        <span className="text-[10px] tracking-wider text-slate-500 uppercase font-bold">Pass Rate</span>
      </div>
    </div>
  );
};
