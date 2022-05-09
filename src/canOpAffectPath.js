export const canOpAffectPath = (op, path) => {
  for (let i = 0; i < path.length; i++) {
    if (path[i] !== op[i]) {
      return false;
    }
  }
  return true;
};
