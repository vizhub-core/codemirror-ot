import { Change, Transaction, EditorState } from 'codemirror-6';

export type Path = (number | string)[];

interface Op { p: Path }
interface StringInsert extends Op { si: string }
interface StringDelete extends Op { sd: string }
type StringOp = StringInsert | StringDelete;

// String insert.
// const changeToOp = (path: Path) => (change: Change): StringOp => ({
//   p: path.concat([change.from]),
//   si: change.text[0]
// });

// String delete.
const changeToOp = (path: Path, transaction: Transaction) => (change: Change): StringOp => ({
  p: path.concat([change.from]),
  sd: transaction.startState.doc.toString().substring(change.from, change.to)
});

export const transactionToOps = (path: Path, transaction: Transaction) =>
  transaction.changes.changes.map(changeToOp(path, transaction));

const opToChange = (transaction: Transaction, op: Op) => {
  //const stringDelete = op as StringDelete;
  //const from = stringDelete.p[op.p.length - 1] as number;
  //const str = stringDelete.si;
  //return transaction.change(new Change(from, from, [str]));

  const stringInsert = op as StringInsert;
  const from = stringInsert.p[op.p.length - 1] as number;
  const str = stringInsert.si;
  return transaction.change(new Change(from, from, [str]));
}

export const opsToTransaction = (path: Path, state: EditorState, ops: Op[]) =>
  ops.reduce(opToChange , state.transaction);

export { ot } from './ot';
