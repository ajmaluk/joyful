import type { Message } from 'ai';
import React, { type RefCallback } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconSidebar } from '~/components/sidebar/IconSidebar';
import { HeroSection } from '~/components/home/HeroSection';
import { ProjectsDashboard } from '~/components/home/ProjectsDashboard';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Header } from '~/components/header/Header';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';

import styles from './BaseChat.module.scss';

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  setInput?: (value: string) => void;
}

const TEXTAREA_MIN_HEIGHT = 76;

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop,
      setInput,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex h-full w-full overflow-hidden bg-[#181816]',
        )}
        data-chat-visible={showChat}
      >
        {/* Sidebar - desktop inline, mobile slide-over */}
        {!chatStarted && showChat && <IconSidebar />}

        {/* Legacy Menu - Only show when chat started */}
        {chatStarted && <ClientOnly>{() => <Menu />}</ClientOnly>}

        <div ref={scrollRef} className="flex overflow-y-auto w-full h-full md:rounded-t-[2rem] lovable-gradient overflow-hidden">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow min-w-[var(--chat-min-width)] h-full')}>
            <Header />
            {/* Hero Section - Only show when chat not started */}
            {!chatStarted && showChat && (
              <div id="hero" className="flex-grow flex flex-col items-center justify-center pt-6 pb-6 md:pt-48 md:pb-16 w-full">
                <ClientOnly>
                  {() => (
                    <>
                      <HeroSection
                        textareaRef={textareaRef}
                        input={input}
                        isStreaming={isStreaming}
                        enhancingPrompt={enhancingPrompt}
                        handleInputChange={handleInputChange}
                        sendMessage={sendMessage}
                        enhancePrompt={enhancePrompt}
                        handleStop={handleStop}
                      />
                      <ProjectsDashboard
                        onSelectTemplate={(prompt) => {
                          setInput?.(prompt);
                          if (textareaRef?.current) {
                            textareaRef.current.focus();
                          }
                        }}
                        onRunTemplate={(prompt) => {
                          setInput?.(prompt);
                          // Trigger sending message after a tiny timeout to let the state update
                          setTimeout(() => {
                            sendMessage?.({} as any, prompt);
                          }, 50);
                        }}
                      />
                    </>
                  )}
                </ClientOnly>
              </div>
            )}

            {/* Chat Started View */}
            {chatStarted && (
              <div className="pt-6 px-6 h-full flex flex-col">
                <ClientOnly>
                  {() => {
                    return (
                      <Messages
                        ref={messageRef}
                        className="flex flex-col w-full flex-1 max-w-chat px-4 pb-6 mx-auto z-1"
                        messages={messages}
                        isStreaming={isStreaming}
                      />
                    );
                  }}
                </ClientOnly>

                {/* Prompt Input - Sticky at bottom when chat started */}
                <div
                  className={classNames('relative w-full max-w-chat mx-auto z-prompt', {
                    'sticky bottom-0': chatStarted,
                  })}
                >
                  <div
                    className={classNames(
                      'shadow-sm border border-bolt-elements-borderColor bg-bolt-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden',
                    )}
                  >
                    <textarea
                      ref={textareaRef}
                      className={`w-full pl-4 pt-4 pr-16 focus:outline-none resize-none text-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          if (event.shiftKey) {
                            return;
                          }
                          event.preventDefault();
                          sendMessage?.(event);
                        }
                      }}
                      value={input}
                      onChange={(event) => {
                        handleInputChange?.(event);
                      }}
                      style={{
                        minHeight: TEXTAREA_MIN_HEIGHT,
                        maxHeight: TEXTAREA_MAX_HEIGHT,
                      }}
                      placeholder="How can Joyful help you today?"
                      translate="no"
                    />
                    <ClientOnly>
                      {() => (
                        <SendButton
                          show={input.length > 0 || isStreaming}
                          isStreaming={isStreaming}
                          onClick={(event) => {
                            if (isStreaming) {
                              handleStop?.();
                              return;
                            }
                            sendMessage?.(event);
                          }}
                        />
                      )}
                    </ClientOnly>
                    <div className="flex justify-between text-sm p-4 pt-2">
                      <div className="flex gap-1 items-center">
                        <IconButton
                          title="Enhance prompt"
                          disabled={input.length === 0 || enhancingPrompt}
                          className={classNames({
                            'opacity-100!': enhancingPrompt,
                            'text-bolt-elements-item-contentAccent! pr-1.5 enabled:hover:bg-bolt-elements-item-backgroundAccent!':
                              promptEnhanced,
                          })}
                          onClick={() => enhancePrompt?.()}
                        >
                          {enhancingPrompt ? (
                            <>
                              <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl"></div>
                              <div className="ml-1.5">Enhancing prompt...</div>
                            </>
                          ) : (
                            <>
                              <div className="i-bolt:stars text-xl"></div>
                              {promptEnhanced && <div className="ml-1.5">Prompt enhanced</div>}
                            </>
                          )}
                        </IconButton>
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs text-bolt-elements-textTertiary">
                          Use <kbd className="kdb">Shift</kbd> + <kbd className="kdb">Return</kbd> for a new line
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-bolt-elements-background-depth-1 pb-6">{/* Ghost Element */}</div>
                </div>
              </div>
            )}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
        </div>
      </div>
    );
  },
);
