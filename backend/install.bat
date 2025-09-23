@echo off
echo Installing StylesByShahid Backend...

echo Installing dependencies...
npm install

echo Setting up environment...
if not exist ".env" (
    copy ".env" ".env"
    echo Please edit .env file with your configuration
)

echo Creating upload directories...
if not exist "uploads" mkdir uploads
if not exist "uploads\images" mkdir uploads\images
if not exist "uploads\videos" mkdir uploads\videos
if not exist "uploads\audio" mkdir uploads\audio
if not exist "uploads\documents" mkdir uploads\documents

echo.
echo Setup complete! 
echo.
echo To start the development server:
echo npm run dev
echo.
echo To start in production:
echo npm start
echo.
echo Make sure MongoDB is running and .env is configured properly.
pause