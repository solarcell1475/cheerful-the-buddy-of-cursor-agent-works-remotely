import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { getMaterial } from '../../structure/palette';
import { inWorldBounds, voxelKey, WORLD_MAX, WORLD_MIN, WORLD_MAX_Y } from '../../structure/types';
import type { MaterialId, Voxel } from '../../structure/types';
import type { StructureSceneProps } from './StructureSceneProps';

const BG = 0x0a0a0a;

type HostEl = HTMLElement & {
  _cheerfulCleanup?: () => void;
  _cheerfulCaptureViews?: () => Promise<{ name: string; dataUrl: string }[]>;
};

interface Orbit {
  theta: number;
  phi: number;
  radius: number;
  target: THREE.Vector3;
}

const REVIEW_POSES: Array<{ name: string; theta: number; phi: number }> = [
  { name: 'iso-ne', theta: Math.PI / 4, phi: Math.PI / 3.1 },
  { name: 'iso-nw', theta: (3 * Math.PI) / 4, phi: Math.PI / 3.1 },
  { name: 'iso-sw', theta: (5 * Math.PI) / 4, phi: Math.PI / 3.1 },
  { name: 'iso-se', theta: (7 * Math.PI) / 4, phi: Math.PI / 3.1 },
  { name: 'front', theta: Math.PI / 2, phi: Math.PI / 2.08 },
  { name: 'side', theta: 0, phi: Math.PI / 2.08 },
  { name: 'top', theta: Math.PI / 4, phi: 0.2 },
  { name: 'low', theta: Math.PI / 5, phi: 1.25 },
];

