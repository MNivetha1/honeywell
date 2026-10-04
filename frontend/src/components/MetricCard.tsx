import React from 'react';
import { cn } from '../utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  variant?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'default';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const borderVariants = {
    default: 'border-slate-200 hover:border-slate-300 bg-white',
    cyan: 'border-sky-200 hover:border-sky-400 bg-gradient-to-br from-sky-50/50 to-white',
    emerald: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/50 to-white',
    rose: 'border-rose-200 hover:border-rose-400 bg-gradient-to-br from-rose-50/50 to-white',
    amber: 'border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/50 to-white',
  };

  const textVariants = {
    default: 'text-slate-900',
    cyan: 'text-sky-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
  };

  const iconBgVariants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    cyan: 'bg-sky-100 text-sky-700 border-sky-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-4.5 transition-all duration-200 white-panel shadow-sm',
        borderVariants[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">{title}</span>
        {icon && (
          <div className={cn('p-2 rounded-lg border text-xs', iconBgVariants[variant])}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className={cn('text-2xl font-black tracking-tight font-mono', textVariants[variant])}>
          {value}
        </div>
        {trend && (
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
