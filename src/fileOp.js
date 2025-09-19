export const reconstructOp = (op, path) => {
  if (op && op[0] === 'files' && Array.isArray(op[1])) {
    const filesIndex = path.indexOf('files');
    if (filesIndex !== -1) {
      const fileId = path[filesIndex + 1];
      const textProperty = path[filesIndex + 2];

      if (fileId && textProperty === 'text') {
        const fileOpPart = op
          .slice(1)
          .find((c) => Array.isArray(c) && c[0] === fileId && c[1] === 'text');

        if (fileOpPart) {
          // Reconstruct the op for a single file.
          return [...path, fileOpPart[2]];
        }
      }
    }
    // If it's a special multi-file op but not for this file, return null to ignore.
    return null;
  }
  return op;
};
