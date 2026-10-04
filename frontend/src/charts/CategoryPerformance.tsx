import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { CategoryResult } from '../types';

interface CategoryPerformanceProps {
  data: CategoryResult[];
}

export const CategoryPerformance: React.FC<CategoryPerformanceProps> = ({ data }) => {
  const formattedData = data.map((d) => ({
    ...d,
    shortName: d.category.replace('Precipitation ', '').replace('Cosmetic ', 'Cosm. '),
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            width={95}
          />
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
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar dataKey="pass" name="PASS Count" fill="#059669" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="fail" name="FAIL Count" fill="#e11d48" stackId="a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
