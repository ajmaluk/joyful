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

const ACCENT_COLORS = [
  { label: 'Blue', value: 'blue', color: '#2BA6FF' },
  { label: 'Purple', value: 'purple', color: '#A855F7' },
  { label: 'Pink', value: 'pink', color: '#EC4899' },
  { label: 'Green', value: 'green', color: '#22C55E' },
  { label: 'Orange', value: 'orange', color: '#F79009' },
];

export default function AppearanceSettings() {
  const theme = useStore(themeStore);

  return (
    <div className="space-y-5 sm:space-y-8 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Appearance</h1>
        <p className="text-xs sm:text-sm text-white/50">
          Customize how Joyful looks on your device.
        </p>
      </div>

      {/* Theme selection */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Theme</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-4 sm:mb-5">Select your preferred color theme.</p>
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
                : 'border-white/10 bg-white/5 hover:border-white/20',
            )}
          >
            <div className="w-full h-16 sm:h-20 rounded-lg bg-[#1a1a1a] border border-white/10 mb-2.5 sm:mb-3 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
                <div className="w-12 h-3 bg-white/10 rounded-full" />
              </div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-white">Dark</div>
            {theme === 'dark' && (
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="i-ph:check text-[9px] sm:text-[10px] text-white" />
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
                : 'border-white/10 bg-white/5 hover:border-white/20',
            )}
          >
            <div className="w-full h-16 sm:h-20 rounded-lg bg-[#f5f5f5] border border-gray-200 mb-2.5 sm:mb-3 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-white to-[#f0f0f0] flex items-center justify-center">
                <div className="w-12 h-3 bg-gray-200 rounded-full" />
              </div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-white">Light</div>
            {theme === 'light' && (
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="i-ph:check text-[9px] sm:text-[10px] text-white" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Accent color */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Accent Color</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-4 sm:mb-5">Choose your preferred accent color.</p>
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              className="group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-transparent hover:border-white/30 transition-all cursor-pointer"
              title={color.label}
              style={{ backgroundColor: color.color }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/20 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Font Size</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-4 sm:mb-5">Adjust the text size across the interface.</p>
        <div className="space-y-2">
          {FONT_SIZES.map((size) => (
            <label
              key={size.value}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="fontSize"
                  defaultChecked={size.value === 'medium'}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-xs sm:text-sm font-medium text-white">{size.label}</div>
                  <div className="text-[11px] sm:text-[13px] text-white/40">{size.desc}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Preview</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-4 sm:mb-5">See how your settings will look.</p>
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-5 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] sm:text-xs font-bold">
              U
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-white">User</div>
              <div className="text-[10px] sm:text-[11px] text-white/40">Just now</div>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-white/70 ml-9 sm:ml-11">
            This is a preview of how your messages will appear with the current settings applied.
          </div>
          <div className="ml-9 sm:ml-11 flex items-center space-x-2">
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/10 rounded-lg text-xs sm:text-[13px] text-white/60">
              Suggested reply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
