import { Path, Op } from './op';
import { Change, Transaction } from 'codemirror-6';

const changeToOps = (path: Path, transaction: Transaction) => (change: Change) => {
  const ops: Op[] = [];
  const p = path.concat([change.from]);
  if (change.from !== change.to) {
    ops.push({ p, sd: transaction.startState.doc.slice(change.from, change.to) });
  }
  if (change.text[0].length) {
    ops.push({ p, si: change.text[0] });
  }
  return ops;
};

export const transactionToOps = (path: Path, transaction: Transaction) =>
  transaction.changes.changes
    .map(changeToOps(path, transaction))
    .reduce((accumulator, ops) => accumulator.concat(ops), []);
