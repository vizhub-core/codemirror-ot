
const changeToOp = path => change => ({
  p: [path, change.from],
  si: change.text[0]
});

export const transactionToOps = (path, transaction) =>
  transaction.changes.changes.map(changeToOp(path));

const opToChange = path => op => {
  const from = op.p[op.p.length - 1];
  const str = op.si;
  const length = str.length;
  const to = from;
  const text = [ str ];
  return { from, to, length, text };
};

export const opsToTransaction = (path, ops) => ({
  changes: {
    changes: ops.map(opToChange(path))
  }
});
