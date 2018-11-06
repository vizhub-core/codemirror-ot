import * as assert from 'assert';
import { EditorState, Change } from 'codemirror-6-prerelease';
import { otPlugin, Path, Op } from '../src/index';

describe('ot plugin', () => {
  let emittedOps: Op[] = [];
  const path: Path = [];
  const emitOps = ops => emittedOps = ops;

  const state = EditorState.create({
    doc: 'HelloWorld',
    plugins: [otPlugin(path, emitOps)]
  });

  it('should emit ops', async () => {
    state.transaction.change(new Change(0, 0, ['d'])).apply();
    assert.deepEqual(emittedOps, [{ p: [0], si: 'd' }]);
  });

  it('should not emit degenerate ops', async () => {
    emittedOps = null;
    state.transaction.change(new Change(0, 0, [''])).apply();
    assert.equal(emittedOps, null);
  });
});
