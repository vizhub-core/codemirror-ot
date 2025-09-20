import * as assert from 'assert';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import { EditorState, ChangeSet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import ShareDB from 'sharedb';
import { json1Sync, canOpAffectPath, reconstructOp } from '../src/index';

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

    it('ShareDB --> CodeMirror, special multi-file op', () => {
      const fileId = '22133515';
      const otherFileId = '35721964';
      const text = 'a'.repeat(305);
      const otherText = 'b'.repeat(2000); // Just some text for the other file.

      const environment = {};

      createEditor({
        shareDBDoc: {
          data: {
            content: {
              files: {
                [fileId]: { text },
                [otherFileId]: { text: otherText },
              },
            },
          },
          submitOp: (op) => {
            environment.submittedOp = op;
          },
          on: (eventName, callback) => {
            if (eventName === 'op') {
              environment.receiveOp = callback;
            }
          },
        },
        path: ['content', 'files', fileId, 'text'],
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

      const op = [
        'files',
        [
          fileId,
          'text',
          {
            es: [304, '\n'],
          },
        ],
        [
          otherFileId,
          'text',
          {
            es: [
              104,
              {
                d: "import { asyncRequest } from './asyncRequest.js';\n",
              },
              566,
              '  setupConfigListener(state, setState);\n\n  loadConfig(configState, setConfig);\n\n  loadData(dataRequestState, configState, setDataRequest);\n\n  renderViz(container, dataRequestState, configState);\n};\n\nconst setupConfigListener = (state, setState) => {\n',
              237,
              '};\n\nconst loadConfig = (configState, setConfig) => {',
              {
                d: '\n  // Load config first if not already loaded',
              },
              193,
              '}\n};\n\nconst loadData = (\n  dataRequestState,\n  configState,\n  setDataRequest,\n) => {\n  if (configState && ',
              {
                d: '  return;\n  }\n\n  // After config is loaded, load the data\n  if (',
              },
              25,
              {
                d: 'return ',
              },
              84,
              {
                d: '  ',
              },
              6,
              '\n};\n\nconst renderViz = (\n  container,\n  dataRequestState,\n  configState,\n) => {\n  if (!configState) return;',
              44,
              ' || {}',
            ],
          },
        ],
      ];

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp(op);

      // Verify the remote op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of(
          [{ from: 304, to: 304, insert: '\n' }],
          text.length,
        ).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, special multi-file op with non-text part', () => {
      const fileId = '54471719';
      const otherFileId = 'f9197e16';
      const text = 'foo';

      const environment = {};

      createEditor({
        shareDBDoc: {
          data: {
            content: {
              files: {
                [fileId]: { text },
                // otherFileId does not exist yet, it will be created by the op.
              },
            },
          },
          submitOp: (op) => {
            environment.submittedOp = op;
          },
          on: (eventName, callback) => {
            if (eventName === 'op') {
              environment.receiveOp = callback;
            }
          },
        },
        path: ['content', 'files', fileId, 'text'],
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

      const op = [
        'files',
        [fileId, 'text', { es: ['bar', { d: 'foo' }] }],
        [
          otherFileId,
          { i: { name: 'stateManagement.js', text: '...content...' } },
        ],
      ];

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp(op);

      // Verify the remote op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of([{ from: 0, to: 3, insert: 'bar' }], text.length).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, special multi-file op with text part in middle', () => {
      const fileId = '20811705';
      const otherFileId1 = '0439f5df';
      const otherFileId2 = '59c003db';
      const text = 'a'.repeat(500);

      const environment = {};

      createEditor({
        shareDBDoc: {
          data: {
            content: {
              files: {
                [fileId]: { text },
                // otherFileIds do not exist yet, they will be created by the op.
              },
            },
          },
          submitOp: (op) => {
            environment.submittedOp = op;
          },
          on: (eventName, callback) => {
            if (eventName === 'op') {
              environment.receiveOp = callback;
            }
          },
        },
        path: ['content', 'files', fileId, 'text'],
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

      const op = [
        'files',
        [
          otherFileId1,
          { i: { name: 'handlePostMessage.js', text: '...content...' } },
        ],
        [fileId, 'text', { es: [376, 'foo'] }],
        [otherFileId2, { i: { name: 'loadConfig.js', text: '...content...' } }],
      ];

      // Simulate ShareDB receiving a remote op.
      environment.receiveOp(op);

      // Verify the remote op was translated to a CodeMirror change and dispatched to the editor view.
      assert.deepEqual(
        environment.changes.toJSON(),
        ChangeSet.of(
          [{ from: 376, to: 376, insert: 'foo' }],
          text.length,
        ).toJSON(),
      );

      // Verify that the extension did _not_ submit the received ShareDB op back into ShareDB.
      assert.equal(environment.submittedOp, undefined);
    });

    it('ShareDB --> CodeMirror, special multi-file op with multiple text parts', () => {
      const fileId1 = '85930950';
      const fileId2 = '88903244';
      const otherFileId1 = '591958d5';
      const otherFileId2 = 'de0dfe9e';

      const text1 = 'a'.repeat(1000);
      const text2 = 'b'.repeat(300);

      const environment1 = {};
      const environment2 = {};

      const listeners = [];
      const shareDBDoc = {
        data: {
          content: {
            files: {
              [fileId1]: { text: text1 },
              [fileId2]: { text: text2 },
            },
          },
        },
        submitOp: (op) => {
          // This test does not cover submitting ops.
        },
        on: (eventName, callback) => {
          if (eventName === 'op') {
            listeners.push(callback);
          }
        },
      };

      // Create an editor for the first file.
      createEditor({
        shareDBDoc,
        path: ['content', 'files', fileId1, 'text'],
        additionalExtensions: [
          ViewPlugin.fromClass(
            class {
              update(update) {
                if (update.docChanged) {
                  environment1.changes = update.changes;
                }
              }
            },
          ),
        ],
      });

      // Create an editor for the second file.
      createEditor({
        shareDBDoc,
        path: ['content', 'files', fileId2, 'text'],
        additionalExtensions: [
          ViewPlugin.fromClass(
            class {
              update(update) {
                if (update.docChanged) {
                  environment2.changes = update.changes;
                }
              }
            },
          ),
        ],
      });

      const op = [
        'files',
        [
          otherFileId1,
          { i: { name: 'createStateFields.js', text: '...content...' } },
        ],
        [fileId1, 'text', { es: [426, 'foo'] }],
        [fileId2, 'text', { es: [208, '\n'] }],
        [
          otherFileId2,
          { i: { name: 'checkAndLoadData.js', text: '...content...' } },
        ],
      ];

      // Simulate ShareDB broadcasting the op to all listeners.
      listeners.forEach((listener) => listener(op));

      // Verify the remote op was translated to a CodeMirror change and dispatched to the first editor view.
      assert.deepEqual(
        environment1.changes.toJSON(),
        ChangeSet.of(
          [{ from: 426, to: 426, insert: 'foo' }],
          text1.length,
        ).toJSON(),
      );

      // Verify the remote op was translated to a CodeMirror change and dispatched to the second editor view.
      assert.deepEqual(
        environment2.changes.toJSON(),
        ChangeSet.of(
          [{ from: 208, to: 208, insert: '\n' }],
          text2.length,
        ).toJSON(),
      );
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

    it('ShareDB --> CodeMirror, complex real world case from user report', () => {
      const fileId = '06629612';
      const before = `import { createStateField } from 'd3-rosetta';
import { setupSVG } from './setupSVG.js';
import { renderLoadingState } from './renderLoadingState.js';
import { asyncRequest } from './asyncRequest.js';
import { loadAndParseData } from './loadAndParseData.js';
import { scatterPlot } from './scatterPlot.js';
import { measureDimensions } from './measureDimensions.js';
import { json } from 'd3';

export const viz = (container, state, setState) => {
  const stateField = createStateField(state, setState);
  const [dataRequest, setDataRequest] =
    stateField('dataRequest');
  const [config, setConfig] = stateField('config');

  // Set up postMessage event listener if not already set
  if (!state.eventListenerAttached) {
    window.addEventListener('message', (event) => {
      if (event.data && typeof event.data === 'object') {
        setState((state) => ({
          ...state,
          config: {
            ...state.config,
            ...event.data,
          },
        }));
      }
    });

    setState((prevState) => ({
      ...prevState,
      eventListenerAttached: true,
    }));
  }

  // Load config first if not already loaded
  if (!config) {
    json('config.json')
      .then((loadedConfig) => {
        setConfig(loadedConfig);
      })
      .catch((error) => {
        console.error('Failed to load config:', error);
      });
    return;
  }

  // After config is loaded, load the data
  if (!dataRequest) {
    return asyncRequest(setDataRequest, () =>
      loadAndParseData(config.dataUrl),
    );
  }

  const { data, error } = dataRequest;
  const dimensions = measureDimensions(container);
  const svg = setupSVG(container, dimensions);

  renderLoadingState(svg, {
    shouldShow: !data,
    text: error
      ? \`Error: \${error.message}\`
      : config.loadingMessage,
    x: dimensions.width / 2,
    y: dimensions.height / 2,
    fontSize: config.loadingFontSize,
    fontFamily: config.loadingFontFamily,
  });

  if (data) {
    // Safely transform config properties to accessor functions
    const configWithAccessors = {
      ...config,
      xValue: config.xValue
        ? (d) => d[config.xValue]
        : () => 0,
      yValue: config.yValue
        ? (d) => d[config.yValue]
        : () => 0,
      sizeValue: config.sizeValue
        ? (d) => d[config.sizeValue]
        : null,
      pointRadiusValue: config.pointRadiusValue
        ? (d) => d[config.pointRadiusValue]
        : null,
    };

    scatterPlot(svg, {
      ...configWithAccessors,
      data,
      dimensions,
    });
  }
};`;
      const after = `import { setupSVG } from './setupSVG.js';
import { asyncRequest } from './asyncRequest.js';
import { loadAndParseData } from './loadAndParseData.js';
import { measureDimensions } from './measureDimensions.js';
import {
  initializeVizState,
  loadConfig,
} from './vizState.js';
import { setupMessageHandler } from './vizHandlers.js';
import { renderVisualization } from './renderViz.js';

export const viz = (container, state, setState) => {
  const { dataRequest, setDataRequest, config, setConfig } =
    initializeVizState(state, setState);

  // Set up postMessage event listener if not already set
  if (!state.eventListenerAttached) {
    setupMessageHandler(setState);
  }

  // Load config first if not already loaded
  if (!config) {
    loadConfig(setConfig);
    return;
  }

  // After config is loaded, load the data
  if (!dataRequest) {
    return asyncRequest(setDataRequest, () =>
      loadAndParseData(config.dataUrl),
    );
  }

  const { data, error } = dataRequest;
  const dimensions = measureDimensions(container);
  const svg = setupSVG(container, dimensions);

  renderVisualization(svg, data, error, config, dimensions);
};`;

      const op = [
        'files',
        [
          fileId,
          'text',
          {
            es: [
              9,
              "setupSVG } from './setupSVG",
              {
                d: "createStateField } from 'd3-rosetta';\nimport { setupSVG } from './setupSVG.js';\nimport { renderLoadingState } from './renderLoadingState",
              },
              114,
              {
                d: "import { scatterPlot } from './scatterPlot.js';\n",
              },
              68,
              "\n  initializeVizState,\n  loadConfig,\n} from './vizState.js';\nimport { setupMessageHandler } from './vizHandlers.js';\nimport { renderVisualization } from './renderViz.js';\n\nexport const viz = (container, state, setState) => {\n  const { dataRequest, setDataRequest, config, setConfig } =\n    initializeVizState(state, setState);\n\n  // Set up postMessage event listener if not already set\n  if (!state.eventListenerAttached) {\n    setupMessageHandler(setState",
              {
                d: " json } from 'd3';\n\nexport const viz = (container, state, setState) => {\n  const stateField = createStateField(state, setState);\n  const [dataRequest, setDataRequest] =\n    stateField('dataRequest');\n  const [config, setConfig] = stateField('config');\n\n  // Set up postMessage event listener if not already set\n  if (!state.eventListenerAttached) {\n    window.addEventListener('message', (event) => {\n      if (event.data && typeof event.data === 'object') {\n        setState((state) => ({\n          ...state,\n          config: {\n            ...state.config,\n            ...event.data,\n          },\n        }));\n      }\n    });\n\n    setState((prevState) => ({\n      ...prevState,\n      eventListenerAttached: true,\n    })",
              },
              74,
              {
                d: "json('config.json')\n      .then((",
              },
              4,
              {
                d: 'ed',
              },
              6,
              '(setConfig',
              {
                d: ") => {\n        setConfig(loadedConfig);\n      })\n      .catch((error) => {\n        console.error('Failed to load config:', error);\n      }",
              },
              329,
              'Visualization(svg, data, error, config, dimensions);',
              {
                d: 'LoadingState(svg, {\n    shouldShow: !data,\n    text: error\n      ? `Error: ${error.message}`\n      : config.loadingMessage,\n    x: dimensions.width / 2,\n    y: dimensions.height / 2,\n    fontSize: config.loadingFontSize,\n    fontFamily: config.loadingFontFamily,\n  });\n\n  if (data) {\n    // Safely transform config properties to accessor functions\n    const configWithAccessors = {\n      ...config,\n      xValue: config.xValue\n        ? (d) => d[config.xValue]\n        : () => 0,\n      yValue: config.yValue\n        ? (d) => d[config.yValue]\n        : () => 0,\n      sizeValue: config.sizeValue\n        ? (d) => d[config.sizeValue]\n        : null,\n      pointRadiusValue: config.pointRadiusValue\n        ? (d) => d[config.pointRadiusValue]\n        : null,\n    };\n\n    scatterPlot(svg, {\n      ...configWithAccessors,\n      data,\n      dimensions,\n    });\n  }',
              },
            ],
          },
        ],
        ['3a310d77', { i: { name: 'vizHandlers.js', text: '...' } }],
        ['9c363ec0', { i: { name: 'renderViz.js', text: '...' } }],
        ['f580dc4c', { i: { name: 'vizState.js', text: '...' } }],
      ];

      const environment = {};
      let view;
      createEditor({
        shareDBDoc: {
          data: { files: { [fileId]: { text: before } } },
          submitOp: (op) => {
            environment.submittedOp = op;
          },
          on: (eventName, callback) => {
            if (eventName === 'op') {
              environment.receiveOp = callback;
            }
          },
        },
        path: ['files', fileId, 'text'],
        additionalExtensions: [
          ViewPlugin.fromClass(
            class {
              constructor(v) {
                view = v;
              }
            },
          ),
        ],
      });

      environment.receiveOp(op);

      assert.equal(view.state.doc.toString(), after);
    });

    it('ShareDB --> CodeMirror, move op', () => {
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

    describe('Fixtures', () => {
      const fixturesDir = path.join(__dirname, '..', '..', 'test', 'fixtures');
      const fixtureFiles = fs.readdirSync(fixturesDir);

      const findFileId = (files) => {
        for (const id in files) {
          if (files[id].name === 'index.html') {
            return id;
          }
        }
      };

      fixtureFiles.forEach((file) => {
        if (path.extname(file) === '.json') {
          it(`should handle fixture: ${file}`, () => {
            const fixturePath = path.join(fixturesDir, file);
            const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

            const { vizFilesBefore, vizFilesAfter, filesOp } = fixture;

            const fileId = findFileId(vizFilesBefore);

            // If no index.html, skip.
            if (!fileId) {
              return;
            }

            const testPath = ['files', fileId, 'text'];

            const environment = {};
            let view;

            const shareDBDoc = {
              data: { files: vizFilesBefore },
              submitOp: (op) => {
                environment.submittedOp = op;
              },
              on: (eventName, callback) => {
                if (eventName === 'op') {
                  environment.receiveOp = callback;
                }
              },
            };

            view = createEditor({
              shareDBDoc,
              path: testPath,
            });

            // Simulate ShareDB receiving a remote op.
            environment.receiveOp(filesOp);

            const expectedText = vizFilesAfter[fileId].text;
            const actualText = view.state.doc.toString();

            assert.equal(actualText, expectedText);

            // Also check that no op was submitted back.
            assert.equal(environment.submittedOp, undefined);
          });
        }
      });
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

    it('move op - source path affected', () => {
      const moveOp = json1.moveOp(
        ['content', 'files', '2432', 'text'],
        ['content', 'files', '2432', 'newtext'],
      );
      const sourcePath = ['content', 'files', '2432', 'text'];
      assert.deepEqual(canOpAffectPath(moveOp, sourcePath), true);
    });

    it('move op - different path not affected', () => {
      const moveOp = json1.moveOp(
        ['content', 'files', '2432', 'text'],
        ['content', 'files', '2432', 'newtext'],
      );
      const differentPath = ['content', 'files', 'other-file', 'text'];
      assert.deepEqual(canOpAffectPath(moveOp, differentPath), false);
    });

    describe('special multi-file op', () => {
      it('should return true for an affecting special multi-file op', () => {
        const op = [
          'files',
          ['file1', 'text', { es: [0, 'a'] }],
          ['file2', 'text', { es: [0, 'b'] }],
        ];
        const path = ['content', 'files', 'file1', 'text'];
        assert.deepEqual(canOpAffectPath(op, path), true);
      });
      it('should return false for a non-affecting special multi-file op', () => {
        const op = [
          'files',
          ['file1', 'text', { es: [0, 'a'] }],
          ['file2', 'text', { es: [0, 'b'] }],
        ];
        const path = ['content', 'files', 'file3', 'text'];
        assert.deepEqual(canOpAffectPath(op, path), false);
      });
    });
  });
  describe('reconstructOp', () => {
    it('should return regular op as is', () => {
      const op = ['content', 'files', 'file1', 'text', { es: [0, 'a'] }];
      const path = ['content', 'files', 'file1', 'text'];
      assert.deepEqual(reconstructOp(op, path), op);
    });
    it('should reconstruct op for matching file', () => {
      const op = [
        'files',
        ['file1', 'text', { es: [0, 'a'] }],
        ['file2', 'text', { es: [0, 'b'] }],
      ];
      const path = ['content', 'files', 'file1', 'text'];
      const expected = ['content', 'files', 'file1', 'text', { es: [0, 'a'] }];
      assert.deepEqual(reconstructOp(op, path), expected);
    });
    it('should return null for non-matching file', () => {
      const op = [
        'files',
        ['file1', 'text', { es: [0, 'a'] }],
        ['file2', 'text', { es: [0, 'b'] }],
      ];
      const path = ['content', 'files', 'file3', 'text'];
      assert.deepEqual(reconstructOp(op, path), null);
    });
    it('should return null for non-text op part', () => {
      const op = ['files', ['file1', { i: { name: 'foo.js' } }]];
      const path = ['content', 'files', 'file1', 'text'];
      assert.deepEqual(reconstructOp(op, path), null);
    });
    it('should handle path not starting with content', () => {
      const op = [
        'files',
        ['file1', 'text', { es: [0, 'a'] }],
        ['file2', 'text', { es: [0, 'b'] }],
      ];
      const path = ['files', 'file1', 'text'];
      const expected = ['files', 'file1', 'text', { es: [0, 'a'] }];
      assert.deepEqual(reconstructOp(op, path), expected);
    });
  });
};
