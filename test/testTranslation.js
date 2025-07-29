import * as assert from 'assert';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import { verify } from './verify';

export const testTranslation = () => {
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
          textUnicode.insert(5, ' Beautiful '),
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
          textUnicode.insert(10, 'Peace'),
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
          textUnicode.remove(5, ' Beautiful '),
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
    describe('clear entire document', () => {
      verify({
        before: 'Hello World',
        after: '',
        changes: [{ from: 0, to: 11 }],
        opJSON0: [{ p: [0], sd: 'Hello World' }],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.remove(0, 'Hello World'),
        ),
      });
    });
    // TODO
    //describe.only('only character delete with CM6 change from interaction', () => {
    //  verify({
    //    before: 'd',
    //    after: '',
    //    changes: [[1]],
    //    opJSON0: [{ p: [0], sd: 'd' }],
    //    opJSON1: json1.editOp([], 'text-unicode', textUnicode.remove(0, 'd')),
    //  });
    //});
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
            textUnicode.insert(5, '-'),
          ),
        ),
        [{ es: [5, '-', { d: ' ' }] }],
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
            textUnicode.insert(5, '-'),
          ),
        ),
      });
    });
    describe('entire string replacement', () => {
      verify({
        before: 'Hello World',
        after: 'g',
        changes: [{ from: 0, to: 11, insert: 'g' }],
        opJSON0: [
          { sd: 'Hello World', p: [0] },
          { si: 'g', p: [0] },
        ],
        opJSON1: [{ es: ['g', { d: 'Hello World' }] }],
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
            textUnicode.insert(4, 'the\napple'),
          ),
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
    describe('clear entire document with path', () => {
      verify({
        path: ['files', 'README.md'],
        before: { files: { 'README.md': 'Hello World' } },
        after: { files: { 'README.md': '' } },
        changes: [{ from: 0, to: 11 }],
        opJSON0: [{ p: ['files', 'README.md', 0], sd: 'Hello World' }],
        opJSON1: ['files', 'README.md', { es: [{ d: 'Hello World' }] }],
      });
    });
  });

  describe('empty document operations', () => {
    describe('no-op on empty document', () => {
      verify({
        before: '',
        after: '',
        changes: [],
        opJSON0: [],
        opJSON1: null,
      });
    });
  });

  describe('multiple changes', () => {
    describe('multiple non-contiguous changes', () => {
      verify({
        before: 'Hello World Peace',
        after: 'Hi Earth Love',
        changes: [{ from: 1, to: 16, insert: 'i Earth Lov' }],
        opJSON0: [
          { p: [1], sd: 'ello World Peac' },
          { p: [1], si: 'i Earth Lov' },
        ],
        opJSON1: [{ es: [1, 'i Earth Lov', { d: 'ello World Peac' }] }],
      });
    });
  });

  describe('unicode and special characters', () => {
    describe('unicode emoji replacement', () => {
      verify({
        before: '🚀 Hello',
        after: '🚀 World',
        changes: [{ from: 3, to: 8, insert: 'World' }],
        opJSON0: [
          { p: [3], sd: 'Hello' },
          { p: [3], si: 'World' },
        ],
        opJSON1: json1.editOp(
          [],
          'text-unicode',
          textUnicode.type.compose(
            textUnicode.remove(2, 'Hello'),
            textUnicode.insert(2, 'World'),
          ),
        ),
      });
    });
    describe('unicode emoji insert', () => {
      verify({
        before: 'Hello World',
        after: 'Hello 🌍 World',
        changes: [{ from: 5, to: 5, insert: ' 🌍' }],
        opJSON0: [{ p: [5], si: ' 🌍' }],
        opJSON1: json1.editOp([], 'text-unicode', textUnicode.insert(5, ' 🌍')),
      });
    });
  });

  describe('real world', () => {
    describe('multiple edits to one file', () => {
      verify({
        path: ['files', '502492594', 'text'],
        before: {
          files: {
            502492594: {
              text: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Test Page</title>
  </head>
    <body></body>
</html>`,
            },
          },
        },
        after: {
          files: {
            502492594: {
              text: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Test Page</title>
  </head>
  <body></body>
</html>
`,
            },
          },
        },
        // opJSON0: [
        //   { sd: "DOCTYPE", p: ["files", "502492594", "text", 2] },
        //   { si: "doctype", p: ["files", "502492594", "text", 2] },
        //   { sd: "  ", p: ["files", "502492594", "text", 158] },
        //   { si: "\n", p: ["files", "502492594", "text", 181] },
        // ],
        opJSON0: [
          { sd: 'DOCTYPE', p: ['files', '502492594', 'text', 2] },
          { si: 'doctype', p: ['files', '502492594', 'text', 2] },
          { sd: '  ', p: ['files', '502492594', 'text', 158] },
          { si: '\n', p: ['files', '502492594', 'text', 181] },
        ],
        // opJSON1: [
        //   "files",
        //   "502492594",
        //   "text",
        //   { es: [2, "doctype", { d: "DOCTYPE" }, 149, { d: "  " }, 23, "\n"] },
        // ],

        opJSON1: [
          'files',
          '502492594',
          'text',
          { es: [2, 'doctype', { d: 'DOCTYPE' }, 149, { d: '  ' }, 23, '\n'] },
        ],

        // This one fails "applied changes should match expected text"
        // changes: [
        //   { from: 2, to: 9, insert: "doctype" },
        //   { from: 158, to: 160 },
        //   { from: 181, to: 181, insert: "\n" },
        // ], // from json0

        // This one passes "applied changes should match expected text"
        changes: [
          { from: 2, to: 9, insert: 'doctype' },
          { from: 158, to: 160 },
          { from: 183, to: 183, insert: '\n' },
        ], // from json1
      });
    });
  });
};

// TODO consider porting the y-codemirror tests into here.
// They do interesting things with randomness.
// They also cover the case of a CodeMirror change
// containing multiple changes, which these tests currently do not.
