import React, { useMemo, useRef, useState, useEffect } from 'react';
import { chatWithGeminiApi } from '../services/api';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
import Spinner from './ui/Spinner';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/ToastProvider';

export default function ChatbotConsole({ compact = false }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const storageKey = useMemo(() => `chat:${user?.uid || 'anon'}:messages`, [user?.uid]);
  const prefKey = useMemo(() => `chat:${user?.uid || 'anon'}:useCheckins`, [user?.uid]);
  const prefAllKey = useMemo(() => `chat:${user?.uid || 'anon'}:useAllCheckins`, [user?.uid]);
  const prefProfileKey = useMemo(() => `chat:${user?.uid || 'anon'}:useProfile`, [user?.uid]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const presets = useMemo(() => ([
    'Summarize my last diagnosis',
    'What red flags should I watch?',
    'Explain this lab result in simple terms',
    'What are next steps for follow-up?'
  ]), []);
  const [useCheckins, setUseCheckins] = useState(true);
  const [useAllCheckins, setUseAllCheckins] = useState(false);
  const [useProfile, setUseProfile] = useState(false);

  useEffect(() => {
    // load from localStorage on mount and when user changes
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
        else setMessages([]);
      } else {
        setMessages([]);
      }
      const rawPref = localStorage.getItem(prefKey);
      if (rawPref === 'true' || rawPref === 'false') setUseCheckins(rawPref === 'true');
      else setUseCheckins(true);
      const rawAll = localStorage.getItem(prefAllKey);
      if (rawAll === 'true' || rawAll === 'false') setUseAllCheckins(rawAll === 'true');
      else setUseAllCheckins(false);
      const rawProfile = localStorage.getItem(prefProfileKey);
      if (rawProfile === 'true' || rawProfile === 'false') setUseProfile(rawProfile === 'true');
      else setUseProfile(true);
    } catch (_) {
      setMessages([]);
    }
    // reset expanded states on user change
    setExpandedIds({});
  }, [storageKey, prefKey, prefAllKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    // persist to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (_) {}
  }, [messages, storageKey]);

  useEffect(() => {
    try { localStorage.setItem(prefKey, String(useCheckins)); } catch (_) {}
  }, [useCheckins, prefKey]);
  useEffect(() => {
    try { localStorage.setItem(prefAllKey, String(useAllCheckins)); } catch (_) {}
  }, [useAllCheckins, prefAllKey]);
  useEffect(() => {
    try { localStorage.setItem(prefProfileKey, String(useProfile)); } catch (_) {}
  }, [useProfile, prefProfileKey]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);
  const keyMissing = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    return !!(lastAssistant && typeof lastAssistant.content === 'string' && lastAssistant.content.toLowerCase().includes('gemini api key missing'));
  }, [messages]);

  async function send() {
    if (!canSend) return;
    if (!user && (useCheckins || useAllCheckins || useProfile)) {
      notify('Please sign in to use your profile or check-ins in chat.', 'info');
      return;
    }
    const nextMessages = [
      ...messages,
      { role: 'user', content: input, createdAt: Date.now() }
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const payload = { messages: nextMessages, options: { maxOutputTokens: 512, useCheckins, checkinLimit: 7, useAllCheckins, checkinMax: 365, useProfile, userId: user?.uid || undefined } };
      const abort = new AbortController();
      setController(abort);
      const data = await chatWithGeminiApi(payload, { signal: abort.signal });
      const reply = data?.data?.error || data?.data?.reply || '...';
      setMessages(m => m.concat({ role: 'assistant', content: reply, createdAt: Date.now() }));
    } catch (e) {
      console.error('chat error:', e);
      const message = e?.message || 'Network error';
      notify(message, 'error');
    } finally {
      setLoading(false);
      setController(null);
    }
  }

  function clearConversation() {
    setMessages([]);
  }

  useEffect(() => {
    const onClear = () => clearConversation();
    window.addEventListener('chat:clear', onClear);
    return () => window.removeEventListener('chat:clear', onClear);
  }, []);

  function copyMessage(content) {
    try {
      navigator.clipboard?.writeText(content);
    } catch (_) {}
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  function renderMarkdownLite(text) {
    if (typeof text !== 'string' || text.length === 0) return null;
    const lines = text.split(/\r?\n/);

    function renderInline(t, keyPrefix) {
      const parts = [];
      let remaining = t;
      let key = 0;
      const boldRegex = /\*\*([^*]+)\*\*/;
      const italicRegex = /(^|[^*])\*([^*]+)\*(?!\*)/;
      while (remaining.length > 0) {
        const b = boldRegex.exec(remaining);
        const i = italicRegex.exec(remaining);
        let nextIndex = remaining.length;
        let type = null;
        let match = null;
        if (b && (i ? b.index <= i.index : true)) {
          nextIndex = b.index;
          type = 'bold';
          match = b;
        } else if (i) {
          nextIndex = i.index + (i[1] ? i[1].length : 0);
          type = 'italic';
          match = i;
        }
        if (!type) {
          parts.push(<span key={`${keyPrefix}-t-${key++}`}>{remaining}</span>);
          break;
        }
        if (nextIndex > 0) {
          parts.push(<span key={`${keyPrefix}-t-${key++}`}>{remaining.slice(0, nextIndex)}</span>);
        }
        if (type === 'bold') {
          parts.push(<strong key={`${keyPrefix}-b-${key++}`}>{match[1]}</strong>);
          remaining = remaining.slice(match.index + match[0].length);
        } else if (type === 'italic') {
          const leading = match[1] || '';
          if (leading) parts.push(<span key={`${keyPrefix}-l-${key++}`}>{leading}</span>);
          parts.push(<em key={`${keyPrefix}-i-${key++}`}>{match[2]}</em>);
          const consumed = (match.index + leading.length) + match[0].length - (leading ? 0 : 1);
          remaining = remaining.slice(consumed);
        }
      }
      return parts;
    }

    const blocks = [];
    let listBuffer = [];
    const flushList = () => {
      if (listBuffer.length > 0) {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="list-disc pl-5 my-2 space-y-1">
            {listBuffer.map((li, idx) => (
              <li key={`li-${idx}`}>{renderInline(li.replace(/^\s*[*-]\s+/, ''), `li-${idx}`)}</li>
            ))}
          </ul>
        );
        listBuffer = [];
      }
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (/^\s*[*-]\s+/.test(line)) {
        listBuffer.push(line);
        continue;
      }
      flushList();
      if (line.trim() === '') {
        blocks.push(<div key={`br-${idx}`} className="h-2" />);
      } else {
        blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
      }
    }
    flushList();
    return <div className="prose prose-sm dark:prose-invert max-w-none">{blocks}</div>;
  }

  return (
    <div className={`${compact ? 'flex h-full flex-col gap-0' : 'flex flex-col gap-3'}`}>
      {keyMissing && (
        <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 px-3 py-2 text-xs">
          Gemini API key is not configured on the backend. Set <code>GEMINI_API_KEY</code> and restart the server.
        </div>
      )}
      {!compact && (
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
      )}
      <div
        ref={listRef}
        className={`${compact ? 'flex-1 min-h-0 overflow-auto p-3' : 'max-h-[70vh] min-h-[55vh] overflow-auto p-4'} rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur shadow-inner`}
      >
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">Start the conversation by asking a question, or try one of these:</div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, i) => (
                <button key={i} onClick={() => setInput(p)} className="px-3 py-1.5 rounded-full text-xs bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-subtle">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`hidden lg:flex h-8 w-8 shrink-0 rounded-full items-center justify-center text-xs font-semibold ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>{m.role === 'user' ? 'You' : 'AI'}</div>
              <div>
                { (() => {
                  const id = `${m.createdAt || i}-${i}`;
                  const isLong = m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 500;
                  const isExpanded = !!expandedIds[id];
                  return (
                    <div className={`group relative max-w-[95%] sm:max-w-[92%] md:max-w-[90%] lg:max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-subtle break-words whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-br-md'
                    : 'bg-slate-100/90 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-bl-md border border-slate-200/60 dark:border-slate-800/60'
                }`}>
                      <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {m.role === 'assistant' ? (
                          <div className={`chat-content select-text ${isExpanded ? '' : 'line-clamp-10'}`}>
                            {renderMarkdownLite(m.content)}
                          </div>
                        ) : (
                          <div className="break-words whitespace-pre-wrap">{m.content}</div>
                        )}
                      </div>
                      <button
                        onClick={() => copyMessage(m.content)}
                        title="Copy"
                        className={`absolute -top-2 ${m.role === 'user' ? '-left-2' : '-right-2'} hidden group-hover:inline-flex items-center justify-center h-6 w-6 rounded-full bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 shadow`}
                      >
                        ⧉
                      </button>
                    </div>
                  );
                })()}
                <div className={`mt-1 flex items-center gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`text-[10px] ${m.role === 'user' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {m.createdAt ? formatDate(m.createdAt) : ''}
                  </div>
                  {m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 500 && (
                    (() => {
                      const id = `${m.createdAt || i}-${i}`;
                      const isExpanded = !!expandedIds[id];
                      return (
                        <button
                          className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-subtle"
                          onClick={() => setExpandedIds(s => ({ ...s, [id]: !s[id] }))}
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      );
                    })()
                  )}
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
      <div className={`${compact ? 'sticky bottom-0 z-10 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-3' : ''}`}>
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your message"
            rows={compact ? 2 : 3}
          />
          <div className="flex flex-col items-end gap-1">
            <Button onClick={send} disabled={!canSend} className="shadow-subtle">
              Send
            </Button>
            <div className="text-[10px] text-slate-500">{input.length}/1000</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                checked={useCheckins}
                onChange={e => setUseCheckins(e.target.checked)}
              />
              Use my daily check-ins for answers
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                checked={useProfile}
                onChange={e => setUseProfile(e.target.checked)}
              />
              Use my profile data
            </label>
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                checked={useAllCheckins}
                onChange={e => setUseAllCheckins(e.target.checked)}
                disabled={!useCheckins}
              />
              Include all check-ins (compact)
            </label>
          </div>
          {compact ? (
            <div className="flex items-center gap-2">
              {loading ? (
                <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => controller?.abort()}>Stop</Button>
              ) : null}
              <Button variant="secondary" className="px-2 py-1 text-xs" onClick={clearConversation} disabled={messages.length === 0 && !loading}>Clear</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


