#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SANDBOX_PORT || 5178;

// Simple in-memory store for SSE clients and buffered events
const subscribers = new Map(); // runId -> [{res, req}]
const buffers = new Map(); // runId -> [{type:'stdout'|'stderr'|'exit', data}]

const ALLOWED = new Set(['ls', 'cat', 'echo', 'pwd', 'whoami', 'node', 'npm']);

function bufferEvent(runId, ev) {
  if (!buffers.has(runId)) buffers.set(runId, []);
  buffers.get(runId).push(ev);
}

function sendToSubscribers(runId, ev) {
  const subs = subscribers.get(runId) || [];
  for (const res of subs) {
    try {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    } catch (err) {
      // ignore
    }
  }
}

app.post('/sandbox/run', (req, res) => {
  const { command, readOnly } = req.body || {};
  if (!command || typeof command !== 'string') return res.status(400).json({ error: 'command required' });

  // simple safety: deny some dangerous substrings
  const lowered = command.toLowerCase();
  const forbidden = ['rm ', 'rm -', 'mv ', 'shutdown', 'reboot', 'mkfs', 'dd ', '>:'];
  for (const f of forbidden) if (lowered.includes(f)) return res.status(400).json({ error: 'command not allowed' });

  const first = command.split(/\s+/)[0];
  if (!ALLOWED.has(first)) {
    // allow node/npm when readOnly true and only -v queries
    if ((first === 'node' || first === 'npm') && /-v|--version/.test(command)) {
      // allowed
    } else {
      return res.status(400).json({ error: `command '${first}' not allowed in sandbox` });
    }
  }

  const runId = randomUUID();
  bufferEvent(runId, { type: 'start', data: { command } });

  // spawn the command in a shell for convenience but keep checks above
  const child = spawn(command, { shell: true, cwd: process.cwd() });

  child.stdout.on('data', chunk => {
    const ev = { type: 'stdout', data: String(chunk) };
    bufferEvent(runId, ev);
    sendToSubscribers(runId, ev);
  });
  child.stderr.on('data', chunk => {
    const ev = { type: 'stderr', data: String(chunk) };
    bufferEvent(runId, ev);
    sendToSubscribers(runId, ev);
  });
  child.on('close', code => {
    const ev = { type: 'exit', data: { code } };
    bufferEvent(runId, ev);
    sendToSubscribers(runId, ev);
    // close all subscribers for this run
    const subs = subscribers.get(runId) || [];
    for (const res of subs) {
      try { res.end(); } catch (e) {}
    }
    subscribers.delete(runId);
  });

  res.json({ runId });
});

app.get('/sandbox/stream/:id', (req, res) => {
  const runId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // send buffered events first
  const buf = buffers.get(runId) || [];
  for (const ev of buf) res.write(`data: ${JSON.stringify(ev)}\n\n`);

  if (!subscribers.has(runId)) subscribers.set(runId, []);
  subscribers.get(runId).push(res);

  req.on('close', () => {
    const list = subscribers.get(runId) || [];
    const idx = list.indexOf(res);
    if (idx >= 0) list.splice(idx, 1);
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Sandbox server listening on http://localhost:${PORT}`);
});
