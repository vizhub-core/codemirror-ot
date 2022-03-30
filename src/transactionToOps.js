const changeToOps = (path, transaction) => (change) => {
  const ops = [];
  const p = path.concat([change.from]);

  // String delete
  if (change.from !== change.to) {
    ops.push({
      p,
      sd: transaction.startState.doc.slice(change.from, change.to),
    });
  }

  // String insert
  const joined = change.text.join('\n');
  if (joined.length) {
    ops.push({
      p,
      si: joined,
    });
  }
  return ops;
};

export const transactionToOps = (path, transaction) =>
  transaction.changes.changes
    .map(changeToOps(path, transaction))
    .reduce((accumulator, ops) => accumulator.concat(ops), []);
