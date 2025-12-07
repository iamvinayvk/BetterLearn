import React, { useState } from 'react';
import { ChapterContent, Question } from '../types';
import { QuizView } from './QuizView';
import { PlayCircle, FileText, Book, MessageSquare, Lightbulb, Image as ImageIcon } from 'lucide-react';

interface Props {
  content: ChapterContent;
  onChapterComplete: (score: number) => void;
  onChangeStyle: (style: string) => void;
  isGenerating: boolean;
}

export const ChapterView: React.FC<Props> = ({ content, onChapterComplete, onChangeStyle, isGenerating }) => {
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');

  const handleQuizComplete = (results: {questionId: string, correct: boolean}[]) => {
    const correctCount = results.filter(r => r.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    onChapterComplete(score);
  };

  if (mode === 'quiz') {
    return (
      <QuizView
        title={`Quiz: ${content.title}`}
        questions={content.chapter_quiz}
        onComplete={handleQuizComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      {/* Header */}
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{content.title}</h1>
        <p className="text-lg text-slate-600">{content.summary}</p>
      </div>

      {/* Style Selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {['Default', 'Like I\'m 5', 'Technical', 'Analogy Heavy'].map((style) => (
          <button
            key={style}
            onClick={() => onChangeStyle(style)}
            disabled={isGenerating}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 whitespace-nowrap"
          >
            {style}
          </button>
        ))}
      </div>

      <div className="space-y-8 animate-fade-in">
        
        {/* Key Points */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Key Concepts
          </h3>
          <ul className="space-y-3">
            {content.key_points.map((kp, i) => (
              <li key={i} className="flex gap-3 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" />
                <span className="leading-relaxed">{kp}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Example & Analogy Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
             <h3 className="text-lg font-semibold text-indigo-900 mb-3">Example</h3>
             <p className="text-indigo-800 leading-relaxed">{content.example}</p>
          </section>
          <section className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
             <h3 className="text-lg font-semibold text-emerald-900 mb-3">Analogy</h3>
             <p className="text-emerald-800 leading-relaxed">{content.analogy}</p>
          </section>
        </div>

        {/* Diagram Prompt (Pseudo-visual) */}
        {content.diagram_prompt && (
          <section className="bg-slate-800 rounded-xl p-6 text-slate-200 shadow-md">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Visual Mental Model
            </h3>
            <p className="italic font-light">"Imagine this: {content.diagram_prompt}"</p>
          </section>
        )}

        {/* External Resources */}
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4">Curated Resources</h3>
          <div className="grid gap-4">
            
            {/* Videos */}
            {content.external_resources.videos.map((vid, i) => (
              <a key={i} href={vid.url} target="_blank" rel="noopener noreferrer" 
                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-red-400 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 transition-colors">
                  <PlayCircle className="w-6 h-6 text-red-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 group-hover:text-red-600">{vid.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{vid.description}</p>
                </div>
              </a>
            ))}

            {/* Blogs/Docs */}
            {[...content.external_resources.blogs, ...content.external_resources.docs].map((res, i) => (
              <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" 
                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 transition-colors">
                  <FileText className="w-6 h-6 text-blue-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 group-hover:text-blue-600">{res.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{res.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          onClick={() => setMode('quiz')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
        >
          <MessageSquare className="w-5 h-5" />
          Take Chapter Quiz
        </button>
      </div>
    </div>
  );
};
