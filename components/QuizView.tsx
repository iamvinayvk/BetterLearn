import React, { useState } from 'react';
import { Question } from '../types';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, BarChart2 } from 'lucide-react';

interface Props {
  questions: Question[];
  title: string;
  subTitle?: string;
  onComplete: (results: {questionId: string, correct: boolean}[]) => void;
  isSubmitting?: boolean;
}

export const QuizView: React.FC<Props> = ({ questions, title, subTitle, onComplete, isSubmitting }) => {
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isReviewing, setIsReviewing] = useState(false);

  // If currently reviewing, show the result list
  if (isReviewing) {
    const results = questions.map(q => ({
        questionId: q.id,
        correct: answers[q.id] === q.correctIndex
    }));
    const correctCount = results.filter(r => r.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto p-6 pb-20 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-4 border-2 border-indigo-100">
            <span className="text-3xl font-bold text-indigo-600">{score}%</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Quiz Completed!</h2>
          <p className="text-slate-500">Review your answers before continuing.</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correctIndex;

            return (
              <div key={q.id} className={`p-6 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-3 mb-2">
                  {isCorrect ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" /> : <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
                  <div>
                    <h3 className="font-semibold text-slate-800">{q.question}</h3>
                    <p className="text-sm mt-1 text-slate-600">
                      Your answer: <span className="font-medium">{q.options?.[userAnswer]}</span>
                    </p>
                    {!isCorrect && (
                       <p className="text-sm mt-1 text-slate-600">
                         Correct answer: <span className="font-medium text-green-700">{q.options?.[q.correctIndex!]}</span>
                       </p>
                    )}
                  </div>
                </div>
                {q.explanation && (
                  <div className="mt-3 pl-9 text-sm text-slate-700 bg-white/50 p-3 rounded-lg">
                    <strong>Insight:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-center z-10">
          <button
            onClick={() => onComplete(results)}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-12 rounded-full shadow-lg flex items-center gap-2 transition-all w-full max-w-md justify-center"
          >
            {isSubmitting ? "Analyzing Progress..." : "Complete & Continue"}
            {!isSubmitting && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  }

  // --- Active Quiz Flow ---
  
  const currentQuestion = questions[currentInfoIndex];
  const progress = ((currentInfoIndex) / questions.length) * 100;
  const hasAnsweredCurrent = answers[currentQuestion.id] !== undefined;

  const handleNext = () => {
    if (currentInfoIndex < questions.length - 1) {
      setCurrentInfoIndex(prev => prev + 1);
    } else {
      setIsReviewing(true);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 h-full flex flex-col">
      {/* Header with Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
            <div>
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                {subTitle && <p className="text-sm text-slate-500">{subTitle}</p>}
            </div>
            <span className="text-sm font-medium text-slate-400">
                {currentInfoIndex + 1} / {questions.length}
            </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
            <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-center animate-fade-in">
        <h3 className="text-2xl font-medium text-slate-900 mb-8 leading-snug">
            {currentQuestion.question}
        </h3>

        <div className="space-y-3">
            {currentQuestion.options?.map((opt, idx) => {
                const isSelected = answers[currentQuestion.id] === idx;
                return (
                    <button
                        key={idx}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: idx }))}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between group
                            ${isSelected 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                                : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-700'}
                        `}
                    >
                        <span className="font-medium text-lg">{opt}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                            ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-300'}
                        `}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </button>
                );
            })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
        <button 
            onClick={() => setCurrentInfoIndex(prev => Math.max(0, prev - 1))}
            disabled={currentInfoIndex === 0}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-medium"
        >
            <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <button
            onClick={handleNext}
            disabled={!hasAnsweredCurrent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
            {currentInfoIndex === questions.length - 1 ? 'Review Answers' : 'Next Question'}
            <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};