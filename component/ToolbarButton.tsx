import type { ReactNode } from "react";

interface ToolbarButtonProps {
	onClick: () => void;
	children: ReactNode;
	className?: string;
}

export const ToolbarButton = ({
	onClick,
	children,
	className = "",
}: ToolbarButtonProps) => {
	return (
		<button
			type="button"
			onMouseDown={(e) => {
				e.preventDefault();
				onClick();
			}}
			className={`size-8 px-2 rounded border border-black/20 text-xs bg-gradient-to-bl from-white to-gray-50 ${className}`}
		>
			{children}
		</button>
	);
};
