import { useState } from 'react';
import {
  Settings, Palette, Code2, Brain, User, Gift,
  Moon, Sun, Monitor, Check, ShieldCheck, Zap, SlidersHorizontal
} from 'lucide-react';
import type { UserSettings } from '@/types';
import * as storage from '@/services/storage';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/services/firebase';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code2 },
  { id: 'ai', label: 'AI Runtime', icon: Brain },
  { id: 'account', label: 'Account', icon: User },
  { id: 'billing', label: 'Free Plan', icon: Gift },
];

const themeOptions = [
  { value: 'system', label: 'System', description: 'Follow this device', icon: Monitor },
  { value: 'light', label: 'Light', description: 'Bright workspace', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-light workspace', icon: Moon },
] satisfies Array<{
  value: UserSettings['theme'];
  label: string;
  description: string;
  icon: typeof Monitor;
}>;

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('general');
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    storage.saveSettings(next);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">General Settings</h3>
              <p className="mt-1 text-sm text-muted-foreground">Keep everyday editing behavior quiet and predictable.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-6 border-b border-border p-5">
                <div className="flex-1">
                  <label className="text-sm font-medium text-card-foreground">Auto-save</label>
                  <p className="text-xs text-muted-foreground mt-1">Automatically save changes to files</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('autoSave', !settings.autoSave)}
                  aria-pressed={settings.autoSave}
                  className={`relative h-7 w-12 rounded-full p-1 transition-all duration-300 ${
                    settings.autoSave 
                      ? 'bg-[#6387ff]' 
                      : 'bg-muted'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                    settings.autoSave ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-6 p-5">
                <div className="flex-1">
                  <label className="text-sm font-medium text-card-foreground">Live Preview Auto-refresh</label>
                  <p className="text-xs text-muted-foreground mt-1">Automatically refresh preview on file changes</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('livePreview', !settings.livePreview)}
                  aria-pressed={settings.livePreview}
                  className={`relative h-7 w-12 rounded-full p-1 transition-all duration-300 ${
                    settings.livePreview 
                      ? 'bg-[#6387ff]' 
                      : 'bg-muted'
                  }`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                    settings.livePreview ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Appearance</h3>
              <p className="mt-1 text-sm text-muted-foreground">Choose how Joyful should adapt across work sessions.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-sm font-medium text-card-foreground">Theme</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Default is System, with Light and Dark available anytime.</p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {themeOptions.find((option) => option.value === settings.theme)?.label}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = settings.theme === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateSetting('theme', option.value as UserSettings['theme'])}
                        className={`relative flex min-h-32 flex-col items-start justify-between rounded-lg border p-4 text-left transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-foreground shadow-xs'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-foreground">{option.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                        </span>
                        {selected && (
                          <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Editor Settings</h3>
              <p className="mt-1 text-sm text-muted-foreground">Customize your code editing experience.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-card-foreground">Font Size</label>
                  <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{settings.editorFontSize}px</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={10}
                    max={20}
                    value={settings.editorFontSize}
                    onChange={(e) => updateSetting('editorFontSize', parseInt(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-card-foreground">Line Height</label>
                  <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">{settings.editorLineHeight}</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={12}
                    max={24}
                    value={Math.round(settings.editorLineHeight * 10)}
                    onChange={(e) => updateSetting('editorLineHeight', parseInt(e.target.value) / 10)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Compact</span>
                    <span>Spacious</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Runtime</h3>
              <p className="mt-1 text-sm text-muted-foreground">Joyful runs in free local mode by default. No paid API key is required.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">Local Lite generator</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Uses the built-in free generator for website drafts and edits. Project files stay in browser storage.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">Active</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {['No OpenAI key required', 'No Anthropic key required', 'No E2B sandbox cost', 'Export static files'].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 opacity-75">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-card-foreground">Optional API mode</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Paid AI providers can be added later as an advanced option, but the current product experience stays free.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-card-foreground">AI Temperature</label>
                  <span className="rounded-lg bg-[#6387ff]/10 px-3 py-1.5 text-sm font-semibold text-[#6387ff]">{settings.aiTemperature}</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.aiTemperature * 100)}
                    onChange={(e) => updateSetting('aiTemperature', parseInt(e.target.value) / 100)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[#6387ff]"
                  />
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Account</h3>
              <p className="mt-1 text-sm text-muted-foreground">Firebase profile details for your Joyful workspace.</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-card-foreground">{user?.displayName || 'Joyful user'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email || 'No email on this account'}</p>
                </div>
              </div>
              <div className="border-b border-border p-4">
                <label className="text-sm font-medium text-card-foreground mb-2 block">Display Name</label>
                <input
                  type="text"
                  value={user?.displayName || ''}
                  readOnly
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="p-4">
                <label className="text-sm font-medium text-card-foreground mb-2 block">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void signOutUser().then(() => navigate('/'));
              }}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
            >
              Sign out
            </button>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Free Plan</h3>
              <p className="mt-1 text-sm text-muted-foreground">Everything here is available without a subscription.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Current Mode</p>
                  <p className="text-xs text-muted-foreground">Free forever. No subscription required.</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[11px] font-medium rounded-full">
                  Active
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {['Unlimited local projects', 'Local browser storage', 'Sandbox preview', 'ZIP export'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Settings sidebar */}
      <div className="hidden w-64 border-r border-border bg-card/60 py-5 md:block">
        <div className="mb-5 px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Settings</h2>
              <p className="text-xs text-muted-foreground">Workspace preferences</p>
            </div>
          </div>
        </div>
        <nav className="space-y-0.5 px-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeCategory === cat.id
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card/40 p-4 md:hidden">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${
                    activeCategory === cat.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-auto max-w-3xl p-5 md:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
