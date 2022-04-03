import { ViewPlugin } from '@codemirror/view';
import { changesToOpJSON1, opToChangesJSON1 } from './translation';

// Inspired by https://github.com/codemirror/collab/blob/cffa435ca5a7a0b3f46f59afdb45db4c9765b54e/src/collab.ts#L60
// Inspired by https://codemirror.net/6/examples/collab/
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L107
export const json1Sync = ({ shareDBDoc, path = [] }) =>
  ViewPlugin.fromClass(
    class {
      // Add ShareDB listener.
      constructor(view) {
        this.view = view;
        shareDBDoc.on('op', this.handleOp);
      }

      // ShareDB --> CodeMirror
      handleOp(op) {
        this.view.dispatch({ changes: opToChangesJSON1(op) });
      }

      // CodeMirror --> ShareDB
      update(update) {
        if (update.docChanged) {
          shareDBDoc.submitOp(
            changesToOpJSON1(path, update.changes, this.view.state.doc)
          );
        }
      }

      // Remove ShareDB listener.
      destroy() {
        shareDBDoc.off('op', this.handleOp);
      }
    }
  );
