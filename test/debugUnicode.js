import * as assert from 'assert';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';
import { EditorState, ChangeSet } from '@codemirror/state';

// Debug the unicode emoji test case
export const debugUnicode = () => {
  describe('debug unicode', () => {
    it('should analyze unicode positions', () => {
      const testString = '🚀 Hello';
      console.log('\n=== Unicode Debug ===');
      console.log('Test string:', testString);
      console.log('String length (JS):', testString.length);
      
      // Create CodeMirror state
      const state = EditorState.create({ doc: testString });
      console.log('CodeMirror doc length:', state.doc.length);
      
      // Examine each character position
      for (let i = 0; i <= testString.length; i++) {
        const char = testString[i] || 'END';
        const slice = state.doc.sliceString(i, Math.min(i + 1, testString.length));
        console.log(`Position ${i}: "${char}" (slice: "${slice}")`);
      }
      
      // Test the problematic change
      const changes = [{ from: 3, to: 8, insert: 'World' }];
      console.log('\nTesting change:', changes[0]);
      
      // Check what text would be deleted according to CodeMirror
      const deletedText = state.doc.sliceString(3, 8);
      console.log('Text being deleted by CM:', `"${deletedText}"`);
      
      // Test with text-unicode operations directly
      console.log('\nDirect text-unicode test:');
      const deleteOp = textUnicode.remove(3, 'Hello');
      const insertOp = textUnicode.insert(3, 'World');
      const composedOp = textUnicode.type.compose(deleteOp, insertOp);
      
      console.log('Delete op:', deleteOp);
      console.log('Insert op:', insertOp);
      console.log('Composed op:', composedOp);
      
      const result = textUnicode.type.apply(testString, composedOp);
      console.log('Text-unicode result:', result);
      
      // Try the change with CodeMirror
      const changeSet = ChangeSet.of(changes, testString.length);
      const newState = state.update({ changes: changeSet });
      console.log('CodeMirror result:', newState.state.doc.sliceString(0));
      
      // Test what happens if we use position 2 instead of 3
      console.log('\nTrying position 2:');
      const changes2 = [{ from: 2, to: 7, insert: 'World' }];
      const deletedText2 = state.doc.sliceString(2, 7);
      console.log('Text being deleted at pos 2:', `"${deletedText2}"`);
      
      const changeSet2 = ChangeSet.of(changes2, testString.length);
      const newState2 = state.update({ changes: changeSet2 });
      console.log('CodeMirror result with pos 2:', newState2.state.doc.sliceString(0));
    });
  });
};