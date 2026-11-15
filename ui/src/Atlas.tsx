import { useEffect, useRef, useState, memo } from 'react';
import { Map as MapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl';
import workerSource from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import land from './assets/land.json';
import relief from './assets/relief.json';
import regions from './assets/regions.json';
import waters from './assets/waters.json';
import type { Fleet, Position, Selection, State } from './types';
import './atlas.css';

setWorkerUrl(URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' })));
const collection = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });
const feature = (geometry: Geometry, properties: Record<string, unknown>): Feature => ({ type: 'Feature', geometry, properties });
const empty = collection([]);
const regionFeatures = (regions as FeatureCollection).features;
const territoryGeometry = new Map(regionFeatures.filter(item => item.properties?.kind === 'territory').map(item => [item.properties!.id as string, item.geometry]));
const context = collection(regionFeatures.filter(item => item.properties?.kind === 'context'));
const mediterranean: [Position, Position] = [[-7, 22], [40, 48]];
const corridor: [Position, Position] = [[6, -2], [122, 43]];

// Canvas-generated label sprites use local system fonts: no glyph server,
// remote font, HTML from game data, or external image request is required.
const labels: { text: string; position: Position; kind: 'sea' | 'region' | 'terrain'; detail?: boolean }[] = [
  { text: 'M E D I T E R R A N E A N   S E A', position: [17.4, 34.4], kind: 'sea' },
  { text: 'BLACK SEA', position: [34, 43.2], kind: 'sea' },
  { text: 'RED SEA', position: [38.4, 21], kind: 'sea' },
  { text: 'ARABIAN SEA', position: [62, 15], kind: 'sea' },
  { text: 'BAY OF BENGAL', position: [89, 14], kind: 'sea' },
  { text: 'SOUTH CHINA SEA', position: [114, 12], kind: 'sea' },
  { text: 'INDIAN OCEAN', position: [70, -6], kind: 'sea' },
  { text: 'TYRRHENIAN SEA', position: [11.7, 39.4], kind: 'sea', detail: true },
  { text: 'AEGEAN SEA', position: [25, 37], kind: 'sea', detail: true },
  { text: 'ADRIATIC SEA', position: [16.4, 42.5], kind: 'sea', detail: true },
  { text: 'H I S P A N I A', position: [-3.5, 40], kind: 'region' },
  { text: 'G A L L I A', position: [2.8, 46.7], kind: 'region' },
  { text: 'I T A L I A', position: [12, 44.3], kind: 'region' },
  { text: 'G R A E C I A', position: [22, 39.2], kind: 'region' },
  { text: 'A N A T O L I A', position: [32, 39], kind: 'region' },
  { text: 'AFRICA PROCONSULARIS', position: [8.6, 33.6], kind: 'region', detail: true },
  { text: 'A E G Y P T U S', position: [29.7, 27.4], kind: 'region' },
  { text: 'S Y R I A', position: [37.6, 35.5], kind: 'region', detail: true },
  { text: 'PARTHIAN SPHERE ≈', position: [53, 33.7], kind: 'region' },
  { text: 'KUSHAN SPHERE ≈', position: [69, 33], kind: 'region' },
  { text: 'A R A B I A', position: [46.7, 23.8], kind: 'region' },
  { text: 'I N D I A', position: [79, 23], kind: 'region' },
  { text: 'LANKA', position: [81, 6.8], kind: 'region', detail: true },
  { text: 'SOUTHERN CHINA', position: [113, 27.8], kind: 'region' },
  { text: 'S A H A R A', position: [10, 25], kind: 'terrain' },
  { text: 'ATLAS MOUNTAINS', position: [-1.5, 32.4], kind: 'terrain', detail: true },
  { text: 'ALPS', position: [10.2, 46.4], kind: 'terrain', detail: true },
  { text: 'H I M A L A Y A', position: [85, 30], kind: 'terrain' },
];

