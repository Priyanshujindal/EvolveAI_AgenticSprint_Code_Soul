import React, { useMemo, useRef, useState, useEffect } from 'react';
import { chatWithGeminiApi } from '../services/api';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
import Spinner from './ui/Spinner';
import { formatDate } from '../utils/formatDate';

export default function ChatbotConsole() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState(null);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const presets = useMemo(() => ([
    'Summarize my last diagnosis',
    'What red flags should I watch?',
    'Explain this lab result in simple terms',
    'What are next steps for follow-up?'
  ]), []);

  useEffect(() => {
    // load from localStorage on mount
    try {
      const raw = localStorage.getItem('chat:messages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    // persist to localStorage
    try {
      localStorage.setItem('chat:messages', JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function send() {
    if (!canSend) return;
    const nextMessages = [
      ...messages,
      { role: 'user', content: input, createdAt: Date.now() }
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const payload = { messages: nextMessages, options: { maxOutputTokens: 512 } };
      const abort = new AbortController();
      setController(abort);
      const data = await chatWithGeminiApi(payload, { signal: abort.signal });
      const reply = data?.data?.error || data?.data?.reply || '...';
      setMessages(m => m.concat({ role: 'assistant', content: reply, createdAt: Date.now() }));
    } catch (e) {
      const message = e?.message || 'Something went wrong';
      setMessages(m => m.concat({ role: 'assistant', content: message, createdAt: Date.now() }));
    } finally {
      setLoading(false);
      setController(null);
    }
  }

  function clearConversation() {
    setMessages([]);
  }

  function copyMessage(content) {
    try {
      navigator.clipboard?.writeText(content);
    } catch (_) {}
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Gemini · Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => controller?.abort()}>
              Stop
            </Button>
          ) : null}
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={clearConversation} disabled={messages.length === 0 && !loading}>Clear</Button>
        </div>
      </div>
      <div ref={listRef} className="max-h-[70vh] min-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur p-4">
        {messages.length === 0 && (
          <div>
            <div className="text-sm text-slate-500 mb-3">Start the conversation by asking a question, or try one of these:</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {presets.map((p, i) => (
                <button key={i} onClick={() => setInput(p)} className="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>{m.role === 'user' ? 'You' : 'AI'}</div>
              <div>
                <div className={`group relative max-w-[70vw] sm:max-w-[60%] rounded-2xl px-3 py-2 text-sm shadow-subtle break-words ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-slate-100/90 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-bl-md'
                }`}>
                  <div>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        {m.content}
                      </div>
                    ) : (
                      <div>{m.content}</div>
                    )}
                  </div>
                  <button
                    onClick={() => copyMessage(m.content)}
                    title="Copy"
                    className={`absolute -top-2 ${m.role === 'user' ? '-left-2' : '-right-2'} hidden group-hover:inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600`}
                  >
                    ⧉
                  </button>
                </div>
                <div className={`mt-1 text-[10px] ${m.role === 'user' ? 'text-slate-300 text-right' : 'text-slate-500 dark:text-slate-400 text-left'}`}>
                  {m.createdAt ? formatDate(m.createdAt) : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600"></span>
            </span>
            Thinking…
          </div>
        )}
      </div>
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type your message"
          rows={3}
        />
        <div className="flex flex-col items-end gap-1">
          <Button onClick={send} disabled={!canSend}>
            Send
          </Button>
          <div className="text-[10px] text-slate-500">{input.length}/1000</div>
        </div>
      </div>
    </div>
  );
}


