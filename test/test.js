import * as assert from 'assert';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import { verify } from './verify';
import { EditorState, ChangeDesc } from '../src/codemirror';
import { json1Sync } from '../src/index';

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
      });
    });
    describe('multiple character delete mid-string', () => {
      verify({
        before: 'Hello Beautiful World',
        after: 'HelloWorld',
        changes: [{ from: 5, to: 16 }],
        opJSON0: [{ p: [5], sd: ' Beautiful ' }],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.remove(5, ' Beautiful ')
        ),
      });
    });
    describe('only character delete', () => {
      verify({
        before: 'd',
        after: '',
        changes: [{ from: 0, to: 1 }],
        opJSON0: [{ p: [0], sd: 'd' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.remove(0, 'd')),
      });
    });
  });
  describe('string replacement', () => {
    describe('single character replacement mid-string', () => {
      // Sanity check
      assert.deepEqual(
        json1.editOp(
          [],
          'text-unicode',
          textUnicode.type.compose(
            textUnicode.remove(5, ' '),
            textUnicode.insert(5, '-')
          )
        ),
        [{ es: [5, '-', { d: ' ' }] }]
      );

      verify({
        before: 'Hello World',
        after: 'Hello-World',
        changes: [{ from: 5, to: 6, insert: '-' }],
        // Note that the above changes are functionally equivalent to:
        //changes: [
        //  { from: 5, to: 6 },
        //  { from: 5, to: 5, insert: '-' },
        //],
        opJSON0: [
          { p: [5], sd: ' ' },
          { p: [5], si: '-' },
        ],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.type.compose(
            textUnicode.remove(5, ' '),
            textUnicode.insert(5, '-')
          )
        ),
      });
    });
  });
  describe('newlines', () => {
    describe('newline insert', () => {
      verify({
        before: '',
        after: '\n',
        changes: [{ from: 0, to: 0, insert: '\n' }],
        opJSON0: [{ p: [0], si: '\n' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.insert(0, '\n')),
        //before: '',
        //after: '\n',
        //txn: (transaction) => transaction.change(new ChangeDesc(0, 0, ['', ''])),
        //ops: [{ p: [0], si: '\n' }],
      });
    });
    describe('newline delete', () => {
      verify({
        before: '\n',
        after: '',
        changes: [{ from: 0, to: 1 }],
        opJSON0: [{ p: [0], sd: '\n' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.remove(0, '\n')),
      });
      //  before: '\n',
      //  after: '',
      //  txn: (transaction) => transaction.change(new ChangeDesc(0, 1, [''])),
      //  ops: [{ p: [0], sd: '\n' }],
    });
    describe('replace with newlines', () => {
      verify({
        before: 'eat\na\npie',
        after: 'eat\nthe\napple\npie',
        changes: [{ from: 4, to: 5, insert: 'the\napple' }],
        opJSON0: [
          { sd: 'a', p: [4] },
          { si: 'the\napple', p: [4] },
        ],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.type.compose(
            textUnicode.remove(4, 'a'),
            textUnicode.insert(4, 'the\napple')
          )
        ),
      });
    });
  });
  describe('paths', () => {
    describe('multiple character insert mid-string', () => {
      verify({
        path: ['title'],
        before: { title: 'HelloWorld' },
        after: { title: 'Hello Beautiful World' },
        opJSON0: [{ si: ' Beautiful ', p: ['title', 5] }],
        opJSON1: ['title', { es: [5, ' Beautiful '] }],
        changes: [{ from: 5, to: 5, insert: ' Beautiful ' }],
      });
    });
    describe('multiple character delete mid-string', () => {
      verify({
        path: ['title'],
        before: { title: 'Hello Beautiful World' },
        after: { title: 'HelloWorld' },
        opJSON0: [{ sd: ' Beautiful ', p: ['title', 5] }],
        opJSON1: ['title', { es: [5, { d: ' Beautiful ' }] }],
        changes: [{ from: 5, to: 16 }],
      });
    });
    describe('replace with newlines', () => {
      verify({
        path: ['title'],
        before: { title: 'eat\na\npie' },
        after: { title: 'eat\nthe\napple\npie' },
        opJSON0: [
          { sd: 'a', p: ['title', 4] },
          { si: 'the\napple', p: ['title', 4] },
        ],
        opJSON1: ['title', { es: [4, 'the\napple', { d: 'a' }] }],
        changes: [{ from: 4, to: 5, insert: 'the\napple' }],
      });
    });
    describe('deep paths', () => {
      verify({
        path: ['files', 'README.md'],
        before: { files: { 'README.md': 'HelloWorld' } },
        after: { files: { 'README.md': 'Hello Beautiful World' } },
        opJSON0: [{ si: ' Beautiful ', p: ['files', 'README.md', 5] }],
        opJSON1: ['files', 'README.md', { es: [5, ' Beautiful '] }],
        changes: [{ from: 5, to: 5, insert: ' Beautiful ' }],
      });
    });
  });
});
// TODO consider porting the y-codemirror tests into here.
// They do interesting things with randomness.
// They also cover the case of a CodeMirror change
// containing multiple changes

// TODO test this level
describe('ot CodeMirror Extension (json1Sync)', () => {
  const getAtPath = ({ shareDBDoc, path }) =>
    path.reduce((accumulator, key) => accumulator[key], shareDBDoc.data);

  const createCodeMirrorEditor = ({ shareDBDoc, path }) =>
    new EditorView({
      state: EditorState.create({
        doc: getAtPath({ shareDBDoc, path }),
        extensions: [json1Sync({ shareDBDoc, path })],
      }),
    });

  // TODO upgrade these ancient tests to the latest CodeMirror API
  //
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