import { useStore } from '@nanostores/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { themeStore, toggleTheme } from '~/lib/stores/theme';
import { classNames } from '~/utils/classNames';

export const meta: MetaFunction = () => {
  return [
    { title: 'Appearance — Joyful Settings' },
    { name: 'description', content: 'Customize the look and feel of Joyful' },
  ];
};

const FONT_SIZES = [
  { label: 'Small', value: 'small', desc: 'Compact text for more content' },
  { label: 'Medium', value: 'medium', desc: 'Default text size' },
  { label: 'Large', value: 'large', desc: 'Larger text for easier reading' },
];



export default function AppearanceSettings() {
  const theme = useStore(themeStore);

  return (
    <div className="space-y-5 sm:space-y-8 w-full">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--theme-text-primary)] mb-1">Appearance</h1>
        <p className="text-xs sm:text-sm text-[var(--theme-text-muted)]">
          Customize how Joyful looks on your device.
        </p>
      </div>

      {/* Theme selection */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-1">Theme</h2>
        <p className="text-xs sm:text-[13px] text-[var(--theme-text-muted)] mb-4 sm:mb-5">Select your preferred color theme.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dark theme */}
          <button
            onClick={() => {
              if (theme !== 'dark') toggleTheme();
            }}
            className={classNames(
              'relative p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer text-left bg-transparent',
              theme === 'dark'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[var(--theme-border-subtle)] bg-[var(--theme-hover-bg)] hover:border-[var(--theme-border-strong)]',
            )}
          >
            <div className="w-full h-16 sm:h-20 rounded-lg bg-[#1a1a1a] border border-[var(--theme-border-subtle)] mb-2.5 sm:mb-3 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
                <div className="w-12 h-3 bg-white/10 rounded-full" />
              </div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Dark</div>
            {theme === 'dark' && (
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="i-ph:check text-[9px] sm:text-[10px] text-[var(--theme-text-primary)]" />
              </div>
            )}
          </button>

          {/* Light theme */}
          <button
            onClick={() => {
              if (theme !== 'light') toggleTheme();
            }}
            className={classNames(
              'relative p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer text-left bg-transparent',
              theme === 'light'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[var(--theme-border-subtle)] bg-[var(--theme-hover-bg)] hover:border-[var(--theme-border-strong)]',
            )}
          >
            <div className="w-full h-16 sm:h-20 rounded-lg bg-[#f5f5f5] border border-gray-200 mb-2.5 sm:mb-3 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-white to-[#f0f0f0] flex items-center justify-center">
                <div className="w-12 h-3 bg-gray-200 rounded-full" />
              </div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">Light</div>
            {theme === 'light' && (
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="i-ph:check text-[9px] sm:text-[10px] text-[var(--theme-text-primary)]" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Font size */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-1">Font Size</h2>
        <p className="text-xs sm:text-[13px] text-[var(--theme-text-muted)] mb-4 sm:mb-5">Adjust the text size across the interface.</p>
        <div className="space-y-2">
          {FONT_SIZES.map((size) => (
            <label
              key={size.value}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-[var(--theme-border-subtle)] hover:bg-[var(--theme-hover-bg)] transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="fontSize"
                  defaultChecked={size.value === 'medium'}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">{size.label}</div>
                  <div className="text-[11px] sm:text-[13px] text-[var(--theme-text-muted)]">{size.desc}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-[var(--theme-hover-bg)] border border-[var(--theme-border-subtle)] rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--theme-text-primary)] mb-1">Preview</h2>
        <p className="text-xs sm:text-[13px] text-[var(--theme-text-muted)] mb-4 sm:mb-5">See how your settings will look.</p>
        <div className="bg-[var(--theme-hover-bg)] rounded-xl border border-[var(--theme-border-subtle)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-[var(--theme-text-primary)] text-[11px] sm:text-xs font-bold">
              U
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-[var(--theme-text-primary)]">User</div>
              <div className="text-[10px] sm:text-[11px] text-[var(--theme-text-muted)]">Just now</div>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-[var(--theme-text-primary)]/70 ml-9 sm:ml-11">
            This is a preview of how your messages will appear with the current settings applied.
          </div>
          <div className="ml-9 sm:ml-11 flex items-center space-x-2">
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/10 rounded-lg text-xs sm:text-[13px] text-[var(--theme-text-primary)]/60">
              Suggested reply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
