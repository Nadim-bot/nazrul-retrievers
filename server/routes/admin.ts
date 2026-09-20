import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { getFallbackData, createAdminNotification, logAdminActivity, performCascadeDeleteUser, createUserNotification, generateUniqueId } from '../db';
import { authenticateToken, authorizeAdmin, authorizeModOrAdmin, AuthenticatedRequest } from '../middleware/auth';
import { isMongoDBActive, MConversationReport, MUser, MItem, MClaim, MChatThread, MSearchKeyword, MSearchLog, MAdminNotification, MAdminActivityLog, MNotification } from '../db/mongodb';
import { isFirebaseActive, getFirebaseAdminAuth } from '../utils/firebase';
import { syncAndEvaluateUser } from '../utils/profile';
import { getAllUsersList, saveOrUpdateUser } from './auth';
import bcrypt from 'bcryptjs';

const router = Router();

// Protect all admin endpoints with base authentication and moderator/admin-level checks
router.use(authenticateToken);
router.use(authorizeModOrAdmin);

// Strict helper: evaluate if a user is genuinely verified and completed registration
const isRegisteredAndVerifiedUser = (u: any) => {
  if (!u || u.fullName === 'Verified Student') return false;
  if (u.role === 'admin' || u.role === 'moderator') return true;
  const isVerified = u.emailVerified === true || u.email_verified === true || u.registrationCompleted === true;
  const isPending = String(u.status || '').toLowerCase() === 'pending' || String(u.accountStatus || '').toLowerCase() === 'pending';
  return isVerified && !isPending;
};

// Strict MongoDB condition: exclude pending unverified accounts from stats & registry
const validUserCondition = {
  $and: [
    { fullName: { $ne: 'Verified Student' } },
    {
      $or: [
        { role: { $in: ['admin', 'moderator'] } },
        {
          $and: [
            {
              $or: [
                { emailVerified: true },
                { email_verified: true },
                { registrationCompleted: true }
              ]
            },
            { status: { $nin: ['Pending', 'pending'] } },
            { accountStatus: { $nin: ['Pending', 'pending'] } }
          ]
        }
      ]
    }
  ]
};

// 1. GET ADMIN DASHBOARD METRICS / OVERVIEW STATS
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      // 1. Students / End-users Condition (Exclude Admins, Mods, and unverified pending stubs)
      const validStudentCondition = {
        $and: [
          { fullName: { $ne: 'Verified Student' } },
          { role: { $nin: ['admin', 'moderator'] } },
          {
            $or: [
              { emailVerified: true },
              { email_verified: true },
              { registrationCompleted: true }
            ]
          },
          { status: { $nin: ['Pending', 'pending'] } },
          { accountStatus: { $nin: ['Pending', 'pending'] } }
        ]
      };

      const totalStudents = await MUser.countDocuments(validStudentCondition as any);
      const totalAdmins = await MUser.countDocuments({ role: 'admin' });
      const totalModerators = await MUser.countDocuments({ role: 'moderator' });
      const totalStaff = totalAdmins + totalModerators;
      const totalAccounts = totalStudents + totalStaff;

      const activeStudents = await MUser.countDocuments({ 
        $and: [
          validStudentCondition,
          { status: { $nin: ['suspended', 'banned', 'Pending', 'pending'] } },
          { accountStatus: { $nin: ['suspended', 'banned', 'Pending', 'pending'] } },
          { isSuspended: { $ne: true } },
          { isBanned: { $ne: true } }
        ]
      } as any);

      const suspendedStudents = await MUser.countDocuments({ 
        $and: [
          validStudentCondition,
          { $or: [{ status: 'suspended' }, { status: 'locked' }, { accountStatus: 'suspended' }, { isSuspended: true }] }
        ]
      } as any);

      const bannedUsers = await MUser.countDocuments({ 
        $or: [{ status: 'banned' }, { accountStatus: 'banned' }, { isBanned: true }]
      });

      const flaggedUsers = await MUser.countDocuments({ 
        $or: [{ status: 'flagged' }, { accountStatus: 'flagged' }, { isFlagged: true }, { warningCount: { $gt: 0 } }]
      });

      const verifiedUsers = await MUser.countDocuments({ 
        $or: [{ isVerified: true }, { is_verified: true }, { idVerificationStatus: 'verified' }]
      });

      const totalPosts = await MItem.countDocuments({ isDeleted: { $ne: true } });
      const pendingApproval = await MItem.countDocuments({ 
        $or: [{ status: 'pending' }, { approvalStatus: 'pending' }], 
        isDeleted: { $ne: true } 
      });
      const approvedPosts = await MItem.countDocuments({ 
        $or: [{ status: 'approved' }, { approvalStatus: 'approved' }, { status: 'active' }], 
        isDeleted: { $ne: true } 
      });
      const returnedItems = await MItem.countDocuments({ 
        $or: [{ status: 'returned' }, { status: 'claimed' }, { status: 'resolved' }],
        isDeleted: { $ne: true } 
      });
      const deletedListings = await MItem.countDocuments({ 
        $or: [{ isDeleted: true }, { status: 'deleted' }] 
      });

      // Maintain backward compatibility & secondary metrics
      const totalItems = totalPosts;
      const claimedItems = returnedItems;
      const lostItems = await MItem.countDocuments({ type: 'lost', isDeleted: { $ne: true } });
      const foundItems = await MItem.countDocuments({ type: 'found', isDeleted: { $ne: true } });
      const activeItems = await MItem.countDocuments({ status: 'active', isDeleted: { $ne: true } });
      const viewsAggregation = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]);
      const totalViews = viewsAggregation[0]?.totalViews || 0;
      const matchSuccessRate = totalPosts > 0 ? `${((returnedItems / totalPosts) * 100).toFixed(1)}%` : '0.0%';

      return res.json({
        stats: {
          totalUsers: totalAccounts,
          totalAccounts,
          totalStudents,
          totalAdmins,
          totalModerators,
          totalStaff,
          verifiedUsers,
          activeUsers: activeStudents,
          activeStudents,
          suspendedUsers: suspendedStudents,
          bannedUsers,
          flaggedUsers,
          totalPosts,
          pendingApproval,
          approvedPosts,
          returnedItems,
          deletedListings,
          
          // Legacy fields for backward compatibility
          totalItems,
          lostItems,
          foundItems,
          activeItems,
          claimedItems,
          totalViews,
          matchSuccessRate
        }
      });
    } else {
      const { store } = getFallbackData();

      const rawUsers = store.users || [];
      const rawItems = store.items || [];

      // Differentiate genuine registered students from internal staff
      const isStudentUser = (u: any) => {
        if (!u || u.fullName === 'Verified Student') return false;
        if (u.role === 'admin' || u.role === 'moderator') return false;
        const isVerified = u.emailVerified === true || u.email_verified === true || u.registrationCompleted === true;
        const isPending = String(u.status || '').toLowerCase() === 'pending' || String(u.accountStatus || '').toLowerCase() === 'pending';
        return isVerified && !isPending;
      };

      const validStudents = rawUsers.filter(isStudentUser);
      const totalStudents = validStudents.length;
      const totalAdmins = rawUsers.filter((u: any) => u.role === 'admin').length;
      const totalModerators = rawUsers.filter((u: any) => u.role === 'moderator').length;
      const totalStaff = totalAdmins + totalModerators;
      const totalAccounts = totalStudents + totalStaff;

      const activeStudents = validStudents.filter((u: any) => 
        String(u.status || '').toLowerCase() !== 'suspended' && 
        String(u.status || '').toLowerCase() !== 'banned' && 
        String(u.accountStatus || '').toLowerCase() !== 'suspended' && 
        String(u.accountStatus || '').toLowerCase() !== 'banned' && 
        !u.isSuspended && !u.isBanned
      ).length;

      const suspendedStudents = validStudents.filter((u: any) => 
        String(u.status || '').toLowerCase() === 'suspended' || 
        String(u.status || '').toLowerCase() === 'locked' || 
        String(u.accountStatus || '').toLowerCase() === 'suspended' || 
        u.isSuspended
      ).length;

      const bannedUsers = rawUsers.filter((u: any) => 
        String(u.status || '').toLowerCase() === 'banned' || 
        String(u.accountStatus || '').toLowerCase() === 'banned' || 
        u.isBanned
      ).length;

      const flaggedUsers = rawUsers.filter((u: any) => 
        String(u.status || '').toLowerCase() === 'flagged' || 
        String(u.accountStatus || '').toLowerCase() === 'flagged' || 
        u.isFlagged || 
        (u.warningCount && u.warningCount > 0)
      ).length;

      const verifiedUsers = rawUsers.filter((u: any) => 
        u.isVerified || u.is_verified || u.idVerificationStatus === 'verified'
      ).length;

      const totalPosts = rawItems.filter(i => !i.isDeleted && i.status !== 'deleted').length;
      const pendingApproval = rawItems.filter(i => !i.isDeleted && (i.status === 'pending' || i.approvalStatus === 'pending')).length;
      const approvedPosts = rawItems.filter(i => !i.isDeleted && (i.status === 'approved' || i.approvalStatus === 'approved' || i.status === 'active')).length;
      const returnedItems = rawItems.filter(i => !i.isDeleted && (i.status === 'returned' || i.status === 'claimed' || i.status === 'resolved')).length;
      const deletedListings = rawItems.filter(i => i.isDeleted || i.status === 'deleted').length;

      // Legacy fields
      const totalItems = totalPosts;
      const lostItems = store.items.filter(i => !i.isDeleted && i.type === 'lost').length;
      const foundItems = store.items.filter(i => !i.isDeleted && i.type === 'found').length;
      const activeItems = store.items.filter(i => !i.isDeleted && i.status === 'active').length;
      const claimedItems = returnedItems;
      const totalViews = store.items.filter(i => !i.isDeleted).reduce((sum, item) => sum + (item.views || 0), 0);
      const matchSuccessRate = totalPosts > 0 ? `${((returnedItems / totalPosts) * 100).toFixed(1)}%` : '0.0%';

      return res.json({
        stats: {
          totalUsers: totalAccounts,
          totalAccounts,
          totalStudents,
          totalAdmins,
          totalModerators,
          totalStaff,
          verifiedUsers,
          activeUsers: activeStudents,
          activeStudents,
          suspendedUsers: suspendedStudents,
          bannedUsers,
          flaggedUsers,
          totalPosts,
          pendingApproval,
          approvedPosts,
          returnedItems,
          deletedListings,

          // Legacy fields
          totalItems,
          lostItems,
          foundItems,
          activeItems,
          claimedItems,
          totalViews,
          matchSuccessRate
        }
      });
    }
  } catch (err: any) {
    console.error('Error fetching admin dashboard stats:', err);
    return res.status(500).json({ error: 'Internal server error fetching admin stats: ' + err.message });
  }
});

