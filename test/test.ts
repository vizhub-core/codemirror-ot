import * as assert from 'assert';
import { EditorState, Change, Transaction } from 'codemirror-6';
import * as json0 from 'ot-json0';
import { transactionToOps, opsToTransaction, Path } from '../src/index';

// Removes meta.time, which is the only thing that doesn't match.
const withoutTimestamp = (transaction: Transaction) => {
  // Hack around TypeScript's complaint that meta is private.
  const object = JSON.parse(JSON.stringify(transaction));
  delete object.meta.time;
  return object;
};

console.log(json0);


describe('codemirror-ot', () => {
  const path: Path = ['text'];
  let state = EditorState.create({ doc: 'hello' });

  describe('single character insertion', () => {
    const transaction = state.transaction.change(new Change(0, 0, ['d']));
    const ops = [{ p: path.concat([0]), si: 'd' }];

    it('transactionToOps', () => {
      assert.deepEqual(transactionToOps(path, transaction), ops); 
    });

    it('opsToTransaction', () => {
      assert.deepEqual(
        withoutTimestamp(opsToTransaction(path, state, ops)),
        withoutTimestamp(transaction)
      ); 
    });
  });
});
