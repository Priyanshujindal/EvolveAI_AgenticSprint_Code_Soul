import React, { useEffect, useState, useCallback } from 'react';
import ChatbotConsole from './ChatbotConsole';
import Button from './ui/Button';

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
          className={`h-14 w-14 rounded-full shadow-xl p-0 ring-2 ring-brand-500 bg-gradient-to-br from-brand-500 to-brand-700 text-white hover:from-brand-600 hover:to-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-300 transition-transform duration-200 hover:scale-105 ${hasHistory ? '' : 'animate-pulse'}`}
          aria-label="Open chat"
          title="Open chat (Alt+/)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 m-auto">
            <path d="M7.5 8.25h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5Zm0 4.5h5.25a.75.75 0 0 1 0 1.5H7.5a.75.75 0 0 1 0-1.5Z" />
            <path fillRule="evenodd" d="M4.5 3.75A2.25 2.25 0 0 0 2.25 6v8.25A2.25 2.25 0 0 0 4.5 16.5H6v3.19a.75.75 0 0 0 1.28.53l3.72-3.72h6.5A2.25 2.25 0 0 0 20.25 14.25V6A2.25 2.25 0 0 0 18 3.75h-13.5Z" clipRule="evenodd" />
          </svg>
        </Button>
      )}
      {open && (
        <div className="relative w-[500px] max-w-[96vw] h-[60vh] sm:h-[65vh] md:h-[72vh] lg:h-[75vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-950/60 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Assistive Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new Event('chat:clear'))}
                aria-label="Clear conversation"
                className="h-7 px-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 text-xs border border-slate-200 dark:border-slate-700"
                title="Clear conversation"
              >
                Clear
              </button>
              <button
                onClick={close}
                aria-label="Close chat"
                className="h-7 w-7 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 flex items-center justify-center text-xs shadow-subtle"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 overflow-auto bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.06),transparent_50%)]">
              <ChatbotConsole compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
