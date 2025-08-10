// Type helpers for Mongoose array methods
export type CompetencyScoreType = {
  competency: string;
  score: number;
  level: string;
  questionsAttempted: number;
  correctAnswers: number;
  lastUpdated: Date;
};

export type AchievementType = {
  id: string;
  name: string;
  description: string;
  type: string;
  unlockedAt: Date;
  iconUrl?: string;
};

export type AssessmentQuestionType = {
  questionId: string;
  order: number;
  competency: string;
  level: string;
  points: number;
  timeAllowed: number;
  questionText: string;
  questionType: string;
  options?: any[];
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
};

export type AssessmentAnswerType = {
  questionId: string;
  selectedAnswers: string[];
  timeSpent: number;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: Date;
  changedAnswers: number;
  tabSwitches: number;
  copyPasteDetected: boolean;
};
