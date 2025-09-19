import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const openrouter = createOpenRouter({
	apiKey: process.env.OPEN_ROUTER_KEY,
});

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json();

	const result = streamText({
		system:
			"You are a helpful assistant. Respond to the user in Markdown format.",
		model: openrouter.chat("google/gemini-2.0-flash-001"),
		messages: convertToModelMessages(messages),
	});
	console.log(result);
	return result.toUIMessageStreamResponse();
}
