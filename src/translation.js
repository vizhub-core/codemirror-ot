// This module is able to translate from CodeMirror ChangeSet to OT ops
// and back, for both json0 and json1 OT types.
//
// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js

// Convert UTF-16 position (used by CodeMirror) to Unicode code point position (used by text-unicode)
const utf16ToCodePoint = (str, utf16Pos) => {
  let codePointPos = 0;
  let utf16Index = 0;

  while (utf16Index < utf16Pos && utf16Index < str.length) {
    const codePoint = str.codePointAt(utf16Index);
    if (codePoint > 0xffff) {
      utf16Index += 2; // Surrogate pair takes 2 UTF-16 code units
    } else {
      utf16Index += 1;
    }
    codePointPos++;
  }

  return codePointPos;
};

// Convert Unicode code point position (used by text-unicode) to UTF-16 position (used by CodeMirror)
const codePointToUtf16 = (str, codePointPos) => {
  let utf16Index = 0;
  let currentCodePointPos = 0;

  while (currentCodePointPos < codePointPos && utf16Index < str.length) {
    const codePoint = str.codePointAt(utf16Index);
    if (codePoint > 0xffff) {
      utf16Index += 2; // Surrogate pair takes 2 UTF-16 code units
    } else {
      utf16Index += 1;
    }
    currentCodePointPos++;
  }

  return utf16Index;
};

// Converts a CodeMirror ChangeSet to a json0 OT op.
export const changesToOpJSON0 = (path, changeSet, doc) => {
  const op = [];
  let offset = 0; // Used to track the position offset based on previous operations
  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const deletedText = doc.sliceString(fromA, toA, '\n');
    const insertedText = inserted.sliceString(0, inserted.length, '\n');
    const p = path.concat([fromA + offset]);

    if (deletedText) {
      op.push({ p, sd: deletedText });
    }

    if (insertedText) {
      op.push({ p, si: insertedText });
    }

    offset += insertedText.length;
    offset -= deletedText.length;
  });

  return op;
};

// Converts a CodeMirror ChangeSet to a json1 OT op.
// Iterate over all changes in the ChangeSet.
// See https://codemirror.net/docs/ref/#state.ChangeSet.iterChanges
// See https://codemirror.net/docs/ref/#state.Text.sliceString
// This was also the approach taken in the YJS CodeMirror integration.
// See https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js#L141
export const changesToOpJSON1 = (path, changeSet, doc, json1, textUnicode) => {
  let op = [];
  let offset = 0;
  const fullDoc = doc.sliceString(0, doc.length, '\n');

  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const deletedText = doc.sliceString(fromA, toA, '\n');
    const insertedText = inserted.sliceString(0, inserted.length, '\n');

    // Convert UTF-16 position (CodeMirror) to code point position (text-unicode)
    const codePointPos = utf16ToCodePoint(fullDoc, fromA) + offset;

    if (deletedText) {
      op.push(textUnicode.remove(codePointPos, deletedText));
    }

    if (insertedText) {
      op.push(textUnicode.insert(codePointPos, insertedText));
    }

    // Update offset in code point space
    offset += insertedText.length - deletedText.length;
  });

  // Composes string deletion followed by string insertion
  // to produce a "new kind" of op component that represents
  // a string replacement (using only a single op component).
  if (op.length === 0) {
    return null;
  }

  op = op.reduce(textUnicode.type.compose);

  return json1.editOp(path, 'text-unicode', op);
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
        if (changes[i - 1]) {
          changes[i - 1].insert = component.si;
        }

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
export const opToChangesJSON1 = (op, originalDoc = null) => {
  if (!op) return [];
  const changes = [];

  for (const component of op) {
    if (typeof component !== 'object' || component === null) {
      continue;
    }
    const { es, r, i, p } = component;
    if (es !== undefined) {
      let position = 0;

      for (let i = 0; i < es.length; i++) {
        const subComponent = es[i];

        if (typeof subComponent === 'number') {
          // It's a skip/retain operation.
          position += subComponent;
        } else if (typeof subComponent === 'string') {
          // Check if the next component is a deletion, indicating a replacement.
          if (
            es[i + 1] &&
            typeof es[i + 1] === 'object' &&
            es[i + 1].d !== undefined
          ) {
            let deletedText =
              typeof es[i + 1].d === 'string' ? es[i + 1].d : '';

            let utf16From, utf16To;
            if (originalDoc) {
              // Convert from Unicode code point positions to UTF-16 positions using original document
              utf16From = codePointToUtf16(originalDoc, position);
              utf16To = codePointToUtf16(
                originalDoc,
                position + deletedText.length,
              );
            } else {
              // Fallback: assume positions are the same (ASCII-only content)
              utf16From = position;
              utf16To = position + deletedText.length;
            }

            changes.push({
              from: utf16From,
              to: utf16To,
              insert: subComponent,
            });

            position += deletedText.length;
            i++; // Skip the next component since we've already handled it.
          } else {
            // It's a regular insertion.
            let utf16Position;
            if (originalDoc) {
              utf16Position = codePointToUtf16(originalDoc, position);
            } else {
              utf16Position = position;
            }

            changes.push({
              from: utf16Position,
              to: utf16Position,
              insert: subComponent,
            });
          }
        } else if (subComponent && subComponent.d !== undefined) {
          if (typeof subComponent.d === 'number') {
            // It's a deletion by count.
            let utf16From, utf16To;
            if (originalDoc) {
              utf16From = codePointToUtf16(originalDoc, position);
              utf16To = codePointToUtf16(
                originalDoc,
                position + subComponent.d,
              );
            } else {
              utf16From = position;
              utf16To = position + subComponent.d;
            }

            changes.push({
              from: utf16From,
              to: utf16To,
            });
            position += subComponent.d;
          } else if (typeof subComponent.d === 'string') {
            // It's a deletion of a specific string.
            let utf16From, utf16To;
            if (originalDoc) {
              utf16From = codePointToUtf16(originalDoc, position);
              utf16To = codePointToUtf16(
                originalDoc,
                position + subComponent.d.length,
              );
            } else {
              utf16From = position;
              utf16To = position + subComponent.d.length;
            }

            changes.push({
              from: utf16From,
              to: utf16To,
            });
            position += subComponent.d.length;
          }
        }
      }
    } else if (r !== undefined && i !== undefined) {
      // Replacement
      changes.push({
        from: 0,
        to: originalDoc ? originalDoc.length : 0,
        insert: i,
      });
    } else if (r !== undefined) {
      // Deletion
      changes.push({ from: 0, to: originalDoc ? originalDoc.length : 0 });
    } else if (p !== undefined) {
      // Move (path remove)
      changes.push({ from: 0, to: originalDoc ? originalDoc.length : 0 });
    }
  }
  return changes;
};
