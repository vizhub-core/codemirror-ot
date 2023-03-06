// This module is able to translate from CodeMirror ChangeSet to OT ops
// and back, for both json0 and json1 OT types.
//
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js

// Converts a CodeMirror ChangeSet to a json0 OT op.
export const changesToOpJSON0 = (path, changeSet, doc) => {
  const op = [];
  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const p = path.concat([fromA]);

    // String deletion
    if (fromA !== toA) {
      op.push({
        p,
        sd: doc.sliceString(fromA, toA),
      });
    }

    // String insertion
    if (inserted.length > 0) {
      op.push({
        p,
        si: inserted.sliceString(0, inserted.length, '\n'),
      });
    }

    // Note: String replacement in json0 is represented by a
    // string deletion op component followed by a
    // string insertion op component.
  });

  return op;
};

// Converts a CodeMirror ChangeSet to a json1 OT op.
export const changesToOpJSON1 = (path, changeSet, doc, json1, textUnicode) => {
  const unicodeOp = [];

  // Iterate over all changes in the ChangeSet.
  // See https://codemirror.net/6/docs/ref/#state.ChangeSet.iterChanges
  // This was also the approach taken in the YJS CodeMirror integration.
  // See https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L141
  // TODO investigate "adj" here: https://github.com/yjs/y-codemirror.next/commit/89ba3455418cbb75c04b7376b8584601cca7c426
  // Not sure why it was added in y-codemirror.
  // Changes with many components maybe?
  // Edits in multiple places at once?
  // No idea.
  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const p = path.concat([fromA]);

    // String deletion
    if (fromA !== toA) {
      unicodeOp.push(textUnicode.remove(fromA, doc.sliceString(fromA, toA)));
    }

    // String insertion
    if (inserted.length > 0) {
      const insertedStr = inserted.sliceString(0, inserted.length, '\n');
      unicodeOp.push(textUnicode.insert(fromA, insertedStr));
    }
  });

  // Composes string deletion followed by string insertion
  // to produce a "new kind" of op component that represents
  // a string replacement (using only a single op component).
  const unicodeOpComposed = unicodeOp.reduce(textUnicode.type.compose);

  return json1.editOp(path, 'text-unicode', unicodeOpComposed);
};

// Converts a json0 OT op to a CodeMirror ChangeSet.
export const opToChangesJSON0 = (op) => {
  const changes = [];
  for (let i = 0; i < op.length; i++) {
    const component = op[i];
    const position = component.p[component.p.length - 1];

    // String insert
    if (component.si !== undefined) {
      // String replacement
      // e.g. [ { p: [5], sd: ' ' }, { p: [5], si: '-' } ],
      if (
        i > 0 &&
        op[i - 1].sd !== undefined &&
        JSON.stringify(op[i - 1].p) === JSON.stringify(component.p)
      ) {
        // Instead of
        //   changes: [
        //     { from: 5, to: 6 },
        //     { from: 5, to: 5, insert: '-' },
        //   ],
        //
        // we want to end up with
        //   changes: [{ from: 5, to: 6, insert: '-' }],
        //
        changes[i - 1].insert = component.si;
      } else {
        changes.push({ from: position, to: position, insert: component.si });
      }
    }

    // String deletion
    if (component.sd !== undefined) {
      changes.push({ from: position, to: position + component.sd.length });
    }
  }
  return changes;
};

// Converts a json1 OT op to a CodeMirror ChangeSet.
export const opToChangesJSON1 = (op) => {
  const changes = [];
  for (const component of op) {
    const { es } = component;
    if (es !== undefined) {
      const position = es.length === 1 ? 0 : es[0];

      if (es.length === 3) {
        // String replacement
        // e.g. [5,"-",{"d":" "}]
        changes.push({
          from: position,
          to: position + es[2].d.length,
          insert: es[1],
        });
      } else if (
        es.length === 2 &&
        typeof es[0] !== 'number' &&
        es[1].d !== undefined
      ) {
        // String replacement from position 0.
        // e.g. ["g",{"d":"Hello World"}]
        changes.push({
          from: 0,
          to: es[1].d.length,
          insert: es[0],
        });
      } else if (es[es.length - 1].d !== undefined) {
        // String deletion
        // e.g. [5,{"d":" Beautiful "}], [{"d":"d"}]
        changes.push({
          from: position,
          to: position + es[es.length - 1].d.length,
        });
      } else {
        // String insertion
        // e.g. [5," Beautiful "], ["d"],
        changes.push({
          from: position,
          to: position,
          insert: es[es.length - 1],
        });
      }
    }
  }
  return changes;
};
