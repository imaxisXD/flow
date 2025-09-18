"use client";

import { marked } from "marked";
import { baseKeymap, toggleMark } from "prosemirror-commands";
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
import { addListNodes } from "prosemirror-schema-list";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import { Sparkle } from "@/component/icons/Sparkle";
import Toolbar from "@/component/Toolbar";

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
		<div className="min-h-screen grid grid-cols-[1fr_360px] bg-white text-[#111]">
			{/* Left editor area */}
			<div className="flex flex-col">
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
