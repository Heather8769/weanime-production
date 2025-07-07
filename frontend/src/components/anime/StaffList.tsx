'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface StaffMember {
  id: number;
  role: string;
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
    primaryOccupations?: string[];
  };
}

interface StaffListProps {
  staff: StaffMember[];
}

export default function StaffList({ staff }: StaffListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {staff.map((member, index) => (
        <motion.div
          key={member.node.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <div className="flex items-center space-x-4 p-4 glass backdrop-blur-[14px] bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300">
          {/* Staff Image */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src={member.node.image.medium}
              alt={member.node.name.full}
              fill
              className="object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-avatar.jpg';
              }}
            />
          </div>
          
          {/* Staff Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-sm truncate">
              {member.node.name.full}
            </h4>
            {member.node.name.native && member.node.name.native !== member.node.name.full && (
              <p className="text-xs text-ash-400 truncate">
                {member.node.name.native}
              </p>
            )}
            <p className="text-xs text-ash-300 mt-1">
              {member.role}
            </p>
            {member.node.primaryOccupations && member.node.primaryOccupations.length > 0 && (
              <p className="text-xs text-ash-400 mt-1">
                {member.node.primaryOccupations.join(', ')}
              </p>
            )}
          </div>
          </div>
        </motion.div>
      ))}
      
      {staff.length === 0 && (
        <div className="col-span-full text-center py-8 text-ash-400">
          No staff information available.
        </div>
      )}
    </div>
  );
}