"use client";

import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type LayeredButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	intent?: "primary" | "pink";
	size?: "sm" | "md" | "lg";
	className?: string;
};

const sizeStyles: Record<NonNullable<LayeredButtonProps["size"]>, string> = {
	sm: "text-xs py-1.5 px-3 rounded-md",
	md: "text-sm py-2 px-4 rounded-lg",
	lg: "text-base py-3 px-6 rounded-xl",
};

const intentStyles: Record<
	NonNullable<LayeredButtonProps["intent"]>,
	{
		base: string;
		border: string;
		shadow: string;
		hover: string;
		ring: string;
	}
> = {
	primary: {
		base: "bg-indigo-600 text-white",
		border: "border-indigo-700",
		shadow: "shadow-[0_3px_0_#3730a3]",
		hover: "hover:bg-indigo-500",
		ring: "focus-visible:ring-indigo-600",
	},
	pink: {
		base: "bg-pink-500 text-white",
		border: "border-pink-700",
		shadow: "shadow-[0_4px_0_#9d174d]",
		hover: "hover:bg-pink-500/90",
		ring: "focus-visible:ring-pink-600",
	},
};

const LayeredButton = forwardRef<HTMLButtonElement, LayeredButtonProps>(
	(
		{ className, children, intent = "pink", size = "md", disabled, ...props },
		ref,
	) => {
		const palette = intentStyles[intent];
		return (
			<button
				ref={ref}
				disabled={disabled}
				className={cn(
					"font-semibold w-full relative transition-transform focus:outline-none",
					"flex items-center justify-center group/toggle-button",
					"focus-visible:ring-2 focus-visible:ring-offset-2",
					palette.ring,
					sizeStyles[size],
					palette.base,
					palette.border,
					palette.hover,
					"bg-clip-padding border border-b-2",
					palette.shadow,
					disabled
						? "opacity-60 cursor-not-allowed"
						: "active:translate-y-0.5 active:shadow-none",
					className,
				)}
				{...props}
			>
				{children}
			</button>
		);
	},
);

LayeredButton.displayName = "LayeredButton";

export default LayeredButton;
