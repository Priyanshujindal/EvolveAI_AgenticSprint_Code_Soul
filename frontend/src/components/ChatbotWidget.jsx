import React, { useEffect, useState, useCallback } from 'react';
import ChatbotConsole from './ChatbotConsole';
import Button from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat:widgetOpen');
      if (raw != null) setOpen(raw === 'true');
      const msgs = localStorage.getItem('chat:messages');
      if (msgs) {
        const arr = JSON.parse(msgs);
        setHasHistory(Array.isArray(arr) && arr.length > 0);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chat:widgetOpen', String(open));
    } catch (_) {}
  }, [open]);

  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if ((e.altKey || e.metaKey) && e.key === '/') toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, close]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <Button
          onClick={toggle}
          className={`h-14 w-14 rounded-full shadow-lg px-0 py-0 ring-2 ring-brand-600 ${hasHistory ? '' : 'animate-pulse'}`}
          aria-label="Open chat"
          title="Open chat (Alt+/)"
        >
          💬
        </Button>
      )}
      {open && (
        <div className="relative w-[520px] max-w-[90vw] aspect-square rounded-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <button
            onClick={close}
            aria-label="Close chat"
            className="absolute top-3 right-3 h-7 w-7 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 flex items-center justify-center text-xs"
            title="Close"
          >
            ✕
          </button>
          <span className="absolute top-3 left-3 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="absolute inset-0 p-5">
            <div className="h-full w-full overflow-auto rounded-[32px]">
              <div className="px-1">
                <ChatbotConsole />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
