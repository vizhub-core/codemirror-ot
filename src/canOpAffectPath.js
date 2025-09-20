// Returns true if an op can affect the given path.
// Inspired by
// https://github.com/ottypes/json0/blob/master/lib/json0.js#L410
//
// The purpose of this is to check whether or not a given remote op
// affects the path associated to the json1Sync instance.
// When multiple files are open and being edited, the CodeMirror
// instance for one file should ignore ops for all other files.
//
// Previous implementation in VizHub v2 using CodeMirror 5 and JSON0:
// https://github.com/vizhub-core/vizhub/blob/76d4ca43a8b0f3c543919ccc66a7228d75ba37cd/vizhub-v2/packages/neoFrontend/src/pages/VizPage/Body/Editor/CodeEditor/CodeArea/CodeAreaCodeMirror5/index.js#L144
const debug = false;

// Checks if `p1` is a prefix of `p2`.
const isPrefix = (p1, p2) => {
  if (p1.length > p2.length) {
    return false;
  }
  for (let i = 0; i < p1.length; i++) {
    if (p1[i] !== p2[i]) {
      return false;
    }
  }
  return true;
};

export const canOpAffectPath = (op, path) => {
  // Defense
  if (!op || !path || op.length === 0) {
    if (debug) {
      console.log('  canOpAffectPath: op or path is null');
    }
    return false;
  }

  // Handle special multi-file ops from vizhub-fs.
  if (op[0] === 'files' && Array.isArray(op[1])) {
    const filesIndex = path.indexOf('files');
    if (filesIndex !== -1) {
      const fileId = path[filesIndex + 1];
      // Check if any part of the multi-file op affects the current file.
      return op.slice(1).some((part) => part[0] === fileId);
    }
  }

  if (debug) {
    console.log('  canOpAffectPath: comparing op and path');
    console.log('  op: ' + JSON.stringify(op));
    console.log('  path: ' + JSON.stringify(path));
  }

  // The path of the op is all but the last element, which is the op component.
  const opPath = op.slice(0, -1);

  // An op can affect a path if either is a prefix of the other.
  // This is a ShareDB / JSON0 convention that also applies to json1.
  // See https://github.com/ottypes/json0/blob/master/lib/json0.js#L410
  if (isPrefix(opPath, path) || isPrefix(path, opPath)) {
    if (debug) {
      console.log('    regular op matches path prefix');
    }
    return true;
  }

  // Check if it's a move operation affecting this path
  // Move ops have form: [prefix..., [dest_key, {d: ...}], [src_key, {p: ...}]]
  if (op.length >= 2) {
    const secondLast = op[op.length - 2]; // destination
    const last = op[op.length - 1]; // source

    if (
      Array.isArray(secondLast) &&
      Array.isArray(last) &&
      secondLast.length === 2 &&
      last.length === 2 &&
      typeof secondLast[1] === 'object' &&
      secondLast[1].d !== undefined &&
      typeof last[1] === 'object' &&
      last[1].p !== undefined
    ) {
      if (debug) {
        console.log('    detected move operation');
      }

      // It's a move operation
      // Check if the source path matches our path
      const sourceFullPath = op.slice(0, -2).concat(last[0]);
      const destFullPath = op.slice(0, -2).concat(secondLast[0]);

      if (debug) {
        console.log('    source path: ' + JSON.stringify(sourceFullPath));
        console.log('    dest path: ' + JSON.stringify(destFullPath));
      }

      // Check if our path is the source path or a subpath of it.
      if (isPrefix(sourceFullPath, path)) {
        if (debug) {
          console.log('    matches source path - operation affects this path');
        }
        return true;
      }

      // For move operations, we typically only care about the source path for removal
      // The destination would be handled by a different editor instance
      if (debug) {
        console.log('    move operation does not affect this path');
      }
    }
  }

  if (debug) {
    console.log('    no match found');
  }
  return false;
};
