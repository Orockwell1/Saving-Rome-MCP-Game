import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
