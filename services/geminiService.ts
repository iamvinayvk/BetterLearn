import { GoogleGenAI, Schema, Type } from "@google/genai";
import { DiagnosticQuiz, LearningPlan, ChapterContent, AdaptiveUpdate } from "../types";

// Initialize Gemini
// NOTE: We use 'gemini-3-pro-preview' for complex reasoning (Plan, Analysis)
// and 'gemini-2.5-flash' for faster generation (Quizzes, Content) where speed matters more.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON if the model wraps it in markdown
const cleanJSON = (text: string) => {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match) {
    return match[1];
  }
  return text.replace(/```json/g, '').replace(/```/g, '');
};

export const GeminiService = {
  
  // 1. Generate Diagnostic Quiz
  async generateDiagnosticQuiz(topic: string, level: string, context?: string): Promise<DiagnosticQuiz> {
    const modelId = "gemini-2.5-flash"; // Fast enough for quiz gen
    
    let prompt = `Create a diagnostic quiz for a student wanting to learn about: "${topic}".
    Target Level: ${level}.
    
    Requirements:
    - 5 questions total.
    - Mix of conceptual and practical questions.
    - Return STRICT JSON.
    `;

    if (context) {
      prompt += `\nAlso consider this extracted context from the user's notes: ${context}`;
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        topic: { type: Type.STRING },
        quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["mcq"] }, // Simplified to MCQ for this demo UI
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "type", "question", "options", "correctIndex", "explanation"]
          }
        }
      },
      required: ["status", "topic", "quiz"]
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an expert curriculum designer. Output strict JSON only."
      }
    });

    const data = JSON.parse(cleanJSON(response.text || "{}"));
    return data;
  },

  // 2. Evaluate Quiz & Create Plan (Uses Gemini 3 Pro for Reasoning)
  async evaluateAndPlan(topic: string, answers: {questionId: string, correct: boolean}[], userGoal: string): Promise<LearningPlan> {
    const modelId = "gemini-3-pro-preview"; // Use the smart model for planning

    const prompt = `Analyze these quiz results for the topic "${topic}". User Goal: "${userGoal}".
    Results: ${JSON.stringify(answers)}.
    
    Task:
    1. Estimate the user's actual proficiency.
    2. Identify specific strengths and weaknesses.
    3. Generate a structured 5-chapter learning plan.
    4. Adaptive logic: If they failed basic questions, start with fundamentals. If they aced it, go to advanced.
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        estimated_level: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        learning_plan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapter_id: { type: Type.INTEGER },
              title: { type: Type.STRING },
              objective: { type: Type.STRING },
              estimated_time_minutes: { type: Type.INTEGER },
              difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["chapter_id", "title", "objective", "difficulty"]
          }
        }
      },
      required: ["estimated_level", "learning_plan"]
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2 // Lower temp for more structured planning
      }
    });

    const data = JSON.parse(cleanJSON(response.text || "{}"));
    // Add default status for UI
    data.learning_plan = data.learning_plan.map((c: any, idx: number) => ({
      ...c,
      status: idx === 0 ? 'unlocked' : 'locked'
    }));
    return data;
  },

  // 3. Generate Chapter Content (Live)
  async generateChapter(topic: string, chapterInfo: any, style: string): Promise<ChapterContent> {
    const modelId = "gemini-2.5-flash"; 

    const prompt = `Generate educational content for Chapter ${chapterInfo.chapter_id}: "${chapterInfo.title}" on the topic "${topic}".
    Target Audience Style: ${style}.
    Objective: ${chapterInfo.objective}.
    
    Include:
    1. Crystal clear summary.
    2. Real-world analogy.
    3. Concrete example.
    4. A prompt describing a diagram that would help explain this.
    5. External Resources - CRITICAL INSTRUCTION:
       - DO NOT generate specific deep links that might be broken (404).
       - For Videos: Generate a YouTube Search URL. Format: "https://www.youtube.com/results?search_query=" + encoded keywords.
       - For Docs: Use the main documentation homepage or a highly stable Wikipedia link.
       - Ensure all links are 100% accessible public URLs.
    6. A short 3-question quiz to verify understanding.
    `;

    // Complex schema for nested resources
    const resourceSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        url: { type: Type.STRING },
        description: { type: Type.STRING } // Mapped from why_watch/read/reference
      },
      required: ["title", "url", "description"]
    };

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        chapter_id: { type: Type.INTEGER },
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
        example: { type: Type.STRING },
        analogy: { type: Type.STRING },
        diagram_prompt: { type: Type.STRING },
        external_resources: {
          type: Type.OBJECT,
          properties: {
            videos: { type: Type.ARRAY, items: resourceSchema },
            blogs: { type: Type.ARRAY, items: resourceSchema },
            docs: { type: Type.ARRAY, items: resourceSchema }
          }
        },
        chapter_quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["mcq"] },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            }
          }
        }
      },
      required: ["summary", "external_resources", "chapter_quiz"]
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(cleanJSON(response.text || "{}"));
  },

  // 4. Adaptive Update
  async adaptPlan(currentPlan: LearningPlan, chapterId: number, score: number): Promise<AdaptiveUpdate> {
    const modelId = "gemini-3-pro-preview"; // Logic needed

    const prompt = `User scored ${score}% on Chapter ${chapterId}.
    Current Plan Context: ${JSON.stringify(currentPlan.learning_plan.map(c => c.title))}.
    
    Determine:
    1. Should we make the next chapter harder or easier?
    2. Should we insert a remedial topic?
    3. Should we skip a future topic?
    
    Return the adjustments and optionally a revised list of future chapters.
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        chapter_id: { type: Type.INTEGER },
        chapter_score: { type: Type.NUMBER },
        feedback: { type: Type.STRING },
        adjustments: {
          type: Type.OBJECT,
          properties: {
            difficulty_change: { type: Type.STRING, enum: ["easier", "same", "harder"] },
            added_remedial_content: { type: Type.ARRAY, items: { type: Type.STRING } },
            skipped_future_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            added_advanced_topics: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      },
      required: ["feedback", "adjustments"]
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(cleanJSON(response.text || "{}"));
  },

  // 5. Multimodal Extraction
  async extractFromImage(base64Image: string): Promise<string> {
    const modelId = "gemini-2.5-flash-image"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Extract key concepts, topics, and vocabulary from this study material. Summarize it concisely for a learning algorithm." }
        ]
      }
    });

    return response.text || "";
  }
};