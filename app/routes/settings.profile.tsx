import type { MetaFunction } from '@remix-run/cloudflare';
import { useNavigate } from '@remix-run/react';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Profile — Joyful Settings' },
    { name: 'description', content: 'Manage your Joyful profile' },
  ];
};

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('User');
  const [username, setUsername] = useState('user');
  const [email, setEmail] = useState('user@joyful.uthakkan.in');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    // Clear any stored auth data
    localStorage.removeItem('bolt_theme');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="space-y-5 sm:space-y-8 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Profile</h1>
        <p className="text-xs sm:text-sm text-white/50">
          Manage your public profile and account settings.
        </p>
      </div>

      {/* Profile avatar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Profile Photo</h2>
        <div className="flex items-center space-x-4 sm:space-x-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <button className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition-colors cursor-pointer">
              Change avatar
            </button>
            <p className="text-[10px] sm:text-[11px] text-white/30 mt-1.5">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Display Name</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-3 sm:mb-4">This is your public display name.</p>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          placeholder="Your display name"
        />
      </div>

      {/* Username */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Username</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-3 sm:mb-4">Your public identifier and profile URL.</p>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs sm:text-sm hidden sm:inline">joyful.uthakkan.in/</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full sm:pl-[160px] px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              placeholder="username"
            />
          </div>
          <button className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition-colors cursor-pointer shrink-0">
            Update
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Email</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-3 sm:mb-4">Your email address associated with your account.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          placeholder="your@email.com"
        />
      </div>

      {/* Profile visibility */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-white mb-1">Profile Visibility</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-3 sm:mb-4">Control who can see your public profile.</p>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="radio"
              name="visibility"
              checked={profileVisibility === 'public'}
              onChange={() => setProfileVisibility('public')}
              className="mt-0.5 accent-blue-500"
            />
            <div>
              <div className="text-xs sm:text-sm font-medium text-white group-hover:text-white/90 transition-colors">Public</div>
              <div className="text-[11px] sm:text-[13px] text-white/40">Your profile is visible to everyone</div>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="radio"
              name="visibility"
              checked={profileVisibility === 'private'}
              onChange={() => setProfileVisibility('private')}
              className="mt-0.5 accent-blue-500"
            />
            <div>
              <div className="text-xs sm:text-sm font-medium text-white group-hover:text-white/90 transition-colors">Private</div>
              <div className="text-[11px] sm:text-[13px] text-white/40">Your profile is hidden from public view</div>
            </div>
          </label>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white/5 border border-red-500/20 rounded-xl p-4 sm:p-5 md:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-red-400 mb-1">Account Management</h2>
        <p className="text-xs sm:text-[13px] text-white/40 mb-3 sm:mb-4">Manage your account data and session.</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center space-x-2">
              <div className="i-ph:sign-out text-xs sm:text-sm" />
              <span>Log out</span>
            </div>
          </button>
          <button className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
            <div className="flex items-center justify-center space-x-2">
              <div className="i-ph:download-simple text-xs sm:text-sm" />
              <span>Export data</span>
            </div>
          </button>
          <button className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
            <div className="flex items-center justify-center space-x-2">
              <div className="i-ph:trash text-xs sm:text-sm" />
              <span>Delete account</span>
            </div>
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-start md:justify-end pb-8">
        <button
          onClick={handleSave}
          className="px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
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
