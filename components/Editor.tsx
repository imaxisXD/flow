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
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

interface ActiveState {
	strong: boolean;
	em: boolean;
	underline: boolean;
	link: boolean;
	heading1: boolean;
	heading2: boolean;
	bulletList: boolean;
	orderedList: boolean;
}

interface EditorProps {
	viewRef?: RefObject<EditorView | null>;
	onActiveChange?: (active: ActiveState) => void;
	onWordCountChange?: (count: number) => void;
}

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
			}),
		],
	});

	let view: EditorView;
	view = new EditorView(mountEl, {
		state,
		dispatchTransaction(tr) {
			const newState = view.state.apply(tr);
			view.updateState(newState);
			onStateUpdate(newState);
		},
	});
	// Initial notify
	onStateUpdate(view.state);
	return { view };
}

export const Editor = ({
	viewRef: externalViewRef,
	onActiveChange,
	onWordCountChange,
}: EditorProps) => {
	const editorContainerRef = useRef<HTMLDivElement | null>(null);
	const pmViewRef = useRef<EditorView | null>(null);
	const activeCallbackRef = useRef(onActiveChange);
	const wordCountCallbackRef = useRef(onWordCountChange);
	const externalRefRef = useRef(externalViewRef);

	useEffect(() => {
		activeCallbackRef.current = onActiveChange;
	}, [onActiveChange]);
	useEffect(() => {
		wordCountCallbackRef.current = onWordCountChange;
	}, [onWordCountChange]);
	useEffect(() => {
		externalRefRef.current = externalViewRef;
	}, [externalViewRef]);

	useEffect(() => {
		if (!editorContainerRef.current) return;
		const { view } = createEditor(editorContainerRef.current, (state) => {
			const text = state.doc.textBetween(0, state.doc.content.size, " ", " ");
			const wordCount = text.trim().length
				? text.trim().split(/\s+/).length
				: 0;
			if (wordCountCallbackRef.current) wordCountCallbackRef.current(wordCount);

			// Compute active formatting state
			const { schema, selection, storedMarks } = state;
			const { from, to, empty, $from } = selection;
			function isMarkActive(
				markType: (typeof schema.marks)[keyof typeof schema.marks],
			) {
				if (!markType) return false;
				if (empty) {
					const marks = storedMarks || $from.marks();
					return marks.some((m) => m.type === markType);
				}
				return state.doc.rangeHasMark(from, to, markType);
			}
			function isNodeActiveInSelection(nodeTypeNames: string[]) {
				for (let depth = $from.depth; depth > 0; depth--) {
					const node = $from.node(depth);
					if (nodeTypeNames.includes(node.type.name)) return true;
				}
				return false;
			}
			const parent = $from.parent;
			if (activeCallbackRef.current)
				activeCallbackRef.current({
					strong: isMarkActive(schema.marks.strong),
					em: isMarkActive(schema.marks.em),
					underline: schema.marks.underline
						? isMarkActive(schema.marks.underline)
						: false,
					link: isMarkActive(schema.marks.link),
					heading1:
						parent.type === schema.nodes.heading && parent.attrs.level === 1,
					heading2:
						parent.type === schema.nodes.heading && parent.attrs.level === 2,
					bulletList: isNodeActiveInSelection(["bullet_list"]),
					orderedList: isNodeActiveInSelection(["ordered_list"]),
				});
		});
		pmViewRef.current = view;
		if (externalRefRef.current) externalRefRef.current.current = view;
		return () => {
			view.destroy();
			pmViewRef.current = null;
			if (externalRefRef.current) externalRefRef.current.current = null;
		};
	}, []);

	return <div ref={editorContainerRef} />;
};
