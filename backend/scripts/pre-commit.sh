#!/bin/bash

# Pre-commit script for digital-competency-platform backend
# This script runs formatting checks, type checks, and linting

echo "🔍 Running pre-commit checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Please run this script from the backend directory${NC}"
  exit 1
fi

# Initialize error flag
ERRORS=0

echo "📝 Step 1: Checking code formatting..."
npm run format:check
FORMAT_EXIT_CODE=$?
print_status $FORMAT_EXIT_CODE "Code formatting check"
if [ $FORMAT_EXIT_CODE -ne 0 ]; then
  print_warning "Run 'npm run format' to fix formatting issues"
  ERRORS=1
fi

echo ""
echo "🔧 Step 2: Running TypeScript type checking..."
npm run type-check
TYPE_EXIT_CODE=$?
print_status $TYPE_EXIT_CODE "TypeScript type checking"
if [ $TYPE_EXIT_CODE -ne 0 ]; then
  ERRORS=1
fi

echo ""
echo "🧹 Step 3: Running ESLint..."
npm run lint
LINT_EXIT_CODE=$?
print_status $LINT_EXIT_CODE "ESLint checking"
if [ $LINT_EXIT_CODE -ne 0 ]; then
  print_warning "Run 'npm run lint:fix' to auto-fix some issues"
  ERRORS=1
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! Ready to commit.${NC}"
  exit 0
else
  echo -e "${RED}💥 Some checks failed. Please fix the issues before committing.${NC}"
  echo ""
  echo -e "${YELLOW}Quick fix commands:${NC}"
  echo "  npm run format     # Fix formatting"
  echo "  npm run lint:fix   # Fix linting issues"
  echo "  npm run validate   # Fix all auto-fixable issues"
  exit 1
fi
