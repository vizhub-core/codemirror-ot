import * as assert from 'assert';
import { EditorState, Change, Transaction } from 'codemirror-6';
import { type as json0 } from 'ot-json0';
import { transactionToOps, opsToTransaction, Path } from '../src/index';

// Removes meta.time, which is the only thing that doesn't match.
const withoutTimestamp = (transaction: Transaction) => {
  // Hack around TypeScript's complaint that meta is private.
  const object = JSON.parse(JSON.stringify(transaction));
  delete object.meta.time;
  return object;
};

const verify = ({ textBefore, textAfter, txn, ops }) => {
  const path: Path = [];
  const state = EditorState.create({ doc: textBefore });
  const transaction = txn(state.transaction);

  it('transactionToOps', () => {
    assert.deepEqual(transactionToOps(path, transaction), ops); 
  });

  it('opsToTransaction', () => {
    assert.deepEqual(
      withoutTimestamp(opsToTransaction(path, state, ops)),
      withoutTimestamp(transaction)
    ); 
  });

  it('applied ops should match expected text', () => {
    assert.deepEqual(textAfter, json0.apply(textBefore, ops));
  });

  it('inverted applied ops should match expected text', () => {
    assert.deepEqual(textBefore, json0.apply(textAfter, json0.invert(ops)));
  });

  it('applied transaction should match expected text', () => {
    assert.deepEqual(textAfter, transaction.doc.toString());
  });
};

describe('codemirror-ot', () => {
  describe('single character insertion', () => {
    verify({
      textBefore: '',
      textAfter:'d',
      txn: transaction => transaction.change(new Change(0, 0, ['d'])),
      ops: [{ p: [0], si: 'd' }]
    });
  });
});
