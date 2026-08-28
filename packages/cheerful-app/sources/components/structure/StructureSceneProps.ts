import type { MutableRefObject } from 'react';
import type { BuildTool, MaterialId, Voxel } from '../../structure/types';

export type ReviewShot = { name: string; dataUrl: string };

export interface StructureSceneProps {
  voxels: Voxel[];
  tool: BuildTool;
  material: MaterialId;
  yaw: number;
  zoom: number;
  cursor: { x: number; y: number; z: number };
  onPlace: (x: number, y: number, z: number) => void;
  onErase: (x: number, y: number, z: number) => void;
  onCursorChange: (cursor: { x: number; y: number; z: number }) => void;
  captureRef?: MutableRefObject<null | (() => Promise<ReviewShot[]>)>;
}
