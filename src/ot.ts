import { Plugin, EditorView, EditorState, Transaction } from 'codemirror-6';
import { opsToTransaction } from './opsToTransaction';
import { transactionToOps } from './transactionToOps';
import { Op, Path } from './op';

export const ot = ({ path: Path, emitOps: (ops: Op[]): void }): { plugin: Plugin, dispatchOpsPromise: Promise<(ops):void>} => {
  let plugin;
  const dispatchOpsPromise = new Promise(resolve => {
    plugin = new Plugin({
      view: (view: EditorView) => {

        // Inject programmatically created transactions,
        // from remote OT operations.
        resolve(ops: Op[] => {
          console.log('dispatching OT');
          view.dispatch(opsToTransaction(path, view.state, ops));
        });

        return {
          // Listen for all transactions,
          // so they can be converted to OT operations.
          updateState(view: EditorView, prev: EditorState, transactions: Transaction[]) {
            const ops = transactions.reduce((ops, transaction) => {
              return ops.concat(transactionToOps(path, transaction))
            }, []);
            emitOps(ops);
          }
        };
      }
    });
  });
  return {
    plugin,
    dispatchOpsPromise
  };
};
