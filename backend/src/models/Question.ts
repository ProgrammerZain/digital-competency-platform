import mongoose, { Document, Schema } from 'mongoose';
import {
  Question as IQuestion,
  QuestionOption,
  AssessmentLevel,
  AssessmentStep,
  DigitalCompetency,
  QuestionType,
} from '../types';

// Extend the Question interface with Mongoose Document
export interface IQuestionDocument extends Omit<IQuestion, '_id'>, Document {
  // Instance methods
  isCorrectAnswer(selectedAnswers: string[]): boolean;
  calculateScore(selectedAnswers: string[]): number;
  incrementStats(isCorrect: boolean): Promise<void>;
  updateDifficulty(): Promise<void>;
}

// Question Option Schema
const QuestionOptionSchema = new Schema<QuestionOption>(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [500, 'Option text cannot exceed 500 characters'],
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      min: [1, 'Option order must be at least 1'],
    },
  },
  { _id: false }
);

// Question Schema
const QuestionSchema = new Schema<IQuestionDocument>(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [10, 'Question text must be at least 10 characters'],
      maxlength: [2000, 'Question text cannot exceed 2000 characters'],
    },
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      required: [true, 'Question type is required'],
    },
    competency: {
      type: String,
      enum: Object.values(DigitalCompetency),
      required: [true, 'Digital competency is required'],
    },
    level: {
      type: String,
      enum: Object.values(AssessmentLevel),
      required: [true, 'Assessment level is required'],
    },
    step: {
      type: Number,
      enum: Object.values(AssessmentStep),
      required: [true, 'Assessment step is required'],
    },

    // Multiple choice options (required for multiple_choice questions)
    options: {
      type: [QuestionOptionSchema],
      validate: {
        validator: function (this: IQuestionDocument, options: QuestionOption[]) {
          if (this.questionType === QuestionType.MULTIPLE_CHOICE) {
            return options && options.length >= 2 && options.length <= 6;
          }
          return true;
        },
        message: 'Multiple choice questions must have 2-6 options',
      },
    },

    // Correct answer(s)
    correctAnswers: {
      type: [String],
      required: [true, 'At least one correct answer is required'],
      validate: {
        validator: function (answers: string[]) {
          return answers && answers.length > 0;
        },
        message: 'At least one correct answer must be provided',
      },
    },

    // Question metadata
    difficulty: {
      type: Number,
      min: [1, 'Difficulty must be between 1 and 5'],
      max: [5, 'Difficulty must be between 1 and 5'],
      default: 3,
    },
    timeAllowed: {
      type: Number,
      min: [30, 'Time allowed must be at least 30 seconds'],
      max: [300, 'Time allowed cannot exceed 5 minutes'],
      default: 60, // 1 minute default
    },
    points: {
      type: Number,
      min: [1, 'Points must be at least 1'],
      max: [10, 'Points cannot exceed 10'],
      default: 1,
    },

    // Additional data
    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
    },
    tags: {
      type: [String],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Media attachments
    imageUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Image URL must be a valid HTTP/HTTPS URL'],
    },
    audioUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Audio URL must be a valid HTTP/HTTPS URL'],
    },
    videoUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Video URL must be a valid HTTP/HTTPS URL'],
    },

    // Question statistics
    timesAnswered: {
      type: Number,
      default: 0,
      min: [0, 'Times answered cannot be negative'],
    },
    correctAnswerRate: {
      type: Number,
      default: 0,
      min: [0, 'Correct answer rate cannot be negative'],
      max: [100, 'Correct answer rate cannot exceed 100'],
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
QuestionSchema.index({ competency: 1, level: 1, step: 1 });
QuestionSchema.index({ questionType: 1 });
QuestionSchema.index({ isActive: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ step: 1, isActive: 1 });
QuestionSchema.index({ tags: 1 });

// Compound index for efficient question selection
QuestionSchema.index({
  step: 1,
  level: 1,
  competency: 1,
  isActive: 1,
});

// Pre-save middleware for validation
QuestionSchema.pre('save', function (this: IQuestionDocument, next) {
  // Validate step and level consistency
  const stepLevelMap: Record<number, AssessmentLevel[]> = {
    1: [AssessmentLevel.A1, AssessmentLevel.A2],
    2: [AssessmentLevel.B1, AssessmentLevel.B2],
    3: [AssessmentLevel.C1, AssessmentLevel.C2],
  };

  if (!stepLevelMap[this.step].includes(this.level)) {
    return next(new Error(`Level ${this.level} is not valid for Step ${this.step}`));
  }

  // Generate option IDs for multiple choice questions
  if (this.questionType === QuestionType.MULTIPLE_CHOICE && this.options) {
    this.options.forEach((option, index) => {
      if (!option.id) {
        option.id = `option_${index + 1}`;
      }
    });
  }

  // Validate correct answers for multiple choice
  if (this.questionType === QuestionType.MULTIPLE_CHOICE) {
    if (!this.options || this.options.length === 0) {
      return next(new Error('Multiple choice questions must have options'));
    }

    const optionIds = this.options.map(opt => opt.id);
    const invalidAnswers = this.correctAnswers.filter(answer => !optionIds.includes(answer));

    if (invalidAnswers.length > 0) {
      return next(
        new Error(`Correct answers contain invalid option IDs: ${invalidAnswers.join(', ')}`)
      );
    }
  }

  // For true/false questions, ensure correct answers are valid
  if (this.questionType === QuestionType.TRUE_FALSE) {
    const validAnswers = ['true', 'false'];
    const invalidAnswers = this.correctAnswers.filter(
      answer => !validAnswers.includes(answer.toLowerCase())
    );

    if (invalidAnswers.length > 0) {
      return next(new Error('True/false questions must have "true" or "false" as correct answers'));
    }
  }

  next();
});

// Instance method to check if answer is correct
QuestionSchema.methods.isCorrectAnswer = function (selectedAnswers: string[]): boolean {
  if (!selectedAnswers || selectedAnswers.length === 0) {
    return false;
  }

  // Sort arrays for comparison
  const sortedCorrect = [...this.correctAnswers].sort();
  const sortedSelected = [...selectedAnswers].sort();

  // Check if arrays are equal
  return (
    sortedCorrect.length === sortedSelected.length &&
    sortedCorrect.every((answer, index) => answer === sortedSelected[index])
  );
};

// Instance method to calculate score
QuestionSchema.methods.calculateScore = function (selectedAnswers: string[]): number {
  return this.isCorrectAnswer(selectedAnswers) ? this.points : 0;
};

// Instance method to increment statistics
QuestionSchema.methods.incrementStats = async function (isCorrect: boolean): Promise<void> {
  this.timesAnswered += 1;

  if (this.timesAnswered === 1) {
    this.correctAnswerRate = isCorrect ? 100 : 0;
  } else {
    const previousCorrect = Math.round((this.correctAnswerRate / 100) * (this.timesAnswered - 1));
    const newCorrect = previousCorrect + (isCorrect ? 1 : 0);
    this.correctAnswerRate = Math.round((newCorrect / this.timesAnswered) * 100);
  }

  await this.save();
};

// Instance method to update difficulty based on performance
QuestionSchema.methods.updateDifficulty = async function (): Promise<void> {
  if (this.timesAnswered >= 10) {
    // Only update after sufficient data
    if (this.correctAnswerRate > 80) {
      this.difficulty = Math.max(1, this.difficulty - 1); // Make easier
    } else if (this.correctAnswerRate < 40) {
      this.difficulty = Math.min(5, this.difficulty + 1); // Make harder
    }

    await this.save();
  }
};

// Static method to get questions for assessment step
QuestionSchema.statics.getQuestionsForStep = function (
  step: AssessmentStep,
  limit: number = 44,
  excludeIds: string[] = []
) {
  const stepLevelMap: Record<number, AssessmentLevel[]> = {
    1: [AssessmentLevel.A1, AssessmentLevel.A2],
    2: [AssessmentLevel.B1, AssessmentLevel.B2],
    3: [AssessmentLevel.C1, AssessmentLevel.C2],
  };

  const query: any = {
    step: step,
    level: { $in: stepLevelMap[step] },
    isActive: true,
  };

  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }

  return this.find(query).limit(limit).sort({ difficulty: 1, timesAnswered: 1 }); // Prefer easier and less used questions
};

