import * as assert from 'assert';
import { EditorState, Change, Transaction } from '../src/codemirror';
import { type as json0 } from 'ot-json0';
import { transactionToOps, opsToTransaction } from '../src/index';

// Removes meta.time, which is the only thing that doesn't match.
const withoutTimestamp = transaction => {
  delete transaction.metadata;
  return transaction;
};

const atPath = (obj, path) => path.reduce((d, key) => d[key], obj);
const clone = obj => JSON.parse(JSON.stringify(obj));

// Verifies that ops and transaction match in terms of behavior,
// and that the translation between ops and transaction holds in both directions.
const verify = options => {
  const {
    before,
    after,
    txn,
    ops,
    txnFromOps = undefined,
    path = []
  } = options;

  it('applied ops should match expected text', () => {
    assert.deepEqual(after, json0.apply(clone(before), ops));
  });

  it('inverted applied ops should match expected text', () => {
    assert.deepEqual(before, json0.apply(clone(after), json0.invert(ops)));
  });

  const docBefore = atPath(before, path);
  const docAfter = atPath(after, path);

  const state = EditorState.create({
    doc: docBefore
  });

  const transaction = txn(state.t());
  const expectedTransaction = txnFromOps ? txnFromOps(state.t()) : transaction;

  it('applied transaction should match expected text', () => {
    assert.deepEqual(docAfter, transaction.doc.toString());
  });

  it('transactionToOps', () => {
    assert.deepEqual(transactionToOps(path, transaction), ops);
  });

  it('opsToTransaction', () => {
    assert.deepEqual(
      withoutTimestamp(opsToTransaction(path, state, ops)),
      withoutTimestamp(expectedTransaction)
    );
  });
};

describe('translation (transactionToOps and opsToTransaction)', () => {
  describe('string insert', () => {
    describe('single character insert from position 0', () => {
      verify({
        before: '',
        after: 'd',
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
        txn: transaction =>
          transaction.change(new Change(5, 5, [' Beautiful '])),
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
        ops: [{ p: [5], sd: ' ' }]
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
        ops: [{ p: [5], sd: ' ' }, { p: [5], si: '-' }],
        txnFromOps: transaction =>
          transaction
            .change(new Change(5, 6, ['']))
            .change(new Change(5, 5, ['-']))
      });
    });
  });
  describe('newlines', () => {
    describe('newline insert', () => {
      verify({
        before: '',
        after: '\n',
        txn: transaction => transaction.change(new Change(0, 0, ['', ''])),
        ops: [{ p: [0], si: '\n' }]
      });
    });
    describe('newline delete', () => {
      verify({
        before: '\n',
        after: '',
        txn: transaction => transaction.change(new Change(0, 1, [''])),
        ops: [{ p: [0], sd: '\n' }]
      });
    });
    describe('replace with newlines', () => {
      verify({
        before: 'eat\na\npie',
        after: 'eat\nan\napple\npie',
        txn: transaction =>
          transaction.change(new Change(4, 5, ['an', 'apple'])),
        ops: [{ p: [4], sd: 'a' }, { p: [4], si: 'an\napple' }],
        txnFromOps: transaction =>
          transaction
            .change(new Change(4, 5, ['']))
            .change(new Change(4, 4, ['an', 'apple']))
      });
    });
  });
  describe('paths', () => {
    describe('multiple character insert mid-string', () => {
      verify({
        path: ['title'],
        before: { title: 'HelloWorld' },
        after: { title: 'Hello Beautiful World' },
        txn: transaction =>
          transaction.change(new Change(5, 5, [' Beautiful '])),
        ops: [{ p: ['title', 5], si: ' Beautiful ' }]
      });
    });
    describe('multiple character delete mid-string', () => {
      verify({
        path: ['title'],
        before: { title: 'Hello Beautiful World' },
        after: { title: 'HelloWorld' },
        txn: transaction => transaction.change(new Change(5, 16, [''])),
        ops: [{ p: ['title', 5], sd: ' Beautiful ' }]
      });
    });
    describe('replace with newlines', () => {
      verify({
        path: ['title'],
        before: { title: 'eat\na\npie' },
        after: { title: 'eat\nan\napple\npie' },
        txn: transaction =>
          transaction.change(new Change(4, 5, ['an', 'apple'])),
        ops: [
          { p: ['title', 4], sd: 'a' },
          { p: ['title', 4], si: 'an\napple' }
        ],
        txnFromOps: transaction =>
          transaction
            .change(new Change(4, 5, ['']))
            .change(new Change(4, 4, ['an', 'apple']))
      });
    });
    describe('deep paths', () => {
      verify({
        path: ['files', 'README.md'],
        before: { files: { 'README.md': 'HelloWorld' } },
        after: { files: { 'README.md': 'Hello Beautiful World' } },
        txn: transaction =>
          transaction.change(new Change(5, 5, [' Beautiful '])),
        ops: [{ p: ['files', 'README.md', 5], si: ' Beautiful ' }]
      });
    });
  });
});
