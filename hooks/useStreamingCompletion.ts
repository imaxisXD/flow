"use client";

import { useChat } from "@ai-sdk/react";
import {
	defaultMarkdownParser,
	defaultMarkdownSerializer,
	MarkdownParser,
} from "prosemirror-markdown";
import { Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function useStreamingCompletion(viewRef: RefObject<EditorView | null>) {
	const appendStartPosRef = useRef<number | null>(null);
	const lastInsertedLenRef = useRef<number>(0);
	const streamedMarkdownRef = useRef<string>("");
	const separatorAddedRef = useRef<boolean>(false);

	const { messages, sendMessage, stop, status } = useChat();

	useEffect(() => {
		if (status !== "streaming") return;
		const view = viewRef.current;
		if (!view) return;

		const lastAssistant = [...messages]
			.reverse()
			.find((m) => m.role === "assistant");
		if (!lastAssistant) return;

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
	}, [messages, status, viewRef]);

	const finalizeStreamingIntoEditor = useCallback(() => {
		const view = viewRef.current;
		if (!view) return;

		if (
			streamedMarkdownRef.current.length === 0 &&
			separatorAddedRef.current &&
			appendStartPosRef.current !== null
		) {
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
				console.log("Markdown parsing failed, keeping plain text", _err);
			}
		}

		appendStartPosRef.current = null;
		lastInsertedLenRef.current = 0;
		streamedMarkdownRef.current = "";
		separatorAddedRef.current = false;
	}, [viewRef]);

	const prevStatusRef = useRef(status);
	useEffect(() => {
		if (prevStatusRef.current === "streaming" && status === "ready") {
			finalizeStreamingIntoEditor();
		} else if (status === "error") {
			finalizeStreamingIntoEditor();
		}
		prevStatusRef.current = status;
	}, [status, finalizeStreamingIntoEditor]);

	const startStreamingCompletion = useCallback(() => {
		if (status === "streaming") return;
		const view = viewRef.current;
		if (!view) return;

		const editorMarkdown = defaultMarkdownSerializer.serialize(view.state.doc);
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

		lastInsertedLenRef.current = 0;
		streamedMarkdownRef.current = "";
		separatorAddedRef.current = false;
	}, [sendMessage, status, viewRef]);

	const stopStreaming = useCallback(() => {
		if (status === "submitted" || status === "streaming") {
			stop();

			finalizeStreamingIntoEditor();
		}
	}, [status, stop, finalizeStreamingIntoEditor]);

	const isStreaming = useMemo(
		() => status === "streaming" || status === "submitted",
		[status],
	);

	return {
		isStreaming,
		startStreamingCompletion,
		stopStreaming,
	};
}
