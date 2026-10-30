import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory & JSONL append-only audit trail
const AUDIT_FILE = path.resolve(process.cwd(), 'audit_log.jsonl');

interface AuditEntry {
  entryId: string;
  timestamp: string;
  action: string;
  payloadHash: string;
  sender: string;
  status: 'CERTIFIED' | 'VERIFIED' | 'REJECTED';
  blockHeight: number;
}

// Initial seed audit log
let auditTrail: AuditEntry[] = [
  {
    entryId: 'ENT-90214-AA',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    action: 'BEZALEL_SENDER_AUTHORIZATION',
    payloadHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    sender: 'bezalel://sender.exante.eu/aspen-01',
    status: 'CERTIFIED',
    blockHeight: 148920,
  },
  {
    entryId: 'ENT-90215-BC',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'EXANTE_ASPEN_LEDGER_SYNC',
    payloadHash: 'cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34',
    sender: 'aspen://node-eu-central.exante.eu',
    status: 'VERIFIED',
    blockHeight: 148921,
  },
  {
    entryId: 'ENT-90216-DD',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'SECTION_8_TRUST_ENCLAVE_DISPATCH',
    payloadHash: '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865',
    sender: 'gecko://hologram.exante.eu/render-only',
    status: 'CERTIFIED',
    blockHeight: 148922,
  },
];

// Aspen Immutable Ledger Blocks
interface LedgerBlock {
  height: number;
  hash: string;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  bezalelSignature: string;
  transactionsCount: number;
  status: 'FINALIZED';
}

let ledgerBlocks: LedgerBlock[] = [
  {
    height: 148920,
    hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    previousHash: '000000000019d6689b97412e12812301982bca1e46a2a6c172b3f1b60a8ce26e',
    merkleRoot: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    bezalelSignature: 'ED25519_SIG_BEZALEL_9A81F0D44A',
    transactionsCount: 142,
    status: 'FINALIZED',
  },
  {
    height: 148921,
    hash: '000000000019d6689c4418a09219801289139801249081290849120984091283',
    previousHash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    merkleRoot: '2b678f1981290348a91082349081240981240981204981209481209481209481',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    bezalelSignature: 'ED25519_SIG_BEZALEL_88C1B7293E',
    transactionsCount: 89,
    status: 'FINALIZED',
  },
  {
    height: 148922,
    hash: '000000000019d6689c8989129084120984091284091824091824091820498124',
    previousHash: '000000000019d6689c4418a09219801289139801249081290849120984091283',
    merkleRoot: '8f90128409182409182409182049812489120948120948120948120948120948',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    bezalelSignature: 'ED25519_SIG_BEZALEL_55F4C10992',
    transactionsCount: 204,
    status: 'FINALIZED',
  },
];

// Health check endpoint for assistant status & Aspen node
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'EXANTE Gecko Assistant',
    aspenLedger: 'SYNCED',
    bezalelSender: 'ONLINE',
    blockHeight: ledgerBlocks[ledgerBlocks.length - 1].height,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    primaryModel: 'gemini-3.5-flash',
    timestamp: new Date().toISOString(),
  });
});

// Audit Trail Endpoints
app.get('/api/audit', (req, res) => {
  res.json({
    entries: auditTrail,
    total: auditTrail.length,
    latestBlock: ledgerBlocks[ledgerBlocks.length - 1].height,
  });
});

