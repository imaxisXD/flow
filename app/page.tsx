"use client";

import {useEffect, useRef, useState} from "react";
import {Schema, MarkSpec, DOMOutputSpec, DOMParser as PMDOMParser} from "prosemirror-model";
import {EditorState, Plugin} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {schema as basicSchema} from "prosemirror-schema-basic";
import {addListNodes, wrapInList, liftListItem} from "prosemirror-schema-list";
import {toggleMark, setBlockType, baseKeymap} from "prosemirror-commands";
import {keymap} from "prosemirror-keymap";
import {history, undo, redo} from "prosemirror-history";
import {dropCursor} from "prosemirror-dropcursor";
import {gapCursor} from "prosemirror-gapcursor";
import {inputRules, textblockTypeInputRule, wrappingInputRule, smartQuotes, emDash, ellipsis} from "prosemirror-inputrules";
import {marked} from "marked";

function buildSchema(): Schema {
  const underline: MarkSpec = {
    parseDOM: [
      {tag: "u"},
      {
        style: "text-decoration",
        getAttrs: (value: string) => (typeof value === "string" && value.includes("underline")) ? null : false,
      },
    ],
    toDOM(): DOMOutputSpec { return ["u", 0]; },
  };

  const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");
  const marks = (basicSchema.spec.marks as any).addToEnd("underline", underline);
  return new Schema({nodes, marks});
}

function createEditor(
  mountEl: HTMLElement,
  onStateUpdate: (state: EditorState) => void
): { view: EditorView } {
  const schema = buildSchema();

  const state = EditorState.create({
    schema,
    doc: schema.topNodeType.createAndFill() || undefined,
    plugins: [
      inputRules({
        rules: [
          ...smartQuotes,
          ellipsis,
          emDash,
          textblockTypeInputRule(/^(?:#)\s$/, schema.nodes.heading, {level: 1}),
          textblockTypeInputRule(/^(?:##)\s$/, schema.nodes.heading, {level: 2}),
          wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
          wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list)
        ]
      }),
      history(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-b": toggleMark(schema.marks.strong),
        "Mod-i": toggleMark(schema.marks.em),
        "Mod-u": toggleMark(schema.marks.underline as any),
      }),
      keymap(baseKeymap),
      dropCursor(),
      gapCursor(),
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain");
            const html = event.clipboardData?.getData("text/html");
            // Only transform when plain text is provided and no rich HTML available
            if (!text || (html && html.length > 0)) return false;
            try {
              const htmlStr = marked.parse(text) as string;
              const wrap = document.createElement("div");
              wrap.innerHTML = htmlStr;
              const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(wrap);
              const tr = view.state.tr.replaceSelection(slice).scrollIntoView();
              view.dispatch(tr);
              return true;
            } catch (_err) {
              return false;
            }
          }
        },
        view(view) {
          onStateUpdate(view.state);
          return {
            update(view, prevState) {
              if (prevState.doc !== view.state.doc || prevState.selection !== view.state.selection) {
                onStateUpdate(view.state);
              }
            },
            destroy() {},
          };
        },
      }),
    ],
  });

  const view = new EditorView(mountEl, {state});
  return {view};
}

