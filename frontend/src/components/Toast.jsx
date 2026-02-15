import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Clock, X, Info } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Shared Toast Notification Component
   ═══════════════════════════════════════════════════════ */

const STYLES = {
  success: {
    bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    border: 'border-emerald-400/30',
    icon: <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />,
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    border: 'border-red-400/30',
    icon: <AlertTriangle className="w-5 h-5 shrink-0 text-white" />,
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    border: 'border-amber-400/30',
    icon: <AlertTriangle className="w-5 h-5 shrink-0 text-white" />,
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    border: 'border-blue-400/30',
    icon: <Info className="w-5 h-5 shrink-0 text-white" />,
  },
};

export const Toast = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) { setVisible(false); return; }
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const s = STYLES[toast.type] || STYLES.info;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] max-w-sm transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border
                        ${s.bg} ${s.border} backdrop-blur-sm`}>
        <div className="mt-0.5">{s.icon}</div>
        <div className="flex-1 min-w-0">
          {toast.title && <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>}
          <p className="text-sm text-white/90 leading-snug">{toast.message}</p>
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(() => onDismiss(), 300); }}
          className="p-0.5 rounded-lg hover:bg-white/20 transition cursor-pointer shrink-0 mt-0.5"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to manage toast state.
 * Returns [toast, showToast, dismissToast]
 */
export const useToast = () => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message, title, duration = 4000) => {
    setToast({ type, message, title, duration });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return [toast, showToast, dismissToast];
};

export default Toast;
