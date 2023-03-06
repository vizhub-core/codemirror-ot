# codemirror-ot
Real-time collaboration plugin for CodeMirror 6. For background & writeup, see [Medium: Codemirror 6 Experiments](https://medium.com/@currankelleher/codemirror-6-experiments-a3930bf03781). Overhauled in May 2022 to work with the latest CodeMirror 6 APIs and [JSON1](https://github.com/ottypes/json1). A fully functioning collaborative editor that leverages this library can be found in [VZCode](https://github.com/vizhub-core/vzcode).

At its core this library is a translator between [Operational Transformation](https://github.com/ottypes/json1) and [CodeMirror 6](https://codemirror.net/6/). This is one piece of the puzzle for enabling real-time collaboration on text documents using CodeMirror and [ShareDB](https://github.com/teamwork/sharedb).

Related:

 * https://github.com/codemirror/collab/blob/main/src/collab.ts
 * https://codemirror.net/6/examples/collab/
 * https://github.com/yjs/y-codemirror.next/blob/main/src/y-sync.js
 * https://github.com/prosemirror/prosemirror-collab - A collaboration module for ProseMirror.
 * https://github.com/FirebaseExtended/firepad - An active project using Firebase and CodeMirror.
 * https://github.com/gkjohnson/collaborative-code-editor - A 2017 integration of ShareDB and CodeMirror.
 * https://github.com/ejones/sharedb-codemirror - A ShareDB + CodeMirror integration from 2016.
 * https://github.com/nickasd/sharedb-codemirror - A fork of the `ejones` project from 2017.
 * https://github.com/datavis-tech/codemirror-binding - A collaboration module for CodeMirror 5.
 * https://github.com/reedsy/quill-cursors - Collaboration with presence cursors for Quill.
 * https://github.com/share/sharedb/pull/207 - PR on ShareDB for adding presence cursors.
 * https://github.com/ether/etherpad-lite - The original collaborative editor.
