import React, { useState, useEffect } from 'react';
import { 
  AppView, 
  UserState, 
  DiagnosticQuiz, 
  LearningPlan, 
  ChapterContent, 
  Chapter,
  AdaptiveUpdate,
  LearningPath,
  DailyStats
} from './types';
import { GeminiService } from './services/geminiService';
import { WelcomeScreen } from './components/WelcomeScreen';
import { QuizView } from './components/QuizView';
import { ChapterView } from './components/ChapterView';
import { Header } from './components/Header';
import { Layout, Book, ChevronRight, CheckCircle, Lock, Trophy, BarChart2, Plus, Home, TrendingUp, Sparkles, ArrowLeft } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Data State for Multiple Paths
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  
  // Daily Stats & Gamification
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    streakDays: 1,
    chaptersCompletedToday: 0,
    totalXp: 0,
    lastLoginDate: new Date().toISOString()
  });

  // Temporary state for creating a new path
  const [tempUserState, setTempUserState] = useState<UserState | null>(null);
  const [diagnosticQuiz, setDiagnosticQuiz] = useState<DiagnosticQuiz | null>(null);
  const [currentChapterContent, setCurrentChapterContent] = useState<ChapterContent | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  
  // UI Loading State
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // --- Persistence Logic ---

  // Load Data on Mount
  useEffect(() => {
    try {
      const savedPaths = localStorage.getItem('better-learn-paths');
      const savedStats = localStorage.getItem('better-learn-stats');
      
      if (savedPaths) {
        setPaths(JSON.parse(savedPaths));
      }
      
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        // Check for new day to reset daily counter
        const lastLogin = new Date(parsedStats.lastLoginDate);
        const today = new Date();
        const isSameDay = lastLogin.getDate() === today.getDate() && 
                          lastLogin.getMonth() === today.getMonth() &&
                          lastLogin.getFullYear() === today.getFullYear();
        
        if (!isSameDay) {
          parsedStats.chaptersCompletedToday = 0;
          parsedStats.lastLoginDate = today.toISOString();
          // Simple streak logic (if login was yesterday, increment)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = lastLogin.getDate() === yesterday.getDate();
          
          if (isYesterday) {
            parsedStats.streakDays += 1;
          } else if (!isSameDay) {
            // Broken streak
            parsedStats.streakDays = 1;
          }
        }
        setDailyStats(parsedStats);
      }
    } catch (e) {
      console.error("Failed to load persistence", e);
    }
    setDataLoaded(true);
  }, []);

  // Save Data on Change
  useEffect(() => {
    if (dataLoaded) {
      localStorage.setItem('better-learn-paths', JSON.stringify(paths));
    }
  }, [paths, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) {
      localStorage.setItem('better-learn-stats', JSON.stringify(dailyStats));
    }
  }, [dailyStats, dataLoaded]);


  // --- Actions ---

  const startNewPathJourney = async (state: UserState) => {
    setTempUserState(state);
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
    
    if (!tempUserState) return;

    // 3. Evaluate & Plan
    const learningPlan = await GeminiService.evaluateAndPlan(tempUserState.topic, results, tempUserState.goal);
    
    // Create new Path Object
    const newPath: LearningPath = {
        id: crypto.randomUUID(),
        topic: tempUserState.topic,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        userState: tempUserState,
        plan: learningPlan,
        progress: 0
    };

    setPaths(prev => [...prev, newPath]);
    setActivePathId(newPath.id);
    
    setLoading(false);
    setView(AppView.PATH_DASHBOARD);
  };

  const loadChapter = async (chapterId: number, style: string = "Default") => {
    const activePath = paths.find(p => p.id === activePathId);
    if (!activePath) return;
    
    const chapter = activePath.plan.learning_plan.find(c => c.chapter_id === chapterId);
    if (!chapter || chapter.status === 'locked') return;

    setLoading(true);
    setCurrentChapterId(chapterId);
    
    // 4. Generate Chapter Content
    const content = await GeminiService.generateChapter(activePath.topic, chapter, style);
    setCurrentChapterContent(content);
    setLoading(false);
    setView(AppView.CHAPTER);
  };

  const handleChapterComplete = async (score: number) => {
    if (!currentChapterId || !activePathId) return;

    setLoading(true);
    
    // Find active path and plan
    const activePathIndex = paths.findIndex(p => p.id === activePathId);
    if (activePathIndex === -1) return;
    const activePath = paths[activePathIndex];

    // 5. Adaptive Update via API
    const update = await GeminiService.adaptPlan(activePath.plan, currentChapterId, score);
    
    // Update local state deeply
    const updatedPaths = [...paths];
    const path = updatedPaths[activePathIndex];
    
    // Update Chapter Status
    const currentIdx = path.plan.learning_plan.findIndex(c => c.chapter_id === currentChapterId);
    if (currentIdx !== -1) {
      path.plan.learning_plan[currentIdx].status = 'completed';
      path.plan.learning_plan[currentIdx].score = score;
      
      // Unlock next
      if (path.plan.learning_plan[currentIdx + 1]) {
        path.plan.learning_plan[currentIdx + 1].status = 'unlocked';
      }
    }
    
    // Update Progress %
    const completed = path.plan.learning_plan.filter(c => c.status === 'completed').length;
    path.progress = Math.round((completed / path.plan.learning_plan.length) * 100);
    path.lastAccessedAt = Date.now();

    // Update Daily Stats
    setDailyStats(prev => ({
        ...prev,
        chaptersCompletedToday: prev.chaptersCompletedToday + 1,
        totalXp: prev.totalXp + (score * 10)
    }));

    setPaths(updatedPaths);
    setFeedback(`Score: ${score}%. ${update.feedback}`);
    setLoading(false);
    setView(AppView.PATH_DASHBOARD);
    setCurrentChapterContent(null);
  };

  const switchToPath = (pathId: string) => {
    setActivePathId(pathId);
    setView(AppView.PATH_DASHBOARD);
  };

  const goHome = () => {
    setActivePathId(null);
    setCurrentChapterContent(null);
    setView(AppView.HOME);
  };

  // --- Render Sections ---

  const renderHomeDashboard = () => {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-8 animate-fade-in">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Welcome back</h1>
                <p className="text-slate-500">Ready to expand your horizons today?</p>
            </div>
            <button 
                onClick={() => setView(AppView.CREATE_PATH)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-transform hover:scale-105 w-full md:w-auto justify-center"
            >
                <Plus className="w-5 h-5" /> New Learning Path
            </button>
        </header>

        {/* Daily Insights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 opacity-90 mb-2">
                        <TrendingUp className="w-5 h-5" /> Daily Growth
                    </div>
                    <div className="text-4xl font-bold mb-1">Top 5%</div>
                    <div className="text-sm opacity-80">You're learning faster than most peers today!</div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                    <Trophy className="w-32 h-32" />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Chapters Today</div>
                    <div className="text-3xl font-bold text-slate-900">{dailyStats.chaptersCompletedToday}</div>
                </div>
                <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(dailyStats.chaptersCompletedToday * 20, 100)}%` }}></div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total XP</div>
                    <div className="text-3xl font-bold text-slate-900">{dailyStats.totalXp}</div>
                </div>
                <div className="flex items-center gap-2 text-orange-500 text-sm font-medium mt-2">
                    <Sparkles className="w-4 h-4" /> {dailyStats.streakDays} Day Streak!
                </div>
            </div>
        </div>

        {/* Learning Paths Grid */}
        <h2 className="text-xl font-bold text-slate-800 mb-6">Your Active Paths</h2>
        {paths.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Book className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No active learning paths</h3>
                <p className="text-slate-500 mb-6">Start your first journey to see it here.</p>
                <button 
                    onClick={() => setView(AppView.CREATE_PATH)}
                    className="text-indigo-600 font-semibold hover:underline"
                >
                    Create a Path &rarr;
                </button>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-6">
                {paths.map(path => (
                    <div 
                        key={path.id}
                        onClick={() => switchToPath(path.id)}
                        className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{path.topic}</h3>
                                <p className="text-sm text-slate-500">{path.userState.level} • {path.userState.goal}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${path.progress}%` }}></div>
                            </div>
                            <span className="font-medium">{path.progress}%</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  };

  const renderPathDashboard = () => {
    const activePath = paths.find(p => p.id === activePathId);
    if (!activePath) return null;

    const { plan } = activePath;

    // Data for radar chart
    const radarData = [
        ...plan.strengths.map(s => ({ subject: s.substring(0,10), A: 100, fullMark: 100 })),
        ...plan.weaknesses.map(w => ({ subject: w.substring(0,10), A: 40, fullMark: 100 }))
    ].slice(0, 6);

    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-slate-50">
         {/* Internal Sidebar */}
         <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-1/3 md:h-full">
             <div className="p-6 border-b border-slate-100">
                 <h2 className="font-bold text-xl text-slate-800 truncate">{activePath.topic}</h2>
                 <p className="text-xs text-slate-400 uppercase mt-1 tracking-wider">{activePath.userState.goal}</p>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {plan.learning_plan.map((chapter) => (
                    <div 
                         key={chapter.chapter_id}
                         onClick={() => chapter.status !== 'locked' && loadChapter(chapter.chapter_id)}
                         className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all
                            ${currentChapterId === chapter.chapter_id && view === AppView.CHAPTER ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}
                            ${chapter.status === 'locked' ? 'opacity-50' : ''}
                         `}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                            ${chapter.status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' : 
                              chapter.status === 'locked' ? 'bg-slate-100 border-slate-300 text-slate-400' : 'bg-white border-indigo-400 text-indigo-700'}
                        `}>
                            {chapter.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : chapter.chapter_id}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">{chapter.title}</span>
                    </div>
                 ))}
             </div>
         </div>

         {/* Main Content Area */}
         <main className="flex-1 overflow-y-auto h-2/3 md:h-full">
             {view === AppView.CHAPTER && currentChapterContent ? (
                 <ChapterView 
                    content={currentChapterContent}
                    onChapterComplete={handleChapterComplete}
                    onChangeStyle={(s) => activePathId && currentChapterId && loadChapter(currentChapterId, s)}
                    isGenerating={loading}
                 />
             ) : (
                 <div className="p-8 max-w-4xl mx-auto animate-fade-in">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Curriculum Overview</h1>
                        <p className="text-slate-600">Estimated Level: <strong>{plan.estimated_level}</strong></p>
                    </header>
                    
                    {feedback && (
                        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 flex items-start gap-3">
                            <Sparkles className="w-5 h-5 mt-0.5" />
                            <div>
                                <h4 className="font-semibold">AI Tutor Update</h4>
                                <p>{feedback}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800">Learning Path</h3>
                            {plan.learning_plan.map(chapter => (
                                <div key={chapter.chapter_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800">Chapter {chapter.chapter_id}: {chapter.title}</h4>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            chapter.difficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                                            chapter.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>{chapter.difficulty}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">{chapter.objective}</p>
                                    <button 
                                        disabled={chapter.status === 'locked'}
                                        onClick={() => loadChapter(chapter.chapter_id)}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
                                    >
                                        {chapter.status === 'completed' ? 'Review Chapter' : chapter.status === 'locked' ? 'Locked' : 'Start Chapter'} &rarr;
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 text-center">Skill Balance</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name="Skills" dataKey="A" stroke="#6366f1" strokeWidth={2} fill="#818cf8" fillOpacity={0.4} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             )}
         </main>
      </div>
    );
  };

  // --- Main Render Switch ---

  // Loading Overlay
  if (loading && view !== AppView.PLANNING) {
      return (
          <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium animate-pulse">Consulting Gemini AI...</p>
          </div>
      );
  }

  // Planning specific loading screen
  if (view === AppView.PLANNING && loading) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
            <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Architecting your path...</h2>
            <p className="text-slate-500">Analysing quiz results to build a custom curriculum.</p>
        </div>
    );
  }

  if (view === AppView.CREATE_PATH || (view === AppView.HOME && paths.length === 0)) {
    return (
      <>
        <Header onGoHome={goHome} />
        <WelcomeScreen onStart={startNewPathJourney} isProcessing={loading} onCancel={goHome} showCancel={paths.length > 0} />
      </>
    );
  }

  if (view === AppView.DIAGNOSTIC && diagnosticQuiz) {
    return (
        <div className="h-screen bg-slate-50 flex flex-col">
             <Header onGoHome={goHome} />
             <div className="flex-1 overflow-y-auto relative">
                <button onClick={goHome} className="absolute top-6 left-6 flex items-center text-slate-500 hover:text-slate-800 z-10">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Quit Diagnostic
                </button>
                <QuizView 
                    title={`Diagnostic: ${diagnosticQuiz.topic}`} 
                    subTitle="Let's see where you stand to tailor the course."
                    questions={diagnosticQuiz.quiz} 
                    onComplete={handleDiagnosticComplete}
                    isSubmitting={loading}
                />
             </div>
        </div>
    );
  }

  // App container with Header
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header 
        onGoHome={goHome} 
        activeTopic={activePathId ? paths.find(p => p.id === activePathId)?.topic : undefined} 
      />
      
      {(view === AppView.PATH_DASHBOARD || view === AppView.CHAPTER) ? (
        renderPathDashboard()
      ) : (
        renderHomeDashboard()
      )}
    </div>
  );
}