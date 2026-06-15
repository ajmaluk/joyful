import type { Message } from 'ai';
import React, { type RefCallback, useState, useCallback, useRef, useEffect } from 'react';
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

import { HomeInput } from '~/components/home/HomeInput';

import { motion } from 'framer-motion';
import { cubicEasingFn } from '~/utils/easings';
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
    const [chatWidth, setChatWidth] = useState(380);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = chatWidth;
    }, [chatWidth]);

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - dragStartX.current;
        const newWidth = Math.min(600, Math.max(300, dragStartWidth.current + diff));
        setChatWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging]);

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex flex-col h-full w-full overflow-hidden',
          chatStarted ? 'bg-[#0a0a0a]' : 'bg-transparent'
        )}
        style={
          chatStarted
            ? ({
                '--chat-min-width': showChat ? `${chatWidth}px` : '0px',
                '--workbench-left': showChat ? `${chatWidth}px` : '0px',
                '--workbench-width': showChat ? `calc(100% - ${chatWidth}px)` : '100%',
                '--workbench-inner-width': showChat ? `calc(100% - ${chatWidth}px)` : '100%',
              } as React.CSSProperties)
            : undefined
        }
        data-chat-visible={showChat}
      >
        {/* Header - Only when chat started */}
        {chatStarted && <Header />}
        
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - desktop inline, mobile slide-over */}
          {!chatStarted && showChat && <IconSidebar />}

          {/* Chat Started View - Left Panel with Gradient */}
          {chatStarted && (
            <motion.div 
              className="sidebar-gradient flex flex-col h-full relative shrink-0 overflow-hidden"
              initial={{ width: showChat ? chatWidth : 0, opacity: showChat ? 1 : 0 }}
              animate={{
                width: showChat ? chatWidth : 0,
                opacity: showChat ? 1 : 0,
              }}
              transition={{ duration: 0.2, ease: cubicEasingFn }}
              style={{
                minWidth: showChat ? '300px' : '0px',
                maxWidth: '600px',
              }}
            >
              {/* Chat Scrollable Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 space-y-6">
                <ClientOnly>
                  {() => {
                    return (
                      <Messages
                        ref={messageRef}
                        className="z-1 flex w-full flex-1 flex-col"
                        messages={messages}
                        isStreaming={isStreaming}
                      />
                    );
                  }}
                </ClientOnly>
              </div>

              {/* Chat Input Area - Fixed at Bottom */}
              <HomeInput
                mode="chat"
                textareaRef={textareaRef}
                input={input}
                isStreaming={isStreaming}
                enhancingPrompt={enhancingPrompt}
                promptEnhanced={promptEnhanced}
                sendMessage={sendMessage}
                handleInputChange={handleInputChange}
                enhancePrompt={enhancePrompt}
                handleStop={handleStop}
              />

              {/* Resizable Divider Handle */}
              <div 
                className={classNames(
                  "hidden md:block w-1.5 h-full cursor-col-resize z-40 bg-black/20 border-x border-white/10 hover:bg-white/20 transition-colors absolute right-0 top-0",
                  isDragging ? "bg-white/30" : undefined
                )}
                onMouseDown={handleDragStart}
              />
            </motion.div>
          )}

          {/* Hero Section - Only show when chat not started */}
          {!chatStarted && showChat && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div id="hero" className="flex-grow flex flex-col items-center justify-center pt-6 pb-6 md:pt-48 md:pb-16 w-full min-h-full">
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
                          setTimeout(() => {
                            sendMessage?.({} as any, prompt);
                          }, 50);
                        }}
                      />
                    </>
                  )}
                </ClientOnly>
              </div>
            </div>
          )}

          {/* Workbench - Right Panel */}
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
        </div>
      </div>
    );
  },
);
