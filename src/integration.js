import { ViewPlugin } from '@codemirror/view';
import { changesToOpJSON1, opToChangesJSON1 } from './translation';

// Inspired by:
// https://github.com/codemirror/collab/blob/main/src/collab.ts
// https://codemirror.net/6/examples/collab/
// https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L107
// https://github.com/vizhub-core/vizhub/blob/main/vizhub-v2/packages/neoFrontend/src/pages/VizPage/Body/Editor/CodeEditor/CodeArea/CodeAreaCodeMirror5/index.js
export const json1Sync = ({ shareDBDoc, path = [], debug = false }) =>
  ViewPlugin.fromClass(
    class {
      // ShareDB --> CodeMirror
      constructor(view) {
        this.view = view;
        this.handleOp = (op) => {
          if (!this.lock) {
            this.lock = true;
            if (debug) {
              console.log('Received op from ShareDB');
              console.log('  ' + JSON.stringify(op));
              console.log('  ' + JSON.stringify(opToChangesJSON1(op)));
            }
            view.dispatch({ changes: opToChangesJSON1(op) });
            this.lock = false;
          }
        };
        shareDBDoc.on('op', this.handleOp);
      }

      // CodeMirror --> ShareDB
      update(update) {
        if (update.docChanged && !this.lock) {
          this.lock = true;
          if (debug) {
            console.log('Received change from CodeMirror');
            console.log('  ' + JSON.stringify(update.changes));
            console.log(
              '  ' +
                JSON.stringify(
                  changesToOpJSON1(path, update.changes, this.view.state.doc)
                )
            );
          }
          shareDBDoc.submitOp(
            changesToOpJSON1(path, update.changes, this.view.state.doc)
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
