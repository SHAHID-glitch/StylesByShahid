# 🎨 StylesByShahid - Modern Presentation Platform

> A world-class presentation creation platform with beautiful glassmorphism design and powerful backend features.

![StylesByShahid Banner](https://img.shields.io/badge/StylesByShahid-Presentation%20Platform-blue?style=for-the-badge&logo=presentation&logoColor=white)

## ✨ Features

### 🎭 Frontend Features
- **Modern Glassmorphism Design** - Beautiful frosted glass effects throughout
- **Dark/Light Theme Toggle** - Seamless theme switching with smooth transitions
- **Responsive Design** - Perfect experience on all devices
- **Smooth Animations** - Elegant hover effects and micro-interactions
- **Premium Typography** - Professional Inter font family
- **CSS Variables** - Complete theming system for easy customization

### 🚀 Backend Features
- **User Authentication** - Secure JWT-based authentication system
- **Template Management** - Dynamic template creation and management
- **File Uploads** - Support for images, videos, audio, and documents
- **Real-time Collaboration** - Socket.io powered live collaboration
- **RESTful API** - Clean and well-documented API endpoints
- **MongoDB Integration** - Robust data storage with Mongoose ODM

### 🔧 Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Security**: Helmet, CORS, bcrypt
- **Validation**: Joi

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/styleby-shahid.git
   cd styleby-shahid
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Create environment file in backend directory
   cd backend
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/stylebyshahid
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # Start backend server
   cd backend
   npm start
   
   # In another terminal, serve the frontend
   # You can use any HTTP server, for example:
   npx http-server -p 8080
   ```

5. **Open your browser**
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:5000/api`

## 📁 Project Structure

```
stylesby-shahid/
├── backend/                 # Backend server files
│   ├── models/             # MongoDB models
│   │   ├── User.js         # User model
│   │   ├── Presentation.js # Presentation model
│   │   └── Template.js     # Template model
│   ├── routes/             # API routes
│   │   ├── auth.js         # Authentication routes
│   │   ├── presentations.js# Presentation routes
│   │   ├── templates.js    # Template routes
│   │   ├── upload.js       # File upload routes
│   │   ├── collaboration.js# Real-time collaboration
│   │   └── users.js        # User management
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # JWT authentication
│   │   └── errorHandler.js # Error handling
│   ├── uploads/            # File upload directory
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables
├── index.html              # Main frontend file
├── package.json            # Root package.json
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Templates
- `GET /api/templates` - Get all templates
- `GET /api/templates/featured` - Get featured templates
- `POST /api/templates` - Create new template (admin)

### Presentations
- `GET /api/presentations` - Get user presentations
- `POST /api/presentations` - Create new presentation
- `GET /api/presentations/:id` - Get specific presentation
- `PUT /api/presentations/:id` - Update presentation
- `DELETE /api/presentations/:id` - Delete presentation

### File Upload
- `POST /api/upload/image` - Upload image
- `POST /api/upload/video` - Upload video
- `POST /api/upload/audio` - Upload audio
- `POST /api/upload/document` - Upload document

## 🎨 Theme Customization

The platform uses CSS variables for easy theme customization. You can modify the color scheme by updating the CSS variables in `index.html`:

```css
:root {
  --primary-color: #4a6cf7;
  --secondary-color: #ff6b6b;
  --success-color: #51cf66;
  --warning-color: #ffd43b;
  --error-color: #ff6b6b;
  /* ... more variables */
}
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **CORS Protection** - Configured for secure cross-origin requests
- **Input Validation** - Joi validation for all API inputs
- **Rate Limiting** - Protection against API abuse
- **Helmet** - Security headers for enhanced protection

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Font Awesome for icons
- Inter font family for typography
- MongoDB for database solutions
- Express.js for the backend framework
- Socket.io for real-time features

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact us at support@stylesby-shahid.com

---

<div align="center">
  <strong>Made with ❤️ by StylesByShahid</strong>
  <br>
  <sub>Building the future of presentations</sub>
</div>
