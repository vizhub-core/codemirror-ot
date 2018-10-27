import * as assert from 'assert';
import { EditorState, Change } from 'codemirror-6';
//import { transactionToOps, opsToTransaction } from '../src/index';

describe("EditorState", () => {
  it("holds doc and selection properties", () => {
    let state = EditorState.create({doc: "hello"})
    assert.equal(state.doc.toString(), "hello")
    assert.equal(state.selection.primary.from, 0)
  })
  
  it("can apply changes", () => { 
    let state = EditorState.create({doc: "hello"})
    let transaction = state.transaction.change(new Change(2, 4, ["w"])).change(new Change(4, 4, ["!"]))
    assert.equal(transaction.doc.toString(), "hewo!")
    assert.equal(transaction.apply().doc.toString(), "hewo!")
  })
});

//describe('codemirror-ot', () => {
//  describe('single character insertion', () => {
//    const path = ['text'];
//    const transaction = {
//      changes: {
//        changes: [
//          {
//            from: 0,
//            to: 0,
//            length: 1,
//            text: ['d']
//          }
//        ]
//      }
//    };
//    const ops = [{
//      p: [ path, 0 ],
//      si: 'd'
//    }];
//
//    it('transactionToOps', () => {
//      assert.deepEqual(transactionToOps(path, transaction), ops); 
//    });
//
//    it('opsToTransaction', () => {
//      assert.deepEqual(opsToTransaction(path, ops), transaction); 
//    });
//  });
//});
