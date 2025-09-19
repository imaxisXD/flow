import { useHotkeys } from "react-hotkeys-hook";
import { Sparkle } from "./icons/Sparkle";
import LayeredButton from "./LayeredButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const AiButton = () => {
	useHotkeys(
		"mod+enter",
		() => {
			handleCompleteWriting();
		},
		{
			enableOnContentEditable: true,
			preventDefault: true,
			eventListenerOptions: { capture: true },
		},
	);

	const handleCompleteWriting = () => {
		alert("Key a was pressed");
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<LayeredButton
					intent="pink"
					size="md"
					type="button"
					className="gap-1"
					onClick={handleCompleteWriting}
				>
					<Sparkle size="size-5" />
					<span>Complete Writing</span>
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
			<TooltipContent>Use AI to complete the writing</TooltipContent>
		</Tooltip>
	);
};