// 1b. GET ADMIN DETAILED ANALYTICS (MONGODB AGGREGATIONS)
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      // 1. Posts Per Month (Safe date conversion)
      const postsPerMonth = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $project: {
            type: 1,
            createdDate: {
              $convert: {
                input: { $ifNull: ["$createdAt", "$created_at"] },
                to: "date",
                onError: null,
                onNull: null
              }
            }
          }
        },
        { $match: { createdDate: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdDate" } },
            lost: { $sum: { $cond: [{ $eq: ["$type", "lost"] }, 1, 0] } },
            found: { $sum: { $cond: [{ $eq: ["$type", "found"] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", lost: 1, found: 1, _id: 0 } }
      ]);

      // 2. Lost vs Found count
      const lostCount = await MItem.countDocuments({ type: 'lost', isDeleted: { $ne: true } });
      const foundCount = await MItem.countDocuments({ type: 'found', isDeleted: { $ne: true } });

      // 3. Posts by Department
      const postsByDeptAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: { $ifNull: ["$postedBy.department", "General"] },
            count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { department: "$_id", count: 1, _id: 0 } }
      ]);

      // 4. Posts by Category
      const postsByCategoryAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: { $ifNull: ["$category", "Other"] },
            count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { category: "$_id", count: 1, _id: 0 } }
      ]);

      // 4b. Posts by Subcategory
      const postsBySubcategoryAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true }, subcategory: { $exists: true, $ne: "" } } },
        { $group: {
            _id: { $ifNull: ["$subcategory", "Other"] },
            count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { subcategory: "$_id", count: 1, _id: 0 } }
      ]);

      // 5. Rates calculations (Approval, Returned, Pending)
      const totalPosts = await MItem.countDocuments({ isDeleted: { $ne: true } }) || 1;
      const approvedPosts = await MItem.countDocuments({ 
        $or: [{ status: 'approved' }, { approvalStatus: 'approved' }, { status: 'active' }], 
        isDeleted: { $ne: true } 
      });
      const pendingApproval = await MItem.countDocuments({ 
        $or: [{ status: 'pending' }, { approvalStatus: 'pending' }], 
        isDeleted: { $ne: true } 
      });
      const returnedItems = await MItem.countDocuments({ 
        status: { $in: ['returned', 'reunited', 'claimed', 'resolved'] }, 
        isDeleted: { $ne: true } 
      });

      const approvalRate = ((approvedPosts / totalPosts) * 100).toFixed(1);
      const pendingRate = ((pendingApproval / totalPosts) * 100).toFixed(1);
      const returnedRate = ((returnedItems / totalPosts) * 100).toFixed(1);

      // 6. Users joined per month (Safe date conversion)
      const usersJoinedPerMonth = await MUser.aggregate([
        {
          $project: {
            role: 1,
            createdDate: {
              $convert: {
                input: { $ifNull: ["$createdAt", "$created_at"] },
                to: "date",
                onError: null,
                onNull: null
              }
            }
          }
        },
        { $match: { createdDate: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdDate" } },
            students: { $sum: { $cond: [{ $in: ["$role", ["student", "user"]] }, 1, 0] } },
            staff: { $sum: { $cond: [{ $in: ["$role", ["admin", "moderator"]] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", students: 1, staff: 1, total: { $add: ["$students", "$staff"] }, _id: 0 } }
      ]);

      // 7. Reports created daily (Safe date conversion)
      const reportsCreatedDaily = await MConversationReport.aggregate([
        {
          $project: {
            createdDate: {
              $convert: {
                input: { $ifNull: ["$createdAt", "$created_at"] },
                to: "date",
                onError: null,
                onNull: null
              }
            }
          }
        },
        { $match: { createdDate: { $ne: null } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdDate" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } }
      ]);

      // 8. Claims statistics
      const claimsSubmitted = await MClaim.countDocuments({});
      const claimsApproved = await MClaim.countDocuments({ status: 'approved' });
      const claimsRejected = await MClaim.countDocuments({ status: 'rejected' });
      const claimsPending = await MClaim.countDocuments({ status: 'pending' });

      // 9. Average resolution time
      const returnedList = await MItem.find({ status: 'returned', isDeleted: { $ne: true } }).lean();
      let totalResolutionHours = 0;
      let countWithResolution = 0;
      for (const item of returnedList) {
        if (item.createdAt && item.updatedAt) {
          const start = new Date(item.createdAt).getTime();
          const end = new Date(item.updatedAt).getTime();
          const diff = end - start;
          if (diff > 0) {
            totalResolutionHours += diff / (1000 * 60 * 60);
            countWithResolution++;
          }
        }
      }
      const avgResolutionTime = countWithResolution > 0 ? (totalResolutionHours / countWithResolution).toFixed(1) : "0";

      // 9b. User verification counts
      const totalUsers = await MUser.countDocuments({}) || 0;
      const verifiedUsers = await MUser.countDocuments({ $or: [{ isVerified: true }, { is_verified: true }, { emailVerified: true }, { verified: true }] }) || 0;
      const studentUsers = await MUser.countDocuments({ role: { $in: ['student', 'user'] } }) || 0;
      const staffUsers = await MUser.countDocuments({ role: { $in: ['admin', 'moderator', 'coordinator', 'staff'] } }) || 0;

      // 10. Most active users (by items posted)
      const mostActiveUsersAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: "$userId",
            count: { $sum: 1 },
            displayName: { $first: "$displayName" },
            email: { $first: "$email" }
        } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { userId: "$_id", count: 1, displayName: { $ifNull: ["$displayName", "$email"] }, _id: 0 } }
      ]);

      // 11. Most active moderators
      const mostActiveModeratorsAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true }, approvedBy: { $nin: [null, ""] } } },
        { $group: {
            _id: "$approvedBy",
            count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { moderatorId: "$_id", count: 1, _id: 0 } }
      ]);

      // Enrich moderators with names if possible
      const enrichedMods = [];
      for (const mod of mostActiveModeratorsAgg) {
        const user = await MUser.findOne({ id: mod.moderatorId }).lean();
        enrichedMods.push({
          moderatorId: mod.moderatorId,
          count: mod.count,
          name: user ? user.full_name : `Mod ${mod.moderatorId}`
        });
      }

      // 12. Most viewed posts
      const mostViewedPosts = await MItem.find({ isDeleted: { $ne: true } })
        .sort({ views: -1 })
        .limit(10)
        .select('id title views category type status')
        .lean();

      // 13. Most claimed items (items with claims approved)
      const approvedClaims = await MClaim.find({ status: 'approved' }).lean();
      const claimedItemsIds = approvedClaims.map(c => c.item_id);
      const mostClaimedItems = await MItem.find({ id: { $in: claimedItemsIds } })
        .limit(10)
        .select('id title category type status')
        .lean();

      // 14. Daily Activity Graph (last 7 days - real lost and found breakdown)
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      const dailyActivity = [];
      for (const date of days) {
        const startOfDay = new Date(date + "T00:00:00.000Z");
        const endOfDay = new Date(date + "T23:59:59.999Z");
        const dateObj = new Date(date);
        const dayName = isNaN(dateObj.getTime()) ? date : dayNames[dateObj.getDay()];

        const registrations = await MUser.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
        const lostPosts = await MItem.countDocuments({ 
          $or: [
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
            { date: date }
          ],
          type: 'lost', 
          isDeleted: { $ne: true } 
        });
        const foundPosts = await MItem.countDocuments({ 
          $or: [
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
            { date: date }
          ],
          type: 'found', 
          isDeleted: { $ne: true } 
        });
        const claims = await MClaim.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
        const approvals = await MItem.countDocuments({ approvedAt: { $gte: startOfDay, $lte: endOfDay }, isDeleted: { $ne: true } });
        
        dailyActivity.push({
          date,
          day: dayName,
          lost: lostPosts,
          found: foundPosts,
          posts: lostPosts + foundPosts,
          registrations,
          claims,
          approvals,
          total: registrations + lostPosts + foundPosts + claims + approvals
        });
      }

      // 15. Search keywords frequency from detailed logs
      const topSearchKeywords = await MSearchLog.aggregate([
        { $match: { keyword: { $exists: true, $nin: [null, ""] } } },
        { $group: {
            _id: { $toLower: { $ifNull: ["$keyword", ""] } },
            keyword: { $first: "$keyword" },
            count: { $sum: 1 },
            category: { $first: "$category" }
        } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { keyword: 1, count: 1, category: { $ifNull: ["$category", "Other"] }, _id: 0 } }
      ]);

      // 16. Dynamic system insights computed from actual live data
      const topCategoryObj = postsByCategoryAgg[0] || { category: 'None', count: 0 };
      const topCategoryPercent = totalPosts > 0 ? ((topCategoryObj.count / totalPosts) * 100).toFixed(1) : "0";
      const topDeptObj = postsByDeptAgg[0] || { department: 'General', count: 0 };
      
      const dynamicInsights = [
        {
          type: 'category',
          title: 'Top Reported Category',
          description: topCategoryObj.count > 0 
            ? `Category "${topCategoryObj.category}" leads listings with ${topCategoryObj.count} items (${topCategoryPercent}% of all recorded reports).`
            : 'No category distribution logged yet.'
        },
        {
          type: 'department',
          title: 'Active Department',
          description: topDeptObj.count > 0 
            ? `The "${topDeptObj.department}" department logged the highest activity with ${topDeptObj.count} registered items.`
            : 'Department data is distributed evenly across campus.'
        },
        {
          type: 'resolution',
          title: 'Campus Return Rate',
          description: returnedItems > 0 
            ? `Successfully recovered and returned ${returnedItems} items with a resolution rate of ${returnedRate}%.`
            : 'No items marked as reunited or returned yet.'
        },
        {
          type: 'pending',
          title: 'Queue Status',
          description: (pendingApproval > 0)
            ? `${pendingApproval} item post${pendingApproval === 1 ? '' : 's'} currently pending administrator review.`
            : 'All listings and student verification reviews are up to date with zero backlog.'
        }
      ];

      // 17. Recent registered users directly from live database
      const isRealAccount = (u: any) => {
        if (!u) return false;
        const email = String(u.email || '').trim().toLowerCase();
        const id = String(u.id || u.user_id || u._id || '');
        const name = String(u.fullName || u.full_name || u.name || '').trim().toLowerCase();
        if (id.startsWith('sim-')) return false;
        if (email.startsWith('student_') && email.endsWith('@jkkniu.edu.bd')) return false;
        if (name === 'test student' || name === 'verified student') return false;
        if (!email) return false;
        return true;
      };

      const allLiveUsers = await getAllUsersList();
      const recentRegisteredUsers = allLiveUsers
        .filter(isRealAccount)
        .sort((a: any, b: any) => {
          const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
          const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
          return db - da;
        })
        .slice(0, 15)
        .map((rawU: any) => {
          const u = syncAndEvaluateUser(rawU, allLiveUsers);
          const isStaff = u.role === 'admin' || u.role === 'moderator' || u.role === 'coordinator' || String(u.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
          const hasDoc = !!(u.verificationDocument && String(u.verificationDocument).trim().length > 0);
          const isApproved = (u.idVerificationStatus === 'verified' || u.isVerified === true || u.is_verified === true || u.verified === true) && !isStaff;
          
          let idStatus: 'verified' | 'pending' | 'unverified' = 'unverified';
          if (isStaff) {
            idStatus = 'verified';
          } else if (isApproved) {
            idStatus = 'verified';
          } else if (u.idVerificationStatus === 'pending' || hasDoc) {
            idStatus = 'pending';
          } else {
            idStatus = 'unverified';
          }

          const originalTime = u.createdAt || u.created_at || rawU.createdAt || rawU.created_at || u.date || new Date().toISOString();

          return {
            id: String(u.id || u.user_id || u._id || 'USR-N/A'),
            name: u.fullName || u.full_name || u.name || 'Campus User',
            email: u.email || 'N/A',
            role: u.role || 'student',
            department: u.department || 'General',
            studentId: u.studentId || u.student_id || u.rollNumber || '-',
            isVerified: isApproved || isStaff,
            idVerificationStatus: idStatus,
            hasIdDocument: hasDoc,
            createdAt: originalTime,
            status: u.status || u.accountStatus || 'active'
          };
        });

      return res.json({
        overview: {
          totalPosts,
          lostCount,
          foundCount,
          returnedItems,
          approvedPosts,
          pendingApproval,
          totalUsers,
          studentUsers,
          staffUsers,
          verifiedUsers,
          claimsSubmitted,
          claimsApproved,
          claimsRejected,
          claimsPending,
          approvalRate,
          pendingRate,
          returnedRate,
          avgResolutionTime
        },
        postsPerMonth,
        lostVsFound: { lost: lostCount, found: foundCount },
        postsByDepartment: postsByDeptAgg,
        postsByCategory: postsByCategoryAgg,
        postsBySubcategory: postsBySubcategoryAgg,
        rates: { approvalRate, pendingRate, returnedRate },
        usersJoinedPerMonth,
        reportsCreatedDaily,
        claims: { submitted: claimsSubmitted, approved: claimsApproved, rejected: claimsRejected, pending: claimsPending },
        avgResolutionTime,
        mostActiveUsers: mostActiveUsersAgg,
        mostActiveModerators: enrichedMods,
        mostViewedPosts,
        mostClaimedItems,
        dailyActivity,
        topSearchKeywords,
        dynamicInsights,
        recentRegisteredUsers
      });
    } else {
      // FALLBACK STORE IMPLEMENTATION
      const { store } = getFallbackData();

      // Safe Date parsing helpers
      const getMonthStr = (dateVal?: any) => {
        if (!dateVal) return new Date().toISOString().substring(0, 7);
        try {
          if (typeof dateVal === 'string') {
            if (dateVal.length >= 7) return dateVal.substring(0, 7);
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 7);
          } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal.toISOString().substring(0, 7);
          } else if (typeof dateVal === 'number') {
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 7);
          }
        } catch {
          // fallback
        }
        return new Date().toISOString().substring(0, 7);
      };

      const getDateStr = (dateVal?: any) => {
        if (!dateVal) return new Date().toISOString().substring(0, 10);
        try {
          if (typeof dateVal === 'string') {
            if (dateVal.length >= 10) return dateVal.substring(0, 10);
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
          } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal.toISOString().substring(0, 10);
          } else if (typeof dateVal === 'number') {
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
          }
        } catch {
          // fallback
        }
        return new Date().toISOString().substring(0, 10);
      };

      // 1. Posts per month fallback
      const monthlyMap = new Map<string, { lost: number, found: number }>();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const m = getMonthStr(i.date);
        if (!monthlyMap.has(m)) {
          monthlyMap.set(m, { lost: 0, found: 0 });
        }
        const val = monthlyMap.get(m)!;
        if (i.type === 'lost') val.lost++;
        else val.found++;
      }
      const postsPerMonth = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        lost: data.lost,
        found: data.found
      })).sort((a, b) => a.month.localeCompare(b.month));

      // 2. Lost vs Found count
      const lostCount = store.items.filter(i => !i.isDeleted && i.type === 'lost').length;
      const foundCount = store.items.filter(i => !i.isDeleted && i.type === 'found').length;

      // 3. Department fallback
      const deptMap = new Map<string, number>();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const dept = i.postedBy?.department || "General";
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      }
      const postsByDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({
        department,
        count
      })).sort((a, b) => b.count - a.count);

      // 4. Category fallback
      const catMap = new Map<string, number>();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const cat = i.category || "Other";
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
      const postsByCategory = Array.from(catMap.entries()).map(([category, count]) => ({
        category,
        count
      })).sort((a, b) => b.count - a.count);

      // 4b. Subcategory fallback
      const subMap = new Map<string, number>();
      for (const i of store.items) {
        if (i.isDeleted || !i.subcategory) continue;
        subMap.set(i.subcategory, (subMap.get(i.subcategory) || 0) + 1);
      }
      const postsBySubcategory = Array.from(subMap.entries()).map(([subcategory, count]) => ({
        subcategory,
        count
      })).sort((a, b) => b.count - a.count);

      // 5. Rates
      const totalPosts = store.items.filter(i => !i.isDeleted).length || 1;
      const approvedPosts = store.items.filter(i => !i.isDeleted && (i.status === 'approved' || i.approvalStatus === 'approved' || i.status === 'active')).length;
      const pendingApproval = store.items.filter(i => !i.isDeleted && (i.status === 'pending' || i.approvalStatus === 'pending')).length;
      const returnedItems = store.items.filter(i => !i.isDeleted && i.status === 'returned').length;

      const approvalRate = ((approvedPosts / totalPosts) * 100).toFixed(1);
      const pendingRate = ((pendingApproval / totalPosts) * 100).toFixed(1);
      const returnedRate = ((returnedItems / totalPosts) * 100).toFixed(1);

      // 6. Users joined month fallback
      const userMonthMap = new Map<string, { students: number, staff: number }>();
      for (const u of store.users) {
        const m = getMonthStr(u.createdAt);
        if (!userMonthMap.has(m)) {
          userMonthMap.set(m, { students: 0, staff: 0 });
        }
        const val = userMonthMap.get(m)!;
        if (u.role === 'student' || u.role === 'user') val.students++;
        else val.staff++;
      }
      const usersJoinedPerMonth = Array.from(userMonthMap.entries()).map(([month, data]) => ({
        month,
        students: data.students,
        staff: data.staff,
        total: data.students + data.staff
      })).sort((a, b) => a.month.localeCompare(b.month));

      // 7. Reports created fallback
      const repMap = new Map<string, number>();
      const reportsList = store.conversation_reports || [];
      for (const r of reportsList) {
        const d = getDateStr(r.createdAt);
        repMap.set(d, (repMap.get(d) || 0) + 1);
      }
      const reportsCreatedDaily = Array.from(repMap.entries()).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date));

      // 8. Claims stats
      const validClaimsList = (store.claims || []).filter((c: any) => {
        const item = (store.items || []).find((i: any) => String(i.id) === String(c.item_id) || String((i as any)._id) === String(c.item_id));
        const user = (store.users || []).find((u: any) => String(u.id) === String(c.user_id) || String((u as any)._id) === String(c.user_id));
        return item && user && !item.isDeleted && item.status !== 'deleted';
      });
      const claimsSubmitted = validClaimsList.length;
      const claimsApproved = validClaimsList.filter(c => c.status === 'approved').length;
      const claimsRejected = validClaimsList.filter(c => c.status === 'rejected').length;

      const claimsPending = validClaimsList.filter(c => c.status === 'pending').length;

      // 9. Resolution hours
      const returnedList = (store.items || []).filter(i => !i.isDeleted && ['returned', 'reunited', 'claimed', 'resolved'].includes(i.status));
      let totalResolutionHours = 0;
      let countWithResolution = 0;
      for (const item of returnedList) {
        const itemDate = item.date || "";
        const approvedAtStr = item.approvedAt ? String(item.approvedAt) : "";
        if (itemDate && approvedAtStr) {
          const start = new Date(itemDate).getTime();
          const end = new Date(approvedAtStr).getTime();
          const diff = end - start;
          if (diff > 0) {
            totalResolutionHours += diff / (1000 * 60 * 60);
            countWithResolution++;
          }
        }
      }
      const avgResolutionTime = countWithResolution > 0 ? (totalResolutionHours / countWithResolution).toFixed(1) : "0";

      // 9b. User verification counts fallback
      const totalUsers = store.users.length;
      const verifiedUsers = store.users.filter(u => u.isVerified || (u as any).is_verified || (u as any).emailVerified || (u as any).verified).length;
      const studentUsers = store.users.filter(u => u.role === 'student' || (u.role as any) === 'user').length;
      const staffUsers = store.users.filter(u => u.role === 'admin' || u.role === 'moderator' || (u.role as any) === 'coordinator' || (u.role as any) === 'staff').length;

      // 10. Most active users
      const userPostCount = new Map<string, { count: number, displayName: string }>();
      for (const i of store.items) {
        if (i.isDeleted || !i.userId) continue;
        const existing = userPostCount.get(i.userId) || { count: 0, displayName: i.postedBy?.name || i.email || "User" };
        existing.count++;
        userPostCount.set(i.userId, existing);
      }
      const mostActiveUsers = Array.from(userPostCount.entries()).map(([userId, data]) => ({
        userId,
        count: data.count,
        displayName: data.displayName
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      // 11. Most active moderators
      const modCount = new Map<string, number>();
      for (const i of store.items) {
        if (i.isDeleted || !i.approvedBy) continue;
        modCount.set(i.approvedBy, (modCount.get(i.approvedBy) || 0) + 1);
      }
      const mostActiveModerators = Array.from(modCount.entries()).map(([moderatorId, count]) => {
        const u = store.users.find(usr => String(usr.id) === String(moderatorId));
        return {
          moderatorId,
          count,
          name: u ? u.full_name : `Mod ${moderatorId}`
        };
      }).sort((a, b) => b.count - a.count).slice(0, 10);

      // 12. Most viewed
      const mostViewedPosts = [...store.items]
        .filter(i => !i.isDeleted)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          title: i.title,
          views: i.views || 0,
          category: i.category,
          type: i.type,
          status: i.status
        }));

      // 13. Most claimed
      const approvedClaimItemIds = validClaimsList.filter(c => c.status === 'approved').map(c => c.item_id);
      const mostClaimedItems = store.items
        .filter(i => approvedClaimItemIds.includes(i.id))
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          title: i.title,
          category: i.category,
          type: i.type,
          status: i.status
        }));

      // 14. Daily Activity
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      const dailyActivity = [];
      for (const date of days) {
        const dateObj = new Date(date);
        const dayName = isNaN(dateObj.getTime()) ? date : dayNames[dateObj.getDay()];

        const registrations = store.users.filter(u => {
          const uDate = (u as any).createdAt || (u as any).date;
          return getDateStr(uDate) === date;
        }).length;
        const lostPosts = store.items.filter(i => {
          const iDate = i.date || (i as any).createdAt;
          return !i.isDeleted && i.type === 'lost' && getDateStr(iDate) === date;
        }).length;
        const foundPosts = store.items.filter(i => {
          const iDate = i.date || (i as any).createdAt;
          return !i.isDeleted && i.type === 'found' && getDateStr(iDate) === date;
        }).length;
        const claims = validClaimsList.filter(c => {
          const cDate = (c as any).createdAt || (c as any).date;
          return getDateStr(cDate) === date;
        }).length;
        const approvals = store.items.filter(i => {
          const appAt = i.approvedAt || (i as any).reviewedAt;
          return !i.isDeleted && getDateStr(appAt) === date;
        }).length;

        dailyActivity.push({
          date,
          day: dayName,
          lost: lostPosts,
          found: foundPosts,
          posts: lostPosts + foundPosts,
          registrations,
          claims,
          approvals,
          total: registrations + lostPosts + foundPosts + claims + approvals
        });
      }

      // 15. Search logs keywords fallback
      const logs = store.searchLogs || [];
      const keywordsMap = new Map<string, { count: number, category: string }>();
      for (const log of logs) {
        const kw = (log.keyword || "").toLowerCase().trim();
        if (!kw) continue;
        const existing = keywordsMap.get(kw) || { count: 0, category: log.category || "Other" };
        existing.count++;
        keywordsMap.set(kw, existing);
      }
      const topSearchKeywords = Array.from(keywordsMap.entries()).map(([keyword, val]) => ({
        keyword,
        count: val.count,
        category: val.category
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      // 16. Dynamic insights fallback
      const topCategoryObj = postsByCategory[0] || { category: 'None', count: 0 };
      const topCategoryPercent = totalPosts > 0 ? ((topCategoryObj.count / totalPosts) * 100).toFixed(1) : "0";
      const topDeptObj = postsByDepartment[0] || { department: 'General', count: 0 };

      const dynamicInsights = [
        {
          type: 'category',
          title: 'Top Reported Category',
          description: topCategoryObj.count > 0 
            ? `Category "${topCategoryObj.category}" leads listings with ${topCategoryObj.count} items (${topCategoryPercent}% of all recorded reports).`
            : 'No category distribution logged yet.'
        },
        {
          type: 'department',
          title: 'Active Department',
          description: topDeptObj.count > 0 
            ? `The "${topDeptObj.department}" department logged the highest activity with ${topDeptObj.count} registered items.`
            : 'Department data is distributed evenly across campus.'
        },
        {
          type: 'resolution',
          title: 'Campus Return Rate',
          description: returnedItems > 0 
            ? `Successfully recovered and returned ${returnedItems} items with a resolution rate of ${returnedRate}%.`
            : 'No items marked as reunited or returned yet.'
        },
        {
          type: 'pending',
          title: 'Queue Status',
          description: (pendingApproval > 0)
            ? `${pendingApproval} item post${pendingApproval === 1 ? '' : 's'} currently pending administrator review.`
            : 'All listings and student verification reviews are up to date with zero backlog.'
        }
      ];

      // 17. Recent registered users fallback directly from store
      const isRealAccount = (u: any) => {
        if (!u) return false;
        const email = String(u.email || '').trim().toLowerCase();
        const id = String(u.id || u.user_id || u._id || '');
        const name = String(u.fullName || u.full_name || u.name || '').trim().toLowerCase();
        if (id.startsWith('sim-')) return false;
        if (email.startsWith('student_') && email.endsWith('@jkkniu.edu.bd')) return false;
        if (name === 'test student' || name === 'verified student') return false;
        if (!email) return false;
        return true;
      };

      const allFallbackUsers = [...(store.users || [])];
      const recentRegisteredUsers = allFallbackUsers
        .filter(isRealAccount)
        .sort((a: any, b: any) => {
          const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
          const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
          return db - da;
        })
        .slice(0, 15)
        .map((rawU: any) => {
          const u = syncAndEvaluateUser(rawU, allFallbackUsers);
          const isStaff = u.role === 'admin' || u.role === 'moderator' || u.role === 'coordinator' || String(u.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
          const hasDoc = !!(u.verificationDocument && String(u.verificationDocument).trim().length > 0);
          const isApproved = (u.idVerificationStatus === 'verified' || u.isVerified === true || u.is_verified === true || u.verified === true) && !isStaff;
          
          let idStatus: 'verified' | 'pending' | 'unverified' = 'unverified';
          if (isStaff) {
            idStatus = 'verified';
          } else if (isApproved) {
            idStatus = 'verified';
          } else if (u.idVerificationStatus === 'pending' || hasDoc) {
            idStatus = 'pending';
          } else {
            idStatus = 'unverified';
          }

          const originalTime = u.createdAt || u.created_at || rawU.createdAt || rawU.created_at || u.date || new Date().toISOString();

          return {
            id: String(u.id || u.user_id || u._id || 'USR-N/A'),
            name: u.fullName || u.full_name || u.name || 'Campus User',
            email: u.email || 'N/A',
            role: u.role || 'student',
            department: u.department || 'General',
            studentId: u.studentId || u.student_id || u.rollNumber || '-',
            isVerified: isApproved || isStaff,
            idVerificationStatus: idStatus,
            hasIdDocument: hasDoc,
            createdAt: originalTime,
            status: u.status || u.accountStatus || 'active'
          };
        });

      return res.json({
        overview: {
          totalPosts,
          lostCount,
          foundCount,
          returnedItems,
          approvedPosts,
          pendingApproval,
          totalUsers,
          studentUsers,
          staffUsers,
          verifiedUsers,
          claimsSubmitted,
          claimsApproved,
          claimsRejected,
          claimsPending,
          approvalRate,
          pendingRate,
          returnedRate,
          avgResolutionTime
        },
        postsPerMonth,
        lostVsFound: { lost: lostCount, found: foundCount },
        postsByDepartment,
        postsByCategory,
        postsBySubcategory,
        rates: { approvalRate, pendingRate, returnedRate },
        usersJoinedPerMonth,
        reportsCreatedDaily,
        claims: { submitted: claimsSubmitted, approved: claimsApproved, rejected: claimsRejected, pending: claimsPending },
        avgResolutionTime,
        mostActiveUsers,
        mostActiveModerators,
        mostViewedPosts,
        mostClaimedItems,
        dailyActivity,
        topSearchKeywords,
        dynamicInsights,
        recentRegisteredUsers
      });
    }
  } catch (err: any) {
    console.error('Error fetching admin analytics:', err);
    return res.status(500).json({ error: 'Internal server error fetching analytics: ' + err.message });
  }
});

