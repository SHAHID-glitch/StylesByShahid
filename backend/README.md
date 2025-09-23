# StylesByShahid Backend API

A comprehensive backend API for the StylesByShahid presentation tool, built with Node.js, Express, and MongoDB.

## Features

- 🔐 **User Authentication** - JWT-based auth with registration, login, and password management
- 📊 **Presentation Management** - Full CRUD operations for presentations and slides
- 🎨 **Template System** - Pre-built templates with themes and layouts
- 📁 **File Upload** - Support for images, videos, audio, and documents
- 👥 **Real-time Collaboration** - Socket.io for live editing and commenting
- 💬 **Comments & Reviews** - Commenting system with replies and resolution
- 🔗 **Sharing** - Public sharing with custom URLs
- 🎭 **Role-based Access** - User, Premium, and Admin roles
- 📈 **Analytics** - View tracking and usage statistics

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Real-time**: Socket.io
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd stylesbyhahid-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/stylesbyhahid
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   CLIENT_URL=http://localhost:3000
   MAX_FILE_SIZE=10485760
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### Presentations
- `GET /api/presentations` - Get user presentations
- `POST /api/presentations` - Create presentation
- `GET /api/presentations/:id` - Get specific presentation
- `PUT /api/presentations/:id` - Update presentation
- `DELETE /api/presentations/:id` - Delete presentation
- `POST /api/presentations/:id/duplicate` - Duplicate presentation
- `POST /api/presentations/:id/like` - Like/unlike presentation

### Slides
- `POST /api/presentations/:id/slides` - Add slide
- `PUT /api/presentations/:id/slides/:slideId` - Update slide
- `DELETE /api/presentations/:id/slides/:slideId` - Delete slide

### Templates
- `GET /api/templates` - Get public templates
- `GET /api/templates/featured` - Get featured templates
- `GET /api/templates/:id` - Get specific template
- `POST /api/templates/:id/use` - Record template usage
- `POST /api/templates/:id/review` - Add template review

### File Upload
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/video` - Upload video
- `POST /api/upload/audio` - Upload audio
- `POST /api/upload/document` - Upload document
- `DELETE /api/upload/:filename` - Delete file

### Collaboration
- `POST /api/presentations/:id/collaborators` - Add collaborator
- `PUT /api/presentations/:id/collaborators/:userId` - Update permissions
- `DELETE /api/presentations/:id/collaborators/:userId` - Remove collaborator
- `POST /api/presentations/:id/comments` - Add comment
- `POST /api/presentations/:id/comments/:commentId/reply` - Reply to comment
- `PUT /api/presentations/:id/comments/:commentId/resolve` - Resolve comment

### Users
- `GET /api/users/profile/:id` - Get user profile
- `GET /api/users/search` - Search users
- `GET /api/users/dashboard` - Get dashboard data
- `GET /api/users/activity` - Get user activity

## Real-time Features

The API includes Socket.io for real-time collaboration:

### Socket Events

**Client to Server:**
- `join-presentation` - Join presentation room
- `slide-update` - Update slide content
- `cursor-move` - Share cursor position
- `new-comment` - Add comment

**Server to Client:**
- `user-joined` - User joined presentation
- `slide-updated` - Slide was updated
- `cursor-moved` - Cursor position update
- `comment-added` - New comment added
- `collaboration-invite` - Collaboration invitation

## File Upload

Supports multiple file types:
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, OGG
- **Audio**: MP3, WAV, OGG
- **Documents**: PDF, TXT

Files are organized in folders:
- `uploads/images/`
- `uploads/videos/`
- `uploads/audio/`
- `uploads/documents/`

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- File type validation
- Input validation with Joi

## Database Schema

### User Model
- Authentication & profile data
- Preferences & subscription info
- Role-based permissions

### Presentation Model
- Slide content & elements
- Collaboration settings
- Comments & sharing

### Template Model
- Theme & layout definitions
- Usage analytics
- Reviews & ratings

## Error Handling

Comprehensive error handling for:
- Validation errors
- Authentication failures
- Database errors
- File upload issues
- Rate limiting

## Development

### Project Structure
```
backend/
├── models/          # Database models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── uploads/         # File upload directory
├── .env            # Environment variables
├── server.js       # Main application file
└── package.json    # Dependencies
```

### Adding New Features

1. Create model in `models/`
2. Add routes in `routes/`
3. Include middleware if needed
4. Update server.js to use routes
5. Test with Postman/client

### Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X GET http://localhost:5000/api/health
```

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
JWT_SECRET=your-production-secret-key
CLIENT_URL=https://your-frontend-domain.com
MAX_FILE_SIZE=10485760
BASE_URL=https://your-api-domain.com
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Heroku Deployment

```bash
# Add Heroku remote
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git push heroku main
```

## API Documentation

Full API documentation is available at `/api/health` endpoint which provides:
- Server status
- Available endpoints
- Request/response examples
- Authentication requirements

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact: shahid@stylesbyhahid.com

---

**StylesByShahid Backend** - Powering beautiful presentations with a robust API! 🚀