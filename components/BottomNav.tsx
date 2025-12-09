
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Heart, Search, Database } from 'lucide-react';

const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 h-16 flex items-center justify-around shadow-lg">
      <Link to="/" className={`flex flex-col items-center ${isActive('/') ? 'text-primary' : 'text-gray-400'}`}>
        <Home size={24} />
        <span className="text-[10px] mt-1 font-medium">Home</span>
      </Link>
      <Link to="/group" className={`flex flex-col items-center ${isActive('/group') ? 'text-primary' : 'text-gray-400'}`}>
        <Users size={24} />
        <span className="text-[10px] mt-1 font-medium">Group</span>
      </Link>
      <Link to="/saved" className={`flex flex-col items-center ${isActive('/saved') ? 'text-primary' : 'text-gray-400'}`}>
        <Heart size={24} />
        <span className="text-[10px] mt-1 font-medium">Saved</span>
      </Link>
      <Link to="/search" className={`flex flex-col items-center ${isActive('/search') ? 'text-primary' : 'text-gray-400'}`}>
        <Search size={24} />
        <span className="text-[10px] mt-1 font-medium">Search</span>
      </Link>
      <Link to="/admin" className={`flex flex-col items-center ${isActive('/admin') ? 'text-primary' : 'text-gray-400'}`}>
        <Database size={24} />
        <span className="text-[10px] mt-1 font-medium">Admin</span>
      </Link>
    </div>
  );
};

export default BottomNav;
