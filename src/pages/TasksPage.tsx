import React from 'react';

const TasksPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Gestão de Tarefas</h1>
      <p className="text-gray-700 dark:text-gray-300">
        Aqui você poderá criar, visualizar e gerenciar todas as tarefas.
      </p>
    </div>
  );
};

export default TasksPage;