// 1c. POST SIMULATE ACTIVITY
router.post('/simulate-activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const departmentsList = [
      'Computer Science & Engineering',
      'Information & Communication Technology',
      'Electrical & Electronic Engineering',
      'Economics',
      'Business Administration',
      'Social Science'
    ];
    const namesList = [
      'Anik Sen',
      'Farhana Yasmin',
      'Mahedi Hasan',
      'Tasnim Rahman',
      'Naimur Rahman',
      'Sadia Chowdhury',
      'Mehedi Al-Amin',
      'Zarin Tasnim'
    ];
    const typesList = ['lost', 'found'];
    const itemsList = [
      { emoji: '📱', title: 'iPhone 13 Pro', category: 'Electronics', desc: 'Lost my graphite grey iPhone 13 Pro with a matte black back cover.' },
      { emoji: '🎒', title: 'Nike Black Backpack', category: 'Bags & Luggage', desc: 'Found a black Nike backpack containing some notes and a calculator.' },
      { emoji: '🪪', title: 'JKKNIU Student ID Card', category: 'Documents & ID Cards', desc: 'Lost my student ID card. Name: Tanvir Rahman, Roll: 181012.' },
      { emoji: '🔑', title: 'Keychain with Brass Keys', category: 'Keys & Access Cards', desc: 'Found a bunch of keys on a red ring near the social science cafeteria.' },
      { emoji: '📘', title: 'CSE-301 Textbook', category: 'Books & Stationery', desc: 'Found a Database Systems textbook in room 405.' },
      { emoji: '🎧', title: 'Sony WH-1000XM4 Headphones', category: 'Electronics', desc: 'Lost my silver Sony headphones in the library study lounge.' }
    ];

    const randomName = namesList[Math.floor(Math.random() * namesList.length)];
    const randomDept = departmentsList[Math.floor(Math.random() * departmentsList.length)];
    const randomItemTemplate = itemsList[Math.floor(Math.random() * itemsList.length)];
    const randomType = typesList[Math.floor(Math.random() * typesList.length)];

    const id = `sim-${Date.now()}`;
    const email = `${randomName.toLowerCase().replace(/\s/g, '')}@jkkniu.edu`;

    const mockItem = {
      id: id,
      emoji: randomItemTemplate.emoji,
      title: `${randomItemTemplate.title} (${randomType === 'lost' ? 'Lost' : 'Found'})`,
      category: randomItemTemplate.category,
      description: randomItemTemplate.desc,
      type: randomType,
      location: 'Science Building',
      specificSpot: 'Room 302',
      views: Math.floor(Math.random() * 50) + 10,
      status: 'active',
      approvalStatus: 'approved',
      userId: id,
      email: email,
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      createdAt: new Date(),
      date: new Date().toISOString(),
      postedBy: {
        name: randomName,
        email: email,
        department: randomDept,
        phone: '+880 1711-222333'
      }
    };

    const mockSearchLog = {
      keyword: randomItemTemplate.title.split(' ')[0],
      count: Math.floor(Math.random() * 5) + 1,
      category: randomItemTemplate.category,
      createdAt: new Date()
    };

    if (isMongoDBActive()) {
      await MItem.create({ ...mockItem, _id: undefined } as any);
      await MSearchLog.create({ ...mockSearchLog, _id: undefined } as any);
      if (Math.random() > 0.5) {
        await MClaim.create({
          claim_id: `claim-${id}`,
          id: `claim-${id}`,
          item_id: id,
          itemId: id,
          user_id: id,
          claimant_id: id,
          claimantId: id,
          proof_description: 'This matches my lost property description perfectly.',
          description: 'This matches my lost property description perfectly.',
          status: 'pending',
          createdAt: new Date()
        } as any);
      }
    } else {
      const { store, save } = getFallbackData();
      store.items.push(mockItem as any);
      if (!store.searchLogs) store.searchLogs = [];
      store.searchLogs.push(mockSearchLog as any);
      if (Math.random() > 0.5) {
        if (!store.claims) store.claims = [];
        store.claims.push({
          claim_id: `claim-${id}`,
          id: `claim-${id}`,
          item_id: id,
          itemId: id,
          user_id: id,
          claimant_id: id,
          claimantId: id,
          proof_description: 'This matches my lost property description perfectly.',
          description: 'This matches my lost property description perfectly.',
          status: 'pending',
          createdAt: new Date().toISOString()
        } as any);
      }
      await save();
    }

    return res.json({ success: true, message: 'Activity simulated successfully!', item: mockItem });
  } catch (err: any) {
    console.error('Error simulating activity:', err);
    return res.status(500).json({ error: 'Failed to simulate activity: ' + err.message });
  }
});

// 1c-2. PUT APPROVE OR REJECT ITEM
router.put('/items/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, reason } = req.body || {};
  const isReject = action === 'reject';
  try {
    const adminName = req.user?.fullName || req.user?.email || 'Admin/Moderator';
    const now = new Date();

    const { store, save } = getFallbackData();
    let item = store.items.find(i => String(i.id) === String(id) || String((i as any)._id) === String(id) || String((i as any).item_id) === String(id));
    
    if (!item && isMongoDBActive()) {
      try {
        const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        const mongoItem = await MItem.findOne(isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) }).lean();
        if (mongoItem) {
          item = { ...(mongoItem as any), id: String((mongoItem as any).id || (mongoItem as any)._id) };
          store.items.unshift(item);
        }
      } catch (err: any) {
        console.warn('MongoDB item lookup error during approve:', err.message);
      }
    }

    if (!item) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (isReject) {
      item.approvalStatus = 'rejected';
      (item as any).approval_status = 'rejected';
      item.status = 'rejected';
      (item as any).isRejected = true;
      (item as any).isApproved = false;
      (item as any).rejectedBy = adminName;
      (item as any).rejectedAt = now;
      (item as any).rejectionReason = reason || 'Spam listing or policy violation.';
    } else {
      item.approvalStatus = 'approved';
      (item as any).approval_status = 'approved';
      item.status = 'active';
      (item as any).isApproved = true;
      (item as any).isRejected = false;
      (item as any).approvedBy = adminName;
      (item as any).approvedAt = now;
    }

    save();

    if (isMongoDBActive()) {
      try {
        const updateFields = isReject ? {
          approvalStatus: 'rejected',
          status: 'rejected',
          isRejected: true,
          isApproved: false,
          rejectedBy: adminName,
          rejectedAt: now,
          rejectionReason: reason || 'Spam listing or policy violation.'
        } : {
          approvalStatus: 'approved',
          status: 'active',
          isApproved: true,
          isRejected: false,
          approvedBy: adminName,
          approvedAt: now
        };

        const isObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        const filter = isObjectId
          ? { $or: [{ id: String(id) }, { _id: id }] }
          : { id: String(id) };

        await MItem.updateOne(filter, { $set: updateFields });
      } catch (mErr: any) {
        console.warn('Failed to update MItem in MongoDB:', mErr.message);
      }
    }

    // Add user notification
    if (item.userId || (item as any).firebaseUid || item.email) {
      const uId = item.userId || (item as any).firebaseUid || item.email;
      const notifTitle = isReject ? 'Listing Rejected' : 'Listing Approved';
      const notifText = isReject 
        ? `❌ Your listing <strong>"${item.title}"</strong> was rejected by moderator. Reason: ${reason || 'Spam listing or policy violation.'}`
        : `✅ Your listing <strong>"${item.title}"</strong> has been approved and is now live!`;

      await createUserNotification({
        userId: uId,
        title: notifTitle,
        message: notifText,
        text: notifText,
        type: 'admin'
      });
    }

    await logAdminActivity(
      req.user?.id || 'System',
      `${isReject ? 'Rejected' : 'Approved'} listing: "${item.title}" (ID: #${id})`,
      'item',
      item.id,
      req.ip
    );

    return res.json({
      message: `Listing ${isReject ? 'rejected' : 'approved'} successfully!`,
      item
    });
  } catch (err: any) {
    console.error('Error approving/rejecting item:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 1d. POST RESET ANALYTICS
router.post('/reset-analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      await MItem.deleteMany({ id: /^sim-/ });
      await MUser.deleteMany({ id: /^sim-/ });
      await MClaim.deleteMany({ id: /^claim-sim-/ });
      await MSearchLog.deleteMany({ keyword: { $in: ['iPhone', 'Nike', 'JKKNIU', 'Keychain', 'CSE-301', 'Sony', 'iphone', 'nike', 'jkkniu', 'keychain', 'cse-301', 'sony'] } });
    } else {
      const { store, save } = getFallbackData();
      store.items = store.items.filter(i => !String(i.id).startsWith('sim-'));
      store.users = store.users.filter(u => !String(u.id).startsWith('sim-'));
      if (store.claims) {
        store.claims = store.claims.filter(c => !String(c.id).startsWith('claim-sim-'));
      }
      if (store.searchLogs) {
        store.searchLogs = store.searchLogs.filter(s => !['iphone', 'nike', 'jkkniu', 'keychain', 'cse-301', 'sony'].includes(s.keyword.toLowerCase()));
      }
      await save();
    }

    return res.json({ success: true, message: 'Analytics and simulated activities reset successfully.' });
  } catch (err: any) {
    console.error('Error resetting analytics:', err);
    return res.status(500).json({ error: 'Failed to reset analytics: ' + err.message });
  }
});

