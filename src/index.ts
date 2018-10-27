import { Change, Transaction } from 'codemirror-6';
type Path = (number | string)[];

interface Op { p: Path }
interface StringInsert extends Op { si: string }
interface StringDelete extends Op { sd: string }
type StringOp = StringInsert | StringDelete;

const changeToOp = (path: Path) => (change: Change): StringOp => ({
  p: path.concat([change.from]),
  si: change.text[0]
});

export const transactionToOps = (path: Path, transaction: Transaction) =>
  transaction.changes.changes.map(changeToOp(path));

const opToChange = (path: Path) => (op: Op) => {
  const stringInsert = op as StringInsert;
  const from = stringInsert.p[op.p.length - 1];
  const str = stringInsert.si;

  return {
    from: from,
    to: from,
    length: str.length,
    text: [ str ]
  };
};

export const opsToTransaction = (path: Path, ops: Op[]) => ({
  changes: {
    changes: ops.map(opToChange(path))
  }
});

export { ot } from './ot';
