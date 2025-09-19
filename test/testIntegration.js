import * as assert from 'assert';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import { EditorState, ChangeSet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { JSDOM } from 'jsdom';
import ShareDB from 'sharedb';
import { json1Sync, canOpAffectPath } from '../src/index';

ShareDB.types.register(json1.type);

// Gets a value at a path in a ShareDB Doc.
const getAtPath = (shareDBDoc, path) =>
  path.reduce((accumulator, key) => accumulator[key], shareDBDoc.data);

// Set up stuff in Node so that EditorView works.
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/test/test.node.cjs
const { window } = new JSDOM('');
['window', 'innerWidth', 'innerHeight', 'document', 'MutationObserver'].forEach(
  (name) => {
    global[name] = window[name];
  },
);

// Make these available where CodeMirror looks for them.
// See https://github.com/codemirror/view/blob/main/src/editorview.ts#L119
// this.win is used for requestAnimationFrame
global.window.requestAnimationFrame = (f) => setTimeout(f, 0);
// this.win is _not_ used for cancelAnimationFrame
global.cancelAnimationFrame = () => {};

// Creates a new CodeMirror EditorView with the json1Sync extension set up.
const createEditor = ({ shareDBDoc, path, additionalExtensions = [] }) => {
  const view = new EditorView({
    state: EditorState.create({
      doc: getAtPath(shareDBDoc, path),
      extensions: [
        json1Sync({ shareDBDoc, path, json1, textUnicode }),
        ...additionalExtensions,
      ],
    }),
  });
  return view;
};

export const testIntegration = () => {
  describe('Mocked ShareDB', () => {
    const setupTestEnvironment = (text) => {
      const environment = {};

      createEditor({
        shareDBDoc: {
          data: { content: { files: { 2432: { text } } } },
          submitOp: (op) => {
            environment.submittedOp = op;
          },
          on: (eventName, callback) => {
            if (eventName === 'op') {
              environment.receiveOp = callback;
            }
          },
        },
        path: ['content', 'files', '2432', 'text'],
        additionalExtensions: [
          ViewPlugin.fromClass(
            class {
              update(update) {
                if (update.docChanged) {
                  environment.changes = update.changes;
                }
              }
            },
          ),
        ],
      });

      return environment;
    };

    it('ShareDB --> CodeMirror', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp([
        'content',
        'files',
        '2432',
        'text',
        { es: [5, '-', { d: ' ' }] },
      ]);

      // Verify the remote op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 5, to: 6, insert: '-' }], text.length).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, multi-part ops', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp([
        ['content', 'files', '2432', 'text', { es: [5, '-', { d: ' ' }] }],
        ['isInteracting', { r: true }],
      ]);

      // Verify the remote op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 5, to: 6, insert: '-' }], text.length).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, multi-file multi-part op', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op that affects two files.
      environment.receiveOp([
        // This part of the op should be applied.
        ['content', 'files', '2432', 'text', { es: [5, '-', { d: ' ' }] }],
        // This part of the op should be ignored by this editor instance.
        ['content', 'files', 'other-file', 'text', { es: [0, 'Foo'] }],
      ]);

      // Verify the relevant op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 5, to: 6, insert: '-' }], text.length).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, null ops', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp(null);

      assert.equal(environment.changes, undefined);

      assert.equal(environment.submittedOp, undefined);
    });

    it('Clear entire document ShareDB --> CodeMirror', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op that clears the document
      environment.receiveOp([
        'content',
        'files',
        '2432',
        'text',
        { es: [{ d: 'Hello World' }] },
      ]);

      // Verify the document was cleared
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 0, to: 11 }], text.length).toJSON(),
      );

      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, replacement op', () => {
      const text = 'Hello World';
      const newText = 'New Text';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op that replaces the document.
      environment.receiveOp([
        'content',
        'files',
        '2432',
        'text',
        { r: text, i: newText },
      ]);

      // Verify the document was replaced.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of(
          [{ from: 0, to: text.length, insert: newText }],
          text.length,
        ).toJSON(),
      );

      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, deletion op', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op that deletes the document.
      environment.receiveOp(['content', 'files', '2432', 'text', { r: text }]);

      // Verify the document was cleared.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 0, to: text.length }], text.length).toJSON(),
      );

      assert.equal(environment.submittedOp, undefined);
    });

    it.skip('ShareDB --> CodeMirror, move op', () => {
      const text = 'Hello World';
      const environment = setupTestEnvironment(text);

      // Simulate ShareDB receiving a remote op that moves the document.
      environment.receiveOp(
        json1.moveOp(
          ['content', 'files', '2432', 'text'],
          ['content', 'files', '2432', 'newtext'],
        ),
      );

      // Verify the document was cleared from the old path.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 0, to: text.length }], text.length).toJSON(),
      );

      assert.equal(environment.submittedOp, undefined);
    });
  });

  describe('Real ShareDB', () => {
    // Create initial document then fire callback
    it('CodeMirror --> ShareDB', (done) => {
      const backend = new ShareDB();
      const connection = backend.connect();
      const shareDBDoc = connection.get('testCollection', 'testDocId');
      shareDBDoc.create(
        { content: { files: { 2432: { text: 'Hello World' } } } },
        json1.type.uri,
        () => {
          shareDBDoc.on('op', (op) => {
            assert.deepEqual(op, [
              'content',
              'files',
              '2432',
              'text',
              { es: [5, '-', { d: ' ' }] },
            ]);
            done();
          });

          shareDBDoc.subscribe(() => {
            const editor = createEditor({
              shareDBDoc,
              path: ['content', 'files', '2432', 'text'],
            });
            editor.dispatch({ changes: [{ from: 5, to: 6, insert: '-' }] });
          });
        },
      );
    });
    it('ShareDB --> CodeMirror', (done) => {
      const backend = new ShareDB();
      const connection = backend.connect();
      const shareDBDoc = connection.get('testCollection', 'testDocId');
      const text = 'Hello World';
      shareDBDoc.create(
        {
          content: {
            files: { 2432: { text }, otherFile: { text: 'HelloWorld' } },
          },
        },
        json1.type.uri,
        () => {
          shareDBDoc.subscribe(() => {
            createEditor({
              shareDBDoc,
              path: ['content', 'files', '2432', 'text'],
              additionalExtensions: [
                ViewPlugin.fromClass(
                  class {
                    update(update) {
                      // verify that the remote op was translated to a CodeMirror change
                      // and dispatched to the editor view.
                      assert.deepEqual(
                        update.changes.toJSON(),
                        ChangeSet.of(
                          [{ from: 5, to: 6, insert: '-' }],
                          text.length,
                        ).toJSON(),
                      );

                      done();
                    }
                  },
                ),
              ],
            });
            // Simulate ShareDB receiving a remote op.
            //console.log(shareDBDoc.data)
            shareDBDoc.submitOp([
              'content',
              'files',
              '2432',
              'text',
              { es: [5, '-', { d: '-' }] },
            ]);

            // TODO add test for ops coming in for an irrelevant path
            // (test the canOpAffectPath invocation).
          });
        },
      );
    });
  });
  describe('canOpAffectPath', () => {
    it('true', () => {
      const op = [
        'content',
        'files',
        '2432',
        'text',
        { es: [5, '-', { d: '-' }] },
      ];
      const path = ['content', 'files', '2432', 'text'];
      assert.deepEqual(canOpAffectPath(op, path), true);
    });

    it('false', () => {
      const op = [
        'content',
        'files',
        'other-file',
        'text',
        { es: [5, '-', { d: '-' }] },
      ];
      const path = ['content', 'files', '2432', 'text'];
      assert.deepEqual(canOpAffectPath(op, path), false);
    });

    it('null op case', () => {
      const op = null;
      const path = ['content', 'files', '2432', 'text'];
      assert.deepEqual(canOpAffectPath(op, path), false);
    });
  });
};
