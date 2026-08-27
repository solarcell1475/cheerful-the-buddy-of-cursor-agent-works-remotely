import type { BuildTool, MaterialId, Voxel } from '../../structure/types';

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
}
