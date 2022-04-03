import * as assert from 'assert';
import { json1Sync } from '../src/index';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { JSDOM } from 'jsdom';

// Gets a value at a path in a ShareDB Doc.
const getAtPath = (shareDBDoc, path) =>
  path.reduce((accumulator, key) => accumulator[key], shareDBDoc.data);

// Creates a new CodeMirror EditorView with the json1Sync extension set up.
const createEditor = ({ shareDBDoc, path }) =>
  new EditorView({
    state: EditorState.create({
      doc: getAtPath(shareDBDoc, path),
      extensions: [json1Sync({ shareDBDoc, path })],
    }),
  });

// Set up stuff in Node so that EditorView works.
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/test/test.node.cjs

const { window } = new JSDOM('');
[
  'window',
  'innerWidth',
  'innerHeight',
  'document',
  //'Node',
  //'navigator',
  //'Text',
  //'HTMLElement',
  'MutationObserver',
].forEach((name) => {
  global[name] = window[name];
});

global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.cancelAnimationFrame = () => {};

export const testIntegration = () => {
  describe('Mocked ShareDB Doc', () => {
    it('CodeMirror --> ShareDB', (done) => {
      const editor = createEditor({
        shareDBDoc: {
          data: { content: { files: { 2432: { text: 'Hello World' } } } },
          submitOp: (op) => {
            assert.deepEqual(op, [
              'content',
              'files',
              '2432',
              'text',
              { es: [5, '-', { d: '-' }] },
            ]);
            done();
          },
          on: () => {},
        },
        path: ['content', 'files', '2432', 'text'],
      });

      editor.dispatch({ changes: [{ from: 5, to: 6, insert: '-' }] });
    });
    // TODO it('ShareDB --> CodeMirror', (done) => {
    //  const editor = createEditor({
    //    shareDBDoc: {
    //      data: { content: { files: { 2432: { text: 'Hello World' } } } },
    //      submitOp: () => { },
    //      on: () => {},
    //    },
    //    path: ['content', 'files', '2432', 'text'],
    //  });
    //  editor.listen for the event?
    //});
  });

  // TODO test for degenerate ops
  //it('should not emit degenerate ops', async () => {
  //  emittedOps = null;
  //  state
  //    .t()
  //    .change(new ChangeDesc(0, 0, ['']))
  //    .apply();
  //  assert.equal(emittedOps, null);
  //});
};
