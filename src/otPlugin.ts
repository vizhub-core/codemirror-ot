import { Plugin, EditorView, EditorState, Transaction } from 'codemirror-6';
import { transactionToOps } from './transactionToOps';
import { Op, Path } from './op';

export const otPlugin = (path: Path, emitOps: (ops: Op[]) => any) => new Plugin({
  view: (view: EditorView) => {

    // Inject programmatically created transactions,
    // from remote OT operations.
    // resolve(ops: Op[] => {
    //   console.log('dispatching OT');
    //   view.dispatch(opsToTransaction(path, view.state, ops));
    // });

    return {
      // Listen for all transactions,
      // so they can be converted to OT operations.
      updateState(view: EditorView, prev: EditorState, transactions: Transaction[]) {
        emitOps(transactions.reduce((ops, transaction) => {
          return ops.concat(transactionToOps(path, transaction))
        }, []));
      }
    };
  }
});
