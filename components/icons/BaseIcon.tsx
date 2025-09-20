interface BaseIconProps {
	size?: string;
	children: React.ReactNode;
	className?: string;
}

export const BaseIcon = ({ size = "size-4", children }: BaseIconProps) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className={size}
			role="presentation"
		>
			{children}
		</svg>
	);
};
