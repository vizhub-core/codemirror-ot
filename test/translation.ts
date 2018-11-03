import * as assert from 'assert';
import { EditorState, Change, Transaction } from 'codemirror-6';
import { type as json0 } from 'ot-json0';
import { transactionToOps, opsToTransaction } from '../src/index';

// Removes meta.time, which is the only thing that doesn't match.
const withoutTimestamp = (transaction: Transaction) => {
  // Hack around TypeScript's complaint that meta is private.
  const object = JSON.parse(JSON.stringify(transaction));
  delete object.meta.time;
  return object;
};

const verify = ({ before, after, txn, ops }) => {
  const path = [];
  const state = EditorState.create({ doc: before });
  const transaction = txn(state.transaction);

  it('applied ops should match expected text', () => {
    assert.deepEqual(after, json0.apply(before, ops));
  });

  it('inverted applied ops should match expected text', () => {
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

describe('translation (transactionToOps and opsToTransaction)', () => {
  describe('string insert', () => {
    describe('single character insert from position 0', () => {
      verify({
        before: '',
        after:'d',
        txn: transaction => transaction.change(new Change(0, 0, ['d'])),
        ops: [{ p: [0], si: 'd' }]
      });
    });
    describe('single character insert mid-string', () => {
      verify({
        before: 'HelloWorld',
        after: 'Hello World',
        txn: transaction => transaction.change(new Change(5, 5, [' '])),
        ops: [{ p: [5], si: ' ' }]
      });
    });
    describe('multiple character insert mid-string', () => {
      verify({
        before: 'HelloWorld',
        after: 'Hello Beautiful World',
        txn: transaction => transaction.change(new Change(5, 5, [' Beautiful '])),
        ops: [{ p: [5], si: ' Beautiful ' }]
      });
    });
    describe('multiple character insert at last position', () => {
      verify({
        before: 'HelloWorld',
        after: 'HelloWorldPeace',
        txn: transaction => transaction.change(new Change(10, 10, ['Peace'])),
        ops: [{ p: [10], si: 'Peace' }]
      });
    });
  });
  describe('string delete', () => {
    describe('single character delete mid-string', () => {
      verify({
        before: 'Hello World',
        after: 'HelloWorld',
        txn: transaction => transaction.change(new Change(5, 6, [''])),
        ops: [{'p': [5], 'sd':' '}]
      });
    });
    describe('multiple character delete mid-string', () => {
      verify({
        before: 'Hello Beautiful World',
        after: 'HelloWorld',
        txn: transaction => transaction.change(new Change(5, 16, [''])),
        ops: [{ p: [5], sd: ' Beautiful ' }]
      });
    });
  });
  describe('string delete and insert (replacement)', () => {
    describe('single character replacement mid-string', () => {
      verify({
        before: 'Hello World',
        after: 'Hello-World',
        txn: transaction => transaction.change(new Change(5, 6, ['-'])),
        ops: [
          {'p': [5], 'sd': ' '},
          {'p': [5], 'si': '-'}
        ]
      });
    });
  });
  describe('multiple lines', () => {
    // string insert with multiple lines
    // string delete with multiple lines
    // string replace multiple lines
  });
});
