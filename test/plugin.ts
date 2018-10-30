import * as assert from 'assert';
import { EditorState, Change } from 'codemirror-6';
import { otPlugin, Path, Op } from '../src/index';

describe('ot plugin', () => {
  it('should emit ops', async () => {
    let emittedOps: Op[] = [];
    const path: Path = [];
    const emitOps = ops => emittedOps = ops;

    const state = EditorState.create({
      doc: 'HelloWorld',
      plugins: [otPlugin(path, emitOps)]
    });

    state.transaction.change(new Change(0, 0, ['d'])).apply();

    assert.deepEqual(emittedOps, [{ p: [0], si: 'd' }]);
  });
});
