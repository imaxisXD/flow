"use client";

import { marked } from "marked";
import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { history, redo, undo } from "prosemirror-history";
import {
	ellipsis,
	emDash,
	inputRules,
	smartQuotes,
	textblockTypeInputRule,
	wrappingInputRule,
} from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import {
	type DOMOutputSpec,
	type MarkSpec,
	DOMParser as PMDOMParser,
	Schema,
} from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import {
	addListNodes,
	liftListItem,
	wrapInList,
} from "prosemirror-schema-list";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import { Cpu } from "@/components/icons";
import { Sparkle } from "@/components/icons/Sparkle";
import Toolbar from "@/components/Toolbar";

function buildSchema(): Schema {
	const underline: MarkSpec = {
		parseDOM: [
			{ tag: "u" },
			{
				style: "text-decoration",
				getAttrs: (value: string) =>
					typeof value === "string" && value.includes("underline")
						? null
						: false,
			},
		],
		toDOM(): DOMOutputSpec {
			return ["u", 0];
		},
	};

	const nodes = addListNodes(
		basicSchema.spec.nodes,
		"paragraph block*",
		"block",
	);
	const marks = basicSchema.spec.marks.addToEnd("underline", underline);
	return new Schema({ nodes, marks });
}

function placeholderPlugin(text: string) {
	return new Plugin({
		props: {
			decorations(state) {
				const { doc } = state;
				const allText = doc.textBetween(0, doc.content.size, " ", " ").trim();
				if (allText.length > 0) return null;

				let nodeDecoration: Decoration | null = null;
				doc.descendants((node, pos) => {
					if (nodeDecoration) return false;
					if (node.isTextblock) {
						const empty = node.content.size === 0;
						if (empty) {
							nodeDecoration = Decoration.node(pos, pos + node.nodeSize, {
								class: "is-empty",
								"data-placeholder": text,
							});
						}
						return false;
					}
					return true;
				});

				if (!nodeDecoration) return null;
				return DecorationSet.create(doc, [nodeDecoration]);
			},
		},
	});
}

function createEditor(
	mountEl: HTMLElement,
	onStateUpdate: (state: EditorState) => void,
): { view: EditorView } {
	const schema = buildSchema();

	function isNodeActiveInSelection(
		state: EditorState,
		nodeTypeNames: string[],
	): boolean {
		const { $from } = state.selection;
		for (let depth = $from.depth; depth > 0; depth--) {
			const node = $from.node(depth);
			if (nodeTypeNames.includes(node.type.name)) return true;
		}
		return false;
	}

	const state = EditorState.create({
		schema,
		doc: schema.topNodeType.createAndFill() || undefined,
		plugins: [
			inputRules({
				rules: [
					...smartQuotes,
					ellipsis,
					emDash,
					textblockTypeInputRule(/^(?:#)\s$/, schema.nodes.heading, {
						level: 1,
					}),
					textblockTypeInputRule(/^(?:##)\s$/, schema.nodes.heading, {
						level: 2,
					}),
					wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
					wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list),
				],
			}),
			history(),
			keymap({
				"Mod-z": undo,
				"Mod-y": redo,
				"Mod-b": toggleMark(schema.marks.strong),
				"Mod-i": toggleMark(schema.marks.em),
				"Mod-u": toggleMark(schema.marks.underline),
				// Headings
				"Mod-Alt-1": (state, dispatch, view) => {
					if (!view) return false;
					const { $from } = state.selection;
					const parent = $from.parent;
					const handled =
						parent.type === schema.nodes.heading && parent.attrs.level === 1
							? setBlockType(schema.nodes.paragraph)(state, dispatch, view)
							: setBlockType(schema.nodes.heading, { level: 1 })(
									state,
									dispatch,
									view,
								);
					if (handled) view.focus();
					return handled;
				},
				"Mod-Alt-2": (state, dispatch, view) => {
					if (!view) return false;
					const { $from } = state.selection;
					const parent = $from.parent;
					const handled =
						parent.type === schema.nodes.heading && parent.attrs.level === 2
							? setBlockType(schema.nodes.paragraph)(state, dispatch, view)
							: setBlockType(schema.nodes.heading, { level: 2 })(
									state,
									dispatch,
									view,
								);
					if (handled) view.focus();
					return handled;
				},
				// Link prompt / toggle
				"Mod-k": (state, dispatch, view) => {
					if (!view) return false;
					const type = state.schema.marks.link;
					const { from, to, empty } = state.selection;
					if (!empty && state.doc.rangeHasMark(from, to, type)) {
						if (dispatch) dispatch(state.tr.removeMark(from, to, type));
						view.focus();
						return true;
					}
					if (typeof window !== "undefined") {
						window.dispatchEvent(new CustomEvent("editor:link:open"));
					}
					return true;
				},
				// Bullet list toggle
				"Mod-Shift-8": (state, dispatch, view) => {
					if (!view) return false;
					const inCurrent = isNodeActiveInSelection(state, ["bullet_list"]);
					const inOther = isNodeActiveInSelection(state, ["ordered_list"]);
					if (inCurrent) {
						const handled = liftListItem(schema.nodes.list_item)(
							state,
							dispatch,
							view,
						);
						if (handled) view.focus();
						return handled;
					}
					if (inOther) {
						const lifted = liftListItem(schema.nodes.list_item)(
							state,
							dispatch,
							view,
						);
						const handled = wrapInList(schema.nodes.bullet_list)(
							view.state,
							view.dispatch,
							view,
						);
						if (lifted || handled) view.focus();
						return lifted || handled;
					}
					const handled = wrapInList(schema.nodes.bullet_list)(
						state,
						dispatch,
						view,
					);
					if (handled) view.focus();
					return handled;
				},
				// Ordered list toggle
				"Mod-Shift-7": (state, dispatch, view) => {
					if (!view) return false;
					const inCurrent = isNodeActiveInSelection(state, ["ordered_list"]);
					const inOther = isNodeActiveInSelection(state, ["bullet_list"]);
					if (inCurrent) {
						const handled = liftListItem(schema.nodes.list_item)(
							state,
							dispatch,
							view,
						);
						if (handled) view.focus();
						return handled;
					}
					if (inOther) {
						const lifted = liftListItem(schema.nodes.list_item)(
							state,
							dispatch,
							view,
						);
						const handled = wrapInList(schema.nodes.ordered_list)(
							view.state,
							view.dispatch,
							view,
						);
						if (lifted || handled) view.focus();
						return lifted || handled;
					}
					const handled = wrapInList(schema.nodes.ordered_list)(
						state,
						dispatch,
						view,
					);
					if (handled) view.focus();
					return handled;
				},
			}),
			keymap(baseKeymap),
			dropCursor(),
			gapCursor(),
			placeholderPlugin("Start writing here and see the magic..."),
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
							const slice = PMDOMParser.fromSchema(
								view.state.schema,
							).parseSlice(wrap);
							const tr = view.state.tr.replaceSelection(slice).scrollIntoView();
							view.dispatch(tr);
							return true;
						} catch (_err) {
							return false;
						}
					},
				},
				view(view) {
					onStateUpdate(view.state);
					return {
						update(view, prevState) {
							if (
								prevState.doc !== view.state.doc ||
								prevState.selection !== view.state.selection
							) {
								onStateUpdate(view.state);
							}
						},
						destroy() {},
					};
				},
			}),
		],
	});

	const view = new EditorView(mountEl, { state });
	return { view };
}

