import React from 'react';
import { BookOpen, Home, LayoutDashboard } from 'lucide-react';

interface Props {
  onGoHome: () => void;
  activeTopic?: string;
}

export const Header: React.FC<Props> = ({ onGoHome, activeTopic }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          onClick={onGoHome}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-800 hidden md:block">Better Learn</span>
        </div>

        <div className="flex items-center gap-4">
          {activeTopic && (
            <div className="hidden md:flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100">
              Current: {activeTopic}
            </div>
          )}
          
          <button 
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all font-medium text-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </div>
    </header>
  );
};