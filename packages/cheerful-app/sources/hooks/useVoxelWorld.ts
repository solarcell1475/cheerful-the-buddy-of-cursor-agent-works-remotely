import { useCallback, useMemo, useReducer } from 'react';
import { STRUCTURE_PRESETS } from '../structure/presets';
import type { MaterialId, Voxel } from '../structure/types';
import {
  blockCount,
  clearWorld,
  emptyWorld,
  eraseBlock,
  exportWorld,
  loadVoxels,
  placeBlock,
  redo,
  undo,
  voxelsFromWorld,
  worldFromVoxels,
  type VoxelWorldState,
} from '../structure/voxelWorld';

type Action =
  | { type: 'place'; x: number; y: number; z: number; material: MaterialId }
  | { type: 'erase'; x: number; y: number; z: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; voxels: Voxel[] }
  | { type: 'clear' };

function reducer(state: VoxelWorldState, action: Action): VoxelWorldState {
  switch (action.type) {
    case 'place':
      return placeBlock(state, action.x, action.y, action.z, action.material);
    case 'erase':
      return eraseBlock(state, action.x, action.y, action.z);
    case 'undo':
      return undo(state);
    case 'redo':
      return redo(state);
    case 'load':
      return loadVoxels(state, action.voxels);
    case 'clear':
      return clearWorld(state);
    default:
      return state;
  }
}

const initial = worldFromVoxels(STRUCTURE_PRESETS[0].build());

export function useVoxelWorld() {
  const [state, dispatch] = useReducer(reducer, emptyWorld(), () => initial);

  const voxels = useMemo(() => voxelsFromWorld(state), [state]);
  const count = blockCount(state);

  const place = useCallback(
    (x: number, y: number, z: number, material: MaterialId) => {
      dispatch({ type: 'place', x, y, z, material });
    },
    []
  );
  const erase = useCallback((x: number, y: number, z: number) => {
    dispatch({ type: 'erase', x, y, z });
  }, []);
  const undoLast = useCallback(() => dispatch({ type: 'undo' }), []);
  const redoLast = useCallback(() => dispatch({ type: 'redo' }), []);
  const load = useCallback((next: Voxel[]) => dispatch({ type: 'load', voxels: next }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const exported = useCallback(() => exportWorld(state), [state]);

  return {
    voxels,
    count,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    place,
    erase,
    undo: undoLast,
    redo: redoLast,
    load,
    clear,
    exported,
  };
}
