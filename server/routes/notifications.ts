import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { getFallbackData, generateUniqueId, sanitizeNotificationText } from '../db';
import { isMongoDBActive, MNotification } from '../db/mongodb';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to format ISO date into clean relative/readable timestamp
function formatNotificationDate(rawDate?: any): string {
  if (!rawDate) return 'Just now';
  if (typeof rawDate === 'string' && /^(just now|\d+\s*(m|h|d|s|min|hr|day)s?\s*ago|today|yesterday)/i.test(rawDate.trim())) {
    return rawDate.trim();
  }
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  } catch {}
  return String(rawDate);
}

// 1. GET ALL NOTIFICATIONS
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { store } = getFallbackData();
    if (!store.notifications) {
      store.notifications = [];
    }

    // If MongoDB is active, also sync persistent MNotification records
    if (isMongoDBActive() && userId) {
      try {
        const dbNotifs = await MNotification.find({
          $or: [
            { userId: String(userId) },
            { user_id: String(userId) },
            { user_id: '' },
            { user_id: { $exists: false } }
          ]
        }).sort({ createdAt: -1, created_at: -1, _id: -1 }).limit(40).lean();

        if (dbNotifs && dbNotifs.length > 0) {
          const existingIds = new Set(store.notifications.map((n: any) => String(n.id || n._id)));
          for (const dn of dbNotifs) {
            const notifId = String(dn.id || (dn as any)._id);
            if (!existingIds.has(notifId)) {
              const notifTitle = ((dn.title || '') as string).trim().replace(/^notification:?/i, '').trim();
              const notifMsg = sanitizeNotificationText(dn.message || '');
              const notifText = sanitizeNotificationText((dn as any).text || (notifTitle && notifTitle.toLowerCase() !== 'notification' ? `<strong>${notifTitle}</strong>: ${notifMsg}` : notifMsg));
              const notifDate = (dn as any).createdAt || (dn as any).created_at || (dn as any).time;

              store.notifications.push({
                id: notifId,
                userId: String(dn.user_id || (dn as any).userId || userId),
                user_id: String(dn.user_id || (dn as any).userId || userId),
                text: notifText || 'Campus alert notification',
                title: notifTitle && notifTitle.toLowerCase() !== 'notification' ? notifTitle : 'Notification',
                message: notifMsg || notifText,
                time: formatNotificationDate(notifDate),
                unread: (dn as any).is_read !== true && (dn as any).isRead !== true,
                type: dn.type || 'system'
              });
            }
          }
        }
      } catch (mErr: any) {
        console.warn('⚠️ Error querying MNotification in MongoDB:', mErr.message);
      }
    }

    // Filter notifications for current user or broadcast notifications
    const userNotifications = store.notifications
      .filter((n: any) => 
        !n.user_id && !n.userId || 
        String(n.user_id) === String(userId) || 
        String(n.userId) === String(userId)
      )
      .map((n: any) => {
        const cleanTitle = (n.title || '').trim().replace(/^notification:?/i, '').trim();
        const rawMsg = sanitizeNotificationText(n.message || '');
        const rawTxt = sanitizeNotificationText(n.text || '');

        let text = rawTxt || rawMsg;
        if (!text || text.trim().length === 0) {
          if (cleanTitle && cleanTitle.toLowerCase() !== 'notification' && rawMsg) {
            text = `<strong>${cleanTitle}</strong>: ${rawMsg}`;
          } else if (rawMsg) {
            text = rawMsg;
          } else if (cleanTitle && cleanTitle.toLowerCase() !== 'notification') {
            text = `<strong>${cleanTitle}</strong>`;
          } else {
            text = 'Campus alert notification';
          }
        }
        text = sanitizeNotificationText(text);

        const isUnread = n.unread !== false && n.is_read !== true && n.isRead !== true && n.read !== true;
        const timeStr = formatNotificationDate(n.time || n.createdAt || n.created_at || n.timestamp);

        return {
          id: String(n.id || n._id || generateUniqueId('notif')),
          userId: String(n.userId || n.user_id || userId || ''),
          user_id: String(n.user_id || n.userId || userId || ''),
          text,
          title: cleanTitle && cleanTitle.toLowerCase() !== 'notification' ? cleanTitle : 'Notification',
          message: rawMsg || text,
          time: timeStr,
          unread: isUnread,
          isRead: !isUnread,
          is_read: !isUnread,
          type: n.type || 'general',
          createdAt: n.createdAt || n.created_at || new Date().toISOString()
        };
      });

    return res.json({ notifications: userNotifications });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 2. MARK INDIVIDUAL NOTIFICATION AS READ