// 2. GET SEARCH KEYWORDS STATISTICS (FOR REAL-TIME VISUALIZATIONS)
router.get('/search-history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let rawSearchKeywords: any[] = [];
    let items: any[] = [];

    if (isMongoDBActive()) {
      rawSearchKeywords = await MSearchKeyword.find({}).lean();
      items = await MItem.find({ isDeleted: { $ne: true } }).lean();
    } else {
      const { store } = getFallbackData();
      rawSearchKeywords = store.searchKeywords || [];
      items = store.items || [];
    }

    // Map to keep track of combined keywords
    const keywordMap = new Map<string, { keyword: string; count: number; category: string }>();

    // 1. Populate map with real search queries logged by students
    for (const sk of rawSearchKeywords) {
      if (!sk || !sk.keyword) continue;
      const key = String(sk.keyword).trim().toLowerCase();
      if (key) {
        keywordMap.set(key, {
          keyword: String(sk.keyword).trim(),
          count: typeof sk.count === 'number' ? sk.count : 1,
          category: sk.category || 'Other'
        });
      }
    }

    // 2. Scan active user posts (items) and merge real search volume
    for (const item of items) {
      if (!item || !item.title || item.isDeleted || item.status === 'deleted') continue;
      const key = String(item.title).trim().toLowerCase();
      const itemViews = typeof item.views === 'number' ? item.views : 0;

      if (keywordMap.has(key)) {
        const existing = keywordMap.get(key)!;
        existing.count += Math.max(itemViews, 1);
        if (item.category) {
          existing.category = item.category;
        }
      } else if (itemViews > 0) {
        keywordMap.set(key, {
          keyword: String(item.title).trim(),
          count: itemViews,
          category: item.category || 'Other'
        });
      }
    }

    // Sort by count descending and limit to top 20 real keywords
    const sortedKeywords = Array.from(keywordMap.values())
      .filter(k => k.count > 0 && k.keyword.trim().length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return res.json({ searchHistory: sortedKeywords });
  } catch (err: any) {
    console.error('Error fetching search history statistics:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// GET ALL CLAIMS (FOR CLAIMS VALIDATION REGISTRY)
router.get('/claims', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      const claims = await MClaim.find({}).lean();
      const dbItems = await MItem.find({}).lean();
      const dbUsers = await MUser.find({}).lean();
      
      const orphanedClaimIds: any[] = [];
      const claimsWithDetails: any[] = [];

      for (const c of claims) {
        const item: any = dbItems.find(i => String(i.id) === String(c.item_id) || String((i as any)._id) === String(c.item_id));
        const user: any = dbUsers.find(u => String(u.id) === String(c.user_id) || String((u as any)._id) === String(c.user_id));

        // If either item or claimant user no longer exists, or item is permanently deleted/soft deleted
        if (!item || !user || item.isDeleted || item.status === 'deleted') {
          orphanedClaimIds.push(c._id || c.claim_id);
          continue;
        }

        const finder: any = dbUsers.find(u => String(u.id) === String(item.userId || item.user_id));

        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || '',
          created_at: c.created_at || c.createdAt || '',
          item_title: item.title || 'Untitled Item',
          item_type: item.type || 'lost',
          item_status: item.status || 'active',
          item_category: item.category || 'General',
          item_subcategory: item.subcategory || '',
          item_description: item.description || '',
          item_secret_notes: item.secretNotes || item.secret_notes || '',
          item_location: item.location || '',
          item_specific_spot: item.specificSpot || item.specific_spot || '',
          item_reward_offered: item.rewardOffered || item.reward_offered || '',
          item_date: item.date || item.dateFound || item.dateLost || '',
          finder_name: item.reporterName || item.reporter_name || (finder ? (finder.fullName || finder.full_name) : (item.email ? item.email.split('@')[0] : 'Campus Member')),
          finder_email: item.reporterEmail || item.reporter_email || item.email || (finder ? finder.email : ''),
          finder_phone: item.phone || item.reporterPhone || item.reporter_phone || (finder ? finder.phone : ''),
          image_url: item.image || '',
          student_name: user.fullName || user.full_name || 'Verified Student',
          student_id: user.studentId || user.student_id || 'STU-000',
          student_email: user.email || ''
        });
      }

      if (orphanedClaimIds.length > 0) {
        MClaim.deleteMany({ $or: [{ _id: { $in: orphanedClaimIds } }, { claim_id: { $in: orphanedClaimIds } }] }).catch(() => {});
      }

      return res.json({ claims: claimsWithDetails });
    } else {
      const { store, save } = getFallbackData();
      const claims = store.claims || [];
      const validClaims: any[] = [];
      const updatedStoreClaims: any[] = [];

      for (const c of claims) {
        const item: any = (store.items || []).find((i: any) => String(i.id) === String(c.item_id) || String((i as any)._id) === String(c.item_id));
        const user: any = (store.users || []).find((u: any) => String(u.id) === String(c.user_id) || String((u as any)._id) === String(c.user_id));

        // Skip orphaned claims where item or user was removed
        if (!item || !user || item.isDeleted || item.status === 'deleted') {
          continue;
        }

        updatedStoreClaims.push(c);
        const finder: any = (store.users || []).find((u: any) => String(u.id) === String(item.userId || item.user_id));

        validClaims.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || '',
          created_at: c.created_at,
          item_title: item.title || 'Untitled Item',
          item_type: item.type || 'lost',
          item_status: item.status || 'active',
          item_category: item.category || 'General',
          item_subcategory: item.subcategory || '',
          item_description: item.description || '',
          item_secret_notes: item.secretNotes || item.secret_notes || '',
          item_location: item.location || '',
          item_specific_spot: item.specificSpot || item.specific_spot || '',
          item_reward_offered: item.rewardOffered || item.reward_offered || '',
          item_date: item.date || item.dateFound || item.dateLost || '',
          finder_name: item.reporterName || item.reporter_name || (finder ? (finder.fullName || finder.full_name) : (item.email ? item.email.split('@')[0] : 'Campus Member')),
          finder_email: item.reporterEmail || item.reporter_email || item.email || (finder ? finder.email : ''),
          finder_phone: item.phone || item.reporterPhone || item.reporter_phone || (finder ? finder.phone : ''),
          image_url: item.image || '',
          student_name: user.fullName || user.full_name || 'Verified Student',
          student_id: user.studentId || user.student_id || 'STU-000',
          student_email: user.email || ''
        });
      }

      if (updatedStoreClaims.length !== claims.length) {
        store.claims = updatedStoreClaims;
        save();
      }

      return res.json({ claims: validClaims });
    }
  } catch (err: any) {
    console.error('Error fetching admin claims:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ACTION ON CLAIM (APPROVE/REJECT/HANDOVER/RETURNED)
router.post('/claims/:id/action', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, notes } = req.body; // action: 'approve', 'reject', 'handover', 'returned'

  const allowedActions = ['approve', 'reject', 'handover', 'returned'];
  if (!action || !allowedActions.includes(action)) {
    return res.status(400).json({ error: `Please specify a valid action: ${allowedActions.join(', ')}` });
  }

  try {
    const statusVal = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'returned' ? 'completed' : 'approved';
    const nowIso = new Date().toISOString();

    if (isMongoDBActive()) {
      const claim = await MClaim.findOne({ claim_id: String(id) }) as any;
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      claim.status = statusVal;
      claim.admin_notes = notes || '';
      claim.updated_at = nowIso;
      await claim.save();

      const item = await MItem.findOne({ id: String(claim.item_id) });
      const itemTitle = item?.title || 'Item';
      const itemOwnerId = item?.userId || (item as any)?.user_id;
      const claimantId = claim.user_id;

      if (item) {
        if (action === 'approve') {
          item.status = 'handover_pending';
          (item as any).activeClaimId = claim.claim_id;
          (item as any).claimedBy = claimantId;
          await item.save();

          // Notify claimant
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Claim Approved! 🎉',
              message: `Your ownership claim for "${itemTitle}" was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              type: 'claim_approved'
            });
          }
          // Notify finder/poster
          if (itemOwnerId) {
            await createUserNotification({
              userId: itemOwnerId,
              title: 'Claim Verified for Your Post',
              message: `Administrators have verified a claimant for "${itemTitle}". Status is now Handover Pending.`,
              type: 'claim_approved'
            });
          }
        } else if (action === 'reject') {
          // Check if there are any remaining pending claims on this item
          const remainingPending = await MClaim.countDocuments({ item_id: String(claim.item_id), status: 'pending' });
          if (remainingPending === 0 && (item.status === 'under_verification' || item.status === 'claim_requested')) {
            item.status = 'active';
            await item.save();
          }

          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Claim Verification Update',
              message: `Your claim for "${itemTitle}" could not be verified.${notes ? ` Admin Note: ${notes}` : ''}`,
              type: 'claim_rejected'
            });
          }
        } else if (action === 'returned') {
          item.status = 'returned';
          (item as any).returnedAt = new Date();
          await item.save();

          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Item Returned! 🤝',
              message: `"${itemTitle}" has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              type: 'item_returned'
            });
          }
        }
      }

      // Log activity
      await logAdminActivity(
        req.user?.id || 2,
        `Verified claim ${id} as ${statusVal} (Action: ${action}). Notes: ${notes || 'None'}`,
        'CLAIM',
        id
      );

      return res.json({ message: `Claim status updated to ${statusVal} successfully.` });
    } else {
      const { store, save } = getFallbackData();
      const claim = (store.claims || []).find((c: any) => String(c.claim_id) === String(id));
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found.' });
      }

      claim.status = statusVal;
      claim.admin_notes = notes || '';
      claim.updated_at = nowIso;

      const item = store.items.find(i => String(i.id) === String(claim.item_id));
      const itemTitle = item?.title || 'Item';
      const itemOwnerId = item?.userId || (item as any)?.user_id;
      const claimantId = claim.user_id;

      if (item) {
        if (action === 'approve') {
          item.status = 'handover_pending';
          (item as any).activeClaimId = claim.claim_id;
          (item as any).claimedBy = claimantId;

          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Claim Approved! 🎉',
              message: `Your ownership claim for "${itemTitle}" was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              text: `Your ownership claim for <strong>"${itemTitle}"</strong> was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              type: 'claim_approved'
            });
          }
          if (itemOwnerId) {
            await createUserNotification({
              userId: itemOwnerId,
              title: 'Claim Verified for Your Post',
              message: `Administrators have verified a claimant for "${itemTitle}". Status is now Handover Pending.`,
              text: `Administrators have verified a claimant for <strong>"${itemTitle}"</strong>. Status is now Handover Pending.`,
              type: 'claim_approved'
            });
          }
        } else if (action === 'reject') {
          const remainingPending = (store.claims || []).filter((c: any) => String(c.item_id) === String(claim.item_id) && c.status === 'pending' && String(c.claim_id) !== String(id));
          if (remainingPending.length === 0 && (item.status === 'under_verification' || item.status === 'claim_requested')) {
            item.status = 'active';
          }

          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Claim Verification Update',
              message: `Your claim for "${itemTitle}" could not be verified.${notes ? ` Admin Note: ${notes}` : ''}`,
              text: `Your claim for <strong>"${itemTitle}"</strong> could not be verified.${notes ? ` Admin Note: ${notes}` : ''}`,
              type: 'claim_rejected'
            });
          }
        } else if (action === 'returned') {
          item.status = 'returned';
          (item as any).returnedAt = nowIso;

          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: 'Item Returned! 🤝',
              message: `"${itemTitle}" has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              text: `<strong>"${itemTitle}"</strong> has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              type: 'item_returned'
            });
          }
        }
      }

      // Log activity
      await logAdminActivity(
        req.user?.id || 2,
        `Verified claim ${id} as ${statusVal} (Action: ${action}). Notes: ${notes || 'None'}`,
        'CLAIM',
        id
      );

      save();
      return res.json({ message: `Claim status updated to ${statusVal} successfully.` });
    }
  } catch (err: any) {
    console.error('Error updating claim status:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3.4. SOFT DELETE ITEM LISTING (MOVE TO DELETED ARCHIVE)
router.delete('/items/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'system';
  const adminName = req.user?.fullName || req.user?.email || 'Admin';

  try {
    let itemTitle = `Item #${id}`;
    let itemFound = false;

    // 1. Memory Fallback Store
    const { store, save } = getFallbackData();
    const item = (store.items || []).find(i => String(i.id) === String(id) || String((i as any)._id) === String(id));
    if (item) {
      itemTitle = item.title || itemTitle;
      item.isDeleted = true;
      item.status = 'deleted';
      item.deletedAt = new Date().toISOString();
      item.deletedBy = adminName;
      itemFound = true;
    }

    // 2. MongoDB
    if (isMongoDBActive()) {
      const mongoose = await import('mongoose');
      const queryConds: any[] = [{ id: String(id) }];
      if (mongoose.default.Types.ObjectId.isValid(String(id))) {
        queryConds.push({ _id: String(id) });
      }
      const dbItem = await MItem.findOne({ $or: queryConds });
      if (dbItem) {
        itemTitle = dbItem.title || itemTitle;
        dbItem.isDeleted = true;
        dbItem.status = 'deleted';
        (dbItem as any).deletedAt = new Date().toISOString();
        (dbItem as any).deletedBy = adminName;
        await dbItem.save();
        itemFound = true;
      }
    }

    if (!itemFound) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    save();

    await logAdminActivity(
      adminId,
      `Moved Listing to Archive: "${itemTitle}" (ID: ${id})`,
      'Item',
      id,
      req.ip
    );

    return res.json({ message: `Listing "${itemTitle}" moved to deleted archive successfully.` });
  } catch (err: any) {
    console.error('Error moving item to deleted archive:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3.4b. BATCH SOFT DELETE ITEM LISTINGS
router.post('/items/batch-delete', async (req: AuthenticatedRequest, res: Response) => {
  const { itemIds } = req.body;
  const adminId = req.user?.id || 'system';
  const adminName = req.user?.fullName || req.user?.email || 'Admin';

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one item ID to delete.' });
  }

  try {
    const stringIds = itemIds.map(id => String(id));
    const { store, save } = getFallbackData();
    let processedCount = 0;

    // Fallback store
    for (const item of (store.items || [])) {
      if (stringIds.includes(String(item.id)) || stringIds.includes(String((item as any)._id))) {
        item.isDeleted = true;
        item.status = 'deleted';
        item.deletedAt = new Date().toISOString();
        item.deletedBy = adminName;
        processedCount++;
      }
    }

    // MongoDB
    if (isMongoDBActive()) {
      const mongoose = await import('mongoose');
      const validObjectIds = stringIds.filter(id => mongoose.default.Types.ObjectId.isValid(id));
      await MItem.updateMany(
        {
          $or: [
            { id: { $in: stringIds } },
            ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : [])
          ]
        },
        {
          $set: {
            isDeleted: true,
            status: 'deleted',
            deletedAt: new Date().toISOString(),
            deletedBy: adminName
          }
        }
      );
    }

    save();

    await logAdminActivity(
      adminId,
      `Batch moved ${stringIds.length} listings to deleted archive`,
      'Item',
      stringIds.join(','),
      req.ip
    );

    return res.json({
      message: `Successfully moved ${stringIds.length} listings to deleted archive.`,
      count: stringIds.length
    });
  } catch (err: any) {
    console.error('Error in batch delete items:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3.4c. BATCH PERMANENT DELETE ITEM LISTINGS (ADMIN ONLY)
router.post('/items/batch-permanent-delete', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { itemIds } = req.body;
  const adminId = req.user?.id || 'system';

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one item ID to permanently delete.' });
  }

  try {
    const stringIds = itemIds.map(id => String(id));
    const { store, save } = getFallbackData();

    // 1. Fallback Store
    store.items = (store.items || []).filter(i => !stringIds.includes(String(i.id)) && !stringIds.includes(String((i as any)._id)));
    store.claims = (store.claims || []).filter(c => !stringIds.includes(String(c.itemId || c.item_id || '')));

    // 2. MongoDB
    if (isMongoDBActive()) {
      const mongoose = await import('mongoose');
      const validObjectIds = stringIds.filter(id => mongoose.default.Types.ObjectId.isValid(id));
      const matchCond = {
        $or: [
          { id: { $in: stringIds } },
          ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : [])
        ]
      };
      await MItem.deleteMany(matchCond);
      await MClaim.deleteMany({
        $or: [
          { itemId: { $in: stringIds } },
          { item_id: { $in: stringIds } }
        ]
      });
    }

    save();

    await logAdminActivity(
      adminId,
      `Batch permanently deleted ${stringIds.length} listings from database`,
      'Item',
      stringIds.join(','),
      req.ip
    );

    return res.json({
      message: `Successfully permanently deleted ${stringIds.length} listings.`,
      count: stringIds.length
    });
  } catch (err: any) {
    console.error('Error in batch permanent delete items:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3.5. PERMANENTLY DELETE ITEM LISTING (ADMIN ONLY)
router.delete('/items/:id/permanent', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'system';
  const adminName = req.user?.fullName || 'Admin';

  try {
    let itemTitle = `Item #${id}`;
    let itemExists = false;

    // 1. Memory Fallback Store
    const { store, save } = getFallbackData();
    const itemIndex = store.items.findIndex(i => String(i.id) === String(id));
    if (itemIndex !== -1) {
      itemTitle = store.items[itemIndex].title || itemTitle;
      store.items.splice(itemIndex, 1);
      itemExists = true;
    }

    // Clean up claims in fallback store
    store.claims = store.claims.filter(c => String(c.itemId || c.item_id || '') !== String(id));

    // 2. MongoDB
    if (isMongoDBActive()) {
      const mongoose = await import('mongoose');
      const queryConds: any[] = [{ id: String(id) }];
      if (mongoose.default.Types.ObjectId.isValid(String(id))) {
        queryConds.push({ _id: String(id) });
      }
      const dbItem = await MItem.findOne({ $or: queryConds });
      if (dbItem) {
        itemTitle = dbItem.title || itemTitle;
        await MItem.deleteMany({ $or: queryConds });
        itemExists = true;
      }
      await MClaim.deleteMany({ $or: [{ itemId: String(id) }, { item_id: String(id) }] });
    }

    if (!itemExists) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    save();

    // Log this severe activity
    await logAdminActivity(
      adminId,
      `Permanently Deleted Listing: "${itemTitle}" (ID: ${id})`,
      'Item',
      id,
      req.ip
    );

    return res.json({ message: 'Listing permanently deleted from the database.' });
  } catch (err: any) {
    console.error('Error permanently deleting listing:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// --- ADMIN NOTIFICATIONS ---

// 4. GET ALL ADMIN NOTIFICATIONS
router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, q } = req.query;

    if (isMongoDBActive()) {
      let filter: any = {};
      if (category && category !== 'All') {
        filter.category = category;
      }
      if (q) {
        const regex = new RegExp(String(q), 'i');
        filter.$or = [
          { title: regex },
          { message: regex }
        ];
      }
      const dbNotifs = await MAdminNotification.find(filter).sort({ createdAt: -1 }).lean();
      const mapped = dbNotifs
        .filter((n: any) => n.title || n.message || n.text)
        .map((n: any) => ({
          id: String(n.id || n._id),
          title: n.title || (n.text ? n.text.replace(/<[^>]*>?/gm, '').split(':')[0] : 'Campus Activity Alert'),
          message: n.message || (n.text ? n.text.replace(/<[^>]*>?/gm, '') : 'New moderation or activity update.'),
          type: n.type || 'system',
          category: n.category || 'System',
          priority: n.priority || 'medium',
          isRead: n.isRead === true || n.isRead === 1,
          relatedUserId: n.relatedUserId ? String(n.relatedUserId) : '',
          relatedItemId: n.relatedItemId ? String(n.relatedItemId) : '',
          relatedConversationId: n.relatedConversationId ? String(n.relatedConversationId) : '',
          createdAt: n.createdAt || new Date().toISOString()
        }));
      return res.json({ notifications: mapped });
    } else {
      const { store } = getFallbackData();
      if (!store.admin_notifications) store.admin_notifications = [];
      let list = store.admin_notifications
        .filter((n: any) => n.title || n.message || n.text)
        .map((n: any) => ({
          id: String(n.id || n._id),
          title: n.title || (n.text ? n.text.replace(/<[^>]*>?/gm, '').split(':')[0] : 'Campus Activity Alert'),
          message: n.message || (n.text ? n.text.replace(/<[^>]*>?/gm, '') : 'New moderation or activity update.'),
          type: n.type || 'system',
          category: n.category || 'System',
          priority: n.priority || 'medium',
          isRead: n.isRead === true || n.isRead === 1,
          relatedUserId: n.relatedUserId ? String(n.relatedUserId) : '',
          relatedItemId: n.relatedItemId ? String(n.relatedItemId) : '',
          relatedConversationId: n.relatedConversationId ? String(n.relatedConversationId) : '',
          createdAt: n.createdAt || n.created_at || new Date().toISOString()
        }));

      if (category && category !== 'All') {
        list = list.filter(n => n.category === category);
      }
      if (q) {
        const queryStr = String(q).toLowerCase();
        list = list.filter(n => 
          n.title.toLowerCase().includes(queryStr) || 
          n.message.toLowerCase().includes(queryStr)
        );
      }

      return res.json({ notifications: list });
    }
  } catch (err: any) {
    console.error('Error fetching admin notifications:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 5. MARK ADMIN NOTIFICATION AS READ
router.put('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const idStr = String(id).trim();
  try {
    if (isMongoDBActive()) {
      let conditions: any[] = [{ id: idStr }];
      if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          conditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
        } catch (e) {}
        conditions.push({ _id: idStr });
      }
      await MAdminNotification.updateMany({ $or: conditions }, { isRead: true });
    }
    
    const { store, save } = getFallbackData();
    const matches = store.admin_notifications?.filter(n => String(n.id) === idStr || String((n as any)._id) === idStr);
    if (matches && matches.length > 0) {
      matches.forEach(n => {
        n.isRead = true;
        (n as any).unread = false;
      });
      save();
    }

    try {
      const { setFirestoreDocument, getFirestoreDB } = await import('../db/firestore');
      if (getFirestoreDB()) {
        const found = matches?.[0] || { id: idStr, isRead: true };
        await setFirestoreDocument('admin_notifications', idStr, { ...found, isRead: true });
      }
    } catch (fsErr) {}

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    console.error('Error updating notification read state:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 6. MARK ALL ADMIN NOTIFICATIONS AS READ
router.put('/notifications/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      await MAdminNotification.updateMany({}, { isRead: true });
    }
    const { store, save } = getFallbackData();
    if (store.admin_notifications) {
      store.admin_notifications.forEach(n => { 
        n.isRead = true; 
        (n as any).unread = false;
      });
      save();
    }
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    console.error('Error reading all notifications:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 7. DELETE ADMIN NOTIFICATION
router.delete('/notifications/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const idStr = String(id).trim();
  try {
    if (isMongoDBActive()) {
      let conditions: any[] = [{ id: idStr }];
      if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          conditions.push({ _id: new mongoose.Types.ObjectId(idStr) });
        } catch (e) {}
        conditions.push({ _id: idStr });
      }
      await MAdminNotification.deleteMany({ $or: conditions });
    }
    const { store, save } = getFallbackData();
    if (store.admin_notifications) {
      store.admin_notifications = store.admin_notifications.filter(n => String(n.id) !== idStr && String((n as any)._id) !== idStr);
      save();
    }
    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (err: any) {
    console.error('Error deleting admin notification:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});


// --- CONVERSATION REPORTS & MODERATION ---

// 8. GET CONVERSATION REPORTS
router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      const dbReports = await MConversationReport.find().sort({ createdAt: -1 }).lean();
      const mapped = dbReports.map((r: any) => ({
        reportId: r.reportId,
        conversationId: r.conversationId,
        reportedBy: r.reportedBy,
        reportedByName: r.reportedByName || 'Deleted User',
        reportedUser: r.reportedUser,
        reportedUserName: r.reportedUserName || 'Deleted User',
        reason: r.reason,
        description: r.description,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt
      }));
      return res.json({ reports: mapped });
    }

    
      const { store } = getFallbackData();
      return res.json({ reports: store.conversation_reports || [] });
    
  } catch (err: any) {
    console.error('Error getting reports:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 9. GET REPORTED CONVERSATION MESSAGES (PRIVACY-FORCED PROTECTION)
// ONLY allows access if the thread status is under_review or active reports exist
router.get('/reports/:reportId/messages', async (req: AuthenticatedRequest, res: Response) => {
  const { reportId } = req.params;
  const adminId = req.user?.id || 2;

  try {
    
      const { store } = getFallbackData();
      const report = store.conversation_reports?.find(r => String(r.reportId) === String(reportId));
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }

      // Find the thread
      const thread = store.threads.find(t => String(t.id) === String(report.conversationId));
      if (!thread) {
        return res.status(404).json({ error: 'Conversation thread not found.' });
      }

      // Privacy Check: Is it under review or explicitly authorized?
      if ((thread as any).status !== 'under_review' && report.status !== 'under_review' && report.status !== 'pending') {
        return res.status(403).json({ error: 'Access Denied: Conversation content is private by default. Access is restricted unless under active review.' });
      }

      // Log the review access
      await logAdminActivity(
        adminId,
        `Accessed and reviewed messages for conversation thread #${thread.id} via report #${reportId}`,
        'conversation_report',
        reportId,
        req.ip
      );

      return res.json({ messages: thread.messages, thread });
    
  } catch (err: any) {
    console.error('Error fetching reported messages:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 10a. MARK ALL CONVERSATION REPORTS AS REVIEWED / UNDER REVIEW
router.put('/reports/mark-all-reviewed', async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || 'Admin';

  try {
    const { store, save } = getFallbackData();
    if (store.conversation_reports) {
      store.conversation_reports.forEach((r: any) => {
        if (r.status === 'pending') {
          r.status = 'under_review';
          r.reviewedBy = adminId;
          r.reviewedByName = adminName;
          r.reviewedAt = new Date().toISOString();
        }
      });
      save();
    }

    if (isMongoDBActive()) {
      await MConversationReport.updateMany(
        { status: 'pending' },
        { 
          status: 'under_review', 
          reviewedBy: adminId, 
          reviewedByName: adminName, 
          reviewedAt: new Date().toISOString() 
        }
      ).catch(mErr => console.warn('Mongo updateMany reports error:', mErr));
    }

    await logAdminActivity(
      adminId,
      `Marked all pending conversation reports as reviewed`,
      'conversation_report',
      'all',
      req.ip
    );

    return res.json({ success: true, message: 'All pending conversation reports have been marked as under review.' });
  } catch (err: any) {
    console.error('Error marking all reports as reviewed:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 10. RESOLVE / CLOSE CONVERSATION REPORT
router.put('/reports/:reportId/status', async (req: AuthenticatedRequest, res: Response) => {
  const { reportId } = req.params;
  const { status } = req.body; // 'pending', 'under_review', 'resolved', 'dismissed'
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || 'Admin';

  if (!status || !['pending', 'under_review', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Please provide a valid status: pending, under_review, resolved or dismissed' });
  }

  try {
    
      const { store, save } = getFallbackData();
      const report = store.conversation_reports?.find(r => String(r.reportId) === String(reportId));
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }

      report.status = status;
      report.reviewedBy = adminId;
      report.reviewedByName = adminName;
      report.reviewedAt = new Date().toISOString();

      // If resolved or dismissed, we can reset thread status back to 'active' and send a system message
      if (status === 'resolved' || status === 'dismissed') {
        const thread = store.threads.find(t => String(t.id) === String(report.conversationId));
        if (thread) {
          (thread as any).status = 'active';
          (thread as any).reportStatus = status;

          // Add system message
          thread.messages.push({
            id: `msg-sys-${Date.now()}`,
            senderId: String(adminId),
            senderName: 'System Moderator',
            senderInitials: 'SM',
            text: `⚠️ [System Notification]: The report regarding this conversation has been marked as "${status.toUpperCase()}" by our administration. The chat is fully active and open.`,
            time: 'Just now'
          });
        }
      } else if (status === 'under_review') {
        const thread = store.threads.find(t => String(t.id) === String(report.conversationId));
        if (thread) {
          (thread as any).status = 'under_review';
          (thread as any).reportStatus = 'under_review';
        }
      }

      save();

      if (isMongoDBActive()) {
        await MConversationReport.findOneAndUpdate(
          { reportId },
          { 
            status, 
            reviewedBy: adminId, 
            reviewedByName: adminName, 
            reviewedAt: new Date().toISOString() 
          }
        ).catch(mErr => console.warn('Mongo update report status error:', mErr));
      }

      // Log activity
      await logAdminActivity(
        adminId,
        `Updated report #${reportId} status to '${status}'`,
        'conversation_report',
        reportId,
        req.ip
      );

      return res.json({ message: `Report status successfully updated to ${status}.`, report });
    
  } catch (err: any) {
    console.error('Error updating report status:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 10b. LOG TRANSCRIPT REVEAL INTENT
router.post('/reports/:reportId/log-reveal', async (req: AuthenticatedRequest, res: Response) => {
  const { reportId } = req.params;
  const adminId = req.user?.id || 2;

  try {
    
      const { store, save } = getFallbackData();
      const report = store.conversation_reports?.find(r => String(r.reportId) === String(reportId));
      if (!report) {
        return res.status(404).json({ error: 'Report not found.' });
      }

      await logAdminActivity(
        adminId,
        `REVEALED and inspected reported chat transcript for conversation #${report.conversationId} (Report #${reportId})`,
        'conversation_report',
        reportId,
        req.ip
      );
      return res.json({ success: true });
    
  } catch (err: any) {
    console.error('Error logging transcript reveal:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 11. MODERATION: WARN OR SUSPEND USER ACCOUNT
router.post('/moderation/user-action', async (req: AuthenticatedRequest, res: Response) => {
  const { targetUserId, action, reason } = req.body; // action: 'warn', 'suspend', 'reactivate', 'delete', 'ban', 'unban', 'lock', 'unlock'
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || 'Admin';
  const callerRole = req.user?.role || 'student';

  const validActions = ['warn', 'suspend', 'reactivate', 'delete', 'ban', 'unban', 'lock', 'unlock'];
  if (!targetUserId || !action || !validActions.includes(action)) {
    return res.status(400).json({ error: 'Missing targetUserId, or invalid action parameter.' });
  }

  try {
    const { store, save } = getFallbackData();
    let userDetails = { fullName: 'User', email: '', role: 'student' };

    // 1. Fetch user detail & perform permission validations
    if (isMongoDBActive()) {
      const u = await MUser.findOne({ id: String(targetUserId) });
      if (u) {
        userDetails.fullName = u.fullName || u.full_name || 'User';
        userDetails.email = u.email;
        userDetails.role = u.role || 'student';
      }
    } else {
      const u = store.users.find(usr => String(usr.id) === String(targetUserId));
      if (u) {
        userDetails.fullName = u.fullName || u.full_name || 'User';
        userDetails.email = u.email;
        userDetails.role = u.role || 'student';
      }
    }

    // Role Validation A: Preventing self deletion/moderation
    const isSelfTarget = String(targetUserId) === String(req.user?.id) || 
      (userDetails.email && req.user?.email && userDetails.email.toLowerCase() === req.user.email.toLowerCase());
    
    if (isSelfTarget) {
      return res.status(400).json({ error: 'Security Constraint: You cannot execute moderation actions (warning, suspension, lock, ban, or deletion) on your own active account.' });
    }

    // Role Validation B: Prevents moderation actions on Administrator accounts
    if (userDetails.role === 'admin' || userDetails.email === 'nazrulretrievers@gmail.com' || String(targetUserId) === '2') {
      return res.status(403).json({ error: 'Security Constraint: Administrator and root accounts are protected and cannot be moderated or suspended from the registry.' });
    }

    // Role Validation C: Prevents Moderator modifying/deleting Admin or other Moderators
    if (callerRole === 'moderator' && (userDetails.role === 'admin' || userDetails.role === 'moderator' || userDetails.role === 'coordinator')) {
      return res.status(403).json({ error: 'Permission Denied: Moderators cannot moderate Administrators or other Coordinators.' });
    }

    // Role Validation D: Prevents Admin deleting the LAST Admin
    if (action === 'delete' && userDetails.role === 'admin') {
      let adminCount = 0;
      if (isMongoDBActive()) {
        adminCount = await MUser.countDocuments({ role: 'admin' });
      } else {
        adminCount = store.users.filter((u: any) => u.role === 'admin').length;
      }
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Security Constraint: You cannot delete the last Admin of this platform.' });
      }
    }

    // 2. Map actions to statuses
    let newStatus = 'Active';
    let isSuspended = false;
    let shouldUpdateStatus = true;

    if (action === 'suspend') {
      newStatus = 'suspended';
      isSuspended = true;
    } else if (action === 'ban') {
      newStatus = 'banned';
      isSuspended = true;
    } else if (action === 'lock') {
      newStatus = 'locked';
      isSuspended = true;
    } else if (action === 'reactivate' || action === 'unsuspend' || action === 'unban' || action === 'unlock') {
      newStatus = 'Active';
      isSuspended = false;
    } else if (action === 'warn') {
      shouldUpdateStatus = false;
    }

    // 3. Apply updates
    if (action === 'delete') {
      if (callerRole !== 'admin') {
        return res.status(403).json({ error: 'Permission Denied: Moderators are not permitted to permanently delete user accounts.' });
      }
      // Execute the cascaded deletion across all MongoDB collections and local storage files
      await performCascadeDeleteUser(targetUserId);
    } else {
      // Apply status update in MongoDB
      if (isMongoDBActive()) {
        const u = await MUser.findOne({ id: String(targetUserId) });
        if (u) {
          if (shouldUpdateStatus) {
            u.status = newStatus;
            u.accountStatus = newStatus;
          }
          await u.save();
        }
      }

      // Apply status update in Memory Cache
      const user = store.users.find(u => String(u.id) === String(targetUserId));
      if (user) {
        if (shouldUpdateStatus) {
          user.is_suspended = isSuspended;
          user.status = newStatus;
          user.accountStatus = newStatus;
        }

        const notifText = action === 'warn'
          ? `🛡️ <strong>Security Warning:</strong> You have received a formal warning. Action: WARNING. Reason: ${reason || 'Campus policy review'}.`
          : `🛡️ <strong>Security Alert:</strong> Your account status has been set to <strong>${newStatus.toUpperCase()}</strong>. Action: ${action.toUpperCase()}. Reason: ${reason || 'Policy review'}.`;

        // Create a direct user notification alerting them of the action
        await createUserNotification({
          userId: targetUserId,
          title: action === 'warn' ? 'Security Warning' : 'Security Alert',
          message: notifText,
          text: notifText,
          type: 'moderation'
        });
      }
    }

    // 4. Log the administrative/moderation action
    await logAdminActivity(
      adminId,
      `Moderation Action: '${action}' applied to user ${userDetails.fullName} (${userDetails.email}). Reason: ${reason || 'None provided'}`,
      'user',
      targetUserId,
      req.ip
    );

    // 5. Create an Admin Notification alerting other staffs
    await createAdminNotification({
      title: `🛡️ User Account Action: ${action.toUpperCase()}`,
      message: `${adminName} applied action '${action}' to user ${userDetails.fullName}. Reason: ${reason || 'Standard audit'}.`,
      type: `user_${action}`,
      category: 'User',
      priority: 'high',
      relatedUserId: targetUserId
    });

    return res.json({ message: `Successfully applied '${action}' action to user account.` });
  } catch (err: any) {
    console.error('Error applying moderation action:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 12. GET ADMIN ACTIVITY AUDIT LOGS
router.get('/activity-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, q } = req.query;
    let rawLogs: any[] = [];
    let usersList: any[] = [];

    // 1. Fetch raw logs and users based on active DB
    if (isMongoDBActive()) {
      rawLogs = await MAdminActivityLog.find().lean();
      usersList = await MUser.find({}).lean();
    } else {
      const { store } = getFallbackData();
      rawLogs = store.admin_activity_logs || [];
      usersList = store.users || [];
    }

    // Create user lookup map
    const userMap = new Map<string, any>();
    for (const u of usersList) {
      const uId = String(u.id || u._id || u.user_id || '');
      if (uId) {
        userMap.set(uId, u);
      }
    }

    // 2. Map and enrich the log entries
    let enrichedLogs = rawLogs.map((log: any, idx: number) => {
      const adminIdStr = String(log.adminId || '');
      const adminUser = userMap.get(adminIdStr);
      
      let adminName = 'System Administrator';
      if (adminUser) {
        adminName = adminUser.fullName || adminUser.full_name || adminUser.displayName || adminUser.email || 'Admin';
      } else if (adminIdStr === '2' || adminIdStr === 'admin') {
        adminName = 'Main Administrator';
      }

      const descriptionText = log.description || log.action || 'Administrative action performed';
      
      // Determine appropriate short category key for the frontend badges
      let actionCategory = 'system_config';
      const descLower = descriptionText.toLowerCase();
      if (descLower.includes('warn')) {
        actionCategory = 'user_warned';
      } else if (descLower.includes('suspend') || descLower.includes('ban')) {
        actionCategory = 'user_suspended';
      } else if (descLower.includes('reactivate') || descLower.includes('unsuspend') || descLower.includes('unban') || descLower.includes('unlock')) {
        actionCategory = 'user_activated';
      } else if (descLower.includes('approved') || descLower.includes('approve')) {
        actionCategory = 'item_approved';
      } else if (descLower.includes('rejected') || descLower.includes('reject')) {
        actionCategory = 'item_rejected';
      } else if (descLower.includes('resolved') || descLower.includes('resolve') || descLower.includes('dispute') || descLower.includes('reviewed')) {
        actionCategory = 'report_resolved';
      }

      return {
        id: log.id || `aal-${log._id || idx}`,
        logId: log.id ? String(log.id).replace('aal-', '') : String(idx),
        adminId: log.adminId,
        adminName,
        targetId: log.targetId,
        targetType: log.targetType,
        action: actionCategory,
        description: descriptionText,
        ipAddress: log.ipAddress || '',
        createdAt: log.createdAt || log.created_at || new Date().toISOString()
      };
    });

    // 3. Filter by Action Category if specified (excluding 'All')
    if (action && typeof action === 'string' && action !== 'All') {
      enrichedLogs = enrichedLogs.filter(log => log.action === action);
    }

    // 4. Filter by text search query if specified
    if (q && typeof q === 'string' && q.trim()) {
      const queryLower = q.toLowerCase().trim();
      enrichedLogs = enrichedLogs.filter(log => 
        log.description.toLowerCase().includes(queryLower) ||
        log.adminName.toLowerCase().includes(queryLower) ||
        String(log.logId).toLowerCase().includes(queryLower)
      );
    }

    // 5. Sort by timestamp descending (newest first)
    enrichedLogs.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return res.json({ logs: enrichedLogs });

  } catch (err: any) {
    console.error('Error getting activity logs:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 12.5. CLEAR ALL ADMIN ACTIVITY LOGS (Admins Only)
router.delete(['/activity-logs', '/activity-logs/clear'], authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      await MAdminActivityLog.deleteMany({});
    }
    const { store, save } = getFallbackData();
    store.admin_activity_logs = [];
    save();

    return res.json({ success: true, message: 'All previous admin activity logs have been cleared successfully.' });
  } catch (err: any) {
    console.error('Error clearing activity logs:', err);
    return res.status(500).json({ error: 'Failed to clear activity logs: ' + err.message });
  }
});

// --- MODERATOR MANAGEMENT ROUTES (Admins Only) ---

// 1. Get all students/users (to select and promote or manage in registry)
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roleFilter = req.query.role ? String(req.query.role).toLowerCase().trim() : 'all';

    let allUsers: any[] = [];
    if (isMongoDBActive()) {
      const dbUsers = await MUser.find({
        fullName: { $ne: 'Verified Student' },
        $and: [
          {
            $or: [
              { role: { $in: ['admin', 'moderator', 'coordinator'] } },
              { emailVerified: true },
              { email_verified: true },
              { registrationCompleted: true }
            ]
          },
          { status: { $nin: ['Pending', 'pending'] } },
          { accountStatus: { $nin: ['Pending', 'pending'] } }
        ]
      }).lean();
      allUsers = dbUsers.filter(isRegisteredAndVerifiedUser);
    } else {
      const { store } = getFallbackData();
      const rawUsers = store.users || [];
      allUsers = rawUsers.filter(isRegisteredAndVerifiedUser);
    }

    // Role-specific filtering if requested via query param
    let filtered = allUsers;
    if (roleFilter === 'student') {
      filtered = allUsers.filter(u => u.role === 'student' || !u.role || u.role === '');
    } else if (roleFilter === 'moderator' || roleFilter === 'coordinator') {
      filtered = allUsers.filter(u => u.role === 'moderator' || u.role === 'coordinator');
    } else if (roleFilter === 'admin') {
      filtered = allUsers.filter(u => u.role === 'admin');
    } else if (roleFilter === 'verified') {
      filtered = allUsers.filter(u => {
        const isStaff = u.role === 'admin' || u.role === 'moderator' || u.role === 'coordinator' || String(u.email || '').toLowerCase() === 'nazrulretrievers@gmail.com';
        return !isStaff && (u.isVerified || u.is_verified || u.idVerificationStatus === 'verified');
      });
    }

    const formatted = filtered.map((rawU: any) => {
      const u = syncAndEvaluateUser(rawU, allUsers);
      return {
        id: String(u.id || u.user_id || u._id || ''),
        user_id: String(u.id || u.user_id || u._id || ''),
        student_id: u.studentId || u.student_id || u.rollNumber || '',
        studentId: u.studentId || u.student_id || u.rollNumber || '',
        rollNumber: u.rollNumber || u.classRoll || u.roll || '',
        full_name: u.fullName || u.full_name || 'User',
        fullName: u.fullName || u.full_name || 'User',
        email: u.email || '',
        department: u.department || 'Not Specified',
        faculty: u.faculty || '',
        role: u.role || 'student',
        phone: u.phone || '',
        session_year: u.academicSession || u.session_year || u.sessionYear || '',
        sessionYear: u.academicSession || u.session_year || u.sessionYear || '',
        is_verified: !!(u.isVerified || u.is_verified || u.idVerificationStatus === 'verified'),
        isVerified: !!(u.isVerified || u.is_verified || u.idVerificationStatus === 'verified'),
        idVerificationStatus: u.idVerificationStatus || (u.isVerified || u.is_verified ? 'verified' : 'unverified'),
        idVerificationRemarks: u.idVerificationRemarks || '',
        idVerificationSubmittedAt: u.idVerificationSubmittedAt || '',
        verificationDocument: u.verificationDocument || '',
        avatar: u.profilePhoto || u.avatar || '',
        profilePhoto: u.profilePhoto || u.avatar || '',
        status: u.status || u.accountStatus || 'Active',
        accountStatus: u.accountStatus || u.status || 'Active',
        isSuspended: !!(u.isSuspended || u.is_suspended || String(u.status || '').toLowerCase() === 'suspended' || String(u.accountStatus || '').toLowerCase() === 'suspended' || String(u.status || '').toLowerCase() === 'locked'),
        isBanned: !!(u.isBanned || u.banned || String(u.status || '').toLowerCase() === 'banned' || String(u.accountStatus || '').toLowerCase() === 'banned'),
        isFlagged: !!(u.isFlagged || u.flagged || String(u.status || '').toLowerCase() === 'flagged' || (u.warningCount && u.warningCount > 0)),
        warningCount: u.warningCount || 0,
        gender: u.gender || '',
        dateOfBirth: u.dateOfBirth || '',
        bloodGroup: u.bloodGroup || '',
        address: u.address || '',
        emergencyContact: u.emergencyContact || '',
        emergencyContactName: u.emergencyContactName || '',
        residentialHall: u.residentialHall || '',
        facebook: u.facebook || '',
        linkedin: u.linkedin || '',
        bio: u.bio || '',
        totalLostPosts: u.totalLostPosts || 0,
        totalFoundPosts: u.totalFoundPosts || 0,
        successfulReturns: u.successfulReturns || 0,
        reputationScore: u.reputationScore !== undefined ? u.reputationScore : 100,
        emailVerified: !!(u.emailVerified || u.email_verified),
        lastLogin: u.lastLogin || u.last_login || '',
        createdAt: u.createdAt || ''
      };
    });

    return res.json({ users: formatted });
  } catch (err: any) {
    console.error('Error fetching registry users:', err);
    return res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// 1b. GET ALL PENDING OR SUBMITTED INSTITUTIONAL ID VERIFICATIONS
router.get('/verifications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dbUsers = await getAllUsersList();

    const isStaffOrAdmin = (u: any) => {
      const role = String(u.role || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return role === 'admin' || role === 'moderator' || role === 'coordinator' || email === 'nazrulretrievers@gmail.com';
    };

    // Return regular student users who have submitted an ID verification document or have a verification status
    const verifications = dbUsers.filter((u: any) => {
      if (isStaffOrAdmin(u)) return false;
      const hasDoc = !!u.verificationDocument && String(u.verificationDocument).trim() !== '';
      const hasStatus = u.idVerificationStatus === 'pending' || u.idVerificationStatus === 'verified' || u.idVerificationStatus === 'rejected';
      return hasDoc || hasStatus;
    });

    const formatted = verifications.map((rawU: any) => {
      const u = syncAndEvaluateUser(rawU, dbUsers);
      const isApprovedVerified = u.idVerificationStatus === 'verified';
      let status = u.idVerificationStatus;
      if (!status || status === 'unverified') {
        status = u.verificationDocument ? 'pending' : 'unverified';
      }

      return {
        id: String(u.id || u.user_id || u._id || ''),
        user_id: String(u.id || u.user_id || u._id || ''),
        studentId: u.studentId || u.student_id || u.rollNumber || '',
        student_id: u.studentId || u.student_id || u.rollNumber || '',
        rollNumber: u.rollNumber || u.classRoll || u.roll || '',
        fullName: u.fullName || u.full_name || 'User',
        full_name: u.fullName || u.full_name || 'User',
        email: u.email || '',
        department: u.department || 'Not Specified',
        role: u.role || 'student',
        phone: u.phone || '',
        academicSession: u.academicSession || u.session_year || u.sessionYear || '',
        sessionYear: u.academicSession || u.session_year || u.sessionYear || '',
        isVerified: isApprovedVerified,
        is_verified: isApprovedVerified,
        idVerificationStatus: status,
        idVerificationRemarks: u.idVerificationRemarks || '',
        idVerificationSubmittedAt: u.idVerificationSubmittedAt || u.createdAt || '',
        verificationDocument: u.verificationDocument || '',
        avatar: u.profilePhoto || u.avatar || '',
        profilePhoto: u.profilePhoto || u.avatar || ''
      };
    });
    return res.json({ verifications: formatted });
  } catch (err: any) {
    console.error('Error fetching verifications:', err);
    return res.status(500).json({ error: 'Failed to fetch verifications: ' + err.message });
  }
});

// 1c. APPROVE STUDENT ID VERIFICATION
router.post('/verifications/:userId/approve', async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { remarks } = req.body;
  const adminName = req.user?.fullName || req.user?.email || 'admin';
  const adminId = req.user?.id || 'System';

  try {
    const allUsers = await getAllUsersList();
    const targetUser = allUsers.find((u: any) => 
      String(u.id || '') === String(userId) ||
      String(u.user_id || '') === String(userId) ||
      String(u._id || '') === String(userId) ||
      String(u.firebaseUid || '') === String(userId)
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    targetUser.idVerificationStatus = 'verified';
    targetUser.verified = true;
    targetUser.isVerified = true;
    targetUser.is_verified = true;
    targetUser.verifiedAt = new Date().toISOString();
    targetUser.verificationSource = 'administrator';
    targetUser.idVerificationRemarks = remarks || 'Approved';

    const savedUser = await saveOrUpdateUser(targetUser);

    // Push notification to user
    await createUserNotification({
      userId: savedUser.id,
      title: 'Institutional Verification Approved',
      message: `Your student ID has been approved by ${adminName}. You are now verified!`,
      text: `🛡️ <strong>Institutional Verification:</strong> Your student ID has been approved by <strong>${adminName}</strong>. You are now verified!`,
      type: 'verification_approved'
    });

    await logAdminActivity(
      adminId,
      `Approved student ID verification for: ${savedUser.fullName} (${savedUser.email})`,
      'user',
      savedUser.id,
      req.ip
    );

    return res.json({ message: 'User verification approved successfully!', user: savedUser });
  } catch (err: any) {
    console.error('Error approving verification:', err);
    return res.status(500).json({ error: 'Failed to approve: ' + err.message });
  }
});

// 1d. REJECT STUDENT ID VERIFICATION
router.post('/verifications/:userId/reject', async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { remarks } = req.body;
  const adminName = req.user?.fullName || req.user?.email || 'admin';
  const adminId = req.user?.id || 'System';

  try {
    const allUsers = await getAllUsersList();
    const targetUser = allUsers.find((u: any) => 
      String(u.id || '') === String(userId) ||
      String(u.user_id || '') === String(userId) ||
      String(u._id || '') === String(userId) ||
      String(u.firebaseUid || '') === String(userId)
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    targetUser.idVerificationStatus = 'rejected';
    targetUser.verified = false;
    targetUser.isVerified = false;
    targetUser.is_verified = false;
    targetUser.verifiedAt = null;
    targetUser.verificationSource = null;
    targetUser.idVerificationRemarks = remarks || 'Rejected';

    const savedUser = await saveOrUpdateUser(targetUser);

    // Push notification to user
    await createUserNotification({
      userId: savedUser.id,
      title: 'Institutional Verification Rejected',
      message: `Your student ID was not approved. Reason: ${remarks || 'No explanation provided.'}`,
      text: `❌ <strong>Institutional Verification Rejected:</strong> Your student ID was not approved. Reason: ${remarks || 'No explanation provided.'}`,
      type: 'verification_rejected'
    });

    await logAdminActivity(
      adminId,
      `Rejected student ID verification for: ${savedUser.fullName} (${savedUser.email})`,
      'user',
      savedUser.id,
      req.ip
    );

    return res.json({ message: 'User verification rejected successfully!', user: savedUser });
  } catch (err: any) {
    console.error('Error rejecting verification:', err);
    return res.status(500).json({ error: 'Failed to reject: ' + err.message });
  }
});

// 2. Get all moderators
router.get('/moderators', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isMongoDBActive()) {
      const dbUsers = await MUser.find({ role: 'moderator' }).lean();
      const formatted = dbUsers.map((u: any) => {
        return {
          id: String(u.id || u._id),
          student_id: u.studentId || u.student_id,
          studentId: u.studentId || u.student_id,
          rollNumber: u.rollNumber || u.classRoll || u.roll,
          full_name: u.fullName || u.full_name,
          fullName: u.fullName || u.full_name,
          email: u.email,
          department: u.department,
          role: u.role || 'moderator',
          phone: u.phone,
          session_year: u.academicSession || u.session_year || u.sessionYear || 'Staff',
          sessionYear: u.academicSession || u.session_year || u.sessionYear || 'Staff',
          is_verified: !!u.isVerified,
          isVerified: !!u.isVerified,
          idVerificationStatus: u.idVerificationStatus || 'unverified',
          avatar: u.profilePhoto || u.avatar || (u.fullName || u.full_name || 'M').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
          profilePhoto: u.profilePhoto || u.avatar,
          status: u.status || 'Active',
          permissions: u.permissions || { approve_posts: true, delete_posts: true, warn_users: true, view_audit_logs: true },
          assigned_date: u.assigned_date || u.assignedDate || (u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt.split('T')[0] : u.createdAt.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]),
          assignedDate: u.assigned_date || u.assignedDate || (u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt.split('T')[0] : u.createdAt.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]),
          total_verified_claims: u.total_verified_claims || 0,
          total_approved_listings: u.total_approved_listings || 0,
          total_rejected_listings: u.total_rejected_listings || 0
        };
      });
      return res.json({ moderators: formatted });
    }

    const { store } = getFallbackData();
    const rawMods = (store.users || []).filter(u => u.role === 'moderator' || u.role === 'coordinator');
    const formatted = rawMods.map((u: any) => {
      return {
        id: String(u.id || u.user_id || u._id || ''),
        student_id: u.studentId || u.student_id || u.rollNumber || '',
        studentId: u.studentId || u.student_id || u.rollNumber || '',
        rollNumber: u.rollNumber || u.classRoll || u.roll || '',
        full_name: u.fullName || u.full_name || 'Moderator',
        fullName: u.fullName || u.full_name || 'Moderator',
        email: u.email || '',
        department: u.department || 'Administration',
        role: u.role || 'moderator',
        phone: u.phone || '',
        session_year: u.academicSession || u.session_year || u.sessionYear || 'Staff',
        sessionYear: u.academicSession || u.session_year || u.sessionYear || 'Staff',
        is_verified: !!(u.isVerified || u.is_verified),
        isVerified: !!(u.isVerified || u.is_verified),
        idVerificationStatus: u.idVerificationStatus || 'verified',
        avatar: u.profilePhoto || u.avatar || (u.fullName || u.full_name || 'M').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        profilePhoto: u.profilePhoto || u.avatar || '',
        status: u.status || 'Active',
        permissions: u.permissions || { approve_posts: true, delete_posts: true, warn_users: true, view_audit_logs: true },
        assigned_date: u.assigned_date || u.assignedDate || (u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt.split('T')[0] : u.createdAt.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]),
        assignedDate: u.assigned_date || u.assignedDate || (u.createdAt ? (typeof u.createdAt === 'string' ? u.createdAt.split('T')[0] : u.createdAt.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]),
        total_verified_claims: u.total_verified_claims || 0,
        total_approved_listings: u.total_approved_listings || 0,
        total_rejected_listings: u.total_rejected_listings || 0
      };
    });
    return res.json({ moderators: formatted });
    
  } catch (err: any) {
    console.error('Error fetching moderators:', err);
    return res.status(500).json({ error: 'Failed to fetch moderators: ' + err.message });
  }
});

// 3. Create a new Moderator/Coordinator account directly
router.post('/moderators', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, studentId, email, password, department, phone, permissions, moderatorType, isExternal } = req.body;
  const adminId = req.user?.id || 'System';

  const cleanName = String(fullName || '').trim();
  const cleanId = String(studentId || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanDept = String(department || '').trim();
  const cleanPhone = String(phone || '').trim();

  if (!cleanName || !cleanId || !cleanEmail || !password || !cleanDept) {
    return res.status(400).json({ error: 'All required fields marked with * must be filled.' });
  }

  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Full Name must be at least 2 characters long.' });
  }

  // 1. Validate Registration Number / Staff Code / Student ID
  const isStaffOrExternal = isExternal || moderatorType === 'external' || moderatorType === 'staff' || moderatorType === 'faculty';
  if (!isStaffOrExternal) {
    const regDigits = cleanId.replace(/\D/g, '');
    if (regDigits.length !== cleanId.length || regDigits.length !== 5) {
      if (!cleanId.includes('-') && !cleanId.toUpperCase().startsWith('EMP') && !cleanId.toUpperCase().startsWith('STAFF') && !cleanId.toUpperCase().startsWith('EXT')) {
        return res.status(400).json({ error: 'Student Registration Number must be exactly 5 numeric digits (or select Staff / Faculty / External for Employee Code).' });
      }
    }
  } else {
    if (cleanId.length < 2) {
      return res.status(400).json({ error: 'Employee Code / Staff ID must be at least 2 characters long (e.g. EMP-001).' });
    }
  }

  // 2. Validate Email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address (e.g., student@jkkniu.edu or user@gmail.com).' });
  }

  // 3. Validate Password
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({ error: 'Password must combine at least one uppercase letter (A-Z), one lowercase letter (a-z), one digit (0-9), and one special symbol (@, #, $, etc.).' });
  }

  // 4. Validate Department / Affiliation
  if (cleanDept.length < 2) {
    return res.status(400).json({ error: isStaffOrExternal ? 'Please enter a valid Office / Cell / Affiliation.' : 'Please enter a valid Academic Department.' });
  }

  // 5. Validate Phone (optional)
  if (cleanPhone && !/^[0-9+\s\-()]{6,20}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Please enter a valid phone number (e.g. +880 1712-XXXXXX).' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedDate = new Date().toISOString().split('T')[0];
    const initialPermissions = permissions || {
      approve_posts: true,
      delete_posts: true,
      warn_users: true,
      view_audit_logs: true
    };

    const { store, save } = getFallbackData();
    
    // Check MongoDB for duplicates
    if (isMongoDBActive()) {
      const emailDup = await MUser.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
      if (emailDup) {
        return res.status(400).json({ error: `An account with email "${cleanEmail}" is already registered.` });
      }

      const idDup = await MUser.findOne({
        $or: [
          { studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { student_id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { employeeCode: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { employee_code: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      });
      if (idDup) {
        return res.status(400).json({
          error: isStaffOrExternal
            ? `Employee Code / Staff ID "${cleanId}" is already registered. Please provide a unique code.`
            : `Registration Number "${cleanId}" is already registered in the system.`
        });
      }
    }

    // Check fallback store for duplicates
    const emailDupStore = store.users.some(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (emailDupStore) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" is already registered.` });
    }

    const idDupStore = store.users.some(u => {
      const uId = u.student_id || u.studentId || (u as any).employeeCode || (u as any).employee_code;
      return uId && String(uId).trim().toLowerCase() === cleanId.toLowerCase();
    });
    if (idDupStore) {
      return res.status(400).json({
        error: isStaffOrExternal
          ? `Employee Code / Staff ID "${cleanId}" is already registered. Please provide a unique code.`
          : `Registration Number "${cleanId}" is already registered in the system.`
      });
    }

    let modId = String(Date.now());

    // Sync with Firebase Admin Auth if active
    if (isFirebaseActive()) {
      try {
        const adminAuth = getFirebaseAdminAuth();
        if (adminAuth) {
          try {
            const existingFbUser = await adminAuth.getUserByEmail(cleanEmail);
            if (existingFbUser) {
              modId = existingFbUser.uid;
              await adminAuth.updateUser(modId, {
                password: password,
                displayName: cleanName,
                emailVerified: true
              });
            }
          } catch (getErr: any) {
            if (getErr.code === 'auth/user-not-found' || getErr.message?.includes('user-not-found')) {
              const createdFb = await adminAuth.createUser({
                email: cleanEmail,
                password: password,
                displayName: cleanName,
                emailVerified: true
              });
              modId = createdFb.uid;
            }
          }
        }
      } catch (fbErr: any) {
        console.warn('Firebase moderator creation note:', fbErr.message);
      }
    }

    const newMod: any = {
      id: modId,
      firebaseUid: modId,
      student_id: cleanId,
      studentId: cleanId,
      employeeCode: isStaffOrExternal ? cleanId : '',
      employee_code: isStaffOrExternal ? cleanId : '',
      full_name: cleanName,
      fullName: cleanName,
      email: cleanEmail,
      password_hash: hashedPassword,
      passwordHash: hashedPassword,
      department: cleanDept,
      role: 'moderator',
      phone: cleanPhone || '',
      session_year: isStaffOrExternal ? 'Staff' : 'Student',
      sessionYear: isStaffOrExternal ? 'Staff' : 'Student',
      academicSession: isStaffOrExternal ? 'Staff' : 'Student',
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      email_verified: true,
      registrationCompleted: true,
      avatar: cleanName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      profilePhoto: cleanName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      assigned_date: assignedDate,
      assignedDate: assignedDate,
      status: 'Active',
      accountStatus: 'Active',
      last_login: 'Never',
      lastLogin: 'Never',
      total_verified_claims: 0,
      total_approved_listings: 0,
      total_rejected_listings: 0,
      permissions: initialPermissions,
      createdAt: new Date().toISOString()
    };

    if (isMongoDBActive()) {
      await MUser.updateOne({ id: newMod.id }, newMod, { upsert: true });
    }

    const existingStoreIdx = store.users.findIndex(u => String(u.id) === String(newMod.id) || u.email.toLowerCase() === newMod.email.toLowerCase());
    if (existingStoreIdx >= 0) {
      store.users[existingStoreIdx] = newMod;
    } else {
      store.users.push(newMod);
    }
    save();

    // Sync to Firestore if active
    try {
      const { setFirestoreDocument, getFirestoreDB } = await import('../db/firestore');
      if (getFirestoreDB()) {
        await setFirestoreDocument('users', newMod.id, newMod);
      }
    } catch (fsErr: any) {
      console.warn('Firestore coordinator sync note:', fsErr.message);
    }

    await logAdminActivity(
      adminId,
      `Moderator/Coordinator Account Created: ${cleanName} (${cleanEmail})`,
      'user',
      newMod.id,
      req.ip
    );

    return res.status(201).json({ message: 'Coordinator account created successfully.', moderator: newMod });
  } catch (err: any) {
    console.error('Error creating moderator:', err);
    return res.status(500).json({ error: 'Failed to create coordinator account: ' + err.message });
  }
});

// 4. Promote existing student to Moderator
router.post('/moderators/promote', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { studentId, email, permissions } = req.body;
  const adminId = req.user?.id || 'System';

  if (!studentId && !email) {
    return res.status(400).json({ error: 'Please specify the Student ID or Email to promote.' });
  }

  try {
    const assignedDate = new Date().toISOString().split('T')[0];
    const initialPermissions = permissions || {
      approve_posts: true,
      delete_posts: true,
      warn_users: true,
      view_audit_logs: true
    };

    
      const { store, save } = getFallbackData();
      let user: any = null;

      if (isMongoDBActive()) {
        const query: any = {};
        if (studentId) {
          query.$or = [
            { studentId: studentId },
            { student_id: studentId }
          ];
        } else if (email) {
          query.email = { $regex: new RegExp(`^${email.trim()}$`, 'i') };
        }

        const dbUser = await MUser.findOne(query);
        if (!dbUser) {
          return res.status(404).json({ error: 'Student account not found.' });
        }

        if (dbUser.role === 'admin' || dbUser.role === 'moderator') {
          return res.status(400).json({ error: `User is already an ${dbUser.role}.` });
        }

        dbUser.role = 'moderator';
        (dbUser as any).assignedDate = assignedDate;
        (dbUser as any).assigned_date = assignedDate;
        dbUser.status = 'Active';
        (dbUser as any).permissions = initialPermissions;
        await dbUser.save();

        user = {
          id: String(dbUser.id || dbUser._id),
          student_id: dbUser.studentId || dbUser.student_id,
          studentId: dbUser.studentId || dbUser.student_id,
          full_name: dbUser.fullName || dbUser.full_name,
          email: dbUser.email,
          role: 'moderator',
          assigned_date: assignedDate,
          status: 'Active',
          permissions: initialPermissions
        };

        // Sync to store too so cache is accurate
        const localU = store.users.find(u => String(u.id) === String(user.id));
        if (localU) {
          localU.role = 'moderator';
          localU.assigned_date = assignedDate;
          localU.status = 'Active';
          localU.permissions = initialPermissions;
        } else {
          store.users.push({
            ...dbUser.toObject(),
            id: user.id,
            role: 'moderator',
            assigned_date: assignedDate,
            status: 'Active',
            permissions: initialPermissions
          });
        }
      } else {
        user = store.users.find(u => 
          (studentId && String(u.student_id).toLowerCase() === String(studentId).toLowerCase()) ||
          (email && String(u.email).toLowerCase() === String(email).toLowerCase())
        );

        if (!user) {
          return res.status(404).json({ error: 'Student account not found.' });
        }

        if (user.role === 'admin' || user.role === 'moderator') {
          return res.status(400).json({ error: `User is already an ${user.role}.` });
        }

        user.role = 'moderator';
        user.assigned_date = assignedDate;
        user.status = 'Active';
        user.total_verified_claims = user.total_verified_claims || 0;
        user.total_approved_listings = user.total_approved_listings || 0;
        user.total_rejected_listings = user.total_rejected_listings || 0;
        user.permissions = initialPermissions;
      }

      save();

      await logAdminActivity(
        adminId,
        `Student Promoted to Moderator: ${user.full_name} (${user.email})`,
        'user',
        user.id,
        req.ip
      );

      return res.json({ message: `Successfully promoted ${user.full_name} to Moderator.`, user });
    
  } catch (err: any) {
    console.error('Error promoting student:', err);
    return res.status(500).json({ error: 'Failed to promote student: ' + err.message });
  }
});

// 5. Demote Moderator back to Student
router.post('/moderators/:id/demote', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'System';

  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (!dbUser) {
        return res.status(404).json({ error: 'Moderator account not found.' });
      }

      if (dbUser.role !== 'moderator') {
        return res.status(400).json({ error: 'User is not a Moderator.' });
      }

      dbUser.role = 'student';
      (dbUser as any).assignedDate = undefined;
      (dbUser as any).assigned_date = undefined;
      (dbUser as any).permissions = undefined;
      await dbUser.save();
    }

    const { store, save } = getFallbackData();
    const user = store.users.find(u => String(u.id) === String(id));

    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: 'Moderator account not found in local cache.' });
    }

    if (user) {
      user.role = 'student';
      delete user.assigned_date;
      delete user.permissions;
    }

    save();

    const displayName = user ? user.full_name : (isMongoDBActive() ? (await MUser.findOne({ id: String(id) }))?.fullName : 'Moderator');

    await logAdminActivity(
      adminId,
      `Moderator Demoted to Student: ${displayName || 'Moderator'}`,
      'user',
      id,
      req.ip
    );

    return res.json({ message: `Successfully demoted ${displayName || 'Moderator'} to Student.` });
    
  } catch (err: any) {
    console.error('Error demoting moderator:', err);
    return res.status(500).json({ error: 'Failed to demote moderator: ' + err.message });
  }
});

// 6. Edit Moderator Profile & Permissions
router.put('/moderators/:id', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { fullName, department, phone, permissions } = req.body;
  const adminId = req.user?.id || 'System';

  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        if (fullName) {
          dbUser.fullName = fullName;
          dbUser.full_name = fullName;
        }
        if (department) dbUser.department = department;
        if (phone !== undefined) dbUser.phone = phone;
        if (permissions) (dbUser as any).permissions = permissions;
        await dbUser.save();
      }
    }

    const { store, save } = getFallbackData();
    const user = store.users.find(u => String(u.id) === String(id));

    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: 'Moderator account not found.' });
    }

    if (user) {
      if (fullName) user.full_name = fullName;
      if (department) user.department = department;
      if (phone !== undefined) user.phone = phone;
      if (permissions) user.permissions = permissions;
    }

    save();

    const displayName = user ? user.full_name : (fullName || 'Moderator');
    const displayEmail = user ? user.email : '';

    await logAdminActivity(
      adminId,
      `Moderator Updated: ${displayName} (${displayEmail})`,
      'user',
      id,
      req.ip
    );

    return res.json({ message: 'Moderator details updated successfully.', moderator: user || { id } });
    
  } catch (err: any) {
    console.error('Error updating moderator:', err);
    return res.status(500).json({ error: 'Failed to update moderator: ' + err.message });
  }
});

// 7. Update Moderator Status (Active, Suspended, Disabled)
router.post('/moderators/:id/status', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id || 'System';

  if (!status || !['Active', 'Suspended', 'Disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Choose Active, Suspended, or Disabled.' });
  }

  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        dbUser.status = status;
        (dbUser as any).is_suspended = (status === 'Suspended');
        await dbUser.save();
      }
    }

    const { store, save } = getFallbackData();
    const user = store.users.find(u => String(u.id) === String(id));

    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: 'Moderator account not found.' });
    }

    if (user) {
      user.status = status;
      if (status === 'Suspended') {
        user.is_suspended = true;
      } else {
        user.is_suspended = false;
      }
    }

    save();

    const displayName = user ? user.full_name : 'Moderator';

    await logAdminActivity(
      adminId,
      `Moderator ${status === 'Suspended' ? 'Suspended' : status === 'Active' ? 'Activated' : 'Disabled'}: ${displayName}`,
      'user',
      id,
      req.ip
    );

    return res.json({ message: `Moderator status updated to ${status}.` });
    
  } catch (err: any) {
    console.error('Error updating moderator status:', err);
    return res.status(500).json({ error: 'Failed to update moderator status: ' + err.message });
  }
});

// 8. Reset Moderator Password
router.post('/moderators/:id/reset-password', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const adminId = req.user?.id || 'System';

  if (!oldPassword) {
    return res.status(400).json({ error: 'Please enter the old password for verification.' });
  }

  if (!newPassword) {
    return res.status(400).json({ error: 'Please enter a new password.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirm password do not match.' });
  }

  // Strictly validate password complexity (length, upper, lower, number, special char)
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({ 
      error: 'New password must combine at least one uppercase letter, one lowercase letter, one digit, and one special character.' 
    });
  }

  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (!dbUser) {
        return res.status(404).json({ error: 'Moderator account not found.' });
      }
      
      const currentHash = dbUser.passwordHash || dbUser.password_hash || '';
      if (!currentHash || !bcrypt.compareSync(oldPassword, currentHash)) {
        return res.status(400).json({ error: 'Incorrect old password. Please try again.' });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      dbUser.passwordHash = hashedPassword;
      dbUser.password_hash = hashedPassword;
      await dbUser.save();
    }

    const { store, save } = getFallbackData();
    const user = store.users.find(u => String(u.id) === String(id));

    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: 'Moderator account not found.' });
    }

    if (user) {
      const currentHash = user.password_hash || user.passwordHash || '';
      if (!isMongoDBActive()) {
        // If MongoDB is not active, verify old password from local fallback store
        if (!currentHash || !bcrypt.compareSync(oldPassword, currentHash)) {
          return res.status(400).json({ error: 'Incorrect old password. Please try again.' });
        }
      }
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      user.password_hash = hashedPassword;
      user.passwordHash = hashedPassword;
    }

    save();

    const displayName = user ? user.full_name : 'Moderator';

    await logAdminActivity(
      adminId,
      `Moderator Password Reset: ${displayName}`,
      'user',
      id,
      req.ip
    );

    return res.json({ message: 'Moderator password updated successfully.' });
    
  } catch (err: any) {
    console.error('Error resetting moderator password:', err);
    return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// 9. Delete Moderator account permanently
router.delete('/moderators/:id', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'System';

  try {
    let fullName = 'Moderator';
    let email = '';
    
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        fullName = dbUser.fullName || dbUser.full_name || 'Moderator';
        email = dbUser.email || '';
      }
    } else {
      const { store } = getFallbackData();
      const user = store.users.find(u => String(u.id) === String(id));
      if (user) {
        fullName = user.full_name || user.fullName || 'Moderator';
        email = user.email || '';
      }
    }

    // Call the cascading delete helper!
    await performCascadeDeleteUser(id);

    await logAdminActivity(
      adminId,
      `Moderator Deleted: ${fullName} (${email})`,
      'user',
      id,
      req.ip
    );

    return res.json({ message: 'Moderator account and associated data deleted successfully.' });
    
  } catch (err: any) {
    console.error('Error deleting moderator:', err);
    return res.status(500).json({ error: 'Failed to delete moderator: ' + err.message });
  }
});

