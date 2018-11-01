# codemirror-ot
Real-time collaboration plugin for CodeMirror 6. Alpha stage software, not fully working yet.

At its core this library is a translator between [JSON Operational Transformation](https://github.com/ottypes/json0) and [CodeMirror 6](https://codemirror.net/6/) [transactions](https://codemirror.net/6/design.html#state).

This is one piece of the puzzle for enabling real-time collaboration on text documents using CodeMirror and [ShareDB](https://github.com/teamwork/sharedb).

Related work:

 * https://github.com/prosemirror/prosemirror-collab - A collaboration module for ProseMirror.
 * https://github.com/FirebaseExtended/firepad - An active project using Firebase and CodeMirror.
 * https://github.com/gkjohnson/collaborative-code-editor - A 2017 integration of ShareDB and CodeMirror.
 * https://github.com/ejones/sharedb-codemirror - A ShareDB + CodeMirror integration from 2016.
 * https://github.com/nickasd/sharedb-codemirror - A fork of the `ejones` project from 2017.
 * https://github.com/datavis-tech/codemirror-binding - A collaboration module for CodeMirror 5.
 * https://github.com/reedsy/quill-cursors - Collaboration with presence cursors for Quill.
 * https://github.com/share/sharedb/pull/207 - PR on ShareDB for adding presence cursors.
