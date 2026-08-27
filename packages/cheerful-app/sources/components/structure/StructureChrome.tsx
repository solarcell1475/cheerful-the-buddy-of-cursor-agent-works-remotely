import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MATERIALS } from '../../structure/palette';
import { STRUCTURE_PRESETS } from '../../structure/presets';
import type { BuildTool, MaterialId } from '../../structure/types';

interface StructureChromeProps {
  tool: BuildTool;
  material: MaterialId;
  count: number;
  canUndo: boolean;
  canRedo: boolean;
  isTablet: boolean;
  nativeControls?: boolean;
  onTool: (tool: BuildTool) => void;
  onMaterial: (id: MaterialId) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onPreset: (id: string) => void;
  onExport: () => void;
  onRotate?: () => void;
  onMove?: (axis: 'x' | 'y' | 'z', delta: number) => void;
  onNudgePlace?: () => void;
}

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active?: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, color ? { borderColor: color } : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {color ? <View style={[styles.swatch, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StructureChrome({
  tool,
  material,
  count,
  canUndo,
  canRedo,
  isTablet,
  nativeControls,
  onTool,
  onMaterial,
  onUndo,
  onRedo,
  onClear,
  onPreset,
  onExport,
  onRotate,
  onMove,
  onNudgePlace,
}: StructureChromeProps) {
  return (
    <View style={[styles.bar, isTablet && styles.barTablet]}>
      <Text style={styles.hint}>
        {nativeControls
          ? 'Rotate the view, move the cursor, then place blocks in 3D.'
          : 'Drag to orbit · scroll to zoom · click a face or the grid to place'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip label="Place" active={tool === 'place'} onPress={() => onTool('place')} />
        <Chip label="Erase" active={tool === 'erase'} onPress={() => onTool('erase')} />
        <Chip label="Undo" active={false} onPress={onUndo} />
        <Chip label="Redo" active={false} onPress={onRedo} />
        <Chip label="Clear" onPress={onClear} />
        <Chip label="Export JSON" onPress={onExport} />
        {nativeControls && onRotate ? <Chip label="Rotate" onPress={onRotate} /> : null}
        <Text style={styles.count}>{count} blocks</Text>
      </ScrollView>
      {!canUndo && !canRedo ? null : (
        <Text style={styles.history}>
          {canUndo ? 'Undo ready' : 'Nothing to undo'}
          {canRedo ? ' · Redo ready' : ''}
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {STRUCTURE_PRESETS.map((preset) => (
          <Chip key={preset.id} label={preset.label} onPress={() => onPreset(preset.id)} />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MATERIALS.map((mat) => (
          <Chip
            key={mat.id}
            label={mat.label}
            color={mat.color}
            active={material === mat.id}
            onPress={() => onMaterial(mat.id)}
          />
        ))}
      </ScrollView>
      {nativeControls && onMove ? (
        <View style={styles.pad}>
          <View style={styles.padCol}>
            <Chip label="Z−" onPress={() => onMove('z', -1)} />
            <View style={styles.padMid}>
              <Chip label="X−" onPress={() => onMove('x', -1)} />
              <Chip label="X+" onPress={() => onMove('x', 1)} />
            </View>
            <Chip label="Z+" onPress={() => onMove('z', 1)} />
          </View>
          <View style={styles.padCol}>
            <Chip label="Up" onPress={() => onMove('y', 1)} />
            <Chip label="Down" onPress={() => onMove('y', -1)} />
            <Chip label="Build here" onPress={() => onNudgePlace?.()} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  barTablet: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hint: {
    color: '#64748B',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  chipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#172554',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  count: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 6,
  },
  history: {
    color: '#475569',
    fontSize: 11,
  },
  pad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  padCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  padMid: {
    flexDirection: 'row',
    gap: 8,
  },
});
