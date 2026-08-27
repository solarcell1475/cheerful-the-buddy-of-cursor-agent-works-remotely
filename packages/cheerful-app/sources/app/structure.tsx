import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { StructureChrome } from '../components/structure/StructureChrome';
import { StructureScene } from '../components/structure/StructureScene';
import { useLayout } from '../hooks/useLayout';
import { useVoxelWorld } from '../hooks/useVoxelWorld';
import { imageToVoxels } from '../structure/imageToVoxels';
import type { RasterImage } from '../structure/imageToVoxels';
import { STRUCTURE_PRESETS } from '../structure/presets';
import { downloadBytes, trianglesToBinaryStl, voxelsToTriangles } from '../structure/stl';
import { inWorldBounds, WORLD_MAX, WORLD_MIN, WORLD_MAX_Y } from '../structure/types';
import type { BuildTool, MaterialId } from '../structure/types';

export default function StructureScreen() {
  const layout = useLayout();
  const world = useVoxelWorld();
  const [tool, setTool] = useState<BuildTool>('place');
  const [material, setMaterial] = useState<MaterialId>('blue');
  const [yaw, setYaw] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, z: 0 });
  const nativeControls = Platform.OS !== 'web';

  const handlePlace = useCallback(
    (x: number, y: number, z: number) => {
      if (tool === 'erase') {
        world.erase(x, y, z);
        return;
      }
      world.place(x, y, z, material);
    },
    [material, tool, world]
  );

  const handlePreset = (id: string) => {
    const preset = STRUCTURE_PRESETS.find((p) => p.id === id);
    if (preset) world.load(preset.build());
  };

  const handleExport = async () => {
    const json = JSON.stringify(world.exported(), null, 2);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        Alert.alert('Exported', `${world.count} voxels copied as JSON.`);
        return;
      }
    } catch {
      // fall through
    }
    Alert.alert('Structure JSON', json.slice(0, 1200) + (json.length > 1200 ? '…' : ''));
  };

  const handleExportStl = () => {
    const tris = voxelsToTriangles(world.voxels, 1);
    if (tris.length === 0) {
      Alert.alert('Empty', 'Place some blocks or load a 2D drawing first.');
      return;
    }
    const bytes = trianglesToBinaryStl(tris, 'cheerful-structure');
    const ok = downloadBytes('cheerful-structure.stl', bytes, 'model/stl');
    if (ok) {
      Alert.alert('STL', `Saved cheerful-structure.stl (${tris.length} triangles).`);
      return;
    }
    Alert.alert('STL', `Generated ${tris.length} triangles. Open this lab on web to download the file.`);
  };

  const handleImportImage = () => {
    if (typeof document === 'undefined') {
      Alert.alert(
        '2D → 3D',
        'Pick a PNG/JPG on the web client, or use the 2D → 3D presets (drawing, face, heightmap, CAD bracket).'
      );
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raster = await rasterFromFile(file);
        const mode = file.name.toLowerCase().includes('height') ? 'heightmap' : 'extrude';
        const voxels = imageToVoxels(raster, { mode, thickness: 4, material });
        if (voxels.length === 0) {
          Alert.alert('2D → 3D', 'No dark pixels found. Try a high-contrast drawing.');
          return;
        }
        world.load(voxels);
        Alert.alert('2D → 3D', `Built ${voxels.length} voxels from ${file.name}. Export STL when ready.`);
      } catch (err) {
        Alert.alert('2D → 3D', err instanceof Error ? err.message : 'Could not read that image.');
      }
    };
    input.click();
  };

  const moveCursor = (axis: 'x' | 'y' | 'z', delta: number) => {
    setCursor((c) => {
      const next = { ...c, [axis]: c[axis] + delta };
      next.x = Math.max(WORLD_MIN, Math.min(WORLD_MAX, next.x));
      next.z = Math.max(WORLD_MIN, Math.min(WORLD_MAX, next.z));
      next.y = Math.max(0, Math.min(WORLD_MAX_Y, next.y));
      return next;
    });
  };

  const buildAtCursor = () => {
    if (!inWorldBounds(cursor.x, cursor.y, cursor.z)) return;
    if (tool === 'erase') world.erase(cursor.x, cursor.y, cursor.z);
    else world.place(cursor.x, cursor.y, cursor.z, material);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (event.shiftKey) world.redo();
        else world.undo();
      }
      if (event.key === 'y' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        world.redo();
      }
      if (event.key === 'x' && !event.metaKey && !event.ctrlKey) setTool('erase');
      if ((event.key === 'b' || event.key === 'v') && !event.metaKey && !event.ctrlKey) {
        setTool('place');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [world]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '3D Structure Lab',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: layout.isTablet ? 18 : 16,
          },
        }}
      />
      <View style={styles.sceneWrap}>
        <StructureScene
          voxels={world.voxels}
          tool={tool}
          material={material}
          yaw={yaw}
          zoom={layout.isTablet ? 1.15 : 1}
          cursor={cursor}
          onPlace={handlePlace}
          onErase={world.erase}
          onCursorChange={setCursor}
        />
        <View style={styles.legend} pointerEvents="none">
          <Text style={styles.legendTitle}>Cheerful 3D lab</Text>
          <Text style={styles.legendText}>2D image → 3D voxels → STL</Text>
        </View>
      </View>
      <StructureChrome
        tool={tool}
        material={material}
        count={world.count}
        canUndo={world.canUndo}
        canRedo={world.canRedo}
        isTablet={layout.isTablet}
        nativeControls={nativeControls}
        onTool={setTool}
        onMaterial={setMaterial}
        onUndo={world.undo}
        onRedo={world.redo}
        onClear={world.clear}
        onPreset={handlePreset}
        onExport={handleExport}
        onExportStl={handleExportStl}
        onImportImage={handleImportImage}
        onRotate={() => setYaw((y) => y + 90)}
        onMove={moveCursor}
        onNudgePlace={buildAtCursor}
      />
    </View>
  );
}

async function rasterFromFile(file: File): Promise<RasterImage> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const max = 96;
  const scale = Math.max(bitmap.width, bitmap.height) / max;
  canvas.width = Math.max(1, Math.round(bitmap.width / scale));
  canvas.height = Math.max(1, Math.round(bitmap.height / scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: imageData.width, height: imageData.height, data: imageData.data };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  sceneWrap: {
    flex: 1,
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  legendTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
});
