import { ViewPlugin } from '@codemirror/view';
import { changesToOpJSON1, opToChangesJSON1 } from './translation';
import { canOpAffectPath } from './canOpAffectPath';
import { reconstructOp } from './fileOp';

// Inspired by:
// https://github.com/codemirror/collab/blob/main/src/collab.ts
// https://codemirror.net/6/examples/collab/
// https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L107
// https://github.com/vizhub-core/vizhub/blob/main/vizhub-v2/packages/neoFrontend/src/pages/VizPage/Body/Editor/CodeEditor/CodeArea/CodeAreaCodeMirror5/index.js
export const json1Sync = ({
  shareDBDoc,
  path = [],
  json1,
  textUnicode,
  debug = true,
}) =>
  ViewPlugin.fromClass(
    class {
      // ShareDB --> CodeMirror
      constructor(view) {
        this.view = view;
        this.handleOp = (op) => {
          // Do not process ops if the lock is set.
          if (this.lock) return;

          if (debug) {
            console.log(
              'Received raw op from ShareDB: \n' + JSON.stringify(op, null, 2),
            );
          }

          // Ignore ops that are not arrays
          if (!Array.isArray(op)) return;

          this.lock = true;

          // Handle single-part and multi-part ops.
          // Example potential values for `op`:
          // - Single-part case (most common):
          //   ["files","73869312","text",{"es":[521," "]}
          // - Multi-part case:
          //   [["files","73869312","text",{"es":[521," "]}],["isInteracting",{"r":true}]]
          // - Special multi-file case from vizhub-fs:
          //   ["files",["22133515","text",{"es":[304,"\n"]}],["35721964","text",{...}]]
          const opComponents = Array.isArray(op[0]) ? op : [op];

          for (let opComponent of opComponents) {
            if (debug) {
              console.log(
                'Examining op component: \n' +
                  JSON.stringify(opComponent, null, 2),
              );
            }

            opComponent = reconstructOp(opComponent, path);

            if (debug) {
              console.log(
                'Reconstructed op component: \n' +
                  JSON.stringify(opComponent, null, 2),
              );
              console.log(
                'canOpAffectPath(opComponent, path): ' +
                  canOpAffectPath(opComponent, path),
              );
              console.log('path: ' + JSON.stringify(path));
            }

            // Ignore ops fired as a result of a change from `update` (this.lock).
            // Ignore ops that have different, irrelevant, paths (canOpAffectPath).
            if (canOpAffectPath(opComponent, path)) {
              const originalDoc = path.reduce(
                (obj, key) => obj && obj[key],
                shareDBDoc.data,
              );

              if (debug) {
                console.log('Received op from ShareDB');
                console.log('  op: ' + JSON.stringify(opComponent, null, 2));
                console.log(
                  '  generated changes: ' +
                    JSON.stringify(
                      opToChangesJSON1(opComponent, originalDoc),
                      null,
                      2,
                    ),
                );
              }
              view.dispatch({
                changes: opToChangesJSON1(opComponent, originalDoc),
              });
            }
          }
          this.lock = false;
        };
        shareDBDoc.on('op', this.handleOp);
      }

      // CodeMirror --> ShareDB
      update(update) {
        // Ignore updates fired as a result of an op from `handleOp` (this.lock).
        // Ignore updates that do not change the doc (update.docChanged).
        if (!this.lock && update.docChanged) {
          this.lock = true;
          if (debug) {
            console.log('Received change from CodeMirror');
            console.log(
              '  changes:' + JSON.stringify(update.changes.toJSON(), null, 2),
            );
            console.log('  iterChanges:');
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
              console.log(
                '    ' +
                  JSON.stringify({
                    fromA,
                    toA,
                    fromB,
                    toB,
                    inserted: inserted.sliceString(0, inserted.length, '\n'),
                  }),
              );
            });
            console.log(
              '  generated json1 op: ' +
                JSON.stringify(
                  changesToOpJSON1(
                    path,
                    update.changes,
                    update.startState.doc,
                    json1,
                    textUnicode,
                  ),
                  null,
                  2,
                ),
            );
          }
          shareDBDoc.submitOp(
            changesToOpJSON1(
              path,
              update.changes,
              update.startState.doc,
              json1,
              textUnicode,
            ),
          );
          this.lock = false;
        }
      }

      // Remove ShareDB listener.
      destroy() {
        shareDBDoc.off('op', this.handleOp);
      }
    },
  );
