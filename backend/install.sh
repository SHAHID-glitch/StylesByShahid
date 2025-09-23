# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Create upload directories
mkdir -p uploads/images uploads/videos uploads/audio uploads/documents

# Start MongoDB (if running locally)
# mongod

# Start the development server
npm run dev