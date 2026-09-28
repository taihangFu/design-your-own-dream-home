import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, addItem, updateItem, removeItem, furnitureCatalog } from './project.js';

test('starter project has a closed room and furniture', () => {
  const project = createProject();
  assert.equal(project.walls.length, 4);
  assert.equal(project.items.length, 3);
  assert.deepEqual([project.walls[0].x1, project.walls[0].y1], [1, 1]);
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
