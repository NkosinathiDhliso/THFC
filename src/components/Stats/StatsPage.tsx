import React from 'react';
import { User } from '../../types';
import RealTimeStats from '../Dashboard/RealTimeStats';

interface StatsPageProps {
  user: User;
}

const StatsPage: React.FC<StatsPageProps> = ({ user }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
          Donation Statistics
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Live donation statistics and activity feed
        </p>
      </div>
      
      <RealTimeStats userId={user.id} />
    </div>
  );
};

export default StatsPage;
