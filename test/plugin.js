import * as assert from 'assert';
import { EditorState, Change } from '../src/codemirror';
import { otPlugin } from '../src/index';

describe('ot plugin', () => {
  let emittedOps = [];
  const path = [];
  const emitOps = ops => (emittedOps = ops);

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
