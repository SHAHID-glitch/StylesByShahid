#!/bin/bash
# Render Deployment Checklist Script
# Run this before deploying to Render

echo "🚀 StylesByShahid - Render Deployment Checklist"
echo "================================================"
echo ""

# Check 1: Repository is clean
echo "✓ Check 1: Git status"
git status --short
if [ -z "$(git status --short)" ]; then
  echo "✅ Repository is clean"
else
  echo "⚠️  You have uncommitted changes. Make sure to commit them:"
  echo "   git add ."
  echo "   git commit -m 'Your message'"
fi
echo ""

# Check 2: Node modules
echo "✓ Check 2: Dependencies"
if [ -f "backend/node_modules/.package-lock.json" ] || [ -f "backend/package-lock.json" ]; then
  echo "✅ Backend dependencies installed"
else
  echo "⚠️  Backend dependencies not found. Run:"
  echo "   npm install"
fi
echo ""

# Check 3: Environment files exist
echo "✓ Check 3: Configuration files"
[ -f ".env.production" ] && echo "✅ .env.production exists" || echo "❌ Missing .env.production"
[ -f "render.yaml" ] && echo "✅ render.yaml exists" || echo "❌ Missing render.yaml"
echo ""

# Check 4: Backend server.js
echo "✓ Check 4: Backend entry point"
[ -f "backend/server.js" ] && echo "✅ backend/server.js exists" || echo "❌ Missing backend/server.js"
echo ""

# Check 5: Package.json scripts
echo "✓ Check 5: Package.json scripts"
grep -q '"start"' package.json && echo "✅ 'start' script defined" || echo "❌ Missing 'start' script"
grep -q '"postinstall"' package.json && echo "✅ 'postinstall' script defined" || echo "❌ Missing 'postinstall' script"
echo ""

echo "================================================"
echo "📝 Next Steps:"
echo "1. Push to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Go to https://render.com/dashboard"
echo "3. Click 'New +' → 'Web Service'"
echo "4. Connect your GitHub repository"
echo "5. Render will auto-detect render.yaml"
echo "6. Add these environment variables in Render:"
echo "   - JWT_SECRET (generate a random string)"
echo "   - MONGODB_URI (from MongoDB Atlas)"
echo "   - CLIENT_URL (e.g., https://stylesby-shahid.onrender.com)"
echo ""
echo "✨ Deployment will start automatically!"