router.post('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n: any) => {
        if (String(n.id) === String(id) || String(n._id) === String(id)) {
          return { ...n, unread: false, is_read: true, isRead: true };
        }
        return n;
      });
      save();
    }

    if (isMongoDBActive()) {
      try {
        const queryConds: any[] = [{ id: String(id) }];
        if (mongoose.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MNotification.updateMany(
          { $or: queryConds },
          { $set: { is_read: true } }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Error updating single MNotification read status in MongoDB:', mErr.message);
      }
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    console.error('Error marking single notification read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

router.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n: any) => {
        if (String(n.id) === String(id) || String(n._id) === String(id)) {
          return { ...n, unread: false, is_read: true, isRead: true };
        }
        return n;
      });
      save();
    }

    if (isMongoDBActive()) {
      try {
        const queryConds: any[] = [{ id: String(id) }];
        if (mongoose.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MNotification.updateMany(
          { $or: queryConds },
          { $set: { is_read: true } }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Error updating single MNotification read status in MongoDB:', mErr.message);
      }
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    console.error('Error marking single notification read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3. MARK ALL READ
router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n: any) => {
        if (!n.user_id && !n.userId || String(n.user_id) === String(userId) || String(n.userId) === String(userId)) {
          return { ...n, unread: false, is_read: true, isRead: true };
        }
        return n;
      });
      save();
    }

    if (isMongoDBActive() && userId) {
      try {
        await MNotification.updateMany(
          { $or: [{ userId: String(userId) }, { user_id: String(userId) }] },
          { $set: { is_read: true } }
        );
      } catch (mErr: any) {
        console.warn('⚠️ Error updating MNotification read-all in MongoDB:', mErr.message);
      }
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    console.error('Error marking notifications as read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 4. DELETE SINGLE NOTIFICATION
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const idStr = String(id).trim();

  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.filter((n: any) => {
        const matchesId = String(n.id) === idStr || String((n as any)._id) === idStr;
        if (!matchesId) return true;
        // If it matches ID, only delete if it belongs to user or is general
        if (!n.user_id && !n.userId) return false;
        if (String(n.user_id) === String(userId) || String(n.userId) === String(userId)) return false;
        return true;
      });
      save();
    }

    if (isMongoDBActive()) {
      try {
        const queryConds: any[] = [{ id: idStr }];
        if (mongoose.Types.ObjectId.isValid(idStr)) {
          queryConds.push({ _id: idStr });
        }
        await MNotification.deleteMany({
          $and: [
            { $or: queryConds },
            { $or: [{ userId: String(userId) }, { user_id: String(userId) }, { userId: { $exists: false } }] }
          ]
        });
      } catch (mErr: any) {
        console.warn('⚠️ Error deleting MNotification in MongoDB:', mErr.message);
      }
    }

    return res.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 5. CLEAR ALL USER NOTIFICATIONS
const clearAllNotificationsHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.filter((n: any) => {
        const notifUserId = String(n.userId || n.user_id || '');
        if (!notifUserId) return false; // Clear broadcast/general
        return notifUserId !== String(userId);
      });
      save();
    }

    if (isMongoDBActive() && userId) {
      try {
        await MNotification.deleteMany({
          $or: [{ userId: String(userId) }, { user_id: String(userId) }, { userId: { $exists: false } }]
        });
      } catch (mErr: any) {
        console.warn('⚠️ Error clearing user MNotification in MongoDB:', mErr.message);
      }
    }

    return res.json({ success: true, message: 'All notifications cleared successfully.' });
  } catch (err: any) {
    console.error('Error clearing notifications:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};

router.delete('/', authenticateToken, clearAllNotificationsHandler);
router.delete('/clear-all', authenticateToken, clearAllNotificationsHandler);
router.post('/clear-all', authenticateToken, clearAllNotificationsHandler);

export default router;
