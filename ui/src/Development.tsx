import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, type Node, type NodeProps, type Edge, type ReactFlowInstance } from '@xyflow/react';
import { Icon } from './Icon';
import { type State, type Selection } from './types';
import { DevelopmentCard } from './development/DevelopmentCard';
import { developmentCard } from './development/derive';
import type { DevelopmentCardModel } from './development/presentation';

type CardData = { model: DevelopmentCardModel; highlighted: boolean; dimmed: boolean; disabled: boolean; onSelect: (id: string) => void };
type Card = Node<CardData, 'development'>;
const NodeCard = memo(function NodeCard({ data, selected }: NodeProps<Card>) {
  return <div className="development-graph-node nopan nodrag" onClickCapture={event => { if (event.target instanceof Element) event.target.closest('button')?.focus({ preventScroll: true }); }}>
    <Handle type="target" position={Position.Left} />
    <DevelopmentCard model={data.model} selected={Boolean(selected)} highlighted={data.highlighted} dimmed={data.dimmed} disabled={data.disabled} onSelect={data.onSelect} />
    <Handle type="source" position={Position.Right} />
  </div>;
});
const nodeTypes = { development: NodeCard };

export function Development({ state, reduced, disabled, onSelect }: { state: State; reduced: boolean; disabled: boolean; onSelect: (selection: Selection) => void }) {
  const instance = useRef<ReactFlowInstance<Card, Edge> | null>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const cached = useRef(new Map<string, { signature: string; card: Card }>());
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);
  const selectNode = useCallback((id: string) => select.current({ kind: 'node', id }), []);
  const [query, setQuery] = useState('');
  const nodes = useMemo(() => state.trees.flatMap(tree => tree.nodes), [state.trees]);
  const topology = nodes.map(node => `${node.id}:${node.prerequisites.join(',')}`).join('|');
  const layout = useMemo(() => {
    const lookup = new Map(nodes.map(node => [node.id, node]));
    const depths = new Map<string, number>();
    const visiting = new Set<string>();
    const depth = (id: string): number => {
      if (depths.has(id)) return depths.get(id)!;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const parents = lookup.get(id)?.prerequisites ?? [];
      const value = parents.length ? Math.max(...parents.map(parent => depth(parent) + 1)) : 0;
      visiting.delete(id); depths.set(id, value); return value;
    };
    const lanes = new Map<number, number>();
    for (const point of positions.current.values()) lanes.set(point.x, Math.max(lanes.get(point.x) ?? 0, point.y + 215));
    for (const node of nodes) {
      if (!positions.current.has(node.id)) {
        const x = depth(node.id) * 335;
        const y = lanes.get(x) ?? 0;
        positions.current.set(node.id, { x, y }); lanes.set(x, y + 215);
      }
    }
    return new Map(positions.current);
    // Status/progress changes must never relayout the graph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topology]);
  const selected = state.selection?.kind === 'node' ? state.selection.id : '';
  const ancestors = useMemo(() => {
    const lookup = new Map(nodes.map(node => [node.id, node.prerequisites]));
    const found = new Set<string>();
    const pending = [...(lookup.get(selected) ?? [])];
    while (pending.length) { const id = pending.pop()!; if (!found.has(id)) { found.add(id); pending.push(...(lookup.get(id) ?? [])); } }
    return found;
  }, [topology, selected]);
  const cards = useMemo(() => {
    const lookup = new Map(nodes.map(node => [node.id, node]));
    return nodes.map(node => {
      const data: CardData = { model: developmentCard(node, lookup), highlighted: ancestors.has(node.id), dimmed: Boolean(query && !`${node.title} ${node.description}`.toLowerCase().includes(query.toLowerCase())), disabled, onSelect: selectNode };
      const signature = JSON.stringify([data.model, data.highlighted, data.dimmed, data.disabled, selected === node.id]);
      const prior = cached.current.get(node.id);
      if (prior?.signature === signature) return prior.card;
      const card: Card = { id: node.id, type: 'development', position: layout.get(node.id)!, data, selected: selected === node.id, focusable: false, selectable: false };
      cached.current.set(node.id, { signature, card }); return card;
    });
  }, [nodes, ancestors, query, selected, disabled, layout, selectNode]);
  const edges = useMemo<Edge[]>(() => nodes.flatMap(node => node.prerequisites.map(parent => ({ id: `${parent}:${node.id}`, source: parent, target: node.id, type: 'smoothstep', style: { stroke: (ancestors.has(parent) && (ancestors.has(node.id) || node.id === selected)) ? '#dfbc75' : '#465461', strokeWidth: 1.5 }, animated: false }))), [topology, ancestors, selected]);
  return <div className="development-workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Knowledge is not capacity</span><h2>Development of the empire</h2><p>{nodes.length} projects · {state.trees.length} ambitions · gold links trace selected prerequisites</p></div><button onClick={() => instance.current?.fitView({ padding: .2, duration: reduced ? 0 : 320 })}>Show new projects</button></div>
    <div className="graph-tools"><label>Find a project<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles and descriptions" /></label><label>Keyboard project selection<select value={selected} disabled={disabled} onChange={event => { if (event.target.value) onSelect({ kind: 'node', id: event.target.value }); }}><option value="">Select a project</option>{nodes.map(node => <option key={node.id} value={node.id}>{node.title} — {node.status}</option>)}</select></label></div>
    <div className="graph-canvas"><ReactFlow<Card, Edge> nodes={cards} edges={edges} nodeTypes={nodeTypes} onInit={flow => { instance.current = flow; }} nodesFocusable={false} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false} minZoom={.12} maxZoom={1.6} defaultViewport={{ x: 35, y: 35, zoom: .8 }} onlyRenderVisibleElements proOptions={{ hideAttribution: true }}><Background gap={24} color="#29343b" /><Controls showInteractive={false} fitViewOptions={{ duration: reduced ? 0 : 320 }} /></ReactFlow></div>
    {nodes.length === 0 && <div className="graph-empty"><Icon recipe={{ base: 'learning' }} /><h3>The future is not yet written</h3><p>Set an ambition in Council, or choose the optional naval tutorial. Validated projects appear here, whatever their names or subject.</p></div>}
  </div>;
}
