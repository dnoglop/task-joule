import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      <p className="text-gray-700 dark:text-gray-300">
        Bem-vindo ao seu dashboard! Aqui você verá um resumo das tarefas e indicadores importantes.
      </p>
    </div>
  );
};

export default DashboardPage;