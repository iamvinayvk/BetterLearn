import React, { useState } from 'react';
import { 
  AppView, 
  UserState, 
  DiagnosticQuiz, 
  LearningPlan, 
  ChapterContent, 
  Chapter,
  AdaptiveUpdate
} from './types';
import { GeminiService } from './services/geminiService';
import { WelcomeScreen } from './components/WelcomeScreen';
import { QuizView } from './components/QuizView';
import { ChapterView } from './components/ChapterView';
import { Layout, Book, ChevronRight, CheckCircle, Lock, Trophy, BarChart2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.WELCOME);
  const [userState, setUserState] = useState<UserState | null>(null);
  
  // Data State
  const [diagnosticQuiz, setDiagnosticQuiz] = useState<DiagnosticQuiz | null>(null);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [currentChapterContent, setCurrentChapterContent] = useState<ChapterContent | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  
  // UI Loading State
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startJourney = async (state: UserState) => {
    setUserState(state);
    setLoading(true);
    
    // 1. Multimodal context extraction if image present
    let context = "";
    if (state.contextImage) {
      context = await GeminiService.extractFromImage(state.contextImage);
    }
    
    // 2. Generate Diagnostic
    const quiz = await GeminiService.generateDiagnosticQuiz(state.topic, state.level, context);
    setDiagnosticQuiz(quiz);
    setLoading(false);
    setView(AppView.DIAGNOSTIC);
  };

  const handleDiagnosticComplete = async (results: {questionId: string, correct: boolean}[]) => {
    setLoading(true);
    setView(AppView.PLANNING);
    
    if (!userState) return;

    // 3. Evaluate & Plan
    const learningPlan = await GeminiService.evaluateAndPlan(userState.topic, results, userState.goal);
    setPlan(learningPlan);
    setLoading(false);
    setView(AppView.DASHBOARD);
  };

  const loadChapter = async (chapterId: number, style: string = "Default") => {
    if (!plan || !userState) return;
    
    const chapter = plan.learning_plan.find(c => c.chapter_id === chapterId);
    if (!chapter || chapter.status === 'locked') return;

    setLoading(true);
    setCurrentChapterId(chapterId);
    
    // 4. Generate Chapter Content
    const content = await GeminiService.generateChapter(userState.topic, chapter, style);
    setCurrentChapterContent(content);
    setLoading(false);
    setView(AppView.CHAPTER);
  };

  const handleChapterComplete = async (score: number) => {
    if (!currentChapterId || !plan) return;

    setLoading(true);
    
    // 5. Adaptive Update
    const update = await GeminiService.adaptPlan(plan, currentChapterId, score);
    
    // Update local state plan
    const newPlan = { ...plan };
    
    // Mark current as completed
    const currentIdx = newPlan.learning_plan.findIndex(c => c.chapter_id === currentChapterId);
    if (currentIdx !== -1) {
      newPlan.learning_plan[currentIdx].status = 'completed';
      newPlan.learning_plan[currentIdx].score = score;
      
      // Unlock next if available
      if (newPlan.learning_plan[currentIdx + 1]) {
        newPlan.learning_plan[currentIdx + 1].status = 'unlocked';
      }
    }

    // Apply adaptive feedback (simplified insertion for demo)
    if (update.updated_plan) {
       // Ideally we merge, but for demo we can replace the future if provided
       // This is complex, so we'll just stick to unlocking logic and showing feedback
    }

    setPlan(newPlan);
    setFeedback(`Score: ${score}%. ${update.feedback}`);
    setLoading(false);
    setView(AppView.DASHBOARD);
    setCurrentChapterContent(null);
  };

  // --- Render Helpers ---

  const renderSidebar = () => (
    <div className="w-80 bg-white border-r border-slate-200 h-full flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-100">
        <h2 className="font-bold text-xl text-slate-800 truncate">{userState?.topic || "CurioLoop"}</h2>
        <p className="text-sm text-slate-500">{userState?.level} • {userState?.goal}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Your Path</h3>
        <div className="space-y-2 relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
          
          {plan?.learning_plan.map((chapter) => {
             const isLocked = chapter.status === 'locked';
             const isCompleted = chapter.status === 'completed';
             const isActive = currentChapterId === chapter.chapter_id && view === AppView.CHAPTER;

             return (
               <div 
                 key={chapter.chapter_id}
                 onClick={() => !isLocked && loadChapter(chapter.chapter_id)}
                 className={`relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer z-10
                   ${isActive ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}
                   ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                 `}
               >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0
                    ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' : 
                      isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 
                      isLocked ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-indigo-200 text-indigo-600'}
                 `}>
                   {isCompleted ? <CheckCircle className="w-4 h-4" /> : 
                    isLocked ? <Lock className="w-3 h-3" /> : 
                    <span className="text-sm font-bold">{chapter.chapter_id}</span>}
                 </div>
                 <div className="overflow-hidden">
                   <h4 className="text-sm font-medium text-slate-800 truncate">{chapter.title}</h4>
                   <p className="text-xs text-slate-500">{chapter.estimated_time_minutes} min</p>
                 </div>
               </div>
             );
          })}
        </div>
      </div>
      
      {plan && (
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-slate-700">Progress</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${(plan.learning_plan.filter(c => c.status === 'completed').length / plan.learning_plan.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboard = () => {
    if (!plan) return null;

    // Data for radar chart
    const data = [
        ...plan.strengths.map(s => ({ subject: s, A: 100, fullMark: 100 })),
        ...plan.weaknesses.map(w => ({ subject: w, A: 40, fullMark: 100 }))
    ].slice(0, 6); // Limit to 6 points for visual clarity

    return (
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Learning Map</h1>
          <p className="text-slate-600">Based on your diagnostic, we've calibrated this path for a <strong>{plan.estimated_level}</strong> level.</p>
        </header>

        {feedback && (
            <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 flex items-start gap-3">
                <BarChart2 className="w-5 h-5 mt-0.5" />
                <div>
                    <h4 className="font-semibold">Adaptive Update</h4>
                    <p>{feedback}</p>
                </div>
            </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Stats Card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-4">Current Curriculum</h3>
                <div className="space-y-4">
                    {plan.learning_plan.map(chapter => (
                         <div key={chapter.chapter_id} 
                              onClick={() => chapter.status !== 'locked' && loadChapter(chapter.chapter_id)}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
                                ${chapter.status === 'locked' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                              `}
                         >
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                    {chapter.chapter_id}
                                </span>
                                <div>
                                    <h4 className="font-bold text-slate-800">{chapter.title}</h4>
                                    <p className="text-sm text-slate-500">{chapter.objective}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium
                                    ${chapter.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 
                                      chapter.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                                `}>
                                    {chapter.difficulty}
                                </span>
                                {chapter.status === 'unlocked' && <ChevronRight className="w-5 h-5 text-indigo-400" />}
                                {chapter.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            </div>
                         </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Skill Radar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
             <h3 className="font-semibold text-slate-800 mb-4 text-center">Skill Profile</h3>
             <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Skills"
                        dataKey="A"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="#818cf8"
                        fillOpacity={0.4}
                    />
                    </RadarChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 text-sm text-slate-500 text-center">
                 Based on your diagnostic & ongoing quiz performance.
             </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (view === AppView.WELCOME) {
    return <WelcomeScreen onStart={startJourney} isProcessing={loading} />;
  }

  // Loading Screen for Plan Generation
  if (view === AppView.PLANNING && loading) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyzing your skills...</h2>
            <p className="text-slate-500">Gemini is constructing your personalized curriculum.</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile Header (simplified) */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 p-4 z-50 flex justify-between items-center">
         <span className="font-bold text-indigo-600">CurioLoop</span>
         <button onClick={() => setView(AppView.DASHBOARD)} className="text-sm font-medium text-slate-600">Dashboard</button>
      </div>

      {renderSidebar()}
      
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 scroll-smooth">
        {loading && view !== AppView.PLANNING && (
             <div className="fixed top-0 left-0 w-full h-1 bg-indigo-100 z-50">
                <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
             </div>
        )}

        {view === AppView.DIAGNOSTIC && diagnosticQuiz && (
            <QuizView 
                title={`Diagnostic: ${diagnosticQuiz.topic}`} 
                subTitle="Let's see where you stand to tailor the course."
                questions={diagnosticQuiz.quiz} 
                onComplete={handleDiagnosticComplete}
                isSubmitting={loading}
            />
        )}

        {view === AppView.DASHBOARD && renderDashboard()}

        {view === AppView.CHAPTER && currentChapterContent && (
            <ChapterView 
                content={currentChapterContent}
                onChapterComplete={handleChapterComplete}
                isGenerating={loading}
                onChangeStyle={(s) => currentChapterId && loadChapter(currentChapterId, s)}
            />
        )}
      </main>
    </div>
  );
}
