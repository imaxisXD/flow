"use client";

import { useChat } from "@ai-sdk/react";
import { useMachine } from "@xstate/react";
import {
	defaultMarkdownParser,
	defaultMarkdownSerializer,
	MarkdownParser,
} from "prosemirror-markdown";
import { Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiButton } from "@/components/AiButton";
import { Editor } from "@/components/Editor";
import { Cpu, Fire } from "@/components/icons";
import SaveStatusBadge from "@/components/SaveStatusBadge";
import Toolbar from "@/components/Toolbar";
import { autosaveMachine } from "@/machines/autosave-machine";

export default function Home() {
	const viewRef = useRef<EditorView | null>(null);
	const appendStartPosRef = useRef<number | null>(null);
	const lastInsertedLenRef = useRef<number>(0);
	const streamedMarkdownRef = useRef<string>("");
	const separatorAddedRef = useRef<boolean>(false);
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

	const { messages, sendMessage, stop, status } = useChat();

	const [saveState, saveSend] = useMachine(autosaveMachine);

	useEffect(() => {
		if (status !== "streaming") return;

		const view = viewRef.current;
		if (!view) return;

		// Find the last assistant message in all messages
		const lastAssistant = [...messages]
			.reverse()
			.find((m) => m.role === "assistant");
		if (!lastAssistant) return;

		// Extract text from all parts
		const fullText = lastAssistant.parts
			.filter((p) => p.type === "text")
			.map((p) => p.text || "")
			.join("");

		if (!fullText || fullText.length <= lastInsertedLenRef.current) return;

		const delta = fullText.slice(lastInsertedLenRef.current);

		streamedMarkdownRef.current = fullText;
		lastInsertedLenRef.current = fullText.length;

		try {
			const { state } = view;
			const { doc } = state;
			// Insert a newline if needed
			if (!separatorAddedRef.current && delta.length > 0) {
				const endPos = doc.content.size;
				if (endPos > 1) {
					const sepTr = state.tr.insertText("\n", endPos - 1);
					view.dispatch(sepTr);
					appendStartPosRef.current = view.state.doc.content.size;
				} else {
					appendStartPosRef.current = endPos;
				}
				separatorAddedRef.current = true;
			}
		} catch (error) {
			console.error("Error inserting text:", error);
		}
	}, [messages, status]);

	const finalizeStreamingIntoEditor = useCallback(() => {
		const view = viewRef.current;
		if (!view) return;

		// If no content was streamed, clean up any separator we might have added
		if (
			streamedMarkdownRef.current.length === 0 &&
			separatorAddedRef.current &&
			appendStartPosRef.current !== null
		) {
			// Remove the separator we added
			const currentSize = view.state.doc.content.size;
			if (currentSize > appendStartPosRef.current) {
				const tr = view.state.tr.delete(appendStartPosRef.current, currentSize);
				view.dispatch(tr);
			}
		} else if (
			appendStartPosRef.current !== null &&
			streamedMarkdownRef.current.length > 0
		) {
			const start = appendStartPosRef.current;
			const end = view.state.doc.content.size;
			const markdown = streamedMarkdownRef.current;

			try {
				const mdParser = new MarkdownParser(
					view.state.schema,
					defaultMarkdownParser.tokenizer,
					defaultMarkdownParser.tokens,
				);
				const mdDoc = mdParser.parse(markdown);
				const slice = new Slice(mdDoc.content, 0, 0);
				const tr = view.state.tr
					.replaceRange(start, end, slice)
					.scrollIntoView();
				view.dispatch(tr);
				view.focus();
			} catch (_err) {
				console.log("Markdown parsing failed, keeping plain text");
			}
		}

		// Reset state
		appendStartPosRef.current = null;
		lastInsertedLenRef.current = 0;
		streamedMarkdownRef.current = "";
		separatorAddedRef.current = false;
	}, []);

	// Track previous status to detect transitions
	const prevStatusRef = useRef(status);

	useEffect(() => {
		if (prevStatusRef.current === "streaming" && status === "ready") {
			finalizeStreamingIntoEditor();
		} else if (status === "error") {
			finalizeStreamingIntoEditor();
		}
		prevStatusRef.current = status;
	}, [status, finalizeStreamingIntoEditor]);

	const startStreamingCompletion = () => {
		if (status === "streaming") return;
		const view = viewRef.current;
		if (!view) return;

		// Get current document markdown
		const editorMarkdown = defaultMarkdownSerializer.serialize(view.state.doc);

		// Record the current position before any changes
		const startPos = view.state.doc.content.size;
		appendStartPosRef.current = startPos;

		const prompt = `Continue the writing of this content: ${editorMarkdown}.
		 Write in the same tone and style, for example the above style is using markdown format, continue in the same format. 
		 Do not add any preface or labels. 
		 Start immediately with next line.
		 Always try markdown format.
		 If possible, write in the same language as the content.
		 DON'T INCLUDE ANY PREFIX OR SUFFIX JUST DIRECTLY WRITE THE CONTENT FOR EXAMPLE "Write a blog on dogs" --> "Dogs are loyal and friendly".
		 `;

		sendMessage({ text: prompt });

		// Reset streaming trackers
		lastInsertedLenRef.current = 0;
		streamedMarkdownRef.current = "";
		separatorAddedRef.current = false;
	};

	const stopStreaming = () => {
		if (status !== "streaming") return;
		if (typeof stop === "function") stop();
		finalizeStreamingIntoEditor();
	};

	return (
		<div className="min-h-screen w-full flex bg-white">
			<div className="flex flex-col w-3/4">
				<div className="h-14 flex items-center justify-between px-24 w-full">
					<div className="flex items-center justify-center gap-6">
						<h1 className="text-lg text-pink-700 font-bold w-fit flex justify-center items-center gap-0.5">
							<Fire size="size-6" />
							Flow Doc
						</h1>
						<SaveStatusBadge saveState={saveState} />
					</div>
					<div className="flex items-center w-fit">
						<AiButton
							isStreaming={status === "streaming" || status === "submitted"}
							onStart={startStreamingCompletion}
							onStop={stopStreaming}
							disabled={wordCount <= 3}
						/>
					</div>
				</div>

				<div className="flex flex-col mx-auto w-[80%] gap-2 h-full py-2">
					<div className="relative flex-grow">
						<Editor
							viewRef={viewRef}
							onActiveChange={setToolbarActive}
							onWordCountChange={(count) => {
								setWordCount(count);
								const view = viewRef.current;
								if (view) {
									const md = defaultMarkdownSerializer.serialize(
										view.state.doc,
									);
									if (md !== lastContentRef.current) {
										lastContentRef.current = md;
										saveSend({ type: "CHANGE", content: md });
									}
								}
							}}
						/>
					</div>
					<div className="flex items-center justify-between text-xs text-black/40 px-1">
						<div className="flex items-center gap-2">
							<Toolbar viewRef={viewRef} active={toolbarActive} />
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
