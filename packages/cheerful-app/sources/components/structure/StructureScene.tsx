import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { darkenHex, getMaterial, lightenHex } from '../../structure/palette';
import { inWorldBounds } from '../../structure/types';
import type { Voxel } from '../../structure/types';
import type { StructureSceneProps } from './StructureSceneProps';

const TILE = 26;
const SLICE = 15;

function yawRotate(
  x: number,
  z: number,
  yaw: number
): { x: number; z: number } {
  const quarter = ((Math.round(yaw / 90) % 4) + 4) % 4;
  switch (quarter) {
    case 1:
      return { x: z, z: -x };
    case 2:
      return { x: -x, z: -z };
    case 3:
      return { x: -z, z: x };
    default:
      return { x, z };
  }
}

function project(x: number, y: number, z: number, yaw: number, zoom: number) {
  const r = yawRotate(x, z, yaw);
  const size = TILE * zoom;
  const depth = SLICE * zoom;
  return {
    left: (r.x - r.z) * (size / 2),
    top: (r.x + r.z) * (size / 4) - y * depth,
    depth: r.x + r.z + y * 2,
    size,
    depthSize: depth,
  };
}

function IsoCube({
  voxel,
  yaw,
  zoom,
  highlight,
}: {
  voxel: Voxel;
  yaw: number;
  zoom: number;
  highlight?: boolean;
}) {
  const spec = getMaterial(voxel.material);
  const p = project(voxel.x, voxel.y, voxel.z, yaw, zoom);
  const w = p.size;
  const h = p.size * 0.5;
  const d = p.depthSize;
  const top = lightenHex(spec.color, 38);
  const left = darkenHex(spec.color, 28);
  const right = spec.color;
  const opacity = spec.opacity ?? 1;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: p.left,
        top: p.top,
        width: w,
        height: h + d,
        zIndex: Math.round(p.depth * 10),
        opacity,
      }}
    >
      <View
        style={[
          styles.top,
          {
            width: w,
            height: w,
            backgroundColor: top,
            borderColor: highlight ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
            transform: [{ translateY: d - w / 2 }, { scaleY: 0.5 }, { rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            width: w / 2,
            height: d,
            backgroundColor: left,
            top: h / 2 + (d - h) * 0.15,
            borderColor: highlight ? '#FFFFFF' : 'transparent',
          },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            width: w / 2,
            height: d,
            backgroundColor: right,
            left: w / 2,
            top: h / 2 + (d - h) * 0.15,
            borderColor: highlight ? '#FFFFFF' : 'transparent',
          },
        ]}
      />
    </View>
  );
}

export function StructureScene({
  voxels,
  tool,
  cursor,
  yaw,
  zoom,
  onPlace,
  onErase,
  onCursorChange,
}: StructureSceneProps) {
  const sorted = useMemo(() => {
    return [...voxels].sort((a, b) => {
      const pa = project(a.x, a.y, a.z, yaw, 1).depth;
      const pb = project(b.x, b.y, b.z, yaw, 1).depth;
      return pa - pb;
    });
  }, [voxels, yaw]);

  const occupied = useMemo(() => {
    const set = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
    return set;
  }, [voxels]);

  const ghost = cursor;

  const handlePress = (worldX: number, worldZ: number) => {
    const x = worldX;
    const z = worldZ;
    let y = 0;
    while (occupied.has(`${x},${y},${z}`) && y < 16) y += 1;
    if (tool === 'erase') {
      const top = y - 1;
      if (top >= 0) onErase(x, top, z);
      onCursorChange({ x, y: Math.max(0, top), z });
      return;
    }
    if (inWorldBounds(x, y, z)) {
      onPlace(x, y, z);
      onCursorChange({ x, y, z });
    }
  };

  const cells: Array<{ x: number; z: number }> = [];
  for (let x = -6; x <= 6; x++) {
    for (let z = -6; z <= 6; z++) cells.push({ x, z });
  }

  return (
    <View style={styles.host}>
      <View style={styles.stage}>
        {cells.map(({ x, z }) => {
          const p = project(x, 0, z, yaw, zoom);
          return (
            <Pressable
              key={`${x},${z}`}
              onPress={() => handlePress(x, z)}
              style={{
                position: 'absolute',
                left: p.left,
                top: p.top + p.depthSize * 0.35,
                width: p.size,
                height: p.size * 0.55,
                zIndex: 0,
              }}
            />
          );
        })}
        {sorted.map((voxel) => (
          <IsoCube
            key={`${voxel.x},${voxel.y},${voxel.z}`}
            voxel={voxel}
            yaw={yaw}
            zoom={zoom}
            highlight={
              voxel.x === cursor.x && voxel.y === cursor.y && voxel.z === cursor.z
            }
          />
        ))}
        {ghost && !occupied.has(`${ghost.x},${ghost.y},${ghost.z}`) ? (
          <IsoCube
            voxel={{ ...ghost, material: 'blue' }}
            yaw={yaw}
            zoom={zoom}
            highlight
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    position: 'absolute',
    left: 0,
    borderWidth: 1,
  },
  face: {
    position: 'absolute',
    borderWidth: 0.5,
  },
});
