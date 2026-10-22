/**
 * Understanding what Chris said. With a Claude key, Claude reads it against his day; without one
 * (or if Claude can't be reached), the rule-based reader does. Both return checked actions.
 */
import { Platform } from 'react-native';
import { buildContext, checkActions, readWithoutClaude, REPLY_SCHEMA, summarize, SYSTEM_PROMPT, type Action, type RawReply, type Situation } from '../engine/assistant';

export const CLAUDE_MODEL = 'claude-haiku-5-5';

export interface Understood {
  reply: string;
  actions: Action[];
  notes: string[];
  /** Who did the understanding. */
  by: 'claude' | 'rules';
  /** Why Claude wasn't used, when it should have been. */
  fallbackReason?: string;
}

class ClaudeError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

async function callClaude(key: string, utterance: string, s: Situation, signal?: AbortSignal): Promise<RawReply> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };
  if (Platform.OS === 'web') headers['anthropic-dangerous-direct-browser-access'] = 'true';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: REPLY_SCHEMA } },
      messages: [{ role: 'user', content: `${buildContext(s)}\n\nCHRIS SAID: "${utterance.replace(/"/g, "'")}"` }],
    }),
  });
  if (!res.ok) {
    let msg = `Claude returned ${res.status}`;
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message; } catch { /* keep the status message */ }
    throw new ClaudeError(msg, res.status);
  }
  const body = await res.json();
  if (body?.stop_reason === 'refusal') throw new ClaudeError('Claude declined that one');
  const text: string | undefined = (body?.content ?? []).find((b: { type: string }) => b.type === 'text')?.text;
  if (!text) throw new ClaudeError('Claude sent nothing back');
  const parsed = JSON.parse(text) as RawReply;
  if (!parsed || !Array.isArray(parsed.actions)) throw new ClaudeError('Claude sent something Hats could not read');
  return parsed;
}

function reasonFor(e: unknown): string {
  if (e instanceof ClaudeError) {
    if (e.status === 401) return 'Your Claude key was turned down. Check it in Settings.';
    if (e.status === 429) return 'Claude is busy right now.';
    if (e.status && e.status >= 500) return 'Claude is having trouble right now.';
    return e.message;
  }
  if (e instanceof Error && e.name === 'AbortError') return 'Claude took too long.';
  return 'Couldn’t reach Claude (no internet?).';
}

export async function understand(utterance: string, s: Situation, key: string | null): Promise<Understood> {
  const text = utterance.trim();
  if (!text) return { reply: 'Nothing to add from that.', actions: [], notes: [], by: 'rules' };
  if (key) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const raw = await callClaude(key, text, s, ctl.signal);
      const { actions, notes } = checkActions(raw.actions, s);
      return { reply: raw.reply?.trim() || summarize(actions, s.today), actions, notes, by: 'claude' };
    } catch (e) {
      const fallbackReason = reasonFor(e);
      const raw = readWithoutClaude(text, s);
      const { actions, notes } = checkActions(raw.actions, s);
      return { reply: summarize(actions, s.today), actions, notes, by: 'rules', fallbackReason };
    } finally {
      clearTimeout(timer);
    }
  }
  const raw = readWithoutClaude(text, s);
  const { actions, notes } = checkActions(raw.actions, s);
  return { reply: raw.reply || summarize(actions, s.today), actions, notes, by: 'rules' };
}

/** A tiny round trip to check a key works. */
export async function testClaudeKey(key: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key.trim(), 'anthropic-version': '2023-06-01', ...(Platform.OS === 'web' ? { 'anthropic-dangerous-direct-browser-access': 'true' } : {}) },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK.' }] }),
    });
    if (res.ok) return null;
    if (res.status === 401) return 'That key was turned down. Copy it again from platform.claude.com.';
    let msg = `Claude returned ${res.status}.`;
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message; } catch { /* keep */ }
    return msg;
  } catch {
    return 'Couldn’t reach Claude. Check your internet and try again.';
  }
}
