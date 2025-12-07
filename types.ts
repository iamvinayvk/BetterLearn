// Enums
export enum AppView {
  WELCOME = 'WELCOME',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PLANNING = 'PLANNING', // Loading state while plan is generated
  DASHBOARD = 'DASHBOARD',
  CHAPTER = 'CHAPTER'
}

export enum QuestionType {
  MCQ = 'mcq',
  SHORT = 'short'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Interfaces
export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctIndex?: number; // For MCQ
  explanation?: string; // For review
}

export interface DiagnosticQuiz {
  topic: string;
  quiz: Question[];
}

export interface Chapter {
  chapter_id: number;
  title: string;
  objective: string;
  estimated_time_minutes: number;
  difficulty: Difficulty;
  topics: string[];
  status: 'locked' | 'unlocked' | 'completed';
  score?: number;
}

export interface LearningPlan {
  estimated_level: string;
  strengths: string[];
  weaknesses: string[];
  learning_plan: Chapter[];
}

export interface Resource {
  title: string;
  url: string;
  description: string;
}

export interface ChapterContent {
  chapter_id: number;
  title: string;
  summary: string;
  key_points: string[];
  example: string;
  analogy: string;
  diagram_prompt: string;
  external_resources: {
    videos: Resource[];
    blogs: Resource[];
    docs: Resource[];
  };
  chapter_quiz: Question[];
}

export interface AdaptiveUpdate {
  chapter_id: number;
  chapter_score: number;
  feedback: string;
  adjustments: {
    difficulty_change: 'easier' | 'same' | 'harder';
    added_remedial_content: string[];
    skipped_future_topics: string[];
    added_advanced_topics: string[];
  };
  updated_plan?: Chapter[];
}

export interface UserState {
  topic: string;
  level: string;
  goal: string;
  contextImage?: string; // Base64
  contextText?: string;
}
