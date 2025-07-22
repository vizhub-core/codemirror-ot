import { testTranslation } from './testTranslation';
import { testIntegration } from './testIntegration';

describe('Translation (changesToOp, opToChanges) X (JSON0, JSON1)', () => {
  testTranslation();
});

describe('Integration (CodeMirror Extension + ShareDB)', () => {
  testIntegration();
});
