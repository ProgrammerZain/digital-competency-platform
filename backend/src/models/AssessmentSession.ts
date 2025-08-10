import mongoose, { Document, Schema } from 'mongoose';
import {
  AssessmentSession as IAssessmentSession,
  AssessmentQuestion,
  AssessmentAnswer,
  CheatingFlag,
  AssessmentStep,
  AssessmentStatus,
  AssessmentLevel,
  DigitalCompetency,
  QuestionType,
  AssessmentQuestionType,
  AssessmentAnswerType,
} from '../types';

// Extend the AssessmentSession interface with Mongoose Document
export interface IAssessmentSessionDocument extends Omit<IAssessmentSession, '_id'>, Document {
  // Instance methods
  calculateScore(): { score: number; percentage: number; correctAnswers: number };
  determineLevel(): AssessmentLevel | null;
  canProceedToNext(): boolean;
  addCheatingFlag(type: string, details: string, severity: 'low' | 'medium' | 'high'): void;
  submitAnswer(questionId: string, selectedAnswers: string[], timeSpent: number): void;
  getRemainingTime(): number;
  isExpired(): boolean;
  markCompleted(): Promise<void>;
}

// Cheating Flag Schema
const CheatingFlagSchema = new Schema<CheatingFlag>(
  {
    type: {
      type: String,
      enum: [
        'tab_switch',
        'copy_paste',
        'suspicious_timing',
        'multiple_sessions',
        'network_change',
      ],
      required: true,
    },
    details: {
      type: String,
      required: true,
      maxlength: [500, 'Cheating flag details cannot exceed 500 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { _id: false }
);

// Assessment Question Schema (for storing question data in session)
const AssessmentQuestionSchema = new Schema<AssessmentQuestion>(
  {
    questionId: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      min: [1, 'Question order must be at least 1'],
    },
    competency: {
      type: String,
      enum: Object.values(DigitalCompetency),
      required: true,
    },
    level: {
      type: String,
      enum: Object.values(AssessmentLevel),
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: [1, 'Points must be at least 1'],
    },
    timeAllowed: {
      type: Number,
      required: true,
      min: [30, 'Time allowed must be at least 30 seconds'],
    },

    // For display during assessment
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
    },
    options: [
      {
        id: String,
        text: String,
        isCorrect: Boolean,
        order: Number,
      },
    ],

    // Media
    imageUrl: String,
    audioUrl: String,
    videoUrl: String,
  },
  { _id: false }
);

// Assessment Answer Schema
const AssessmentAnswerSchema = new Schema<AssessmentAnswer>(
  {
    questionId: {
      type: String,
      required: true,
    },
    selectedAnswers: {
      type: [String],
      required: true,
    },
    timeSpent: {
      type: Number,
      required: true,
      min: [0, 'Time spent cannot be negative'],
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    pointsEarned: {
      type: Number,
      required: true,
      min: [0, 'Points earned cannot be negative'],
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },

    // For tracking user behavior
    changedAnswers: {
      type: Number,
      default: 0,
      min: [0, 'Changed answers cannot be negative'],
    },
    tabSwitches: {
      type: Number,
      default: 0,
      min: [0, 'Tab switches cannot be negative'],
    },
    copyPasteDetected: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Assessment Session Schema
const AssessmentSessionSchema = new Schema<IAssessmentSessionDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    step: {
      type: Number,
      enum: Object.values(AssessmentStep),
      required: [true, 'Assessment step is required'],
    },
    status: {
      type: String,
      enum: Object.values(AssessmentStatus),
      default: AssessmentStatus.NOT_STARTED,
    },

    // Questions for this session
    questions: {
      type: [AssessmentQuestionSchema],
      required: true,
      validate: {
        validator: function (questions: AssessmentQuestion[]) {
          return questions.length > 0 && questions.length <= 50;
        },
        message: 'Session must have 1-50 questions',
      },
    },

    // Timing
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    timeAllowed: {
      type: Number,
      required: true,
      min: [1800, 'Time allowed must be at least 30 minutes'], // 30 minutes minimum
      max: [14400, 'Time allowed cannot exceed 4 hours'], // 4 hours maximum
    },
    timeRemaining: {
      type: Number,
      min: [0, 'Time remaining cannot be negative'],
    },

    // Answers
    answers: {
      type: [AssessmentAnswerSchema],
      default: [],
    },

    // Results (populated after completion)
    score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    levelAchieved: {
      type: String,
      enum: Object.values(AssessmentLevel),
    },
    passed: {
      type: Boolean,
      default: false,
    },

    // Next step eligibility
    canProceedToNextStep: {
      type: Boolean,
      default: false,
    },
    nextStepUnlockedAt: {
      type: Date,
    },

    // Session metadata
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    browserFingerprint: {
      type: String,
    },

    // Security flags
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    hasCheatingFlags: {
      type: Boolean,
      default: false,
    },
    cheatingDetails: {
      type: [CheatingFlagSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
AssessmentSessionSchema.index({ userId: 1, step: 1 });
AssessmentSessionSchema.index({ status: 1 });
AssessmentSessionSchema.index({ startTime: 1 });
AssessmentSessionSchema.index({ isCompleted: 1 });
AssessmentSessionSchema.index({ userId: 1, createdAt: -1 });

// Pre-save middleware
AssessmentSessionSchema.pre('save', function (this: IAssessmentSessionDocument, next) {
  // Update status based on completion
  if (this.isCompleted && this.status !== AssessmentStatus.COMPLETED) {
    this.status = AssessmentStatus.COMPLETED;
  }

  // Set end time when completed
  if (this.isCompleted && !this.endTime) {
    this.endTime = new Date();
  }

  // Update cheating flags status
  if (this.cheatingDetails) {
    this.hasCheatingFlags = this.cheatingDetails.length > 0;
  } else {
    this.hasCheatingFlags = false;
  }

  next();
});

// Instance method to calculate score
AssessmentSessionSchema.methods.calculateScore = function (): {
  score: number;
  percentage: number;
  correctAnswers: number;
} {
  if (this.answers.length === 0) {
    return { score: 0, percentage: 0, correctAnswers: 0 };
  }

  const totalPoints = this.questions.reduce(
    (sum: number, q: AssessmentQuestionType) => sum + q.points,
    0
  );
  const earnedPoints = this.answers.reduce(
    (sum: number, a: AssessmentAnswerType) => sum + a.pointsEarned,
    0
  );
  const correctAnswers = this.answers.filter((a: AssessmentAnswerType) => a.isCorrect).length;

  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score: earnedPoints,
    percentage: percentage,
    correctAnswers: correctAnswers,
  };
};

// Instance method to determine achieved level
AssessmentSessionSchema.methods.determineLevel = function (): AssessmentLevel | null {
  const { percentage } = this.calculateScore();

  if (percentage < 25) {
    return null; // Failed
  }

  // Level determination based on step and percentage
  const stepLevelMap: Record<number, { low: AssessmentLevel; high: AssessmentLevel }> = {
    1: { low: AssessmentLevel.A1, high: AssessmentLevel.A2 },
    2: { low: AssessmentLevel.B1, high: AssessmentLevel.B2 },
    3: { low: AssessmentLevel.C1, high: AssessmentLevel.C2 },
  };

  const levels = stepLevelMap[this.step];
  if (!levels) return null;

  // 25-49.99% = Lower level, 50%+ = Higher level
  return percentage >= 50 ? levels.high : levels.low;
};

// Instance method to check if can proceed to next step
AssessmentSessionSchema.methods.canProceedToNext = function (): boolean {
  const { percentage } = this.calculateScore();
  return percentage >= 75 && this.step < 3; // Need 75%+ and not on final step
};

// Instance method to add cheating flag
AssessmentSessionSchema.methods.addCheatingFlag = function (
  type: string,
  details: string,
  severity: 'low' | 'medium' | 'high' = 'medium'
): void {
  this.cheatingDetails.push({
    type: type as any,
    details: details,
    timestamp: new Date(),
    severity: severity,
  });
  this.hasCheatingFlags = true;
};

// Instance method to submit answer
AssessmentSessionSchema.methods.submitAnswer = function (
  questionId: string,
  selectedAnswers: string[],
  timeSpent: number
): void {
  // Find the question
  const question = this.questions.find((q: AssessmentQuestionType) => q.questionId === questionId);
  if (!question) {
    throw new Error('Question not found in session');
  }

  // Check if already answered
  const existingAnswerIndex = this.answers.findIndex(
    (a: AssessmentAnswerType) => a.questionId === questionId
  );
  // For multiple choice questions, check correctness
  // This is a simplified check - in real implementation, you'd verify against the Question model
  const isCorrect = this.checkAnswerCorrectness(question, selectedAnswers);
  const pointsEarned = isCorrect ? question.points : 0;

  const answerData: AssessmentAnswer = {
    questionId: questionId,
    selectedAnswers: selectedAnswers,
    timeSpent: timeSpent,
    isCorrect: isCorrect,
    pointsEarned: pointsEarned,
    answeredAt: new Date(),
    changedAnswers:
      existingAnswerIndex >= 0 ? this.answers[existingAnswerIndex].changedAnswers + 1 : 0,
    tabSwitches: 0,
    copyPasteDetected: false,
  };

  if (existingAnswerIndex >= 0) {
    // Update existing answer
    this.answers[existingAnswerIndex] = answerData;
  } else {
    // Add new answer
    this.answers.push(answerData);
  }

  // Update status
  if (this.status === AssessmentStatus.NOT_STARTED) {
    this.status = AssessmentStatus.IN_PROGRESS;
  }
};

// Helper method to check answer correctness (simplified)
AssessmentSessionSchema.methods.checkAnswerCorrectness = function (
  question: AssessmentQuestion,
  selectedAnswers: string[]
): boolean {
  if (question.questionType === QuestionType.MULTIPLE_CHOICE && question.options) {
    const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.id);
    const sortedCorrect = [...correctOptions].sort();
    const sortedSelected = [...selectedAnswers].sort();

    return (
      sortedCorrect.length === sortedSelected.length &&
      sortedCorrect.every((answer, index) => answer === sortedSelected[index])
    );
  }

  // For other question types, implement similar logic
  return false;
};

// Instance method to get remaining time
AssessmentSessionSchema.methods.getRemainingTime = function (): number {
  if (!this.startTime || this.isCompleted) {
    return 0;
  }

  const elapsedMs = Date.now() - this.startTime.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, this.timeAllowed - elapsedSeconds);

  return remainingSeconds;
};

// Instance method to check if session is expired
AssessmentSessionSchema.methods.isExpired = function (): boolean {
  return this.getRemainingTime() === 0 && !this.isCompleted;
};

// Instance method to mark as completed
AssessmentSessionSchema.methods.markCompleted = async function (): Promise<void> {
  if (this.isCompleted) {
    return;
  }

  const results = this.calculateScore();
  const achievedLevel = this.determineLevel();

  this.score = results.score;
  this.percentage = results.percentage;
  this.levelAchieved = achievedLevel;
  this.passed = results.percentage >= 25;
  this.canProceedToNextStep = this.canProceedToNext();
  this.isCompleted = true;
  this.isSubmitted = true;
  this.endTime = new Date();
  this.status = AssessmentStatus.COMPLETED;

  // Set next step unlock time if eligible
  if (this.canProceedToNextStep) {
    this.nextStepUnlockedAt = new Date();
  }

  await this.save();
};

// Static method to find active session for user
AssessmentSessionSchema.statics.findActiveSession = function (userId: string, step?: number) {
  const query: any = {
    userId: userId,
    status: { $in: [AssessmentStatus.NOT_STARTED, AssessmentStatus.IN_PROGRESS] },
    isCompleted: false,
  };

  if (step) {
    query.step = step;
  }

  return this.findOne(query);
};

// Static method to get user's completed sessions
AssessmentSessionSchema.statics.getUserCompletedSessions = function (userId: string) {
  return this.find({
    userId: userId,
    isCompleted: true,
  }).sort({ createdAt: -1 });
};

// Static method to get session statistics
AssessmentSessionSchema.statics.getSessionStats = function (filters: any = {}) {
  return this.aggregate([
    { $match: { isCompleted: true, ...filters } },
    {
      $group: {
        _id: '$step',
        totalSessions: { $sum: 1 },
        averageScore: { $avg: '$percentage' },
        passRate: {
          $avg: {
            $cond: [{ $gte: ['$percentage', 25] }, 1, 0],
          },
        },
        averageTimeSpent: {
          $avg: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              1000 * 60, // Convert to minutes
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Virtual for duration in minutes
AssessmentSessionSchema.virtual('durationMinutes').get(function (this: IAssessmentSessionDocument) {
  if (!this.startTime) return 0;
  const endTime = this.endTime || new Date();
  const durationMs = endTime.getTime() - this.startTime.getTime();
  return Math.round(durationMs / (1000 * 60));
});

// Virtual for completion percentage
AssessmentSessionSchema.virtual('completionPercentage').get(function (
  this: IAssessmentSessionDocument
) {
  if (this.questions.length === 0) return 0;
  return Math.round((this.answers.length / this.questions.length) * 100);
});

// Virtual for status text
AssessmentSessionSchema.virtual('statusText').get(function (this: IAssessmentSessionDocument) {
  const statusMap: Record<string, string> = {
    [AssessmentStatus.NOT_STARTED]: 'Not Started',
    [AssessmentStatus.IN_PROGRESS]: 'In Progress',
    [AssessmentStatus.COMPLETED]: 'Completed',
    [AssessmentStatus.FAILED]: 'Failed',
    [AssessmentStatus.EXPIRED]: 'Expired',
  };
  return statusMap[this.status] || 'Unknown';
});

// Create and export the model
const AssessmentSession = mongoose.model<IAssessmentSessionDocument>(
  'AssessmentSession',
  AssessmentSessionSchema
);

export default AssessmentSession;
