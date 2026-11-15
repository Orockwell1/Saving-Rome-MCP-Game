import { memo } from 'react';
import type { IconRecipe } from './types';
const exports = import.meta.glob<string>('./assets/naval/*.png', { eager: true, query: '?url', import: 'default' });
const images = Object.fromEntries(Object.entries(exports).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]));
const paths: Record<string, string> = {
  faith: 'M12 6a6 6 0 1 0 0 12 6 6 0 1 0 0-12M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  law: 'M12 3v18M4 7h16M5 7l-3 7h6L5 7m14 0-3 7h6l-3-7M7 21h10',
  assembly: 'M3 9l9-6 9 6H3m2 3v7m7-7v7m7-7v7M2 22h20',
  learning: 'M12 6C9 3 5 3 2 5v15c4-2 7-2 10 0 3-2 6-2 10 0V5c-3-2-7-2-10 1v14',
  construction: 'M3 21h18M5 21V8h14v13M3 8l9-6 9 6M10 21v-7h4v7',
  diplomacy: 'M2 8l5-4 5 3 5-3 5 4-6 10-4 3-4-3L2 8m5-4 7 9-3 3-5-6',
  resources: 'M12 3l9 5v9l-9 5-9-5V8l9-5m-9 5 9 5 9-5m-9 5v9',
  transport: 'M3 16h18l-4 5H7l-4-5m9-13v13m0-12 7 9h-7m-2-6-5 6h5',
  generic: 'M12 2l9 5v10l-9 5-9-5V7l9-5m0 5v7m0 3v1',
};
export const Icon = memo(function Icon({ recipe, small = false }: { recipe: IconRecipe; small?: boolean }) {
  const image = images[recipe.base];
  const known = Boolean(image || paths[recipe.base]);
  const missing = recipe.fallback_label ?? (!known ? recipe.base : '');
  const label = missing ? `Generic fallback — unknown symbol: ${missing}` : recipe.base.replaceAll('-', ' ');
  return <span className={`recipe ${recipe.variant ?? 'navy'} ${small ? 'small' : ''}`} title={label}>
    {image ? <img src={image} alt={label} /> : <svg viewBox="0 0 24 24" role="img" aria-label={label}><path d={paths[recipe.base] ?? paths.generic} /><circle cx={4 + Math.abs(recipe.seed ?? 0) % 4} cy="3" r=".7" /></svg>}
    {recipe.badge && <span className="recipe-badge" title={`Badge: ${recipe.badge}`}><svg viewBox="0 0 24 24" role="img" aria-label={`${recipe.badge} badge`}><path d={paths[recipe.badge] ?? paths.generic} /></svg></span>}
    {missing && <span className="fallback-label">Fallback</span>}
  </span>;
});
