import type { Message } from 'ai';
import React from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage, sanitizeUserMessage } from './UserMessage';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(sanitizeUserMessage(content));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, content } = message;
            const isUserMessage = role === 'user';
            const isFirst = index === 0;
            const isLast = index === messages.length - 1;

            return (
              <div
                key={index}
                className={classNames('flex w-full transition-all min-w-0', {
                  'justify-end': isUserMessage,
                  'justify-start bg-transparent': !isUserMessage,
                  'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                    !isUserMessage && isStreaming && isLast,
                  'mt-2': !isFirst,
                })}
              >
                <div
                  className={classNames('flex flex-col min-w-0', {
                    'max-w-[70%]': isUserMessage,
                    'max-w-[94%] w-full': !isUserMessage,
                  })}
                >
                  {isUserMessage ? (
                    <div className="group flex flex-col items-end min-w-0 max-w-full">
                      <div className="border border-white/10 bg-[#202023] shadow-md p-3 px-4 text-white text-[13px] rounded-2xl min-w-0 max-w-full break-words">
                        <UserMessage content={content} />
                      </div>
                      <div className="flex justify-end mt-1 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mr-2">
                        <button
                          onClick={() => handleCopy(content, index)}
                          className="text-white/40 hover:text-white/80 p-0.5 hover:bg-white/5 rounded transition-all border-none bg-transparent cursor-pointer flex items-center gap-1"
                          title="Copy message"
                        >
                          <div className={copiedIndex === index ? "i-ph:check text-[10px] text-green-500" : "i-ph:copy text-[10px]"} />
                          <span className="text-[9px] font-medium">{copiedIndex === index ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="gap-4 py-0.5 ml-2 mr-2 w-full min-w-0">
                      <AssistantMessage content={content} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        : null}
      {isStreaming && (
        <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
      )}
    </div>
  );
});

