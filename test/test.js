import { testTranslation } from './testTranslation';
import { testIntegration } from './testIntegration';
import { debugUnicode } from './debugUnicode';

describe('Translation (changesToOp, opToChanges) X (JSON0, JSON1)', () => {
  testTranslation();
});

describe('Integration (CodeMirror Extension + ShareDB)', () => {
  testIntegration();
});

debugUnicode();
