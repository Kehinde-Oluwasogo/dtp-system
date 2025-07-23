# DTP System Prototype

A prototype implementation of the DTP (Digital Transformation Platform) system built with Node.js, Express.js, and MongoDB following MVC architecture.

## 🏗️ Architecture Overview

```
[Frontend (React)]
     |
     |--> Auth Service (Firebase Auth or custom JWT service)
     |--> REST API Calls
     |
[Backend (Node.js + Express)]
     |
     |--> User Controller
     |--> Podcast Controller
     |--> Open Day Controller
     |
     |--> Database (MongoDB)
             |--> Users Collection
             |--> Podcasts Collection
             |--> OpenDays Collection

[Media Hosting Service (Cloudinary)]
```

## 🚀 Features

### User Management
- User registration with age eligibility checking
- JWT-based authentication
- Role-based access control (User/Admin)
- Profile management
- Password management

### Podcast System
- Audio file upload to Cloudinary
- Podcast metadata management
- Play count tracking
- Search and filtering
- Admin-only podcast creation

### Open Day Events
- Event creation and management
- User registration for events
- Capacity management
- Date-based filtering
- Registration deadline handling

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/eligibility-check/:user_id` - Check user eligibility
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user account
- `PUT /api/users/:id/password` - Change password
- `GET /api/users/eligible` - Get eligible users (Admin only)
- `GET /api/users/stats` - Get user statistics (Admin only)

### Podcasts  
- `GET /api/podcasts` - Get all podcasts
- `GET /api/podcasts/:id` - Get podcast by ID
- `POST /api/podcasts` - Create podcast (Admin only)
- `PUT /api/podcasts/:id` - Update podcast
- `DELETE /api/podcasts/:id` - Delete podcast
- `POST /api/podcasts/:id/play` - Increment play count
- `GET /api/podcasts/popular` - Get popular podcasts
- `GET /api/podcasts/recent` - Get recent podcasts

### Open Days
- `GET /api/opendays` - Get all open day events
- `GET /api/opendays/:id` - Get event by ID
- `POST /api/opendays` - Create event (Admin only)
- `PUT /api/opendays/:id` - Update event
- `DELETE /api/opendays/:id` - Delete event
- `POST /api/opendays/:id/register` - Register for event
- `POST /api/opendays/:id/cancel` - Cancel registration
- `GET /api/opendays/upcoming` - Get upcoming events
- `GET /api/opendays/my-registrations` - Get user's registrations

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Environment**: dotenv

## 📦 Installation & Setup

1. **Clone and Install Dependencies**
   ```powershell
   cd "c:\Users\KehindeOluwasogo\Downloads\DTP"
   npm install
   ```

2. **Environment Configuration**
   Update the `.env` file with your configurations:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/dtp_system
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   MIN_AGE_YEARS=18
   ```

3. **Database Setup**
   - Ensure MongoDB is installed and running
   - The application will automatically connect to the database specified in `MONGODB_URI`

4. **Cloudinary Setup**
   - Create a Cloudinary account at https://cloudinary.com
   - Get your cloud name, API key, and API secret
   - Update the `.env` file with your Cloudinary credentials

5. **Run the Application**
   ```powershell
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗃️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  full_name: String,
  email: String (unique),
  date_of_birth: Date,
  password_hash: String,
  is_eligible: Boolean,
  role: String (enum: ['user', 'admin']),
  created_at: Date,
  updated_at: Date
}
```

### Podcasts Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  url: String,
  duration: Number,
  file_size: Number,
  file_type: String,
  uploaded_by: ObjectId (ref: User),
  is_published: Boolean,
  play_count: Number,
  tags: Array[String],
  created_at: Date,
  updated_at: Date
}
```

### OpenDays Collection
```javascript
{
  _id: ObjectId,
  event_name: String,
  description: String,
  date: Date,
  location: String,
  capacity: Number,
  registered_count: Number,
  registration_deadline: Date,
  is_registration_open: Boolean,
  event_type: String (enum: ['virtual', 'physical', 'hybrid']),
  virtual_link: String,
  tags: Array[String],
  created_by: ObjectId (ref: User),
  attendees: Array[{
    user: ObjectId (ref: User),
    registered_at: Date,
    attendance_status: String
  }],
  created_at: Date,
  updated_at: Date
}
```

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

- **Public Routes**: Registration, login, podcast listing, event listing
- **User Routes**: Profile management, event registration
- **Admin Routes**: Podcast upload, event creation, user management

### Authentication Flow
1. User registers/logs in → Receives JWT token
2. Client includes token in Authorization header: `Bearer <token>`
3. Server validates token and extracts user information
4. Access granted based on user role and resource ownership

## 📁 Project Structure

```
DTP/
├── controllers/           # Business logic
│   ├── authController.js
│   ├── podcastController.js
│   ├── openDayController.js
│   └── userController.js
├── middleware/           # Express middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── models/              # Database models
│   ├── User.js
│   ├── Podcast.js
│   └── OpenDay.js
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── podcastRoutes.js
│   ├── openDayRoutes.js
│   └── userRoutes.js
├── utils/               # Utility functions
│   ├── AppError.js
│   ├── asyncHandler.js
│   └── cloudinary.js
├── uploads/             # Temporary file uploads
├── .env                 # Environment variables
├── server.js           # Application entry point
└── package.json        # Dependencies and scripts
```

## 🧪 Testing

To test the API endpoints, you can use tools like:
- **Postman** - Import the API collection
- **Thunder Client** (VS Code extension)
- **curl** commands

### Example API Calls

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com", 
    "date_of_birth": "1990-01-01",
    "password": "Password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRES_IN`: JWT token expiration time
- `CLOUDINARY_*`: Cloudinary configuration for file uploads
- `MIN_AGE_YEARS`: Minimum age for user eligibility

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on authentication endpoints
- CORS configuration
- Helmet for security headers
- File upload restrictions

## 🚦 Error Handling

The application includes comprehensive error handling:
- Custom `AppError` class for operational errors
- Global error handler middleware
- Validation error handling
- Database error handling
- File upload error handling

## 📈 Scalability Considerations

- **Database**: MongoDB with proper indexing
- **File Storage**: Cloudinary for scalable media hosting
- **Caching**: Ready for Redis implementation
- **Load Balancing**: Stateless JWT authentication
- **Monitoring**: Health check endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Note**: This is a prototype implementation. For production use, consider additional security measures, comprehensive testing, monitoring, and deployment configurations.
