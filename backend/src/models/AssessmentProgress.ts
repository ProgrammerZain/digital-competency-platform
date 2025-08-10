import mongoose, { Document, Schema } from 'mongoose';
import {
  AssessmentProgress as IAssessmentProgress,
  CompetencyScore,
  Achievement,
  AssessmentStep,
  AssessmentLevel,
  DigitalCompetency,
  CompetencyScoreType,
  AchievementType,
} from '../types';

// Extend the AssessmentProgress interface with Mongoose Document
export interface IAssessmentProgressDocument extends Omit<IAssessmentProgress, '_id'>, Document {
  // Instance methods
  updateStepProgress(step: number, score: number, level: AssessmentLevel): Promise<void>;
  updateCompetencyScore(
    competency: DigitalCompetency,
    score: number,
    level: AssessmentLevel
  ): Promise<void>;
  addAchievement(achievement: Achievement): Promise<void>;
  canTakeStep(step: number): boolean;
  getNextAvailableStep(): number | null;
  calculateOverallProgress(): number;
  getRecommendations(): string[];
}

// Competency Score Schema
const CompetencyScoreSchema = new Schema<CompetencyScore>(
  {
    competency: {
      type: String,
      enum: Object.values(DigitalCompetency),
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    level: {
      type: String,
      enum: Object.values(AssessmentLevel),
      required: true,
    },
    questionsAttempted: {
      type: Number,
      required: true,
      min: [0, 'Questions attempted cannot be negative'],
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: [0, 'Correct answers cannot be negative'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Achievement Schema
const AchievementSchema = new Schema<Achievement>(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Achievement name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Achievement description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['level', 'speed', 'accuracy', 'streak', 'special'],
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    iconUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Icon URL must be a valid HTTP/HTTPS URL'],
    },
  },
  { _id: false }
);

// Assessment Progress Schema
const AssessmentProgressSchema = new Schema<IAssessmentProgressDocument>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },

    // Overall progress
    currentStep: {
      type: Number,
      enum: Object.values(AssessmentStep),
      default: 1,
    },
    highestLevelAchieved: {
      type: String,
      enum: Object.values(AssessmentLevel),
      default: AssessmentLevel.A1,
    },

    // Step-wise progress
    step1Completed: {
      type: Boolean,
      default: false,
    },
    step1Score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    step1Level: {
      type: String,
      enum: Object.values(AssessmentLevel),
    },
    step1CompletedAt: {
      type: Date,
    },

    step2Completed: {
      type: Boolean,
      default: false,
    },
    step2Score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    step2Level: {
      type: String,
      enum: Object.values(AssessmentLevel),
    },
    step2CompletedAt: {
      type: Date,
    },

    step3Completed: {
      type: Boolean,
      default: false,
    },
    step3Score: {
      type: Number,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    step3Level: {
      type: String,
      enum: Object.values(AssessmentLevel),
    },
    step3CompletedAt: {
      type: Date,
    },

    // Overall statistics
    totalAssessmentsTaken: {
      type: Number,
      default: 0,
      min: [0, 'Total assessments taken cannot be negative'],
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: [0, 'Total time spent cannot be negative'],
    },
    averageScore: {
      type: Number,
      default: 0,
      min: [0, 'Average score cannot be negative'],
      max: [100, 'Average score cannot exceed 100'],
    },

    // Competency-wise scores
    competencyScores: {
      type: [CompetencyScoreSchema],
      default: [],
    },

    // Restrictions
    canRetakeStep1: {
      type: Boolean,
      default: true,
    },
    nextAssessmentDate: {
      type: Date,
    },

    // Achievement tracking
    achievements: {
      type: [AchievementSchema],
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
AssessmentProgressSchema.index({ userId: 1 }, { unique: true });
AssessmentProgressSchema.index({ currentStep: 1 });
AssessmentProgressSchema.index({ highestLevelAchieved: 1 });
AssessmentProgressSchema.index({ 'competencyScores.competency': 1 });

// Pre-save middleware
AssessmentProgressSchema.pre('save', function (this: IAssessmentProgressDocument, next) {
  // Update current step based on completed steps
  if (this.step3Completed) {
    this.currentStep = 3;
  } else if (this.step2Completed) {
    this.currentStep = 3;
  } else if (this.step1Completed) {
    this.currentStep = 2;
  } else {
    this.currentStep = 1;
  }

  // Update highest level achieved
  const levels = [this.step1Level, this.step2Level, this.step3Level].filter(Boolean);
  if (levels.length > 0) {
    const levelOrder = [
      AssessmentLevel.A1,
      AssessmentLevel.A2,
      AssessmentLevel.B1,
      AssessmentLevel.B2,
      AssessmentLevel.C1,
      AssessmentLevel.C2,
    ];

    const highestIndex = Math.max(
      ...levels.map(level => levelOrder.indexOf(level as AssessmentLevel))
    );
    if (highestIndex >= 0) {
      this.highestLevelAchieved = levelOrder[highestIndex];
    }
  }

  // Calculate average score
  const scores = [this.step1Score, this.step2Score, this.step3Score].filter(
    score => score !== undefined && score !== null
  );
  if (scores.length > 0) {
    this.averageScore = Math.round(
      scores.reduce((sum, score) => sum + (score as number), 0) / scores.length
    );
  }

  next();
});

// Instance method to update step progress
AssessmentProgressSchema.methods.updateStepProgress = async function (
  step: number,
  score: number,
  level: AssessmentLevel
): Promise<void> {
  switch (step) {
    case 1:
      this.step1Completed = true;
      this.step1Score = score;
      this.step1Level = level;
      this.step1CompletedAt = new Date();
      // If failed Step 1 (score < 25%), disable retake
      if (score < 25) {
        this.canRetakeStep1 = false;
      }
      break;
    case 2:
      this.step2Completed = true;
      this.step2Score = score;
      this.step2Level = level;
      this.step2CompletedAt = new Date();
      break;
    case 3:
      this.step3Completed = true;
      this.step3Score = score;
      this.step3Level = level;
      this.step3CompletedAt = new Date();
      break;
  }

  this.totalAssessmentsTaken += 1;
  await this.save();
};

// Instance method to update competency score
AssessmentProgressSchema.methods.updateCompetencyScore = async function (
  competency: DigitalCompetency,
  score: number,
  level: AssessmentLevel,
  questionsAttempted: number = 1,
  correctAnswers: number = 0
): Promise<void> {
  const existingIndex = this.competencyScores.findIndex(
    (cs: CompetencyScoreType) => cs.competency === competency
  );

  if (existingIndex >= 0) {
    // Update existing competency score
    const existing = this.competencyScores[existingIndex];
    existing.score = Math.max(existing.score, score); // Keep highest score
    existing.level = level;
    existing.questionsAttempted += questionsAttempted;
    existing.correctAnswers += correctAnswers;
    existing.lastUpdated = new Date();
  } else {
    // Add new competency score
    this.competencyScores.push({
      competency,
      score,
      level,
      questionsAttempted,
      correctAnswers,
      lastUpdated: new Date(),
    });
  }

  await this.save();
};

// Instance method to add achievement
AssessmentProgressSchema.methods.addAchievement = async function (
  achievement: Achievement
): Promise<void> {
  // Check if achievement already exists
  const existingAchievement = this.achievements.find(
    (a: AchievementType) => a.id === achievement.id
  );
  if (!existingAchievement) {
    this.achievements.push(achievement);
    await this.save();
  }
};

// Instance method to check if can take step
AssessmentProgressSchema.methods.canTakeStep = function (step: number): boolean {
  switch (step) {
    case 1:
      return this.canRetakeStep1 || !this.step1Completed;
    case 2:
      return this.step1Completed && (this.step1Score || 0) >= 75;
    case 3:
      return this.step2Completed && (this.step2Score || 0) >= 75;
    default:
      return false;
  }
};

// Instance method to get next available step
AssessmentProgressSchema.methods.getNextAvailableStep = function (): number | null {
  if (this.canTakeStep(1)) return 1;
  if (this.canTakeStep(2)) return 2;
  if (this.canTakeStep(3)) return 3;
  return null;
};

// Instance method to calculate overall progress
AssessmentProgressSchema.methods.calculateOverallProgress = function (): number {
  let progress = 0;

  if (this.step1Completed) progress += 33.33;
  if (this.step2Completed) progress += 33.33;
  if (this.step3Completed) progress += 33.34;

  return Math.round(progress);
};

// Instance method to get recommendations
AssessmentProgressSchema.methods.getRecommendations = function (): string[] {
  const recommendations: string[] = [];

  // Check weak competencies
  const weakCompetencies = this.competencyScores.filter((cs: CompetencyScoreType) => cs.score < 50);
  if (weakCompetencies.length > 0) {
    recommendations.push(
      `Focus on improving: ${weakCompetencies.map((cs: CompetencyScoreType) => cs.competency).join(', ')}`
    );
  }

  // Check if ready for next step
  const nextStep = this.getNextAvailableStep();
  if (nextStep) {
    recommendations.push(`You're ready to take Step ${nextStep}!`);
  }

  // Check if completed all steps
  if (this.step3Completed) {
    recommendations.push('Congratulations! You have completed all assessment steps.');
  }

  // Practice recommendations
  if (this.averageScore < 75) {
    recommendations.push('Consider practicing more to improve your overall score.');
  }

  return recommendations;
};

// Static method to create initial progress for user
AssessmentProgressSchema.statics.createForUser = function (userId: string) {
  return this.create({
    userId: userId,
    currentStep: 1,
    highestLevelAchieved: AssessmentLevel.A1,
    canRetakeStep1: true,
    competencyScores: [],
    achievements: [],
  });
};

// Static method to get progress statistics
AssessmentProgressSchema.statics.getProgressStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$highestLevelAchieved',
        count: { $sum: 1 },
        averageAssessments: { $avg: '$totalAssessmentsTaken' },
        averageScore: { $avg: '$averageScore' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Static method to get competency statistics
AssessmentProgressSchema.statics.getCompetencyStats = function () {
  return this.aggregate([
    { $unwind: '$competencyScores' },
    {
      $group: {
        _id: '$competencyScores.competency',
        averageScore: { $avg: '$competencyScores.score' },
        totalAttempts: { $sum: '$competencyScores.questionsAttempted' },
        totalCorrect: { $sum: '$competencyScores.correctAnswers' },
      },
    },
    {
      $addFields: {
        successRate: {
          $cond: [
            { $gt: ['$totalAttempts', 0] },
            { $multiply: [{ $divide: ['$totalCorrect', '$totalAttempts'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { averageScore: -1 } },
  ]);
};

// Virtual for completion status
AssessmentProgressSchema.virtual('completionStatus').get(function (
  this: IAssessmentProgressDocument
) {
  if (this.step3Completed) return 'Completed';
  if (this.step2Completed) return 'Advanced';
  if (this.step1Completed) return 'Intermediate';
  return 'Beginner';
});

// Virtual for total steps completed
AssessmentProgressSchema.virtual('stepsCompleted').get(function (
  this: IAssessmentProgressDocument
) {
  let completed = 0;
  if (this.step1Completed) completed++;
  if (this.step2Completed) completed++;
  if (this.step3Completed) completed++;
  return completed;
});

// Virtual for best competency
AssessmentProgressSchema.virtual('bestCompetency').get(function (
  this: IAssessmentProgressDocument
) {
  if (this.competencyScores.length === 0) return null;

  return this.competencyScores.reduce((best, current) =>
    current.score > best.score ? current : best
  );
});

// Virtual for weakest competency
AssessmentProgressSchema.virtual('weakestCompetency').get(function (
  this: IAssessmentProgressDocument
) {
  if (this.competencyScores.length === 0) return null;

  return this.competencyScores.reduce((weakest, current) =>
    current.score < weakest.score ? current : weakest
  );
});

// Create and export the model
const AssessmentProgress = mongoose.model<IAssessmentProgressDocument>(
  'AssessmentProgress',
  AssessmentProgressSchema
);

export default AssessmentProgress;
