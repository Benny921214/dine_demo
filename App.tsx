
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Group from './pages/Group';
import Saved from './pages/Saved';
import Search from './pages/Search';
import Admin from './pages/Admin';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="font-sans text-gray-900 antialiased max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/group" element={<Group />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/search" element={<Search />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
};

export default App;
