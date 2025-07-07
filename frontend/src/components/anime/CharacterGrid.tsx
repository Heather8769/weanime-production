'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Character {
  id: number;
  role: string;
  voiceActors: Array<{
    id: number;
    name: {
      full: string;
      native?: string;
    };
    image: {
      large: string;
      medium: string;
    };
    languageV2: string;
  }>;
  node: {
    id: number;
    name: {
      full: string;
      native?: string;
    };
    image: {
      large: string;
      medium: string;
    };
    description?: string;
    gender?: string;
    age?: string;
  };
}

interface CharacterGridProps {
  characters: Character[];
}

export default function CharacterGrid({ characters }: CharacterGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map((character, index) => {
        const japaneseVA = character.voiceActors.find(va => va.languageV2 === 'JAPANESE');
        
        return (
          <motion.div
            key={character.node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="glass backdrop-blur-[14px] bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex">
              {/* Character Image */}
              <div className="relative w-16 h-20 flex-shrink-0">
                <Image
                  src={character.node.image.medium}
                  alt={character.node.name.full}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-character.jpg';
                  }}
                />
              </div>
              
              {/* Character Info */}
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-white text-sm truncate">
                      {character.node.name.full}
                    </h4>
                    {character.node.name.native && character.node.name.native !== character.node.name.full && (
                      <p className="text-xs text-ash-400 truncate">
                        {character.node.name.native}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded text-white flex-shrink-0 ml-2 ${
                    character.role === 'MAIN' 
                      ? 'bg-purple-500/80' 
                      : 'bg-ash-600/80'
                  }`}>
                    {character.role}
                  </span>
                </div>
                
                {/* Voice Actor */}
                {japaneseVA && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={japaneseVA.image.medium}
                        alt={japaneseVA.name.full}
                        fill
                        className="object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-avatar.jpg';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ash-300 truncate">
                        {japaneseVA.name.full}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}