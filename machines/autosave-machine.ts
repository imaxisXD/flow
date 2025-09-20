import { assign, createMachine, fromPromise } from "xstate";

export interface AutosaveContext {
	content: string;
	savedContent: string | null;
	error?: string;
}

type ChangeEvent = { type: "CHANGE"; content: string };

export const autosaveMachine = createMachine(
	{
		id: "autosave",
		types: {} as {
			context: AutosaveContext;
			events: ChangeEvent;
		},
		context: { content: "", savedContent: null, error: undefined },
		initial: "idle",
		states: {
			idle: {
				on: {
					CHANGE: {
						target: "dirty",
						actions: assign({
							content: ({ event }) => event.content,
						}),
					},
				},
			},
			dirty: {
				on: {
					CHANGE: {
						target: "dirty",
						reenter: true,
						actions: assign({
							content: ({ event }) => event.content,
						}),
					},
				},
				after: {
					750: { target: "saving" },
				},
			},
			saving: {
				invoke: {
					src: "save",
					input: ({ context }) => ({ content: context.content }),
					onDone: {
						target: "saved",
						actions: assign({
							savedContent: ({ event }) => event.output.content,
							error: () => undefined,
						}),
					},
					onError: {
						target: "error",
						actions: assign({
							error: ({ event }) =>
								(event.error as Error)?.message ?? "Save failed",
						}),
					},
				},
				on: {
					CHANGE: {
						actions: assign({
							content: ({ event }) => event.content,
						}),
					},
				},
			},
			saved: {
				always: [
					{
						guard: ({ context }) => context.content !== context.savedContent,
						target: "dirty",
					},
				],
				after: { 1000: { target: "idle" } },
				on: {
					CHANGE: {
						target: "dirty",
						actions: assign({
							content: ({ event }) => event.content,
						}),
					},
				},
			},
			error: {
				on: {
					CHANGE: {
						target: "dirty",
						actions: assign({
							content: ({ event }) => event.content,
						}),
					},
				},
				after: { 2000: { target: "idle" } },
			},
		},
	},
	{
		actors: {
			save: fromPromise(async ({ input }) => {
				const { content } = input as { content: string };
				if (typeof window !== "undefined") {
					try {
						window.localStorage.setItem("flow-doc", content);
					} catch {}
				}
				return { ok: true, content };
			}),
		},
	},
);