export default function Home() {
	const editorContainerRef = useRef<HTMLDivElement | null>(null);
	const viewRef = useRef<EditorView | null>(null);
	const [wordCount, setWordCount] = useState(0);

	useEffect(() => {
		if (!editorContainerRef.current) return;
		const { view } = createEditor(editorContainerRef.current, (state) => {
			const text = state.doc.textBetween(0, state.doc.content.size, " ", " ");
			const wc = text.trim().length ? text.trim().split(/\s+/).length : 0;
			setWordCount(wc);
		});
		viewRef.current = view;
		return () => {
			view.destroy();
			viewRef.current = null;
		};
	}, []);

	return (
		<div className="min-h-screen w-full flex bg-white">
			{/* Left editor area */}
			<div className="flex flex-col w-3/4">
				{/* Top bar */}
				<div className="h-14 flex items-center justify-between px-4">
					<div className="text-md text-gray-700 font-bold">Demo document</div>
					<div className="flex items-center">
						<button
							type="button"
							className="flex items-center justify-between gap-1 px-4 py-1.5 rounded-md bg-pink-50 text-pink-700 border border-pink-200 text-xs font-medium"
						>
							<Sparkle />
							<span>Complete Writing</span>
						</button>
					</div>
				</div>

				{/* Editor canvas */}
				<div className="flex flex-col mx-auto w-[80%] gap-2 h-full py-2">
					<div className="relative flex-grow">
						{/* Placeholder is now handled by ProseMirror plugin */}
						<div ref={editorContainerRef} />
					</div>
					{/* Bottom editor toolbar and meta */}
					<div className="flex items-center justify-between text-xs text-black/40 px-1">
						<div className="flex items-center gap-2">
							<Toolbar viewRef={viewRef} />
						</div>
						<div>{wordCount} words</div>
					</div>
				</div>
			</div>

			{/* Right panel */}
			<aside className="border-l border-black/10 bg-[#fafafa] flex flex-col w-1/4">
				<div className="h-14 border-b border-black/10 px-4 flex items-center justify-center">
					<div className="h-9 px-3 justify-between items-center gap-2 rounded-md bg-pink-100 text-pink-700 border border-pink-200 text-xs font-medium flex">
						<Cpu />
						Agent
					</div>
				</div>

				<div className="flex-1 grid place-items-center">
					<div className="flex flex-col items-center gap-4">
						<div className="h-16 w-16 rounded-full bg-pink-200" />
						<div className="text-black/70 text-sm font-medium">
							Nothing to see yet.
						</div>
						<div className="text-black/40 text-xs">
							Suggestions will appear here.
						</div>
					</div>
				</div>
			</aside>
		</div>
	);
}
