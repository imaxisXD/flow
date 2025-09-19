"use client";

import { setBlockType, toggleMark } from "prosemirror-commands";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Bold } from "@/components/icons/Bold";
import { BulletList } from "@/components/icons/BulletList";
import { Heading } from "@/components/icons/Heading";
import { Italic } from "@/components/icons/Italic";
import { Link } from "@/components/icons/Link";
import { NumberList } from "@/components/icons/NumberList";
import { Underline } from "@/components/icons/Underline";
import { ToolbarButton } from "@/components/ToolbarButton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface ToolbarProps {
	viewRef: RefObject<EditorView | null>;
	active?: ActiveState;
}

export default function Toolbar({ viewRef, active }: ToolbarProps) {
	const [isLinkMenuOpen, setIsLinkMenuOpen] = useState(false);
	const [hrefValue, setHrefValue] = useState("");
	const hrefInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		function onOpenLink() {
			setHrefValue("");
			setIsLinkMenuOpen(true);
		}
		if (typeof window !== "undefined") {
			window.addEventListener("editor:link:open", onOpenLink as EventListener);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener(
					"editor:link:open",
					onOpenLink as EventListener,
				);
			}
		};
	}, []);

	useEffect(() => {
		if (isLinkMenuOpen) {
			// Defer to next tick to ensure input is mounted
			const id = setTimeout(() => hrefInputRef.current?.focus(), 0);
			return () => clearTimeout(id);
		}
	}, [isLinkMenuOpen]);

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

	function applyLink(href: string) {
		const view = viewRef.current;
		if (!view) return;
		const { state, dispatch } = view;
		const type = state.schema.marks.link;
		const { from, to, empty } = state.selection;

		const url = href.trim();
		if (!url) return;

		if (empty) {
			const mark = type.create({ href: url });
			dispatch(state.tr.addStoredMark(mark));
		} else {
			dispatch(
				state.tr.addMark(from, to, type.create({ href: url })).scrollIntoView(),
			);
		}
		view.focus();
	}

	function removeLink() {
		const view = viewRef.current;
		if (!view) return;
		const { state, dispatch } = view;
		const type = state.schema.marks.link;
		const { from, to, empty } = state.selection;
		if (!empty) {
			dispatch(state.tr.removeMark(from, to, type));
		} else {
			// Remove stored link mark if present when selection is empty
			const tr = state.tr.removeStoredMark(type);
			dispatch(tr);
		}
		view.focus();
	}

	function onLinkButtonClick() {
		const view = viewRef.current;
		if (!view) return;
		const { state } = view;
		const type = state.schema.marks.link;
		const { from, to, empty } = state.selection;
		if (!empty && state.doc.rangeHasMark(from, to, type)) {
			removeLink();
			return;
		}
		setHrefValue("");
		setIsLinkMenuOpen(true);
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
			<ToolbarButton
				onClick={toggleBold}
				tooltip="Bold"
				shortcut={["cmd", "b"]}
				active={!!active?.strong}
			>
				<Bold />
			</ToolbarButton>
			<ToolbarButton
				onClick={toggleItalic}
				tooltip="Italic"
				shortcut={["cmd", "i"]}
				active={!!active?.em}
			>
				<Italic />
			</ToolbarButton>
			<ToolbarButton
				onClick={toggleUnderline}
				tooltip="Underline"
				shortcut={["cmd", "u"]}
				active={!!active?.underline}
			>
				<Underline />
			</ToolbarButton>
			<div className="w-px h-4 bg-black/10 mx-1" />
			<ToolbarButton
				onClick={() => toggleHeading(1)}
				tooltip="Heading 1"
				shortcut={["cmd", "opt", "1"]}
				active={!!active?.heading1}
			>
				<Heading variant="h1" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => toggleHeading(2)}
				tooltip="Heading 2"
				shortcut={["cmd", "opt", "2"]}
				active={!!active?.heading2}
			>
				<Heading variant="h2" />
			</ToolbarButton>
			<div className="w-px h-4 bg-black/10 mx-1" />
			<DropdownMenu
				open={isLinkMenuOpen}
				onOpenChange={(open) => {
					setIsLinkMenuOpen(open);
					if (!open) {
						const v = viewRef.current;
						if (v) v.focus();
					}
				}}
			>
				<DropdownMenuTrigger asChild>
					<div>
						<ToolbarButton
							onClick={onLinkButtonClick}
							tooltip="Link"
							shortcut={["cmd", "k"]}
							active={!!active?.link}
						>
							<Link />
						</ToolbarButton>
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-64 p-2" sideOffset={6}>
					<div className="flex flex-col gap-2">
						<input
							className="w-full rounded border border-black/20 px-2 py-1 text-xs outline-none"
							placeholder="https://example.com"
							ref={hrefInputRef}
							value={hrefValue}
							onChange={(e) => setHrefValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									applyLink(hrefValue);
									setIsLinkMenuOpen(false);
								}
								if (e.key === "Escape") {
									setIsLinkMenuOpen(false);
								}
							}}
						/>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="flex-1 rounded bg-black text-white text-xs px-2 py-1"
								onClick={() => {
									applyLink(hrefValue);
									setIsLinkMenuOpen(false);
								}}
							>
								Apply
							</button>
							<DropdownMenuSeparator />
							<button
								type="button"
								className="flex-1 rounded border border-black/20 text-xs px-2 py-1"
								onClick={() => {
									removeLink();
									setIsLinkMenuOpen(false);
								}}
							>
								Remove
							</button>
						</div>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
			<ToolbarButton
				onClick={toggleBulletList}
				tooltip="Bullet List"
				shortcut={["cmd", "shift", "8"]}
				active={!!active?.bulletList}
			>
				<BulletList />
			</ToolbarButton>
			<ToolbarButton
				onClick={toggleOrderedList}
				tooltip="Ordered List"
				shortcut={["cmd", "shift", "7"]}
				active={!!active?.orderedList}
			>
				<NumberList />
			</ToolbarButton>
		</div>
	);
}
