import { CheckCircle, Loader } from "lucide-react";
import type { SnapshotFrom } from "xstate";
import type { autosaveMachine } from "@/machines/autosave-machine";

type Props = { saveState: SnapshotFrom<typeof autosaveMachine> };

export default function SaveStatusBadge({ saveState }: Props) {
	return (
		<>
			{saveState.matches("saved") && (
				<span className="text-xs flex items-center gap-1 border border-emerald-400 text-green-500 rounded-full px-3 py-0.5">
					<CheckCircle className="size-3" />
					Saved
				</span>
			)}
			{(saveState.matches("dirty") || saveState.matches("saving")) && (
				<span className="text-xs border flex items-center gap-1 border-amber-400 text-amber-600 rounded-full px-3 py-0.5">
					<Loader className="size-3 animate-spin" />
					Saving
				</span>
			)}
			{saveState.matches("error") && (
				<span className="text-xs border border-red-400 text-red-600 rounded-full px-3 py-0.5">
					Save Error
				</span>
			)}
		</>
	);
}
