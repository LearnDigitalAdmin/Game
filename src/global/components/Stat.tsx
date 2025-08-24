import { type ReactNode } from "react";

interface StatProps {
  label: string;
  value: string | number | ReactNode;
  subValue?: string | number;
  color?: 'default' | 'green' | 'red' | 'blue' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  shade?: string;
}

export function Stat({ 
  label, 
  value, 
  subValue, 
  color = 'default',
  size = 'md',
  icon,
  onClick,
  loading = false
}: StatProps) {
  const colorClasses = {
    default: 'bg-white border-slate-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200', 
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-4',
    lg: 'p-6'
  };

  const textSizeClasses = {
    sm: {
      value: 'text-lg',
      label: 'text-xs',
      subValue: 'text-xs'
    },
    md: {
      value: 'text-2xl',
      label: 'text-sm',
      subValue: 'text-sm'
    },
    lg: {
      value: 'text-3xl',
      label: 'text-base',
      subValue: 'text-base'
    }
  };

  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      className={`rounded-2xl shadow-sm border transition-all duration-200 ${colorClasses[color]} ${sizeClasses[size]} ${
        onClick ? 'hover:shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
      }`}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center justify-center h-16">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {icon && (
            <div className="flex items-center justify-center mb-2">
              <div className="text-slate-400">{icon}</div>
            </div>
          )}
          
          <div className={`font-bold text-slate-800 ${textSizeClasses[size].value}`}>
            {typeof value === 'string' || typeof value === 'number' ? value : value}
          </div>
          
          <div className={`text-slate-500 font-medium ${textSizeClasses[size].label}`}>
            {label}
          </div>
          
          {subValue && (
            <div className={`text-slate-400 mt-1 ${textSizeClasses[size].subValue}`}>
              {subValue}
            </div>
          )}
        </>
      )}
    </Component>
  );
}