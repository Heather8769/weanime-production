'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, SignalIcon } from '@heroicons/react/24/solid';
import { VideoQuality } from '@/lib/types/episodes';

interface QualitySelectorProps {
  availableQualities: VideoQuality[];
  selectedQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  onClose: () => void;
}

export default function QualitySelector({
  availableQualities,
  selectedQuality,
  onQualityChange,
  onClose
}: QualitySelectorProps) {
  const [isAutoQuality, setIsAutoQuality] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<number>(0);
  const [recommendedQuality, setRecommendedQuality] = useState<VideoQuality>('720p');

  // Quality order for sorting (highest to lowest)
  const qualityOrder: Record<VideoQuality, number> = {
    '4K': 4,
    '1080p': 3,
    '720p': 2,
    '480p': 1
  };

  // Sort qualities by preference
  const sortedQualities = [...availableQualities].sort(
    (a, b) => qualityOrder[b] - qualityOrder[a]
  );

  // Estimate network speed (simplified)
  useEffect(() => {
    const estimateNetworkSpeed = async () => {
      try {
        const startTime = performance.now();
        const response = await fetch('/api/speed-test', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const endTime = performance.now();
        
        if (response.ok) {
          // Rough estimation based on response time
          const responseTime = endTime - startTime;
          const estimatedSpeed = responseTime < 100 ? 25000 : 
                               responseTime < 200 ? 8000 :
                               responseTime < 500 ? 3000 : 1000;
          setNetworkSpeed(estimatedSpeed);
        }
      } catch (error) {
        // Fallback to conservative estimate
        setNetworkSpeed(3000);
      }
    };

    estimateNetworkSpeed();
  }, []);

  // Determine recommended quality based on network speed
  useEffect(() => {
    const getRecommendedQuality = (speedKbps: number): VideoQuality => {
      if (speedKbps >= 25000 && availableQualities.includes('4K')) return '4K';
      if (speedKbps >= 8000 && availableQualities.includes('1080p')) return '1080p';
      if (speedKbps >= 3000 && availableQualities.includes('720p')) return '720p';
      return '480p';
    };

    const recommended = getRecommendedQuality(networkSpeed);
    setRecommendedQuality(recommended);
  }, [networkSpeed, availableQualities]);

  // Auto quality selection
  useEffect(() => {
    if (isAutoQuality) {
      onQualityChange(recommendedQuality);
    }
  }, [isAutoQuality, recommendedQuality, onQualityChange]);

  const handleQualitySelect = (quality: VideoQuality) => {
    setIsAutoQuality(false);
    onQualityChange(quality);
    onClose();
  };

  const handleAutoQualityToggle = () => {
    setIsAutoQuality(true);
    onQualityChange(recommendedQuality);
    onClose();
  };

  const getQualityDescription = (quality: VideoQuality) => {
    const descriptions: Record<VideoQuality, string> = {
      '4K': 'Ultra HD • Best quality',
      '1080p': 'Full HD • High quality',
      '720p': 'HD • Good quality',
      '480p': 'SD • Data saver'
    };
    return descriptions[quality];
  };

  const getQualityBandwidth = (quality: VideoQuality) => {
    const bandwidth: Record<VideoQuality, string> = {
      '4K': '25+ Mbps',
      '1080p': '8+ Mbps',
      '720p': '3+ Mbps',
      '480p': '1+ Mbps'
    };
    return bandwidth[quality];
  };

  const formatNetworkSpeed = (speedKbps: number) => {
    if (speedKbps >= 1000) {
      return `${(speedKbps / 1000).toFixed(1)} Mbps`;
    }
    return `${speedKbps} Kbps`;
  };

  return (
    <div
      className="absolute bottom-20 right-4 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-4 min-w-80 max-w-sm animate-in zoom-in-90 duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-lg">Video Quality</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 text-ash-400 hover:text-white transition-colors"
        >
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Network Speed Info */}
      {networkSpeed > 0 && (
        <div className="mb-4 p-3 bg-ash-800/30 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <SignalIcon className="w-4 h-4 text-green-400" />
            <span className="text-ash-300">Network Speed:</span>
            <span className="text-white font-medium">
              {formatNetworkSpeed(networkSpeed)}
            </span>
          </div>
          <div className="text-xs text-ash-400 mt-1">
            Recommended: {recommendedQuality}
          </div>
        </div>
      )}

      {/* Auto Quality Option */}
      <button
        onClick={handleAutoQualityToggle}
        className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-all ${
          isAutoQuality
            ? 'bg-purple-500 text-white'
            : 'bg-ash-800/30 text-ash-300 hover:bg-ash-700/50 hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-current rounded-full" />
          <div className="text-left">
            <div className="font-medium">Auto</div>
            <div className="text-xs opacity-75">
              {isAutoQuality ? `Currently ${recommendedQuality}` : 'Adapts to your connection'}
            </div>
          </div>
        </div>
        {isAutoQuality && <CheckIcon className="w-5 h-5" />}
      </button>

      {/* Manual Quality Options */}
      <div className="space-y-1">
        {sortedQualities.map((quality) => {
          const isSelected = !isAutoQuality && selectedQuality === quality;
          const isRecommended = quality === recommendedQuality;
          
          return (
            <button
              key={quality}
              onClick={() => handleQualitySelect(quality)}
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
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{quality}</span>
                    {isRecommended && !isAutoQuality && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-75">
                    {getQualityDescription(quality)}
                  </div>
                  <div className="text-xs opacity-60">
                    {getQualityBandwidth(quality)} required
                  </div>
                </div>
              </div>
              {isSelected && <CheckIcon className="w-5 h-5" />}
            </button>
          );
        })}
      </div>

      {/* Quality Tips */}
      <div className="mt-4 p-3 bg-ash-800/20 rounded-lg">
        <div className="text-xs text-ash-400">
          <div className="font-medium text-ash-300 mb-1">Tips:</div>
          <ul className="space-y-1">
            <li>• Auto adjusts quality based on your connection</li>
            <li>• Higher quality uses more data</li>
            <li>• Switch anytime without interruption</li>
          </ul>
        </div>
      </div>
    </div>
  );
}