export default function Home() {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (!editorContainerRef.current) return;
    const {view} = createEditor(editorContainerRef.current, (state) => {
      const text = state.doc.textBetween(0, state.doc.content.size, " ", " ");
      const wc = text.trim().length ? text.trim().split(/\s+/).length : 0;
      setWordCount(wc);
      setIsEmpty(text.trim().length === 0);
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  function runCommand(command: (state: EditorState, dispatch: EditorView["dispatch"], view?: EditorView) => boolean) {
    const view = viewRef.current;
    if (!view) return;
    command(view.state, view.dispatch, view);
    view.focus();
  }

  function toggleHeading(level: 1 | 2) {
    const view = viewRef.current;
    if (!view) return;
    const {schema} = view.state;
    const {$from} = view.state.selection as any;
    const parent = $from.parent;
    if (parent.type === schema.nodes.heading && parent.attrs.level === level) {
      runCommand(setBlockType(schema.nodes.paragraph));
    } else {
      runCommand(setBlockType(schema.nodes.heading, {level}));
    }
  }

  function toggleUnderline() {
    const view = viewRef.current;
    if (!view) return;
    runCommand(toggleMark(view.state.schema.marks.underline as any));
  }

  function toggleBold() {
    const view = viewRef.current;
    if (!view) return;
    runCommand(toggleMark(view.state.schema.marks.strong));
  }

  function toggleItalic() {
    const view = viewRef.current;
    if (!view) return;
    runCommand(toggleMark(view.state.schema.marks.em));
  }

  function toggleLinkPrompt() {
    const view = viewRef.current;
    if (!view) return;
    const {state, dispatch} = view;
    const type = state.schema.marks.link;
    const {from, to, empty} = state.selection;

    if (!empty && state.doc.rangeHasMark(from, to, type)) {
      dispatch(state.tr.removeMark(from, to, type));
      view.focus();
      return;
    }

    const href = typeof window !== "undefined" ? window.prompt("Enter URL") : null;
    if (!href) return;

    if (empty) {
      const mark = type.create({href});
      dispatch(state.tr.addStoredMark(mark));
    } else {
      dispatch(state.tr.addMark(from, to, type.create({href})).scrollIntoView());
    }
    view.focus();
  }

  function isNodeActive(nodeTypeNames: string[]): boolean {
    const view = viewRef.current;
    if (!view) return false;
    const {state} = view;
    const {$from} = state.selection as any;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (nodeTypeNames.includes(node.type.name)) return true;
    }
    return false;
  }

  function toggleBulletList() {
    const view = viewRef.current;
    if (!view) return;
    const {schema} = view.state;
    const inBullet = isNodeActive(["bullet_list"]);
    const inOrdered = isNodeActive(["ordered_list"]);
    if (inBullet) {
      runCommand(liftListItem(schema.nodes.list_item));
    } else {
      // If we're inside ordered, lift first, then wrap as bullet
      if (inOrdered) runCommand(liftListItem(schema.nodes.list_item));
      runCommand(wrapInList(schema.nodes.bullet_list));
    }
  }

  function toggleOrderedList() {
    const view = viewRef.current;
    if (!view) return;
    const {schema} = view.state;
    const inOrdered = isNodeActive(["ordered_list"]);
    const inBullet = isNodeActive(["bullet_list"]);
    if (inOrdered) {
      runCommand(liftListItem(schema.nodes.list_item));
    } else {
      if (inBullet) runCommand(liftListItem(schema.nodes.list_item));
      runCommand(wrapInList(schema.nodes.ordered_list));
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-[1fr_360px] bg-white text-[#111]">
      {/* Left editor area */}
      <div className="flex flex-col">
        {/* Top bar */}
        <div className="h-14 border-b border-black/10 flex items-center px-5 gap-3">
          <div className="text-sm text-black/60">Demo document</div>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 rounded-md bg-pink-50 text-pink-700 border border-pink-200 text-xs font-medium grid place-items-center">
              Complete Writing
            </button>
          </div>
        </div>

        {/* Editor canvas */}
        <div className="flex-1 grid grid-cols-1 mx-auto w-[80%]">
            <div className="h-[80vh] grid">
              <div className="relative px-5 py-4">
                {isEmpty && (
                  <div className="text-black/50 text-sm pointer-events-none select-none">
                    Type or paste (⌘+V) your text here or upload a document.
                  </div>
                )}
                <div ref={editorContainerRef} className="min-h-[70vh]" />
              </div>
            
            </div>
            {/* Bottom editor toolbar and meta */}
            <div className="flex items-center justify-between text-xs text-black/40 px-1">
              <div className="flex items-center gap-2">
                {/* Formatting toolbar (functional) */}
                <div className="ml-2 flex items-center gap-1">
                  <button onMouseDown={(e) => { e.preventDefault(); toggleBold(); }} className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">B</button>
                  <button onMouseDown={(e) => { e.preventDefault(); toggleItalic(); }} className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">I</button>
                  <button onMouseDown={(e) => { e.preventDefault(); toggleUnderline(); }} className="h-6 min-w-6 px-2 rounded border border-black/10 text-[11px] bg-white">U</button>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <button onMouseDown={(e) => { e.preventDefault(); toggleHeading(1); }} className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">H1</button>
                  <button onMouseDown={(e) => { e.preventDefault(); toggleHeading(2); }} className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">H2</button>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <button onMouseDown={(e) => { e.preventDefault(); toggleLinkPrompt(); }} className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">Link</button>
                  <button onMouseDown={(e) => { e.preventDefault(); toggleBulletList(); }} className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">• List</button>
                  <button onMouseDown={(e) => { e.preventDefault(); toggleOrderedList(); }} className="h-6 px-2 rounded border border-black/10 text-[11px] bg-white">1. List</button>
                </div>
              </div>
              <div>{wordCount} words</div>
            </div>
          </div>
        </div>


      {/* Right panel */}
      <aside className="border-l border-black/10 bg-[#fafafa] flex flex-col">
        <div className="h-14 border-b border-black/10 px-4 flex items-center gap-2">
          <div className="h-9 px-3 rounded-md bg-pink-100 text-pink-700 border border-pink-200 text-xs font-medium grid place-items-center">
            Review suggestions
          </div>
          <div className="h-9 px-3 rounded-md bg-white text-black/60 border border-black/10 text-xs font-medium grid place-items-center">
            Write with generative AI
          </div>
          <div className="h-9 px-3 rounded-md bg-white text-black/60 border border-black/10 text-xs font-medium grid place-items-center text-center">
            Check for AI text & plagiarism
          </div>
        </div>

        <div className="flex-1 grid place-items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-pink-200" />
            <div className="text-black/70 text-sm font-medium">Nothing to see yet.</div>
            <div className="text-black/40 text-xs">Suggestions will appear here.</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
