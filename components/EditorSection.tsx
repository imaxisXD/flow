"use client";

import { Loader } from "lucide-react";
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

				<div
					className={`pointer-events-none absolute rounded-t-2xl py-2 bg-gradient-to-b from-pink-200 to-pink-300 inset-x-0 bottom-2 flex justify-center transition-all duration-300 ease-out transform ${readOnly ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
					aria-live="polite"
					aria-atomic="true"
				>
					<div className="flex items-center gap-1 px-3 py-1 text-xs text-black/80">
						<span className="relative flex items-center gap-0.5">
							<Loader className="size-4 animate-spin" />
						</span>
						<span className="animate-pulse">
							AI is writing, We have locked the editor will AI is acting like
							Shakespeare
						</span>
					</div>
				</div>
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
