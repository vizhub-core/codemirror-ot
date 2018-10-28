import {
  Plugin,
  EditorView,
  EditorState,
  Transaction
} from 'codemirror-6';
import { opsToTransaction } from './opsToTransaction';
import { transactionToOps } from './transactionToOps';

export const ot = emitOps => {
  let plugin;
  const dispatchOp = new Promise(resolve => {
    console.log('A');
    plugin = new Plugin({
      view: (view: EditorView) => {

        // Inject programmatically created transactions,
        // from remote OT operations.
        resolve(ops => {
          console.log('dispatching OT');
          view.dispatch(opsToTransaction(ops));
        });

        return {
          // Listen for all transactions,
          // so they can be converted to OT operations.
          updateState(view: EditorView, prev: EditorState, transactions: Transaction[]) {
            const ops = transactions.reduce((accumulator, transaction) => {
              return accumulator.concat(transactionToOps(transaction));
            }, []);
            emitOps(ops);
          }
        };
      }
    });
  });
  console.log('B');
  return {
    plugin,
    dispatchOp
  };
};
