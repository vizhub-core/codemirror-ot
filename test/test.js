import * as assert from 'assert';
import { EditorState, ChangeSet } from '../src/codemirror';
import json0 from 'ot-json0';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import otDiff from 'json0-ot-diff';
import jsondiff from 'json0-ot-diff';
import diffMatchPatch from 'diff-match-patch';
import {
  changesToOpJSON0,
  changesToOpJSON1,
  opToChangesJSON0,
  opToChangesJSON1,
} from '../src/index';

// Removes metadata, which is the only thing that doesn't match.
//const withoutTimestamp = (transaction) => {
//  delete transaction.metadata;
//  return transaction;
//};

const atPath = (obj, path) => path.reduce((d, key) => d[key], obj);
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const diffJSON0 = (a, b) => jsondiff(a, b, diffMatchPatch);
const diffJSON1 = (a, b) => jsondiff(a, b, diffMatchPatch, json1, textUnicode);

// Verifies that ops and transaction match in terms of behavior,
// and that the translation between ops and transaction holds in both directions.
const verify = (options) => {
  const { before, after, changes, opJSON0, opJSON1, path = [] } = options;

  it('JSON0 op should match computed diff', () => {
    assert.deepEqual(opJSON0, diffJSON0(before, after));
  });

  it('JSON1 op should match computed diff', () => {
    // console.log(JSON.stringify(opJSON1))
    // console.log(JSON.stringify(diffJSON1(before, after)));
    assert.deepEqual(opJSON1, diffJSON1(before, after));
  });

  it('JSON0 applied op should match expected text', () => {
    assert.deepEqual(after, json0.type.apply(clone(before), opJSON0));
  });

  it('JSON0 inverted applied op should match expected text', () => {
    assert.deepEqual(
      before,
      json0.type.apply(clone(after), json0.type.invert(opJSON0))
    );
  });

  it('JSON1 applied op should match expected text', () => {
    assert.deepEqual(after, json1.type.apply(clone(before), opJSON1));
  });

  it('JSON1 inverted applied op should match expected text', () => {
    const opJSON1Invertible = json1.type.makeInvertible(opJSON1, before);
    assert.deepEqual(
      before,
      json1.type.apply(clone(after), json1.type.invert(opJSON1Invertible))
    );
  });

  const state = EditorState.create({ doc: atPath(before, path) });

  it('applied transaction should match expected text', () => {
    const expected = atPath(after, path);
    const actual = state.update({ changes }).state.doc.sliceString(0);
    assert.equal(expected, actual);
  });

  const changeSet = ChangeSet.of(changes, before.length);

  it('changesToOpJSON0', () => {
    assert.deepEqual(changesToOpJSON0(path, changeSet, state.doc), opJSON0);
  });

  it('changesToOpJSON1', () => {
    assert.deepEqual(changesToOpJSON1(path, changeSet, state.doc), opJSON1);
  });

  it('opToChangesJSON0', () => {
    assert.deepEqual(opToChangesJSON0(opJSON0), changes);
  });

  it('opToChangesJSON1', () => {
    assert.deepEqual(opToChangesJSON1(opJSON1), changes);
  });
};

