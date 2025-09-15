import React, { useEffect, useState, useCallback } from 'react';
import ChatbotConsole from './ChatbotConsole';
import Button from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat:widgetOpen');
      if (raw != null) setOpen(raw === 'true');
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
          className="h-14 w-14 rounded-full shadow-lg px-0 py-0"
          aria-label="Open chat"
          title="Open chat (Alt+/)"
        >
          💬
        </Button>
      )}
      {open && (
        <Card className="w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] flex flex-col shadow-xl">
          <CardHeader className="flex items-center justify-between py-3">
            <CardTitle className="text-sm">Assistive Chat</CardTitle>
            <button
              onClick={close}
              aria-label="Close chat"
              className="rounded-md text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100"
            >
              ✕
            </button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="h-full overflow-auto p-4">
              <ChatbotConsole />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
