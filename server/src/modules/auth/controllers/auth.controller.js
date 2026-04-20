import { registerUser, loginUser } from "../services/auth.service.js";


// ======================
// REGISTER CONTROLLER
// ======================
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const result = await registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
  res.status(400);
  throw error;
  }
};


// ======================
// LOGIN CONTROLLER
// ======================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

