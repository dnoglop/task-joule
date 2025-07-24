import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Briefcase } from 'lucide-react';
import { Profile } from '@/types/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamMemberCardProps {
  member: Profile;
  index?: number; // For staggered animation
  onClick?: (member: Profile) => void;
  completedTasks?: number;
  delayedTasks?: number;
  estimatedHours?: number;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  index = 0,
  onClick,
  completedTasks = 0,
  delayedTasks = 0,
  estimatedHours = 0,
}) => {
  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-50 cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={() => onClick && onClick(member)}
    >
      <div className="flex items-center mb-4">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt={member.name} />
          <AvatarFallback className="bg-orange-500 text-white font-bold">{member.name?.charAt(0) || 'IJ'}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold text-gray-800">{member.name}</h3>
          <p className="text-sm text-gray-500">{member.role === 'manager' ? 'Gestor' : 'Funcionário'}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Mail size={14} className="mr-2 text-gray-400" />
          {member.email}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Briefcase size={14} className="mr-2 text-gray-400" />
          {member.area || 'N/A'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{completedTasks}</p>
          <p className="text-xs text-gray-500">Concluídas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{delayedTasks}</p>
          <p className="text-xs text-gray-500">Atrasadas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{estimatedHours}h</p>
          <p className="text-xs text-gray-500">Estimadas</p>
        </div>
      </div>

      {member.skills && member.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.skills.slice(0, 2).map((skill, idx) => (
            <Badge key={idx} className="bg-orange-50 text-orange-600">
              {skill}
            </Badge>
          ))}
          {member.skills.length > 2 && (
            <Badge variant="secondary">
              +{member.skills.length - 2}
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TeamMemberCard;