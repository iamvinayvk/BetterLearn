import React, { useState } from 'react';
import { Question } from '../types';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface Props {
  questions: Question[];
  title: string;
  subTitle?: string;
  onComplete: (results: {questionId: string, correct: boolean}[]) => void;
  isSubmitting?: boolean;
}

export const QuizView: React.FC<Props> = ({ questions, title, subTitle, onComplete, isSubmitting }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleOptionSelect = (qId: string, optionIndex: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleSubmit = () => {
    setShowResults(true);
    // Calculate results after a brief delay to show UI feedback
    setTimeout(() => {
        const results = questions.map(q => ({
            questionId: q.id,
            correct: answers[q.id] === q.correctIndex
        }));
        onComplete(results);
    }, 2000);
  };

  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="max-w-3xl mx-auto p-6 pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {subTitle && <p className="text-slate-500 mt-2">{subTitle}</p>}
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = userAnswer === q.correctIndex;
          
          return (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-600 font-medium text-sm">
                  {idx + 1}
                </span>
                <h3 className="text-lg font-medium text-slate-800 pt-1">{q.question}</h3>
              </div>

              <div className="space-y-3 pl-12">
                {q.options?.map((opt, optIdx) => {
                  let btnClass = "w-full text-left p-4 rounded-lg border-2 transition-all ";
                  
                  if (showResults) {
                     if (optIdx === q.correctIndex) {
                       btnClass += "border-green-500 bg-green-50 text-green-900";
                     } else if (userAnswer === optIdx) {
                       btnClass += "border-red-500 bg-red-50 text-red-900";
                     } else {
                       btnClass += "border-slate-100 opacity-50";
                     }
                  } else {
                    if (userAnswer === optIdx) {
                      btnClass += "border-indigo-600 bg-indigo-50 text-indigo-900";
                    } else {
                      btnClass += "border-slate-100 hover:border-indigo-200 hover:bg-slate-50";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleOptionSelect(q.id, optIdx)}
                      className={btnClass}
                      disabled={showResults}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        {showResults && optIdx === q.correctIndex && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {showResults && userAnswer === optIdx && userAnswer !== q.correctIndex && <XCircle className="w-5 h-5 text-red-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {showResults && q.explanation && (
                <div className="mt-4 ml-12 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-center z-10">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || showResults || isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all w-full max-w-md justify-center"
        >
          {isSubmitting ? "Analyzing..." : showResults ? "Processing..." : "Submit Answers"}
          {!isSubmitting && !showResults && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
