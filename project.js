export const COLORS = ['#F5F0E8', '#DCE8E5', '#E8D8C7', '#D9DDE8', '#262A2B', '#C27A61'];
export const furnitureCatalog = [
  { type: 'sofa', name: 'Cloud sofa', icon: '▰', w: 2.2, d: .85, h: .72, color: '#D9A78F' },
  { type: 'chair', name: 'Lounge chair', icon: '◒', w: .8, d: .8, h: .82, color: '#637B69' },
  { type: 'table', name: 'Oak table', icon: '●', w: 1.15, d: 1.15, h: .72, color: '#B07D52' },
  { type: 'bed', name: 'Soft bed', icon: '▭', w: 1.7, d: 2.1, h: .56, color: '#9BA7BB' },
  { type: 'plant', name: 'Olive tree', icon: '✦', w: .6, d: .6, h: 1.55, color: '#55745B' },
  { type: 'lamp', name: 'Floor lamp', icon: '♢', w: .38, d: .38, h: 1.65, color: '#D19B4B' }
];
export const DEFAULT_WALL = Object.freeze({ thickness: .16, height: 2.7 });

export function createProject() {
  return {
    name: 'Sunday House', wallColor: '#F5F0E8', floorColor: '#D8C2A8',
    units: 'm', scale: 1,
    floorPlan: { imageKey: null, opacity: .42, x: 5, y: 3.75, rotation: 0, scale: .01, visible: true, calibration: null },
    walls: [
      { id: 'w1', x1: 1, y1: 1, x2: 9, y2: 1, ...DEFAULT_WALL }, { id: 'w2', x1: 9, y1: 1, x2: 9, y2: 6.5, ...DEFAULT_WALL },
      { id: 'w3', x1: 9, y1: 6.5, x2: 1, y2: 6.5, ...DEFAULT_WALL }, { id: 'w4', x1: 1, y1: 6.5, x2: 1, y2: 1, ...DEFAULT_WALL }
    ],
    items: [
      { id: 'i1', type: 'sofa', x: 3, y: 2, w: 2.2, d: .85, h: .72, rotation: 0, color: '#D9A78F', name: 'Cloud sofa' },
      { id: 'i2', type: 'table', x: 4.2, y: 3.5, w: 1.15, d: 1.15, h: .72, rotation: 0, color: '#B07D52', name: 'Oak table' },
      { id: 'i3', type: 'plant', x: 7.9, y: 2, w: .6, d: .6, h: 1.55, rotation: 0, color: '#55745B', name: 'Olive tree' }
    ]
  };
}

/** Upgrade saved projects without mutating the parsed legacy object. */
export function migrateProject(saved) {
  const fallback = createProject();
  if (!saved || typeof saved !== 'object') return fallback;
  return {
    ...fallback, ...saved,
    units: saved.units || 'm', scale: Number(saved.scale) || 1,
    walls: (Array.isArray(saved.walls) ? saved.walls : fallback.walls).map(w => ({ ...DEFAULT_WALL, ...w })),
    items: Array.isArray(saved.items) ? saved.items.map(i => ({ ...i })) : fallback.items,
    floorPlan: { ...fallback.floorPlan, ...(saved.floorPlan || {}), imageData: undefined }
  };
}

export function addWall(project, wall) {
  const id = wall.id || `w${Date.now()}${Math.random().toString(16).slice(2)}`;
  return { ...project, walls: [...project.walls, { ...DEFAULT_WALL, ...wall, id }] };
}
export function updateWall(project, id, patch) {
  return { ...project, walls: project.walls.map(w => w.id === id ? { ...w, ...patch } : w) };
}
export function removeWall(project, id) {
  return { ...project, walls: project.walls.filter(w => w.id !== id) };
}

export function wallBounds(walls) {
  if (!walls.length) return { minX: 0, minY: 0, maxX: 10, maxY: 8, width: 10, height: 8 };
  const xs = walls.flatMap(w => [w.x1 - w.thickness / 2, w.x1 + w.thickness / 2, w.x2 - w.thickness / 2, w.x2 + w.thickness / 2]);
  const ys = walls.flatMap(w => [w.y1 - w.thickness / 2, w.y1 + w.thickness / 2, w.y2 - w.thickness / 2, w.y2 + w.thickness / 2]);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Area of a connected wall loop (open/disconnected drawings intentionally report zero). */
export function roomArea(walls) {
  if (walls.length < 3) return 0;
  const remaining = walls.map(w => ({ ...w }));
  const first = remaining.shift(), points = [[first.x1, first.y1], [first.x2, first.y2]];
  while (remaining.length) {
    const [x, y] = points.at(-1);
    const index = remaining.findIndex(w => (w.x1 === x && w.y1 === y) || (w.x2 === x && w.y2 === y));
    if (index < 0) return 0;
    const w = remaining.splice(index, 1)[0];
    points.push(w.x1 === x && w.y1 === y ? [w.x2, w.y2] : [w.x1, w.y1]);
  }
  if (points.at(-1)[0] !== points[0][0] || points.at(-1)[1] !== points[0][1]) return 0;
  return Math.abs(points.slice(0, -1).reduce((sum, [x, y], i, a) => {
    const [nx, ny] = a[(i + 1) % a.length]; return sum + x * ny - nx * y;
  }, 0)) / 2;
}

export function calibrationScale(a, b, actualDistance) {
  const pixels = Math.hypot(b.x - a.x, b.y - a.y);
  if (!pixels || !Number.isFinite(actualDistance) || actualDistance <= 0) throw new Error('Enter a positive distance.');
  return actualDistance / pixels;
}
export function addItem(project, catalogItem, position = { x: 5, y: 4 }) {
  return { ...project, items: [...project.items, { ...catalogItem, icon: undefined, id: `i${Date.now()}${Math.random().toString(16).slice(2)}`, ...position, rotation: 0 }] };
}
export function updateItem(project, id, patch) {
  return { ...project, items: project.items.map(item => item.id === id ? { ...item, ...patch } : item) };
}
export function removeItem(project, id) { return { ...project, items: project.items.filter(item => item.id !== id) }; }
