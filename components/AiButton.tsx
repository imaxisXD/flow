import { Loader } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { Sparkle } from "./icons/Sparkle";
import LayeredButton from "./LayeredButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AiButtonProps {
	isStreaming?: boolean;
	onStart?: () => void;
	onStop?: () => void;
	disabled?: boolean;
}

export const AiButton = ({
	isStreaming,
	onStart,
	onStop,
	disabled,
}: AiButtonProps) => {
	useHotkeys(
		"mod+enter",
		() => {
			if (disabled) return;
			if (isStreaming) {
				if (onStop) onStop();
			} else {
				if (onStart) onStart();
			}
		},
		{
			enableOnContentEditable: true,
			preventDefault: true,
			eventListenerOptions: { capture: true },
		},
	);

	const handleClick = () => {
		if (isStreaming) {
			if (onStop) onStop();
		} else {
			if (onStart) onStart();
		}
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<LayeredButton
					intent="pink"
					size="md"
					type="button"
					className="flex items-center justify-around"
					onClick={handleClick}
					disabled={disabled}
				>
					<div className="flex items-center gap-1">
						{isStreaming ? (
							<Loader className="size-4 animate-spin" />
						) : (
							<Sparkle size="size-5" />
						)}
						<span>{isStreaming ? "Stop" : "Complete Writing"}</span>
					</div>
					<div className="flex items-center gap-0.5 ml-2">
						<kbd className="font-normal inline-flex h-5 min-w-5 px-1 select-none items-center justify-center rounded-md text-base bg-white/40 text-white/90 uppercase">
							⌘
						</kbd>
						<kbd className="font-normal inline-flex h-5 min-w-5 px-1 select-none items-center justify-center rounded-md text-base bg-white/40 text-white/90 uppercase">
							↩
						</kbd>
					</div>
				</LayeredButton>
			</TooltipTrigger>
			<TooltipContent>
				{disabled
					? "We need at least 3 words to help you with the writing"
					: isStreaming
						? "Stop streaming"
						: "Use AI to complete the writing"}
			</TooltipContent>
		</Tooltip>
	);
};
