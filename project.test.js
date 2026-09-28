import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, migrateProject, addItem, updateItem, removeItem, addWall, removeWall, wallBounds, furnitureCatalog } from './project.js';

test('starter project has a closed room with dimensional walls', () => {
  const project = createProject();
  assert.equal(project.walls.length, 4);
  assert.equal(project.items.length, 3);
  assert.equal(project.walls[0].height, 2.7);
  assert.equal(project.walls[0].thickness, .15);
});
test('furniture operations are immutable', () => {
  const project = createProject();
  const added = addItem(project, furnitureCatalog[1], { x: 4, y: 4 });
  assert.equal(project.items.length, 3);
  assert.equal(added.items.length, 4);
  const id = added.items.at(-1).id;
  assert.equal(updateItem(added, id, { rotation: 90 }).items.at(-1).rotation, 90);
  assert.equal(removeItem(added, id).items.length, 3);
});
test('wall operations and bounds support traced floor plans', () => {
  const empty = { ...createProject(), walls: [] };
  const added = addWall(empty, { x1: 2, y1: 3, x2: 7, y2: 3 });
  assert.equal(added.walls.length, 1);
  assert.deepEqual(wallBounds(added.walls), { minX: 2, minY: 3, maxX: 7, maxY: 3, width: 5, height: 0 });
  assert.equal(removeWall(added, added.walls[0].id).walls.length, 0);
});
test('migrates legacy walls with dimensions and floor-plan defaults', () => {
  const legacy = { name: 'Legacy', walls: [{ id: 'old', x1: 0, y1: 0, x2: 2, y2: 0 }], items: [] };
  const migrated = migrateProject(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.floorPlan, null);
  assert.equal(migrated.walls[0].height, 2.7);
});
