import { useEffect, useSyncExternalStore } from 'react';
import { bridge, ToolFailure } from './bridge';
import type { Fleet, State, ToolData } from './types';

type Pending = { name: string; args: Record<string, unknown> };
type View = { state: State | null; routePreview: Fleet['route']; busy: boolean; connected: boolean; error: string; message: string; uncertain: boolean };
class Campaign {
  private view: View = { state: null, routePreview: null, busy: false, connected: false, error: '', message: '', uncertain: false };
  private listeners = new Set<() => void>();
  private chain: Promise<unknown> = Promise.resolve();
  private pending: Pending | null = null;
  private running = false;
  private timer?: number;
  private heartbeat?: number;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.view;
  private update(values: Partial<View>) { this.view = { ...this.view, ...values }; this.listeners.forEach(listener => listener()); }
  private accept = (data: ToolData) => {
    if (data.state && (!this.view.state || data.state.revision >= this.view.state.revision)) this.update({ state: data.state, connected: true });
    if (data.route) this.showRoute(data.route);
  };
  private queue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.chain.then(operation);
    this.chain = next.catch(() => undefined);
    return next;
  }
  report = (error: unknown) => this.update({ error: error instanceof Error ? error.message : String(error) });
  clear = () => this.update({ error: '', message: '' });
  showRoute = (routePreview: Fleet['route']) => this.update({ routePreview });
  inspect = () => this.queue(async () => {
    try {
      const data = await bridge.call('inspect_campaign');
      if (!data.state) throw new ToolFailure('Campaign inspection returned no state.');
      this.accept(data);
    } catch (error) { this.update({ connected: false }); this.report(error); }
  });
  login = async (token: string) => { bridge.setToken(token); this.clear(); await this.inspect(); };
  command = (action: string, payload: Record<string, unknown> = {}) => this.queue(async () => {
    if (this.pending) { this.report(new Error('Resolve the uncertain order with Retry before issuing another command.')); return; }
    if (!this.view.state) return;
    const envelope = { command_id: crypto.randomUUID(), expected_revision: this.view.state.revision };
    const request: Pending = action === 'propose_tree'
      ? { name: 'propose_development', args: { ...envelope, proposal: payload.proposal } }
      : { name: 'issue_order', args: { ...envelope, action, payload } };
    await this.execute(request, action === 'heartbeat');
  });
  private async execute(request: Pending, quiet = false) {
    this.update({ busy: true, error: '' });
    try {
      const data = await bridge.call(request.name, request.args);
      this.pending = null;
      this.accept(data);
      if (request.args.action === 'move' || request.args.action === 'expedition') this.showRoute(null);
      this.update({ uncertain: false, ...(quiet ? {} : { message: data.message ?? 'Order accepted.' }) });
      try {
        this.accept(await bridge.call('inspect_campaign'));
      } catch (error) {
        this.update({ connected: false });
        this.report(new Error(`Order accepted, but refreshing the campaign failed: ${error instanceof Error ? error.message : String(error)}`));
      }
      if (this.view.state) {
        try { await bridge.context(this.view.state.selection, this.view.state.revision); }
        catch (error) { this.report(new Error(`Order accepted, but steward context could not be shared: ${error instanceof Error ? error.message : String(error)}`)); }
      }
    } catch (error) {
      if (error instanceof ToolFailure) {
        this.pending = null;
        if (error.data) this.accept(error.data);
        this.update({ uncertain: false });
        this.report(error);
      } else {
        this.pending = request;
        this.update({ uncertain: true, connected: false, error: 'Connection interrupted. The order may have committed. Retry uses the same command ID and cannot spend twice.' });
      }
    } finally { this.update({ busy: false }); }
  }
  retry = () => this.queue(async () => { if (this.pending) await this.execute(this.pending); });
  preview = (action: string, payload: Record<string, unknown> = {}) => this.queue(() => bridge.call('preview_order', { action, payload }));
  catalog = () => this.queue(() => bridge.call('inspect_catalog'));
  start() {
    if (this.running) return;
    this.running = true;
    bridge.onResult = this.accept;
    const poll = async () => {
      if (!this.running) return;
      if (bridge.authenticated && !document.hidden) await this.inspect();
      if (this.running) this.timer = window.setTimeout(poll, this.view.state?.paused === false ? 1000 : 5000);
    };
    void poll();
    this.heartbeat = window.setInterval(() => {
      if (this.view.connected && !document.hidden && !this.pending && !this.view.busy) void this.command('heartbeat');
    }, 30000);
  }
  stop() { this.running = false; clearTimeout(this.timer); clearInterval(this.heartbeat); bridge.onResult = undefined; }
}
export const campaign = new Campaign();
export function useCampaign() {
  const view = useSyncExternalStore(campaign.subscribe, campaign.snapshot);
  useEffect(() => { campaign.start(); return () => campaign.stop(); }, []);
  return view;
}
