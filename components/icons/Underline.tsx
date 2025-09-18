import { BaseIcon } from "./BaseIcon";

export const Underline = ({ size = "size-4" }: { size?: string }) => {
	return (
		<BaseIcon size={size}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M17.995 3.744v7.5a6 6 0 1 1-12 0v-7.5m-2.25 16.502h16.5"
			/>
		</BaseIcon>
	);
};
