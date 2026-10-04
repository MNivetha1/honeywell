import React from 'react';
import { cn } from '../utils/cn';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface BadgeProps {
  variant?: 'pass' | 'fail' | 'warn' | 'info' | 'neutral' | 'processing';
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className,
  size = 'md',
  showIcon = false,
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-bold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-extrabold tracking-wider',
  };

  const variantClasses = {
    pass: 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm',
    fail: 'bg-rose-50 text-rose-700 border border-rose-300 shadow-sm',
    warn: 'bg-amber-50 text-amber-800 border border-amber-300',
    info: 'bg-sky-50 text-sky-700 border border-sky-300',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    processing: 'bg-blue-50 text-blue-700 border border-blue-300 animate-pulse',
  };

  const icons = {
    pass: <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
    fail: <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
    warn: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />,
    info: null,
    neutral: null,
    processing: <Clock className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full uppercase transition-all duration-150',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {showIcon && icons[variant]}
      {children}
    </span>
  );
};
