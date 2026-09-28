import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProject, addItem, updateItem, removeItem, furnitureCatalog,
  addWall, updateWall, removeWall, migrateProject, calibrationScale, wallBounds, roomArea
} from './project.js';

test('starter project has a closed room and furniture', () => {
  const project = createProject();
  assert.equal(project.walls.length, 4);
  assert.equal(project.items.length, 3);
  assert.deepEqual([project.walls[0].x1, project.walls[0].y1], [1, 1]);
});
test('wall operations are immutable and preserve wall defaults', () => {
  const project = createProject();
  const added = addWall(project, { x1: 2, y1: 2, x2: 3, y2: 2 });
  assert.equal(project.walls.length, 4);
  assert.equal(added.walls.length, 5);
  assert.equal(added.walls.at(-1).height, 2.7);
  const id = added.walls.at(-1).id;
  const updated = updateWall(added, id, { thickness: .3, x2: 4 });
  assert.equal(added.walls.at(-1).thickness, .16);
  assert.equal(updated.walls.at(-1).thickness, .3);
  assert.equal(removeWall(updated, id).walls.length, 4);
});
test('calibration converts image pixels to metres', () => {
  assert.equal(calibrationScale({ x: 10, y: 20 }, { x: 310, y: 420 }, 5), .01);
  assert.throws(() => calibrationScale({ x: 1, y: 1 }, { x: 1, y: 1 }, 2));
});
test('legacy projects migrate wall dimensions and floor-plan settings', () => {
  const old = { name: 'Legacy', walls: [{ id: 'old', x1: 0, y1: 0, x2: 2, y2: 0 }], items: [] };
  const migrated = migrateProject(old);
  assert.equal(migrated.walls[0].thickness, .16);
  assert.equal(migrated.walls[0].height, 2.7);
  assert.equal(migrated.units, 'm');
  assert.equal(migrated.floorPlan.visible, true);
  assert.equal(old.walls[0].height, undefined);
});
test('wall bounds and connected room area follow wall geometry', () => {
  const project = createProject();
  const bounds = wallBounds(project.walls);
  assert.deepEqual([bounds.width, bounds.height], [8.16, 5.66]);
  assert.equal(roomArea(project.walls), 44);
  assert.equal(roomArea(project.walls.slice(0, 3)), 0);
});
test('furniture operations are immutable', () => {
  const project = createProject();
  const added = addItem(project, furnitureCatalog[1], { x: 4, y: 4 });
  assert.equal(project.items.length, 3);
  assert.equal(added.items.length, 4);
  const id = added.items.at(-1).id;
  const updated = updateItem(added, id, { rotation: 90 });
  assert.equal(updated.items.at(-1).rotation, 90);
  assert.equal(removeItem(updated, id).items.length, 3);
});
