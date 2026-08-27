import type { Material, MaterialId } from './types';

export const MATERIALS: Material[] = [
  { id: 'blue', label: 'Signal', color: '#3B82F6', roughness: 0.35 },
  { id: 'purple', label: 'Server', color: '#A855F7', roughness: 0.4 },
  { id: 'gold', label: 'Agent', color: '#FBBF24', metalness: 0.45, roughness: 0.3 },
  { id: 'wood', label: 'Wood', color: '#B45309', roughness: 0.85 },
  { id: 'stone', label: 'Stone', color: '#64748B', roughness: 0.7 },
  { id: 'grass', label: 'Grass', color: '#22C55E', roughness: 0.8 },
  { id: 'white', label: 'Cloud', color: '#E2E8F0', roughness: 0.45 },
  { id: 'dark', label: 'Obsidian', color: '#1E293B', roughness: 0.25, metalness: 0.2 },
  { id: 'coral', label: 'Coral', color: '#F43F5E', roughness: 0.45 },
  {
    id: 'glass',
    label: 'Glass',
    color: '#38BDF8',
    opacity: 0.38,
    roughness: 0.05,
    metalness: 0.1,
  },
];

const BY_ID: Record<MaterialId, Material> = MATERIALS.reduce(
  (acc, mat) => {
    acc[mat.id] = mat;
    return acc;
  },
  {} as Record<MaterialId, Material>
);

export function getMaterial(id: MaterialId): Material {
  return BY_ID[id];
}

export function lightenHex(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const r = Math.min(255, parseInt(n.slice(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(n.slice(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(n.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function darkenHex(hex: string, amount: number): string {
  return lightenHex(hex, -amount);
}
