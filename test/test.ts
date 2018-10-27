import * as assert from 'assert';
import { transactionToOps, opsToTransaction } from '../src/index';

describe('codemirror-ot', () => {
  it('should insert a single character', () => {
    const path = ['text'];
    const transaction = {
      changes: {
        changes: [
          {
            from: 0,
            to: 0,
            length: 1,
            text: ['d']
          }
        ]
      }
    };
    const ops = [{
      p: [ path, 0 ],
      si: 'd'
    }];
    assert.deepEqual(
      transactionToOps(path, transaction),
      ops
    ); 
    assert.deepEqual(
      opsToTransaction(path, ops),
      transaction
    ); 
  });
});
