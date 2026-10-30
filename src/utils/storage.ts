/**
 * Robust IndexedDB Persistence Utility for Conversation & Cowork State.
 * Ensures conversations, gateway configuration, and Cowork write tasks
 * survive page reloads seamlessly with fallback to localStorage.
 */

const DB_NAME = 'gecko_assistant_db';
const DB_VERSION = 2;
const STORE_CHAT = 'chat_history';
const STORE_SETTINGS = 'app_settings';
const STORE_COWORK = 'cowork_tasks';
const STORE_CACHE = 'gateway_cache';

export type GatewaySource = 'jira' | 'gmail' | 'calendar' | 'confluence' | 'slack' | 'crm' | 'assistant';
export type GatewayAction = 'search' | 'read' | 'write';

export interface GatewayRequest {
  action: GatewayAction;
  source: GatewaySource;
  payload: Record<string, any>;
  session_id: string;
  approval_ref?: string;
}

export interface GatewayResponse {
  status: 'ok' | 'needs_approval' | 'not_connected' | 'error';
  result?: any;
  backend?: 'gecko-live' | 'bridge';
  approval_ref?: string;
  error?: string;
  citations?: string[];
}

export interface StoredMessage {
  id: string;
  sender: 'gecko' | 'user' | 'cowork';
  text: string;
  timestamp: string;
  backend?: 'gecko-live' | 'bridge';
  citations?: string[];
  isDemo?: boolean;
  choices?: string[];
  coworkTaskId?: string;
  failedUrl?: string;
}

export interface StoredSettings {
  gatewayUrl: string; // empty string = no gateway set
  gatewayToken: string; // bearer token stored in browser storage only
  demoModeOfferAccepted: boolean;
  reducedMotion: boolean;
}

export interface StoredCoworkTask {
  id: string;
  title: string;
  action: GatewayAction;
  source: GatewaySource;
  endpoint: string;
  payload: Record<string, any>;
  approval_ref?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  executedAt?: string;
  executionResult?: any;
  backend?: 'gecko-live' | 'bridge';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CHAT)) {
        db.createObjectStore(STORE_CHAT);
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORE_COWORK)) {
        db.createObjectStore(STORE_COWORK, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'cacheKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 1. Chat Messages Persistence
export async function saveMessages(messages: StoredMessage[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CHAT, 'readwrite');
    const store = tx.objectStore(STORE_CHAT);
    store.put(messages, 'active_conversation');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    try {
      localStorage.setItem('gecko_chat_backup', JSON.stringify(messages));
    } catch (_) {}
  }
}

export async function loadMessages(): Promise<StoredMessage[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CHAT, 'readonly');
    const store = tx.objectStore(STORE_CHAT);
    const req = store.get('active_conversation');
    const res = await new Promise<StoredMessage[] | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
    if (res && Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    try {
      const backup = localStorage.getItem('gecko_chat_backup');
      if (backup) return JSON.parse(backup);
    } catch (_) {}
  }
  return null;
}

export async function clearMessages(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CHAT, 'readwrite');
    tx.objectStore(STORE_CHAT).delete('active_conversation');
    await new Promise((resolve) => (tx.oncomplete = resolve));
  } catch (_) {
    localStorage.removeItem('gecko_chat_backup');
  }
}

// 2. Settings Persistence (Gateway & Demo mode)
export async function saveSettings(settings: StoredSettings): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put(settings, 'config');
  } catch (_) {
    localStorage.setItem('gecko_settings_backup', JSON.stringify(settings));
  }
}

export async function loadSettings(): Promise<StoredSettings | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get('config');
    const res = await new Promise<StoredSettings | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });
    if (res) return res;
  } catch (_) {
    try {
      const backup = localStorage.getItem('gecko_settings_backup');
      if (backup) return JSON.parse(backup);
    } catch (_) {}
  }
  return null;
}

// 3. Cowork Tasks Persistence
export async function saveCoworkTask(task: StoredCoworkTask): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_COWORK, 'readwrite');
    tx.objectStore(STORE_COWORK).put(task);
  } catch (_) {
    try {
      const existing = JSON.parse(localStorage.getItem('gecko_cowork_backup') || '[]');
      const filtered = existing.filter((t: any) => t.id !== task.id);
      localStorage.setItem('gecko_cowork_backup', JSON.stringify([...filtered, task]));
    } catch (_) {}
  }
}

