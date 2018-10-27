import { Change, Transaction, EditorState } from 'codemirror-6';

export type Path = (number | string)[];

interface Op {
  p: Path
}
interface StringOp extends Op {
  si?: string; // string insert
  sd?: string; // string delete
}

const changeToOp = (path: Path, transaction: Transaction) => (change: Change): StringOp => {
  const op: StringOp = { p: path.concat([change.from]) };
  if (change.from === change.to) {
    op.si = change.text[0];
  } else {
    op.sd = transaction.startState.doc.slice(change.from, change.to)
  }
  return op;
};

export const transactionToOps = (path: Path, transaction: Transaction) => {
  return transaction.changes.changes.map(changeToOp(path, transaction));
};

const opToChange = (transaction: Transaction, op: Op) => {
  const stringOp = op as StringOp;
  const from = stringOp.p[op.p.length - 1] as number;

  // String insert
  if (stringOp.si !== undefined) {
    const str = stringOp.si;
    return transaction.change(new Change(from, from, [str]));
  }

  // String delete
  if (stringOp.sd !== undefined) {
    const to = from + stringOp.sd.length;
    const str = '';
    return transaction.change(new Change(from, to, [str]));
  }

  throw new Error('Invalid string op.');
}

export const opsToTransaction = (path: Path, state: EditorState, ops: Op[]) =>
  ops.reduce(opToChange, state.transaction);

export { ot } from './ot';
