"use client";

import Image from "next/image";
import { Cpu } from "@/components/icons";

export default function AgentPanel() {
	return (
		<aside className="border-l border-black/10 bg-[#fafafa] flex flex-col w-1/4">
			<div className="h-14 border-b border-black/10 px-4 flex items-center justify-center">
				<div className="h-9 px-3 justify-between items-center gap-2 rounded-md bg-pink-100 text-pink-700 border border-pink-200 text-xs font-medium flex">
					<Cpu />
					Agent
				</div>
			</div>
			<div className="flex-1 grid place-items-center">
				<div className="flex flex-col items-center gap-4">
					<Image src="/cook.png" alt="Cooks" width={180} height={180} />
					<div className="text-black/70 text-sm font-medium">
						I am still cooking this.
					</div>
					<div className="text-black/40 text-xs">
						More features coming soon.
					</div>
					<div className="text-black/40 text-xs">Made by Abhishek</div>
				</div>
			</div>
		</aside>
	);
}