// Static method to get questions by competency
QuestionSchema.statics.getQuestionsByCompetency = function (
  competency: DigitalCompetency,
  level?: AssessmentLevel,
  limit?: number
) {
  const query: any = {
    competency: competency,
    isActive: true,
  };

  if (level) {
    query.level = level;
  }

  let queryBuilder = this.find(query).sort({ level: 1, difficulty: 1 });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  return queryBuilder;
};

// Static method to get random questions
QuestionSchema.statics.getRandomQuestions = function (filters: any = {}, limit: number = 10) {
  const query = {
    isActive: true,
    ...filters,
  };

  return this.aggregate([{ $match: query }, { $sample: { size: limit } }]);
};

// Virtual for difficulty text
QuestionSchema.virtual('difficultyText').get(function (this: IQuestionDocument) {
  const difficultyMap: Record<number, string> = {
    1: 'Very Easy',
    2: 'Easy',
    3: 'Medium',
    4: 'Hard',
    5: 'Very Hard',
  };
  return difficultyMap[this.difficulty] || 'Unknown';
});

// Virtual for step text
QuestionSchema.virtual('stepText').get(function (this: IQuestionDocument) {
  const stepMap: Record<number, string> = {
    1: 'Step 1 (A1-A2)',
    2: 'Step 2 (B1-B2)',
    3: 'Step 3 (C1-C2)',
  };
  return stepMap[this.step] || 'Unknown';
});

// Create and export the model
const Question = mongoose.model<IQuestionDocument>('Question', QuestionSchema);

export default Question;
