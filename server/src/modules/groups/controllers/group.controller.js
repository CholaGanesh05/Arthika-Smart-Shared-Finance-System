import {
  createGroup,
  getUserGroups,
  addMemberToGroup,
  getGroupById,
  removeMemberFromGroup,
  deleteGroup,
  joinGroupWithCode,
  updateMemberRole,
  archiveGroup
} from "../services/group.service.js";


// ======================
// CREATE GROUP
// ======================
export const createGroupController = async (req, res) => {
  try {
    const { name, description, avatar, members } = req.body;
    const userId = req.user._id;

    const group = await createGroup(
      { name, description, avatar, members },
      userId
    );

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// GET USER GROUPS
// ======================
export const getUserGroupsController = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await getUserGroups(userId);

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// GET SINGLE GROUP (POPULATED)
// ======================
export const getGroupByIdController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await getGroupById(groupId, userId);

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// ADD MEMBER
// ======================
export const addMemberController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const currentUserId = req.user._id;

    const group = await addMemberToGroup(
      groupId,
      userId,
      currentUserId
    );

    res.status(200).json({
      success: true,
      message: "Member added successfully",
      data: group,
    });
  } catch (error) {
  res.status(400);
  throw error;
 }
};


// ======================
// JOIN GROUP VIA INVITE CODE
// ======================
export const joinWithCodeController = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;

    const group = await joinGroupWithCode(inviteCode, userId);

    res.status(200).json({
      success: true,
      message: "Joined group successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// UPDATE MEMBER ROLE
// ======================
export const updateRoleController = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user._id;

    const group = await updateMemberRole(groupId, userId, role, currentUserId);

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// REMOVE MEMBER
// ======================
export const removeMemberController = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user._id;

    const group = await removeMemberFromGroup(groupId, userId, currentUserId);

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: group,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// ARCHIVE GROUP (FR2.7)
// ======================
export const archiveGroupController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;

    const result = await archiveGroup(groupId, currentUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ======================
// DELETE GROUP
// ======================
export const deleteGroupController = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;

    const result = await deleteGroup(groupId, currentUserId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};