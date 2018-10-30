import { Plugin, EditorState, Transaction, StateField } from 'codemirror-6';
import { transactionToOps } from './transactionToOps';
import { Op, Path } from './op';

class OTState { }

export const otPlugin = (path: Path, emitOps: (ops: Op[]) => any) => new Plugin({
  state: new StateField({
    init(editorState: EditorState): OTState {
      return new OTState();
    },
    apply(transaction: Transaction, state: OTState, editorState: EditorState): OTState {
      emitOps(transactionToOps(path, transaction));
      return state;
    },
    debugName: "otPluginState"
  })
});
