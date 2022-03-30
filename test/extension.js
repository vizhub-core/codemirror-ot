import * as assert from 'assert';
import { EditorState, ChangeDesc } from '../src/codemirror';
import { ot } from '../src/index';

describe('ot', () => {
  console.log('here')
  //let emittedOps = [];
  //const path = [];
  //const emitOp = (ops) => (emittedOps = ops);

  //const state = EditorState.create({
  //  doc: 'HelloWorld',
  //  extensions: [ot(path, emitOp)],
  //});

  //it('should emit ops', async () => {
  //  state
  //    .t()
  //    .change(new ChangeDesc(0, 0, ['d']))
  //    .apply();
  //  assert.deepEqual(emittedOps, [{ p: [0], si: 'd' }]);
  //});

  //it('should not emit degenerate ops', async () => {
  //  emittedOps = null;
  //  state
  //    .t()
  //    .change(new ChangeDesc(0, 0, ['']))
  //    .apply();
  //  assert.equal(emittedOps, null);
  //});
});
