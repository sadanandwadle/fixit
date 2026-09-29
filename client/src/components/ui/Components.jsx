import React from 'react';

export const Button = ({ children, onClick, type = 'button', variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = 'w-full px-4 py-2 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50',
    secondary: 'bg-white text-neutral-dark border border-border-subtle hover:bg-surface-dim',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, type = 'text', value, onChange, placeholder, required = false, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-neutral-dark text-sm font-medium mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full bg-surface-white border border-border-input rounded-lg px-3 py-2 text-neutral-dark placeholder-neutral-muted focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-shadow"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
};

export const Select = ({ label, value, onChange, options = [], required = false, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-neutral-dark text-sm font-medium mb-1">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-surface-white border border-border-input rounded-lg px-3 py-2 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-shadow appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-surface-white border border-border-subtle p-6 rounded-lg shadow-subtle ${className}`}>
      {children}
    </div>
  );
};

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-surface-dim text-neutral-dark',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-status-warning/10 text-status-warning',
    error: 'bg-status-error/10 text-status-error',
    primary: 'bg-primary/10 text-primary',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const LoadingState = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-neutral-muted text-sm">{text}</p>
    </div>
  );
};

export const ErrorState = ({ title = 'Error', message }) => {
  return (
    <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-4 mb-4">
      <h3 className="text-status-error text-sm font-semibold mb-1">{title}</h3>
      <p className="text-status-error text-sm opacity-90">{message}</p>
    </div>
  );
};
