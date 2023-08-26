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
        si: inserted.sliceString(0, inserted.length, "\n"),
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
  // See https://codemirror.net/docs/ref/#state.Text.sliceString
  // This was also the approach taken in the YJS CodeMirror integration.
  // See https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L141

  // `offset`
  //  - Used to track the position offset based on previous operations
  //  - This is needed to support multi-part ops, such as those generated
  //    by running Prettier on a code file then using the resulting diff
  let offset = 0;
  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    // String deletion
    if (fromA !== toA) {
      const deletedText = doc.sliceString(fromA, toA);
      unicodeOp.push(textUnicode.remove(fromA + offset, deletedText));
      offset -= toA - fromA;
    }

    // String insertion
    if (insertedText.length > 0) {
      const insertedText = inserted.sliceString(0, inserted.length, "\n");
      unicodeOp.push(textUnicode.insert(fromA + offset, insertedText));
      offset += insertedText.length;
    }
  });

  // Composes string deletion followed by string insertion
  // to produce a "new kind" of op component that represents
  // a string replacement (using only a single op component).
  const unicodeOpComposed = unicodeOp.reduce(textUnicode.type.compose);

  return json1.editOp(path, "text-unicode", unicodeOpComposed);
};

export const opToChangesJSON0 = (op) => {
  const changes = [];
  let offset = 0; // Used to track the position offset based on previous operations

  for (let i = 0; i < op.length; i++) {
    const component = op[i];
    const originalPosition = component.p[component.p.length - 1];
    const adjustedPosition = originalPosition + offset;

    // String insert
    if (component.si !== undefined) {
      // String replacement
      if (
        i > 0 &&
        op[i - 1].sd !== undefined &&
        JSON.stringify(op[i - 1].p) === JSON.stringify(component.p)
      ) {
        // Modify the previous change to be a replacement instead of an insertion
        changes[i - 1].insert = component.si;

        // Undo the offset added by the previous change
        offset -= op[i - 1].sd.length;

        // Adjust the offset based on the length of the inserted string
        // offset += component.si.length;
      } else {
        changes.push({
          from: adjustedPosition,
          to: adjustedPosition,
          insert: component.si,
        });
        // offset += component.si.length; // Adjust offset for inserted string
      }
    }

    // String deletion (not part of a replacement)
    if (
      component.sd !== undefined &&
      (i === 0 || JSON.stringify(op[i - 1].p) !== JSON.stringify(component.p))
    ) {
      changes.push({
        from: adjustedPosition,
        to: adjustedPosition + component.sd.length,
      });
      offset += component.sd.length; // Adjust offset for deleted string
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
      let position = 0;

      // From https://github.com/ottypes/text-unicode#operation-components
      // Each operation is a list of components.
      // The components describe a traversal of the document, modifying the document along the way.
      // Each component is one of:
      // - **Number N**: Skip (retain) the next *N* characters in the document
      // - **"str"**: Insert *"str"* at the current position in the document
      // - **{d:N}**: Delete *N* characters at the current position in the document
      // - **{d:"str"}**: Delete the string *"str"* at the current position in the document.

      for (let i = 0; i < es.length; i++) {
        const component = es[i];

        if (typeof component === "number") {
          // It's a skip/retain operation.
          position += component;
        } else if (typeof component === "string") {
          // Check if the next component is a deletion, indicating a replacement.
          if (
            es[i + 1] &&
            typeof es[i + 1] === "object" &&
            es[i + 1].d !== undefined
          ) {
            let deletionLength =
              typeof es[i + 1].d === "number"
                ? es[i + 1].d
                : es[i + 1].d.length;
            changes.push({
              from: position,
              to: position + deletionLength,
              insert: component,
            });
            position += deletionLength;
            i++; // Skip the next component since we've already handled it.
          } else {
            // It's a regular insertion.
            changes.push({
              from: position,
              to: position,
              insert: component,
            });
          }
        } else if (component && component.d !== undefined) {
          if (typeof component.d === "number") {
            // It's a deletion by count.
            changes.push({
              from: position,
              to: position + component.d,
            });
            position += component.d; // Move the position forward by the number of characters deleted.
          } else if (typeof component.d === "string") {
            // It's a deletion of a specific string.
            changes.push({
              from: position,
              to: position + component.d.length,
            });
            position += component.d.length; // Move the position forward by the length of the string deleted.
          }
        }
      }
    }
  }
  return changes;
};
