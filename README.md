<div align="center">
  <img src="client/public/vite.svg" alt="Arthika Logo" width="120" />
  
  # 🏦 Arthika
  **Smart Shared Finance System**

  <p align="center">
    A comprehensive, AI-native platform designed to revolutionize how teams, roommates, and organizations manage shared expenses, settle debts, and track financial analytics in real-time.
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-documentation">API</a>
  </p>
</div>

---

## ✨ Features

- **🚀 Premium User Experience**: A stunning, modern UI with 3D splash screens, smooth animations, and a tailored dark mode aesthetic.
- **📊 Real-Time Analytics**: Interactive dashboards and charts built with Chart.js to visualize spending patterns, group funds, and expense distributions.
- **💸 Advanced Ledger & Settlements**: Intelligent debt simplification, advance payment handling, and real-time settlement tracking.
- **🔔 Live Notifications**: WebSocket-powered real-time updates for expense additions, settlement approvals, and group activities.
- **📄 Automated Reporting**: Generate and export financial summaries and transaction logs seamlessly as PDFs.
- **🔐 Enterprise-Grade Security**: JWT-based authentication, rate-limiting, and comprehensive input validation (Zod & Express-Validator).

---

## 🏗️ Architecture

The project is structured as a full-stack monorepo, divided cleanly into two main environments:

### `📁 client/` (Frontend)
The frontend is a blazing-fast Single Page Application (SPA) built with React and Vite. It is designed to deliver a premium, responsive, and interactive user experience.
- **Entry point:** `client/src/main.jsx`
- **Routing:** Handled via React Router v7.
- **Styling:** Tailwind CSS combined with custom vanilla CSS for dynamic, glassmorphism aesthetics.
- **State & Real-time:** React Context API paired with Socket.io-client.

### `📁 server/` (Backend)
A robust RESTful API built with Node.js and Express, designed to handle complex financial arithmetic securely.
- **Entry point:** `server/src/server.js`
- **Database:** MongoDB (via Mongoose) for persistent storage.
- **Caching & Pub/Sub:** Redis for high-speed caching and rate-limiting.
- **Modules:** Organized systematically (`auth`, `users`, `groups`, `expenses`, `funds`, `analytics`, `notifications`).

---

## 💻 Tech Stack

### Frontend (`client/`)
| Technology | Description |
| :--- | :--- |
| **React 19** | Component-based UI library |
| **Vite 8** | Next-generation frontend tooling |
| **Tailwind CSS** | Utility-first CSS framework |
| **Chart.js** | Data visualization |
| **Lucide React** | Beautiful, consistent iconography |
| **Socket.IO Client** | Real-time bidirectional event-based communication |

### Backend (`server/`)
| Technology | Description |
| :--- | :--- |
| **Node.js & Express** | Fast, unopinionated web framework |
| **MongoDB & Mongoose** | NoSQL database and object data modeling |
| **Redis** | In-memory data structure store |
| **Socket.IO** | Real-time WebSocket communication |
| **Cloudinary & Multer** | Media and receipt upload management |
| **Zod** | Schema declaration and validation |

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas)
- Redis server running locally or via Docker
- Cloudinary Account (for image uploads)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/arthika.git
cd arthika
```

### 2. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory and configure the following:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory (if required for custom Vite proxy setups or API endpoints):
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Start the frontend development server:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <i>Crafted with ❤️ for seamless financial management.</i>
</div>