export async function loadCoworkTasks(): Promise<StoredCoworkTask[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_COWORK, 'readonly');
    const req = tx.objectStore(STORE_COWORK).getAll();
    const res = await new Promise<StoredCoworkTask[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = reject;
    });
    if (res && res.length > 0) return res;
  } catch (_) {
    try {
      const backup = localStorage.getItem('gecko_cowork_backup');
      if (backup) return JSON.parse(backup);
    } catch (_) {}
  }
  return [];
}

// 4. Automatic Caching Layer for Gateway Search Results (IndexedDB)
export interface CachedGatewayEntry {
  cacheKey: string;
  action: GatewayAction;
  source: GatewaySource;
  query: string;
  response: GatewayResponse;
  cachedAt: number;
  ttlMs: number;
}

export function generateCacheKey(action: GatewayAction, source: GatewaySource, query: string): string {
  const normQuery = (query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${action}:${source}:${normQuery}`;
}

export async function getCachedGatewayResult(cacheKey: string): Promise<GatewayResponse | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readonly');
    const store = tx.objectStore(STORE_CACHE);
    const req = store.get(cacheKey);
    const entry = await new Promise<CachedGatewayEntry | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = reject;
    });

    if (entry) {
      const now = Date.now();
      // Check if entry is within TTL (default 10 minutes)
      if (now - entry.cachedAt < (entry.ttlMs || 600000)) {
        return entry.response;
      } else {
        // Expired, remove from store asynchronously
        deleteCachedGatewayResult(cacheKey).catch(() => {});
      }
    }
  } catch (err) {
    try {
      const backup = localStorage.getItem(`gecko_cache_${cacheKey}`);
      if (backup) {
        const parsed: CachedGatewayEntry = JSON.parse(backup);
        if (Date.now() - parsed.cachedAt < (parsed.ttlMs || 600000)) {
          return parsed.response;
        }
      }
    } catch (_) {}
  }
  return null;
}

export async function saveCachedGatewayResult(
  cacheKey: string,
  action: GatewayAction,
  source: GatewaySource,
  query: string,
  response: GatewayResponse,
  ttlMs: number = 600000
): Promise<void> {
  const entry: CachedGatewayEntry = {
    cacheKey,
    action,
    source,
    query,
    response,
    cachedAt: Date.now(),
    ttlMs,
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).put(entry);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    try {
      localStorage.setItem(`gecko_cache_${cacheKey}`, JSON.stringify(entry));
    } catch (_) {}
  }
}

export async function deleteCachedGatewayResult(cacheKey: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).delete(cacheKey);
  } catch (_) {
    try {
      localStorage.removeItem(`gecko_cache_${cacheKey}`);
    } catch (_) {}
  }
}

export async function clearGatewayCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).clear();
  } catch (_) {
    // Clear localStorage fallback cache keys
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('gecko_cache_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }
}

// 5. Conversation History Export (JSON & Plain Text)
export function exportConversationAsJSON(messages: StoredMessage[]): { success: boolean; filename: string } {
  try {
    const exportData = {
      app: 'EXANTE Gecko Assistant',
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      conversation: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        backend: m.backend || undefined,
        citations: m.citations && m.citations.length > 0 ? m.citations : undefined,
      })),
    };

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `exante-gecko-chat-${ymd}-${time}.json`;

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, filename };
  } catch (err) {
    console.error('Failed to export conversation as JSON:', err);
    return { success: false, filename: '' };
  }
}

export function exportConversationAsPlainText(messages: StoredMessage[]): { success: boolean; filename: string } {
  try {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `exante-gecko-chat-${ymd}-${time}.txt`;

    let content = `========================================================\n`;
    content += ` EXANTE GECKO ASSISTANT — SESSION CONVERSATION EXPORT   \n`;
    content += ` Exported At: ${now.toLocaleString()} (${now.toISOString()})\n`;
    content += ` Total Messages: ${messages.length}\n`;
    content += `========================================================\n\n`;

    messages.forEach((m, idx) => {
      const senderTag =
        m.sender === 'user' ? 'YOU' : m.sender === 'cowork' ? 'COWORK (WRITE GATEWAY)' : 'EXANTE GECKO';
      const backendTag = m.backend ? ` [${m.backend.toUpperCase()}]` : '';
      content += `[#${idx + 1}] ${m.timestamp} — ${senderTag}${backendTag}\n`;
      content += `${m.text}\n`;
      if (m.citations && m.citations.length > 0) {
        content += `Citations / Sources:\n`;
        m.citations.forEach((c) => {
          content += `  * ${c}\n`;
        });
      }
      content += `\n--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, filename };
  } catch (err) {
    console.error('Failed to export conversation as plain text:', err);
    return { success: false, filename: '' };
  }
}
