import { useEffect, useState } from 'react';
import {
  Settings, Palette, Code2, Brain, User, Gift,
  Moon, Sun, Monitor, Check, SlidersHorizontal, KeyRound, PlugZap, Eye,
  BookOpen, Plus, Pencil, Trash2, Save, X
} from 'lucide-react';
import type { UserSettings, UserSkill } from '@/types';
import * as storage from '@/services/storage';
import { defaultBuilderSkills } from '@/services/skills';
import { joyfulProviderConfig } from '@/services/joyfulProvider';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { signOutUser } from '@/services/firebase';
import { useLocation, useNavigate } from 'react-router-dom';

const categories = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code2 },
  { id: 'ai', label: 'AI Runtime', icon: Brain },
  { id: 'skills', label: 'Skills', icon: BookOpen },
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

const providerOptions = [
  { value: 'local', label: 'Local Lite', model: 'local-lite', description: 'Built-in free generator. No key needed.', badge: 'Included' },
  ...(joyfulProviderConfig.enabled ? [{
    value: 'joyful' as const,
    label: 'Joyful AI',
    model: joyfulProviderConfig.model,
    description: 'Limit Free Ai Provider',
    badge: 'Free',
  }] : []),
  { value: 'openai', label: 'OpenAI', model: 'gpt-4o', description: 'Strong general website generation and edits.', badge: 'API key' },
  { value: 'anthropic', label: 'Anthropic', model: 'claude-3-5-sonnet', description: 'Careful planning and long-form copy refinement.', badge: 'API key' },
  { value: 'openrouter', label: 'OpenRouter', model: 'openrouter/auto', description: 'Route to many hosted models from one account.', badge: 'API key' },
  { value: 'google', label: 'Google Gemini', model: 'gemini-1.5-pro', description: 'Fast multimodal-friendly generation path.', badge: 'API key' },
  { value: 'mistral', label: 'Mistral', model: 'mistral-large-latest', description: 'Efficient code and content generation.', badge: 'API key' },
  { value: 'groq', label: 'Groq', model: 'llama-3.1-70b-versatile', description: 'Low-latency iteration for quick edits.', badge: 'API key' },
] satisfies Array<{
  value: UserSettings['aiProvider'];
  label: string;
  model: string;
  description: string;
  badge: string;
}>;

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('general');
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [userSkills, setUserSkills] = useState<UserSkill[]>(() => storage.getUserSkills());
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState({ name: '', description: '', instructions: '' });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const previousPath = (location.state as { from?: string } | null)?.from;
  const previewIsDark = settings.theme === 'dark' || (settings.theme === 'system' && systemPrefersDark);
  const previewModeLabel = settings.theme === 'system'
    ? `System • ${previewIsDark ? 'Dark' : 'Light'}`
    : themeOptions.find((option) => option.value === settings.theme)?.label;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemPrefersDark(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const closeSettings = () => {
    navigate(previousPath && previousPath !== '/settings' ? previousPath : '/builder');
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    storage.saveSettings(next);
  };

  const activateProvider = (provider: UserSettings['aiProvider'], model: string) => {
    const hasKey = provider === 'joyful' || Boolean(settings.providerKeys?.[provider]?.trim());
    const next: UserSettings = {
      ...settings,
      aiProvider: provider,
      aiModel: model,
      connectedProviders: {
        ...settings.connectedProviders,
        [provider]: provider === 'local' || provider === 'joyful' || hasKey,
      },
    };
    setSettings(next);
    storage.saveSettings(next);
  };

  const updateProviderKey = (provider: UserSettings['aiProvider'], value: string) => {
    const next: UserSettings = {
      ...settings,
      providerKeys: {
        ...settings.providerKeys,
        [provider]: value,
      },
      connectedProviders: {
        ...settings.connectedProviders,
        [provider]: provider === 'local' || provider === 'joyful' || value.trim().length > 0,
      },
    };
    setSettings(next);
    storage.saveSettings(next);
  };

  const resetSkillDraft = () => {
    setEditingSkillId(null);
    setSkillDraft({ name: '', description: '', instructions: '' });
  };

  const persistUserSkills = (skills: UserSkill[]) => {
    setUserSkills(skills);
    storage.saveUserSkills(skills);
  };

  const saveSkillDraft = () => {
    const name = skillDraft.name.trim();
    const instructions = skillDraft.instructions.trim();
    if (!name || !instructions) return;

    const now = new Date().toISOString();
    if (editingSkillId) {
      persistUserSkills(userSkills.map(skill => (
        skill.id === editingSkillId
          ? { ...skill, name, description: skillDraft.description.trim(), instructions, updatedAt: now }
          : skill
      )));
    } else {
      persistUserSkills([
        ...userSkills,
        {
          id: `skill_${Date.now()}`,
          name,
          description: skillDraft.description.trim(),
          instructions,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    resetSkillDraft();
  };

  const startEditingSkill = (skill: UserSkill) => {
    setEditingSkillId(skill.id);
    setSkillDraft({
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
    });
  };

  const toggleSkill = (skillId: string) => {
    persistUserSkills(userSkills.map(skill => (
      skill.id === skillId ? { ...skill, enabled: !skill.enabled, updatedAt: new Date().toISOString() } : skill
    )));
  };

  const removeSkill = (skillId: string) => {
    persistUserSkills(userSkills.filter(skill => skill.id !== skillId));
    if (editingSkillId === skillId) resetSkillDraft();
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

            {/* Live theme preview */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Live Preview</span>
                </div>
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {previewModeLabel}
                </span>
              </div>
              <div className={`rounded-lg border p-4 transition-colors ${
                previewIsDark
                  ? 'border-white/10 bg-[#191a1f]'
                  : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <BrandLogo className="h-8 w-8 rounded-full" />
                  <div>
                    <p className={`text-sm font-semibold ${
                      previewIsDark ? 'text-gray-100' : 'text-gray-900'
                    }`}>Joyful Builder</p>
                    <p className={`text-xs ${
                      previewIsDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>Preview your theme</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={`flex-1 h-16 rounded-md ${
                    previewIsDark ? 'bg-[#25262c]' : 'bg-gray-100'
                  }`} />
                  <div className={`flex-1 h-16 rounded-md ${
                    previewIsDark ? 'bg-[#25262c]' : 'bg-gray-100'
                  }`} />
                  <div className={`flex-1 h-16 rounded-md ${
                    previewIsDark ? 'bg-[#25262c]' : 'bg-gray-100'
                  }`} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Theme</label>
                  <p className="mt-0.5 text-xs text-muted-foreground">Default is System, with Light and Dark available anytime.</p>
                </div>
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
        );

      case 'editor':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Editor Settings</h3>
              <p className="mt-1 text-sm text-muted-foreground">Customize your code editing experience.</p>
            </div>

            {/* Live editor preview */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Editor Preview</span>
              </div>
              <div className="rounded-lg bg-[#1e1e2e] p-4 font-mono text-sm">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-700">
                  <span className="text-xs text-gray-500">index.html</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{settings.editorFontSize}px</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">line-height: {settings.editorLineHeight}</span>
                </div>
                <div style={{ fontSize: `${settings.editorFontSize}px`, lineHeight: settings.editorLineHeight }}>
                  <div><span className="text-purple-400">&lt;!DOCTYPE</span> <span className="text-orange-300">html</span><span className="text-purple-400">&gt;</span></div>
                  <div><span className="text-purple-400">&lt;html</span> <span className="text-sky-300">lang</span>=<span className="text-green-300">"en"</span><span className="text-purple-400">&gt;</span></div>
                  <div className="pl-4"><span className="text-purple-400">&lt;head&gt;</span></div>
                  <div className="pl-8"><span className="text-gray-400">{'<!-- Your code here -->'}</span></div>
                  <div className="pl-4"><span className="text-purple-400">&lt;/head&gt;</span></div>
                  <div className="pl-4"><span className="text-purple-400">&lt;body&gt;</span></div>
                  <div className="pl-8"><span className="text-purple-400">&lt;h1</span> <span className="text-sky-300">class</span>=<span className="text-green-300">"title"</span><span className="text-purple-400">&gt;</span><span className="text-gray-200">Hello</span><span className="text-purple-400">&lt;/h1&gt;</span></div>
                  <div className="pl-4"><span className="text-purple-400">&lt;/body&gt;</span></div>
                  <div><span className="text-purple-400">&lt;/html&gt;</span></div>
                </div>
              </div>
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

            {/* Editor shortcuts reference */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Keyboard Shortcuts</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { keys: 'Ctrl+S', action: 'Save file' },
                  { keys: 'Ctrl+Z', action: 'Undo' },
                  { keys: 'Ctrl+Y', action: 'Redo' },
                  { keys: 'Shift+Alt+F', action: 'Format code' },
                  { keys: 'Ctrl+/', action: 'Toggle comment' },
                  { keys: 'Ctrl+D', action: 'Select next occurrence' },
                ].map(({ keys, action }) => (
                  <div key={keys} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span className="text-xs text-muted-foreground">{action}</span>
                    <kbd className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-foreground">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Runtime</h3>
              <p className="mt-1 text-sm text-muted-foreground">Choose the active builder brain and connect optional providers for richer generation.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <PlugZap className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground">Active provider</p>
                      <p className="text-xs text-muted-foreground">{providerOptions.find(option => option.value === settings.aiProvider)?.label} · {settings.aiModel}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
                    {settings.connectedProviders?.[settings.aiProvider] ? 'Connected' : 'Needs key'}
                  </span>
                </div>
                <div className="grid gap-3">
                  {providerOptions.map((provider) => {
                    const isActive = settings.aiProvider === provider.value;
                    const isConnected = provider.value === 'local' || provider.value === 'joyful' || Boolean(settings.connectedProviders?.[provider.value]);
                    return (
                      <div
                        key={provider.value}
                        className={`rounded-lg border p-4 transition-colors ${
                          isActive ? 'border-primary bg-primary/10' : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{provider.label}</p>
                              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{provider.badge}</span>
                              {isConnected && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">Connected</span>}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{provider.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => activateProvider(provider.value, provider.model)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border text-foreground hover:border-primary/50 hover:bg-accent'
                            }`}
                          >
                            {isActive ? 'Active' : 'Use'}
                          </button>
                        </div>
                        {provider.value !== 'local' && provider.value !== 'joyful' && (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="password"
                              value={settings.providerKeys?.[provider.value] || ''}
                              onChange={(event) => updateProviderKey(provider.value, event.target.value)}
                              placeholder={`${provider.label} API key`}
                              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {['Local mode stays available', 'Provider keys stay in browser storage', 'Manual files always editable', 'ZIP export remains free'].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </div>
                ))}
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

      case 'skills':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Skill Management</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add focused instructions the builder should apply during planning and file updates.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Brain className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Built-in skills</p>
                    <p className="text-xs text-muted-foreground">{defaultBuilderSkills.length} fixed skills run automatically</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Defaults cover React architecture, context graph file reading, code review, responsive UI, and preview readiness. They stay fixed and are not editable here.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">User skills</p>
                    <p className="text-xs text-muted-foreground">{userSkills.filter(skill => skill.enabled).length} active of {userSkills.length}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Use these for team-specific rules, preferred libraries, accessibility standards, or product constraints.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{editingSkillId ? 'Edit skill' : 'Add skill'}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">Short, specific skills work best.</p>
                </div>
                {editingSkillId && (
                  <button
                    type="button"
                    onClick={resetSkillDraft}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid gap-3">
                <input
                  value={skillDraft.name}
                  onChange={(event) => setSkillDraft(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="Skill name"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <input
                  value={skillDraft.description}
                  onChange={(event) => setSkillDraft(prev => ({ ...prev, description: event.target.value }))}
                  placeholder="Short description"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <textarea
                  value={skillDraft.instructions}
                  onChange={(event) => setSkillDraft(prev => ({ ...prev, instructions: event.target.value }))}
                  rows={4}
                  placeholder="Detailed instructions the AI should follow"
                  className="resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  type="button"
                  onClick={saveSkillDraft}
                  disabled={!skillDraft.name.trim() || !skillDraft.instructions.trim()}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {editingSkillId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingSkillId ? 'Save skill' : 'Add skill'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <h4 className="text-sm font-semibold text-foreground">Your skills</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">Only custom skills appear here. Built-in defaults remain protected.</p>
              </div>
              {userSkills.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No custom skills yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {userSkills.map((skill) => (
                    <div key={skill.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{skill.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            skill.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                          }`}>
                            {skill.enabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        {skill.description && <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>}
                        <p className="mt-2 max-h-16 overflow-hidden text-xs leading-relaxed text-muted-foreground">{skill.instructions}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {skill.enabled ? 'Pause' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingSkill(skill)}
                          aria-label={`Edit ${skill.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill.id)}
                          aria-label={`Delete ${skill.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-500/30 text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-foreground">Settings</h2>
                <p className="truncate text-xs text-muted-foreground">Workspace preferences</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeSettings}
              aria-label="Close settings"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-4 w-4" />
            </button>
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Settings</h2>
            <button
              type="button"
              onClick={closeSettings}
              aria-label="Close settings"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
        <div className="w-full max-w-none p-5 md:p-8 xl:px-10">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
