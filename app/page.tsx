"use client";

import type { EditorView } from "prosemirror-view";
import { useRef, useState } from "react";
import { Editor } from "@/components/Editor";
import { Cpu } from "@/components/icons";
import { Sparkle } from "@/components/icons/Sparkle";
import LayeredButton from "@/components/LayeredButton";
import Toolbar from "@/components/Toolbar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
	const viewRef = useRef<EditorView | null>(null);
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
	return (
		<div className="min-h-screen w-full flex bg-white">
			{/* Left editor area */}
			<div className="flex flex-col w-3/4">
				{/* Top bar */}
				<div className="h-14 flex items-center justify-between px-4">
					<div className="text-lg text-pink-700 font-bold">Flow Doc</div>
					<div className="flex items-center">
						<Tooltip>
							<TooltipTrigger asChild>
								<LayeredButton
									intent="pink"
									size="md"
									type="button"
									className="gap-1"
								>
									<Sparkle size="size-5" />
									<span>Complete Writing</span>
								</LayeredButton>
							</TooltipTrigger>
							<TooltipContent>Use AI to complete the writing</TooltipContent>
						</Tooltip>
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
