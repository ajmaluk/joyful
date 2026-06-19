import type { MetaFunction } from '@remix-run/cloudflare';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Account — Joyful Settings' },
    { name: 'description', content: 'Manage your Joyful account settings' },
  ];
};

export default function AccountSettings() {
  const [chatSuggestions, setChatSuggestions] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 sm:space-y-8 w-full">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--theme-text-primary)] mb-1">Account Settings</h1>
        <p className="text-xs sm:text-sm text-[var(--theme-text-primary)]/50">
          Personalize how others see and interact with you on Joyful.
        </p>
      </div>

      {/* Account info */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-3 sm:mb-4">Account Details</h2>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-3 border-b border-[var(--theme-border-subtle)] gap-1.5 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Account ID</div>
              <div className="text-[11px] sm:text-[13px] text-[var(--theme-text-muted)]">Your unique account identifier</div>
            </div>
            <div className="text-xs sm:text-sm text-[var(--theme-text-muted)] font-mono self-start sm:self-auto">usr_joyful_001</div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-3 border-b border-[var(--theme-border-subtle)] gap-1.5 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Plan</div>
              <div className="text-[11px] sm:text-[13px] text-[var(--theme-text-muted)]">Current subscription plan</div>
            </div>
            <div className="px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full self-start sm:self-auto">
              Free
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-3 gap-1.5 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Created</div>
              <div className="text-[11px] sm:text-[13px] text-[var(--theme-text-muted)]">When your account was created</div>
            </div>
            <div className="text-xs sm:text-sm text-[var(--theme-text-muted)] self-start sm:self-auto">Jun 15, 2026</div>
          </div>
        </div>
      </div>

      {/* Chat preferences */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-3 sm:mb-4">Chat Preferences</h2>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Chat Suggestions</div>
              <div className="text-[11px] sm:text-[13px] text-[var(--theme-text-muted)]">
                Show helpful suggestions in the chat interface to enhance your experience.
              </div>
            </div>
            <button
              onClick={() => setChatSuggestions(!chatSuggestions)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer border-none p-0 self-start sm:self-auto ${
                chatSuggestions ? 'bg-blue-600' : 'bg-[var(--theme-active-bg)]'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  chatSuggestions ? 'translate-x-[22px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-3 sm:mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 sm:py-2 gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-[var(--theme-text-secondary)]">Toggle terminal</span>
            <div className="flex items-center space-x-1 self-start sm:self-auto">
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                J
              </kbd>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 sm:py-2 gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-[var(--theme-text-secondary)]">Toggle sidebar</span>
            <div className="flex items-center space-x-1 self-start sm:self-auto">
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                B
              </kbd>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 sm:py-2 gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-[var(--theme-text-secondary)]">New chat</span>
            <div className="flex items-center space-x-1 self-start sm:self-auto">
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] sm:text-[11px] text-[var(--theme-text-muted)] bg-[var(--theme-hover-bg)] border border-[var(--theme-border-default)] rounded font-mono">
                N
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-start md:justify-end pb-8">
        <button
          onClick={handleSave}
          className="px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-medium text-[var(--theme-text-primary)] bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
        >
          {saved ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="i-ph:check text-xs sm:text-sm" />
              <span>Saved</span>
            </div>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  );
}
