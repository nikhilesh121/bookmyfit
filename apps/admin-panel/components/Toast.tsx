'use client';
import { useState, useCallback, useEffect } from 'react';
let toastFn: ((msg: string, type?: 'success'|'error'|'info') => void) | null = null;
export function useToast() {
  const toast = useCallback((msg: string, type: 'success'|'error'|'info' = 'success') => toastFn?.(msg, type), []);
  return { toast };
}
export function ToastProvider() {
  const [toasts, setToasts] = useState<{id:number; msg:string; type:string}[]>([]);
  useEffect(() => {
    toastFn = (msg, type='success') => {
      const id = Date.now();
      setToasts(p => [...p, {id, msg, type}]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    };
    return () => { toastFn = null; };
  }, []);
  if (!toasts.length) return null;
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding:'12px 20px',borderRadius:12,fontWeight:600,fontSize:13,
          background: t.type==='success'?'rgba(61,255,84,0.15)':t.type==='error'?'rgba(255,60,60,0.15)':'rgba(0,175,255,0.15)',
          border: `1px solid ${t.type==='success'?'rgba(61,255,84,0.3)':t.type==='error'?'rgba(255,60,60,0.3)':'rgba(0,175,255,0.3)'}`,
          color: t.type==='success'?'#3DFF54':t.type==='error'?'#FF6060':'#00AFFF',
          backdropFilter:'blur(12px)',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'
        }}>{t.msg}</div>
      ))}
    </div>
  );
}
