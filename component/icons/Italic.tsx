import { BaseIcon } from "./BaseIcon";

export const Italic = ({ size = 4 }: { size?: number }) => {
	return (
		<BaseIcon size={size}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M5.248 20.246H9.05m0 0h3.696m-3.696 0 5.893-16.502m0 0h-3.697m3.697 0h3.803"
			/>
		</BaseIcon>
	);
};
