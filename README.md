# LitBuddy 📚

**LitBuddy** is a comprehensive social platform designed for book lovers to track their reading journey, connect with like-minded readers, and participate in engaging community activities. Built with the MERN stack (MongoDB, Express.js, React, Node.js), it offers a rich set of features including real-time chat, book clubs, reading challenges, and personalized recommendations.

---

## 🚀 Features

### 📖 Book Management & Tracking
- **Search & Discover:** Integrated with **Google Books API** to search for millions of titles.
- **Reading Progress:** Track books you are currently reading, have read, or want to read.
- **Reading Goals:** Set annual or monthly reading goals and track your progress.
- **Reviews & Ratings:** Rate books and write detailed reviews to share your thoughts.
- **Goodreads Integration:** Import your library and search for books using Goodreads data.

### 🤝 Social & Community
- **Book Clubs:** Create or join book clubs, manage members, and organize discussions.
- **Real-time Chat:** 
  - **1-on-1 Chat:** Private messaging with other users.
  - **Group Chat:** Dedicated chat rooms for book clubs.
  - Powered by **Socket.io** and **STOMP** for seamless real-time communication.
- **Matchmaking:** Find reading partners based on your reading preferences and interests.
- **User Profiles:** Customizable profiles showcasing your reading stats, favorite genres, and achievements.

### 🏆 Gamification
- **Challenges:** Participate in reading challenges to stay motivated.
- **Achievements:** Unlock badges and achievements as you reach reading milestones.

### 🛡️ Security & Administration
- **Secure Authentication:** 
  - JWT-based authentication with HttpOnly cookies.
  - **Google OAuth** integration for one-click login.
  - Password reset flow via email.
- **Admin Dashboard:** Comprehensive tools for administrators to manage users and handle reports.
- **Reporting System:** Users can report inappropriate content or behavior.

---

## 🛠️ Tech Stack

### Frontend
- **React.js:** Component-based UI library.
- **React Router:** For client-side routing.
- **Axios:** For API requests.
- **Socket.io-client / Stompjs:** For real-time WebSocket communication.
- **CSS3:** Custom styling for a responsive and modern design.

### Backend
- **Node.js & Express.js:** Robust RESTful API architecture.
- **MongoDB & Mongoose:** NoSQL database for flexible data modeling.
- **Socket.io / WS:** Real-time event-based communication.
- **Passport.js:** Authentication middleware (Google Strategy).
- **Nodemailer:** For sending transactional emails (password resets, notifications).
- **Multer:** For handling file uploads (profile pictures, etc.).

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (Local instance or Atlas URI)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/saad-bin-sohan/LitBuddy.git
cd LitBuddy
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following variables:
```env
NODE_ENV=development
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Frontend URLs for CORS
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Service (Nodemailer)
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_BACKEND_URL=http://localhost:5001/api
```

Start the frontend development server:
```bash
npm start
```

The application should now be running at `http://localhost:3000`.

---

## 🚀 Deployment

The application is configured for easy deployment:
- **Backend:** Ready for platforms like **Render** or **Heroku**. Includes `render.yaml` and health check endpoints.
- **Frontend:** Optimized for **Vercel** or **Netlify**.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
