import {
  BaseDocument,
  AssessmentLevel,
  AssessmentStep,
  AssessmentStatus,
  DigitalCompetency,
  QuestionType,
  CertificateStatus,
} from './index';

// Question Interface
export interface Question extends BaseDocument {
  questionText: string;
  questionType: QuestionType;
  competency: DigitalCompetency;
  level: AssessmentLevel;
  step: AssessmentStep;

  // Multiple choice options
  options?: QuestionOption[];

  // Correct answer(s)
  correctAnswers: string[];

  // Question metadata
  difficulty: number; // 1-5 scale
  timeAllowed: number; // in minutes
  points: number;

  // Additional data
  explanation?: string;
  tags?: string[];
  isActive: boolean;

  // Media attachments
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;

  // Question statistics
  timesAnswered: number;
  correctAnswerRate: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

// Assessment Session Interface
export interface AssessmentSession extends BaseDocument {
  userId: string;
  step: AssessmentStep;
  status: AssessmentStatus;

  // Questions for this session
  questions: AssessmentQuestion[];

  // Timing
  startTime: Date;
  endTime?: Date;
  timeAllowed: number; // Total time in minutes
  timeRemaining?: number; // Remaining time in seconds

  // Answers
  answers: AssessmentAnswer[];

  // Results
  score?: number;
  percentage?: number;
  levelAchieved?: AssessmentLevel;
  passed: boolean;

  // Next step eligibility
  canProceedToNextStep: boolean;
  nextStepUnlockedAt?: Date;

  // Session metadata
  ipAddress?: string;
  userAgent?: string;
  browserFingerprint?: string;

  // Security flags
  isCompleted: boolean;
  isSubmitted: boolean;
  hasCheatingFlags: boolean;
  cheatingDetails?: CheatingFlag[];
}

export interface AssessmentQuestion {
  questionId: string;
  order: number;
  competency: DigitalCompetency;
  level: AssessmentLevel;
  points: number;
  timeAllowed: number;

  // For display during assessment
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[];

  // Media
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface AssessmentAnswer {
  questionId: string;
  selectedAnswers: string[];
  timeSpent: number; // in seconds
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: Date;

  // For tracking user behavior
  changedAnswers: number;
  tabSwitches: number;
  copyPasteDetected: boolean;
}

export interface CheatingFlag {
  type: 'tab_switch' | 'copy_paste' | 'suspicious_timing' | 'multiple_sessions' | 'network_change';
  details: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

// Assessment Progress Interface
export interface AssessmentProgress extends BaseDocument {
  userId: string;

  // Overall progress
  currentStep: AssessmentStep;
  highestLevelAchieved: AssessmentLevel;

  // Step-wise progress
  step1Completed: boolean;
  step1Score?: number;
  step1Level?: AssessmentLevel;
  step1CompletedAt?: Date;

  step2Completed: boolean;
  step2Score?: number;
  step2Level?: AssessmentLevel;
  step2CompletedAt?: Date;

  step3Completed: boolean;
  step3Score?: number;
  step3Level?: AssessmentLevel;
  step3CompletedAt?: Date;

  // Overall statistics
  totalAssessmentsTaken: number;
  totalTimeSpent: number; // in minutes
  averageScore: number;

  // Competency-wise scores
  competencyScores: CompetencyScore[];

  // Restrictions
  canRetakeStep1: boolean;
  nextAssessmentDate?: Date;

  // Achievement tracking
  achievements: Achievement[];
}

export interface CompetencyScore {
  competency: DigitalCompetency;
  score: number;
  level: AssessmentLevel;
  questionsAttempted: number;
  correctAnswers: number;
  lastUpdated: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: 'level' | 'speed' | 'accuracy' | 'streak' | 'special';
  unlockedAt: Date;
  iconUrl?: string;
}

// Certificate Interface
export interface Certificate extends BaseDocument {
  userId: string;
  assessmentSessionId: string;

  // Certificate details
  certificateNumber: string;
  level: AssessmentLevel;
  status: CertificateStatus;

  // Scoring details
  score: number;
  percentage: number;
  competencyBreakdown: CompetencyScore[];

  // Dates
  issuedAt: Date;
  expiresAt?: Date;
  validatedAt?: Date;

  // Certificate file
  certificateUrl?: string;
  verificationCode: string;

  // Issuer information
  issuedBy: string;
  issuerTitle: string;
  issuerSignature?: string;

  // Verification
  isVerified: boolean;
  verificationDetails?: {
    verifiedBy: string;
    verifiedAt: Date;
    notes?: string;
  };

  // Sharing
  isPublic: boolean;
  shareUrl?: string;
  downloadCount: number;
}

// Request/Response Interfaces

// Start Assessment Request
export interface StartAssessmentRequest {
  step: AssessmentStep;
}

export interface StartAssessmentResponse {
  sessionId: string;
  questions: AssessmentQuestion[];
  timeAllowed: number;
  totalQuestions: number;
  step: AssessmentStep;
}

// Submit Answer Request
export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedAnswers: string[];
  timeSpent: number;
}

// Submit Assessment Request
export interface SubmitAssessmentRequest {
  sessionId: string;
  answers: AssessmentAnswer[];
  totalTimeSpent: number;
}

export interface AssessmentResultResponse {
  sessionId: string;
  score: number;
  percentage: number;
  levelAchieved: AssessmentLevel;
  passed: boolean;
  canProceedToNextStep: boolean;

  // Detailed breakdown
  competencyResults: CompetencyResult[];
  timeSpent: number;
  correctAnswers: number;
  totalQuestions: number;

  // Next steps
  nextStepAvailable: boolean;
  nextStepUnlocksAt?: Date;
  certificateGenerated: boolean;
  certificateId?: string;
}

export interface CompetencyResult {
  competency: DigitalCompetency;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  level: AssessmentLevel;
}

// Assessment Statistics
export interface AssessmentStatistics {
  totalAssessments: number;
  completedAssessments: number;
  averageScore: number;
  averageCompletionTime: number;

  // By step
  step1Stats: StepStatistics;
  step2Stats: StepStatistics;
  step3Stats: StepStatistics;

  // By level
  levelDistribution: Record<AssessmentLevel, number>;

  // Pass rates
  overallPassRate: number;
  passRateByStep: Record<AssessmentStep, number>;
}

export interface StepStatistics {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  averageCompletionTime: number;
}

// Admin Question Management
export interface CreateQuestionRequest {
  questionText: string;
  questionType: QuestionType;
  competency: DigitalCompetency;
  level: AssessmentLevel;
  step: AssessmentStep;
  options?: Omit<QuestionOption, 'id'>[];
  correctAnswers: string[];
  difficulty: number;
  timeAllowed: number;
  points: number;
  explanation?: string;
  tags?: string[];
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  isActive?: boolean;
}

export interface QuestionQuery {
  competency?: DigitalCompetency;
  level?: AssessmentLevel;
  step?: AssessmentStep;
  questionType?: QuestionType;
  difficulty?: number;
  isActive?: boolean;
  search?: string;
}

// Bulk Question Operations
export interface BulkQuestionAction {
  questionIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'export';
}

export interface ImportQuestionsRequest {
  questions: CreateQuestionRequest[];
  overwriteExisting: boolean;
}
