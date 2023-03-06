import { ViewPlugin } from '@codemirror/view';
import { changesToOpJSON1, opToChangesJSON1 } from './translation';
import { canOpAffectPath } from './canOpAffectPath';

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
  debug = false,
}) =>
  ViewPlugin.fromClass(
    class {
      // ShareDB --> CodeMirror
      constructor(view) {
        this.view = view;
        this.handleOp = (op) => {
          // Ignore ops fired as a result of a change from `update` (this.lock).
          // Ignore ops that have different, irrelevant, paths (canOpAffectPath).
          if (!this.lock && canOpAffectPath(op, path)) {
            this.lock = true;
            if (debug) {
              console.log('Received op from ShareDB');
              console.log('  op: ' + JSON.stringify(op));
              console.log(
                '  generated changes: ' + JSON.stringify(opToChangesJSON1(op))
              );
            }
            view.dispatch({ changes: opToChangesJSON1(op) });
            this.lock = false;
          }
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
            console.log('  changes:' + JSON.stringify(update.changes.toJSON()));
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
                  })
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
                    textUnicode
                  )
                )
            );
          }
          shareDBDoc.submitOp(
            changesToOpJSON1(
              path,
              update.changes,
              update.startState.doc,
              json1,
              textUnicode
            )
          );
          this.lock = false;
        }
      }

      // Remove ShareDB listener.
      destroy() {
        shareDBDoc.off('op', this.handleOp);
      }
    }
  );
