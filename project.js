export const COLORS = ['#F5F0E8', '#DCE8E5', '#E8D8C7', '#D9DDE8', '#262A2B', '#C27A61'];
export const furnitureCatalog = [
  { type: 'sofa', name: 'Cloud sofa', icon: '▰', w: 2.2, d: .85, h: .72, color: '#D9A78F' },
  { type: 'chair', name: 'Lounge chair', icon: '◒', w: .8, d: .8, h: .82, color: '#637B69' },
  { type: 'table', name: 'Oak table', icon: '●', w: 1.15, d: 1.15, h: .72, color: '#B07D52' },
  { type: 'bed', name: 'Soft bed', icon: '▭', w: 1.7, d: 2.1, h: .56, color: '#9BA7BB' },
  { type: 'plant', name: 'Olive tree', icon: '✦', w: .6, d: .6, h: 1.55, color: '#55745B' },
  { type: 'lamp', name: 'Floor lamp', icon: '♢', w: .38, d: .38, h: 1.65, color: '#D19B4B' }
];

const starterWalls = () => [
  { id: 'w1', x1: 1, y1: 1, x2: 9, y2: 1, thickness: .15, height: 2.7 },
  { id: 'w2', x1: 9, y1: 1, x2: 9, y2: 6.5, thickness: .15, height: 2.7 },
  { id: 'w3', x1: 9, y1: 6.5, x2: 1, y2: 6.5, thickness: .15, height: 2.7 },
  { id: 'w4', x1: 1, y1: 6.5, x2: 1, y2: 1, thickness: .15, height: 2.7 }
];

export function createProject() {
  return {
    version: 2, name: 'Sunday House', units: 'metric', wallColor: '#F5F0E8', floorColor: '#D8C2A8',
    floorPlan: null, walls: starterWalls(),
    items: [
      { id: 'i1', type: 'sofa', x: 3, y: 2, w: 2.2, d: .85, h: .72, rotation: 0, color: '#D9A78F', name: 'Cloud sofa' },
      { id: 'i2', type: 'table', x: 4.2, y: 3.5, w: 1.15, d: 1.15, h: .72, rotation: 0, color: '#B07D52', name: 'Oak table' },
      { id: 'i3', type: 'plant', x: 7.9, y: 2, w: .6, d: .6, h: 1.55, rotation: 0, color: '#55745B', name: 'Olive tree' }
    ]
  };
}
export function migrateProject(project) {
  if (!project || !Array.isArray(project.walls)) return createProject();
  return { ...createProject(), ...project, version: 2, floorPlan: project.floorPlan || null,
    walls: project.walls.map(w => ({ thickness: .15, height: 2.7, ...w })) };
}
export function addItem(project, catalogItem, position = { x: 5, y: 4 }) {
  return { ...project, items: [...project.items, { ...catalogItem, icon: undefined, id: crypto.randomUUID?.() || `i${Date.now()}`, ...position, rotation: 0 }] };
}
export function updateItem(project, id, patch) { return { ...project, items: project.items.map(item => item.id === id ? { ...item, ...patch } : item) }; }
export function removeItem(project, id) { return { ...project, items: project.items.filter(item => item.id !== id) }; }
export function addWall(project, points) { return { ...project, walls: [...project.walls, { id: crypto.randomUUID?.() || `w${Date.now()}`, thickness: .15, height: 2.7, ...points }] }; }
export function removeWall(project, id) { return { ...project, walls: project.walls.filter(wall => wall.id !== id) }; }
export function wallBounds(walls) {
  if (!walls.length) return { minX: 0, minY: 0, maxX: 10, maxY: 8, width: 10, height: 8 };
  const xs = walls.flatMap(w => [w.x1, w.x2]), ys = walls.flatMap(w => [w.y1, w.y2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
