# codemirror-ot

[![NPM version](https://img.shields.io/npm/v/codemirror-ot.svg)](https://www.npmjs.com/package/codemirror-ot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Real-time collaboration plugin for CodeMirror 6. For background & writeup, see [Medium: Codemirror 6 Experiments](https://medium.com/@currankelleher/codemirror-6-experiments-a3930bf03781). Overhauled in May 2022 to work with the latest CodeMirror 6 APIs and [JSON1](https://github.com/ottypes/json1). A fully functioning collaborative editor that leverages this library can be found in [VZCode](https://github.com/vizhub-core/vzcode).

At its core this library is a translator between [Operational Transformation](https://github.com/ottypes/json1) and [CodeMirror 6](https://codemirror.net/6/). This is one piece of the puzzle for enabling real-time collaboration on text documents using CodeMirror and [ShareDB](https://github.com/teamwork/sharedb).

## Overview

`codemirror-ot` provides seamless integration between CodeMirror 6 and Operational Transformation (OT) systems, enabling real-time collaborative editing. The library handles the complex translation between CodeMirror's change representation and OT operations for both JSON0 and JSON1 OT types.

## Key Features

- **Bidirectional Translation**: Convert between CodeMirror changes and OT operations
- **Multiple OT Type Support**: Works with both JSON0 and JSON1 operational transformation types
- **Unicode Support**: Proper handling of Unicode characters including emojis
- **Path-based Operations**: Support for operations at specific document paths
- **ShareDB Integration**: Ready-to-use ViewPlugin for ShareDB collaboration
- **Hot Module Reloading**: Maintains state during development

## Installation

```bash
npm install codemirror-ot
```

## Quick Start

### Basic ShareDB Integration

```javascript
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json1Sync } from 'codemirror-ot';
import json1 from 'ot-json1';
import textUnicode from 'ot-text-unicode';

// Assuming you have a ShareDB document
const view = new EditorView({
  state: EditorState.create({
    doc: shareDBDoc.data.content.files['myfile.js'].text,
    extensions: [
      json1Sync({
        shareDBDoc,
        path: ['content', 'files', 'myfile.js', 'text'],
        json1,
        textUnicode,
        debug: false,
      }),
    ],
  }),
});
```

### Manual Translation

```javascript
import {
  changesToOpJSON0,
  changesToOpJSON1,
  opToChangesJSON0,
  opToChangesJSON1,
} from 'codemirror-ot';
import { EditorState, ChangeSet } from '@codemirror/state';

// Convert CodeMirror changes to OT operations
const state = EditorState.create({ doc: 'Hello World' });
const changes = ChangeSet.of(
  [{ from: 5, to: 6, insert: '-' }],
  state.doc.length,
);

const json0Op = changesToOpJSON0([], changes, state.doc);
const json1Op = changesToOpJSON1([], changes, state.doc, json1, textUnicode);

// Convert OT operations back to CodeMirror changes
const changesFromJSON0 = opToChangesJSON0(json0Op);
const changesFromJSON1 = opToChangesJSON1(json1Op, 'Hello World');
```

## API Reference

### Translation Functions

#### changesToOpJSON0(path, changeSet, doc)

Converts a CodeMirror ChangeSet to a JSON0 OT operation.

**Parameters:**

- `path` - `string[]` - Path array for nested document operations
- `changeSet` - `ChangeSet` - CodeMirror ChangeSet containing the changes
- `doc` - `Text` - The original document before changes

**Returns:** `JSON0Op[]` - Array of JSON0 operation components

**Example:**

```javascript
const op = changesToOpJSON0(['files', 'index.js'], changeSet, state.doc);
// Result: [{ p: ['files', 'index.js', 5], sd: ' ' }, { p: ['files', 'index.js', 5], si: '-' }]
```

#### changesToOpJSON1(path, changeSet, doc, json1, textUnicode)

Converts a CodeMirror ChangeSet to a JSON1 OT operation with proper Unicode handling.

**Parameters:**

- `path` - `string[]` - Path array for nested document operations
- `changeSet` - `ChangeSet` - CodeMirror ChangeSet containing the changes
- `doc` - `Text` - The original document before changes
- `json1` - `JSON1Type` - JSON1 OT type instance
- `textUnicode` - `TextUnicodeType` - Text-unicode OT type instance

**Returns:** `JSON1Op | null` - JSON1 operation or null for no-ops

**Example:**

```javascript
const op = changesToOpJSON1(
  ['files', 'index.js'],
  changeSet,
  state.doc,
  json1,
  textUnicode,
);
// Result: ['files', 'index.js', { es: [5, '-', { d: ' ' }] }]
```

#### opToChangesJSON0(op)

Converts a JSON0 OT operation to CodeMirror changes.

**Parameters:**

- `op` - `JSON0Op[]` - Array of JSON0 operation components

**Returns:** `Change[]` - Array of CodeMirror change objects

**Example:**

```javascript
const changes = opToChangesJSON0([
  { p: [5], sd: ' ' },
  { p: [5], si: '-' },
]);
// Result: [{ from: 5, to: 6, insert: '-' }]
```

#### opToChangesJSON1(op, originalDoc?)

Converts a JSON1 OT operation to CodeMirror changes with Unicode position conversion.

**Parameters:**

- `op` - `JSON1Op` - JSON1 operation
- `originalDoc` - `string` (optional) - Original document for Unicode position conversion

**Returns:** `Change[]` - Array of CodeMirror change objects

**Example:**

```javascript
const changes = opToChangesJSON1([{ es: [5, '-', { d: ' ' }] }], 'Hello World');
// Result: [{ from: 5, to: 6, insert: '-' }]
```

### Integration

#### json1Sync(options)

Creates a CodeMirror ViewPlugin that synchronizes with ShareDB using JSON1 operations.

**Parameters:**

- `options` - `Object`
  - `shareDBDoc` - ShareDB document instance
  - `path` - `string[]` (default: []) - Path to the text content in the document
  - `json1` - JSON1 OT type instance
  - `textUnicode` - Text-unicode OT type instance
  - `debug` - `boolean` (default: false) - Enable debug logging

**Returns:** `ViewPlugin` - CodeMirror ViewPlugin for real-time collaboration

**Example:**

```javascript
const syncPlugin = json1Sync({
  shareDBDoc: myShareDBDoc,
  path: ['content', 'files', 'main.js', 'text'],
  json1,
  textUnicode,
  debug: true,
});
```

**Features:**

- **Bidirectional Sync**: Automatically syncs changes between CodeMirror and ShareDB
- **Multi-part Operations**: Handles complex operations with multiple components
- **Path Filtering**: Only processes operations that affect the specified path
- **Lock Mechanism**: Prevents infinite loops during synchronization
- **Hot Module Reloading**: Maintains editor state during development updates

### Utilities

#### canOpAffectPath(op, path)

Determines if an OT operation can affect content at the specified path.

**Parameters:**

- `op` - `JSON1Op | null` - The operation to check
- `path` - `string[]` - The path to check against

**Returns:** `boolean` - True if the operation affects the path

**Example:**

```javascript
const canAffect = canOpAffectPath(
  ['content', 'files', 'main.js', 'text', { es: [5, 'hello'] }],
  ['content', 'files', 'main.js', 'text'],
);
// Result: true
```

## Unicode Support

The library properly handles Unicode characters, including emojis and multi-byte characters, by converting between UTF-16 positions (used by CodeMirror) and Unicode code point positions (used by text-unicode OT type).

```javascript
// Unicode emoji handling
const changes = opToChangesJSON1(
  [{ es: [2, 'World', { d: 'Hello' }] }],
  '🚀 Hello',
);
// Correctly handles emoji position conversion
```

## Error Handling

The library includes robust error handling for:

- Null or undefined operations
- Invalid path structures
- Unicode conversion edge cases
- Malformed OT operations

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes comprehensive coverage of:

- String insertions, deletions, and replacements
- Unicode character handling
- Path-based operations
- Multi-part operations
- Real-world collaboration scenarios

## Related Projects

- [CodeMirror 6](https://codemirror.net/6/) - The text editor this library integrates with
- [ShareDB](https://github.com/teamwork/sharedb) - Real-time database with OT support
- [JSON1](https://github.com/ottypes/json1) - JSON operational transformation type
- [VZCode](https://github.com/vizhub-core/vzcode) - Collaborative code editor using this library

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
