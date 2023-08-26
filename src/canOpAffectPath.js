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
export const canOpAffectPath = (op, path) => {
  // Defense
  if (!op || !path) {
    return false;
  }

  // Current approach: check that the path matches the json1 "descent".
  // Unclear if this is 100% correct for all possible ops,
  // but it works with the ops generated by this library at least.
  for (let i = 0; i < path.length; i++) {
    if (path[i] !== op[i]) {
      return false;
    }
  }
  return true;
};
