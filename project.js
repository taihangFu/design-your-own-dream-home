export const COLORS = ['#F5F0E8', '#DCE8E5', '#E8D8C7', '#D9DDE8', '#262A2B', '#C27A61'];
export const furnitureCatalog = [
  { type: 'sofa', name: 'Cloud sofa', icon: '▰', w: 2.2, d: .85, h: .72, color: '#D9A78F' },
  { type: 'chair', name: 'Lounge chair', icon: '◒', w: .8, d: .8, h: .82, color: '#637B69' },
  { type: 'table', name: 'Oak table', icon: '●', w: 1.15, d: 1.15, h: .72, color: '#B07D52' },
  { type: 'bed', name: 'Soft bed', icon: '▭', w: 1.7, d: 2.1, h: .56, color: '#9BA7BB' },
  { type: 'plant', name: 'Olive tree', icon: '✦', w: .6, d: .6, h: 1.55, color: '#55745B' },
  { type: 'lamp', name: 'Floor lamp', icon: '♢', w: .38, d: .38, h: 1.65, color: '#D19B4B' }
];
export function createProject() {
  return {
    name: 'Sunday House', wallColor: '#F5F0E8', floorColor: '#D8C2A8',
    walls: [
      { id: 'w1', x1: 1, y1: 1, x2: 9, y2: 1 }, { id: 'w2', x1: 9, y1: 1, x2: 9, y2: 6.5 },
      { id: 'w3', x1: 9, y1: 6.5, x2: 1, y2: 6.5 }, { id: 'w4', x1: 1, y1: 6.5, x2: 1, y2: 1 }
    ],
    items: [
      { id: 'i1', type: 'sofa', x: 3, y: 2, w: 2.2, d: .85, h: .72, rotation: 0, color: '#D9A78F', name: 'Cloud sofa' },
      { id: 'i2', type: 'table', x: 4.2, y: 3.5, w: 1.15, d: 1.15, h: .72, rotation: 0, color: '#B07D52', name: 'Oak table' },
      { id: 'i3', type: 'plant', x: 7.9, y: 2, w: .6, d: .6, h: 1.55, rotation: 0, color: '#55745B', name: 'Olive tree' }
    ]
  };
}
export function addItem(project, catalogItem, position = { x: 5, y: 4 }) {
  return { ...project, items: [...project.items, { ...catalogItem, icon: undefined, id: `i${Date.now()}${Math.random().toString(16).slice(2)}`, ...position, rotation: 0 }] };
}
export function updateItem(project, id, patch) {
  return { ...project, items: project.items.map(item => item.id === id ? { ...item, ...patch } : item) };
}
export function removeItem(project, id) { return { ...project, items: project.items.filter(item => item.id !== id) }; }
