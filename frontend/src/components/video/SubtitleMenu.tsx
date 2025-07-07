'use client';

import { CheckIcon, LanguageIcon } from '@heroicons/react/24/solid';
import { SubtitleTrack } from '@/lib/types/episodes';

interface SubtitleMenuProps {
  availableSubtitles: SubtitleTrack[];
  selectedSubtitle?: SubtitleTrack | null;
  onSubtitleChange: (subtitle: SubtitleTrack | null) => void;
  onClose: () => void;
}

export default function SubtitleMenu({
  availableSubtitles,
  selectedSubtitle,
  onSubtitleChange,
  onClose
}: SubtitleMenuProps) {
  const handleSubtitleSelect = (subtitle: SubtitleTrack | null) => {
    onSubtitleChange(subtitle);
    onClose();
  };

  const getLanguageName = (languageCode: string) => {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ja': 'Japanese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'tr': 'Turkish',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'he': 'Hebrew',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'uk': 'Ukrainian',
      'be': 'Belarusian',
      'mk': 'Macedonian',
      'sq': 'Albanian',
      'sr': 'Serbian',
      'bs': 'Bosnian',
      'me': 'Montenegrin'
    };
    return languageNames[languageCode] || languageCode.toUpperCase();
  };

  const getSubtitleTypeIcon = (subtitle: SubtitleTrack) => {
    if (subtitle.isForced) {
      return (
        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
          Forced
        </span>
      );
    }
    if (subtitle.isDefault) {
      return (
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
          Default
        </span>
      );
    }
    return null;
  };

  const getFormatBadge = (format: string) => {
    const formatColors: Record<string, string> = {
      'vtt': 'bg-green-500/20 text-green-400',
      'srt': 'bg-blue-500/20 text-blue-400',
      'ass': 'bg-purple-500/20 text-purple-400'
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${formatColors[format] || 'bg-gray-500/20 text-gray-400'}`}>
        {format.toUpperCase()}
      </span>
    );
  };

  // Group subtitles by language
  const groupedSubtitles = availableSubtitles.reduce((groups, subtitle) => {
    const language = subtitle.language;
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(subtitle);
    return groups;
  }, {} as Record<string, SubtitleTrack[]>);

  // Sort languages with common ones first
  const languageOrder = ['en', 'ja', 'es', 'fr', 'de', 'pt', 'ru', 'ko', 'zh'];
  const sortedLanguages = Object.keys(groupedSubtitles).sort((a, b) => {
    const aIndex = languageOrder.indexOf(a);
    const bIndex = languageOrder.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div
      className="absolute bottom-20 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 min-w-80 max-w-sm max-h-96 overflow-y-auto animate-in zoom-in-90 duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <LanguageIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium text-lg">Subtitles</h3>
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

      {/* Off Option */}
      <button
        onClick={() => handleSubtitleSelect(null)}
        className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-all ${
          !selectedSubtitle
            ? 'bg-purple-500 text-white'
            : 'bg-ash-800/30 text-ash-300 hover:bg-ash-700/50 hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-current rounded-full" />
          <div className="text-left">
            <div className="font-medium">Off</div>
            <div className="text-xs opacity-75">No subtitles</div>
          </div>
        </div>
        {!selectedSubtitle && <CheckIcon className="w-5 h-5" />}
      </button>

      {/* Subtitle Options */}
      {availableSubtitles.length > 0 ? (
        <div className="space-y-3">
          {sortedLanguages.map((languageCode) => {
            const subtitles = groupedSubtitles[languageCode];
            const languageName = getLanguageName(languageCode);
            
            return (
              <div key={languageCode}>
                {/* Language Header */}
                <div className="text-sm font-medium text-ash-300 mb-2 px-1">
                  {languageName}
                </div>
                
                {/* Subtitle Tracks for this language */}
                <div className="space-y-1">
                  {subtitles.map((subtitle) => {
                    const isSelected = selectedSubtitle?.id === subtitle.id;
                    
                    return (
                      <button
                        key={subtitle.id}
                        onClick={() => handleSubtitleSelect(subtitle)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-ash-800/30 text-ash-300 hover:bg-ash-700/50 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-current'
                          }`} />
                          <div className="text-left flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{subtitle.label}</span>
                              {getSubtitleTypeIcon(subtitle)}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {getFormatBadge(subtitle.format)}
                              <span className="text-xs opacity-60">
                                {subtitle.language.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckIcon className="w-5 h-5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <LanguageIcon className="w-12 h-12 text-ash-400 mx-auto mb-3" />
          <h4 className="text-white font-medium mb-1">No Subtitles Available</h4>
          <p className="text-ash-400 text-sm">
            This episode doesn't have subtitle tracks.
          </p>
        </div>
      )}

      {/* Subtitle Settings Info */}
      {availableSubtitles.length > 0 && (
        <div className="mt-4 p-3 bg-ash-800/20 rounded-lg">
          <div className="text-xs text-ash-400">
            <div className="font-medium text-ash-300 mb-1">Subtitle Info:</div>
            <ul className="space-y-1">
              <li>• <span className="text-blue-400">Default</span> - Recommended subtitle track</li>
              <li>• <span className="text-red-400">Forced</span> - Shows only when characters speak foreign languages</li>
              <li>• Subtitles can be customized in player settings</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}