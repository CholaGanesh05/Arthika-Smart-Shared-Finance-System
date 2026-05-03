import Group from "../models/group.model.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { emitEvent } from "../../../utils/eventEmitter.js";
import { logActivity } from "./activityLog.service.js";


// ======================
// CREATE GROUP
// ======================
export const createGroup = async ({ name, description, avatar, members }, userId) => {
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
  
  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

  const group = await Group.create({
    name,
    description,
    avatar: avatar || "",
    createdBy: new mongoose.Types.ObjectId(userId),
    members: memberObjects,
    inviteCode,
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
    // FR2.3: inviteCode exposed so owner can share it
    .select("name description avatar members totalBalance currency inviteCode createdAt")
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

  // SRS NFR3.5: max 50 members per group
  if (group.members.length >= 50) {
    throw new Error("Group has reached the maximum limit of 50 members");
  }

  // add member
  group.members.push({
    user: userIdToAdd,
    role: "member",
  });

  await group.save();

  // FR2.8: emit + log activity
  emitEvent(groupId, "group:member:joined", { userId: userIdToAdd });
  logActivity(groupId, currentUserId, "group:member:joined",
    `Member added to group`, { addedUser: userIdToAdd });

  return group;
};


// ======================
// JOIN.GROUP VIA INVITE CODE
// ======================
export const joinGroupWithCode = async (inviteCode, userId) => {
  if (!inviteCode) throw new Error("Invite code required");

  const group = await Group.findOne({ inviteCode });
  if (!group) throw new Error("Invalid invite code");

  if (group.isMember(userId)) {
    throw new Error("You are already a member of this group");
  }

  // SRS NFR3.5: max 50 members
  if (group.members.length >= 50) {
    throw new Error("Group has reached the maximum limit of 50 members");
  }

  group.members.push({ user: userId, role: "member" });
  await group.save();

  emitEvent(group._id.toString(), "group:member:joined", { userId });
  logActivity(group._id.toString(), userId, "group:member:joined",
    `Joined group via invite code`);

  return group;
};


// ======================
// UPDATE MEMBER ROLE
// ======================
export const updateMemberRole = async (groupId, targetUserId, newRole, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new Error("Invalid IDs");
  }
  if (!["owner", "manager", "member"].includes(newRole)) throw new Error("Invalid role");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const currentMember = group.getMember(currentUserId);
  if (!currentMember || currentMember.role !== "owner") {
    throw new Error("Only the owner can change roles");
  }

  const targetMember = group.getMember(targetUserId);
  if (!targetMember) throw new Error("Target user is not a member");

  // LOGIC FLAW FIX: Prevent the owner from demoting themselves and orphaning the group!
  if (currentUserId.toString() === targetUserId.toString() && newRole !== "owner") {
    const ownerCount = group.members.filter(m => m.role === "owner").length;
    if (ownerCount <= 1) {
      throw new Error("Cannot demote yourself. The group must have at least one owner.");
    }
  }

  targetMember.role = newRole;
  await group.save();

  logActivity(groupId, currentUserId, "group:role:updated",
    `Member role updated to ${newRole}`, { targetUser: targetUserId, newRole });

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


// ======================
// REMOVE MEMBER
// ======================
export const removeMemberFromGroup = async (groupId, userIdToRemove, currentUserId) => {
  if (
    !mongoose.Types.ObjectId.isValid(groupId) ||
    !mongoose.Types.ObjectId.isValid(userIdToRemove)
  ) {
    throw new Error("Invalid IDs");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const currentMember = group.getMember(currentUserId);
  if (!currentMember) throw new Error("You are not a member");
  if (!["owner", "manager"].includes(currentMember.role) && currentUserId.toString() !== userIdToRemove.toString()) {
    throw new Error("Not authorized to remove this member");
  }

  // LOGIC FLAW FIX: Prevent removing the very last owner and permanently orphaning the group
  const targetMember = group.getMember(userIdToRemove);
  if (targetMember && targetMember.role === "owner") {
    const ownerCount = group.members.filter(m => m.role === "owner").length;
    if (ownerCount <= 1) {
      throw new Error("Cannot remove the final owner. Transfer ownership to another member before leaving/removing.");
    }
  }

  // Ensure zero balances before leaving (Ledger check)
  const Ledger = mongoose.model("Ledger");
  const balances = await Ledger.find({
    group: groupId,
    $or: [{ from: userIdToRemove }, { to: userIdToRemove }],
    amount: { $gt: 0 } // LOGIC FLAW FIX: Must explicitly force strictly > 0 math check!
  });

  if (balances.length > 0) {
    throw new Error("Cannot remove member with outstanding balances");
  }

  group.members = group.members.filter(m => m.user.toString() !== userIdToRemove.toString());
  await group.save();

  emitEvent(groupId, "group:member:removed", { userId: userIdToRemove });
  logActivity(groupId, currentUserId, "group:member:removed",
    `Member removed from group`, { removedUser: userIdToRemove });

  return group;
};


// ======================
// DELETE GROUP
// ======================
export const deleteGroup = async (groupId, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const currentMember = group.getMember(currentUserId);
  if (!currentMember || currentMember.role !== "owner") {
    throw new Error("Only the owner can delete the group");
  }

  // FR2.7: check for uncleared debts (amount > 0 strictly)
  const Ledger = mongoose.model("Ledger");
  const outstandingDebts = await Ledger.findOne({ group: groupId, amount: { $gt: 0 } });
  
  if (outstandingDebts) {
    throw new Error("Cannot delete group with uncleared debts. All balances must be zero.");
  }

  await Group.findByIdAndDelete(groupId);

  logActivity(groupId, currentUserId, "group:deleted",
    `Group deleted`);

  return { message: "Group deleted successfully" };
};


// ======================
// ARCHIVE GROUP (FR2.7)
// ======================
export const archiveGroup = async (groupId, currentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) throw new Error("Invalid ID");

  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const currentMember = group.getMember(currentUserId);
  if (!currentMember || currentMember.role !== "owner") {
    throw new Error("Only the owner can archive the group");
  }

  group.isActive = false;
  group.archivedAt = new Date();
  await group.save();

  logActivity(groupId, currentUserId, "group:archived",
    `Group archived`);

  return { message: "Group archived successfully" };
};