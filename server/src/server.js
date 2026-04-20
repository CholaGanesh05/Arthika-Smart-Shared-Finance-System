import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { Server } from "socket.io";

dotenv.config();

// ======================
// DB CONNECTION
// ======================
connectDB();

const PORT = process.env.PORT || 5000;

// ======================
// START SERVER
// ======================
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ======================
// SOCKET.IO SETUP
// ======================
const io = new Server(server, {
  cors: {
    origin: "*", // later restrict in production
  },
});

// 🔥 GLOBAL ACCESS (important for services)
global.io = io;

// ======================
// SOCKET EVENTS
// ======================
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // ======================
  // JOIN GROUP
  // ======================
  socket.on("joinGroup", (groupId) => {
    if (!groupId) return; // ✅ SAFETY

    const room = groupId.toString();
    socket.join(room);

    console.log(`📡 Joined group: ${room}`);
  });

  // ======================
  // LEAVE GROUP
  // ======================
  socket.on("leaveGroup", (groupId) => {
    if (!groupId) return; // ✅ SAFETY

    const room = groupId.toString();
    socket.leave(room);

    console.log(`🚪 Left group: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});