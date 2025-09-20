"use client";

import { defaultMarkdownSerializer } from "prosemirror-markdown";
import type { EditorView } from "prosemirror-view";
import type { RefObject } from "react";
import { Editor } from "@/components/Editor";
import Toolbar from "@/components/Toolbar";

type ActiveState = {
	strong: boolean;
	em: boolean;
	underline: boolean;
	link: boolean;
	heading1: boolean;
	heading2: boolean;
	bulletList: boolean;
	orderedList: boolean;
};

type Props = {
	viewRef: RefObject<EditorView | null>;
	active?: ActiveState;
	onActiveChange: (active: ActiveState) => void;
	onWordCountChange: (count: number, markdown: string) => void;
	wordCount: number;
	readOnly?: boolean;
};

export default function EditorSection({
	viewRef,
	active,
	onActiveChange,
	onWordCountChange,
	wordCount,
	readOnly = false,
}: Props) {
	return (
		<div className="flex flex-col mx-auto w-[80%] gap-2 h-full py-2">
			<div className="relative flex-grow">
				<Editor
					viewRef={viewRef}
					readOnly={readOnly}
					onActiveChange={onActiveChange}
					onWordCountChange={(count) => {
						const view = viewRef.current;
						if (!view) return onWordCountChange(count, "");
						const md = defaultMarkdownSerializer.serialize(view.state.doc);
						onWordCountChange(count, md);
					}}
				/>
			</div>
			<div className="flex items-center justify-between text-xs text-black/40 px-1">
				<div className="flex items-center gap-2">
					<Toolbar viewRef={viewRef} active={active} readOnly={readOnly} />
				</div>
				<div>{wordCount} words</div>
			</div>
		</div>
	);
}
