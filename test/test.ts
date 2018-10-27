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

const verify = ({ before, after, txn, ops }) => {
  const path: Path = [];
  const state = EditorState.create({ doc: before });
  const transaction = txn(state.transaction);

  it('applied ops should match expected text', () => {
    assert.deepEqual(after, json0.apply(before, ops));
  });

  it('inverted applied ops should match expected text', () => {
    //console.log(JSON.stringify(json0.invert(ops)));
    assert.deepEqual(before, json0.apply(after, json0.invert(ops)));
  });

  it('applied transaction should match expected text', () => {
    assert.deepEqual(after, transaction.doc.toString());
  });

  it('transactionToOps', () => {
    assert.deepEqual(transactionToOps(path, transaction), ops);
  });

  it('opsToTransaction', () => {
    assert.deepEqual(
      withoutTimestamp(opsToTransaction(path, state, ops)),
      withoutTimestamp(transaction)
    );
  });

};

describe('codemirror-ot', () => {
  //describe('single character insertion from position 0', () => {
  //  verify({
  //    before: '',
  //    after:'d',
  //    txn: transaction => transaction.change(new Change(0, 0, ['d'])),
  //    ops: [{ p: [0], si: 'd' }]
  //  });
  //});
  //describe('single character insertion mid-string', () => {
  //  verify({
  //    before: 'HelloWorld',
  //    after: 'Hello World',
  //    txn: transaction => transaction.change(new Change(5, 5, [' '])),
  //    ops: [{ p: [5], si: ' ' }]
  //  });
  //});
  describe('single character deletion mid-string', () => {
    verify({
      before: 'Hello World',
      after: 'HelloWorld',
      txn: transaction => transaction.change(new Change(5, 6, [''])),
      ops: [{'p': [5], 'sd':' '}]
    });
  });
});
