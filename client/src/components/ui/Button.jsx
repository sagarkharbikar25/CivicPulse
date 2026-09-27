import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  icon: Icon,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0B] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3.5 gap-2.5",
  };

  const variantStyles = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold shadow-glow-cyan hover:shadow-glow-cyan-lg focus:ring-cyan-400 border border-cyan-300/30",
    secondary: "bg-[#18181C] hover:bg-[#222228] text-slate-200 hover:text-white border border-white/10 hover:border-cyan-500/40 focus:ring-cyan-400 shadow-sm",
    glass: "bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-slate-200 hover:text-white border border-white/10 hover:border-cyan-400/40 focus:ring-cyan-400",
    danger: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 focus:ring-rose-400",
    ghost: "bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 focus:ring-slate-400",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