describe('translation (transactionToOps and opsToTransaction)', () => {
  describe('string insert', () => {
    describe('single character insert from position 0', () => {
      verify({
        before: '',
        after: 'd',
        changes: [{ from: 0, to: 0, insert: 'd' }],
        opJSON0: [{ p: [0], si: 'd' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.insert(0, 'd')),
      });
    });
    describe('single character insert mid-string', () => {
      verify({
        before: 'HelloWorld',
        after: 'Hello World',
        changes: [{ from: 5, to: 5, insert: ' ' }],
        opJSON0: [{ p: [5], si: ' ' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.insert(5, ' ')),
      });
    });
    describe('multiple character insert mid-string', () => {
      verify({
        before: 'HelloWorld',
        after: 'Hello Beautiful World',
        changes: [{ from: 5, to: 5, insert: ' Beautiful ' }],
        opJSON0: [{ p: [5], si: ' Beautiful ' }],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.insert(5, ' Beautiful ')
        ),
      });
    });
    describe('multiple character insert at last position', () => {
      verify({
        before: 'HelloWorld',
        after: 'HelloWorldPeace',
        changes: [{ from: 10, to: 10, insert: 'Peace' }],
        opJSON0: [{ p: [10], si: 'Peace' }],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.insert(10, 'Peace')
        ),
      });
    });
  });
  describe('string delete', () => {
    describe('single character delete mid-string', () => {
      verify({
        before: 'Hello World',
        after: 'HelloWorld',
        changes: [{ from: 5, to: 6 }],
        opJSON0: [{ p: [5], sd: ' ' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.remove(5, ' ')),
        txn: (transaction) => transaction.change(new ChangeDesc(5, 6, [''])),
      });
    });
    //describe('multiple character delete mid-string', () => {
    //  verify({
    //    before: 'Hello Beautiful World',
    //    after: 'HelloWorld',
    //    txn: (transaction) => transaction.change(new ChangeDesc(5, 16, [''])),
    //    ops: [{ p: [5], sd: ' Beautiful ' }],
    //  });
    //});
  });
  //describe('string delete and insert (replacement)', () => {
  //  describe('single character replacement mid-string', () => {
  //    verify({
  //      before: 'Hello World',
  //      after: 'Hello-World',
  //      txn: (transaction) => transaction.change(new ChangeDesc(5, 6, ['-'])),
  //      ops: [
  //        { p: [5], sd: ' ' },
  //        { p: [5], si: '-' },
  //      ],
  //      txnFromOps: (transaction) =>
  //        transaction
  //          .change(new ChangeDesc(5, 6, ['']))
  //          .change(new ChangeDesc(5, 5, ['-'])),
  //    });
  //  });
  //});
  //describe('newlines', () => {
  //  describe('newline insert', () => {
  //    verify({
  //      before: '',
  //      after: '\n',
  //      txn: (transaction) => transaction.change(new ChangeDesc(0, 0, ['', ''])),
  //      ops: [{ p: [0], si: '\n' }],
  //    });
  //  });
  //  describe('newline delete', () => {
  //    verify({
  //      before: '\n',
  //      after: '',
  //      txn: (transaction) => transaction.change(new ChangeDesc(0, 1, [''])),
  //      ops: [{ p: [0], sd: '\n' }],
  //    });
  //  });
  //  describe('replace with newlines', () => {
  //    verify({
  //      before: 'eat\na\npie',
  //      after: 'eat\nan\napple\npie',
  //      txn: (transaction) =>
  //        transaction.change(new ChangeDesc(4, 5, ['an', 'apple'])),
  //      ops: [
  //        { p: [4], sd: 'a' },
  //        { p: [4], si: 'an\napple' },
  //      ],
  //      txnFromOps: (transaction) =>
  //        transaction
  //          .change(new ChangeDesc(4, 5, ['']))
  //          .change(new ChangeDesc(4, 4, ['an', 'apple'])),
  //    });
  //  });
  //});
  //describe('paths', () => {
  //  describe('multiple character insert mid-string', () => {
  //    verify({
  //      path: ['title'],
  //      before: { title: 'HelloWorld' },
  //      after: { title: 'Hello Beautiful World' },
  //      txn: (transaction) =>
  //        transaction.change(new ChangeDesc(5, 5, [' Beautiful '])),
  //      ops: [{ p: ['title', 5], si: ' Beautiful ' }],
  //    });
  //  });
  //  describe('multiple character delete mid-string', () => {
  //    verify({
  //      path: ['title'],
  //      before: { title: 'Hello Beautiful World' },
  //      after: { title: 'HelloWorld' },
  //      txn: (transaction) => transaction.change(new ChangeDesc(5, 16, [''])),
  //      ops: [{ p: ['title', 5], sd: ' Beautiful ' }],
  //    });
  //  });
  //  describe('replace with newlines', () => {
  //    verify({
  //      path: ['title'],
  //      before: { title: 'eat\na\npie' },
  //      after: { title: 'eat\nan\napple\npie' },
  //      txn: (transaction) =>
  //        transaction.change(new ChangeDesc(4, 5, ['an', 'apple'])),
  //      ops: [
  //        { p: ['title', 4], sd: 'a' },
  //        { p: ['title', 4], si: 'an\napple' },
  //      ],
  //      txnFromOps: (transaction) =>
  //        transaction
  //          .change(new ChangeDesc(4, 5, ['']))
  //          .change(new ChangeDesc(4, 4, ['an', 'apple'])),
  //    });
  //  });
  //  describe('deep paths', () => {
  //    verify({
  //      path: ['files', 'README.md'],
  //      before: { files: { 'README.md': 'HelloWorld' } },
  //      after: { files: { 'README.md': 'Hello Beautiful World' } },
  //      txn: (transaction) =>
  //        transaction.change(new ChangeDesc(5, 5, [' Beautiful '])),
  //      ops: [{ p: ['files', 'README.md', 5], si: ' Beautiful ' }],
  //    });
  //  });
  //});
});
//import * as assert from 'assert';
//import { EditorState, ChangeDesc } from '../src/codemirror';
//import { ot } from '../src/index';
//
//describe('ot', () => {
//  //console.log('here');
//  //let emittedOps = [];
//  //const path = [];
//  //const emitOp = (ops) => (emittedOps = ops);
//
//  //const state = EditorState.create({
//  //  doc: 'HelloWorld',
//  //  extensions: [ot(path, emitOp)],
//  //});
//
//  //it('should emit ops', async () => {
//  //  state
//  //    .t()
//  //    .change(new ChangeDesc(0, 0, ['d']))
//  //    .apply();
//  //  assert.deepEqual(emittedOps, [{ p: [0], si: 'd' }]);
//  //});
//
//  //it('should not emit degenerate ops', async () => {
//  //  emittedOps = null;
//  //  state
//  //    .t()
//  //    .change(new ChangeDesc(0, 0, ['']))
//  //    .apply();
//  //  assert.equal(emittedOps, null);
//  //});
//});
