"use client";

import { useMachine } from "@xstate/react";
import type { EditorView } from "prosemirror-view";
import { useRef, useState } from "react";
import type { SnapshotFrom } from "xstate";
import AgentPanel from "@/components/AgentPanel";
import EditorSection from "@/components/EditorSection";
import HeaderBar from "@/components/HeaderBar";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { autosaveMachine } from "@/machines/autosave-machine";

export default function Home() {
	const viewRef = useRef<EditorView | null>(null);
	const lastContentRef = useRef<string>("");

	const [toolbarActive, setToolbarActive] = useState({
		strong: false,
		em: false,
		underline: false,
		link: false,
		heading1: false,
		heading2: false,
		bulletList: false,
		orderedList: false,
	});
	const [wordCount, setWordCount] = useState(0);

	const [saveState, saveSend] = useMachine(autosaveMachine);
	const { isStreaming, startStreamingCompletion, stopStreaming } =
		useStreamingCompletion(viewRef);

	return (
		<div className="min-h-screen w-full flex bg-white">
			<div className="flex flex-col w-3/4">
				<HeaderBar
					saveState={
						saveState as unknown as SnapshotFrom<typeof autosaveMachine>
					}
					isStreaming={isStreaming}
					onStart={startStreamingCompletion}
					onStop={stopStreaming}
					wordCount={wordCount}
				/>

				<EditorSection
					viewRef={viewRef}
					active={toolbarActive}
					readOnly={isStreaming}
					onActiveChange={setToolbarActive}
					onWordCountChange={(count, md) => {
						setWordCount(count);
						if (md !== lastContentRef.current) {
							lastContentRef.current = md;
							saveSend({ type: "CHANGE", content: md });
						}
					}}
					wordCount={wordCount}
				/>
			</div>

			<AgentPanel />
		</div>
	);
}
