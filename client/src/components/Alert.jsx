import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

const alertStyles = {
  error: {
    container: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
  },
};

const Alert = ({ type = 'info', message, onClose, className = '' }) => {
  if (!message) return null;

  const style = alertStyles[type] || alertStyles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all ${style.container} ${className}`}
      role="alert"
    >
      {style.icon}
      <div className="flex-1 font-medium">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
