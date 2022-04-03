import * as assert from 'assert';
import { json1Sync } from '../src/index';
import { EditorState, ChangeSet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { JSDOM } from 'jsdom';

// Gets a value at a path in a ShareDB Doc.
const getAtPath = (shareDBDoc, path) =>
  path.reduce((accumulator, key) => accumulator[key], shareDBDoc.data);

// Creates a new CodeMirror EditorView with the json1Sync extension set up.
const createEditor = ({ shareDBDoc, path, additionalExtensions = [] }) =>
  new EditorView({
    state: EditorState.create({
      doc: getAtPath(shareDBDoc, path),
      extensions: [json1Sync({ shareDBDoc, path }), ...additionalExtensions],
    }),
  });

// Set up stuff in Node so that EditorView works.
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/test/test.node.cjs

const { window } = new JSDOM('');
['window', 'innerWidth', 'innerHeight', 'document', 'MutationObserver'].forEach(
  (name) => {
    global[name] = window[name];
  }
);

global.requestAnimationFrame = (f) => setTimeout(f, 0);
global.cancelAnimationFrame = () => {};

export const testIntegration = () => {
  describe('Mocked ShareDB', () => {
    it('CodeMirror --> ShareDB', () => {
      let submittedOp;
      const editor = createEditor({
        shareDBDoc: {
          data: { content: { files: { 2432: { text: 'Hello World' } } } },
          submitOp: (op) => {
            submittedOp = op;
          },
          on: () => {},
        },
        path: ['content', 'files', '2432', 'text'],
      });

      editor.dispatch({ changes: [{ from: 5, to: 6, insert: '-' }] });
      assert.deepEqual(submittedOp, [
        'content',
        'files',
        '2432',
        'text',
        { es: [5, '-', { d: '-' }] },
      ]);
    });
    it('ShareDB --> CodeMirror', () => {
      let receiveOp;
      let submittedOp;
      let changes;
      const text = 'Hello World';
      const editor = createEditor({
        shareDBDoc: {
          data: { content: { files: { 2432: { text } } } },

          // This handles ops submitted to ShareDB.
          // We want to test that this does _not_ trigger
          // for the case when our CodeMirror extension submits an op.
          // Otherwise there would be an infinite loop.
          submitOp: (op) => {
            submittedOp = op;
          },
          // Here we mock the ShareDB Doc.on method.
          // We can use `receiveOp` to simulate the ShareDB Doc
          // receiving a remote op.
          on: (eventName, callback) => {
            if (eventName === 'op') {
              receiveOp = callback;
            }
          },
        },
        path: ['content', 'files', '2432', 'text'],
        additionalExtensions: [
          ViewPlugin.fromClass(
            class {
              // Listen for changes to the CodeMirror editor view via this extension.
              // Possibly a simpler way?
              update(update) {
                changes = update.changes;
              }
            }
          ),
        ],
      });

      // Simulate ShareDB receiving a remote op.
      receiveOp([{ es: [5, '-', { d: '-' }] }]);

      // verify that the remote op was translated to a CodeMirror change
      // and dispatched to the editor view.
      assert.deepEqual(
        changes.toJSON(),
        ChangeSet.of([{ from: 5, to: 6, insert: '-' }], text.length).toJSON()
      );

      // Verify that our extension did _not_ submit the receiced ShareDB op
      // back into ShareDB.
      assert.equal(submittedOp, undefined);
    });
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
