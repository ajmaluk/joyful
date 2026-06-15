import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages } = await request.json<{ messages: Messages }>();

  const stream = new SwitchableStream();

  try {
    const options: StreamingOptions = {
      toolChoice: 'none',
      onFinish: async ({ text: content, finishReason }) => {
        try {
          if (finishReason !== 'length') {
            await stream.close();
            return;
          }

          if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
            console.error('Cannot continue message: Maximum segments reached');
            await stream.close();

            return;
          }

          const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

          console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

          messages.push({ role: 'assistant', content });
          messages.push({ role: 'user', content: CONTINUE_PROMPT });

          const result = await streamText(messages, context.cloudflare.env, options);

          await stream.switchSource(result.toAIStream());
        } catch (error) {
          console.error('Error in onFinish handler:', error);
        }
      },
    };

    const result = await streamText(messages, context.cloudflare.env, options);

    await stream.switchSource(result.toAIStream());

    return new Response(stream.readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
