import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const openrouter = createOpenRouter({
	apiKey:
		"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",
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
