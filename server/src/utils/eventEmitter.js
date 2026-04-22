import Notification from "../modules/notifications/models/notification.model.js";

const generateMessage = (type, data) => {
  switch (type) {
    case "expense:created":
      return `New expense added: ${data.title} (₹${data.amount})`;
    case "expense:updated":
      return `Expense updated: ${data.title}`;
    case "expense:deleted":
      return `Expense deleted`;
    case "group:debt:settled":
      return `Debt settled: ₹${data.amount}`;
    case "group:member:joined":
      return `New member joined the group`;
    case "group:member:removed":
      return `Member removed from the group`;
    case "group:fund:contributed":
      return `Contribution of ₹${data.amount} made to fund`;
    case "group:fund:withdrawn":
      return `Withdrawal of ₹${data.amount} from fund`;
    default:
      return "New activity in group";
  }
};

export const emitEvent = async (groupId, type, data = {}) => {
  try {
    // 1. Save Notification
    const message = generateMessage(type, data);
    
    const newNotification = await Notification.create({
      group: groupId,
      type,
      data,
      message,
    });

    // 2. Emit Real-time Event
    if (global.io) {
      global.io.to(groupId.toString()).emit(type, {
        _id: newNotification._id,
        type,
        groupId,
        data,
        message,
        timestamp: newNotification.createdAt,
      });
      
      // Also broadcast generic notification event
      global.io.to(groupId.toString()).emit("notification:new", {
        _id: newNotification._id,
        type,
        groupId,
        data,
        message,
        timestamp: newNotification.createdAt,
      });

      // FR8.3: Instantly trigger frontend balance hooks!
      if (type.includes("expense") || type.includes("settled")) {
        global.io.to(groupId.toString()).emit("group:balance:updated");
      }
    }
  } catch (error) {
    console.error("❌ Event Emit Error:", error.message);
  }
};