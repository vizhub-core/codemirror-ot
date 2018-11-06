import { Path, Op } from './op';
import { Change, Transaction, EditorState } from 'codemirror-6';

const siToText = si => si.split('\n');

const opToChange = (transaction: Transaction, op: Op) => {
  const from = op.p[op.p.length - 1] as number;

  // String insert
  if (op.si !== undefined) {
    return transaction.change(new Change(from, from, siToText(op.si)));
  }

  // String delete
  if (op.sd !== undefined) {
    return transaction.change(new Change(from, from + op.sd.length, ['']));
  }

  throw new Error('Invalid string op.');
}

export const opsToTransaction = (path: Path, state: EditorState, ops: Op[]) =>
  ops.reduce(opToChange, state.transaction);
