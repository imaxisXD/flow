import { BaseIcon } from "./BaseIcon";

export type HeadingVariant = "h1" | "h2" | "h3";

interface HeadingProps {
	variant: HeadingVariant;
	size?: string;
}

export const Heading = ({ variant, size = "size-4" }: HeadingProps) => {
	const getHeadingPath = () => {
		switch (variant) {
			case "h1":
				return "M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25";
			case "h2":
				return "M21.75 19.5H16.5v-1.609a2.25 2.25 0 0 1 1.244-2.012l2.89-1.445c.651-.326 1.116-.955 1.116-1.683 0-.498-.04-.987-.118-1.463-.135-.825-.835-1.422-1.668-1.489a15.202 15.202 0 0 0-3.464.12M2.243 4.492v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501";
			case "h3":
				return "M20.905 14.626a4.52 4.52 0 0 1 .738 3.603c-.154.695-.794 1.143-1.504 1.208a15.194 15.194 0 0 1-3.639-.104m4.405-4.707a4.52 4.52 0 0 0 .738-3.603c-.154-.696-.794-1.144-1.504-1.209a15.19 15.19 0 0 0-3.639.104m4.405 4.708H18M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501";
			default:
				return "M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25";
		}
	};

	return (
		<BaseIcon size={size}>
			<path strokeLinecap="round" strokeLinejoin="round" d={getHeadingPath()} />
		</BaseIcon>
	);
};
