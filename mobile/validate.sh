#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "==================================================="
echo "🚀 Running React Native Validation Pipeline"
echo "==================================================="

echo ""
echo "🔍 1. Running ESLint..."
if npm run lint; then
    echo "✅ ESLint passed!"
else
    echo "❌ ESLint failed! Fix the lint errors above before deploying."
    exit 1
fi

echo ""
echo "🧐 2. Running TypeScript Type-Checker..."
if npm run typecheck; then
    echo "✅ TypeScript Compiler passed!"
else
    echo "❌ Type-check failed! Fix the TypeScript errors above before deploying."
    exit 1
fi

echo ""
echo "🧪 3. Running Jest Unit Tests..."
if npm run test; then
    echo "✅ Unit tests passed!"
else
    echo "❌ Unit tests failed! Fix the failing tests above before deploying."
    exit 1
fi

echo ""
echo "🎉 All validation checks passed successfully! Your code is safe to deploy."
echo "==================================================="
