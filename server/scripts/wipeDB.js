import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Drop all collections
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.drop();
      console.log(`Dropped collection: ${collection.collectionName}`);
    }

    console.log("Database completely wiped! You can now register fresh users.");
    process.exit(0);
  } catch (error) {
    console.error("Error wiping database:", error);
    process.exit(1);
  }
}

clearDB();
