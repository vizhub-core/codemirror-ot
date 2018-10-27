import { Path, Op } from './op';
import { Change, Transaction, EditorState } from 'codemirror-6';

const opToChange = (transaction: Transaction, op: Op) => {
  const from = op.p[op.p.length - 1] as number;

  // String insert
  if (op.si !== undefined) {
    const str = op.si;
    return transaction.change(new Change(from, from, [str]));
  }

  // String delete
  if (op.sd !== undefined) {
    const to = from + op.sd.length;
    const str = '';
    return transaction.change(new Change(from, to, [str]));
  }

  throw new Error('Invalid string op.');
}

const eq = (a, b) => a.length === b.length && a.every((aItem, i) => aItem === b[i]);
const isReplacement = ops => ops.length === 2 && eq(ops[0].p, ops[1].p) && ops[0].sd && ops[1].si;

const replacementOpsToChange = (transaction: Transaction, ops: Op[]) => {
  const op0 = ops[0];
  const sd = op0.sd;
  const si = ops[1].si;

  const from = op0.p[op0.p.length - 1] as number;
  const to = from + sd.length;

  return transaction.change(new Change(from, to, [si]));
}

export const opsToTransaction = (path: Path, state: EditorState, ops: Op[]) =>
  isReplacement(ops)
    ? replacementOpsToChange(state.transaction, ops)
    : ops.reduce(opToChange, state.transaction);
