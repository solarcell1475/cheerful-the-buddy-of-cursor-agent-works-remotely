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
import { STRUCTURE_PRESETS } from '../structure/presets';
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
          <Text style={styles.legendText}>Build voxel structures in perspective.</Text>
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
        onRotate={() => setYaw((y) => y + 90)}
        onMove={moveCursor}
        onNudgePlace={buildAtCursor}
      />
    </View>
  );
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
