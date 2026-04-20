import {
  createGroup,
  getUserGroups,
  addMemberToGroup,
  getGroupById,
} from "../services/group.service.js";


// ======================
// CREATE GROUP
// ======================
export const createGroupController = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const userId = req.user._id;

    const group = await createGroup(
      { name, description, members },
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