function addLabels(instance: LibreMap) {
  const points = labels.map((label, index) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const size = label.kind === 'sea' ? 13 : label.kind === 'terrain' ? 11 : 12;
    const font = `${label.kind === 'terrain' ? 'italic' : 'normal'} 600 ${size}px Georgia, serif`;
    context.font = font;
    canvas.width = Math.ceil(context.measureText(label.text).width + 14) * 2;
    canvas.height = 40;
    context.scale(2, 2);
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = label.kind === 'sea' ? 3 : 4;
    context.strokeStyle = label.kind === 'sea' ? '#173e51' : '#e2cfab';
    context.fillStyle = label.kind === 'sea' ? '#9ac3cb' : label.kind === 'terrain' ? '#796d51' : '#544b3c';
    context.strokeText(label.text, canvas.width / 4, 10);
    context.fillText(label.text, canvas.width / 4, 10);
    const id = `atlas-label-${index}`;
    instance.addImage(id, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: 2 });
    return feature({ type: 'Point', coordinates: label.position }, { icon: id, detail: !!label.detail });
  });
  instance.addSource('labels', { type: 'geojson', data: collection(points) });
  for (const detail of [false, true]) {
    instance.addLayer({ id: detail ? 'labels-detail' : 'labels-overview', type: 'symbol', source: 'labels', minzoom: detail ? 4.2 : 1,
      filter: ['==', ['get', 'detail'], detail],
      layout: { 'icon-image': ['get', 'icon'], 'icon-padding': 10, 'icon-allow-overlap': false, 'icon-ignore-placement': false },
    });
  }
}

type MapButton = { marker: Marker; button: HTMLButtonElement; label: HTMLSpanElement };
function makeMarker(instance: LibreMap, kind: 'port' | 'fleet', id: string, onSelect: (selection: Selection) => void): MapButton {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `atlas-marker atlas-marker--${kind}`;
  const icon = document.createElement('span');
  icon.className = 'atlas-marker-icon';
  icon.setAttribute('aria-hidden', 'true');
  if (kind === 'fleet') {
    const ship = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ship.setAttribute('viewBox', '0 0 32 28');
    ship.setAttribute('focusable', 'false');
    for (const d of ['M4 21H28L23 26H9Z', 'M15 3V19H5Z', 'M17 6L26 19H17Z']) {
      const sail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      sail.setAttribute('d', d);
      ship.append(sail);
    }
    icon.append(ship);
  }
  const label = document.createElement('span');
  label.className = 'atlas-marker-label';
  button.append(icon, label);
  button.addEventListener('click', event => { event.stopPropagation(); onSelect({ kind, id }); });
  // Let Enter/Space activate the button rather than pan the underlying canvas.
  button.addEventListener('keydown', event => event.stopPropagation());
  return { button, label, marker: new Marker({ element: button, anchor: 'center', offset: kind === 'fleet' ? [0, -35] : [0, 0] }).setLngLat([0, 0]).addTo(instance) };
}

