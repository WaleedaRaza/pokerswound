import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-6">Welcome to Pohkur Poker</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/lobby"
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 px-4 rounded"
            >
              Join a Game
            </Link>
            <button className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded">
              Create New Game
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Your Stats</h3>
          <div className="space-y-2">
            <p>Username: {user?.username}</p>
            <p>Tokens: {user?.tokenBalance}</p>
            <p>Games Played: 0</p>
            <p>Total Winnings: 0</p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <p className="text-gray-400">No recent activity</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 