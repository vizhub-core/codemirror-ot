import assert from 'assert';
import { transactionToOps } from './index.js';

describe('CodeMirror OT', () => {
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
    const ops = transactionToOps(path, transaction);
    assert.deepEqual(ops, [{
      p: [ path, 0 ],
      si: 'd'
    }]);
  });
});
