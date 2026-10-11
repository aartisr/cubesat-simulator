import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WORKSPACE, WORKSPACES, findWorkspace } from '../src/modules/workspaces';

test('workspace registry has unique ids and a valid default workspace', () => {
  const ids = WORKSPACES.map((workspace) => workspace.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(findWorkspace(DEFAULT_WORKSPACE).id, DEFAULT_WORKSPACE);
  assert.ok(WORKSPACES.some((workspace) => workspace.primary));

  for (const workspace of WORKSPACES) {
    assert.ok(workspace.label.length > 0);
    assert.ok(workspace.description.length > 0);
    assert.equal(typeof workspace.render, 'function');
  }
});
