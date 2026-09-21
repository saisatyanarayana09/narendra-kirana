@echo off
echo ===================================================
echo 🚀 Running React Native Validation Pipeline (Windows)
echo ===================================================

echo.
echo 🔍 1. Running ESLint...
call npm run lint
if %ERRORLEVEL% neq 0 (
    echo ❌ ESLint failed! Fix the lint errors above before deploying.
    exit /b %ERRORLEVEL%
)
echo ✅ ESLint passed!

echo.
echo 🧐 2. Running TypeScript Type-Checker...
call npm run typecheck
if %ERRORLEVEL% neq 0 (
    echo ❌ Type-check failed! Fix the TypeScript errors above before deploying.
    exit /b %ERRORLEVEL%
)
echo ✅ TypeScript Compiler passed!

echo.
echo 🧪 3. Running Jest Unit Tests...
call npm run test
if %ERRORLEVEL% neq 0 (
    echo ❌ Unit tests failed! Fix the failing tests above before deploying.
    exit /b %ERRORLEVEL%
)
echo ✅ Unit tests passed!

echo.
echo 🎉 All validation checks passed successfully! Your code is safe to deploy.
echo ===================================================
