import { setBlockType, toggleMark } from "prosemirror-commands";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { RefObject } from "react";
import { Bold } from "./icons/Bold";
import { BulletList } from "./icons/BulletList";
import { Heading } from "./icons/Heading";
import { Italic } from "./icons/Italic";
import { Link } from "./icons/Link";
import { NumberList } from "./icons/NumberList";
import { Underline } from "./icons/Underline";
import { ToolbarButton } from "./ToolbarButton";

interface ToolbarProps {
	viewRef: RefObject<EditorView | null>;
}

export default function Toolbar({ viewRef }: ToolbarProps) {
	function toggleHeading(level: 1 | 2) {
		const view = viewRef.current;
		if (!view) return;
		const { schema } = view.state;
		const { $from } = view.state.selection;
		const parent = $from.parent;
		if (parent.type === schema.nodes.heading && parent.attrs.level === level) {
			runCommand(setBlockType(schema.nodes.paragraph));
		} else {
			runCommand(setBlockType(schema.nodes.heading, { level }));
		}
	}

	function toggleMarkType(markName: string) {
		return () => {
			const view = viewRef.current;
			if (!view) return;
			const mark =
				markName === "underline"
					? view.state.schema.marks.underline
					: view.state.schema.marks[
							markName as keyof typeof view.state.schema.marks
						];
			runCommand(toggleMark(mark));
		};
	}

	const toggleBold = toggleMarkType("strong");
	const toggleItalic = toggleMarkType("em");
	const toggleUnderline = toggleMarkType("underline");

	function toggleLinkPrompt() {
		const view = viewRef.current;
		if (!view) return;
		const { state, dispatch } = view;
		const type = state.schema.marks.link;
		const { from, to, empty } = state.selection;

		if (!empty && state.doc.rangeHasMark(from, to, type)) {
			dispatch(state.tr.removeMark(from, to, type));
			view.focus();
			return;
		}

		const href =
			typeof window !== "undefined" ? window.prompt("Enter URL") : null;
		if (!href) return;

		if (empty) {
			const mark = type.create({ href });
			dispatch(state.tr.addStoredMark(mark));
		} else {
			dispatch(
				state.tr.addMark(from, to, type.create({ href })).scrollIntoView(),
			);
		}
		view.focus();
	}

	function isNodeActive(nodeTypeNames: string[]): boolean {
		const view = viewRef.current;
		if (!view) return false;
		const { state } = view;
		const { $from } = state.selection;
		for (let d = $from.depth; d > 0; d--) {
			const node = $from.node(d);
			if (nodeTypeNames.includes(node.type.name)) return true;
		}
		return false;
	}

	function toggleListType(listType: "bullet_list" | "ordered_list") {
		return () => {
			const view = viewRef.current;
			if (!view) return;
			const { schema } = view.state;
			const inCurrentList = isNodeActive([listType]);
			const otherListType =
				listType === "bullet_list" ? "ordered_list" : "bullet_list";
			const inOtherList = isNodeActive([otherListType]);

			if (inCurrentList) {
				runCommand(liftListItem(schema.nodes.list_item));
			} else {
				// If we're inside the other list type, lift first, then wrap as current type
				if (inOtherList) runCommand(liftListItem(schema.nodes.list_item));
				runCommand(wrapInList(schema.nodes[listType]));
			}
		};
	}

	const toggleBulletList = toggleListType("bullet_list");
	const toggleOrderedList = toggleListType("ordered_list");
	function runCommand(
		command: (
			state: EditorState,
			dispatch: EditorView["dispatch"],
			view?: EditorView,
		) => boolean,
	) {
		const view = viewRef.current;
		if (!view) return;
		command(view.state, view.dispatch, view);
		view.focus();
	}
	return (
		<div className="ml-2 flex items-center gap-1">
			<ToolbarButton onClick={toggleBold}>
				<Bold />
			</ToolbarButton>
			<ToolbarButton onClick={toggleItalic}>
				<Italic />
			</ToolbarButton>
			<ToolbarButton onClick={toggleUnderline}>
				<Underline />
			</ToolbarButton>
			<div className="w-px h-4 bg-black/10 mx-1" />
			<ToolbarButton onClick={() => toggleHeading(1)}>
				<Heading variant="h1" />
			</ToolbarButton>
			<ToolbarButton onClick={() => toggleHeading(2)}>
				<Heading variant="h2" />
			</ToolbarButton>
			<div className="w-px h-4 bg-black/10 mx-1" />
			<ToolbarButton onClick={toggleLinkPrompt}>
				<Link />
			</ToolbarButton>
			<ToolbarButton onClick={toggleBulletList}>
				<BulletList />
			</ToolbarButton>
			<ToolbarButton onClick={toggleOrderedList}>
				<NumberList />
			</ToolbarButton>
		</div>
	);
}