function applyOrbit(camera: THREE.PerspectiveCamera, orbit: Orbit) {
  const { theta, phi, radius, target } = orbit;
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.cos(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(target);
}

function voxelMeshesFrom(
  voxels: Voxel[],
  box: THREE.BoxGeometry
): { group: THREE.Group; lookup: Map<THREE.Object3D, Voxel[]> } {
  const group = new THREE.Group();
  const lookup = new Map<THREE.Object3D, Voxel[]>();
  const byMaterial = new Map<MaterialId, Voxel[]>();
  for (const voxel of voxels) {
    const list = byMaterial.get(voxel.material) ?? [];
    list.push(voxel);
    byMaterial.set(voxel.material, list);
  }

  const dummy = new THREE.Object3D();
  for (const [materialId, list] of byMaterial) {
    const spec = getMaterial(materialId);
    const transparent = (spec.opacity ?? 1) < 1;
    const material = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness ?? 0.55,
      metalness: spec.metalness ?? 0.05,
      transparent,
      opacity: spec.opacity ?? 1,
      depthWrite: !transparent,
    });
    const mesh = new THREE.InstancedMesh(box, material, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    list.forEach((voxel, i) => {
      dummy.position.set(voxel.x + 0.5, voxel.y + 0.5, voxel.z + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    lookup.set(mesh, list);
  }
  return { group, lookup };
}

export function StructureScene({
  voxels,
  tool,
  material,
  onPlace,
  onErase,
  captureRef,
}: StructureSceneProps) {
  const hostRef = useRef<View>(null);
  const voxelsRef = useRef(voxels);
  const toolRef = useRef(tool);
  const materialRef = useRef(material);
  const placeRef = useRef(onPlace);
  const eraseRef = useRef(onErase);

  voxelsRef.current = voxels;
  toolRef.current = tool;
  materialRef.current = material;
  placeRef.current = onPlace;
  eraseRef.current = onErase;

  const voxelSignature = useMemo(
    () =>
      voxels
        .map((v) => `${voxelKey(v.x, v.y, v.z)}:${v.material}`)
        .sort()
        .join('|'),
    [voxels]
  );

  const rebuildRef = useRef<(next: Voxel[]) => void>(() => {});

  const bindScene = useCallback((host: HostEl) => {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    host.innerHTML = '';
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 36, 78);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const orbit: Orbit = {
      theta: Math.PI / 4,
      phi: Math.PI / 3.15,
      radius: 22,
      target: new THREE.Vector3(0, 3.5, 0),
    };
    applyOrbit(camera, orbit);

    scene.add(new THREE.AmbientLight(0xb8c4d8, 0.55));
    const hemi = new THREE.HemisphereLight(0x9ecbff, 0x1a1520, 0.45);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
    sun.position.set(12, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    scene.add(sun);

    const groundGeo = new THREE.PlaneGeometry(WORLD_MAX - WORLD_MIN + 2, WORLD_MAX - WORLD_MIN + 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x12121c,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    const grid = new THREE.GridHelper(WORLD_MAX - WORLD_MIN + 1, WORLD_MAX - WORLD_MIN + 1, 0x3b82f6, 0x1e293b);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);

    const box = new THREE.BoxGeometry(1, 1, 1);
    let voxelGroup = new THREE.Group();
    let lookup = new Map<THREE.Object3D, Voxel[]>();
    scene.add(voxelGroup);

    const ghostMat = new THREE.MeshStandardMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const ghost = new THREE.Mesh(box, ghostMat);
    ghost.visible = false;
    scene.add(ghost);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const rebuild = (next: Voxel[]) => {
      scene.remove(voxelGroup);
      voxelGroup.traverse((obj) => {
        const mesh = obj as THREE.InstancedMesh;
        if (mesh.isInstancedMesh) {
          (mesh.material as THREE.Material).dispose();
        }
      });
      const built = voxelMeshesFrom(next, box);
      voxelGroup = built.group;
      lookup = built.lookup;
      scene.add(voxelGroup);
    };
    rebuildRef.current = rebuild;
    rebuild(voxelsRef.current);

    const occupiedSet = () =>
      new Set(voxelsRef.current.map((v) => voxelKey(v.x, v.y, v.z)));

    const hitCell = (
      clientX: number,
      clientY: number
    ): { x: number; y: number; z: number; occupied: boolean } | null => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const occupied = occupiedSet();
      const voxelHits = raycaster.intersectObjects(voxelGroup.children, false);
      if (voxelHits.length > 0) {
        const hit = voxelHits[0];
        const list = lookup.get(hit.object);
        const voxel = list && hit.instanceId != null ? list[hit.instanceId] : null;
        if (voxel) {
          if (toolRef.current === 'erase') {
            return { ...voxel, occupied: true };
          }
          const n = hit.face?.normal.clone() ?? new THREE.Vector3(0, 1, 0);
          n.transformDirection(hit.object.matrixWorld);
          const nx = Math.round(n.x);
          const ny = Math.round(n.y);
          const nz = Math.round(n.z);
          const x = voxel.x + nx;
          const y = voxel.y + ny;
          const z = voxel.z + nz;
          if (!inWorldBounds(x, y, z) || occupied.has(voxelKey(x, y, z))) {
            return null;
          }
          return { x, y, z, occupied: false };
        }
      }
      const groundHits = raycaster.intersectObject(ground);
      if (groundHits.length > 0) {
        const p = groundHits[0].point;
        const x = Math.floor(p.x);
        const z = Math.floor(p.z);
        if (toolRef.current === 'erase') {
          for (let y = WORLD_MAX_Y; y >= 0; y--) {
            if (occupied.has(voxelKey(x, y, z))) return { x, y, z, occupied: true };
          }
          return null;
        }
        let y = 0;
        while (occupied.has(voxelKey(x, y, z)) && y <= WORLD_MAX_Y) y += 1;
        if (!inWorldBounds(x, y, z)) return null;
        return { x, y, z, occupied: false };
      }
      return null;
    };

    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId: number | null = null;
    let pan = false;
    let pinchStart: number | null = null;
    const active = new Map<number, { x: number; y: number }>();

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const onPointerDown = (event: PointerEvent) => {
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (active.size === 2) {
        const pts = [...active.values()];
        pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        dragging = true;
        moved = true;
        return;
      }
      dragging = true;
      moved = false;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      pan = event.button === 1 || event.button === 2 || event.shiftKey;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (active.has(event.pointerId)) {
        active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (active.size === 2 && pinchStart) {
        const pts = [...active.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        orbit.radius = THREE.MathUtils.clamp(orbit.radius * (pinchStart / dist), 8, 48);
        pinchStart = dist;
        applyOrbit(camera, orbit);
        return;
      }
      if (dragging && pointerId === event.pointerId) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        lastX = event.clientX;
        lastY = event.clientY;
        if (pan) {
          const panSpeed = orbit.radius * 0.0018;
          const right = new THREE.Vector3();
          const up = new THREE.Vector3();
          camera.getWorldDirection(right);
          right.cross(camera.up).normalize();
          up.copy(camera.up).normalize();
          orbit.target.addScaledVector(right, -dx * panSpeed);
          orbit.target.addScaledVector(up, dy * panSpeed);
        } else {
          orbit.theta -= dx * 0.008;
          orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * 0.006, 0.18, Math.PI / 2.05);
        }
        applyOrbit(camera, orbit);
        return;
      }
      const cell = hitCell(event.clientX, event.clientY);
      if (!cell || (toolRef.current === 'place' && cell.occupied)) {
        ghost.visible = false;
        return;
      }
      const spec = getMaterial(materialRef.current);
      ghostMat.color.set(spec.color);
      ghost.position.set(cell.x + 0.5, cell.y + 0.5, cell.z + 0.5);
      ghost.visible = toolRef.current === 'place';
    };

    const onPointerUp = (event: PointerEvent) => {
      active.delete(event.pointerId);
      if (active.size < 2) pinchStart = null;
      if (pointerId !== event.pointerId) return;
      const wasMoved = moved;
      dragging = false;
      pointerId = null;
      if (!wasMoved && event.button === 0) {
        const cell = hitCell(event.clientX, event.clientY);
        if (cell) {
          if (toolRef.current === 'erase' || event.altKey) {
            eraseRef.current(cell.x, cell.y, cell.z);
          } else if (!cell.occupied) {
            placeRef.current(cell.x, cell.y, cell.z);
          }
        }
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      orbit.radius = THREE.MathUtils.clamp(orbit.radius + event.deltaY * 0.02, 8, 48);
      applyOrbit(camera, orbit);
    };

    const onContext = (event: Event) => event.preventDefault();

    const onLost = () => {
      dragging = false;
      pointerId = null;
      active.clear();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContext);
    canvas.addEventListener('lostpointercapture', onLost);

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      renderer.render(scene, camera);
    };
    tick();

    const cleanup = () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('lostpointercapture', onLost);
      box.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      ghostMat.dispose();
      renderer.dispose();
      host.innerHTML = '';
    };
    host._cheerfulCleanup = cleanup;
    host._cheerfulCaptureViews = async () => {
      const saved = {
        theta: orbit.theta,
        phi: orbit.phi,
        radius: orbit.radius,
      };
      const shots: Array<{ name: string; dataUrl: string }> = [];
      for (const pose of REVIEW_POSES) {
        orbit.theta = pose.theta;
        orbit.phi = pose.phi;
        applyOrbit(camera, orbit);
        renderer.render(scene, camera);
        shots.push({ name: pose.name, dataUrl: canvas.toDataURL('image/png') });
      }
      orbit.theta = saved.theta;
      orbit.phi = saved.phi;
      orbit.radius = saved.radius;
      applyOrbit(camera, orbit);
      renderer.render(scene, camera);
      return shots;
    };
    if (captureRef) {
      captureRef.current = () => host._cheerfulCaptureViews?.() ?? Promise.resolve([]);
    }
    return cleanup;
  }, []);

  useEffect(() => {
    const node = hostRef.current as unknown as HostEl | null;
    if (!node || typeof document === 'undefined') return undefined;
    const cleanup = bindScene(node);
    return () => {
      cleanup?.();
      node._cheerfulCleanup?.();
    };
  }, [bindScene]);

  useEffect(() => {
    rebuildRef.current(voxels);
  }, [voxelSignature, voxels]);

  return <View ref={hostRef} collapsable={false} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
