/**
 * @file Modal.jsx
 * @description Accessible, animated glassmorphic modal overlay.
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: function,
 *   title?: string,
 *   children: React.ReactNode,
 *   size?: 'sm' | 'md' | 'lg' | 'xl',
 *   hideClose?: boolean,
 * }} props
 */
export function Modal({ isOpen, onClose, title, children, size = 'md', hideClose = false }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className={[
          'relative w-full bg-slate-900/95 border border-slate-700/60 backdrop-blur-xl',
          'rounded-2xl shadow-glass-lg animate-fade-in',
          sizeClasses[size],
        ].join(' ')}
        style={{ border: '1px solid rgba(238,0,0,0.2)', boxShadow: '0 0 40px rgba(238,0,0,0.1), 0 20px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800/60">
            {title && (
              <h2 className="text-lg font-bold text-white font-display">{title}</h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={title || !hideClose ? 'px-6 pb-6 pt-4' : 'p-6'}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
