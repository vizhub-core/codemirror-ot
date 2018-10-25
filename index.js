
const changeToOp = path => change => ({
  p: [path, change.from],
  si: change.text[0]
});

export const transactionToOps = (path, transaction) =>
  transaction.changes.changes.map(changeToOp(path));
