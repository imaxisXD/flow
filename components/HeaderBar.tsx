"use client";

import type { SnapshotFrom } from "xstate";
import { AiButton } from "@/components/AiButton";
import { Fire } from "@/components/icons";
import SaveStatusBadge from "@/components/SaveStatusBadge";
import type { autosaveMachine } from "@/machines/autosave-machine";

type Props = {
	saveState: SnapshotFrom<typeof autosaveMachine>;
	isStreaming: boolean;
	onStart: () => void;
	onStop: () => void;
	wordCount: number;
};

export default function HeaderBar({
	saveState,
	isStreaming,
	onStart,
	onStop,
	wordCount,
}: Props) {
	return (
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
					isStreaming={isStreaming}
					onStart={onStart}
					onStop={onStop}
					disabled={wordCount <= 3}
				/>
			</div>
		</div>
	);
}
