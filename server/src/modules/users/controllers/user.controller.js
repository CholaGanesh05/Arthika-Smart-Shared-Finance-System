import User from "../../auth/models/user.model.js";
import { uploadAvatarMiddleware } from "../../../middlewares/upload.middleware.js";
import { uploadToCloudinary } from "../../../infrastructure/storage/cloudinary.js";

// ======================
// GET CURRENT USER PROFILE
// ======================
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ======================
// UPDATE PROFILE
// ======================
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, avatar } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ======================
// CHANGE PASSWORD
// ======================
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user with password explicitly (since select: false in model by default)
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Compare entered password with hashed password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ======================
// UPLOAD AVATAR (profile photo → Cloudinary)
// POST /api/v1/users/avatar
// multipart/form-data, field name: "avatar"
// ======================
export const uploadAvatar = (req, res, next) => {
  uploadAvatarMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Avatar upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    try {
      // 1. Upload the buffer directly to Cloudinary via stream
      const safeName = req.file.originalname
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: "arthika/avatars",
        public_id: `avatar-${Date.now()}-${safeName}`,
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
        timestamp: Math.floor(Date.now() / 1000) + 7200, // +2 hrs for local clock drift
      });

      // 2. Cloudinary returns the secure HTTPS URL
      const avatarUrl = result.secure_url;

      // 3. Update user document
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatarUrl } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Avatar updated successfully",
        data: { avatarUrl, user: updatedUser },
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
};

// ======================
// REMOVE AVATAR
// DELETE /api/v1/users/avatar
// ======================
export const removeAvatar = async (req, res, next) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: "" } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Avatar removed successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};
