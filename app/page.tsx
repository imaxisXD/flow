"use client";

import { useChat } from "@ai-sdk/react";
import { marked } from "marked";
import { DOMParser as PMDOMParser } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiButton } from "@/components/AiButton";
import { Editor } from "@/components/Editor";
import { Cpu, Fire } from "@/components/icons";
import Toolbar from "@/components/Toolbar";

export default function Home() {
	const viewRef = useRef<EditorView | null>(null);
	const appendStartPosRef = useRef<number | null>(null);
	const lastInsertedLenRef = useRef<number>(0);
	const streamedMarkdownRef = useRef<string>("");
	const separatorAddedRef = useRef<boolean>(false);

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

	const stripLeadingWhitespace = useCallback(
		(s: string) => s.replace(/^[\s\u200B\uFEFF]+/, ""),
		[],
	);
	const stripContinuationLabel = useCallback(
		(s: string) => s.replace(/^Continuation\s*[:-]?\s*/i, ""),
		[],
	);
	const sanitizeInitialChunk = useCallback(
		(s: string) => stripContinuationLabel(stripLeadingWhitespace(s)),
		[stripContinuationLabel, stripLeadingWhitespace],
	);
	const sanitizeFullMarkdown = useCallback(
		(s: string) => stripContinuationLabel(stripLeadingWhitespace(s)).trimEnd(),
		[stripContinuationLabel, stripLeadingWhitespace],
	);

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

		const rawDelta = fullText.slice(lastInsertedLenRef.current);
		const isFirstChunk = lastInsertedLenRef.current === 0;
		const delta = isFirstChunk ? sanitizeInitialChunk(rawDelta) : rawDelta;

		streamedMarkdownRef.current = fullText;
		lastInsertedLenRef.current = fullText.length;

		try {
			// Get the current state and create a transaction
			const { state } = view;
			const { doc, schema } = state;

			// On first content insertion, ensure a single-space separator only if needed (no blank line)
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

			// Get updated state after potential separator insertion
			const currentState = view.state;
			const endPos = currentState.doc.content.size;

			// Check if we need to add a paragraph at the end
			// if (
			// 	endPos === 0 ||
			// 	!currentState.doc.resolve(endPos).parent.isTextblock
			// ) {
			// 	// Add a paragraph if the document is empty or doesn't end with a text block
			// 	const paragraph = schema.nodes.paragraph.create();
			// 	const insertTr = currentState.tr.insert(endPos, paragraph);
			// 	view.dispatch(insertTr);
			// 	// After dispatching, get the updated state
			// 	const updatedEndPos = view.state.doc.content.size;
			// 	const textTr = view.state.tr.insertText(delta, updatedEndPos - 1);
			// 	view.dispatch(textTr);
			// } else {
			// 	// Insert text at the end
			// 	const insertTr = currentState.tr.insertText(delta, endPos);
			// 	view.dispatch(insertTr);
			// }
		} catch (error) {
			console.error("Error inserting text:", error);
		}
	}, [messages, status, sanitizeInitialChunk]);

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
			const markdown = sanitizeFullMarkdown(streamedMarkdownRef.current);

			// Replace the appended plain text with parsed Markdown nodes
			try {
				const html = (marked.parse(markdown) as string) || "";
				const wrap = document.createElement("div");
				wrap.innerHTML = html;
				const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(
					wrap,
				);
				const tr = view.state.tr
					.replaceRange(start, end, slice)
					.scrollIntoView();
				view.dispatch(tr);
				view.focus();
			} catch (_err) {
				console.log("[FINALIZE] Markdown parsing failed, keeping plain text");
			}
		}

		// Reset state
		appendStartPosRef.current = null;
		lastInsertedLenRef.current = 0;
		streamedMarkdownRef.current = "";
		separatorAddedRef.current = false;
	}, [sanitizeFullMarkdown]);

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

		// Get current document text
		const editorText = view.state.doc.textBetween(
			0,
			view.state.doc.content.size,
		);

		// Record the current position before any changes
		const startPos = view.state.doc.content.size;
		appendStartPosRef.current = startPos;

		const prompt = `Continue the writing of this content: ${editorText}.
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
	console.log("status", status);
	return (
		<div className="min-h-screen w-full flex bg-white">
			{/* Left editor area */}
			<div className="flex flex-col w-3/4">
				{/* Top bar */}
				<div className="h-14 flex items-center justify-between px-24 w-full">
					<div className="flex items-center justify-center gap-6">
						<h1 className="text-lg text-pink-700 font-bold w-fit flex justify-center items-center gap-0.5">
							<Fire size="size-6" />
							Flow Doc
						</h1>
						<span className="text-xs border border-emerald-400 text-green-500 rounded-full px-3 py-0.5">
							Saved
						</span>
						<span className="text-xs border border-amber-400 text-amber-600 rounded-full px-3 py-0.5">
							Saving
						</span>
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

				{/* Editor canvas */}
				<div className="flex flex-col mx-auto w-[80%] gap-2 h-full py-2">
					<div className="relative flex-grow">
						<Editor
							viewRef={viewRef}
							onActiveChange={setToolbarActive}
							onWordCountChange={setWordCount}
						/>
					</div>
					{/* Bottom editor toolbar and meta */}
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
