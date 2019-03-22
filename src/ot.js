import { StateField } from './codemirror';
import { transactionToOps } from './transactionToOps';

export const ot = (path, emitOps) =>
  new StateField({
    init: () => ({}),
    apply: (transaction, state) => {
      const ops = transactionToOps(path, transaction);
      if (ops.length > 0) {
        emitOps(ops);
      }
      return state;
    },
    debugName: 'ot'
  }).extension;