// 10. GET ALL PENDING LISTING REVISIONS
router.get('/revisions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { store } = getFallbackData();
    const pendingRevisions = (store.listing_revisions || []).filter(r => r.status === 'pending_review');
    return res.json({ revisions: pendingRevisions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. POST APPROVE LISTING REVISION
router.post('/revisions/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminName = req.user?.fullName || req.user?.email || 'admin';
  try {
    const { store, save } = getFallbackData();
    const revision = (store.listing_revisions || []).find(r => String(r.revisionId) === String(id));
    if (!revision) {
      return res.status(404).json({ error: 'Revision not found.' });
    }

    if (revision.status !== 'pending_review') {
      return res.status(400).json({ error: `Revision has already been ${revision.status}.` });
    }

    const item = store.items.find(i => String(i.id) === String(revision.postId));
    if (!item) {
      return res.status(404).json({ error: 'Original listing not found.' });
    }

    if (String(revision.ownerUid) === String(req.user?.id)) {
      return res.status(403).json({ error: 'Security breach: You cannot approve your own listing revision.' });
    }

    const nd = revision.newData || {};
    item.title = nd.title || item.title;
    item.location = nd.location || item.location;
    item.category = nd.category || item.category;
    item.description = nd.description || item.description;
    item.specificSpot = nd.specificSpot || item.specificSpot || '';
    item.type = nd.type || item.type;
    item.emoji = nd.emoji || item.emoji;
    const sanitizedRevReward = (() => {
      const targetType = nd.type || item.type;
      if (targetType !== 'lost') return '';
      const candidate = (nd.rewardAmount || (typeof nd.rewardOffered === 'string' ? nd.rewardOffered : '') || '').toString().trim();
      if (!candidate || candidate === 'true' || candidate === 'false' || candidate === 'null' || candidate === 'undefined') return '';
      return candidate;
    })();
    item.rewardOffered = sanitizedRevReward;
    item.rewardAmount = sanitizedRevReward;
    
    if (nd.images && nd.images.length > 0) {
      item.images = nd.images;
      const firstCover = nd.images.find((img: any) => img.isCover) || nd.images[0];
      item.coverImage = firstCover.url;
      item.image = firstCover.url;
      (item as any).imageUrl = firstCover.url;
    }

    item.approvalStatus = 'approved';
    item.status = 'active';
    (item as any).isApproved = true;
    (item as any).isRejected = false;
    (item as any).lastApprovedAt = new Date();
    (item as any).approvedBy = adminName;
    (item as any).editedBy = revision.ownerUid;
    item.revision = (item.revision || 1) + 1;
    (item as any).hasPendingRevision = false;

    revision.status = 'approved';
    revision.approvedBy = adminName;
    revision.reviewedAt = new Date().toISOString();

    await createUserNotification({
      userId: revision.ownerUid,
      title: 'Listing Revision Approved',
      message: `Your listing updates for "${item.title}" have been approved by ${adminName} and are now live!`,
      text: `Your listing updates for <strong>"${item.title}"</strong> have been approved by <strong>${adminName}</strong> and are now live!`,
      type: 'revision_approved'
    });

    await logAdminActivity(
      req.user?.id || 'System',
      `Approved listing revision for post: ${item.title}`,
      'item',
      item.id,
      req.ip
    );

    save();

    return res.json({ message: 'Revision approved and listing updated successfully!', item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. POST REJECT LISTING REVISION
router.post('/revisions/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminName = req.user?.fullName || req.user?.email || 'admin';
  try {
    const { store, save } = getFallbackData();
    const revision = (store.listing_revisions || []).find(r => String(r.revisionId) === String(id));
    if (!revision) {
      return res.status(404).json({ error: 'Revision not found.' });
    }

    if (revision.status !== 'pending_review') {
      return res.status(400).json({ error: `Revision has already been ${revision.status}.` });
    }

    const item = store.items.find(i => String(i.id) === String(revision.postId));
    if (!item) {
      return res.status(404).json({ error: 'Original listing not found.' });
    }

    if (String(revision.ownerUid) === String(req.user?.id)) {
      return res.status(403).json({ error: 'Security breach: You cannot review your own listing revision.' });
    }

    revision.status = 'rejected';
    revision.approvedBy = adminName;
    revision.reviewComment = reason || 'No comment provided by reviewer.';
    revision.reviewedAt = new Date().toISOString();

    (item as any).hasPendingRevision = false;

    await createUserNotification({
      userId: revision.ownerUid,
      title: 'Listing Revision Rejected',
      message: `Your listing updates for "${item.title}" were rejected by ${adminName}. Reason: ${reason || 'No explanation provided.'}`,
      text: `Your listing updates for <strong>"${item.title}"</strong> were rejected by <strong>${adminName}</strong>. Reason: ${reason || 'No explanation provided.'}`,
      type: 'revision_rejected'
    });

    await logAdminActivity(
      req.user?.id || 'System',
      `Rejected listing revision for post: ${item.title}`,
      'item',
      item.id,
      req.ip
    );

    save();

    return res.json({ message: 'Revision rejected successfully!', item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 13. GET SYSTEM SETTINGS
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { store } = getFallbackData();
    if (!store.system_settings) {
      store.system_settings = {
        autoApprovePosts: true,
        autoSpamFilter: true,
        maxImageSize: '5 MB per image',
        archiveDuration: '30 Days Active'
      };
    }
    return res.json({ settings: store.system_settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 14. POST UPDATE SYSTEM SETTINGS
router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const { autoApprovePosts, autoSpamFilter, maxImageSize, archiveDuration } = req.body;
  try {
    const { store, save } = getFallbackData();
    
    store.system_settings = {
      autoApprovePosts: typeof autoApprovePosts === 'boolean' ? autoApprovePosts : true,
      autoSpamFilter: typeof autoSpamFilter === 'boolean' ? autoSpamFilter : true,
      maxImageSize: maxImageSize || '5 MB per image',
      archiveDuration: archiveDuration || '30 Days Active'
    };

    await logAdminActivity(
      req.user?.id || 'System',
      `Updated system settings: Auto-Approve=${store.system_settings.autoApprovePosts}, Auto-Spam=${store.system_settings.autoSpamFilter}, MaxImageSize="${store.system_settings.maxImageSize}", ArchiveDuration="${store.system_settings.archiveDuration}"`,
      'system_config',
      'settings',
      req.ip
    );

    save();

    return res.json({ message: 'System configurations stored and synchronized successfully.', settings: store.system_settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 15. DELETE USER PERMANENTLY (CASCADE DELETE)
const handleDeleteUserCascade = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const reason = req.body?.reason || req.query?.reason || 'Permanently deleted account registry cascades.';
  const adminId = req.user?.id || (req.user as any)?._id || 'System';
  const adminName = req.user?.fullName || (req.user as any)?.full_name || req.user?.email || 'Admin';

  if (!id) {
    return res.status(400).json({ error: 'Missing user ID parameter.' });
  }

  try {
    const mongoose = await import('mongoose');
    let userDetails: any = null;

    // 1. Fetch user detail & validate existence across both MongoDB and Store
    if (isMongoDBActive()) {
      const queryConditions: any[] = [
        { id: String(id) },
        { firebaseUid: String(id) },
        { email: String(id).toLowerCase() },
        { studentId: String(id) },
        { student_id: String(id) }
      ];
      if (mongoose.default.Types.ObjectId.isValid(id)) {
        queryConditions.push({ _id: id });
      }
      const u = await MUser.findOne({ $or: queryConditions });
      if (u) {
        userDetails = {
          id: String(u.id || u._id),
          _id: String(u._id),
          fullName: u.fullName || u.full_name || 'User',
          email: u.email || '',
          role: u.role || 'student',
          firebaseUid: u.firebaseUid || ''
        };
      }
    }

    if (!userDetails) {
      const { store } = getFallbackData();
      const sId = String(id).toLowerCase();
      const u = (store.users || []).find(usr => 
        String(usr.id) === String(id) || 
        String(usr._id) === String(id) || 
        (usr.firebaseUid && String(usr.firebaseUid) === String(id)) ||
        (usr.email && String(usr.email).toLowerCase() === sId) ||
        (usr.studentId && String(usr.studentId) === String(id)) ||
        (usr.student_id && String(usr.student_id) === String(id))
      );
      if (u) {
        userDetails = {
          id: String(u.id || u._id),
          _id: String(u._id || u.id),
          fullName: u.fullName || u.full_name || 'User',
          email: u.email || '',
          role: u.role || 'student',
          firebaseUid: u.firebaseUid || ''
        };
      }
    }

    if (!userDetails) {
      // Execute best-effort cascade with given ID
      await performCascadeDeleteUser(id);
      return res.json({
        message: 'Cascade cleanup executed for user ID: ' + id,
        deletedUserId: id
      });
    }

    // 2. Validate Security Constraint A: Preventing self deletion
    if (String(userDetails.id) === String(req.user?.id) || String(userDetails._id) === String(req.user?.id)) {
      return res.status(400).json({ error: 'Security Constraint: You cannot delete your own account.' });
    }

    // 3. Validate Security Constraint B: Primary Super Admin / Last Admin protection
    if (userDetails.email === 'nazrulretrievers@gmail.com' || String(userDetails.id) === '2') {
      return res.status(403).json({ error: 'Security Constraint: The primary Super Admin account cannot be deleted.' });
    }

    if (userDetails.role === 'admin') {
      let adminCount = 0;
      if (isMongoDBActive()) {
        adminCount = await MUser.countDocuments({ role: 'admin' });
      } else {
        const { store } = getFallbackData();
        adminCount = store.users.filter((u: any) => u.role === 'admin').length;
      }
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Security Constraint: You cannot delete the last Admin of this platform.' });
      }
    }

    // 4. Save audit log BEFORE deleting user data (this log will be preserved during cascade)
    const logMsg = `ADMIN DELETE USER - Admin ID: ${adminId}, Admin Name: ${adminName}, Deleted User ID: ${userDetails.id}, Deleted User Name: ${userDetails.fullName} (${userDetails.email}), Reason: ${reason}`;
    await logAdminActivity(
      adminId,
      logMsg,
      'user',
      userDetails.id,
      req.ip
    );

    // 5. Execute cascading deletion
    await performCascadeDeleteUser(userDetails.id, userDetails);

    return res.json({ 
      message: 'User account and all associated data permanently deleted successfully!',
      deletedUserId: userDetails.id
    });

  } catch (err: any) {
    console.error('Error in user cascade deletion:', err);
    return res.status(500).json({ error: 'Failed to permanently delete user: ' + err.message });
  }
};

// 16. BATCH DELETE USERS (CASCADE - ADMIN ONLY)
router.post('/users/batch-delete', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { userIds, reason } = req.body;
  const adminId = req.user?.id || (req.user as any)?._id || 'System';
  const adminName = req.user?.fullName || (req.user as any)?.full_name || req.user?.email || 'Admin';

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Please select at least one user to delete.' });
  }

  const deleteReason = reason || 'Batch cascade deletion executed by Admin.';
  const deletedIds: string[] = [];
  const errors: string[] = [];

  try {
    const mongoose = await import('mongoose');

    for (const rawId of userIds) {
      const id = String(rawId);
      try {
        let userDetails: any = null;
        if (isMongoDBActive()) {
          const queryConditions: any[] = [
            { id: id }, 
            { firebaseUid: id },
            { email: id.toLowerCase() },
            { studentId: id },
            { student_id: id }
          ];
          if (mongoose.default.Types.ObjectId.isValid(id)) {
            queryConditions.push({ _id: id });
          }
          const u = await MUser.findOne({ $or: queryConditions });
          if (u) {
            userDetails = {
              id: String(u.id || u._id),
              _id: String(u._id),
              fullName: u.fullName || u.full_name || 'User',
              email: u.email || '',
              role: u.role || 'student',
              firebaseUid: u.firebaseUid || ''
            };
          }
        }
        
        if (!userDetails) {
          const { store } = getFallbackData();
          const sId = id.toLowerCase();
          const u = (store.users || []).find(usr => 
            String(usr.id) === id || 
            String(usr._id) === id || 
            (usr.firebaseUid && String(usr.firebaseUid) === id) ||
            (usr.email && String(usr.email).toLowerCase() === sId) ||
            (usr.studentId && String(usr.studentId) === id) ||
            (usr.student_id && String(usr.student_id) === id)
          );
          if (u) {
            userDetails = {
              id: String(u.id || u._id),
              _id: String(u._id || u.id),
              fullName: u.fullName || u.full_name || 'User',
              email: u.email || '',
              role: u.role || 'student',
              firebaseUid: u.firebaseUid || ''
            };
          }
        }

        if (!userDetails) {
          await performCascadeDeleteUser(id);
          deletedIds.push(id);
          continue;
        }

        // Prevent self deletion
        const isSelf = String(userDetails.id) === String(req.user?.id) || 
          String(userDetails._id) === String(req.user?.id) ||
          (userDetails.email && req.user?.email && userDetails.email.toLowerCase() === req.user.email.toLowerCase());
        if (isSelf) {
          errors.push(`Skipped ${userDetails.fullName || id}: Cannot delete your own active account.`);
          continue;
        }

        // Prevent admin deletion in batch
        if (userDetails.role === 'admin' || userDetails.email === 'nazrulretrievers@gmail.com' || String(userDetails.id) === '2') {
          errors.push(`Skipped ${userDetails.fullName || id}: Administrative accounts are protected from batch deletion.`);
          continue;
        }

        // Save audit log
        const logMsg = `ADMIN BATCH DELETE USER - Admin ID: ${adminId}, Admin Name: ${adminName}, Deleted User: ${userDetails.fullName} (${userDetails.email || id}), Reason: ${deleteReason}`;
        await logAdminActivity(
          adminId,
          logMsg,
          'user',
          userDetails.id,
          req.ip
        );

        await performCascadeDeleteUser(userDetails.id, userDetails);
        deletedIds.push(userDetails.id);
        if (userDetails._id && userDetails._id !== userDetails.id) {
          deletedIds.push(userDetails._id);
        }
      } catch (err: any) {
        console.error(`Error deleting user ${id} in batch:`, err);
        errors.push(`Failed to delete user ID ${id}: ${err.message}`);
      }
    }

    return res.json({
      message: `Successfully deleted ${deletedIds.length} user(s) and all their associated posts, claims, messages, and uploaded files!`,
      deletedCount: deletedIds.length,
      deletedUserIds: deletedIds,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    console.error('Error in batch-delete users:', err);
    return res.status(500).json({ error: 'Failed to batch delete users: ' + err.message });
  }
});

// 17. PURGE ALL USERS (CASCADE DELETE ALL NON-ADMIN / ELIGIBLE USERS)
router.post('/users/delete-all', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const adminId = req.user?.id || (req.user as any)?._id || 'System';
  const adminName = req.user?.fullName || (req.user as any)?.full_name || req.user?.email || 'Admin';

  const deleteReason = reason || 'Purge all user accounts and associated posts executed by Admin.';
  
  try {
    const userMap = new Map<string, any>();
    
    // 1. Gather users from MongoDB
    if (isMongoDBActive()) {
      try {
        const dbUsers = await MUser.find({}).lean();
        for (const u of dbUsers) {
          const key = String(u.id || u._id || u.email);
          userMap.set(key, u);
        }
      } catch (err) {
        console.error('Error querying MongoDB users for delete-all:', err);
      }
    }

    // 2. Gather users from Fallback JSON Store
    const { store, save } = getFallbackData();
    for (const u of (store.users || [])) {
      const key = String(u.id || u._id || u.email);
      if (!userMap.has(key)) {
        userMap.set(key, u);
      }
    }

    const allUsers = Array.from(userMap.values());

    const currentAdminId = String(req.user?.id || (req.user as any)?._id || '');
    const currentAdminEmail = String(req.user?.email || '').toLowerCase().trim();

    // Filter target users to delete (protect current logged in admin and super admin)
    const targetsToDelete = allUsers.filter((u: any) => {
      const uId = String(u.id || u._id || '');
      const uEmail = String(u.email || '').toLowerCase().trim();
      if (uId === currentAdminId) return false;
      if (currentAdminEmail && uEmail === currentAdminEmail) return false;
      if (uEmail === 'nazrulretrievers@gmail.com' || uId === '2') return false;
      if (u.role === 'admin') return false;
      return true;
    });

    const deletedIds: string[] = [];

    for (const u of targetsToDelete) {
      const uId = String(u.id || u._id);
      const userDetails = {
        id: uId,
        _id: String(u._id || uId),
        fullName: u.fullName || u.full_name || 'User',
        email: u.email || '',
        role: u.role || 'student',
        firebaseUid: u.firebaseUid || ''
      };

      await logAdminActivity(
        adminId,
        `ADMIN PURGE ALL USERS - Deleted: ${userDetails.fullName} (${userDetails.email || uId})`,
        'user',
        userDetails.id,
        req.ip
      );

      await performCascadeDeleteUser(userDetails.id, userDetails);
      deletedIds.push(userDetails.id);
      if (userDetails._id && userDetails._id !== userDetails.id) {
        deletedIds.push(userDetails._id);
      }
    }

    // 3. Absolute Master Sweep: Purge ANY remaining items, claims, and chat threads not owned by Super Admin
    if (isMongoDBActive()) {
      try {
        await MItem.deleteMany({
          $and: [
            { email: { $ne: 'nazrulretrievers@gmail.com' } },
            { userId: { $ne: '2' } },
            { ownerUid: { $ne: '2' } }
          ]
        });
        await MClaim.deleteMany({
          $and: [
            { email: { $ne: 'nazrulretrievers@gmail.com' } },
            { user_id: { $ne: '2' } }
          ]
        });
        await MChatThread.deleteMany({
          participants: { $ne: '2' }
        });
      } catch (sweepErr) {
        console.warn('MongoDB sweep warning:', sweepErr);
      }
    }

    // Clean JSON fallback store
    if (store.items) {
      store.items = store.items.filter((item: any) => {
        const itemEmail = String(item.email || item.postedBy?.email || '').toLowerCase().trim();
        const itemUserId = String(item.userId || item.ownerUid || '');
        return itemEmail === 'nazrulretrievers@gmail.com' || itemUserId === '2';
      });
    }
    if (store.claims) {
      store.claims = store.claims.filter((c: any) => {
        const cEmail = String(c.email || c.user_email || '').toLowerCase().trim();
        const cUserId = String(c.userId || c.user_id || '');
        return cEmail === 'nazrulretrievers@gmail.com' || cUserId === '2';
      });
    }
    if (store.threads) {
      store.threads = [];
    }
    save();

    return res.json({
      message: `Successfully deleted all ${targetsToDelete.length} user accounts and permanently purged all listings, claims, chat threads, and associated data!`,
      deletedCount: targetsToDelete.length,
      deletedUserIds: deletedIds
    });
  } catch (err: any) {
    console.error('Error in delete-all users:', err);
    return res.status(500).json({ error: 'Failed to delete all users: ' + err.message });
  }
});

router.delete('/users/all', authorizeAdmin, async (req: AuthenticatedRequest, res: Response) => {
  req.url = '/users/delete-all';
  return (router as any).handle(req, res);
});

router.delete('/users/:id', authorizeAdmin, handleDeleteUserCascade);
router.delete('/users/:id/cascade', authorizeAdmin, handleDeleteUserCascade);

export default router;
