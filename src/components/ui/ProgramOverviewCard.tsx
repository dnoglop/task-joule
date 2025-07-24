import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, DollarSign, Timer, MoreVertical, ArrowRight } from 'lucide-react';
import { Program } from '@/types/supabase';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProgramOverviewCardProps {
  program: Program & {
    total_tasks: number;
    completed_tasks: number;
    total_estimated_hours: number;
    progress?: number;
    teamMembers?: { name: string; avatar: string; role: string }[];
    coverImage?: string;
    duration?: string;
    budget?: string;
    status?: string;
    priority?: string;
    category?: string;
  };
  index?: number; // For staggered animation
  onClick?: (program: Program) => void;
}

const ProgramOverviewCard: React.FC<ProgramOverviewCardProps> = ({ program, index = 0, onClick }) => {
  const defaultCoverImage = `https://source.unsplash.com/random/400x200?${program.name.replace(/\s/g, '-')}`;

  const statusColors: Record<string, string> = {
    'ativo': 'bg-green-500 text-white',
    'pausado': 'bg-yellow-500 text-white',
    'concluido': 'bg-blue-500 text-white',
    'planejamento': 'bg-gray-500 text-white',
  };

  const priorityColors: Record<string, string> = {
    'alta': 'bg-red-500 text-white',
    'media': 'bg-yellow-500 text-white',
    'baixa': 'bg-green-500 text-white',
  };

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={() => onClick && onClick(program)}
    >
      {/* Capa do Programa */}
      <div className="relative h-48 bg-gradient-to-r from-orange-400 to-orange-600 overflow-hidden">
        <img 
          src={program.coverImage || defaultCoverImage} 
          alt={program.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 flex space-x-2">
          {program.status && (
            <Badge className={statusColors[program.status.toLowerCase()]}>
              {program.status}
            </Badge>
          )}
          {program.priority && (
            <Badge className={priorityColors[program.priority.toLowerCase()]}>
              {program.priority}
            </Badge>
          )}
        </div>
        {program.category && (
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-black bg-opacity-50 text-white">
              {program.category}
            </Badge>
          </div>
        )}
      </div>

      {/* Conteúdo do Card */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
              {program.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {program.description || 'Nenhuma descrição disponível.'}
            </p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <MoreVertical size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Métricas do Programa */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <CheckSquare size={16} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Tarefas</p>
              <p className="font-semibold text-gray-800">
                {program.completed_tasks}/{program.total_tasks}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Horas</p>
              <p className="font-semibold text-gray-800">{program.total_estimated_hours}h</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign size={16} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Orçamento</p>
              <p className="font-semibold text-gray-800">{program.budget || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Timer size={16} className="text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Duração</p>
              <p className="font-semibold text-gray-800">{program.duration || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Progresso */}
        {program.progress !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="text-sm font-medium text-gray-800">{program.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${program.progress}%` }}
                transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
              />
            </div>
          </div>
        )}

        {/* Equipe */}
        {program.teamMembers && program.teamMembers.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex -space-x-2 mr-3">
                {program.teamMembers.slice(0, 3).map((member, idx) => (
                  <Avatar key={idx} className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt={member.name} />
                    <AvatarFallback className="bg-orange-500 text-white text-xs font-bold">{member.avatar}</AvatarFallback>
                  </Avatar>
                ))}
                {program.teamMembers.length > 3 && (
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarFallback className="bg-gray-400 text-white text-xs font-bold">
                      +{program.teamMembers.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {program.teamMembers.length} membros
              </span>
            </div>
            
            <button className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center">
              Ver Detalhes
              <ArrowRight className="ml-1" size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProgramOverviewCard;