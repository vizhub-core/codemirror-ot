import { Plugin, EditorState, Transaction, StateField } from './codemirror';
import { transactionToOps } from './transactionToOps';

export const otPlugin = (path, emitOps) =>
  new Plugin({
    state: new StateField({
      init: () => ({}),
      apply: (transaction, state) => {
        const ops = transactionToOps(path, transaction);
        if (ops.length > 0) {
          emitOps(ops);
        }
        return state;
      },
      debugName: 'otPluginState'
    })
  });
