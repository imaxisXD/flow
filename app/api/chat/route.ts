import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const openrouter = createOpenRouter({
	apiKey: process.env.OPEN_ROUTER_KEY,
});

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json();

	const result = streamText({
		system: `You are a helpful assistant. Respond to the user in Markdown format.
			Write in the same tone and style, for example style is using markdown format, continue in the same format. 
     Do not add any preface or labels. 
     Start immediately with next line.
     Always try markdown format.
     If possible, write in the same language as the content.
     DON'T INCLUDE ANY PREFIX OR SUFFIX JUST DIRECTLY WRITE THE CONTENT FOR EXAMPLE "Write a blog on dogs" --> "Dogs are loyal and friendly".
	`,
		model: openrouter.chat("google/gemini-2.5-flash-lite"),
		messages: convertToModelMessages(messages),
	});
	console.log(result);
	return result.toUIMessageStreamResponse();
}