export const Atlas = memo(function Atlas({ state, active, reduced, onSelect, focus, preview }: { state: State; active: boolean; reduced: boolean; onSelect: (selection: Selection) => void; focus: { position: Position; serial: number } | null; preview: Fleet['route'] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const motion = useRef(reduced);
  motion.current = reduced;
  const latest = useRef(state);
  latest.current = state;
  const portMarkers = useRef(new Map<string, MapButton>());
  const fleetMarkers = useRef(new Map<string, MapButton>());
  const selectedTerritory = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [supply, setSupply] = useState(false);
  // API snapshots replace arrays on every tick. Compare only map-relevant small
  // records; never resend the large static geography or rebuild labels per tick.
  const geographyKey = JSON.stringify([state.territories.map(({ id, name, owner, occupier, administration }) => [id, name, owner, occupier, administration]), state.ports.map(({ id, name, position }) => [id, name, position]), state.links]);
  const fleetsKey = JSON.stringify(state.fleets.map(({ id, name, position, ships, route, port_id, kind }) => [id, name, position, ships, route, port_id, kind]));
  const selectionKey = state.selection ? `${state.selection.kind}:${state.selection.id}` : '';
  useEffect(() => {
    if (!container.current) return;
    let instance: LibreMap;
    try {
      instance = new MapLibre({ container: container.current, center: [17, 36], zoom: 3.6, minZoom: 1.4, maxZoom: 8, maxBounds: [[-20, -36], [150, 72]], renderWorldCopies: false, attributionControl: false, keyboard: false,
        style: { version: 8, sources: {
          land: { type: 'geojson', data: land as FeatureCollection },
          relief: { type: 'geojson', data: relief as FeatureCollection },
          waters: { type: 'geojson', data: waters as FeatureCollection },
          context: { type: 'geojson', data: context },
          territories: { type: 'geojson', data: empty, promoteId: 'id' },
          transport: { type: 'geojson', data: empty },
          fleets: { type: 'geojson', data: empty },
          routes: { type: 'geojson', data: empty },
          preview: { type: 'geojson', data: empty },
        }, layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': '#123347' } },
          { id: 'sea-shelf-outer', type: 'line', source: 'land', paint: { 'line-color': '#194456', 'line-width': 32, 'line-blur': 10 } },
          { id: 'sea-shelf-inner', type: 'line', source: 'land', paint: { 'line-color': '#285565', 'line-width': 12, 'line-blur': 3 } },
          { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#d5c39d' } },
          { id: 'historical-context', type: 'fill', source: 'context', paint: { 'fill-color': ['match', ['get', 'id'], 'roman-context', '#a36c64', 'parthian-context', '#8f9a79', '#b39867'], 'fill-opacity': 0.32 } },
          { id: 'context-frontiers', type: 'line', source: 'context', paint: { 'line-color': '#74694f', 'line-width': 1, 'line-opacity': 0.6, 'line-dasharray': [2, 4] } },
          { id: 'territories', type: 'fill', source: 'territories', paint: { 'fill-color': ['match', ['get', 'owner'], 'Rome', '#b16f65', 'Han successor authorities', '#b39460', '#93a080'], 'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.82, 0.55] } },
          { id: 'terrain-shade', type: 'fill', source: 'relief', paint: { 'fill-color': ['match', ['get', 'kind'], 'Desert', '#e2c798', 'Plateau', '#9b9875', '#7b816c'], 'fill-opacity': ['match', ['get', 'kind'], 'Desert', 0.34, 'Plateau', 0.2, 0.3] } },
          { id: 'terrain-contours', type: 'line', source: 'relief', filter: ['!=', ['get', 'kind'], 'Desert'], paint: { 'line-color': '#7c8065', 'line-width': 1.2, 'line-blur': 2, 'line-opacity': 0.35 } },
          { id: 'lakes', type: 'fill', source: 'waters', filter: ['==', ['get', 'kind'], 'lake'], paint: { 'fill-color': '#376477', 'fill-opacity': 0.85 } },
          { id: 'rivers', type: 'line', source: 'waters', filter: ['==', ['get', 'kind'], 'river'], paint: { 'line-color': '#567d80', 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 6, 1.3], 'line-opacity': 0.65 } },
          { id: 'boundaries', type: 'line', source: 'territories', paint: { 'line-color': '#79594a', 'line-width': 1.2, 'line-opacity': 0.8 } },
          { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': '#f0dfb6', 'line-width': 0.8, 'line-opacity': 0.8 } },
          { id: 'occupation', type: 'line', source: 'territories', filter: ['==', ['get', 'occupied'], true], paint: { 'line-color': '#71374b', 'line-width': 4, 'line-dasharray': [1, 2] } },
          { id: 'territory-selection', type: 'line', source: 'territories', paint: { 'line-color': '#fff1b6', 'line-width': 3, 'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0] } },
          { id: 'transport', type: 'line', source: 'transport', layout: { visibility: 'none' }, paint: { 'line-color': ['case', ['==', ['get', 'mode'], 'land'], '#624d36', '#8dc2cc'], 'line-width': 1.8, 'line-dasharray': [2, 3] } },
          { id: 'route-casing', type: 'line', source: 'routes', paint: { 'line-color': '#102b3a', 'line-width': 6, 'line-opacity': 0.8 } },
          { id: 'routes', type: 'line', source: 'routes', paint: { 'line-color': '#f1cc7b', 'line-width': 2.8, 'line-dasharray': [4, 2] } },
          { id: 'preview-casing', type: 'line', source: 'preview', paint: { 'line-color': '#123347', 'line-width': 6 } },
          { id: 'route-preview', type: 'line', source: 'preview', paint: { 'line-color': '#8be6ed', 'line-width': 3, 'line-dasharray': [1, 1.5] } },
          { id: 'fleet-position', type: 'circle', source: 'fleets', paint: { 'circle-color': '#f4d38b', 'circle-radius': 3, 'circle-stroke-color': '#173447', 'circle-stroke-width': 1.5 } },
        ] },
      });
    } catch (cause) { setError(`Atlas unavailable: ${cause instanceof Error ? cause.message : String(cause)}. All locations and fleets remain available in the lists.`); return; }
    map.current = instance;
    instance.fitBounds(mediterranean, { padding: 28, duration: 0 });
    instance.on('load', () => { addLabels(instance); setLoaded(true); });
    instance.getCanvas().addEventListener('keydown', event => {
      const duration = motion.current ? 0 : 220;
      if (event.key === '+' || event.key === '=') instance.zoomIn({ duration });
      else if (event.key === '-' || event.key === '_') instance.zoomOut({ duration });
      else if (event.key.startsWith('Arrow')) {
        const offset: [number, number] = event.key === 'ArrowLeft' ? [-100, 0] : event.key === 'ArrowRight' ? [100, 0] : event.key === 'ArrowUp' ? [0, -100] : [0, 100];
        instance.panBy(offset, { duration });
      } else return;
      event.preventDefault();
    });
    instance.on('error', event => setError(`Atlas rendering error: ${event.error.message}. Use the location and fleet lists.`));
    instance.on('click', event => {
      const hit = instance.queryRenderedFeatures(event.point, { layers: ['territories'] })[0];
      if (hit?.properties?.id) select.current({ kind: 'territory', id: hit.properties.id as string });
    });
    instance.on('mouseenter', 'territories', () => { instance.getCanvas().style.cursor = 'pointer'; });
    instance.on('mouseleave', 'territories', () => { instance.getCanvas().style.cursor = ''; });
    const updateZoom = () => container.current?.classList.toggle('atlas-wide', instance.getZoom() < 3);
    instance.on('zoomend', updateZoom);
    updateZoom();
    instance.on('moveend', () => {
      const bounds = instance.getBounds();
      for (const item of [...portMarkers.current.values(), ...fleetMarkers.current.values()]) {
        item.button.tabIndex = bounds.contains(item.marker.getLngLat()) ? 0 : -1;
      }
    });
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      for (const item of [...portMarkers.current.values(), ...fleetMarkers.current.values()]) item.marker.remove();
      portMarkers.current.clear(); fleetMarkers.current.clear();
      instance.remove(); map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!loaded || !map.current) return;
    const instance = map.current;
    const snapshot = latest.current;
    const territories = snapshot.territories.flatMap(item => {
      const geometry = territoryGeometry.get(item.id);
      return geometry ? [feature(geometry, { id: item.id, name: item.name, owner: item.owner, occupier: item.occupier, administration: item.administration, occupied: Boolean(item.occupier) })] : [];
    });
    (instance.getSource('territories') as GeoJSONSource).setData(collection(territories));
    (instance.getSource('transport') as GeoJSONSource).setData(collection(snapshot.links.map(item => feature({ type: 'LineString', coordinates: item.coordinates }, { mode: item.mode }))));
    const ids = new Set(snapshot.ports.map(item => item.id));
    for (const [id, item] of portMarkers.current) if (!ids.has(id)) { item.marker.remove(); portMarkers.current.delete(id); }
    for (const port of snapshot.ports) {
      let item = portMarkers.current.get(port.id);
      if (!item) { item = makeMarker(instance, 'port', port.id, value => select.current(value)); portMarkers.current.set(port.id, item); }
      item.marker.setLngLat(port.position);
      item.button.tabIndex = instance.getBounds().contains(port.position) ? 0 : -1;
      item.button.classList.toggle('atlas-marker--label-left', ['muziris', 'kedah', 'panyu'].includes(port.id));
      item.button.classList.toggle('atlas-marker--label-below', port.id === 'mantai');
      item.label.textContent = port.name.replace(' (approximate)', ' ≈').replace(' / southern China', '').replace('Portus / Rome', 'Portus · Rome');
      item.button.title = `Select port: ${port.name}`;
      item.button.setAttribute('aria-label', item.button.title);
    }
  }, [geographyKey, loaded]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    const instance = map.current;
    const snapshot = latest.current;
    (instance.getSource('fleets') as GeoJSONSource).setData(collection(snapshot.fleets.map(item => feature({ type: 'Point', coordinates: item.position }, { id: item.id }))));
    (instance.getSource('routes') as GeoJSONSource).setData(collection(snapshot.fleets.flatMap(item => item.route ? [feature({ type: 'LineString', coordinates: item.route.coordinates }, { id: item.id, destination: item.route.destination, arrival_day: item.route.arrival_day })] : [])));
    const ids = new Set(snapshot.fleets.map(item => item.id));
    for (const [id, item] of fleetMarkers.current) if (!ids.has(id)) { item.marker.remove(); fleetMarkers.current.delete(id); }
    const stacks = new Map<string, number>();
    for (const fleet of snapshot.fleets) {
      let item = fleetMarkers.current.get(fleet.id);
      if (!item) { item = makeMarker(instance, 'fleet', fleet.id, value => select.current(value)); fleetMarkers.current.set(fleet.id, item); }
      item.marker.setLngLat(fleet.position);
      const stackKey = fleet.port_id ?? fleet.position.join(',');
      const stack = stacks.get(stackKey) ?? 0;
      stacks.set(stackKey, stack + 1);
      item.marker.setOffset([stack * 46, -35]);
      item.button.tabIndex = instance.getBounds().contains(fleet.position) ? 0 : -1;
      item.label.textContent = fleet.name;
      item.button.classList.toggle('atlas-marker--advanced', fleet.kind === 'advanced');
      const destination = snapshot.ports.find(port => port.id === fleet.route?.destination);
      item.button.title = `${fleet.name} · ${fleet.ships} ships${fleet.route ? ` · to ${destination?.name ?? fleet.route.destination} · arrival day ${fleet.route.arrival_day.toFixed(1)}` : ' · in port'}`;
      item.button.setAttribute('aria-label', `Select fleet: ${item.button.title}`);
    }
  }, [fleetsKey, loaded]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    const selected = latest.current.selection;
    if (selectedTerritory.current) map.current.setFeatureState({ source: 'territories', id: selectedTerritory.current }, { selected: false });
    selectedTerritory.current = selected?.kind === 'territory' ? selected.id : null;
    if (selectedTerritory.current) map.current.setFeatureState({ source: 'territories', id: selectedTerritory.current }, { selected: true });
    for (const [kind, markers] of [['port', portMarkers.current], ['fleet', fleetMarkers.current]] as const) {
      for (const [id, item] of markers) {
        const active = selected?.kind === kind && selected.id === id;
        item.button.classList.toggle('is-selected', active);
        item.button.setAttribute('aria-pressed', String(active));
      }
    }
  }, [selectionKey, geographyKey, fleetsKey, loaded]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    (map.current.getSource('preview') as GeoJSONSource).setData(collection(preview ? [feature({ type: 'LineString', coordinates: preview.coordinates }, {})] : []));
  }, [preview, loaded]);
  useEffect(() => { if (loaded) map.current?.setLayoutProperty('transport', 'visibility', supply ? 'visible' : 'none'); }, [supply, loaded]);
  useEffect(() => { if (active) map.current?.resize(); }, [active]);
  useEffect(() => { if (focus && loaded) map.current?.easeTo({ center: focus.position, zoom: 4.8, duration: reduced ? 0 : 320 }); }, [focus, loaded, reduced]);

  const fleet = state.selection?.kind === 'fleet' ? state.fleets.find(item => item.id === state.selection!.id) : undefined;
  const territory = state.selection?.kind === 'territory' ? state.territories.find(item => item.id === state.selection!.id) : undefined;
  const port = state.selection?.kind === 'port' ? state.ports.find(item => item.id === state.selection!.id) : undefined;
  const destinationName = (id: string) => state.ports.find(item => item.id === id)?.name ?? id;
  const cameraPadding = window.innerWidth < 600 ? 22 : 38;
  return <div className="atlas-shell atlas-v2">
    <header className="atlas-topbar">
      <div><span className="eyebrow">Imperial atlas · AD {state.year}</span><h2>Rome & the eastern seas</h2></div>
      <div className="atlas-presets" aria-label="Map views"><button onClick={() => map.current?.fitBounds(mediterranean, { padding: cameraPadding, duration: reduced ? 0 : 320 })}>Mediterranean</button><button onClick={() => map.current?.fitBounds(corridor, { padding: cameraPadding, duration: reduced ? 0 : 320 })}>Asia corridor</button></div>
    </header>
    <div className="atlas-map-frame">
      <div className="atlas" ref={container} aria-label="Interactive atlas. Arrow keys pan; plus and minus zoom. Ports and fleet banners are keyboard buttons; all territories are also available in the location list." />
      <div className="atlas-navigation" aria-label="Map zoom"><button aria-label="Zoom in" onClick={() => map.current?.zoomIn({ duration: reduced ? 0 : 220 })}>+</button><button aria-label="Zoom out" onClick={() => map.current?.zoomOut({ duration: reduced ? 0 : 220 })}>−</button></div>
      <div className="atlas-compass" aria-hidden="true"><span>N</span><i /> <small>AD 210</small></div>
      <div className="atlas-map-tools"><button aria-pressed={supply} onClick={() => setSupply(!supply)}>Supply routes <span>{supply ? 'On' : 'Off'}</span></button></div>
      {error && <p className="map-error" role="alert">{error}</p>}
    </div>
    <div className="atlas-status">
      {preview ? <p className="atlas-route-preview" role="status"><b>Uncommitted preview</b><span>To {destinationName(preview.destination)} · arrival day {preview.arrival_day.toFixed(1)} · cyan dotted route</span></p>
        : fleet ? <p><b>{fleet.name}</b><span>{fleet.ships} ships · {fleet.route ? `To ${destinationName(fleet.route.destination)} · arrival day ${fleet.route.arrival_day.toFixed(1)} · ${Math.max(0, fleet.route.arrival_day - state.day).toFixed(1)} days remaining` : `At ${fleet.port_id ? destinationName(fleet.port_id) : 'sea'} · awaiting orders`}</span></p>
        : territory ? <p><b>{territory.name}</b><span>Owner: {territory.owner} · Occupier: {territory.occupier ?? 'none'} · Administration: {territory.administration}</span></p>
        : port ? <p><b>{port.name}</b><span>{port.sea === 'mediterranean' ? 'Mediterranean network' : 'Eastern seas network'} · select a fleet to plan a voyage</span></p>
        : <p><b>A sea of possibilities</b><span>Select a named port, fleet banner or shaded campaign region.</span></p>}
    </div>
    <footer className="atlas-legend">
      <div><span><i className="atlas-swatch atlas-swatch--region" />Campaign region</span><span><i className="atlas-swatch atlas-swatch--route" />Committed voyage</span><span><i className="atlas-swatch atlas-swatch--frontier" />Approximate context</span></div>
      <p>Coastlines: Natural Earth 50m · public domain. Shaped regions are illustrative; dotted AD 210 frontiers are context, not campaign ownership.</p>
    </footer>
  </div>;
});
