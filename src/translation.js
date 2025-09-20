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
  const op = [];
  let lastPos = 0;
  const fullDoc = doc.sliceString(0, doc.length, '\n');

  changeSet.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const codePointFrom = utf16ToCodePoint(fullDoc, fromA);
    const deletedText = doc.sliceString(fromA, toA, '\n');
    const insertedText = inserted.sliceString(0, inserted.length, '\n');

    if (codePointFrom > lastPos) {
      op.push(codePointFrom - lastPos);
    }

    if (insertedText.length > 0) {
      op.push(insertedText);
    }
    if (deletedText.length > 0) {
      op.push({ d: deletedText });
    }
    lastPos = utf16ToCodePoint(fullDoc, toA);
  });

  const docCodePointLength = [...fullDoc].length;
  if (docCodePointLength > lastPos) {
    op.push(docCodePointLength - lastPos);
  }

  if (op.length === 0) {
    return null;
  }

  const normalized = textUnicode.type.normalize(op);
  return json1.editOp(path, 'text-unicode', normalized);
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

import { reconstructOp } from './fileOp';

// Converts a json1 OT op to a CodeMirror ChangeSet.
export const opToChangesJSON1 = (op, path, originalDoc = null) => {
  op = reconstructOp(op, path);
  if (!op) return [];
  const changes = [];

  // Check if this is a move operation
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
      // It's a move operation - the document at this path is being moved away
      // So we need to delete all content from this editor
      changes.push({ from: 0, to: originalDoc ? originalDoc.length : 0 });
      return changes;
    }
  }

  // The op for a text document is of the form [...path, textOp].
  // The textOp is the last element.
  const component = op[op.length - 1];

  if (typeof component === 'object' && component !== null) {
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
            let deletedLength;
            if (typeof es[i + 1].d === 'string') {
              deletedLength = [...es[i + 1].d].length;
            } else if (typeof es[i + 1].d === 'number') {
              deletedLength = es[i + 1].d;
            } else {
              deletedLength = 0;
            }

            let utf16From, utf16To;
            if (originalDoc) {
              // Convert from Unicode code point positions to UTF-16 positions using original document
              utf16From = codePointToUtf16(originalDoc, position);
              utf16To = codePointToUtf16(originalDoc, position + deletedLength);
            } else {
              // Fallback: assume positions are the same (ASCII-only content)
              utf16From = position;
              utf16To = position + deletedLength;
            }

            changes.push({
              from: utf16From,
              to: utf16To,
              insert: subComponent,
            });

            position += deletedLength;
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
          let deletedLength;
          if (typeof subComponent.d === 'number') {
            deletedLength = subComponent.d;
          } else if (typeof subComponent.d === 'string') {
            deletedLength = [...subComponent.d].length;
          } else {
            deletedLength = 0;
          }

          // It's a deletion.
          // For deletions, we can't rely on originalDoc for position conversion
          // because the op was generated against a different document state.
          // Instead, assume the positions are already correct for the current state.
          const utf16From = position;
          const utf16To = position + deletedLength;

          changes.push({
            from: utf16From,
            to: utf16To,
          });
          position += deletedLength;
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
