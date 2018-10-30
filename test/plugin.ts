import * as assert from 'assert';
import { EditorState } from 'codemirror-6';
import { otPlugin, Path, Op } from '../src/index';

describe('ot plugin', () => {
  it('should emit ops', async () => {
    let emittedOps: Op[] = [];
    const path: Path = [];
    const emitOps = ops => emittedOps = ops;
    const plugin = otPlugin(path, emitOps);

    const doc = 'HelloWorld';
    const plugins = [plugin];

    // This line currently fails with error 'ReferenceError: document is not defined'
    EditorState.create({ doc, plugins });

    assert.deepEqual(emittedOps, []);

    //plugin.spec.view(view);

    //const dispatchOps = await dispatchOpsPromise;

    //const expectedOps = [];//[{ p: [5], si: ' ' }];
    //assert.deepEqual(emittedOps, expectedOps);
    //dispatchOps(expectedOps);
  });
  //it('should dispatch ops', async () => {
    //let emittedOps = [];

    //const path = [];
    //const emitOps = ops => emittedOps = ops;
    //const { plugin, dispatchOpsPromise } = ot({ path, emitOps });

    //const doc = 'HelloWorld';
    //const plugins = [plugin];
    //const view = new EditorView(EditorState.create({ doc, plugins }))

    //plugin.spec.view(view);

    //const dispatchOps = await dispatchOpsPromise;

    //const expectedOps = [];//[{ p: [5], si: ' ' }];
    //assert.deepEqual(emittedOps, expectedOps);
    //dispatchOps(expectedOps);
    //
    //   after: 'Hello World',
    //   txn: transaction => transaction.change(new Change(5, 5, [' '])),
  //});
});
