# Digital Competency Assessment Platform

A comprehensive multi-stage digital competency assessment platform that evaluates and certifies users' digital skills through a structured 3-step process based on the European Framework levels (A1 → C2).

## 🎯 Platform Overview

This platform allows users to test and certify their digital competencies through a secure, progressive evaluation system. Users advance through three distinct stages, earning official digital literacy certificates based on their performance.

## ✨ Key Features

### 🏆 Assessment Flow
- **Step 1**: A1 & A2 Level Assessment
- **Step 2**: B1 & B2 Level Assessment  
- **Step 3**: C1 & C2 Level Assessment
- Progressive difficulty with automatic advancement based on scores
- **No retake policy** for failed Step 1 attempts (score <25%)

### 📊 Scoring System
- **<25%**: Fail (Step 1) or remain at current level
- **25-49.99%**: Lower level certification
- **50-74.99%**: Higher level certification
- **≥75%**: Certification + advance to next step

### ⏱️ Timer & Security
- Countdown timer per test step (default: 1 minute per question)
- Auto-submit on time expiration
- Secure browser control and test integrity measures
- Configurable time limits per assessment

### 📚 Question Pool
- **22 digital competencies × 6 levels = 132 total questions**
- **44 questions per step** from 2 relevant levels
- Questions categorized by competency and difficulty level

### 🎓 Certification
- Automatic digital certificate generation
- Downloadable PDF certificates
- Email delivery system
- Certificate verification system

### 👥 User Management
- **Admin**: Full platform management
- **Student**: Take assessments, view progress
- **Supervisor**: Monitor student progress

### 🔐 Authentication & Security
- JWT-based authentication (access & refresh tokens)
- Email/SMS OTP verification
- Secure password hashing (bcrypt)
- Password reset functionality
- Email verification for registration

## 🛠️ Tech Stack

### Frontend
- **TypeScript** - Type-safe development
- **React.js** - User interface library
- **Redux + RTK Query** - State management & API calls
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Responsive styling
- **Redux Persist** - State persistence

### Backend
- **Node.js + Express** - Server framework
- **TypeScript** - Type-safe backend development
- **MongoDB + Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **Nodemailer/Twilio** - Email/SMS notifications
- **bcrypt** - Password hashing

## 📁 Project Structure

```
digital-competency-platform/
├── README.md
├── .gitignore
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
└── backend/
    ├── src/
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ProgrammerZain/digital-competency-platform.git
   cd digital-competency-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Environment Variables**
   ```env
   # Backend (.env)
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/digital-competency
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password
   TWILIO_SID=your-twilio-sid
   TWILIO_TOKEN=your-twilio-token
   ```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-otp` - Verify OTP

### Assessment Endpoints
- `GET /api/assessments/step/:step` - Get questions for specific step
- `POST /api/assessments/submit` - Submit assessment answers
- `GET /api/assessments/results/:id` - Get assessment results
- `GET /api/assessments/progress` - Get user progress

### Certificate Endpoints
- `GET /api/certificates/user/:userId` - Get user certificates
- `POST /api/certificates/generate` - Generate certificate
- `GET /api/certificates/download/:id` - Download certificate PDF

Detailed API documentation will be maintained in this README.

## 🎯 Digital Competencies Framework

The platform assesses 22 core digital competencies across 6 proficiency levels:

### Competency Areas
1. **Information Literacy** - Finding, evaluating, and using digital information
2. **Communication** - Digital communication tools and etiquette
3. **Content Creation** - Creating and editing digital content
4. **Safety & Security** - Online safety and data protection
5. **Problem Solving** - Technical troubleshooting and digital solutions
6. **Software Proficiency** - Productivity and specialized software

### Proficiency Levels
- **A1**: Basic digital awareness
- **A2**: Limited digital skills
- **B1**: Intermediate digital competence
- **B2**: Advanced digital skills
- **C1**: Proficient digital expert
- **C2**: Expert-level digital mastery

---

**Built with ❤️ by [ProgrammerZain](https://github.com/ProgrammerZain)**
