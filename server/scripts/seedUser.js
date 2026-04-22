import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/modules/auth/models/user.model.js";

dotenv.config();

async function seedUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Create the test user
    const existingUser = await User.findOne({ email: "test@arthika.com" });
    if (!existingUser) {
      const user = await User.create({
        name: "Test Admin",
        email: "test@arthika.com",
        password: "Password123", // Automatically hashed by the Mongoose pre-save hook
      });
      console.log("Seeded user:", user.email);
    } else {
      console.log("User already exists.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedUser();
