import { memo } from 'react';
import { HomeInput } from './HomeInput';

interface HeroSectionProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  input?: string;
  isStreaming?: boolean;
  enhancingPrompt?: boolean;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  enhancePrompt?: () => void;
  handleStop?: () => void;
}

export const HeroSection = memo(
  ({
    textareaRef,
    input = '',
    isStreaming = false,
    enhancingPrompt = false,
    handleInputChange,
    sendMessage,
    enhancePrompt,
    handleStop,
  }: HeroSectionProps) => {
    return (
      <section className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 text-center my-6 md:my-10">
        {/* Heading - Pure white bold title to match screenshot exactly */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-10 tracking-tight max-w-full px-2 drop-shadow-sm whitespace-nowrap">
          Build something Joyful
        </h1>

        {/* Modular Prompt Input Component */}
        <HomeInput
          textareaRef={textareaRef}
          input={input}
          isStreaming={isStreaming}
          enhancingPrompt={enhancingPrompt}
          handleInputChange={handleInputChange}
          sendMessage={sendMessage}
          enhancePrompt={enhancePrompt}
          handleStop={handleStop}
        />

        {/* Spacer to balance the heading height and center the input container */}
        <div className="h-[76px] md:h-[100px] w-full" aria-hidden="true" />
      </section>
    );
  },
);

HeroSection.displayName = 'HeroSection';

