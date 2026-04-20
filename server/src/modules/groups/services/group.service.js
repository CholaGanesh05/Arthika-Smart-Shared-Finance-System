import Group from "../models/group.model.js";
import mongoose from "mongoose";


// ======================
// CREATE GROUP
// ======================
export const createGroup = async ({ name, description, members }, userId) => {
  if (!name) {
    throw new Error("Group name is required");
  }

  let uniqueMembers = new Set();

  // Add creator
  uniqueMembers.add(userId.toString());

  // Add other members
  if (members && members.length > 0) {
    members.forEach((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid member ID");
      }
      uniqueMembers.add(id.toString());
    });
  }

  const memberObjects = Array.from(uniqueMembers).map((id) => ({
    user: new mongoose.Types.ObjectId(id),
    role: id === userId.toString() ? "owner" : "member",
  }));

  const group = await Group.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(userId),
    members: memberObjects,
  });

  return group;
};


// ======================
// GET USER GROUPS
// ======================
export const getUserGroups = async (userId) => {
  const groups = await Group.find({
    "members.user": userId,
    isActive: true,
  })
    .select("name description members totalBalance currency createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return groups;
};


// ======================
// ADD MEMBER TO GROUP
// ======================
export const addMemberToGroup = async (groupId, userIdToAdd, currentUserId) => {
  if (
    !mongoose.Types.ObjectId.isValid(groupId) ||
    !mongoose.Types.ObjectId.isValid(userIdToAdd)
  ) {
    throw new Error("Invalid IDs");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new Error("Group not found");
  }

  // check current user role
  const currentMember = group.getMember(currentUserId);

  if (!currentMember) {
    throw new Error("You are not a member of this group");
  }

  if (!["owner", "manager"].includes(currentMember.role)) {
    throw new Error("Not authorized to add members");
  }

  // check duplicate
  if (group.isMember(userIdToAdd)) {
    throw new Error("User already in group");
  }

  // add member
  group.members.push({
    user: userIdToAdd,
    role: "member",
  });

  await group.save();

  return group;
};


// ======================
// GET SINGLE GROUP
// ======================
export const getGroupById = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new Error("Invalid group ID");
  }

  const group = await Group.findById(groupId)
    .populate("members.user", "name email avatar")
    .populate("createdBy", "name email")
    .lean(); // 🔥 performance optimization

  if (!group) {
    throw new Error("Group not found");
  }

  // ======================
  // ACCESS CONTROL (FIXED)
  // ======================
  const isMember = group.members.some((member) => {
    const memberId = member.user?._id
      ? member.user._id.toString()   // populated
      : member.user.toString();      // fallback

    return memberId === userId.toString();
  });

  if (!isMember) {
    throw new Error("Not authorized");
  }

  return group;
};