import { App } from '@modelcontextprotocol/ext-apps';
import type { Selection, ToolData } from './types';

export class ToolFailure extends Error {
  constructor(message: string, public data?: ToolData) { super(message); }
}

type ToolResult = { structuredContent?: unknown; content?: { type: string; text?: string }[]; isError?: boolean };
export function unpack(result: ToolResult): ToolData {
  let data = result.structuredContent;
  if (data == null) {
    const text = result.content?.find(block => block.type === 'text')?.text;
    if (text) {
      try { data = JSON.parse(text); } catch { throw new ToolFailure(text); }
    }
  }
  if (!data || typeof data !== 'object') throw new ToolFailure('The server returned no structured campaign data.');
  const record = data as ToolData;
  if (result.isError || record.error) throw new ToolFailure(record.error?.message ?? record.message ?? 'The tool rejected this request.', record);
  return record;
}

export class Bridge {
  readonly embedded = window.parent !== window;
  private app: App | null = null;
  private connecting: Promise<void> | null = null;
  private token = '';
  onResult?: (data: ToolData) => void;

  constructor() {
    if (!this.embedded) {
      try { this.token = sessionStorage.getItem('rome-preview-token') ?? ''; } catch { /* Memory-only authentication remains available. */ }
    }
  }
  get authenticated() { return this.embedded || Boolean(this.token); }
  setToken(token: string) {
    this.token = token.trim();
    try { sessionStorage.setItem('rome-preview-token', this.token); } catch { /* Sandboxed storage is optional. */ }
  }
  connect(): Promise<void> {
    if (!this.embedded) return Promise.resolve();
    if (!this.connecting) {
      this.app = new App({ name: 'Rome imperial workspace', version: '0.1.0' }, {});
      this.app.ontoolresult = result => {
        try { this.onResult?.(unpack(result)); }
        catch (error) { if (error instanceof ToolFailure && error.data) this.onResult?.(error.data); }
      };
      this.connecting = this.app.connect().catch(error => { this.connecting = null; throw error; });
    }
    return this.connecting;
  }
  async call(name: string, args: Record<string, unknown> = {}): Promise<ToolData> {
    await this.connect();
    if (this.app) return unpack(await this.app.callServerTool({ name, arguments: args }));
    if (!this.token) throw new ToolFailure('Run uv run python -m rome --print-token on your host, then enter that local preview token.');
    const response = await fetch('/api/tool', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ name, arguments: args }), signal: AbortSignal.timeout(20000),
    });
    if (response.status === 401 || response.status === 403) throw new ToolFailure('Authentication failed. Check the local service token and reconnect.');
    if (response.status >= 500) throw new Error(`Host returned HTTP ${response.status}; command delivery is uncertain.`);
    const result = await response.json() as ToolResult;
    if (!response.ok) {
      try { unpack(result); } catch (error) { if (error instanceof ToolFailure) throw error; }
      throw new ToolFailure(`Local service returned HTTP ${response.status}.`);
    }
    return unpack(result);
  }
  async context(selection: Selection | null, revision: number) {
    if (!this.embedded) return;
    await this.connect();
    await this.app!.updateModelContext({ structuredContent: { selection, revision, instruction: 'Inspect current campaign facts before advising or issuing orders.' } });
  }
  async ask(ambition: string, revision: number, selection: Selection | null) {
    if (!this.embedded) throw new ToolFailure('No AI runs in local preview. Copy this ambition to your connected ChatGPT conversation, or import a validated proposal below.');
    await this.context(selection, revision);
    const result = await this.app!.sendMessage({ role: 'user', content: [{ type: 'text', text: `Rome campaign ambition: ${ambition}\nInspect campaign and supported catalog rules, explain unsupported mechanics, and propose a versioned development tree through propose_development. Do not accept it or invent outcomes. Current workspace selection: ${JSON.stringify(selection)}.` }] });
    if (result.isError) throw new ToolFailure('The host declined the steward message. Send the ambition in the conversation instead.');
  }
}
export const bridge = new Bridge();
