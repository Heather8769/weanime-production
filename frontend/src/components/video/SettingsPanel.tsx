'use client';

import { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon, 
  SpeakerWaveIcon, 
  EyeIcon, 
  PlayIcon,
  CommandLineIcon as KeyboardIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/solid';
import { PlayerState, PlayerActions } from '@/lib/types/episodes';
import { useAuth } from '@/lib/hooks/useAuth';
import { playerSettings } from '@/lib/supabase/episodes';

interface SettingsPanelProps {
  playerState: PlayerState;
  playerActions: PlayerActions;
  onClose: () => void;
}

interface PlayerPreferences {
  autoPlayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  defaultSubtitleLanguage?: string;
  playbackSpeed: number;
  volume: number;
  keyboardShortcuts: boolean;
  pictureInPicture: boolean;
  notifications: boolean;
  theme: 'dark' | 'light' | 'auto';
}

export default function SettingsPanel({
  playerState,
  playerActions,
  onClose
}: SettingsPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'playback' | 'audio' | 'subtitles' | 'controls' | 'accessibility'>('playback');
  const [preferences, setPreferences] = useState<PlayerPreferences>({
    autoPlayNext: true,
    skipIntro: false,
    skipOutro: false,
    defaultSubtitleLanguage: undefined,
    playbackSpeed: 1,
    volume: 1,
    keyboardShortcuts: true,
    pictureInPicture: true,
    notifications: true,
    theme: 'dark'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const { data: settings } = await playerSettings.get(user.id);
      if (settings) {
        setPreferences({
          autoPlayNext: settings.autoPlayNext,
          skipIntro: settings.skipIntro,
          skipOutro: settings.skipOutro,
          defaultSubtitleLanguage: settings.defaultSubtitleLanguage || undefined,
          playbackSpeed: settings.playbackSpeed,
          volume: settings.volume,
          keyboardShortcuts: settings.keyboardShortcuts,
          pictureInPicture: settings.pictureInPicture,
          notifications: settings.notifications,
          theme: settings.theme as 'dark' | 'light' | 'auto'
        });
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const saveUserPreferences = async (newPreferences: Partial<PlayerPreferences>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await playerSettings.update(user.id, {
        autoPlayNext: newPreferences.autoPlayNext ?? preferences.autoPlayNext,
        skipIntro: newPreferences.skipIntro ?? preferences.skipIntro,
        skipOutro: newPreferences.skipOutro ?? preferences.skipOutro,
        defaultSubtitleLanguage: newPreferences.defaultSubtitleLanguage ?? preferences.defaultSubtitleLanguage,
        playbackSpeed: newPreferences.playbackSpeed ?? preferences.playbackSpeed,
        volume: newPreferences.volume ?? preferences.volume,
        keyboardShortcuts: newPreferences.keyboardShortcuts ?? preferences.keyboardShortcuts,
        pictureInPicture: newPreferences.pictureInPicture ?? preferences.pictureInPicture,
        notifications: newPreferences.notifications ?? preferences.notifications,
        theme: newPreferences.theme ?? preferences.theme
      });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof PlayerPreferences>(
    key: K, 
    value: PlayerPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    // Apply immediate changes to player
    if (key === 'playbackSpeed') {
      playerActions.setPlaybackRate(value as number);
    } else if (key === 'volume') {
      playerActions.setVolume(value as number);
    }
    
    // Save to database
    saveUserPreferences({ [key]: value });
  };

  const tabs = [
    { id: 'playback', label: 'Playback', icon: PlayIcon },
    { id: 'audio', label: 'Audio', icon: SpeakerWaveIcon },
    { id: 'subtitles', label: 'Subtitles', icon: EyeIcon },
    { id: 'controls', label: 'Controls', icon: KeyboardIcon },
    { id: 'accessibility', label: 'Accessibility', icon: DevicePhoneMobileIcon }
  ] as const;

  const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const subtitleLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'playback':
        return (
          <div className="space-y-6">
            {/* Auto-play Next Episode */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Auto-play Next Episode</h4>
                <p className="text-ash-400 text-sm">Automatically start the next episode when current one ends</p>
              </div>
              <button
                onClick={() => updatePreference('autoPlayNext', !preferences.autoPlayNext)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.autoPlayNext ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.autoPlayNext ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Skip Intro */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Skip Intro</h4>
                <p className="text-ash-400 text-sm">Automatically skip opening sequences</p>
              </div>
              <button
                onClick={() => updatePreference('skipIntro', !preferences.skipIntro)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.skipIntro ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.skipIntro ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Skip Outro */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Skip Outro</h4>
                <p className="text-ash-400 text-sm">Automatically skip ending sequences</p>
              </div>
              <button
                onClick={() => updatePreference('skipOutro', !preferences.skipOutro)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.skipOutro ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.skipOutro ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Playback Speed */}
            <div>
              <h4 className="text-white font-medium mb-3">Default Playback Speed</h4>
              <div className="grid grid-cols-4 gap-2">
                {playbackSpeeds.map(speed => (
                  <button
                    key={speed}
                    onClick={() => updatePreference('playbackSpeed', speed)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      preferences.playbackSpeed === speed
                        ? 'bg-purple-500 text-white'
                        : 'bg-ash-800/50 text-ash-300 hover:bg-ash-700/50'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-6">
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Default Volume</h4>
                <span className="text-ash-400 text-sm">{Math.round(preferences.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={preferences.volume}
                onChange={(e) => updatePreference('volume', parseFloat(e.target.value))}
                className="w-full h-2 bg-ash-600 rounded-full appearance-none cursor-pointer slider"
              />
            </div>

            {/* Audio Quality Info */}
            <div className="p-4 bg-ash-800/30 rounded-lg">
              <h4 className="text-white font-medium mb-2">Audio Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ash-400">Current Quality:</span>
                  <span className="text-white">{playerState.selectedQuality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-400">Audio Type:</span>
                  <span className="text-white">Stereo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-400">Sample Rate:</span>
                  <span className="text-white">48 kHz</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'subtitles':
        return (
          <div className="space-y-6">
            {/* Default Subtitle Language */}
            <div>
              <h4 className="text-white font-medium mb-3">Default Subtitle Language</h4>
              <select
                value={preferences.defaultSubtitleLanguage || ''}
                onChange={(e) => updatePreference('defaultSubtitleLanguage', e.target.value || undefined)}
                className="w-full p-3 bg-ash-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">None (Off by default)</option>
                {subtitleLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtitle Appearance */}
            <div className="p-4 bg-ash-800/30 rounded-lg">
              <h4 className="text-white font-medium mb-3">Subtitle Appearance</h4>
              <div className="space-y-3 text-sm text-ash-400">
                <p>• Font size and color can be customized in your browser settings</p>
                <p>• Subtitles support multiple formats (VTT, SRT, ASS)</p>
                <p>• Forced subtitles show automatically for foreign dialogue</p>
              </div>
            </div>
          </div>
        );

      case 'controls':
        return (
          <div className="space-y-6">
            {/* Keyboard Shortcuts */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Keyboard Shortcuts</h4>
                <p className="text-ash-400 text-sm">Enable keyboard controls for the player</p>
              </div>
              <button
                onClick={() => updatePreference('keyboardShortcuts', !preferences.keyboardShortcuts)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.keyboardShortcuts ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.keyboardShortcuts ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Picture in Picture */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Picture in Picture</h4>
                <p className="text-ash-400 text-sm">Allow mini player window</p>
              </div>
              <button
                onClick={() => updatePreference('pictureInPicture', !preferences.pictureInPicture)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.pictureInPicture ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.pictureInPicture ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Keyboard Shortcuts Reference */}
            {preferences.keyboardShortcuts && (
              <div className="p-4 bg-ash-800/30 rounded-lg">
                <h4 className="text-white font-medium mb-3">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ash-400">Play/Pause:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">Space</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-400">Seek Back:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">←</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-400">Seek Forward:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">→</kbd>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ash-400">Volume Up:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">↑</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-400">Volume Down:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">↓</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-400">Fullscreen:</span>
                      <kbd className="px-2 py-1 bg-ash-700 rounded text-white">F</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'accessibility':
        return (
          <div className="space-y-6">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Notifications</h4>
                <p className="text-ash-400 text-sm">Show playback notifications and alerts</p>
              </div>
              <button
                onClick={() => updatePreference('notifications', !preferences.notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences.notifications ? 'bg-purple-500' : 'bg-ash-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences.notifications ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Theme */}
            <div>
              <h4 className="text-white font-medium mb-3">Player Theme</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'auto'] as const).map(theme => (
                  <button
                    key={theme}
                    onClick={() => updatePreference('theme', theme)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all capitalize ${
                      preferences.theme === theme
                        ? 'bg-purple-500 text-white'
                        : 'bg-ash-800/50 text-ash-300 hover:bg-ash-700/50'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Accessibility Info */}
            <div className="p-4 bg-ash-800/30 rounded-lg">
              <h4 className="text-white font-medium mb-3">Accessibility Features</h4>
              <div className="space-y-2 text-sm text-ash-400">
                <p>• High contrast mode available in browser settings</p>
                <p>• Screen reader compatible controls</p>
                <p>• Keyboard navigation support</p>
                <p>• Subtitle customization through browser</p>
                <p>• Reduced motion respects system preferences</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="absolute bottom-20 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6 w-96 max-h-96 overflow-hidden flex flex-col animate-in zoom-in-90 duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Cog6ToothIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium text-lg">Player Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 text-ash-400 hover:text-white transition-colors"
        >
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-ash-800/30 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'text-ash-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Save Status */}
      {isSaving && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-ash-400">
          <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span>Saving preferences...</span>
        </div>
      )}
    </div>
  );
}