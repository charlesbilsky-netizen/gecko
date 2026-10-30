import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Check, X, Download, FileText, FileJson, Database, RefreshCw } from 'lucide-react';
import {
  StoredMessage,
  StoredCoworkTask,
  GatewayRequest,
  GatewayResponse,
  GatewaySource,
  GatewayAction,
  saveMessages,
  loadMessages,
  saveSettings,
  loadSettings,
  saveCoworkTask,
  loadCoworkTasks,
  getCachedGatewayResult,
  saveCachedGatewayResult,
  generateCacheKey,
  clearGatewayCache,
  exportConversationAsJSON,
  exportConversationAsPlainText,
} from './utils/storage';
import geckoHeroAsset from './assets/images/gecko_macro_exante_1793328743046.jpg';

const GECKO_PHOTO = geckoHeroAsset;
const GECKO_BACKUP = '/gecko_hero.png';

export default function App() {
  // Navigation: Chat vs Cowork (write approval enclave)
  const [activeTab, setActiveTab] = useState<'chat' | 'cowork'>('chat');
  const [photoSrc, setPhotoSrc] = useState(GECKO_PHOTO);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');

  // Chat State
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now().toString(36)}`);

  // Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // Gateway Settings (Browser storage only: URL and Bearer token)
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [gatewayToken, setGatewayToken] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Cowork State (Write tasks gated behind explicit approval)
  const [coworkTasks, setCoworkTasks] = useState<StoredCoworkTask[]>([]);

  // Accessibility: prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);

  // DOM Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Restore session and settings from IndexedDB
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
    }

    async function init() {
      const settings = await loadSettings();
      if (settings && typeof settings.gatewayUrl === 'string') {
        setGatewayUrl(settings.gatewayUrl);
        setGatewayToken(settings.gatewayToken || '');
      } else {
        // Default to live local bridge so search and caching work immediately
        const defaultUrl = '/api/gateway';
        const defaultToken = 'aspen-concierge-token';
        setGatewayUrl(defaultUrl);
        setGatewayToken(defaultToken);
        saveSettings({
          gatewayUrl: defaultUrl,
          gatewayToken: defaultToken,
          demoModeOfferAccepted: false,
          reducedMotion: false,
        });
      }

      const tasks = await loadCoworkTasks();
      if (tasks && tasks.length > 0) {
        setCoworkTasks(tasks);
      }

      const history = await loadMessages();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // First load shows exactly "How can I help you?"
        const initialMsg: StoredMessage = {
          id: 'init',
          sender: 'gecko',
          text: 'How can I help you?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([initialMsg]);
        saveMessages([initialMsg]);
      }
    }

    init();
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Auto-scroll chat to latest
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, isLoading, reducedMotion]);

  // Update live region for screen readers
  useEffect(() => {
    if (messages.length > 0 && liveRegionRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== 'user') {
        liveRegionRef.current.textContent = lastMsg.text;
      }
    }
  }, [messages]);

  // Helper: append message and persist to IndexedDB
  const appendMessage = (msg: StoredMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveMessages(next);
      return next;
    });
  };

  // Helper: detect external system target from user input
  const detectSystemTarget = (query: string): { source: GatewaySource; action: GatewayAction } => {
    const q = query.toLowerCase();
    const isWrite = /\b(create|update|send|post|write|submit|execute|buy|sell|order)\b/.test(q);
    const action: GatewayAction = isWrite ? 'write' : 'search';

    if (/\bjira|ticket|issue\b/.test(q)) return { source: 'jira', action };
    if (/\bgmail|email|mail\b/.test(q)) return { source: 'gmail', action };
    if (/\bcalendar|schedule|meeting\b/.test(q)) return { source: 'calendar', action };
    if (/\bconfluence|wiki|doc\b/.test(q)) return { source: 'confluence', action };
    if (/\bslack|channel|dm\b/.test(q)) return { source: 'slack', action };
    if (/\bcrm|client|lead|account\b/.test(q)) return { source: 'crm', action };
    if (/\bledger|aspen|block|chain|audit\b/.test(q)) return { source: 'assistant', action };

    return { source: 'assistant', action };
  };

  // Dispatch capability call to Gateway with 30s timeout
  const callGateway = async (
    req: GatewayRequest,
    customUrl?: string,
    customToken?: string
  ): Promise<GatewayResponse> => {
    const targetUrl = customUrl !== undefined ? customUrl : gatewayUrl;
    const token = customToken !== undefined ? customToken : gatewayToken;

    if (!targetUrl.trim()) {
      return { status: 'not_connected', error: 'No gateway configured' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(targetUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          status: 'error',
          error: `Gateway error HTTP ${res.status}`,
        };
      }

      return await res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        return {
          status: 'error',
          error: `Gateway timed out after 30 s: ${targetUrl.trim()}`,
        };
      }
      return {
        status: 'error',
        error: `Failed to reach ${targetUrl.trim()}`,
      };
    }
  };

  // Handle Chat Submit with Automatic IndexedDB Caching for Static Search Queries
  const handleSend = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : input).trim();
    if (!query || isLoading) return;

    const userMsg: StoredMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    appendMessage(userMsg);
    if (!customQuery) setInput('');
    setIsLoading(true);

    const { source, action } = detectSystemTarget(query);
    const isSystemQuestion = source !== 'assistant';

    // Rule: No gateway configured -> answer "not connected" in one line, then conversation only.
    if (!gatewayUrl.trim() && isSystemQuestion) {
      try {
        const sysPrompt = `The external system is not connected. Say "not connected." on the first line. Then briefly answer from conversation context alone without fabricating internal records or data. Shortest complete form. No filler.`;
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', parts: [{ text: query }] }],
            systemInstruction: sysPrompt,
          }),
        });
        const data = await res.json();
        const text = data.text || 'not connected.\nExternal gateway is not configured.';

        appendMessage({
          id: `bot-${Date.now()}`,
          sender: 'gecko',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } catch (_) {
        appendMessage({
          id: `bot-${Date.now()}`,
          sender: 'gecko',
          text: 'not connected.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Call configured gateway with Automatic IndexedDB Caching Layer
    if (gatewayUrl.trim()) {
      try {
        const cacheKey = generateCacheKey(action, source, query);

        // 1. AUTOMATIC CACHING LAYER CHECK (IndexedDB)
        // Repeat queries for static data (like ledger status) resolve instantly without hitting the gateway
        if (action === 'search') {
          const cached = await getCachedGatewayResult(cacheKey);
          if (cached && cached.status === 'ok') {
            const resultText =
              typeof cached.result?.text === 'string'
                ? cached.result.text
                : typeof cached.result?.summary === 'string'
                ? cached.result.summary
                : JSON.stringify(cached.result || 'Done');

            appendMessage({
              id: `bot-${Date.now()}`,
              sender: 'gecko',
              text: resultText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              backend: cached.backend,
              citations: [
                ...(cached.citations || []),
                'indexeddb://cache/hit (instant local resolution, 0ms)',
              ],
            });
            setIsLoading(false);
            return;
          }
        }

        const req: GatewayRequest = {
          action,
          source,
          payload: { query, timestamp: new Date().toISOString() },
          session_id: sessionId,
        };

        const resp = await callGateway(req);

        // Status: OK
        if (resp.status === 'ok') {
          // Automatically save search results to IndexedDB cache
          if (action === 'search') {
            await saveCachedGatewayResult(cacheKey, action, source, query, resp);
          }

          const resultText =
            typeof resp.result?.text === 'string'
              ? resp.result.text
              : typeof resp.result?.summary === 'string'
              ? resp.result.summary
              : JSON.stringify(resp.result || 'Done');

          appendMessage({
            id: `bot-${Date.now()}`,
            sender: 'gecko',
            text: resultText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            backend: resp.backend,
            citations: resp.citations,
          });
        }
        // Status: needs_approval -> render in Cowork card, send nothing until Yes
        else if (resp.status === 'needs_approval') {
          const newTask: StoredCoworkTask = {
            id: `task-${Date.now()}`,
            title: `Write request: ${source}`,
            action: 'write',
            source,
            endpoint: gatewayUrl,
            payload: resp.result?.payload || req.payload,
            approval_ref: resp.approval_ref,
            status: 'PENDING_APPROVAL',
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            backend: resp.backend,
          };

          setCoworkTasks((prev) => {
            const next = [newTask, ...prev];
            saveCoworkTask(newTask);
            return next;
          });

          // Switch to Cowork view so the user immediately sees the approval card
          setActiveTab('cowork');

          appendMessage({
            id: `bot-${Date.now()}`,
            sender: 'cowork',
            text: `Write approval required for ${source}. Review payload in Cowork.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            coworkTaskId: newTask.id,
          });
        }
        // Status: not_connected
        else if (resp.status === 'not_connected') {
          appendMessage({
            id: `bot-${Date.now()}`,
            sender: 'gecko',
            text: 'not connected.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
        // Status: error / timeout
        else {
          appendMessage({
            id: `bot-${Date.now()}`,
            sender: 'gecko',
            text: `${resp.error || 'Gateway failure.'} URL: ${gatewayUrl}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            failedUrl: gatewayUrl,
          });
        }
      } catch (err: any) {
        appendMessage({
          id: `bot-${Date.now()}`,
          sender: 'gecko',
          text: `Failed to reach ${gatewayUrl}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          failedUrl: gatewayUrl,
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Default conversational assistant
    try {
      const allMsgs = [...messages, userMsg].map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMsgs,
          systemInstruction:
            'You are the EXANTE Gecko assistant. Answers come first, shortest complete form. No filler, no exclamation marks, no corporate cliches. If clarification is needed, ask in one plain sentence inside the chat.',
        }),
      });

      const data = await res.json();
      appendMessage({
        id: `bot-${Date.now()}`,
        sender: 'gecko',
        text: data.text || 'Understood.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (_) {
      appendMessage({
        id: `bot-${Date.now()}`,
        sender: 'gecko',
        text: 'Unable to process.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cowork Approval Gate: Yes (Send)
  const handleApprove = async (task: StoredCoworkTask) => {
    if (!task.approval_ref && !gatewayUrl) {
      setCoworkTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'APPROVED', executedAt: new Date().toLocaleTimeString() } : t))
      );
      return;
    }

    const req: GatewayRequest = {
      action: 'write',
      source: task.source,
      payload: task.payload,
      approval_ref: task.approval_ref,
      session_id: sessionId,
    };

    const resp = await callGateway(req);

    if (resp.status === 'ok') {
      const updated = {
        ...task,
        status: 'APPROVED' as const,
        executedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        backend: resp.backend,
      };
      setCoworkTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      saveCoworkTask(updated);

      appendMessage({
        id: `bot-${Date.now()}`,
        sender: 'cowork',
        text: `Sent: ${task.title}. ${resp.result?.txHash ? `Tx: ${resp.result.txHash.slice(0, 10)}...` : 'Confirmed.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        backend: resp.backend,
      });
    } else {
      appendMessage({
        id: `bot-${Date.now()}`,
        sender: 'cowork',
        text: `Write failed: ${resp.error || 'Rejected by gateway.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  // Cowork Approval Gate: No (Reject)
  const handleReject = (taskId: string) => {
    const task = coworkTasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = {
      ...task,
      status: 'REJECTED' as const,
    };
    setCoworkTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    saveCoworkTask(updated);

    appendMessage({
      id: `bot-${Date.now()}`,
      sender: 'cowork',
      text: `Cancelled: ${task.title}. Nothing was sent.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Export handlers
  const handleExportJSON = () => {
    const res = exportConversationAsJSON(messages);
    if (res.success) {
      setExportToast(`Saved session JSON (${messages.length} messages)`);
      setTimeout(() => setExportToast(null), 3500);
    }
  };

  const handleExportText = () => {
    const res = exportConversationAsPlainText(messages);
    if (res.success) {
      setExportToast(`Saved session plain text (${messages.length} messages)`);
      setTimeout(() => setExportToast(null), 3500);
    }
  };

  // Save Settings Modal
  const handleSaveSettings = () => {
    setGatewayUrl(urlInput.trim());
    setGatewayToken(tokenInput.trim());
    saveSettings({
      gatewayUrl: urlInput.trim(),
      gatewayToken: tokenInput.trim(),
      demoModeOfferAccepted: false,
      reducedMotion,
    });
    setIsSettingsOpen(false);
  };

  // Ping Gateway Test in Settings
  const handlePingTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testUrl = urlInput.trim();
    if (!testUrl) {
      setIsTesting(false);
      setTestResult({ success: false, text: 'Enter URL first.' });
      return;
    }

    const start = performance.now();
    const res = await callGateway(
      { action: 'search', source: 'assistant', payload: { query: 'ping' }, session_id: 'ping' },
      testUrl,
      tokenInput.trim()
    );
    const ms = Math.round(performance.now() - start);
    setIsTesting(false);

    if (res.status === 'ok') {
      setTestResult({
        success: true,
        text: `Connected (${ms} ms, ${res.backend || 'bridge'}).`,
      });
    } else {
      setTestResult({
        success: false,
        text: `Failed (${testUrl}): ${res.error || 'Unreachable'}`,
      });
    }
  };

  return (
    <div className={`h-screen w-screen bg-[#070B11] text-slate-100 flex flex-col font-sans select-none overflow-hidden ${reducedMotion ? 'reduced-motion' : ''}`}>
      {/* ARIA live region for screen readers */}
      <div ref={liveRegionRef} role="log" aria-live="polite" aria-atomic="false" className="sr-only" />

      {/* MINIMAL HEADER: Clean and uncluttered */}
      <header className="shrink-0 h-11 px-4 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between z-10">
        {/* Chat / Cowork Mode Switch */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'chat' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('cowork')}
            className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'cowork' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Cowork</span>
            {coworkTasks.some((t) => t.status === 'PENDING_APPROVAL') && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Brand Tag & Small hidden gear icon for Settings */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${gatewayUrl ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="hidden sm:inline">EXANTE</span>
          </div>

          <button
            onClick={() => {
              setUrlInput(gatewayUrl);
              setTokenInput(gatewayToken);
              setTestResult(null);
              setIsSettingsOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors"
            title="Gateway Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER: Gecko takes the whole left side, Chatbot on the right */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row p-2 md:p-3 gap-2 md:gap-3 w-full h-full overflow-hidden">
        
        {/* GECKO HERO CONTAINER: Whole left side with prominent, photorealistic green gecko */}
        <div className="w-full md:w-1/2 shrink-0 h-[42vh] md:h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#090d14] via-[#05070c] to-[#020305] border border-slate-800/90 rounded-2xl overflow-hidden relative shadow-2xl group">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.07)_0%,_transparent_75%)]">
            <img
              src={photoSrc}
              onError={() => {
                if (photoSrc !== GECKO_BACKUP) setPhotoSrc(GECKO_BACKUP);
              }}
              alt="Vibrant Green Madagascar Day Gecko in tailored Exante sweatshirt"
              className={`w-full h-full select-none transition-all duration-300 drop-shadow-[0_15px_35px_rgba(16,185,129,0.15)] ${
                imageFit === 'cover'
                  ? 'object-cover object-top md:object-center'
                  : 'object-contain p-2 md:p-6'
              }`}
              loading="eager"
            />

            {/* View Mode Switcher: Fit vs Fill */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400">
              <button
                type="button"
                onClick={() => setImageFit('contain')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  imageFit === 'contain' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'hover:text-white'
                }`}
                title="Fit full character in view"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setImageFit('cover')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  imageFit === 'cover' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'hover:text-white'
                }`}
                title="Fill whole side"
              >
                Fill
              </button>
            </div>

            {/* Bottom Status Badge */}
            <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-2 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold tracking-wide">EXANTE GREEN GECKO</span>
            </div>
          </div>
        </div>

        {/* CHAT / COWORK PANEL (Right Side) */}
        <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          
          {/* TAB 1: CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Chat Sub-Header: Title & Conversation Export Action */}
              <div className="shrink-0 h-10 px-3.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">Chat</span>
                  <span className="text-[10px] text-slate-500 font-mono">({messages.length} msgs)</span>
                </div>

                {/* Export Dropdown Menu directly in Chat UI */}
                <div className="relative" ref={exportDropdownRef}>
                  <button
                    onClick={() => setIsExportMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono border border-slate-800 transition-colors cursor-pointer"
                    title="Export session data as JSON or plain text"
                    aria-label="Export conversation"
                    aria-expanded={isExportMenuOpen}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export</span>
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 text-xs font-mono">
                      <div className="px-2 py-1 text-[10px] text-slate-400 border-b border-slate-800/60 uppercase tracking-wider">
                        Save Session History
                      </div>
                      <button
                        onClick={() => {
                          handleExportJSON();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer transition-colors"
                      >
                        <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-200">JSON Format</div>
                          <div className="text-[10px] text-slate-400">Structured data (.json)</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleExportText();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-left cursor-pointer transition-colors"
                      >
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-200">Plain Text</div>
                          <div className="text-[10px] text-slate-400">Clean text transcript (.txt)</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Toast confirmation on export */}
              {exportToast && (
                <div className="bg-emerald-950/90 border-b border-emerald-500/30 px-3 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{exportToast}</span>
                  </div>
                  <button onClick={() => setExportToast(null)} className="text-emerald-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender !== 'user' && (
                      <img
                        src={photoSrc}
                        alt="Green Gecko Mascot"
                        className="w-7 h-7 rounded-full object-cover border border-emerald-500/50 shadow-md shrink-0 mt-0.5"
                      />
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-emerald-600 text-slate-950 font-medium'
                          : m.sender === 'cowork'
                          ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-900 border border-slate-800 text-slate-200'
                      }`}
                    >
                      {/* Backend indicator / Cached badge */}
                      {m.backend && (
                        <span className="inline-block text-[9px] font-mono font-bold mr-1.5 px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                          [{m.backend}]
                        </span>
                      )}
                      {m.citations?.some((c) => c.includes('indexeddb://cache/hit')) && (
                        <span className="inline-block text-[9px] font-mono font-bold mr-1.5 px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          [cached]
                        </span>
                      )}
                      <span className="whitespace-pre-wrap">{m.text}</span>

                      {/* Source References */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
                          {m.citations.map((c, idx) => (
                            <div key={idx} className={c.includes('cache/hit') ? 'text-emerald-400 font-semibold' : ''}>
                              • {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="text-xs font-mono text-emerald-400 animate-pulse">
                    Thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick static query suggestions for testing caching layer */}
              <div className="px-3 py-1 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-400 bg-slate-950 border-t border-slate-900">
                <span className="text-[10px] text-slate-600 uppercase shrink-0">Quick query:</span>
                <button
                  type="button"
                  onClick={() => handleSend(undefined, 'Check ledger status')}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer transition-colors"
                >
                  Ledger status
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(undefined, 'Ping gateway')}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 cursor-pointer transition-colors"
                >
                  Ping
                </button>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-2 border-t border-slate-800/80 bg-slate-950 flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="How can I help you?"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  aria-label="Message input"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-30 cursor-pointer transition-colors"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: COWORK (Write Operations Enclave) */}
          {activeTab === 'cowork' && (
            <div className="flex-1 flex flex-col p-3.5 space-y-3 overflow-y-auto">
              <div className="text-xs text-slate-400 border-b border-slate-800 pb-2">
                Write operations require explicit approval before sending.
              </div>

              {coworkTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-600 font-mono">
                  No active write tasks.
                </div>
              ) : (
                coworkTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border text-xs font-mono space-y-2 ${
                      task.status === 'PENDING_APPROVAL'
                        ? 'bg-slate-900/90 border-amber-500/40'
                        : task.status === 'APPROVED'
                        ? 'bg-slate-900/40 border-emerald-500/30'
                        : 'bg-slate-900/20 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{task.title}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-300'
                            : task.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Target: <span className="text-cyan-300">{task.source}</span>
                      {task.approval_ref && <span> • Ref: {task.approval_ref}</span>}
                    </div>

                    {/* Exact Payload Display */}
                    <div className="p-2 rounded bg-black/60 border border-slate-800 max-h-28 overflow-y-auto text-[10px] text-slate-300">
                      <pre>{JSON.stringify(task.payload, null, 2)}</pre>
                    </div>

                    {/* Approval Gate: Yes/No Only */}
                    {task.status === 'PENDING_APPROVAL' && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(task)}
                          className="flex-1 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Yes</span>
                        </button>
                        <button
                          onClick={() => handleReject(task.id)}
                          className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>No</span>
                        </button>
                      </div>
                    )}

                    {task.status === 'APPROVED' && (
                      <div className="text-[10px] text-emerald-400">
                        Executed {task.executedAt && `at ${task.executedAt}`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* SETTINGS MODAL: Gateway URL, Token & Cache Management */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white">Gateway & Cache Settings</span>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Field 1: Gateway URL */}
            <div className="space-y-1">
              <label className="text-slate-400">Gateway URL:</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. /api/gateway"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Field 2: Bearer Token */}
            <div className="space-y-1">
              <label className="text-slate-400">Bearer Token:</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Token stored locally only"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Ping Test Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handlePingTest}
                disabled={isTesting}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isTesting ? 'Pinging...' : 'Test Connection (Ping)'}
              </button>

              {testResult && (
                <div
                  className={`mt-2 p-2 rounded text-[11px] ${
                    testResult.success ? 'bg-emerald-950/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'
                  }`}
                >
                  {testResult.text}
                </div>
              )}
            </div>

            {/* Cache controls */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>IndexedDB Query Cache</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await clearGatewayCache();
                  setTestResult({ success: true, text: 'IndexedDB gateway search cache cleared.' });
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
              >
                Clear Cache
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUrlInput('/api/gateway');
                  setTokenInput('aspen-concierge-token');
                }}
                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
              >
                Use Local Bridge (/api/gateway)
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => {
                  setUrlInput('');
                  setTokenInput('');
                }}
                className="text-[10px] text-slate-400 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
