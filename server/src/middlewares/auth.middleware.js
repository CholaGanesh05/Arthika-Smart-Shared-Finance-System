import jwt from "jsonwebtoken";
import User from "../modules/auth/models/user.model.js";

const protect = async (req, res, next) => {
  try {
    let token;

    // ======================
    // GET TOKEN FROM HEADER
    // ======================
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    // ======================
    // VERIFY TOKEN
    // ======================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ======================
    // GET USER (IMPROVED)
    // ======================
    const user = await User.findById(decoded.id).select("-__v -password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("TOKEN USER:", user._id.toString());


    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

export default protect;