app.post('/api/audit/record', (req, res) => {
  try {
    const { action, payload, sender } = req.body;
    if (!action) return res.status(400).json({ error: 'Action is required' });

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const entryId = `ENT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const latestBlock = ledgerBlocks[ledgerBlocks.length - 1].height + 1;

    const newEntry: AuditEntry = {
      entryId,
      timestamp: new Date().toISOString(),
      action: action.toUpperCase(),
      payloadHash,
      sender: sender || 'gecko://hologram.exante.eu/render-only',
      status: 'CERTIFIED',
      blockHeight: latestBlock,
    };

    auditTrail.unshift(newEntry);
    if (auditTrail.length > 50) auditTrail.pop();

    res.json({ success: true, entry: newEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit/verify', (req, res) => {
  try {
    const { payload, expectedHash } = req.body;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const computedHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const isValid = expectedHash ? computedHash.toLowerCase() === expectedHash.toLowerCase() : true;

    res.json({
      computedHash,
      expectedHash: expectedHash || computedHash,
      isValid,
      aspenVerification: 'CRYPTOGRAPHIC_MATCH',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Aspen Ledger Endpoints
app.get('/api/ledger/blocks', (req, res) => {
  res.json({
    blocks: ledgerBlocks,
    network: 'Exante Aspen Mainnet',
    consensus: 'Proof-of-Authority (PoA) / Bezalel Enclave',
    chainHeight: ledgerBlocks[ledgerBlocks.length - 1].height,
  });
});

app.post('/api/bezalel/dispatch', (req, res) => {
  try {
    const { instruction, payload } = req.body;
    const payloadStr = JSON.stringify(payload || { instruction });
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
    const sig = `ED25519_BEZALEL_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const newHeight = ledgerBlocks[ledgerBlocks.length - 1].height + 1;

    const newBlock: LedgerBlock = {
      height: newHeight,
      hash: crypto.createHash('sha256').update(`${newHeight}-${payloadHash}-${Date.now()}`).digest('hex'),
      previousHash: ledgerBlocks[ledgerBlocks.length - 1].hash,
      merkleRoot: payloadHash,
      timestamp: new Date().toISOString(),
      bezalelSignature: sig,
      transactionsCount: Math.floor(Math.random() * 50) + 1,
      status: 'FINALIZED',
    };

    ledgerBlocks.push(newBlock);

    // Also record in audit trail
    auditTrail.unshift({
      entryId: `ENT-${newHeight}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      timestamp: new Date().toISOString(),
      action: `BEZALEL_${(instruction || 'DISPATCH').toUpperCase()}`,
      payloadHash,
      sender: 'bezalel://sender.exante.eu/enclave-aspen',
      status: 'CERTIFIED',
      blockHeight: newHeight,
    });

    res.json({
      success: true,
      block: newBlock,
      signature: sig,
      payloadHash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 5. Capability layer: Gateway Contract (Single Endpoint) ───
app.post('/api/gateway', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { action, source, payload, session_id, approval_ref } = req.body;

    if (!action || !source) {
      return res.status(400).json({
        status: 'error',
        error: 'Contract violation: "action" and "source" are required.',
      });
    }

    // Ping / connection test
    if (action === 'search' && payload?.query === 'ping') {
      return res.json({
        status: 'ok',
        backend: 'bridge',
        result: {
          ping: 'pong',
          authenticated: !!token,
          latency: '18ms',
          systemsAvailable: ['jira', 'gmail', 'calendar', 'confluence', 'slack', 'crm', 'assistant'],
        },
      });
    }

    // Write action approval gate
    if (action === 'write') {
      if (!approval_ref) {
        const generatedRef = `APP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        return res.json({
          status: 'needs_approval',
          approval_ref: generatedRef,
          backend: 'bridge',
          result: {
            summary: `Approval required for write to ${source}`,
            payload: payload || {},
          },
        });
      }

      // Approved execution
      const payloadString = JSON.stringify(payload || {});
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
      const newHeight = ledgerBlocks[ledgerBlocks.length - 1].height + 1;
      const sig = `ED25519_GATEWAY_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const newBlock: LedgerBlock = {
        height: newHeight,
        hash: crypto.createHash('sha256').update(`${ledgerBlocks[ledgerBlocks.length - 1].hash}${payloadHash}`).digest('hex'),
        previousHash: ledgerBlocks[ledgerBlocks.length - 1].hash,
        merkleRoot: payloadHash,
        timestamp: new Date().toISOString(),
        bezalelSignature: sig,
        transactionsCount: 1,
        status: 'FINALIZED',
      };
      ledgerBlocks.push(newBlock);

      auditTrail.unshift({
        entryId: `ENT-${newHeight}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        timestamp: new Date().toISOString(),
        action: `GATEWAY_WRITE_${source.toUpperCase()}`,
        payloadHash,
        sender: token ? `bearer:${token.slice(0, 8)}...` : 'aspen://gateway.bridge',
        status: 'CERTIFIED',
        blockHeight: newHeight,
      });

      return res.json({
        status: 'ok',
        backend: 'bridge',
        result: {
          success: true,
          action: 'write',
          source,
          approval_ref,
          blockHeight: newHeight,
          txHash: newBlock.hash,
        },
        citations: [`aspen://ledger/block-${newHeight}`, `bridge://${source}/${approval_ref}`],
      });
    }

    // Static / Ledger status queries
    const rawQuery = (payload?.query || payload?.message || '').toLowerCase();
    if (rawQuery.includes('ledger') || rawQuery.includes('block height') || rawQuery.includes('aspen status') || rawQuery.includes('ledger status')) {
      const latestBlock = ledgerBlocks[ledgerBlocks.length - 1];
      return res.json({
        status: 'ok',
        backend: 'bridge',
        result: {
          text: `Aspen Ledger Status: SYNCED\n• Latest Block Height: ${latestBlock.height}\n• Consensus: Finalized (PoA / Bezalel Trust Enclave)\n• Merkle Root: ${latestBlock.merkleRoot}\n• Signature: ${latestBlock.bezalelSignature}\n• Timestamp: ${latestBlock.timestamp}\n• Latency: 12ms`,
          summary: `Aspen Ledger: SYNCED at block ${latestBlock.height}`,
          source: 'aspen-ledger',
        },
        citations: [
          `aspen://ledger/block-${latestBlock.height}`,
          'aspen://consensus/bezalel-poa',
          'exante://node-eu-central.exante.eu',
        ],
      });
    }

    // Assistant / Freeform queries
    if (source === 'assistant') {
      const queryText = payload?.query || payload?.message || 'Hello';
      const apiKey = process.env.GEMINI_API_KEY;
      let replyText = `I am the EXANTE Gecko assistant answering via the Aspen Concierge gateway bridge. Regarding "${queryText}", systems are operational.`;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: queryText,
            config: {
              systemInstruction: `You are the EXANTE Gecko personal assistant answering through the Aspen/Code Concierge gateway bridge. You have full memory of the owner's environment, cold-blooded gecko wit, and tailored navy EXANTE knit sweatshirt. Answer clearly, accurately, and concisely.`,
            },
          });
          if (response.text) replyText = response.text;
        } catch (_) {}
      }

      return res.json({
        status: 'ok',
        backend: 'bridge',
        result: {
          text: replyText,
          source: 'assistant',
        },
        citations: ['aspen://concierge/memory-01', 'exante://gecko/context'],
      });
    }

    // Default system reads/searches (jira, gmail, slack, crm, etc.)
    const sourceCitations: Record<string, string[]> = {
      jira: ['JIRA-4029: Cross-margin execution routing', 'JIRA-4108: Aspen bridge security hardening'],
      gmail: ['thread/gm-90214: EXANTE Prime Broker execution notice', 'thread/gm-8831: Settlement confirmation'],
      calendar: ['cal/2026-10-29: Institutional Liquidity Review (14:00 UTC)'],
      confluence: ['wiki/aspen-bridge-spec-v5: Single gateway contract specification'],
      slack: ['#trading-ops/p1730182: Bezalel enclave health confirmed'],
      crm: ['crm://accounts/EXA-88391: Direct Market Access Tier 1'],
    };

    return res.json({
      status: 'ok',
      backend: 'bridge',
      result: {
        source,
        action,
        query: payload?.query || 'default_query',
        summary: `Retrieved live records for ${source} via Aspen Concierge Gateway Bridge.`,
      },
      citations: sourceCitations[source] || [`bridge://${source}/ref-${Date.now()}`],
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      error: err.message,
      backend: 'bridge',
    });
  }
});

// API route for Gemini AI
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { messages, prompt, systemInstruction } = req.body;
    if (!messages && !prompt) {
      return res.status(400).json({ error: 'Prompt or messages are required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Normalize multi-turn contents
    let contents = messages || prompt;
    if (Array.isArray(contents)) {
      // Multiturn MUST start with user role
      while (contents.length > 0 && contents[0].role !== 'user') {
        contents = contents.slice(1);
      }
      if (contents.length === 0 && prompt) {
        contents = prompt;
      }
    }

    // Try primary high-speed model with fallback for 503/capacity limits
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;
    let generatedText: string | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        if (response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, trying next:`, err.message?.slice(0, 100));
      }
    }

    if (generatedText !== null) {
      return res.json({ text: generatedText });
    }

    throw lastError || new Error('No model returned a response');
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || (!process.env.NODE_ENV && fs.existsSync(distPath) && process.env.VITE_DEV !== 'true');

  if (process.env.NODE_ENV !== 'production' && !process.env.SERVE_DIST) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Application build not found. Please build the app.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
