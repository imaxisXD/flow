import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ToolbarButtonProps {
	onClick: () => void;
	children: ReactNode;
	className?: string;
	tooltip: string;
	shortcut?: string | string[];
	active?: boolean;
}

export const ToolbarButton = ({
	onClick,
	children,
	className = "",
	tooltip,
	shortcut,
	active = false,
}: ToolbarButtonProps) => {
	function toSymbol(key: string) {
		const normalized = key.trim().toLowerCase();
		switch (normalized) {
			case "cmd":
			case "command":
				return "⌘";
			case "shift":
				return "⇧";
			case "alt":
			case "option":
			case "opt":
				return "⌥";
			case "ctrl":
			case "control":
				return "⌃";
			case "enter":
			case "return":
				return "↩";
			case "esc":
			case "escape":
				return "⎋";
			case "backspace":
				return "⌫";
			case "delete":
				return "⌦";
			case "tab":
				return "⇥";
			case "up":
				return "↑";
			case "down":
				return "↓";
			case "left":
				return "←";
			case "right":
				return "→";
			default:
				return key.length === 1 ? key.toUpperCase() : key;
		}
	}

	function normalize(shortcutValue?: string | string[]) {
		if (!shortcutValue) return [] as string[];
		if (Array.isArray(shortcutValue)) return shortcutValue;
		// Try to split common delimiters, otherwise fall back to per-char
		const delimiters = ["+", "-", " "]; // e.g. Cmd+K, Cmd-K, Cmd K
		for (const d of delimiters) {
			if (shortcutValue.includes(d)) {
				return shortcutValue
					.split(d)
					.map((s) => s.trim())
					.filter(Boolean);
			}
		}
		return shortcutValue.split("").filter(Boolean);
	}

	const keys = normalize(shortcut);
	const keyDescriptors = (() => {
		const seen: Record<string, number> = {};
		return keys.map((k) => {
			const count = (seen[k] ?? 0) + 1;
			seen[k] = count;
			return { id: `${k}-${count}`, display: toSymbol(k) };
		});
	})();
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						onClick();
					}}
					className={`size-8 px-2 rounded border text-xs bg-gradient-to-bl ${
						active
							? "border-pink-300 from-pink-50 to-pink-100 text-pink-700"
							: "border-black/20 from-white to-gray-50"
					} ${className}`}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent>
				<div className="flex items-center gap-2">
					<p>{tooltip}</p>
					{keyDescriptors.length > 0 && (
						<div className="ml-1 flex items-center gap-1 text-[10px]">
							{keyDescriptors.map((d) => (
								<kbd
									key={d.id}
									className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-medium leading-none backdrop-blur"
								>
									{d.display}
								</kbd>
							))}
						</div>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	);
};
