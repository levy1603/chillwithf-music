const Notification = require("../models/Notification");
const User = require("../models/User");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const normalizePagination = ({ page, limit } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
  const parsedLimit = parseInt(limit, 10) || DEFAULT_LIMIT;
  const safeLimit = Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const notificationService = {
  async create({ recipient, sender, type, title, message, data = {} }) {
    return Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      data,
    });
  },

  async notifyAllAdmins({ sender, type, title, message, data = {} }) {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (!admins.length) return [];

    return Notification.insertMany(
      admins.map((admin) => ({
        recipient: admin._id,
        sender,
        type,
        title,
        message,
        data,
      })),
      { ordered: false }
    );
  },

  async markAsRead(notificationId, userId) {
    return Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { $set: { isRead: true } }
    );
  },

  async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipient: userId, isRead: false, isHidden: false },
      { isRead: true }
    );
  },

  async getByUser(userId, { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, includeTotal = false } = {}) {
    const { page: safePage, limit: safeLimit, skip } = normalizePagination({
      page,
      limit,
    });
    const baseFilter = { recipient: userId, isHidden: false };
    const unreadFilter = { recipient: userId, isRead: false, isHidden: false };

    const notificationPromise = Notification.find(baseFilter)
      .select("type title message data isRead createdAt sender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate({
        path: "sender",
        select: "username avatar",
        options: { lean: true },
      })
      .lean();

    const unreadCountPromise = Notification.countDocuments(unreadFilter);
    const totalPromise = includeTotal
      ? Notification.countDocuments(baseFilter)
      : Promise.resolve(null);

    const [notifications, unreadCount, total] = await Promise.all([
      notificationPromise,
      unreadCountPromise,
      totalPromise,
    ]);

    const payload = {
      notifications,
      unreadCount,
      page: safePage,
      limit: safeLimit,
    };

    if (typeof total === "number") {
      payload.total = total;
      payload.totalPages = Math.ceil(total / safeLimit);
    }

    return payload;
  },

  async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isHidden: false,
    });

    return { unreadCount };
  },

  async hide(notificationId, userId) {
    return Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { $set: { isHidden: true } }
    );
  },
};

module.exports = notificationService;
