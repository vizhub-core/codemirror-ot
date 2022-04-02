import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';

// Inspired by https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js

//export { changesToOpJSON0 } from './changesToOpJSON0';
//export { opToTransaction } from './opToTransaction';
//export { ot } from './ot';
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
  });

  return op;
};

export const changesToOpJSON1 = (path, changeSet, doc) => {
  const unicodeOp = [];
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
  const unicodeOpComposed = unicodeOp.reduce(textUnicode.type.compose);
  return json1.editOp(path, 'text-unicode', unicodeOpComposed);
};

export const opToChangesJSON0 = (op) => {
  const changes = [];
  for (const component of op) {
    const position = component.p[component.p.length - 1];

    // String insert
    if (component.si !== undefined) {
      changes.push({ from: position, to: position, insert: component.si });
    }

    // String deletion
    if (component.sd !== undefined) {
      changes.push({ from: position, to: position + component.sd.length });
    }
  }
  return changes;
};

export const opToChangesJSON1 = (op) => {
  const changes = [];
  for (const component of op) {
    const { es } = component;
    if (es !== undefined) {
      const position = es.length === 1 ? 0 : es[0];

      if (es[es.length - 1].d !== undefined) {
        // String deletion
        changes.push({
          from: position,
          to: position + es[es.length - 1].d.length,
        });
      } else {
        // String insertion
        changes.push({
          from: position,
          to: position,
          insert: es[es.length - 1],
        });
      }

      // Not sure when es.length would ever not be 1 or 2,
      // so throw to surface that case if it happens
      if (es.length > 2 || es.length === 0) {
        throw new Error('Expected es.length to be either 1 or 2.');
      }
    }
  }
  return changes;
};
