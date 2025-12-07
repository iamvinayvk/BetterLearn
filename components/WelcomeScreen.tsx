import React, { useState } from 'react';
import { UserState } from '../types';
import { Loader2, Upload, BookOpen, ArrowLeft } from 'lucide-react';

interface Props {
  onStart: (userState: UserState) => void;
  onCancel?: () => void;
  isProcessing: boolean;
  showCancel?: boolean;
}

export const WelcomeScreen: React.FC<Props> = ({ onStart, onCancel, isProcessing, showCancel }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [goal, setGoal] = useState('Fundamentals');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleStart = async () => {
    if (!topic) return;

    let base64Image = undefined;
    if (imageFile) {
      base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data url prefix for Gemini API
            resolve(result.split(',')[1]); 
        };
        reader.readAsDataURL(imageFile);
      });
    }

    onStart({ topic, level, goal, contextImage: base64Image });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 animate-fade-in relative">
      {showCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-6 left-6 flex items-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
        </button>
      )}

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Better Learn</h1>
          <p className="text-slate-500">Turn any word into a personalized learning journey.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">What do you want to learn?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Quantum Physics, React Hooks, French Revolution"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-black font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Current Level</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Goal</label>
              <select 
                value={goal} 
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-black"
              >
                <option>Fundamentals</option>
                <option>Exam Prep</option>
                <option>Interview Prep</option>
                <option>Deep Dive</option>
              </select>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {imageFile ? imageFile.name : "Optional: Upload notes or slides for context"}
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={!topic || isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Designing Curriculum...
              </>
            ) : (
              "Start My Journey"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};