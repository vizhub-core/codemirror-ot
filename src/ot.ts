import { Plugin, EditorView, EditorState, Transaction } from 'codemirror-6';
import { transactionToOps } from './transactionToOps';
import { Op, Path } from './op';

export const otPlugin = (path: Path, emitOps: (ops: Op[]) => any) => new Plugin({
  view: (view: EditorView) => {
    return {
      updateState(view: EditorView, prev: EditorState, transactions: Transaction[]) {
        emitOps(transactions.reduce((ops, transaction) => {
          return ops.concat(transactionToOps(path, transaction))
        }, []));
      }
    };
  }
});
