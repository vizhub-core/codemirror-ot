import { Change } from './codemirror';

const siToText = si => si.split('\n');

const opToChange = (transaction, op) => {
  const from = op.p[op.p.length - 1];

  // String insert
  if (op.si !== undefined) {
    return transaction.change(new Change(from, from, siToText(op.si)));
  }

  // String delete
  if (op.sd !== undefined) {
    return transaction.change(new Change(from, from + op.sd.length, ['']));
  }

  throw new Error('Invalid string op.');
};

export const opsToTransaction = (path, state, ops) =>
  ops.reduce(opToChange, state.transaction);
