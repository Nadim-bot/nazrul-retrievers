var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/db/mongodb.ts
function getEffectiveMongoUri() {
  const envUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() ? process.env.MONGODB_URI.trim() : "";
  if (envUri && !envUri.includes("<username>") && !envUri.includes("<password>") && !envUri.includes("your_mongodb_uri_here")) {
    return envUri;
  }
  return CONFIGURED_MONGODB_URI;
}
async function connectMongoDB() {
  if (import_mongoose.default.connection.readyState === 1) {
    isMongoConnected = true;
    return true;
  }
  if (connectingPromise) {
    return connectingPromise;
  }
  const primaryUri = getEffectiveMongoUri();
  const now = Date.now();
  if (lastAuthFailureTime && now - lastAuthFailureTime < RETRY_COOLDOWN_MS) {
    return false;
  }
  lastConnectionAttempt = now;
  connectingPromise = (async () => {
    try {
      console.log("\u{1F504} Attempting MongoDB connection to Atlas Database (nazrul_retrievers)...");
      await import_mongoose.default.connect(primaryUri, {
        dbName: "nazrul_retrievers",
        serverSelectionTimeoutMS: 4e3,
        connectTimeoutMS: 5e3,
        socketTimeoutMS: 1e4,
        bufferCommands: false,
        autoIndex: false
      });
      isMongoConnected = true;
      lastAuthFailureTime = 0;
      console.log("\u2705 Connected to MongoDB Atlas Database (nazrul_retrievers) successfully!");
      return true;
    } catch (primaryErr) {
      if (primaryUri !== CONFIGURED_MONGODB_URI) {
        try {
          console.log("\u{1F504} Attempting fallback to configured institutional MongoDB Atlas credentials...");
          await import_mongoose.default.disconnect().catch(() => {
          });
          await import_mongoose.default.connect(CONFIGURED_MONGODB_URI, {
            dbName: "nazrul_retrievers",
            serverSelectionTimeoutMS: 4e3,
            connectTimeoutMS: 5e3,
            socketTimeoutMS: 1e4,
            bufferCommands: false,
            autoIndex: false
          });
          isMongoConnected = true;
          lastAuthFailureTime = 0;
          console.log("\u2705 Connected to configured MongoDB Atlas Database (nazrul_retrievers) successfully via institutional credentials!");
          return true;
        } catch (fallbackErr) {
          isMongoConnected = false;
          await import_mongoose.default.disconnect().catch(() => {
          });
          console.warn("\u2139\uFE0F MongoDB credentials did not authenticate on fallback. Operating on resilient JSON failover storage:", fallbackErr.message);
        }
      }
      isMongoConnected = false;
      await import_mongoose.default.disconnect().catch(() => {
      });
      if (primaryErr.message && (primaryErr.message.includes("auth") || primaryErr.message.includes("Authentication") || primaryErr.code === 18)) {
        lastAuthFailureTime = Date.now();
        console.log("\u2139\uFE0F Note: MongoDB Atlas credentials did not authenticate. Running seamlessly on resilient local JSON data store.");
      } else {
        console.log("\u2139\uFE0F MongoDB connection status: (" + (primaryErr.message || "offline") + "). Operating on resilient local JSON data store.");
      }
      return false;
    } finally {
      connectingPromise = null;
    }
  })();
  return connectingPromise;
}
function isMongoDBActive() {
  return import_mongoose.default.connection.readyState === 1;
}
var import_mongoose, isMongoConnected, lastConnectionAttempt, lastAuthFailureTime, connectingPromise, RETRY_COOLDOWN_MS, CONFIGURED_MONGODB_URI, UserSchema, MUser, ImageMetadataSchema, ItemSchema, MItem, NotificationSchema, MNotification, AdminNotificationSchema, MAdminNotification, ConversationReportSchema, MConversationReport, AdminActivityLogSchema, MAdminActivityLog, ChatThreadSchema, MChatThread, SearchKeywordSchema, MSearchKeyword, SearchLogSchema, MSearchLog, ClaimSchema, MClaim, ListingRevisionSchema, MListingRevision, FacultySchema, MFaculty, DepartmentSchema, MDepartment, ItemViewSchema, MItemView, OtpSchema, MOtp;
var init_mongodb = __esm({
  "server/db/mongodb.ts"() {
    import_mongoose = __toESM(require("mongoose"), 1);
    import_mongoose.default.set("bufferCommands", false);
    isMongoConnected = false;
    lastConnectionAttempt = 0;
    lastAuthFailureTime = 0;
    connectingPromise = null;
    RETRY_COOLDOWN_MS = 6e4;
    CONFIGURED_MONGODB_URI = "mongodb+srv://nadimahmedshuvo17_db_user:Campus_lost_Found@cluster0.y68wzpy.mongodb.net/nazrul_retrievers?retryWrites=true&w=majority&appName=Cluster0";
    import_mongoose.default.connection.on("connected", () => {
      isMongoConnected = true;
    });
    import_mongoose.default.connection.on("disconnected", () => {
      isMongoConnected = false;
    });
    import_mongoose.default.connection.on("error", (err) => {
      isMongoConnected = false;
      if (err.message && (err.message.includes("auth") || err.message.includes("Authentication") || err.code === 18)) {
        lastAuthFailureTime = Date.now();
        return;
      }
      if (isMongoConnected) {
        console.warn("\u2139\uFE0F Mongoose connection notice:", err.message);
      }
    });
    UserSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      // Authentication
      firebaseUid: { type: String, default: "" },
      provider: { type: String, default: "email" },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, default: "" },
      refreshToken: { type: String, default: "" },
      // Basic
      fullName: { type: String, default: "" },
      studentId: { type: String, default: "" },
      registrationNumber: { type: String, default: "" },
      rollNumber: { type: String, default: "" },
      classRoll: { type: String, default: "" },
      roll: { type: String, default: "" },
      academicSession: { type: String, default: "" },
      faculty: { type: String, default: "" },
      department: { type: String, default: "" },
      phone: { type: String, default: "" },
      // Personal
      gender: { type: String, default: "" },
      dateOfBirth: { type: String, default: "" },
      bloodGroup: { type: String, default: "" },
      // Contact
      address: { type: String, default: "" },
      emergencyContact: { type: String, default: "" },
      emergencyContactName: { type: String, default: "" },
      // University
      residentialHall: { type: String, default: "" },
      // Social
      facebook: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      // Profile
      bio: { type: String, default: "" },
      avatar: { type: String, default: "" },
      // Statistics
      totalLostPosts: { type: Number, default: 0 },
      totalFoundPosts: { type: Number, default: 0 },
      successfulReturns: { type: Number, default: 0 },
      reputationScore: { type: Number, default: 100 },
      // Status
      role: { type: String, enum: ["student", "admin", "moderator", "coordinator", "staff"], default: "student" },
      status: { type: String, default: "Pending" },
      emailVerified: { type: Boolean, default: false },
      isVerified: { type: Boolean, default: false },
      profileCompleted: { type: Number, default: 0 },
      employeeCode: { type: String, default: "" },
      employee_code: { type: String, default: "" },
      // Dates
      lastLogin: { type: String, default: null },
      // Additional production/verification fields
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      profileImage: { type: String, default: "" },
      verificationCode: { type: String, default: null },
      verificationExpires: { type: Date, default: null },
      otpAttempts: { type: Number, default: 0 },
      lastOtpSentAt: { type: Date, default: null },
      accountStatus: { type: String, default: "Pending" },
      verificationSentAt: { type: String, default: null },
      verificationExpiresAt: { type: String, default: null },
      verificationAttempts: { type: Number, default: 0 },
      registrationCompleted: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      verificationDocument: { type: String, default: "" },
      idVerificationStatus: { type: String, enum: ["unverified", "pending", "verified", "rejected"], default: "unverified" },
      idVerificationRemarks: { type: String, default: "" },
      idVerificationSubmittedAt: { type: String, default: null },
      verifiedAt: { type: String, default: null },
      profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
      notificationSettings: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        matchAlerts: { type: Boolean, default: true }
      },
      language: { type: String, enum: ["EN", "BN"], default: "EN" },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      // Temporarily kept legacy fields for 100% backward compatibility during transition
      user_id: { type: String, default: "" },
      full_name: { type: String, default: "" },
      student_id: { type: String, default: "" },
      password_hash: { type: String, default: "" },
      profilePhoto: { type: String, default: "" },
      session_year: { type: String, default: "" },
      sessionYear: { type: String, default: "" },
      is_verified: { type: Boolean, default: false },
      profileCompletion: { type: Number, default: 0 }
    }, { strict: false, timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });
    MUser = import_mongoose.default.model("User", UserSchema);
    ImageMetadataSchema = new import_mongoose.default.Schema({
      url: { type: String, required: true },
      storagePath: { type: String, default: "" },
      order: { type: Number, required: true },
      isCover: { type: Boolean, default: false },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      uploadedAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() },
      uploadedBy: { type: String, default: "" },
      fileSize: { type: Number, default: 0 }
    }, { _id: false });
    ItemSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      emoji: { type: String, default: "\u{1F4E6}" },
      title: { type: String, required: true },
      category: { type: String, required: true },
      subcategory: { type: String, default: "" },
      description: { type: String, required: true },
      type: { type: String, enum: ["lost", "found"], required: true },
      location: { type: String, required: true },
      specificSpot: { type: String, default: "" },
      rewardOffered: { type: String, default: "" },
      image: { type: String, default: "" },
      images: { type: [ImageMetadataSchema], default: [] },
      coverImage: { type: String, default: "" },
      capturedViaCamera: { type: Boolean, default: false },
      capturedImage: { type: String, default: "" },
      views: { type: Number, default: 0 },
      status: { type: String, default: "pending" },
      approvalStatus: { type: String, default: "pending" },
      userId: { type: String, default: "" },
      firebaseUid: { type: String, default: "" },
      email: { type: String, default: "" },
      displayName: { type: String, default: "" },
      photoURL: { type: String, default: "" },
      isApproved: { type: Boolean, default: false },
      isRejected: { type: Boolean, default: false },
      isDeleted: { type: Boolean, default: false },
      approvedBy: { type: String, default: null },
      approvedAt: { type: Date, default: null },
      rejectedBy: { type: String, default: null },
      rejectedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: "" },
      deletedBy: { type: String, default: null },
      deletedAt: { type: Date, default: null },
      contactInfo: { type: String, default: "" },
      lastApprovedAt: { type: Date, default: null },
      editedBy: { type: String, default: null },
      revision: { type: Number, default: 1 },
      ownerUid: { type: String, default: "" },
      postedBy: {
        name: { type: String, required: true },
        department: { type: String, required: true },
        avatar: { type: String, default: "" },
        initials: { type: String, default: "" },
        verified: { type: Boolean, default: false },
        email: { type: String, default: "" },
        userId: { type: String, default: "" },
        role: { type: String, default: "student" }
      }
    }, { timestamps: true });
    MItem = import_mongoose.default.model("Item", ItemSchema);
    NotificationSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      user_id: { type: String, required: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      type: { type: String, required: true },
      is_read: { type: Boolean, default: false }
    }, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
    MNotification = import_mongoose.default.model("Notification", NotificationSchema);
    AdminNotificationSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      type: { type: String, required: true },
      category: { type: String, required: true },
      priority: { type: String, enum: ["low", "medium", "high"], default: "low" },
      relatedUserId: { type: String, default: "" },
      relatedItemId: { type: String, default: "" },
      relatedConversationId: { type: String, default: "" },
      isRead: { type: Boolean, default: false }
    }, { timestamps: { createdAt: "createdAt" } });
    MAdminNotification = import_mongoose.default.model("AdminNotification", AdminNotificationSchema);
    ConversationReportSchema = new import_mongoose.default.Schema({
      reportId: { type: String, required: true, unique: true },
      conversationId: { type: String, required: true },
      reportedBy: { type: String, required: true },
      reportedByName: { type: String, default: "" },
      reportedUser: { type: String, required: true },
      reportedUserName: { type: String, default: "" },
      reason: { type: String, required: true },
      description: { type: String, default: "" },
      status: { type: String, enum: ["pending", "reviewed", "resolved"], default: "pending" },
      reviewedBy: { type: String, default: "" },
      reviewedAt: { type: Date, default: null }
    }, { timestamps: { createdAt: "createdAt" } });
    MConversationReport = import_mongoose.default.model("ConversationReport", ConversationReportSchema);
    AdminActivityLogSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      adminId: { type: String, required: true },
      action: { type: String, required: true },
      targetType: { type: String, default: "" },
      targetId: { type: String, default: "" },
      ipAddress: { type: String, default: "" }
    }, { timestamps: { createdAt: "createdAt" } });
    MAdminActivityLog = import_mongoose.default.model("AdminActivityLog", AdminActivityLogSchema);
    ChatThreadSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      name: { type: String, default: "" },
      initials: { type: String, default: "" },
      color: { type: String, default: "" },
      preview: { type: String, default: "" },
      time: { type: String, default: "" },
      unreadCount: { type: Number, default: 0 },
      itemTitle: { type: String, default: "" },
      online: { type: Boolean, default: true },
      messages: [{
        id: { type: String },
        senderId: { type: String },
        senderName: { type: String },
        senderInitials: { type: String },
        text: { type: String },
        time: { type: String },
        imageUrl: { type: String },
        fileUrl: { type: String },
        fileName: { type: String },
        fileType: { type: String },
        fileSize: { type: String },
        attachment: { type: Object },
        isDeleted: { type: Boolean, default: false },
        deletedForEveryone: { type: Boolean, default: false },
        deletedForUsers: [{ type: String }],
        readBy: [{ type: String }],
        isRead: { type: Boolean, default: false },
        createdAt: { type: String }
      }]
    }, { timestamps: { createdAt: "createdAt" }, strict: false });
    MChatThread = import_mongoose.default.model("ChatThread", ChatThreadSchema);
    SearchKeywordSchema = new import_mongoose.default.Schema({
      keyword: { type: String, required: true, unique: true },
      count: { type: Number, default: 1 },
      category: { type: String, default: "General" },
      subcategory: { type: String, default: "" }
    });
    MSearchKeyword = import_mongoose.default.model("SearchKeyword", SearchKeywordSchema);
    SearchLogSchema = new import_mongoose.default.Schema({
      keyword: { type: String, required: true },
      department: { type: String, default: "" },
      category: { type: String, default: "" },
      subcategory: { type: String, default: "" },
      timestamp: { type: Date, default: Date.now },
      userId: { type: String, default: "" }
    }, { timestamps: true });
    MSearchLog = import_mongoose.default.model("SearchLog", SearchLogSchema);
    ClaimSchema = new import_mongoose.default.Schema({
      claim_id: { type: String, required: true, unique: true },
      id: { type: String },
      item_id: { type: String, required: true },
      user_id: { type: String, required: true },
      proof_description: { type: String, required: true },
      contact_details: { type: String, default: "" },
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      admin_notes: { type: String, default: "" },
      created_at: { type: String },
      updated_at: { type: String }
    }, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });
    MClaim = import_mongoose.default.model("Claim", ClaimSchema);
    ListingRevisionSchema = new import_mongoose.default.Schema({
      revisionId: { type: String, required: true, unique: true },
      postId: { type: String, required: true },
      ownerUid: { type: String, required: true },
      previousData: { type: import_mongoose.default.Schema.Types.Mixed, required: true },
      newData: { type: import_mongoose.default.Schema.Types.Mixed, required: true },
      editedImages: { type: [ImageMetadataSchema], default: [] },
      editedAt: { type: String, default: () => (/* @__PURE__ */ new Date()).toISOString() },
      status: { type: String, enum: ["pending_review", "approved", "rejected"], default: "pending_review" },
      approvedBy: { type: String, default: null },
      reviewComment: { type: String, default: "" },
      reviewedAt: { type: String, default: null },
      revisionNumber: { type: Number, default: 1 }
    }, { timestamps: true });
    MListingRevision = import_mongoose.default.model("ListingRevision", ListingRevisionSchema);
    FacultySchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      faculty_name: { type: String, required: true }
    }, { timestamps: true });
    MFaculty = import_mongoose.default.model("Faculty", FacultySchema);
    DepartmentSchema = new import_mongoose.default.Schema({
      id: { type: String, required: true, unique: true },
      faculty_id: { type: String, required: true },
      department_name: { type: String, required: true }
    }, { timestamps: true });
    MDepartment = import_mongoose.default.model("Department", DepartmentSchema);
    ItemViewSchema = new import_mongoose.default.Schema({
      itemId: { type: String, required: true },
      userId: { type: String, required: true },
      viewedAt: { type: Date, default: Date.now },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" }
    }, { timestamps: true });
    ItemViewSchema.index({ itemId: 1 });
    ItemViewSchema.index({ userId: 1 });
    ItemViewSchema.index({ itemId: 1, userId: 1 }, { unique: true });
    MItemView = import_mongoose.default.model("ItemView", ItemViewSchema);
    OtpSchema = new import_mongoose.default.Schema({
      id: { type: String, default: () => `otp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` },
      user_id: { type: String, default: "" },
      email: { type: String, required: true, index: true },
      verification_code: { type: String, required: true },
      created_at: { type: Date, default: Date.now },
      expires_at: { type: Date, required: true },
      verified: { type: Number, default: 0 },
      used: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 }
    }, { timestamps: true });
    MOtp = import_mongoose.default.model("Otp", OtpSchema);
  }
});

// src/data.ts
function mapOldCategory(oldCategory, oldSubcategory) {
  const norm = (oldCategory || "").trim().toLowerCase();
  let mappedCategory = "Other";
  let mappedSubcategory = "Other";
  if (norm === "electronics") {
    mappedCategory = "Electronics";
  } else if (norm === "bags & luggage" || norm === "bags" || norm === "luggage") {
    mappedCategory = "Bags & Luggage";
  } else if (norm === "documents & id cards" || norm === "documents" || norm === "id cards") {
    mappedCategory = "Documents & ID Cards";
  } else if (norm === "accessories") {
    mappedCategory = "Accessories";
  } else if (norm === "clothing" || norm === "clothing & wearables") {
    mappedCategory = "Clothing & Wearables";
  } else if (norm === "books & stationery" || norm === "books" || norm === "stationery") {
    mappedCategory = "Books & Stationery";
  } else if (norm === "keys & cards" || norm === "keys & access cards" || norm === "keys") {
    mappedCategory = "Keys & Access Cards";
  } else if (norm === "sports equipment" || norm === "sports") {
    mappedCategory = "Sports Equipment";
  } else if (norm === "academic items") {
    mappedCategory = "Academic Items";
  } else if (norm === "money & valuables") {
    mappedCategory = "Money & Valuables";
  } else if (norm === "vehicles & transport") {
    mappedCategory = "Vehicles & Transport";
  } else if (norm === "personal items") {
    mappedCategory = "Personal Items";
  } else {
    mappedCategory = "Other";
  }
  const targetCategoryConfig = CATEGORY_STRUCTURE.find((c) => c.name.toLowerCase() === mappedCategory.toLowerCase());
  if (targetCategoryConfig) {
    if (oldSubcategory) {
      const match = targetCategoryConfig.subcategories.find((sub) => sub.toLowerCase() === oldSubcategory.trim().toLowerCase());
      if (match) {
        mappedSubcategory = match;
      } else {
        mappedSubcategory = targetCategoryConfig.subcategories[0] || "Other";
      }
    } else {
      mappedSubcategory = targetCategoryConfig.subcategories[0] || "Other";
    }
  }
  return { category: mappedCategory, subcategory: mappedSubcategory };
}
var DEPARTMENT_GROUPS, ALLOWED_DEPARTMENTS, CATEGORY_STRUCTURE, CATEGORIES;
var init_data = __esm({
  "src/data.ts"() {
    DEPARTMENT_GROUPS = [
      {
        label: "Faculty of Science and Engineering",
        open: true,
        departments: [
          { name: "Computer Science and Engineering", aliases: ["CSE", "Computer", "Computer Science"] },
          { name: "Electrical and Electronic Engineering", aliases: ["EEE", "Electrical", "Electrical Engineering"] },
          { name: "Environmental Science and Engineering", aliases: ["ESE", "Environmental", "Environmental Science"] },
          { name: "Statistics", aliases: ["STAT", "Stats"] }
        ]
      },
      {
        label: "Faculty of Business Administration",
        open: false,
        departments: [
          { name: "Accounting and Information Systems", aliases: ["AIS", "Accounting", "Information Systems"] },
          { name: "Finance and Banking", aliases: ["FNB", "Finance", "Banking"] },
          { name: "Human Resource Management", aliases: ["HRM", "Human Resource", "HR"] },
          { name: "Management", aliases: ["Mgmt", "Management Studies"] },
          { name: "Marketing", aliases: ["MKT", "Market"] }
        ]
      },
      {
        label: "Faculty of Social Science",
        open: false,
        departments: [
          { name: "Economics", aliases: ["Econ", "Economics"] },
          { name: "Public Administration and Governance Studies", aliases: ["PAGS", "Public Administration", "Governance"] },
          { name: "Folklore", aliases: ["Folk", "Folklore"] },
          { name: "Anthropology", aliases: ["Anthro", "Anthropology"] },
          { name: "Population Science", aliases: ["Pop Science", "Population"] },
          { name: "Local Government and Urban Development", aliases: ["LGUD", "Local Government", "Urban Development"] },
          { name: "Sociology", aliases: ["Socio", "Sociology"] }
        ]
      },
      {
        label: "Faculty of Arts",
        open: false,
        departments: [
          { name: "Bangla Language and Literature", aliases: ["Bangla", "BLL"] },
          { name: "English Language and Literature", aliases: ["English", "ELL"] },
          { name: "Music", aliases: ["Music"] },
          { name: "Theatre and Performance Studies", aliases: ["TPS", "Theatre", "Performance"] },
          { name: "Film and Media Studies", aliases: ["FMS", "Film", "Media"] },
          { name: "Philosophy", aliases: ["Phil", "Philosophy"] },
          { name: "History", aliases: ["Hist", "History"] }
        ]
      },
      {
        label: "Faculty of Law",
        open: false,
        departments: [
          { name: "Law and Justice", aliases: ["Law"] }
        ]
      },
      {
        label: "Faculty of Fine Arts",
        open: false,
        departments: [
          { name: "Fine Arts", aliases: ["Arts", "Fine Arts"] }
        ]
      }
    ];
    ALLOWED_DEPARTMENTS = DEPARTMENT_GROUPS.flatMap((group) => group.departments.map((d) => d.name));
    CATEGORY_STRUCTURE = [
      {
        name: "Electronics",
        subcategories: [
          "Mobile Phone",
          "Laptop",
          "Tablet",
          "Smart Watch",
          "Calculator",
          "Power Bank",
          "Charger",
          "Earphones / Headphones",
          "USB Drive",
          "Hard Disk"
        ]
      },
      {
        name: "Bags & Luggage",
        subcategories: ["Backpack", "Handbag", "Travel Bag", "Laptop Bag", "Wallet", "Purse"]
      },
      {
        name: "Documents & ID Cards",
        subcategories: [
          "University ID Card",
          "Registration Card",
          "Admit Card",
          "Library Card",
          "NID",
          "Passport",
          "Driving License",
          "Birth Certificate",
          "Certificates",
          "Important Documents"
        ]
      },
      {
        name: "Keys & Access Cards",
        subcategories: ["Room Key", "Bike Key", "Car Key", "Office Key", "Locker Key", "Access Card"]
      },
      {
        name: "Books & Stationery",
        subcategories: ["Books", "Notebook", "File", "Assignment", "Pen", "Pencil Box", "Scientific Calculator"]
      },
      {
        name: "Clothing & Wearables",
        subcategories: ["Jacket", "Shirt", "T-shirt", "Shoes", "Sandals", "Cap", "Umbrella", "Glasses"]
      },
      {
        name: "Accessories",
        subcategories: ["Watch", "Ring", "Necklace", "Bracelet", "Belt", "Sunglasses"]
      },
      {
        name: "Academic Items",
        subcategories: ["Thesis", "Lab Report", "Project File", "Drawing Sheet", "Practical Copy", "Academic Folder"]
      },
      {
        name: "Sports Equipment",
        subcategories: ["Football", "Cricket Bat", "Badminton Racket", "Jersey", "Football Boots", "Sports Bag"]
      },
      {
        name: "Money & Valuables",
        subcategories: ["Cash", "ATM Card", "Credit Card", "Debit Card", "Gift Card", "Cheque Book"]
      },
      {
        name: "Vehicles & Transport",
        subcategories: ["Bicycle", "Motorcycle Helmet", "Bicycle Lock", "Bike Accessories"]
      },
      {
        name: "Personal Items",
        subcategories: ["Water Bottle", "Lunch Box", "Cosmetic Bag", "Medicine", "Prayer Mat", "Miscellaneous Personal Items"]
      },
      {
        name: "Other",
        subcategories: ["Other"]
      }
    ];
    CATEGORIES = CATEGORY_STRUCTURE.map((c) => c.name);
  }
});

// server/utils/profile.ts
var profile_exports = {};
__export(profile_exports, {
  calculateProfileCompletion: () => calculateProfileCompletion,
  evaluateVerification: () => evaluateVerification,
  inferFacultyFromDepartment: () => inferFacultyFromDepartment,
  isValidFacultyDepartment: () => isValidFacultyDepartment,
  syncAndEvaluateUser: () => syncAndEvaluateUser
});
function inferFacultyFromDepartment(department) {
  if (!department || typeof department !== "string") return null;
  const cleanDept = department.trim().toLowerCase();
  for (const group of DEPARTMENT_GROUPS) {
    for (const d of group.departments) {
      if (d.name.trim().toLowerCase() === cleanDept) return group.label;
      if (d.aliases && d.aliases.some((a) => a.toLowerCase() === cleanDept || cleanDept.includes(a.toLowerCase()))) {
        return group.label;
      }
      const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5 ? `${d.name} (${d.aliases[0]})` : d.name;
      if (formatted.trim().toLowerCase() === cleanDept) return group.label;
    }
  }
  return null;
}
function isValidFacultyDepartment(faculty, department) {
  if (!faculty || !department) return false;
  const facultyGroup = DEPARTMENT_GROUPS.find(
    (g) => g.label.trim().toLowerCase() === faculty.trim().toLowerCase()
  );
  if (!facultyGroup) return false;
  return facultyGroup.departments.some((d) => {
    if (d.name.trim().toLowerCase() === department.trim().toLowerCase()) return true;
    if (d.aliases && d.aliases.some((a) => a.toLowerCase() === department.trim().toLowerCase() || department.toLowerCase().includes(a.toLowerCase()))) {
      return true;
    }
    const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5 ? `${d.name} (${d.aliases[0]})` : d.name;
    return formatted.trim().toLowerCase() === department.trim().toLowerCase();
  });
}
function calculateProfileCompletion(user) {
  const hasPhoto = !!(user.avatar || user.profilePhoto || user.profile_photo || user.profileImage);
  const hasFirstName = !!user.firstName;
  const hasLastName = !!user.lastName;
  const hasEmail = !!user.email;
  const hasPhone = !!user.phone;
  const hasStudentId = !!(user.studentId || user.student_id);
  const hasFaculty = !!user.faculty;
  const hasDept = !!user.department;
  const hasSession = !!(user.academicSession || user.session_year || user.sessionYear);
  const hasRole = !!user.role;
  const hasBio = !!user.bio;
  const hasAddress = !!user.address;
  const hasDob = !!user.dateOfBirth;
  const hasGender = !!user.gender;
  const hasBloodGroup = !!user.bloodGroup;
  const hasResidentialHall = !!user.residentialHall;
  const hasEmergencyContact = !!user.emergencyContact;
  const hasEmergencyContactName = !!user.emergencyContactName;
  const hasSocialLink = !!(user.socialLink || user.facebook || user.linkedin);
  const checklist = {
    "Profile Photo": hasPhoto,
    "First Name": hasFirstName,
    "Last Name": hasLastName,
    "Email Address": hasEmail,
    "Phone Number": hasPhone,
    "Registration Number": hasStudentId,
    "Faculty": hasFaculty,
    "Department": hasDept,
    "Academic Session": hasSession,
    "Role": hasRole,
    "Bio": hasBio,
    "Address": hasAddress,
    "Date of Birth": hasDob,
    "Gender": hasGender,
    "Blood Group": hasBloodGroup,
    "Residential Hall": hasResidentialHall,
    "Emergency Contact Phone": hasEmergencyContact,
    "Emergency Contact Name": hasEmergencyContactName,
    "Social Link": hasSocialLink
  };
  const fields = [
    { label: "Profile Photo", value: hasPhoto },
    { label: "First Name", value: hasFirstName },
    { label: "Last Name", value: hasLastName },
    { label: "Email Address", value: hasEmail },
    { label: "Phone Number", value: hasPhone },
    { label: "Registration Number", value: hasStudentId },
    { label: "Faculty", value: hasFaculty },
    { label: "Department", value: hasDept },
    { label: "Academic Session", value: hasSession },
    { label: "Role", value: hasRole },
    { label: "Bio", value: hasBio },
    { label: "Address", value: hasAddress },
    { label: "Date of Birth", value: hasDob },
    { label: "Gender", value: hasGender },
    { label: "Blood Group", value: hasBloodGroup },
    { label: "Residential Hall", value: hasResidentialHall },
    { label: "Emergency Contact Phone", value: hasEmergencyContact },
    { label: "Emergency Contact Name", value: hasEmergencyContactName },
    { label: "Social Link", value: hasSocialLink }
  ];
  const filledCount = fields.filter((f) => f.value).length;
  const completion = Math.round(filledCount / fields.length * 100);
  const missingFields = fields.filter((f) => !f.value).map((f) => f.label);
  return {
    completion,
    checklist,
    missingFields
  };
}
function evaluateVerification(user, allUsers = []) {
  const isEmailVerified = !!(user.emailVerified || user.email_verified);
  const hasPhoto = !!(user.avatar || user.profilePhoto || user.profile_photo || user.profileImage);
  const hasFirstName = !!(user.firstName || "").trim();
  const hasLastName = !!(user.lastName || "").trim();
  const hasPhone = !!(user.phone || "").trim();
  const hasFaculty = !!(user.faculty || "").trim();
  const hasDept = !!(user.department || "").trim();
  const hasSession = !!(user.academicSession || user.session_year || user.sessionYear || "").trim();
  const hasStudentId = !!(user.studentId || user.student_id || "").trim();
  const completion = user.profileCompleted || user.profileCompletion || 0;
  const missingRequirements = [];
  if (!isEmailVerified) missingRequirements.push("Firebase email verified");
  if (!hasPhoto) missingRequirements.push("Profile Photo exists");
  if (!hasFirstName) missingRequirements.push("First Name exists");
  if (!hasLastName) missingRequirements.push("Last Name exists");
  if (!hasPhone) missingRequirements.push("Phone exists");
  if (!hasFaculty) missingRequirements.push("Faculty selected");
  if (!hasDept) missingRequirements.push("Department selected");
  if (!hasSession) missingRequirements.push("Academic Session selected");
  if (!hasStudentId) missingRequirements.push("Registration Number added");
  if (completion < 75) missingRequirements.push("Profile completion >= 75%");
  const isIdVerified = user.idVerificationStatus === "verified" || user.isVerified === true || user.is_verified === true || user.verified === true;
  if (!isIdVerified) missingRequirements.push("Institutional Registration Number verified by administrator");
  const isStaff = user.role === "admin" || user.role === "moderator" || user.role === "coordinator";
  const isVerified = isIdVerified && !isStaff;
  return {
    isVerified,
    verifiedAt: isVerified ? user.verifiedAt || (/* @__PURE__ */ new Date()).toISOString() : null,
    verificationSource: isVerified ? user.verificationSource || "administrator" : null,
    missingRequirements
  };
}
function syncAndEvaluateUser(user, allUsers = []) {
  const synced = { ...user };
  synced.firebaseUid = synced.firebaseUid || synced.id || "";
  synced.provider = synced.provider || (synced.password_hash ? "email" : "google");
  synced.firstName = synced.firstName || "";
  synced.lastName = synced.lastName || "";
  const originalUser = allUsers.find((u) => {
    if (!u) return false;
    const uId2 = String(u.id || u.user_id || u._id || u.firebaseUid || "");
    const sId = String(synced.id || synced.user_id || synced._id || synced.firebaseUid || "");
    if (sId && uId2 && sId === uId2) return true;
    const uFb = String(u.firebaseUid || "");
    const sFb = String(synced.firebaseUid || "");
    if (sFb && uFb && sFb === uFb) return true;
    const uEmail = u.email ? String(u.email).trim().toLowerCase() : "";
    const sEmail = synced.email ? String(synced.email).trim().toLowerCase() : "";
    if (sEmail && uEmail && sEmail === uEmail) return true;
    return false;
  });
  const origPhoto = originalUser ? originalUser.avatar || originalUser.profilePhoto || originalUser.profileImage || originalUser.profile_photo || "" : "";
  let finalAvatar = "";
  if (synced.avatar !== void 0 && synced.avatar !== null && synced.avatar !== "") {
    finalAvatar = synced.avatar;
  } else if (synced.profilePhoto !== void 0 && synced.profilePhoto !== null && synced.profilePhoto !== "") {
    finalAvatar = synced.profilePhoto;
  } else if (synced.profileImage !== void 0 && synced.profileImage !== null && synced.profileImage !== "") {
    finalAvatar = synced.profileImage;
  } else if (synced.profile_photo !== void 0 && synced.profile_photo !== null && synced.profile_photo !== "") {
    finalAvatar = synced.profile_photo;
  } else {
    finalAvatar = origPhoto;
  }
  synced.avatar = finalAvatar;
  synced.profileImage = finalAvatar;
  synced.profilePhoto = finalAvatar;
  synced.profile_photo = finalAvatar;
  if (originalUser) {
    if (synced.phone === void 0 && (originalUser.phone || originalUser.phoneNumber || originalUser.phone_number)) {
      synced.phone = originalUser.phone || originalUser.phoneNumber || originalUser.phone_number;
    }
    if (synced.faculty === void 0 && originalUser.faculty) {
      synced.faculty = originalUser.faculty;
    }
    if (synced.department === void 0 && originalUser.department) {
      synced.department = originalUser.department;
    }
    if (synced.academicSession === void 0 && (originalUser.academicSession || originalUser.sessionYear || originalUser.session_year)) {
      synced.academicSession = originalUser.academicSession || originalUser.sessionYear || originalUser.session_year;
    }
    if (synced.studentId === void 0 && (originalUser.studentId || originalUser.registrationNumber || originalUser.student_id)) {
      synced.studentId = originalUser.studentId || originalUser.registrationNumber || originalUser.student_id;
    }
    if (synced.gender === void 0 && originalUser.gender) {
      synced.gender = originalUser.gender;
    }
    if (synced.dateOfBirth === void 0 && originalUser.dateOfBirth) {
      synced.dateOfBirth = originalUser.dateOfBirth;
    }
    if (synced.address === void 0 && originalUser.address) {
      synced.address = originalUser.address;
    }
    if (synced.emergencyContact === void 0 && originalUser.emergencyContact) {
      synced.emergencyContact = originalUser.emergencyContact;
    }
    if (synced.emergencyContactName === void 0 && originalUser.emergencyContactName) {
      synced.emergencyContactName = originalUser.emergencyContactName;
    }
    if (synced.bloodGroup === void 0 && originalUser.bloodGroup) {
      synced.bloodGroup = originalUser.bloodGroup;
    }
    if ((synced.residentialHall === void 0 || synced.residentialHall === "") && (originalUser.residentialHall || originalUser.residential_hall || originalUser.hall)) {
      synced.residentialHall = originalUser.residentialHall || originalUser.residential_hall || originalUser.hall;
    }
    if (synced.socialLink === void 0 && (originalUser.socialLink || originalUser.facebook || originalUser.linkedin)) {
      synced.socialLink = originalUser.socialLink || originalUser.facebook || originalUser.linkedin;
    }
    if (synced.bio === void 0 && originalUser.bio) {
      synced.bio = originalUser.bio;
    }
    const incomingRoll = synced.classRoll !== void 0 && synced.classRoll !== null && String(synced.classRoll).trim() !== "" ? String(synced.classRoll).trim() : synced.rollNumber !== void 0 && synced.rollNumber !== null && String(synced.rollNumber).trim() !== "" ? String(synced.rollNumber).trim() : synced.roll !== void 0 && synced.roll !== null && String(synced.roll).trim() !== "" ? String(synced.roll).trim() : synced.class_roll !== void 0 && synced.class_roll !== null && String(synced.class_roll).trim() !== "" ? String(synced.class_roll).trim() : void 0;
    if (incomingRoll === void 0 && (originalUser.classRoll || originalUser.rollNumber || originalUser.roll || originalUser.class_roll)) {
      const origRoll = originalUser.classRoll || originalUser.rollNumber || originalUser.roll || originalUser.class_roll;
      synced.classRoll = origRoll;
      synced.rollNumber = origRoll;
      synced.roll = origRoll;
      synced.class_roll = origRoll;
    } else if (incomingRoll !== void 0) {
      synced.classRoll = incomingRoll;
      synced.rollNumber = incomingRoll;
      synced.roll = incomingRoll;
      synced.class_roll = incomingRoll;
    }
    if (synced.verificationDocument === void 0 && originalUser.verificationDocument) {
      synced.verificationDocument = originalUser.verificationDocument;
    }
    if (synced.idVerificationStatus === void 0 && originalUser.idVerificationStatus) {
      synced.idVerificationStatus = originalUser.idVerificationStatus;
    }
    if (synced.idVerificationRemarks === void 0 && originalUser.idVerificationRemarks) {
      synced.idVerificationRemarks = originalUser.idVerificationRemarks;
    }
    if (synced.verified === void 0 && originalUser.verified !== void 0) {
      synced.verified = originalUser.verified;
    }
    if (synced.isVerified === void 0 && originalUser.isVerified !== void 0) {
      synced.isVerified = originalUser.isVerified;
    }
    if (synced.createdAt === void 0 && (originalUser.createdAt || originalUser.created_at)) {
      synced.createdAt = originalUser.createdAt || originalUser.created_at;
    }
    if (synced.created_at === void 0 && (originalUser.createdAt || originalUser.created_at)) {
      synced.created_at = originalUser.createdAt || originalUser.created_at;
    }
    if (synced.idVerificationSubmittedAt === void 0 && originalUser.idVerificationSubmittedAt) {
      synced.idVerificationSubmittedAt = originalUser.idVerificationSubmittedAt;
    }
    if (synced.verifiedAt === void 0 && originalUser.verifiedAt) {
      synced.verifiedAt = originalUser.verifiedAt;
    }
  }
  if (synced.fullName && (!synced.firstName || !synced.lastName)) {
    const parts = synced.fullName.trim().split(/\s+/);
    if (parts.length > 0) {
      synced.firstName = synced.firstName || parts[0];
      if (parts.length > 1) {
        synced.lastName = synced.lastName || parts.slice(1).join(" ");
      }
    }
  } else if (!synced.fullName && (synced.firstName || synced.lastName)) {
    synced.fullName = `${synced.firstName} ${synced.lastName}`.trim();
  }
  synced.fullName = synced.fullName || synced.full_name || "";
  synced.full_name = synced.fullName;
  synced.email = synced.email || "";
  synced.passwordHash = synced.passwordHash || synced.password_hash || "";
  synced.password_hash = synced.passwordHash;
  const rawReg = synced.studentId !== void 0 && String(synced.studentId).trim() !== "" ? String(synced.studentId).trim() : synced.student_id !== void 0 && String(synced.student_id).trim() !== "" ? String(synced.student_id).trim() : synced.registrationNumber !== void 0 && String(synced.registrationNumber).trim() !== "" ? String(synced.registrationNumber).trim() : "";
  synced.studentId = rawReg;
  synced.registrationNumber = rawReg;
  synced.student_id = rawReg;
  synced.department = synced.department || "";
  synced.academicSession = synced.academicSession || synced.session_year || synced.sessionYear || "";
  synced.session_year = synced.academicSession;
  synced.sessionYear = synced.academicSession;
  synced.faculty = synced.faculty || "";
  if (synced.department) {
    for (const group of DEPARTMENT_GROUPS) {
      for (const d of group.departments) {
        const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5 ? `${d.name} (${d.aliases[0]})` : d.name;
        if (d.name.trim().toLowerCase() === synced.department.trim().toLowerCase() || formatted.trim().toLowerCase() === synced.department.trim().toLowerCase() || d.aliases && d.aliases.some((a) => a.toLowerCase() === synced.department.trim().toLowerCase())) {
          synced.department = d.name;
          if (!synced.faculty) {
            synced.faculty = group.label;
          }
          break;
        }
      }
    }
  }
  synced.semester = synced.semester || "";
  synced.phone = synced.phone !== void 0 && String(synced.phone).trim() !== "" ? String(synced.phone).trim() : synced.phoneNumber !== void 0 && String(synced.phoneNumber).trim() !== "" ? String(synced.phoneNumber).trim() : synced.phone_number !== void 0 && String(synced.phone_number).trim() !== "" ? String(synced.phone_number).trim() : "";
  synced.phoneNumber = synced.phone;
  synced.phone_number = synced.phone;
  const finalRoll = synced.classRoll !== void 0 && synced.classRoll !== null && String(synced.classRoll).trim() !== "" ? String(synced.classRoll).trim() : synced.rollNumber !== void 0 && synced.rollNumber !== null && String(synced.rollNumber).trim() !== "" ? String(synced.rollNumber).trim() : synced.roll !== void 0 && synced.roll !== null && String(synced.roll).trim() !== "" ? String(synced.roll).trim() : synced.class_roll !== void 0 && synced.class_roll !== null && String(synced.class_roll).trim() !== "" ? String(synced.class_roll).trim() : "";
  synced.classRoll = finalRoll;
  synced.rollNumber = finalRoll;
  synced.roll = finalRoll;
  synced.class_roll = finalRoll;
  synced.dateOfBirth = synced.dateOfBirth || "";
  synced.gender = synced.gender || "";
  synced.address = synced.address || "";
  synced.emergencyContact = synced.emergencyContact || "";
  synced.emergencyContactName = synced.emergencyContactName || "";
  synced.residentialHall = synced.residentialHall !== void 0 && synced.residentialHall !== null && String(synced.residentialHall).trim() !== "" ? String(synced.residentialHall).trim() : synced.residential_hall !== void 0 && synced.residential_hall !== null && String(synced.residential_hall).trim() !== "" ? String(synced.residential_hall).trim() : synced.hall !== void 0 && synced.hall !== null && String(synced.hall).trim() !== "" ? String(synced.hall).trim() : "";
  synced.residential_hall = synced.residentialHall;
  synced.hall = synced.residentialHall;
  synced.facebook = synced.facebook || "";
  synced.linkedin = synced.linkedin || "";
  if (synced.socialLink && !synced.facebook && !synced.linkedin) {
    if (synced.socialLink.includes("linkedin.com")) {
      synced.linkedin = synced.socialLink;
    } else if (synced.socialLink.includes("facebook.com")) {
      synced.facebook = synced.socialLink;
    } else {
      synced.facebook = synced.socialLink;
    }
  }
  synced.socialLink = synced.facebook || synced.linkedin || synced.socialLink || "";
  synced.bio = synced.bio || "";
  synced.role = synced.role || "student";
  const isStaffRole = synced.role === "admin" || synced.role === "moderator" || synced.role === "coordinator";
  if (isStaffRole) {
    synced.status = synced.status && synced.status !== "Pending" ? synced.status : "Active";
    synced.accountStatus = synced.accountStatus && synced.accountStatus !== "Pending" ? synced.accountStatus : "Active";
    synced.emailVerified = true;
    synced.email_verified = true;
    synced.registrationCompleted = true;
    synced.verificationCode = null;
    synced.verificationCodeExpires = null;
  } else {
    synced.status = synced.status || "Pending";
    synced.accountStatus = synced.accountStatus || synced.status;
    if (synced.status !== synced.accountStatus) {
      synced.accountStatus = synced.status;
    }
    synced.verificationCode = user.verificationCode !== void 0 && user.verificationCode !== null ? String(user.verificationCode).trim() : originalUser && originalUser.verificationCode ? String(originalUser.verificationCode).trim() : null;
    synced.verificationCodeExpires = user.verificationCodeExpires || user.verificationExpiresAt || user.verificationExpires || (originalUser ? originalUser.verificationCodeExpires || originalUser.verificationExpiresAt || originalUser.verificationExpires : null);
  }
  synced.verificationExpires = synced.verificationCodeExpires;
  synced.verificationExpiresAt = synced.verificationCodeExpires;
  synced.otpAttempts = synced.otpAttempts !== void 0 ? Number(synced.otpAttempts) : originalUser && originalUser.otpAttempts !== void 0 ? Number(originalUser.otpAttempts) : 0;
  synced.lastOtpSentAt = synced.lastOtpSentAt || user.verificationSentAt || (originalUser ? originalUser.lastOtpSentAt || originalUser.verificationSentAt : null);
  synced.verificationSentAt = user.verificationSentAt || synced.lastOtpSentAt || (originalUser ? originalUser.verificationSentAt || originalUser.lastOtpSentAt : null);
  synced.verificationAttempts = synced.verificationAttempts !== void 0 ? Number(synced.verificationAttempts) : originalUser && originalUser.verificationAttempts !== void 0 ? Number(originalUser.verificationAttempts) : 0;
  synced.registrationCompleted = synced.registrationCompleted !== void 0 ? !!synced.registrationCompleted : originalUser ? !!originalUser.registrationCompleted : synced.emailVerified || false;
  synced.emailVerified = synced.emailVerified !== void 0 ? !!synced.emailVerified : synced.is_verified !== void 0 ? !!synced.is_verified : originalUser ? !!(originalUser.emailVerified || originalUser.email_verified) : false;
  let resolvedIdStatus = user.idVerificationStatus || "";
  if (!resolvedIdStatus || resolvedIdStatus === "unverified") {
    if (originalUser && originalUser.idVerificationStatus && originalUser.idVerificationStatus !== "unverified") {
      resolvedIdStatus = originalUser.idVerificationStatus;
    } else if (originalUser && (originalUser.isVerified === true || originalUser.is_verified === true || originalUser.verified === true)) {
      resolvedIdStatus = "verified";
    } else if (user.isVerified === true || user.is_verified === true || user.verified === true) {
      resolvedIdStatus = "verified";
    }
  }
  const resolvedDoc = user.verificationDocument !== void 0 && user.verificationDocument !== null && String(user.verificationDocument).trim() !== "" ? String(user.verificationDocument).trim() : originalUser && originalUser.verificationDocument ? String(originalUser.verificationDocument).trim() : "";
  if ((!resolvedIdStatus || resolvedIdStatus === "unverified") && resolvedDoc) {
    resolvedIdStatus = "pending";
  }
  if (!resolvedIdStatus) {
    resolvedIdStatus = "unverified";
  }
  const resolvedRemarks = user.idVerificationRemarks !== void 0 && user.idVerificationRemarks !== null ? String(user.idVerificationRemarks) : originalUser && originalUser.idVerificationRemarks ? String(originalUser.idVerificationRemarks) : "";
  const resolvedSubmittedAt = user.idVerificationSubmittedAt || (originalUser ? originalUser.idVerificationSubmittedAt : null) || (resolvedDoc ? (/* @__PURE__ */ new Date()).toISOString() : null);
  const isApprovedVerified = resolvedIdStatus === "verified";
  const resolvedVerifiedAt = isApprovedVerified ? user.verifiedAt || (originalUser ? originalUser.verifiedAt : null) || (/* @__PURE__ */ new Date()).toISOString() : null;
  const resolvedVerificationSource = isApprovedVerified ? user.verificationSource || (originalUser ? originalUser.verificationSource : null) || "administrator" : null;
  synced.idVerificationStatus = resolvedIdStatus;
  synced.verificationDocument = resolvedDoc;
  synced.idVerificationRemarks = resolvedRemarks;
  synced.idVerificationSubmittedAt = resolvedSubmittedAt;
  synced.verified = isApprovedVerified && !isStaffRole;
  synced.isVerified = isApprovedVerified && !isStaffRole;
  synced.is_verified = isApprovedVerified && !isStaffRole;
  synced.verifiedAt = resolvedVerifiedAt;
  synced.verificationSource = resolvedVerificationSource;
  const completionStats = calculateProfileCompletion(synced);
  synced.profileCompleted = completionStats.completion;
  synced.profileCompletion = completionStats.completion;
  const verificationStats = evaluateVerification(synced, allUsers);
  if (isApprovedVerified && !isStaffRole) {
    synced.isVerified = true;
    synced.is_verified = true;
    synced.verified = true;
  } else {
    synced.isVerified = verificationStats.isVerified;
    synced.is_verified = verificationStats.isVerified;
    synced.verified = verificationStats.isVerified;
  }
  synced.verifiedAt = synced.verified ? synced.verifiedAt || verificationStats.verifiedAt || (/* @__PURE__ */ new Date()).toISOString() : null;
  synced.verificationSource = synced.verified ? synced.verificationSource || verificationStats.verificationSource || "administrator" : null;
  synced.profileVisibility = user.profileVisibility || (originalUser ? originalUser.profileVisibility : void 0) || synced.profileVisibility || "public";
  synced.hidePhone = user.hidePhone !== void 0 ? !!user.hidePhone : originalUser && originalUser.hidePhone !== void 0 ? !!originalUser.hidePhone : synced.profileVisibility === "private";
  synced.isPhonePrivate = synced.hidePhone;
  synced.notificationSettings = user.notificationSettings || (originalUser ? originalUser.notificationSettings : void 0) || synced.notificationSettings || { sound: true, matchAlerts: true, activityBadges: true, showAcademicBadge: true };
  if (synced.notificationSettings.matchAlerts === void 0) {
    synced.notificationSettings.matchAlerts = true;
  }
  synced.accountSettings = user.accountSettings || (originalUser ? originalUser.accountSettings : void 0) || synced.accountSettings || { preferredContactMethod: "chat", autoFillDetails: true };
  synced.preferredContactMethod = user.preferredContactMethod || (originalUser ? originalUser.preferredContactMethod : void 0) || synced.accountSettings.preferredContactMethod || "chat";
  synced.language = user.language || (originalUser ? originalUser.language : void 0) || synced.language || "EN";
  synced.theme = user.theme || (originalUser ? originalUser.theme : void 0) || synced.theme || "light";
  synced.reputationScore = synced.reputationScore !== void 0 ? Number(synced.reputationScore) : 100;
  let computedLost = 0;
  let computedFound = 0;
  let computedReturns = 0;
  const uId = String(synced.id || synced.user_id || synced._id || synced.firebaseUid || "");
  if (uId) {
    try {
      const { store } = getFallbackData();
      if (store && store.items) {
        const userItems = store.items.filter((i) => {
          const itemUserId = String(i.userId || i.ownerUid || i.firebaseUid || i.postedBy && i.postedBy.userId || "");
          return itemUserId === uId && !i.isDeleted;
        });
        computedLost = userItems.filter((i) => i.type === "lost").length;
        computedFound = userItems.filter((i) => i.type === "found").length;
        computedReturns = userItems.filter((i) => i.status === "returned").length;
      }
    } catch (err) {
      console.warn("Error fetching fallbackStore items for profile sync:", err);
    }
  }
  synced.totalLostPosts = computedLost;
  synced.totalFoundPosts = computedFound;
  synced.successfulReturns = computedReturns;
  if (user) {
    user.totalLostPosts = computedLost;
    user.totalFoundPosts = computedFound;
    user.successfulReturns = computedReturns;
  }
  synced.createdAt = synced.createdAt || synced.created_at || (originalUser ? originalUser.createdAt || originalUser.created_at : null) || (/* @__PURE__ */ new Date()).toISOString();
  synced.created_at = synced.createdAt;
  synced.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  synced.updated_at = synced.updatedAt;
  synced.lastLogin = synced.lastLogin || synced.last_login || null;
  synced.refreshToken = synced.refreshToken || "";
  return synced;
}
var init_profile = __esm({
  "server/utils/profile.ts"() {
    init_data();
    init_db();
  }
});

// server/db/firestore.ts
var firestore_exports = {};
__export(firestore_exports, {
  OperationType: () => OperationType,
  deleteFirestoreDocument: () => deleteFirestoreDocument,
  getFirestoreCollection: () => getFirestoreCollection,
  getFirestoreDB: () => getFirestoreDB,
  setFirestoreDocument: () => setFirestoreDocument
});
function handleFirestoreError(error, operationType, path9) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path: path9
  };
  console.error("\u{1F525} Firestore Adapter Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
function getFirestoreDB() {
  if (isFirestoreInitialized && firestoreDb) {
    return firestoreDb;
  }
  try {
    const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs.default.existsSync(configPath)) {
      const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
      let app2;
      if ((0, import_app.getApps)().length === 0) {
        app2 = (0, import_app.initializeApp)(config);
      } else {
        app2 = (0, import_app.getApp)();
      }
      firestoreDb = (0, import_firestore.getFirestore)(app2, config.firestoreDatabaseId);
      isFirestoreInitialized = true;
      console.log("\u{1F525} Server-side Firestore Adapter initialized successfully!");
      return firestoreDb;
    } else {
      console.warn("\u26A0\uFE0F No firebase-applet-config.json found on server for Firestore Adapter.");
      return null;
    }
  } catch (err) {
    console.error("\u26A0\uFE0F Failed to initialize Firestore Adapter on server:", err.message);
    return null;
  }
}
async function getFirestoreCollection(collectionName) {
  const db = getFirestoreDB();
  if (!db) return [];
  try {
    const colRef = (0, import_firestore.collection)(db, collectionName);
    const snapshot = await (0, import_firestore.getDocs)(colRef);
    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({ ...docSnap.data(), id: docSnap.id });
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, "list" /* LIST */, collectionName);
    return [];
  }
}
async function setFirestoreDocument(collectionName, docId, data) {
  const db = getFirestoreDB();
  if (!db) return;
  try {
    const docRef = (0, import_firestore.doc)(db, collectionName, docId);
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => value === void 0 ? null : value));
    await (0, import_firestore.setDoc)(docRef, cleanData);
  } catch (err) {
    handleFirestoreError(err, "write" /* WRITE */, `${collectionName}/${docId}`);
  }
}
async function deleteFirestoreDocument(collectionName, docId) {
  const db = getFirestoreDB();
  if (!db) return;
  try {
    const docRef = (0, import_firestore.doc)(db, collectionName, docId);
    await (0, import_firestore.deleteDoc)(docRef);
  } catch (err) {
    handleFirestoreError(err, "delete" /* DELETE */, `${collectionName}/${docId}`);
  }
}
var import_app, import_firestore, import_fs, import_path, OperationType, firestoreDb, isFirestoreInitialized;
var init_firestore = __esm({
  "server/db/firestore.ts"() {
    import_app = require("firebase/app");
    import_firestore = require("firebase/firestore");
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    OperationType = /* @__PURE__ */ ((OperationType2) => {
      OperationType2["CREATE"] = "create";
      OperationType2["UPDATE"] = "update";
      OperationType2["DELETE"] = "delete";
      OperationType2["LIST"] = "list";
      OperationType2["GET"] = "get";
      OperationType2["WRITE"] = "write";
      return OperationType2;
    })(OperationType || {});
    firestoreDb = null;
    isFirestoreInitialized = false;
  }
});

// server/utils/firebase.ts
var firebase_exports = {};
__export(firebase_exports, {
  firebaseCheckUserVerificationStatus: () => firebaseCheckUserVerificationStatus,
  firebaseLoginUser: () => firebaseLoginUser,
  firebaseRegisterUser: () => firebaseRegisterUser,
  firebaseUpdateUserPassword: () => firebaseUpdateUserPassword,
  firebaseUpdateUserPasswordAdmin: () => firebaseUpdateUserPasswordAdmin,
  getFirebaseAdminAuth: () => getFirebaseAdminAuth,
  getFirebaseAuth: () => getFirebaseAuth,
  isFirebaseActive: () => isFirebaseActive
});
function getFirebaseAdminAuth() {
  if (isFirebaseAdminInitialized && firebaseAdminApp) {
    try {
      return (0, import_auth2.getAuth)(firebaseAdminApp);
    } catch (e) {
    }
  }
  try {
    const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs2.default.existsSync(configPath)) {
      const config = JSON.parse(import_fs2.default.readFileSync(configPath, "utf-8"));
      const existingApps = (0, import_app3.getApps)();
      const existing = existingApps.find((app2) => app2.name === "admin-app");
      if (existing) {
        firebaseAdminApp = existing;
      } else {
        firebaseAdminApp = (0, import_app3.initializeApp)({
          projectId: config.projectId
        }, "admin-app");
      }
      isFirebaseAdminInitialized = true;
      console.log("\u{1F525} Server-side Firebase Admin SDK initialized successfully!");
      return (0, import_auth2.getAuth)(firebaseAdminApp);
    }
  } catch (err) {
    console.warn("\u26A0\uFE0F Failed to initialize Firebase Admin SDK with config, trying default:", err.message);
    try {
      const existingApps = (0, import_app3.getApps)();
      if (existingApps.length > 0) {
        firebaseAdminApp = existingApps[0];
      } else {
        firebaseAdminApp = (0, import_app3.initializeApp)();
      }
      isFirebaseAdminInitialized = true;
      return (0, import_auth2.getAuth)(firebaseAdminApp);
    } catch (e) {
      console.error("\u26A0\uFE0F Failed to initialize Firebase Admin SDK completely:", e.message);
    }
  }
  return null;
}
async function firebaseCheckUserVerificationStatus(email) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    return { exists: false, verified: false };
  }
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    return {
      exists: true,
      verified: userRecord.emailVerified,
      uid: userRecord.uid
    };
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return { exists: false, verified: false };
    }
    if (err.message && (err.message.includes("identitytoolkit") || err.message.includes("Identity Toolkit"))) {
      console.warn("\n================================================================");
      console.warn("\u{1F449} ACTION REQUIRED: Identity Toolkit API is not enabled in your Google Cloud Project.");
      console.warn("Please visit the following URL in your browser to enable it:");
      console.warn(`https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862`);
      console.warn("================================================================\n");
      return { exists: false, verified: false };
    }
    console.warn("\u26A0\uFE0F firebaseCheckUserVerificationStatus notice:", err.message);
    return { exists: false, verified: false };
  }
}
async function firebaseUpdateUserPasswordAdmin(uid, password) {
  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) return;
  try {
    await adminAuth.updateUser(uid, { password });
    console.log(`\u{1F525} Password updated via Admin SDK for UID: ${uid}`);
  } catch (err) {
    if (err.message && (err.message.includes("identitytoolkit") || err.message.includes("Identity Toolkit"))) {
      console.warn("\u26A0\uFE0F Admin SDK password update deferred: Identity Toolkit API is not enabled.");
      return;
    }
    console.warn("\u26A0\uFE0F Failed to update password via Admin SDK:", err.message);
  }
}
function getFirebaseAuth() {
  if (isFirebaseInitialized && firebaseAuth) {
    return firebaseAuth;
  }
  try {
    const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs2.default.existsSync(configPath)) {
      const config = JSON.parse(import_fs2.default.readFileSync(configPath, "utf-8"));
      if ((0, import_app2.getApps)().length === 0) {
        firebaseApp = (0, import_app2.initializeApp)(config);
      } else {
        firebaseApp = (0, import_app2.getApp)();
      }
      firebaseAuth = (0, import_auth.getAuth)(firebaseApp);
      isFirebaseInitialized = true;
      console.log("\u{1F525} Server-side Firebase Authentication helper initialized successfully!");
      return firebaseAuth;
    } else {
      console.warn("\u26A0\uFE0F No firebase-applet-config.json found. Firebase Auth functions will run in sandbox fallback mode.");
      return null;
    }
  } catch (err) {
    console.error("\u26A0\uFE0F Failed to initialize Firebase Auth on server:", err.message);
    return null;
  }
}
function isFirebaseActive() {
  return getFirebaseAuth() !== null;
}
async function firebaseRegisterUser(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`\u2139\uFE0F [Sandbox] Registering user ${email} directly into MongoDB cache (no Firebase URI).`);
    return { uid: `fb-user-${Date.now()}` };
  }
  try {
    const userCredential = await (0, import_auth.createUserWithEmailAndPassword)(auth, email, password);
    const user = userCredential.user;
    try {
      await (0, import_auth.sendEmailVerification)(user);
      console.log(`\u{1F4E7} Firebase verification email triggered for ${email}`);
    } catch (emailErr) {
      console.warn("\u26A0\uFE0F Failed to trigger Firebase verification email (this is normal if not configured or in sandbox):", emailErr.message);
    }
    await (0, import_auth.signOut)(auth);
    return user;
  } catch (err) {
    if (err.message && (err.message.includes("identitytoolkit") || err.message.includes("Identity Toolkit"))) {
      throw new Error("Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862");
    }
    if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
      console.log("[Firebase Sandbox Notice] Email/Password provider is not yet enabled in Firebase Console.");
    } else {
      console.log("[Firebase Sandbox Notice] Registration detail:", err.message?.replace(/error|failed/gi, "issue"));
    }
    throw new Error(err.message || "Firebase Auth registration issue.");
  }
}
async function firebaseLoginUser(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`\u2139\uFE0F [Sandbox] Authenticating user ${email} directly via MongoDB/fallback hash (no Firebase URI).`);
    return { uid: `fb-user-login-${Date.now()}`, email };
  }
  try {
    const userCredential = await (0, import_auth.signInWithEmailAndPassword)(auth, email, password);
    const user = userCredential.user;
    await (0, import_auth.signOut)(auth);
    return user;
  } catch (err) {
    if (err.message && (err.message.includes("identitytoolkit") || err.message.includes("Identity Toolkit"))) {
      throw new Error("Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862");
    }
    if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
      console.log("[Firebase Sandbox Notice] Email/Password provider is not yet enabled in Firebase Console.");
    } else {
      console.log("[Firebase Sandbox Notice] Login detail:", err.message?.replace(/error|failed/gi, "issue"));
    }
    throw new Error(err.message || "Firebase Auth login issue. Invalid email or password.");
  }
}
async function firebaseUpdateUserPassword(email, oldPassword, newPassword) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.log(`\u2139\uFE0F [Sandbox] No Firebase Active. Skipped Firebase password update for ${email}.`);
    return;
  }
  try {
    const userCredential = await (0, import_auth.signInWithEmailAndPassword)(auth, email, oldPassword);
    const user = userCredential.user;
    await (0, import_auth.updatePassword)(user, newPassword);
    console.log(`\u{1F525} Password successfully synchronized in Firebase Auth for ${email}`);
    await (0, import_auth.signOut)(auth);
  } catch (err) {
    try {
      await (0, import_auth.signOut)(auth);
    } catch (e) {
    }
    if (err.message && (err.message.includes("identitytoolkit") || err.message.includes("Identity Toolkit"))) {
      throw new Error("Identity Toolkit API is not enabled in your Google Cloud Project. Please click this link to enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=675492088862");
    }
    console.warn("\u26A0\uFE0F Firebase Auth password update deferred:", err.message);
    throw new Error(err.message || "Failed to update password in Firebase.");
  }
}
var import_app2, import_auth, import_fs2, import_path2, import_app3, import_auth2, firebaseAdminApp, isFirebaseAdminInitialized, firebaseApp, firebaseAuth, isFirebaseInitialized;
var init_firebase = __esm({
  "server/utils/firebase.ts"() {
    import_app2 = require("firebase/app");
    import_auth = require("firebase/auth");
    import_fs2 = __toESM(require("fs"), 1);
    import_path2 = __toESM(require("path"), 1);
    import_app3 = require("firebase-admin/app");
    import_auth2 = require("firebase-admin/auth");
    firebaseAdminApp = null;
    isFirebaseAdminInitialized = false;
    firebaseApp = null;
    firebaseAuth = null;
    isFirebaseInitialized = false;
  }
});

// server/db.ts
function getPendingSyncPromise() {
  return pendingSyncPromise;
}
async function triggerMongoSync() {
  if (isSyncing) {
    syncQueued = true;
    return;
  }
  isSyncing = true;
  syncQueued = false;
  try {
    pendingSyncPromise = syncToMongo();
    await pendingSyncPromise;
  } catch (err) {
    console.error("MongoDB async sync failed:", err?.message || err);
  } finally {
    isSyncing = false;
    pendingSyncPromise = null;
    if (syncQueued) {
      triggerMongoSync();
    }
  }
}
function saveFallbackStore() {
  try {
    import_fs3.default.writeFileSync(STORE_FILE, JSON.stringify(fallbackStore, null, 2), "utf-8");
    if (isMongoDBActive()) {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
      syncDebounceTimer = setTimeout(() => {
        syncDebounceTimer = null;
        triggerMongoSync();
      }, 500);
    }
  } catch (err) {
    console.error("Failed to write local backup file:", err);
  }
}
async function syncToMongo() {
  try {
    const promises = [];
    for (const u of fallbackStore.users) {
      const uData = { ...u };
      delete uData._id;
      delete uData.__v;
      if (!uData.id && uData.user_id) uData.id = String(uData.user_id);
      const filterConditions = [];
      if (uData.id) filterConditions.push({ id: uData.id });
      if (uData.email) filterConditions.push({ email: uData.email.trim().toLowerCase() });
      if (filterConditions.length > 0) {
        promises.push(
          MUser.updateOne(
            { $or: filterConditions },
            { $set: uData },
            { upsert: true }
          ).catch((err) => {
            console.warn(`User update warning in syncToMongo for ${uData.email || uData.id}:`, err.message);
          })
        );
      }
    }
    for (const i of fallbackStore.items) {
      const iData = { ...i };
      delete iData._id;
      if (!iData.id && i.item_id) iData.id = String(i.item_id);
      promises.push(MItem.updateOne({ id: iData.id }, iData, { upsert: true }));
    }
    for (const n of fallbackStore.notifications) {
      const cleanTitle = (n.title || "").trim().replace(/^notification:?/i, "").trim();
      const cleanMsg = sanitizeNotificationText(n.message || n.text || "");
      const mData = {
        id: n.id,
        user_id: String(n.user_id || n.userId || ""),
        title: cleanTitle && cleanTitle.toLowerCase() !== "notification" ? cleanTitle : "Notification",
        message: cleanMsg || "Campus alert notification",
        type: n.type || "info",
        is_read: n.unread !== void 0 ? !n.unread : !!n.is_read
      };
      delete mData._id;
      promises.push(MNotification.updateOne({ id: n.id }, mData, { upsert: true }));
    }
    if (fallbackStore.admin_notifications) {
      for (const an of fallbackStore.admin_notifications) {
        const anData = { ...an };
        delete anData._id;
        promises.push(MAdminNotification.updateOne({ id: anData.id }, anData, { upsert: true }));
      }
    }
    if (fallbackStore.conversation_reports) {
      for (const r of fallbackStore.conversation_reports) {
        const rData = { ...r };
        delete rData._id;
        promises.push(MConversationReport.updateOne({ reportId: rData.reportId }, rData, { upsert: true }));
      }
    }
    if (fallbackStore.admin_activity_logs) {
      for (const l of fallbackStore.admin_activity_logs) {
        const lData = { ...l };
        delete lData._id;
        promises.push(MAdminActivityLog.updateOne({ id: lData.id }, lData, { upsert: true }));
      }
    }
    for (const t of fallbackStore.threads) {
      const tData = { ...t };
      delete tData._id;
      if (!tData.id && t.thread_id) tData.id = String(t.thread_id);
      promises.push(MChatThread.updateOne({ id: tData.id }, tData, { upsert: true }));
    }
    for (const k of fallbackStore.searchKeywords) {
      const kData = { ...k };
      delete kData._id;
      promises.push(MSearchKeyword.updateOne({ keyword: kData.keyword }, kData, { upsert: true }));
    }
    if (fallbackStore.searchLogs) {
      for (const sl of fallbackStore.searchLogs) {
        const slData = { ...sl };
        delete slData._id;
        const slId = slData._id || slData.id || new import_mongoose2.default.Types.ObjectId().toString();
        if (!slData.id) slData.id = String(slId);
        promises.push(MSearchLog.updateOne({ keyword: slData.keyword, timestamp: slData.timestamp, userId: slData.userId }, slData, { upsert: true }));
      }
    }
    if (fallbackStore.claims) {
      for (const c of fallbackStore.claims) {
        const cData = { ...c };
        delete cData._id;
        promises.push(MClaim.updateOne({ claim_id: cData.claim_id }, cData, { upsert: true }));
      }
    }
    if (fallbackStore.listing_revisions) {
      for (const r of fallbackStore.listing_revisions) {
        const rData = { ...r };
        delete rData._id;
        promises.push(MListingRevision.updateOne({ revisionId: rData.revisionId }, rData, { upsert: true }));
      }
    }
    if (fallbackStore.faculties) {
      for (const f of fallbackStore.faculties) {
        const fData = { ...f };
        delete fData._id;
        promises.push(MFaculty.updateOne({ id: fData.id }, fData, { upsert: true }));
      }
    }
    if (fallbackStore.departments) {
      for (const d of fallbackStore.departments) {
        const dData = { ...d };
        delete dData._id;
        promises.push(MDepartment.updateOne({ id: dData.id }, dData, { upsert: true }));
      }
    }
    await Promise.all(promises);
    console.log("\u{1F4BE} Synced cache changes to MongoDB successfully!");
  } catch (err) {
    console.warn("\u26A0\uFE0F Failed to sync changes to MongoDB:", err.message);
  }
}
async function normalizeItemCategories(items) {
  let changed = false;
  for (const item of items) {
    const originalCategory = item.category;
    const originalSubcategory = item.subcategory;
    const { category, subcategory } = mapOldCategory(originalCategory, originalSubcategory);
    if (item.category !== category || item.subcategory !== subcategory) {
      item.category = category;
      item.subcategory = subcategory;
      changed = true;
      if (isMongoDBActive()) {
        try {
          await MItem.updateOne(
            { id: item.id },
            { $set: { category, subcategory } }
          );
        } catch (err) {
          console.warn(`\u26A0\uFE0F Failed to update item ${item.id} category in MongoDB:`, err.message);
        }
      }
    }
  }
  return changed;
}
async function reloadFallbackStoreFromMongoDB(force = false) {
  if (!isMongoDBActive()) {
    return;
  }
  const now = Date.now();
  if (!force && now - lastReloadTime < RELOAD_THROTTLE_MS) {
    return;
  }
  lastReloadTime = now;
  try {
    const fetchWithTimeout = async () => {
      return await Promise.all([
        MUser.find().maxTimeMS(3e3).lean().catch(() => []),
        MItem.find().maxTimeMS(3e3).lean().catch(() => []),
        MNotification.find().maxTimeMS(3e3).lean().catch(() => []),
        MAdminNotification.find().maxTimeMS(3e3).lean().catch(() => []),
        MConversationReport.find().maxTimeMS(3e3).lean().catch(() => []),
        MAdminActivityLog.find().maxTimeMS(3e3).lean().catch(() => []),
        MChatThread.find().maxTimeMS(3e3).lean().catch(() => []),
        MSearchKeyword.find().maxTimeMS(3e3).lean().catch(() => []),
        MSearchLog.find().maxTimeMS(3e3).lean().catch(() => []),
        MClaim.find().maxTimeMS(3e3).lean().catch(() => []),
        MListingRevision.find().maxTimeMS(3e3).lean().catch(() => []),
        MFaculty.find().maxTimeMS(3e3).lean().catch(() => []),
        MDepartment.find().maxTimeMS(3e3).lean().catch(() => [])
      ]);
    };
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(() => reject(new Error("MongoDB reload timeout")), 4e3)
    );
    const [
      users,
      items,
      notifications,
      admin_notifications,
      conversation_reports,
      admin_activity_logs,
      threads,
      searchKeywords,
      searchLogs,
      claims,
      listing_revisions,
      faculties,
      departments
    ] = await Promise.race([fetchWithTimeout(), timeoutPromise]);
    if (items && items.length > 0) {
      await normalizeItemCategories(items);
    }
    if (items && items.length > 0) {
      for (const it of items) {
        it.id = String(it.id || it._id || it.item_id || "");
        if (it.status === "closed") {
          it.status = "active";
          if (isMongoDBActive()) {
            MItem.updateOne({ id: it.id }, { $set: { status: "active" } }).catch(() => {
            });
          }
        }
        if (it.approvalStatus === "approved" || it.approval_status === "approved" || it.isApproved === true || it.status === "active") {
          if (it.approvalStatus !== "rejected" && it.status !== "rejected") {
            it.approvalStatus = "approved";
            it.isApproved = true;
          }
        }
      }
    }
    if (users && users.length > 0) fallbackStore.users = users;
    if (items && items.length > 0) fallbackStore.items = items;
    if (notifications) {
      fallbackStore.notifications = notifications.map((n) => ({
        id: String(n.id || n._id),
        user_id: String(n.user_id || n.userId || ""),
        userId: String(n.user_id || n.userId || ""),
        text: n.message || n.text || "",
        time: n.created_at || n.createdAt ? new Date(n.created_at || n.createdAt).toLocaleDateString() : "Just now",
        unread: n.is_read !== void 0 ? !n.is_read : n.unread !== void 0 ? !!n.unread : true
      }));
    }
    if (admin_notifications && admin_notifications.length > 0) {
      fallbackStore.admin_notifications = admin_notifications.map((an) => ({
        id: String(an.id || an._id || generateUniqueId("an")),
        title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, "").split(":")[0] : "Campus Activity Alert"),
        message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, "") : "New moderation or activity update on campus."),
        type: an.type || "system",
        category: an.category || "System",
        priority: an.priority || "medium",
        isRead: an.isRead === true || an.isRead === 1,
        relatedUserId: an.relatedUserId ? String(an.relatedUserId) : "",
        relatedItemId: an.relatedItemId ? String(an.relatedItemId) : "",
        relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : "",
        createdAt: an.createdAt || an.created_at || (/* @__PURE__ */ new Date()).toISOString()
      }));
    }
    if (conversation_reports && conversation_reports.length > 0) fallbackStore.conversation_reports = conversation_reports;
    if (admin_activity_logs && admin_activity_logs.length > 0) fallbackStore.admin_activity_logs = admin_activity_logs;
    if (threads && threads.length > 0) fallbackStore.threads = threads;
    if (searchKeywords && searchKeywords.length > 0) fallbackStore.searchKeywords = searchKeywords;
    if (searchLogs && searchLogs.length > 0) fallbackStore.searchLogs = searchLogs;
    if (claims && claims.length > 0) fallbackStore.claims = claims;
    if (listing_revisions && listing_revisions.length > 0) fallbackStore.listing_revisions = listing_revisions;
    if (faculties && faculties.length > 0) fallbackStore.faculties = faculties;
    if (departments && departments.length > 0) fallbackStore.departments = departments;
    console.log("\u{1F504} Reloaded data models from MongoDB successfully!");
  } catch (err) {
    console.warn("\u26A0\uFE0F Notice: MongoDB reload deferred, using cached store:", err.message);
  }
}
function seedFacultiesAndDepartments() {
  const seededFaculties = [
    { id: "faculty-arts", faculty_name: "Faculty of Arts" },
    { id: "faculty-science-engineering", faculty_name: "Faculty of Science and Engineering" },
    { id: "faculty-social-science", faculty_name: "Faculty of Social Science" },
    { id: "faculty-business-admin", faculty_name: "Faculty of Business Administration" },
    { id: "faculty-law", faculty_name: "Faculty of Law" },
    { id: "faculty-fine-arts", faculty_name: "Faculty of Fine Arts" }
  ];
  const seededDepartments = [
    // Faculty of Arts
    { id: "dept-bangla", faculty_id: "faculty-arts", department_name: "Bangla Language and Literature" },
    { id: "dept-english", faculty_id: "faculty-arts", department_name: "English Language and Literature" },
    { id: "dept-music", faculty_id: "faculty-arts", department_name: "Music" },
    { id: "dept-theatre", faculty_id: "faculty-arts", department_name: "Theatre and Performance Studies" },
    { id: "dept-film", faculty_id: "faculty-arts", department_name: "Film and Media Studies" },
    { id: "dept-philosophy", faculty_id: "faculty-arts", department_name: "Philosophy" },
    { id: "dept-history", faculty_id: "faculty-arts", department_name: "History" },
    // Faculty of Science and Engineering
    { id: "dept-cse", faculty_id: "faculty-science-engineering", department_name: "Computer Science and Engineering (CSE)" },
    { id: "dept-eee", faculty_id: "faculty-science-engineering", department_name: "Electrical and Electronic Engineering (EEE)" },
    { id: "dept-ese", faculty_id: "faculty-science-engineering", department_name: "Environmental Science and Engineering (ESE)" },
    { id: "dept-statistics", faculty_id: "faculty-science-engineering", department_name: "Statistics" },
    // Faculty of Social Science
    { id: "dept-economics", faculty_id: "faculty-social-science", department_name: "Economics" },
    { id: "dept-public-admin", faculty_id: "faculty-social-science", department_name: "Public Administration and Governance Studies" },
    { id: "dept-folklore", faculty_id: "faculty-social-science", department_name: "Folklore" },
    { id: "dept-anthropology", faculty_id: "faculty-social-science", department_name: "Anthropology" },
    { id: "dept-population-science", faculty_id: "faculty-social-science", department_name: "Population Science" },
    { id: "dept-local-govt", faculty_id: "faculty-social-science", department_name: "Local Government and Urban Development" },
    { id: "dept-sociology", faculty_id: "faculty-social-science", department_name: "Sociology" },
    // Faculty of Business Administration
    { id: "dept-ais", faculty_id: "faculty-business-admin", department_name: "Accounting and Information Systems" },
    { id: "dept-finance", faculty_id: "faculty-business-admin", department_name: "Finance and Banking" },
    { id: "dept-hrm", faculty_id: "faculty-business-admin", department_name: "Human Resource Management" },
    { id: "dept-management", faculty_id: "faculty-business-admin", department_name: "Management" },
    { id: "dept-marketing", faculty_id: "faculty-business-admin", department_name: "Marketing" },
    // Faculty of Law
    { id: "dept-law", faculty_id: "faculty-law", department_name: "Law and Justice" },
    // Faculty of Fine Arts
    { id: "dept-fine-arts", faculty_id: "faculty-fine-arts", department_name: "Fine Arts" }
  ];
  if (!fallbackStore.faculties || fallbackStore.faculties.length === 0) {
    fallbackStore.faculties = seededFaculties;
  }
  if (!fallbackStore.departments || fallbackStore.departments.length === 0) {
    fallbackStore.departments = seededDepartments;
  }
}
async function loadFallbackStore() {
  try {
    const mongoConnected = await connectMongoDB();
    if (mongoConnected) {
      try {
        const mockUserEmails = ["rahul@jkkniu.edu", "rahul.cse@jkkniu.edu", "tania.eee@jkkniu.edu", "sifat.bba@jkkniu.edu", "mim.ais@jkkniu.edu", "fahim.econ@jkkniu.edu"];
        await MUser.deleteMany({ email: { $in: mockUserEmails } });
        const users = await MUser.find().maxTimeMS(4e3).lean().catch(() => []);
        const items = await MItem.find().maxTimeMS(4e3).lean().catch(() => []);
        const notifications = await MNotification.find().maxTimeMS(4e3).lean().catch(() => []);
        const admin_notifications = await MAdminNotification.find().maxTimeMS(4e3).lean().catch(() => []);
        const conversation_reports = await MConversationReport.find().maxTimeMS(4e3).lean().catch(() => []);
        const admin_activity_logs = await MAdminActivityLog.find().maxTimeMS(4e3).lean().catch(() => []);
        const threads = await MChatThread.find().maxTimeMS(4e3).lean().catch(() => []);
        const searchKeywords = await MSearchKeyword.find().maxTimeMS(4e3).lean().catch(() => []);
        if (users.length > 0) {
          fallbackStore.users = users;
        } else {
          for (const u of fallbackStore.users) {
            await MUser.updateOne({ id: String(u.id) }, u, { upsert: true });
          }
        }
        if (items.length > 0) {
          await normalizeItemCategories(items);
          for (const it of items) {
            it.id = String(it.id || it._id || it.item_id || "");
            if (it.approvalStatus === "approved" || it.approval_status === "approved" || it.isApproved === true || it.status === "active") {
              if (it.approvalStatus !== "rejected" && it.status !== "rejected") {
                it.approvalStatus = "approved";
                it.isApproved = true;
              }
            }
          }
          fallbackStore.items = items;
        } else {
          for (const i of fallbackStore.items) {
            await MItem.updateOne({ id: String(i.id) }, i, { upsert: true });
          }
        }
        if (notifications.length > 0) {
          fallbackStore.notifications = notifications;
        } else {
          for (const n of fallbackStore.notifications) {
            await MNotification.updateOne({ id: String(n.id) }, n, { upsert: true });
          }
        }
        if (threads.length > 0) {
          fallbackStore.threads = threads;
        } else {
          for (const t of fallbackStore.threads) {
            await MChatThread.updateOne({ id: String(t.id) }, t, { upsert: true });
          }
        }
        if (admin_notifications.length > 0) {
          fallbackStore.admin_notifications = admin_notifications.map((an) => ({
            id: String(an.id || an._id || generateUniqueId("an")),
            title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, "").split(":")[0] : "Campus Activity Alert"),
            message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, "") : "New moderation or activity update on campus."),
            type: an.type || "system",
            category: an.category || "System",
            priority: an.priority || "medium",
            isRead: an.isRead === true || an.isRead === 1,
            relatedUserId: an.relatedUserId ? String(an.relatedUserId) : "",
            relatedItemId: an.relatedItemId ? String(an.relatedItemId) : "",
            relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : "",
            createdAt: an.createdAt || an.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }));
        }
        if (conversation_reports.length > 0) fallbackStore.conversation_reports = conversation_reports;
        if (admin_activity_logs.length > 0) fallbackStore.admin_activity_logs = admin_activity_logs;
        if (searchKeywords.length > 0) fallbackStore.searchKeywords = searchKeywords;
        try {
          const claims = await MClaim.find().lean();
          if (claims.length > 0) {
            fallbackStore.claims = claims;
          }
        } catch (claimsErr) {
          console.warn("\u26A0\uFE0F Failed to load claims from MongoDB:", claimsErr.message);
        }
        try {
          const revisions = await MListingRevision.find().lean();
          if (revisions.length > 0) {
            fallbackStore.listing_revisions = revisions;
          }
        } catch (revErr) {
          console.warn("\u26A0\uFE0F Failed to load listing revisions from MongoDB:", revErr.message);
        }
        try {
          const faculties = await MFaculty.find().lean();
          const departments = await MDepartment.find().lean();
          if (faculties.length > 0) {
            fallbackStore.faculties = faculties;
          }
          if (departments.length > 0) {
            fallbackStore.departments = departments;
          }
        } catch (facErr) {
          console.warn("\u26A0\uFE0F Failed to load faculties/departments from MongoDB:", facErr.message);
        }
        console.log("\u{1F4E6} Successfully synchronized and preloaded all data models from MongoDB!");
      } catch (mongoLoadErr) {
        console.warn("\u26A0\uFE0F Failed to load models from MongoDB, using local file backup:", mongoLoadErr.message);
      }
    }
    if (import_fs3.default.existsSync(STORE_FILE)) {
      const content = import_fs3.default.readFileSync(STORE_FILE, "utf-8");
      const localData = JSON.parse(content);
      if (!mongoConnected) {
        fallbackStore = localData;
      } else {
        if (localData.system_settings) {
          fallbackStore.system_settings = localData.system_settings;
        }
      }
    } else {
      saveFallbackStore();
    }
    seedFacultiesAndDepartments();
    await runUserMigration();
    applyCustomAdminCredentials();
    seedMockData();
  } catch (err) {
    console.error("Failed to read fallback data store file, using in-memory default:", err);
    await runUserMigration();
    applyCustomAdminCredentials();
    seedMockData();
  }
}
async function runUserMigration() {
  console.log("\u{1F680} Starting Automated Database Schema Migration...");
  try {
    let migratedCount = 0;
    if (fallbackStore.users && fallbackStore.users.length > 0) {
      const { syncAndEvaluateUser: syncAndEvaluateUser2 } = await Promise.resolve().then(() => (init_profile(), profile_exports));
      for (let i = 0; i < fallbackStore.users.length; i++) {
        const originalUser = fallbackStore.users[i];
        const migratedUser = syncAndEvaluateUser2(originalUser, fallbackStore.users);
        fallbackStore.users[i] = migratedUser;
        if (isMongoDBActive()) {
          await MUser.updateOne({ id: migratedUser.id }, migratedUser, { upsert: true });
        }
        migratedCount++;
      }
      import_fs3.default.writeFileSync(STORE_FILE, JSON.stringify(fallbackStore, null, 2), "utf-8");
    }
    console.log(`\u2705 Automated User Migration completed! Migrated ${migratedCount} user records.`);
  } catch (migrationErr) {
    console.error("\u26A0\uFE0F User migration error:", migrationErr.message);
  }
}
function applyCustomAdminCredentials() {
  const adminEmail = "nazrulretrievers@gmail.com";
  const adminPassword = "Admin123@";
  const passwordHash = import_bcryptjs.default.hashSync(adminPassword, 10);
  let adminUser = fallbackStore.users.find((u) => u.role === "admin");
  if (adminUser) {
    adminUser.email = adminEmail;
    adminUser.password_hash = passwordHash;
  } else {
    adminUser = {
      id: "2",
      student_id: "ADMIN-009",
      studentId: "ADMIN-009",
      full_name: "Admin",
      fullName: "Admin",
      email: adminEmail,
      password_hash: passwordHash,
      passwordHash,
      department: "ICT Administration",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "admin",
      phone: "+880 1712-999999",
      session_year: "Staff",
      sessionYear: "Staff",
      avatar: "SA",
      profilePhoto: "SA",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 0,
      totalFoundPosts: 0,
      successfulReturns: 0
    };
    fallbackStore.users.push(adminUser);
  }
  fallbackStore.users.forEach((u) => {
    if (u.email.toLowerCase() === adminEmail.toLowerCase()) {
      u.role = "admin";
    }
  });
  saveFallbackStore();
  console.log(`\u{1F511} Admin fallback account configured: ${adminEmail}`);
}
function seedMockData() {
  console.log("\u2139\uFE0F Seeding of mock data has been disabled.");
  return;
  if (fallbackStore.items && fallbackStore.items.length > 0) {
    console.log("\u2139\uFE0F DB already populated with items. Skipping seeding.");
    return;
  }
  console.log("\u{1F331} Seeding fallbackStore with rich, realistic lost & found database logs...");
  const passwordHash = import_bcryptjs.default.hashSync("Password123@", 10);
  const seededUsers = [
    {
      id: "user-1",
      student_id: "STU-2023-001",
      studentId: "STU-2023-001",
      full_name: "Rahul Chowdhury",
      fullName: "Rahul Chowdhury",
      email: "rahul.cse@jkkniu.edu",
      password_hash: passwordHash,
      passwordHash,
      department: "Computer Science and Engineering (CSE)",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "student",
      phone: "+880 1711-111111",
      session_year: "2023-24",
      sessionYear: "2023-24",
      avatar: "RC",
      profilePhoto: "RC",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 3,
      totalFoundPosts: 1,
      successfulReturns: 0
    },
    {
      id: "user-2",
      student_id: "STU-2023-002",
      studentId: "STU-2023-002",
      full_name: "Tania Sultana",
      fullName: "Tania Sultana",
      email: "tania.eee@jkkniu.edu",
      password_hash: passwordHash,
      passwordHash,
      department: "Electrical and Electronic Engineering (EEE)",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "student",
      phone: "+880 1722-222222",
      session_year: "2023-24",
      sessionYear: "2023-24",
      avatar: "TS",
      profilePhoto: "TS",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 1,
      totalFoundPosts: 2,
      successfulReturns: 1
    },
    {
      id: "user-3",
      student_id: "STU-2024-005",
      studentId: "STU-2024-005",
      full_name: "Sifat Ahmed",
      fullName: "Sifat Ahmed",
      email: "sifat.bba@jkkniu.edu",
      password_hash: passwordHash,
      passwordHash,
      department: "Management",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "student",
      phone: "+880 1733-333333",
      session_year: "2024-25",
      sessionYear: "2024-25",
      avatar: "SA",
      profilePhoto: "SA",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 0,
      totalFoundPosts: 2,
      successfulReturns: 1
    },
    {
      id: "user-4",
      student_id: "STU-2022-019",
      studentId: "STU-2022-019",
      full_name: "Tasmia Mim",
      fullName: "Tasmia Mim",
      email: "mim.ais@jkkniu.edu",
      password_hash: passwordHash,
      passwordHash,
      department: "Accounting and Information Systems",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "student",
      phone: "+880 1744-444444",
      session_year: "2022-23",
      sessionYear: "2022-23",
      avatar: "TM",
      profilePhoto: "TM",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 1,
      totalFoundPosts: 2,
      successfulReturns: 2
    },
    {
      id: "user-5",
      student_id: "STU-2021-042",
      studentId: "STU-2021-042",
      full_name: "Fahim Rahman",
      fullName: "Fahim Rahman",
      email: "fahim.econ@jkkniu.edu",
      password_hash: passwordHash,
      passwordHash,
      department: "Economics",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      role: "student",
      phone: "+880 1755-555555",
      session_year: "2021-22",
      sessionYear: "2021-22",
      avatar: "FR",
      profilePhoto: "FR",
      status: "active",
      profileCompletion: 100,
      profileVisibility: "public",
      reputationScore: 100,
      totalLostPosts: 2,
      totalFoundPosts: 0,
      successfulReturns: 0
    }
  ];
  const admin = fallbackStore.users.find((u) => u.role === "admin") || fallbackStore.users[0];
  fallbackStore.users = admin ? [admin, ...seededUsers] : seededUsers;
  const dateBase = /* @__PURE__ */ new Date();
  const getPastDateString = (daysAgo) => {
    const d = new Date(dateBase);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };
  const seededItems = [
    {
      id: "item-1",
      emoji: "\u{1F9EE}",
      title: "TI-84 Plus CE Graphing Calculator",
      category: "Electronics",
      description: "Lost my black TI-84 Plus CE graphing calculator during the mid-term exam. It has a small silver scratch on the back side.",
      type: "lost",
      location: "Central Library",
      specificSpot: "3rd floor reading desk, north side",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&w=300&q=80",
      views: 45,
      status: "active",
      approvalStatus: "approved",
      userId: "user-1",
      firebaseUid: "user-1",
      email: "rahul.cse@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Rahul Chowdhury",
        department: "Computer Science and Engineering (CSE)",
        avatar: "RC",
        initials: "RC"
      },
      createdAt: getPastDateString(4),
      updatedAt: getPastDateString(4)
    },
    {
      id: "item-2",
      emoji: "\u{1F3A7}",
      title: "AirPods Pro with MagSafe Case",
      category: "Electronics",
      description: "Found a set of AirPods Pro in their wireless charging case. Describe the case/engraving or show proof of bluetooth connection to claim.",
      type: "found",
      location: "BBA Building",
      specificSpot: "Cafeteria second row table, left corner",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1588449668338-d1516882e471?auto=format&fit=crop&w=300&q=80",
      views: 18,
      status: "active",
      approvalStatus: "approved",
      userId: "user-2",
      firebaseUid: "user-2",
      email: "tania.eee@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Tania Sultana",
        department: "Electrical and Electronic Engineering (EEE)",
        avatar: "TS",
        initials: "TS"
      },
      createdAt: getPastDateString(3),
      updatedAt: getPastDateString(3)
    },
    {
      id: "item-3",
      emoji: "\u{1F4BC}",
      title: "Black Leather Wallet containing ID Cards",
      category: "Other",
      description: "Lost a genuine leather black bi-fold wallet containing National ID, JKKNIU Student Card and some emergency cash.",
      type: "lost",
      location: "Social Science Building",
      specificSpot: "Room 402 corner seat on the left",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80",
      views: 29,
      status: "active",
      approvalStatus: "approved",
      userId: "user-5",
      firebaseUid: "user-5",
      email: "fahim.econ@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Fahim Rahman",
        department: "Economics",
        avatar: "FR",
        initials: "FR"
      },
      createdAt: getPastDateString(2),
      updatedAt: getPastDateString(2)
    },
    {
      id: "item-4",
      emoji: "\u{1F4BB}",
      title: "HP Pavilion 15-inch Blue Laptop",
      category: "Electronics",
      description: "Found a blue HP Pavilion laptop in a black sleeve case. Handed over to the department office but claiming online is preferred with correct password confirmation.",
      type: "found",
      location: "Old Administration Building",
      specificSpot: "Awaiting Coordinator Verification",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=300&q=80",
      views: 98,
      status: "returned",
      approvalStatus: "approved",
      userId: "user-4",
      firebaseUid: "user-4",
      email: "mim.ais@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Tasmia Mim",
        department: "Accounting and Information Systems",
        avatar: "TM",
        initials: "TM"
      },
      createdAt: getPastDateString(6),
      updatedAt: getPastDateString(1)
    },
    {
      id: "item-5",
      emoji: "\u{1F4DA}",
      title: "Standard Calculus: Early Transcendentals Book",
      category: "Books & Stationery",
      description: 'Lost a heavy printed copy of Calculus: Early Transcendentals by James Stewart. Left it in the classroom, has "Rahul-CSE" written on page 10.',
      type: "lost",
      location: "New Science Building",
      specificSpot: "Room 312 near the whiteboard",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80",
      views: 14,
      status: "active",
      approvalStatus: "approved",
      userId: "user-1",
      firebaseUid: "user-1",
      email: "rahul.cse@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Rahul Chowdhury",
        department: "Computer Science and Engineering (CSE)",
        avatar: "RC",
        initials: "RC"
      },
      createdAt: getPastDateString(1),
      updatedAt: getPastDateString(1)
    },
    {
      id: "item-6",
      emoji: "\u{1F4F1}",
      title: "Redmi Note 12 Smartphone (Green Case)",
      category: "Electronics",
      description: "Found a green Redmi Note 12 smartphone on the stairs. Battery is dead. Bring your charger and enter the screen lock pattern to claim.",
      type: "found",
      location: "Bidrohi Hall",
      specificSpot: "East block stairs 2nd floor",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80",
      views: 37,
      status: "active",
      approvalStatus: "approved",
      userId: "user-3",
      firebaseUid: "user-3",
      email: "sifat.bba@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Sifat Ahmed",
        department: "Management",
        avatar: "SA",
        initials: "SA"
      },
      createdAt: getPastDateString(1),
      updatedAt: getPastDateString(1)
    },
    {
      id: "item-7",
      emoji: "\u{1F511}",
      title: "Bunch of Keys with Golden Heart Keychain",
      category: "Keys & Access Cards",
      description: "Found keys containing a golden heart keychain and 3 brass keys near the volleyball field.",
      type: "found",
      location: "Agnibina Hall",
      specificSpot: "Grass field near volleyball court",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=300&q=80",
      views: 22,
      status: "returned",
      approvalStatus: "approved",
      userId: "user-4",
      firebaseUid: "user-4",
      email: "mim.ais@jkkniu.edu",
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Tasmia Mim",
        department: "Accounting and Information Systems",
        avatar: "TM",
        initials: "TM"
      },
      createdAt: getPastDateString(5),
      updatedAt: getPastDateString(2)
    },
    {
      id: "item-8",
      emoji: "\u{1F4BB}",
      title: "iPad Air 5th Generation with Pink Folio",
      category: "Electronics",
      description: "URGENT: Lost my pink iPad Air 5th Gen with all my lecture notes. Left on a desk in library reading area.",
      type: "lost",
      location: "Central Library",
      specificSpot: "2nd floor quiet study zone",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=300&q=80",
      views: 5,
      status: "pending",
      approvalStatus: "pending",
      userId: "user-4",
      firebaseUid: "user-4",
      email: "mim.ais@jkkniu.edu",
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Tasmia Mim",
        department: "Accounting and Information Systems",
        avatar: "TM",
        initials: "TM"
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    },
    {
      id: "item-9",
      emoji: "\u231A",
      title: "Silver Seiko Chronograph Men's Watch",
      category: "Accessories",
      description: "Found a heavy stainless steel Seiko quartz watch on the sink in the washroom.",
      type: "found",
      location: "Dhulonchapa Hall",
      specificSpot: "Common washroom basin mirror stand",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=300&q=80",
      views: 3,
      status: "pending",
      approvalStatus: "pending",
      userId: "user-2",
      firebaseUid: "user-2",
      email: "tania.eee@jkkniu.edu",
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Tania Sultana",
        department: "Electrical and Electronic Engineering (EEE)",
        avatar: "TS",
        initials: "TS"
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    },
    {
      id: "item-10",
      emoji: "\u{1F9EE}",
      title: "Scientific Calculator fx-991EX ClassWiz",
      category: "Electronics",
      description: "Lost my pink fx-991EX Classwiz scientific calculator with engineering department stickers on the lid.",
      type: "lost",
      location: "New Kola Bhaban",
      specificSpot: "Room 205 bench 3",
      rewardOffered: "",
      image: "https://images.unsplash.com/photo-1543269664-76bc3997d9ea?auto=format&fit=crop&w=300&q=80",
      views: 1,
      status: "pending",
      approvalStatus: "pending",
      userId: "user-1",
      firebaseUid: "user-1",
      email: "rahul.cse@jkkniu.edu",
      isApproved: false,
      isRejected: false,
      isDeleted: false,
      postedBy: {
        name: "Rahul Chowdhury",
        department: "Computer Science and Engineering (CSE)",
        avatar: "RC",
        initials: "RC"
      },
      createdAt: getPastDateString(0),
      updatedAt: getPastDateString(0)
    }
  ];
  fallbackStore.items = seededItems;
  fallbackStore.searchKeywords = [];
  fallbackStore.claims = [];
  fallbackStore.admin_notifications = [
    {
      id: "an-1",
      title: "New Awaiting Listing Approval",
      message: 'Tasmia Mim posted a new lost listing: "iPad Air 5th Generation with Pink Folio" awaiting coordinator approval.',
      type: "Listing",
      category: "Lost Items",
      priority: "high",
      relatedUserId: "user-4",
      relatedItemId: "item-8",
      isRead: false,
      createdAt: getPastDateString(0)
    },
    {
      id: "an-2",
      title: "New Verification Claim Submitted",
      message: 'Sifat Ahmed submitted a validation claim on "AirPods Pro with MagSafe Case" stating high-proof indicators.',
      type: "Claim",
      category: "Claims",
      priority: "medium",
      relatedUserId: "user-3",
      relatedItemId: "item-2",
      isRead: false,
      createdAt: getPastDateString(1)
    }
  ];
  saveFallbackStore();
  console.log("\u{1F389} Seeding fallbackStore completed successfully!");
}
function sanitizeNotificationText(raw) {
  if (!raw) return "";
  let str = String(raw).trim();
  let prev = "";
  while (prev !== str) {
    prev = str;
    str = str.replace(/^(?:<strong[^>]*>)?\s*notification\s*(?:<\/strong>)?\s*:\s*/i, "").replace(/^notification\s*:\s*/i, "").replace(/^(?:<strong[^>]*>)?\s*alert\s*(?:<\/strong>)?\s*:\s*/i, "").replace(/^alert\s*:\s*/i, "").trim();
  }
  return str;
}
function getFallbackData() {
  if (!fallbackStore.claims) {
    fallbackStore.claims = [];
  }
  if (!fallbackStore.notifications) {
    fallbackStore.notifications = [];
  } else {
    fallbackStore.notifications = fallbackStore.notifications.map((n) => {
      const cleanTitle = (n.title || "").trim().replace(/^notification:?/i, "").trim();
      const rawText = sanitizeNotificationText(n.text || "");
      const rawMsg = sanitizeNotificationText(n.message || "");
      let text = rawText || rawMsg;
      if (!text || text.trim().length === 0) {
        if (cleanTitle && cleanTitle.toLowerCase() !== "notification" && rawMsg) {
          text = `<strong>${cleanTitle}</strong>: ${rawMsg}`;
        } else if (rawMsg) {
          text = rawMsg;
        } else if (cleanTitle && cleanTitle.toLowerCase() !== "notification") {
          text = `<strong>${cleanTitle}</strong>`;
        } else {
          text = "Campus alert notification";
        }
      }
      text = sanitizeNotificationText(text);
      const isUnread = n.unread !== false && n.is_read !== true && n.isRead !== true && n.read !== true;
      return {
        id: String(n.id || n._id || generateUniqueId("notif")),
        userId: String(n.userId || n.user_id || ""),
        user_id: String(n.user_id || n.userId || ""),
        text,
        title: cleanTitle && cleanTitle.toLowerCase() !== "notification" ? cleanTitle : "Notification",
        message: rawMsg || text,
        time: n.time || (n.createdAt || n.created_at ? new Date(n.createdAt || n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"),
        unread: isUnread,
        isRead: !isUnread,
        is_read: !isUnread,
        type: n.type || "general",
        createdAt: n.createdAt || n.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    });
  }
  if (!fallbackStore.admin_notifications) {
    fallbackStore.admin_notifications = [];
  } else {
    fallbackStore.admin_notifications = fallbackStore.admin_notifications.map((an) => ({
      id: String(an.id || an._id || generateUniqueId("an")),
      title: an.title || (an.text ? an.text.replace(/<[^>]*>?/gm, "").split(":")[0] : "Campus Activity Alert"),
      message: an.message || (an.text ? an.text.replace(/<[^>]*>?/gm, "") : "New moderation or activity update on campus."),
      type: an.type || "system",
      category: an.category || "System",
      priority: an.priority || "medium",
      isRead: an.isRead === true || an.isRead === 1,
      relatedUserId: an.relatedUserId ? String(an.relatedUserId) : "",
      relatedItemId: an.relatedItemId ? String(an.relatedItemId) : "",
      relatedConversationId: an.relatedConversationId ? String(an.relatedConversationId) : "",
      createdAt: an.createdAt || an.created_at || (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
  if (!fallbackStore.conversation_reports) {
    fallbackStore.conversation_reports = [];
  }
  if (!fallbackStore.admin_activity_logs) {
    fallbackStore.admin_activity_logs = [];
  }
  if (!fallbackStore.listing_revisions) {
    fallbackStore.listing_revisions = [];
  }
  return {
    store: fallbackStore,
    save: saveFallbackStore
  };
}
function generateUniqueId(prefix = "notif") {
  const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  return `${prefix}-${Date.now()}-${rand}`;
}
async function createUserNotification(notif) {
  try {
    const { store, save } = getFallbackData();
    const notifId = generateUniqueId("notif");
    const uId = String(notif.userId || "");
    if (!uId) return null;
    const cleanTitle = (notif.title || "").trim().replace(/^notification:?/i, "").trim();
    const cleanMsg = sanitizeNotificationText(notif.message || "");
    const cleanTxt = sanitizeNotificationText(notif.text || "");
    let text = cleanTxt;
    if (!text) {
      if (cleanTitle && cleanTitle.toLowerCase() !== "notification" && cleanMsg) {
        text = `<strong>${cleanTitle}</strong>: ${cleanMsg}`;
      } else if (cleanMsg) {
        text = cleanMsg;
      } else if (cleanTitle && cleanTitle.toLowerCase() !== "notification") {
        text = `<strong>${cleanTitle}</strong>`;
      } else {
        text = "Campus alert notification";
      }
    }
    text = sanitizeNotificationText(text);
    const newNotifItem = {
      id: notifId,
      user_id: uId,
      userId: uId,
      title: cleanTitle && cleanTitle.toLowerCase() !== "notification" ? cleanTitle : "Notification",
      message: cleanMsg || text,
      text,
      time: "Just now",
      unread: true,
      isRead: false,
      is_read: false,
      type: notif.type || "general",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift(newNotifItem);
    save();
    if (isMongoDBActive()) {
      try {
        await MNotification.updateOne(
          { id: notifId },
          {
            $set: {
              id: notifId,
              user_id: uId,
              title: newNotifItem.title,
              message: newNotifItem.text,
              type: notif.type || "general",
              is_read: false
            }
          },
          { upsert: true }
        );
      } catch (mErr) {
        console.warn("MongoDB MNotification update note:", mErr.message);
      }
    }
    return newNotifItem;
  } catch (err) {
    console.error("Failed to create user notification:", err);
    return null;
  }
}
async function createAdminNotification(notif) {
  const priority = notif.priority || "medium";
  try {
    const { store, save } = getFallbackData();
    const newNotif = {
      id: generateUniqueId("an"),
      title: notif.title || "Campus Activity Alert",
      message: notif.message || "",
      type: notif.type || "system",
      category: notif.category || "System",
      priority,
      relatedUserId: notif.relatedUserId ? String(notif.relatedUserId) : "",
      relatedItemId: notif.relatedItemId ? String(notif.relatedItemId) : "",
      relatedConversationId: notif.relatedConversationId ? String(notif.relatedConversationId) : "",
      isRead: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.admin_notifications.unshift(newNotif);
    save();
    if (isMongoDBActive()) {
      try {
        await MAdminNotification.updateOne(
          { id: newNotif.id },
          { $set: newNotif },
          { upsert: true }
        );
      } catch (mErr) {
        console.warn("MongoDB AdminNotification update note:", mErr.message);
      }
    }
    try {
      const { setFirestoreDocument: setFirestoreDocument2, getFirestoreDB: getFirestoreDB2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
      if (getFirestoreDB2()) {
        await setFirestoreDocument2("admin_notifications", newNotif.id, newNotif);
      }
    } catch (fsErr) {
    }
    return newNotif;
  } catch (err) {
    console.error("Failed to create admin notification:", err);
  }
}
async function logAdminActivity(adminId, action, targetType, targetId, ipAddress) {
  try {
    const { store, save } = getFallbackData();
    const newLog = {
      id: `aal-${Date.now()}-${Math.round(Math.random() * 1e3)}`,
      adminId,
      action,
      targetType,
      targetId,
      ipAddress,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.admin_activity_logs.unshift(newLog);
    save();
    return newLog;
  } catch (err) {
    console.error("Failed to log admin activity:", err);
  }
}
function deleteLocalFileSafely(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== "string") return;
  try {
    let filename = "";
    if (fileUrlOrPath.includes("/server-uploads/")) {
      filename = fileUrlOrPath.split("/server-uploads/")[1];
    } else if (fileUrlOrPath.includes("server-uploads/")) {
      filename = fileUrlOrPath.split("server-uploads/")[1];
    } else if (!fileUrlOrPath.includes("/") && !fileUrlOrPath.includes("\\") && fileUrlOrPath.includes("-")) {
      filename = fileUrlOrPath;
    }
    if (filename) {
      filename = filename.split("?")[0];
      const filePath = import_path3.default.join(process.cwd(), "server-uploads", filename);
      if (import_fs3.default.existsSync(filePath)) {
        import_fs3.default.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error("Error deleting local file:", fileUrlOrPath, err);
  }
}
async function performCascadeDeleteUser(userId, extraUserInfo) {
  const sUserId = String(userId);
  console.log(`[CASCADE DELETE] Starting cascading delete for user: ${sUserId}`);
  let itemIds = [];
  let fUid = extraUserInfo?.firebaseUid || "";
  let userEmail = extraUserInfo?.email ? String(extraUserInfo.email).trim().toLowerCase() : "";
  const userEmailsSet = /* @__PURE__ */ new Set();
  if (userEmail) userEmailsSet.add(userEmail);
  if (isMongoDBActive()) {
    try {
      const queryConds = [{ id: sUserId }, { firebaseUid: sUserId }];
      if (import_mongoose2.default.default.Types.ObjectId.isValid(sUserId)) {
        queryConds.push({ _id: sUserId });
      }
      if (userEmail) {
        queryConds.push({ email: userEmail }, { email: new RegExp(`^${userEmail}$`, "i") });
      }
      const dbUser = await MUser.findOne({ $or: queryConds });
      if (dbUser) {
        if (dbUser.firebaseUid) fUid = dbUser.firebaseUid || fUid;
        if (dbUser.email) {
          const dbEmail = String(dbUser.email).trim().toLowerCase();
          userEmailsSet.add(dbEmail);
          userEmail = dbEmail;
        }
        if (dbUser.avatar) deleteLocalFileSafely(dbUser.avatar);
        if (dbUser.profileImage) deleteLocalFileSafely(dbUser.profileImage);
        if (dbUser.profilePhoto) deleteLocalFileSafely(dbUser.profilePhoto);
        if (dbUser.verificationDocument) deleteLocalFileSafely(dbUser.verificationDocument);
      }
    } catch (err) {
      console.error("Error fetching MongoDB user for files deletion:", err);
    }
  }
  const { store, save } = getFallbackData();
  const storeUser = (store.users || []).find(
    (u) => String(u.id) === sUserId || String(u._id) === sUserId || u.firebaseUid && String(u.firebaseUid) === sUserId || userEmail && String(u.email || "").trim().toLowerCase() === userEmail
  );
  if (storeUser) {
    if (storeUser.firebaseUid) fUid = storeUser.firebaseUid || fUid;
    if (storeUser.email) {
      const stEmail = String(storeUser.email).trim().toLowerCase();
      userEmailsSet.add(stEmail);
      if (!userEmail) userEmail = stEmail;
    }
    if (storeUser.avatar) deleteLocalFileSafely(storeUser.avatar);
    if (storeUser.profileImage) deleteLocalFileSafely(storeUser.profileImage);
    if (storeUser.profilePhoto) deleteLocalFileSafely(storeUser.profilePhoto);
    if (storeUser.verificationDocument) deleteLocalFileSafely(storeUser.verificationDocument);
  }
  if (!fUid && sUserId.startsWith("fb-user-")) {
    fUid = sUserId;
  }
  const userIdsSet = [sUserId];
  if (fUid && !userIdsSet.includes(fUid)) userIdsSet.push(fUid);
  if (extraUserInfo?._id && !userIdsSet.includes(String(extraUserInfo._id))) {
    userIdsSet.push(String(extraUserInfo._id));
  }
  if (extraUserInfo?.id && !userIdsSet.includes(String(extraUserInfo.id))) {
    userIdsSet.push(String(extraUserInfo.id));
  }
  if (extraUserInfo?.firebaseUid && !userIdsSet.includes(String(extraUserInfo.firebaseUid))) {
    userIdsSet.push(String(extraUserInfo.firebaseUid));
  }
  const allEmailsArray = Array.from(userEmailsSet);
  if (isMongoDBActive()) {
    try {
      const itemQueryConds = [
        { userId: { $in: userIdsSet } },
        { ownerUid: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } },
        { "postedBy.userId": { $in: userIdsSet } }
      ];
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          itemQueryConds.push(
            { email: emailRegex },
            { "postedBy.email": emailRegex }
          );
        }
      }
      const dbItems = await MItem.find({ $or: itemQueryConds }).lean();
      for (const item of dbItems) {
        if (item.id) itemIds.push(String(item.id));
        if (item._id) itemIds.push(String(item._id));
        if (item.image) deleteLocalFileSafely(item.image);
        if (item.coverImage) deleteLocalFileSafely(item.coverImage);
        if (item.capturedImage) deleteLocalFileSafely(item.capturedImage);
        if (Array.isArray(item.images)) {
          for (const img of item.images) {
            if (img && img.url) deleteLocalFileSafely(img.url);
          }
        }
      }
    } catch (err) {
      console.error("Error gathering MongoDB items for cascade delete:", err);
    }
  }
  const storeItems = (store.items || []).filter((item) => {
    const itemUserId = String(item.userId || "");
    const itemOwnerUid = String(item.ownerUid || "");
    const itemFbUid = String(item.firebaseUid || "");
    const itemPostedByUid = String(item.postedBy?.userId || "");
    const itemEmail = String(item.email || item.postedBy?.email || "").trim().toLowerCase();
    if (userIdsSet.includes(itemUserId) || userIdsSet.includes(itemOwnerUid) || userIdsSet.includes(itemFbUid) || userIdsSet.includes(itemPostedByUid)) {
      return true;
    }
    if (itemEmail && allEmailsArray.includes(itemEmail)) {
      return true;
    }
    return false;
  });
  for (const item of storeItems) {
    if (item.id && !itemIds.includes(String(item.id))) {
      itemIds.push(String(item.id));
    }
    if (item._id && !itemIds.includes(String(item._id))) {
      itemIds.push(String(item._id));
    }
    if (item.image) deleteLocalFileSafely(item.image);
    if (item.coverImage) deleteLocalFileSafely(item.coverImage);
    if (item.capturedImage) deleteLocalFileSafely(item.capturedImage);
    if (Array.isArray(item.images)) {
      for (const img of item.images) {
        if (img && img.url) deleteLocalFileSafely(img.url);
      }
    }
  }
  itemIds = Array.from(new Set(itemIds));
  if (isMongoDBActive()) {
    const executeDeletes = async (sess) => {
      const opts = sess ? { session: sess } : {};
      const userDelConds = [
        { id: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } }
      ];
      if (import_mongoose2.default.default.Types.ObjectId.isValid(sUserId)) {
        userDelConds.push({ _id: sUserId });
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          userDelConds.push({ email: emailRegex });
        }
      }
      await MUser.deleteMany({ $or: userDelConds }, opts);
      const itemDelConds = [
        { userId: { $in: userIdsSet } },
        { ownerUid: { $in: userIdsSet } },
        { firebaseUid: { $in: userIdsSet } },
        { "postedBy.userId": { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        itemDelConds.push({ id: { $in: itemIds } });
        const validObjIds = itemIds.filter((id) => import_mongoose2.default.default.Types.ObjectId.isValid(id));
        if (validObjIds.length > 0) {
          itemDelConds.push({ _id: { $in: validObjIds } });
        }
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          itemDelConds.push({ email: emailRegex }, { "postedBy.email": emailRegex });
        }
      }
      await MItem.deleteMany({ $or: itemDelConds }, opts);
      const claimDelConds = [
        { user_id: { $in: userIdsSet } },
        { userId: { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        claimDelConds.push({ item_id: { $in: itemIds } }, { itemId: { $in: itemIds } });
      }
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          claimDelConds.push({ user_email: emailRegex }, { email: emailRegex });
        }
      }
      await MClaim.deleteMany({ $or: claimDelConds }, opts);
      await MChatThread.deleteMany({
        $or: [
          { participants: { $in: userIdsSet } },
          { "messages.senderId": { $in: userIdsSet } }
        ]
      }, opts);
      const notifConds = [
        { userId: { $in: userIdsSet } },
        { user_id: { $in: userIdsSet } }
      ];
      if (itemIds.length > 0) {
        notifConds.push({ itemId: { $in: itemIds } }, { item_id: { $in: itemIds } });
      }
      await MNotification.deleteMany({ $or: notifConds }, opts);
      const adminNotifConds = [{ relatedUserId: { $in: userIdsSet } }];
      if (itemIds.length > 0) adminNotifConds.push({ relatedItemId: { $in: itemIds } });
      await MAdminNotification.deleteMany({ $or: adminNotifConds }, opts);
      await MConversationReport.deleteMany({
        $or: [
          { reportedBy: { $in: userIdsSet } },
          { reportedUser: { $in: userIdsSet } }
        ]
      }, opts);
      const revConds = [{ ownerUid: { $in: userIdsSet } }];
      if (itemIds.length > 0) revConds.push({ postId: { $in: itemIds } });
      await MListingRevision.deleteMany({ $or: revConds }, opts);
      const otpConds = [{ user_id: { $in: userIdsSet } }, { userId: { $in: userIdsSet } }];
      if (allEmailsArray.length > 0) {
        for (const em of allEmailsArray) {
          const emailRegex = new RegExp(`^${em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          otpConds.push({ email: emailRegex });
        }
      }
      await MOtp.deleteMany({ $or: otpConds }, opts);
      await MSearchLog.deleteMany({ userId: { $in: userIdsSet } }, opts);
      const viewConds = [{ userId: { $in: userIdsSet } }];
      if (itemIds.length > 0) viewConds.push({ itemId: { $in: itemIds } });
      await MItemView.deleteMany({ $or: viewConds }, opts);
      await MAdminActivityLog.deleteMany({
        $or: [
          { adminId: { $in: userIdsSet } },
          { targetId: { $in: userIdsSet } }
        ],
        action: { $not: /ADMIN DELETE USER/i }
      }, opts);
      const db = import_mongoose2.default.connection.db;
      if (db) {
        const collections = await db.collections();
        for (const col of collections) {
          const colName = col.collectionName;
          if (colName.startsWith("system.")) continue;
          await col.deleteMany({
            $or: [
              { userId: { $in: userIdsSet } },
              { user_id: { $in: userIdsSet } },
              { ownerUid: { $in: userIdsSet } },
              { firebaseUid: { $in: userIdsSet } },
              { adminId: { $in: userIdsSet } },
              { targetId: { $in: userIdsSet } },
              { reportedBy: { $in: userIdsSet } },
              { reportedUser: { $in: userIdsSet } },
              { relatedUserId: { $in: userIdsSet } },
              { participants: { $in: userIdsSet } },
              { senderId: { $in: userIdsSet } },
              ...allEmailsArray.length > 0 ? [{ email: { $in: allEmailsArray } }] : []
            ],
            ...colName === "adminactivitylogs" || colName === "admin_activity_logs" ? { action: { $not: /ADMIN DELETE USER/i } } : {}
          }, opts);
          if (itemIds.length > 0) {
            await col.deleteMany({
              $or: [
                { itemId: { $in: itemIds } },
                { item_id: { $in: itemIds } },
                { postId: { $in: itemIds } },
                { id: { $in: itemIds } }
              ]
            }, opts);
          }
        }
      }
    };
    const session = await import_mongoose2.default.startSession();
    try {
      session.startTransaction();
      await executeDeletes(session);
      await session.commitTransaction();
      console.log(`[CASCADE DELETE] MongoDB transaction successfully committed for user: ${sUserId}`);
    } catch (transactionErr) {
      console.error("[CASCADE DELETE] Transaction failed or not supported. Rolling back...", transactionErr);
      await session.abortTransaction();
      console.warn("\u26A0\uFE0F Executing non-transactional cascade delete...");
      await executeDeletes();
      console.log(`[CASCADE DELETE] Resilient non-transactional cascade completed successfully for user: ${sUserId}`);
    } finally {
      session.endSession();
    }
  }
  try {
    const { getFirebaseAdminAuth: getFirebaseAdminAuth2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
    const adminAuth = getFirebaseAdminAuth2();
    if (adminAuth && fUid) {
      try {
        await adminAuth.deleteUser(fUid);
        console.log(`\u{1F525} [CASCADE DELETE] Successfully deleted user from Firebase Auth: ${fUid}`);
      } catch (fbErr) {
        console.warn("\u26A0\uFE0F [CASCADE DELETE] Non-blocking issue deleting user from Firebase Auth:", fbErr.message);
      }
    }
  } catch (err) {
    console.warn("\u26A0\uFE0F [CASCADE DELETE] Admin auth SDK import or setup issue:", err.message);
  }
  try {
    const { deleteFirestoreDocument: deleteFirestoreDocument2, getFirestoreDB: getFirestoreDB2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
    const db = getFirestoreDB2();
    if (db) {
      for (const uid of userIdsSet) {
        await deleteFirestoreDocument2("users", uid).catch(() => {
        });
      }
      for (const iid of itemIds) {
        await deleteFirestoreDocument2("items", iid).catch(() => {
        });
      }
      console.log(`\u{1F525} [CASCADE DELETE] Firestore collections cleaned for user: ${sUserId}`);
    }
  } catch (fsErr) {
    console.warn("\u26A0\uFE0F [CASCADE DELETE] Non-blocking Firestore cleanup notice:", fsErr.message);
  }
  try {
    if (store.users) {
      store.users = store.users.filter((u) => {
        const uId = String(u.id || "");
        const uObjId = String(u._id || "");
        const uFbUid = String(u.firebaseUid || "");
        const uEmail = String(u.email || "").trim().toLowerCase();
        if (userIdsSet.includes(uId) || userIdsSet.includes(uObjId) || userIdsSet.includes(uFbUid)) return false;
        if (uEmail && allEmailsArray.includes(uEmail)) return false;
        return true;
      });
    }
    store.items = (store.items || []).filter((item) => {
      const itemUserId = String(item.userId || "");
      const itemOwnerUid = String(item.ownerUid || "");
      const itemFbUid = String(item.firebaseUid || "");
      const itemPostedByUid = String(item.postedBy?.userId || "");
      const itemEmail = String(item.email || item.postedBy?.email || "").trim().toLowerCase();
      const itemId = String(item.id || "");
      const itemObjId = String(item._id || "");
      if (itemIds.includes(itemId) || itemIds.includes(itemObjId)) return false;
      if (userIdsSet.includes(itemUserId) || userIdsSet.includes(itemOwnerUid) || userIdsSet.includes(itemFbUid) || userIdsSet.includes(itemPostedByUid)) return false;
      if (itemEmail && allEmailsArray.includes(itemEmail)) return false;
      return true;
    });
    if (store.claims) {
      store.claims = store.claims.filter((claim) => {
        const cUserId = String(claim.user_id || claim.userId || "");
        const cItemId = String(claim.item_id || claim.itemId || "");
        const cEmail = String(claim.user_email || claim.email || "").trim().toLowerCase();
        if (userIdsSet.includes(cUserId) || itemIds.includes(cItemId)) return false;
        if (cEmail && allEmailsArray.includes(cEmail)) return false;
        return true;
      });
    }
    if (store.threads) {
      store.threads = store.threads.filter(
        (t) => !Array.isArray(t.participants) || !t.participants.some((p) => userIdsSet.includes(String(p)))
      );
    }
    store.notifications = (store.notifications || []).filter((n) => {
      const nUserId = String(n.userId || n.user_id || "");
      const nItemId = String(n.itemId || n.item_id || "");
      if (userIdsSet.includes(nUserId) || nItemId && itemIds.includes(nItemId)) return false;
      return true;
    });
    if (store.admin_notifications) {
      store.admin_notifications = store.admin_notifications.filter(
        (n) => !userIdsSet.includes(String(n.relatedUserId)) && (!n.relatedItemId || !itemIds.includes(String(n.relatedItemId)))
      );
    }
    if (store.conversation_reports) {
      store.conversation_reports = store.conversation_reports.filter(
        (r) => !userIdsSet.includes(String(r.reportedBy)) && !userIdsSet.includes(String(r.reportedUser))
      );
    }
    if (store.listing_revisions) {
      store.listing_revisions = store.listing_revisions.filter(
        (r) => !userIdsSet.includes(String(r.ownerUid)) && !itemIds.includes(String(r.postId))
      );
    }
    if (store.admin_activity_logs) {
      store.admin_activity_logs = store.admin_activity_logs.filter(
        (log) => log.action && log.action.includes("ADMIN DELETE USER") || !userIdsSet.includes(String(log.adminId)) && !userIdsSet.includes(String(log.targetId))
      );
    }
    if (store.otps) {
      store.otps = store.otps.filter((otp) => {
        const otpUserId = String(otp.user_id || otp.userId || "");
        const otpEmail = String(otp.email || "").trim().toLowerCase();
        if (userIdsSet.includes(otpUserId)) return false;
        if (otpEmail && allEmailsArray.includes(otpEmail)) return false;
        return true;
      });
    }
    if (store.searchLogs) {
      store.searchLogs = store.searchLogs.filter(
        (s) => !userIdsSet.includes(String(s.userId))
      );
    }
    if (store.itemViews) {
      store.itemViews = store.itemViews.filter(
        (v) => !userIdsSet.includes(String(v.userId)) && !itemIds.includes(String(v.itemId))
      );
    }
    save();
    console.log(`[CASCADE DELETE] Fallback store successfully saved for user: ${sUserId}`);
  } catch (err) {
    console.error("[CASCADE DELETE] Error in Fallback store cascade delete:", err);
  }
}
var import_fs3, import_path3, import_bcryptjs, import_mongoose2, STORE_FILE, fallbackStore, pendingSyncPromise, syncDebounceTimer, isSyncing, syncQueued, lastReloadTime, RELOAD_THROTTLE_MS;
var init_db = __esm({
  "server/db.ts"() {
    import_fs3 = __toESM(require("fs"), 1);
    import_path3 = __toESM(require("path"), 1);
    import_bcryptjs = __toESM(require("bcryptjs"), 1);
    import_mongoose2 = __toESM(require("mongoose"), 1);
    init_mongodb();
    init_data();
    STORE_FILE = import_path3.default.join(process.cwd(), "server-data-store.json");
    fallbackStore = {
      users: [
        {
          id: "2",
          student_id: "ADMIN-009",
          full_name: "Admin",
          email: "nazrulretrievers@gmail.com",
          password_hash: "$2a$10$7R0Z4eWp.9kX7E2fGsmFvO.07i92G1m8bT62K43rD7h02vC9p8vZy",
          // password is 'Admin123@'
          department: "ICT Administration",
          is_verified: 1,
          role: "admin",
          phone: "+880 1712-999999",
          session_year: "Staff",
          avatar: "SA"
        }
      ],
      items: [],
      notifications: [],
      threads: [],
      searchKeywords: [],
      searchLogs: [],
      claims: [],
      otps: [],
      listing_revisions: [],
      faculties: [],
      departments: [],
      system_settings: {
        autoApprovePosts: true,
        autoSpamFilter: true,
        maxImageSize: "5 MB per image",
        archiveDuration: "30 Days Active"
      }
    };
    pendingSyncPromise = null;
    syncDebounceTimer = null;
    isSyncing = false;
    syncQueued = false;
    lastReloadTime = 0;
    RELOAD_THROTTLE_MS = 1e4;
    loadFallbackStore();
  }
});

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_config2 = require("dotenv/config");

// server/app.ts
var import_config = require("dotenv/config");
var import_express6 = __toESM(require("express"), 1);
var import_path8 = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_mongoose7 = __toESM(require("mongoose"), 1);
init_mongodb();
init_db();

// server/routes/auth.ts
var import_express = require("express");
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"), 1);
var import_fs5 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
init_db();
init_mongodb();
var import_mongoose3 = __toESM(require("mongoose"), 1);

// server/middleware/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
init_mongodb();
init_db();
var JWT_SECRET = process.env.JWT_SECRET || "NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%";
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. Missing token." });
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.user = decoded;
    let dbUser = null;
    if (isMongoDBActive()) {
      dbUser = await MUser.findOne({ id: String(decoded.id) });
    } else {
      const { store } = getFallbackData();
      dbUser = store.users.find((u) => String(u.id) === String(decoded.id));
    }
    if (!dbUser) {
      return res.status(401).json({ error: "Access Denied: User account no longer exists in our system." });
    }
    const userStatus = (dbUser.status || "").trim().toLowerCase();
    const accountStatus = (dbUser.accountStatus || "").trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;
    if (userStatus === "suspended" || accountStatus === "suspended" || isSuspendedFlag) {
      return res.status(403).json({
        error: dbUser.role === "moderator" ? "Access Denied: Your Moderator account has been suspended by the platform administration." : "Access Denied: Your account has been suspended. Please contact university administrators."
      });
    }
    if (userStatus === "disabled" || accountStatus === "disabled") {
      return res.status(403).json({
        error: dbUser.role === "moderator" ? "Access Denied: Your Moderator privileges have been disabled by the platform administration." : "Access Denied: This account has been disabled."
      });
    }
    if (userStatus === "banned" || accountStatus === "banned") {
      return res.status(403).json({ error: "Access Denied: This account has been permanently banned." });
    }
    if (userStatus === "locked" || accountStatus === "locked") {
      return res.status(403).json({ error: "Access Denied: This account is locked for security reasons." });
    }
    if (req.user) {
      req.user.role = dbUser.role;
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired authentication token." });
  }
}
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Administrative privileges required." });
  }
  next();
}
function authorizeModOrAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin" && req.user.role !== "moderator") {
    return res.status(403).json({ error: "Access denied. Moderator or Administrative privileges required." });
  }
  next();
}

// server/utils/email.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
async function createVerifiedTransporter() {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "nazrulretrievers@gmail.com").trim().replace(/^["']|["']$/g, "");
  const rawEnvPass = (process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  const passCandidates = [
    "yquwlzrlriojkiou",
    // Verified working Google App Password
    rawEnvPass
  ].filter((p) => p && p.length === 16);
  let lastError = null;
  for (const pass of passCandidates) {
    try {
      const transporter = import_nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass
        }
      });
      await transporter.verify();
      return transporter;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to authenticate with Gmail SMTP server.");
}
async function sendVerificationEmail(toEmail, code, userName) {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "nazrulretrievers@gmail.com").trim().replace(/^["']|["']$/g, "");
  const from = process.env.SMTP_FROM || `"Nazrul Retrievers" <${emailUser}>`;
  const subject = "Verify Your Email - Nazrul Retrievers";
  const textContent = `Hello ${userName},

Thank you for registering with Nazrul Retrievers.

Your verification code is:

${code}

This code is valid for 10 minutes.

If you did not request this account, please ignore this email.

Regards,
Nazrul Retrievers Team`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 28px 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Nazrul Retrievers</h1>
        <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">JKKNIU Lost & Found System</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 16px; margin-top: 0; font-weight: 600; color: #1E293B;">Hello ${userName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering with Nazrul Retrievers.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">To secure your account and verify your identity, please use the following 6-digit verification code:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #F8FAFC; border: 2px dashed #F59E0B; padding: 14px 36px; border-radius: 12px; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0F172A; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            ${code}
          </div>
          <p style="font-size: 12px; color: #64748B; margin-top: 10px; font-weight: 600;">This code is valid for 10 minutes</p>
        </div>
        
        <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 24px; padding: 12px; background-color: #F8FAFC; border-left: 3px solid #E2E8F0; border-radius: 0 8px 8px 0;">
          <strong>Security Notice:</strong> If you did not request this account, please ignore this email. Your email address was entered in our JKKNIU student registration portal.
        </p>
        
        <p style="font-size: 13px; color: #475569;">If you experience any issues, please contact our support team at <a href="mailto:support@jkkniu.edu" style="color: #F59E0B; text-decoration: none; font-weight: 600;">support@jkkniu.edu</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 28px 0;" />
        <p style="font-size: 13px; color: #334155; margin-bottom: 0;">Regards,<br /><strong>Nazrul Retrievers Team</strong></p>
      </div>
      <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; font-weight: 500; line-height: 1.5;">
        &copy; 2026 Nazrul Retrievers \u2022 Jatiya Kabi Kazi Nazrul Islam University<br />
        Trishal, Mymensingh, Bangladesh
      </div>
    </div>
  `;
  try {
    const transporter = await createVerifiedTransporter();
    const sender = from.includes("<") ? from : `"${from.split("@")[0]}" <${from}>`;
    await transporter.sendMail({
      from: sender,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`\u{1F4E7} [Nodemailer] Verification email successfully sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`\u274C [Nodemailer Error] Failed to send verification email to ${toEmail}:`, err.message);
    throw err;
  }
}
async function sendPasswordResetEmail(toEmail, code, userName, recoveryLink) {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "nazrulretrievers@gmail.com").trim().replace(/^["']|["']$/g, "");
  const from = process.env.SMTP_FROM || `"Nazrul Retrievers" <${emailUser}>`;
  const subject = "Reset Your Password - Nazrul Retrievers";
  const textContent = `Hello ${userName},

You requested to reset your password with Nazrul Retrievers.

Your password reset verification code is:

${code}

This code is valid for 15 minutes.

Enter this 6-digit code on the password reset screen to set your new password.

If you did not request this, please ignore this email.

Regards,
Nazrul Retrievers Team`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 28px 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Nazrul Retrievers</h1>
        <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">JKKNIU Lost & Found System</p>
      </div>
      <div style="padding: 32px 24px; color: #334155;">
        <p style="font-size: 16px; margin-top: 0; font-weight: 600; color: #1E293B;">Hello ${userName},</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">We received a request to reset your password for the Nazrul Retrievers account associated with <strong>${toEmail}</strong>.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">Please use the following 6-digit verification code on the password reset screen to set your new password:</p>
        
        <div style="text-align: center; margin: 26px 0;">
          <div style="display: inline-block; background-color: #FEF3C7; border: 2px solid #F59E0B; padding: 14px 36px; border-radius: 12px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #78350F; font-family: monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
            ${code}
          </div>
          <p style="font-size: 12px; color: #64748B; margin-top: 10px; font-weight: 600;">\u23F1\uFE0F This verification code is valid for 15 minutes</p>
        </div>
        
        <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 24px; padding: 12px; background-color: #F8FAFC; border-left: 3px solid #F59E0B; border-radius: 0 8px 8px 0;">
          <strong>Security Notice:</strong> If you did not make this request, please ensure your account is secure. You can safely ignore this email if you did not request a password reset.
        </p>
        
        <p style="font-size: 13px; color: #475569;">If you experience any issues, please contact our support team at <a href="mailto:support@jkkniu.edu" style="color: #F59E0B; text-decoration: none; font-weight: 600;">support@jkkniu.edu</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 28px 0;" />
        <p style="font-size: 13px; color: #334155; margin-bottom: 0;">Regards,<br /><strong>Nazrul Retrievers Team</strong></p>
      </div>
      <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; font-weight: 500; line-height: 1.5;">
        &copy; 2026 Nazrul Retrievers \u2022 Jatiya Kabi Kazi Nazrul Islam University<br />
        Trishal, Mymensingh, Bangladesh
      </div>
    </div>
  `;
  try {
    const transporter = await createVerifiedTransporter();
    const sender = from.includes("<") ? from : `"${from.split("@")[0]}" <${from}>`;
    await transporter.sendMail({
      from: sender,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log(`\u{1F4E7} [Nodemailer] Password reset email successfully sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`\u274C [Nodemailer Error] Failed to send password reset email to ${toEmail}:`, err.message);
    throw err;
  }
}
async function sendSupportContactEmail(name, fromEmail, messageText) {
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || "";
  const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS || "";
  const host = process.env.SMTP_HOST || (emailUser ? "smtp.gmail.com" : "");
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = emailUser || process.env.SMTP_USER || "";
  const pass = emailPass || process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || (emailUser ? `"Nazrul Retrievers" <${emailUser}>` : "noreply@jkkniu.edu");
  const supportEmail = "nazrulretrievers@gmail.com";
  const subject = `New Support Ticket from ${name}`;
  const textContent = `New Support/Contact message received:

Name: ${name}
Email: ${fromEmail}

Message:
${messageText}`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; background-color: #FFFFFF; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #0F172A; padding: 24px; text-align: center;">
        <h1 style="color: #F59E0B; margin: 0; font-size: 22px; font-weight: 800;">Nazrul Retrievers Helpdesk</h1>
        <p style="color: #94A3B8; margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">New Support Inquiry</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <p style="font-size: 15px; margin-top: 0; font-weight: bold; color: #1E293B;">Hello Admin,</p>
        <p style="font-size: 14px; color: #475569;">A new inquiry has been submitted through the Contact Support form on the website.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #1E293B; width: 100px; border-bottom: 1px solid #F1F5F9;">Sender Name:</td>
            <td style="padding: 8px 0; color: #475569; border-bottom: 1px solid #F1F5F9;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #1E293B; border-bottom: 1px solid #F1F5F9;">Sender Email:</td>
            <td style="padding: 8px 0; color: #475569; border-bottom: 1px solid #F1F5F9;"><a href="mailto:${fromEmail}">${fromEmail}</a></td>
          </tr>
        </table>
        
        <div style="background-color: #F8FAFC; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap;">
          <strong>Message:</strong><br/>
          ${messageText}
        </div>
        
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94A3B8; text-align: center; margin-bottom: 0;">This email was sent automatically by Nazrul Retrievers System.</p>
      </div>
    </div>
  `;
  if (host) {
    console.log(`\u{1F4E1} [SMTP CONTACT INQUIRY ATTEMPT] Routing ticket to ${supportEmail} via host: ${host}:${port}`);
    try {
      const transporter = await createVerifiedTransporter();
      const sender = from.includes("<") ? from : `"${from.split("@")[0]}" <${from}>`;
      await transporter.sendMail({
        from: sender,
        to: supportEmail,
        replyTo: fromEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`\u{1F4E7} Support contact email successfully sent to ${supportEmail}`);
      return true;
    } catch (err) {
      console.log(`[SMTP Notice] Could not deliver support contact email to ${supportEmail} via SMTP. Using local log fallback. Details: ${err.message}`);
      try {
        const logPath = import_path4.default.join(process.cwd(), "server-smtp-error.log");
        const errorMsg = `[${(/* @__PURE__ */ new Date()).toISOString()}] SUPPORT CONTACT FROM ${fromEmail}: Status: ${err.message}
`;
        import_fs4.default.appendFileSync(logPath, errorMsg);
      } catch (logErr) {
      }
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log(`\u{1F4EC} [SUPPORT HELPLINE MAILBOX INCOMING]`);
  console.log(`To Official Mail: ${supportEmail}`);
  console.log(`Sender Name:      ${name}`);
  console.log(`Sender Email:     ${fromEmail}`);
  console.log(`Message Content:`);
  console.log(messageText);
  console.log("=".repeat(60) + "\n");
  return true;
}

// server/routes/auth.ts
init_firebase();
init_profile();

// src/utils/validation.ts
var import_zod = require("zod");
init_data();
function sanitizeInput(val) {
  if (typeof val !== "string") return val;
  return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<[^>]*>/g, "").trim();
}
var nameSchema = import_zod.z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters.").regex(/^[a-zA-Z\s\-]+$/, "Name can only contain letters, spaces, and hyphens.");
function validateName(name) {
  const result = nameSchema.safeParse(name);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
var STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
var emailSchema = import_zod.z.string().min(5, "Email is too short.").max(100, "Email is too long.").regex(STRICT_EMAIL_REGEX, "Invalid email address format.");
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return "Email address is required.";
  }
  const trimmedEmail = email.trim();
  if (trimmedEmail.length < 5) {
    return "Invalid email address format.";
  }
  if (trimmedEmail.length > 100) {
    return "Email is too long (maximum 100 characters).";
  }
  if (!STRICT_EMAIL_REGEX.test(trimmedEmail)) {
    return "Invalid email address format. Please enter a valid email address (e.g. name@gmail.com).";
  }
  const lowerEmail = trimmedEmail.toLowerCase();
  const parts = lowerEmail.split("@");
  if (parts.length !== 2) {
    return "Invalid email address format.";
  }
  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return "Invalid email address format.";
  }
  const typos = {
    "gamil.com": "gmail.com",
    "gamil.co": "gmail.com",
    "gmal.com": "gmail.com",
    "gmael.com": "gmail.com",
    "gamil.net": "gmail.com",
    "gmail.co": "gmail.com",
    "gmali.com": "gmail.com",
    "gamil.org": "gmail.com",
    "gmaail.com": "gmail.com",
    "gmaail.co": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmaill.co": "gmail.com",
    "gmial.com": "gmail.com",
    "gmial.co": "gmail.com",
    "gmil.com": "gmail.com",
    "gml.com": "gmail.com",
    "gmaul.com": "gmail.com",
    "gmeil.com": "gmail.com",
    "gmall.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "yhoo.com": "yahoo.com",
    "hotml.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "outlok.com": "outlook.com"
  };
  if (typos[domain]) {
    return `Common email typo detected: "${domain}". Did you mean "${typos[domain]}"? Please enter a valid gmail.com or institutional edu mail.`;
  }
  const isGmail = domain === "gmail.com";
  const isEdu = domain.endsWith(".edu") || domain.endsWith(".edu.bd");
  if (!isGmail && !isEdu) {
    return "Only Gmail (gmail.com) and university edu email addresses (.edu, .edu.bd) are allowed.";
  }
  return null;
}
var passwordSchema = import_zod.z.string().min(8, "Password must be at least 8 characters.").max(128, "Password cannot exceed 128 characters.").refine((val) => /[a-z]/.test(val), "Password must contain at least one lowercase letter.").refine((val) => /[A-Z]/.test(val), "Password must contain at least one uppercase letter.").refine((val) => /\d/.test(val), "Password must contain at least one number.").refine((val) => /[^A-Za-z0-9]/.test(val), "Password must contain at least one special character.");
function validatePassword(password) {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
var phoneSchema = import_zod.z.string().regex(/^(?:\+88)?01[3-9]\d{8}$/, "Invalid Bangladesh phone number. Format should be 01XXXXXXXXX or +8801XXXXXXXXX.");
function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-]/g, "");
  const result = phoneSchema.safeParse(cleaned);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
var sessionSchema = import_zod.z.string().regex(/^(\d{2,4})-(\d{2})$/, "Academic session must match format (e.g., 2020-21 or 20-21).");
function validateSession(session) {
  const result = sessionSchema.safeParse(session);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
function validateRegistrationNumber(registrationNumber) {
  if (!registrationNumber || registrationNumber.trim() === "") {
    return "Registration Number is required.";
  }
  const digits = registrationNumber.replace(/\D/g, "");
  if (digits.length !== registrationNumber.trim().length) {
    return "Registration Number must contain only numeric digits.";
  }
  if (digits.length !== 5) {
    return "Registration Number must be exactly 5 digits.";
  }
  return null;
}
function validateFacultyAndDepartment(faculty, department) {
  if (!faculty && !department) return null;
  if (faculty && !department) return "Department is required when Faculty is specified.";
  if (!faculty && department) return "Faculty is required when Department is specified.";
  const group = DEPARTMENT_GROUPS.find((g) => g.label === faculty);
  if (!group) {
    return "The selected Faculty is invalid.";
  }
  const hasDept = group.departments.some((d) => {
    if (d.name === department) return true;
    const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5 ? `${d.name} (${d.aliases[0]})` : d.name;
    return formatted === department;
  });
  if (!hasDept) {
    return `The Department "${department}" is not a valid department within "${faculty}".`;
  }
  return null;
}
var itemPostSchema = import_zod.z.object({
  title: import_zod.z.string().min(3, "Title must be at least 3 characters.").max(100, "Title cannot exceed 100 characters."),
  location: import_zod.z.string().min(2, "Location is required.").max(100, "Location is too long."),
  category: import_zod.z.string().min(2, "Category is required.").max(50, "Category is too long."),
  subcategory: import_zod.z.string().min(2, "Subcategory is required.").max(50, "Subcategory is too long.").optional().nullable(),
  type: import_zod.z.string().refine((val) => val === "lost" || val === "found", { message: "Listing type must be lost or found." }),
  description: import_zod.z.string().min(10, "Description must be at least 10 characters.").max(2e3, "Description cannot exceed 2000 characters."),
  specificSpot: import_zod.z.string().max(200, "Specific spot description cannot exceed 200 characters.").optional().nullable()
});
function validateItemPost(data) {
  const result = itemPostSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  const foundCat = CATEGORY_STRUCTURE.find((c) => c.name.toLowerCase() === data.category.toLowerCase());
  if (!foundCat) {
    return `Invalid category: "${data.category}".`;
  }
  if (data.subcategory) {
    const foundSub = foundCat.subcategories.find((s) => s.toLowerCase() === data.subcategory.toLowerCase());
    if (!foundSub) {
      return `Invalid subcategory: "${data.subcategory}" for category "${data.category}".`;
    }
  }
  return null;
}
var claimSchema = import_zod.z.object({
  proofDescription: import_zod.z.string().min(15, "Proof description must contain at least 15 characters detailing your ownership.").max(2e3, "Proof description is too long."),
  contactDetails: import_zod.z.string().min(5, "Please provide valid contact details (phone or email) of at least 5 characters.").max(500, "Contact details are too long.")
});
function validateClaim(data) {
  const result = claimSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
var supportContactSchema = import_zod.z.object({
  name: nameSchema,
  email: emailSchema,
  message: import_zod.z.string().min(10, "Your support request message must be at least 10 characters.").max(1500, "Support message is too long.")
});
function validateSupportContact(data) {
  const result = supportContactSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  const emailErr = validateEmail(data.email);
  if (emailErr) {
    return emailErr;
  }
  return null;
}
var messageSchema = import_zod.z.string().min(1, "Message cannot be empty.").max(1e3, "Message cannot exceed 1000 characters.");
function validateMessage(message) {
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// server/routes/auth.ts
var router = (0, import_express.Router)();
var JWT_SECRET2 = process.env.JWT_SECRET || "NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%";
var REFRESH_SECRET = process.env.REFRESH_SECRET || "NazrulRetrievers_JKKNIU_2026_refresh_secret_@#%";
async function getAllUsersList() {
  const { store } = getFallbackData();
  const filterRealUsers = (list) => {
    return list.filter((u) => {
      if (!u) return false;
      const id = String(u.id || u.user_id || u._id || "");
      const email = String(u.email || "").trim().toLowerCase();
      const name = String(u.fullName || u.full_name || u.name || "").trim().toLowerCase();
      if (id.startsWith("sim-")) return false;
      if (email.startsWith("student_") && email.endsWith("@jkkniu.edu.bd")) return false;
      if (name === "test student" || name === "verified student") return false;
      if (!email) return false;
      return true;
    });
  };
  const localUsers = filterRealUsers(
    (store.users || []).map((u) => ({ ...u, id: String(u.id || u.user_id || u._id || "") }))
  );
  if (isMongoDBActive()) {
    try {
      const mongoUsers = await MUser.find({}).maxTimeMS(3e3).lean();
      const mappedMongo = filterRealUsers(
        mongoUsers.map((u) => ({ ...u, id: String(u.id || u._id || "") }))
      );
      const userMap = /* @__PURE__ */ new Map();
      for (const u of localUsers) {
        const key = (u.email ? u.email.trim().toLowerCase() : "") || String(u.id || "");
        if (key) userMap.set(key, u);
      }
      for (const u of mappedMongo) {
        const key = (u.email ? u.email.trim().toLowerCase() : "") || String(u.id || "");
        if (key) {
          const existing = userMap.get(key) || {};
          const merged = { ...existing, ...u };
          const existingCreatedAt = existing.createdAt || existing.created_at;
          const uCreatedAt = u.createdAt || u.created_at;
          if (existingCreatedAt && uCreatedAt) {
            const t1 = new Date(existingCreatedAt).getTime();
            const t2 = new Date(uCreatedAt).getTime();
            merged.createdAt = !isNaN(t1) && !isNaN(t2) ? t1 < t2 ? existingCreatedAt : uCreatedAt : existingCreatedAt || uCreatedAt;
          } else {
            merged.createdAt = existingCreatedAt || uCreatedAt;
          }
          merged.created_at = merged.createdAt;
          if (existing.idVerificationStatus === "verified" || u.idVerificationStatus === "verified" || existing.isVerified || u.isVerified || existing.is_verified || u.is_verified) {
            merged.idVerificationStatus = "verified";
            merged.isVerified = true;
            merged.is_verified = true;
            merged.verified = true;
          } else if (existing.idVerificationStatus === "pending" || u.idVerificationStatus === "pending" || existing.verificationDocument && String(existing.verificationDocument).trim().length > 0 || u.verificationDocument && String(u.verificationDocument).trim().length > 0) {
            merged.idVerificationStatus = existing.idVerificationStatus === "rejected" || u.idVerificationStatus === "rejected" ? "rejected" : "pending";
            merged.isVerified = false;
            merged.is_verified = false;
            merged.verified = false;
          } else {
            merged.idVerificationStatus = "unverified";
            merged.isVerified = false;
            merged.is_verified = false;
            merged.verified = false;
          }
          if (existing.verificationDocument && !merged.verificationDocument) {
            merged.verificationDocument = existing.verificationDocument;
          }
          if (existing.idVerificationRemarks && !merged.idVerificationRemarks) {
            merged.idVerificationRemarks = existing.idVerificationRemarks;
          }
          if (existing.idVerificationSubmittedAt && !merged.idVerificationSubmittedAt) {
            merged.idVerificationSubmittedAt = existing.idVerificationSubmittedAt;
          }
          if (existing.verifiedAt && !merged.verifiedAt) {
            merged.verifiedAt = existing.verifiedAt;
          }
          const fieldsToPreserve = [
            "fullName",
            "studentId",
            "registrationNumber",
            "rollNumber",
            "classRoll",
            "academicSession",
            "sessionYear",
            "faculty",
            "department",
            "phone",
            "gender",
            "dateOfBirth",
            "bloodGroup",
            "address",
            "emergencyContact",
            "emergencyContactName",
            "residentialHall",
            "facebook",
            "linkedin",
            "socialLink",
            "bio",
            "avatar",
            "profilePhoto",
            "profileImage"
          ];
          for (const f of fieldsToPreserve) {
            if ((merged[f] === void 0 || merged[f] === null || merged[f] === "") && existing[f]) {
              merged[f] = existing[f];
            }
          }
          const mongoRoll = u.classRoll && String(u.classRoll).trim() || u.rollNumber && String(u.rollNumber).trim() || u.roll && String(u.roll).trim() || u.class_roll && String(u.class_roll).trim() || "";
          if (mongoRoll) {
            merged.classRoll = mongoRoll;
            merged.rollNumber = mongoRoll;
            merged.roll = mongoRoll;
            merged.class_roll = mongoRoll;
          }
          userMap.set(key, merged);
        }
      }
      return Array.from(userMap.values());
    } catch (err) {
      console.warn("MongoDB error in getAllUsersList, falling back to local storage:", err);
    }
  }
  return localUsers;
}
async function saveOrUpdateUser(user) {
  const allUsers = await getAllUsersList();
  const evaluated = syncAndEvaluateUser(user, allUsers);
  const normalizedEmail = evaluated.email ? evaluated.email.trim().toLowerCase() : "";
  const existingByEmail = allUsers.find(
    (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
  );
  const effectiveId = String(evaluated.id || existingByEmail && existingByEmail.id || `user-${Date.now()}`);
  evaluated.id = effectiveId;
  if (isMongoDBActive()) {
    try {
      const { _id, __v, ...updateData } = evaluated;
      updateData.id = effectiveId;
      updateData.user_id = effectiveId;
      if (normalizedEmail) {
        updateData.email = normalizedEmail;
      }
      const conditions = [{ id: effectiveId }];
      if (effectiveId && /^[0-9a-fA-F]{24}$/.test(effectiveId)) {
        conditions.push({ _id: effectiveId });
      }
      if (normalizedEmail) {
        conditions.push({ email: normalizedEmail });
      }
      await MUser.findOneAndUpdate(
        { $or: conditions },
        { $set: updateData },
        { upsert: true, returnDocument: "after" }
      );
    } catch (mongoErr) {
      console.warn("MongoDB sync notice in saveOrUpdateUser:", mongoErr.message);
      try {
        const { _id, __v, ...updateData } = evaluated;
        if (normalizedEmail) {
          await MUser.updateOne(
            { email: normalizedEmail },
            { $set: updateData },
            { upsert: true }
          );
        }
      } catch (retryErr) {
        console.warn("MongoDB retry notice:", retryErr.message);
      }
    }
  }
  const { store, save } = getFallbackData();
  if (!store.users) store.users = [];
  let foundMatch = false;
  store.users = store.users.map((u) => {
    const isMatch = u.id && String(u.id) === String(effectiveId) || u.user_id && String(u.user_id) === String(effectiveId) || u._id && String(u._id) === String(effectiveId) || u.firebaseUid && String(u.firebaseUid) === String(effectiveId) || u.email && normalizedEmail && u.email.trim().toLowerCase() === normalizedEmail;
    if (isMatch) {
      foundMatch = true;
      return { ...u, ...evaluated, id: effectiveId };
    }
    return u;
  });
  if (!foundMatch) {
    store.users.push(evaluated);
  }
  save();
  try {
    if (isMongoDBActive()) {
      await MItem.updateMany(
        {
          $or: [
            { userId: evaluated.id },
            { user_id: evaluated.id },
            { firebaseUid: evaluated.id },
            { ownerUid: evaluated.id },
            { "postedBy.userId": evaluated.id },
            ...normalizedEmail ? [{ email: normalizedEmail }, { "postedBy.email": normalizedEmail }] : []
          ]
        },
        {
          $set: {
            displayName: evaluated.fullName,
            photoURL: evaluated.profilePhoto,
            "postedBy.name": evaluated.fullName,
            "postedBy.department": evaluated.department || "N/A",
            "postedBy.avatar": evaluated.profilePhoto,
            "postedBy.verified": evaluated.isVerified,
            "postedBy.initials": evaluated.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 3)
          }
        }
      );
    }
    if (store.items) {
      store.items = store.items.map((item) => {
        const isUserItem = item.userId && String(item.userId) === String(evaluated.id) || item.user_id && String(item.user_id) === String(evaluated.id) || item.email && evaluated.email && String(item.email).toLowerCase() === String(evaluated.email).toLowerCase() || item.postedBy && item.postedBy.userId && String(item.postedBy.userId) === String(evaluated.id);
        if (isUserItem) {
          return {
            ...item,
            userId: evaluated.id,
            displayName: evaluated.fullName,
            photoURL: evaluated.profilePhoto,
            postedBy: {
              ...item.postedBy,
              name: evaluated.fullName,
              department: evaluated.department || "N/A",
              avatar: evaluated.profilePhoto,
              verified: evaluated.isVerified,
              initials: evaluated.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 3),
              email: evaluated.email,
              userId: evaluated.id
            }
          };
        }
        return item;
      });
      save();
    }
  } catch (syncErr) {
    console.warn("Error propagating user update to items listing:", syncErr);
  }
  return evaluated;
}
function generateTokenPair(user) {
  const payload = {
    id: String(user.id),
    fullName: user.fullName || user.full_name || "",
    email: user.email || "",
    role: user.role || "student",
    studentId: user.studentId || user.student_id || user.registrationNumber || "",
    registrationNumber: user.registrationNumber || user.studentId || user.student_id || "",
    classRoll: user.classRoll || user.rollNumber || user.roll || user.class_roll || "",
    rollNumber: user.rollNumber || user.classRoll || user.roll || user.class_roll || "",
    roll: user.roll || user.classRoll || user.rollNumber || user.class_roll || "",
    phone: user.phone || user.phoneNumber || user.phone_number || "",
    department: user.department || "",
    faculty: user.faculty || "",
    faculty_id: user.faculty_id || "",
    department_id: user.department_id || "",
    academicSession: user.academicSession || user.session_year || user.sessionYear || "",
    sessionYear: user.academicSession || user.session_year || user.sessionYear || "",
    avatar: user.avatar || user.profilePhoto || user.profile_photo || user.profileImage || "",
    profilePhoto: user.profilePhoto || user.avatar || user.profile_photo || user.profileImage || "",
    isVerified: !!(user.isVerified || user.is_verified),
    profileCompletion: Number(user.profileCompletion || 0),
    emailVerified: !!(user.emailVerified || user.email_verified)
  };
  const accessToken = import_jsonwebtoken2.default.sign(payload, JWT_SECRET2, { expiresIn: "30d" });
  const refreshToken = import_jsonwebtoken2.default.sign({ id: String(user.id) }, REFRESH_SECRET, { expiresIn: "90d" });
  return { accessToken, refreshToken, payload };
}
function isAccountRegistered(user) {
  if (!user) return false;
  if (user.fullName === "Verified Student") return false;
  if (user.role === "admin" || user.role === "moderator") return true;
  const isPending = String(user.status || "").toLowerCase() === "pending" || String(user.accountStatus || "").toLowerCase() === "pending";
  if (isPending) return false;
  return user.emailVerified === true || user.email_verified === true || user.registrationCompleted === true;
}
router.post("/register", async (req, res) => {
  const {
    fullName,
    email,
    password,
    agreeTerms,
    registrationNumber,
    academicSession,
    phoneNumber,
    department,
    faculty,
    faculty_id,
    department_id
  } = req.body;
  if (!fullName || !email || !password || !registrationNumber || !academicSession || !phoneNumber) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }
  let finalFaculty = faculty || "";
  let finalDepartment = department || "";
  let finalFacultyId = faculty_id || "";
  let finalDepartmentId = department_id || "";
  if (faculty_id && department_id) {
    const { store } = getFallbackData();
    const matchedFaculty = (store.faculties || []).find((f) => f.id === faculty_id);
    const matchedDept = (store.departments || []).find((d) => d.id === department_id && d.faculty_id === faculty_id);
    if (!matchedFaculty) {
      return res.status(400).json({ error: "Selected Faculty is invalid." });
    }
    if (!matchedDept) {
      return res.status(400).json({ error: "Selected Department is invalid for the chosen Faculty." });
    }
    finalFaculty = matchedFaculty.faculty_name;
    finalDepartment = matchedDept.department_name;
  } else {
    if (!department) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }
    finalDepartment = department;
    const { store } = getFallbackData();
    const matchedDept = (store.departments || []).find(
      (d) => d.department_name.toLowerCase() === finalDepartment.toLowerCase() || d.id.toLowerCase() === finalDepartment.toLowerCase()
    );
    if (matchedDept) {
      finalFacultyId = matchedDept.faculty_id;
      finalDepartmentId = matchedDept.id;
      const matchedFaculty = (store.faculties || []).find((f) => f.id === finalFacultyId);
      if (matchedFaculty) {
        finalFaculty = matchedFaculty.faculty_name;
      }
    }
  }
  if (!agreeTerms) {
    return res.status(400).json({ error: "You must accept the Terms of Service to register." });
  }
  const sanitizedName = sanitizeInput(fullName);
  const nameError = validateName(sanitizedName);
  if (nameError) {
    return res.status(400).json({ error: nameError });
  }
  const sanitizedEmail = sanitizeInput(email);
  const emailError = validateEmail(sanitizedEmail);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  const phoneError = validatePhone(phoneNumber);
  if (phoneError) {
    return res.status(400).json({ error: phoneError });
  }
  const regError = validateRegistrationNumber(registrationNumber);
  if (regError) {
    return res.status(400).json({ error: regError });
  }
  if (academicSession) {
    const sessionError = validateSession(academicSession);
    if (sessionError) {
      return res.status(400).json({ error: sessionError });
    }
  }
  if (finalFaculty || finalDepartment) {
    const facultyDeptError = validateFacultyAndDepartment(finalFaculty, finalDepartment);
    if (facultyDeptError) {
      return res.status(400).json({ error: facultyDeptError });
    }
  }
  try {
    const allUsers = await getAllUsersList();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReg = registrationNumber.trim().toLowerCase();
    const existingReg = allUsers.find((u) => {
      const uReg = String(u.studentId || u.student_id || u.registrationNumber || "").trim().toLowerCase();
      return uReg === normalizedReg;
    });
    const existingUser = allUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    let isFbExists = false;
    let isFbVerified = false;
    let fbUid = "";
    if (isFirebaseActive()) {
      try {
        const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
        isFbExists = fbStatus.exists;
        isFbVerified = fbStatus.verified;
        if (fbStatus.uid) {
          fbUid = fbStatus.uid;
        }
      } catch (fbErr) {
        console.warn("\u26A0\uFE0F Firebase status check failed:", fbErr.message);
      }
    }
    if (existingReg && isAccountRegistered(existingReg)) {
      if (existingReg.email.toLowerCase() !== normalizedEmail) {
        return res.status(400).json({
          error: `Registration Number "${registrationNumber.trim()}" is already registered to another account. Each student may only register one account.`,
          code: "REGISTRATION_NUMBER_ALREADY_EXISTS",
          field: "registrationNumber"
        });
      }
      return res.status(400).json({
        error: "An active and verified account with this Registration Number already exists. Please sign in instead.",
        code: "ACCOUNT_ALREADY_EXISTS",
        field: "registrationNumber"
      });
    }
    const isEmailFullyRegistered = existingUser && isAccountRegistered(existingUser) || isFbExists && isFbVerified;
    if (isEmailFullyRegistered) {
      return res.status(400).json({
        error: "An account with this email address already exists. Please sign in or reset your password.",
        code: "EMAIL_ALREADY_EXISTS",
        field: "email"
      });
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    const localHash = import_bcryptjs2.default.hashSync(password, 10);
    let firebaseUid = fbUid || existingUser?.id || `fb-user-${Date.now()}`;
    if (isFirebaseActive()) {
      if (isFbExists) {
        await firebaseUpdateUserPasswordAdmin(firebaseUid, password);
      } else {
        try {
          const fbUser = await firebaseRegisterUser(normalizedEmail, password);
          if (fbUser && fbUser.uid) {
            firebaseUid = fbUser.uid;
          }
        } catch (fbErr) {
          if (fbErr.message?.includes("already-in-use") || fbErr.code === "auth/email-already-in-use") {
            const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
            if (fbStatus.exists) {
              firebaseUid = fbStatus.uid || firebaseUid;
              await firebaseUpdateUserPasswordAdmin(firebaseUid, password);
            }
          } else {
            return res.status(400).json({ error: "Firebase Auth registration failed: " + fbErr.message });
          }
        }
      }
    }
    const rawUser = {
      id: firebaseUid,
      firebaseUid,
      provider: "email",
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash: localHash,
      role: "student",
      status: "Pending",
      accountStatus: "Pending",
      emailVerified: false,
      email_verified: false,
      isVerified: false,
      is_verified: false,
      verificationCode: code,
      verificationCodeExpires: expiresAt,
      // Student specific fields
      studentId: registrationNumber.trim(),
      registrationNumber: registrationNumber.trim(),
      academicSession,
      phone: phoneNumber.trim(),
      department: finalDepartment,
      faculty: finalFaculty,
      faculty_id: finalFacultyId,
      department_id: finalDepartmentId,
      // Tracking fields
      verificationSentAt: (/* @__PURE__ */ new Date()).toISOString(),
      verificationExpiresAt: expiresAt,
      verificationAttempts: 0,
      registrationCompleted: false,
      createdAt: existingUser?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveOrUpdateUser(rawUser);
    try {
      await sendVerificationEmail(normalizedEmail, code, fullName.trim());
    } catch (mailErr) {
      console.error("\u274C Verification email dispatch error:", mailErr.message);
    }
    return res.status(200).json({
      message: "Verification code sent to your email address.",
      email: normalizedEmail,
      requiresVerification: true
    });
  } catch (err) {
    console.error("Error in registration route:", err);
    return res.status(500).json({ error: "Internal server error during registration: " + err.message });
  }
});
router.post("/check-unique", async (req, res) => {
  const { email, studentId, registrationNumber, currentUserId } = req.body;
  try {
    const allUsers = await getAllUsersList();
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const foundUser = allUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail && String(u.id) !== String(currentUserId || "")
      );
      let isFbExists = false;
      let isFbVerified = false;
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
          isFbExists = fbStatus.exists;
          isFbVerified = fbStatus.verified;
        } catch (e) {
        }
      }
      const isRegistered = foundUser && isAccountRegistered(foundUser) || isFbExists && isFbVerified;
      return res.json({
        unique: !isRegistered,
        isVerified: isRegistered,
        field: "email",
        message: isRegistered ? "This email address is already registered. Please sign in instead." : "Email address is available."
      });
    }
    const regNum = String(registrationNumber || studentId || "").trim().toLowerCase();
    if (regNum) {
      const foundReg = allUsers.find((u) => {
        const uReg = String(u.studentId || u.student_id || u.registrationNumber || "").trim().toLowerCase();
        return uReg === regNum && String(u.id) !== String(currentUserId || "");
      });
      const isRegistered = !!(foundReg && isAccountRegistered(foundReg));
      return res.json({
        unique: !isRegistered,
        isVerified: isRegistered,
        field: "registrationNumber",
        message: isRegistered ? `Registration number "${registrationNumber || studentId}" is already registered to an account.` : "Registration number is available."
      });
    }
    return res.status(400).json({ error: "Please provide email or registrationNumber to evaluate." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/verify-email", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and verification code are required." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode = String(code).trim();
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }
    if (!dbUser && isMongoDBActive()) {
      try {
        const mFound = await MUser.findOne({
          email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
        }).lean();
        if (mFound) {
          dbUser = { ...mFound, id: String(mFound.id || mFound._id) };
        }
      } catch (e) {
      }
    }
    if (!dbUser) {
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
          if (fbStatus.exists) {
            const emailPrefix = normalizedEmail.split("@")[0];
            const readableName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            const rawUser = {
              id: fbStatus.uid || `fb-user-${Date.now()}`,
              firebaseUid: fbStatus.uid || "",
              provider: "email",
              fullName: readableName,
              email: normalizedEmail,
              passwordHash: "",
              role: "student",
              status: fbStatus.verified ? "active" : "Pending",
              accountStatus: fbStatus.verified ? "Active" : "Pending",
              emailVerified: fbStatus.verified,
              isVerified: false,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              registrationCompleted: fbStatus.verified
            };
            dbUser = await saveOrUpdateUser(rawUser);
          }
        } catch (fbErr) {
          console.error("\u26A0\uFE0F Failed to restore user profile during email verification:", fbErr.message);
        }
      }
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User account not found." });
    }
    dbUser.verificationAttempts = (dbUser.verificationAttempts || 0) + 1;
    await saveOrUpdateUser(dbUser);
    if (dbUser.emailVerified || dbUser.email_verified) {
      const { accessToken: accessToken2, refreshToken: refreshToken2 } = generateTokenPair(dbUser);
      dbUser.refreshToken = refreshToken2;
      dbUser.registrationCompleted = true;
      const updatedUser = await saveOrUpdateUser(dbUser);
      const { passwordHash: passwordHash2, password_hash: password_hash2, refreshToken: _rt, ...sanitizedUser } = updatedUser;
      return res.json({
        message: "Email is already verified.",
        token: accessToken2,
        refreshToken: refreshToken2,
        user: sanitizedUser
      });
    }
    const storedCode = String(dbUser.verificationCode || "").trim();
    if (!storedCode || storedCode !== normalizedCode) {
      return res.status(400).json({ error: "Invalid verification code. Please check the code and try again." });
    }
    const expiresVal = dbUser.verificationExpiresAt || dbUser.verificationCodeExpires || dbUser.verificationExpires;
    if (expiresVal && /* @__PURE__ */ new Date() > new Date(expiresVal)) {
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }
    dbUser.emailVerified = true;
    dbUser.email_verified = true;
    dbUser.registrationCompleted = true;
    dbUser.status = "active";
    dbUser.accountStatus = "Active";
    if (isFirebaseActive()) {
      const targetUid = dbUser.firebaseUid || dbUser.id;
      const adminAuth = getFirebaseAdminAuth();
      if (adminAuth && targetUid) {
        try {
          await adminAuth.updateUser(targetUid, { emailVerified: true });
        } catch (fbErr) {
          console.warn("Firebase emailVerified update note:", fbErr.message);
        }
      }
    }
    delete dbUser.verificationCode;
    delete dbUser.verificationCodeExpires;
    delete dbUser.verificationExpires;
    delete dbUser.verificationExpiresAt;
    const verifiedUser = await saveOrUpdateUser(dbUser);
    const { accessToken, refreshToken } = generateTokenPair(verifiedUser);
    verifiedUser.refreshToken = refreshToken;
    await saveOrUpdateUser(verifiedUser);
    const { passwordHash, password_hash, refreshToken: _rt2, ...sanitizedVerifiedUser } = verifiedUser;
    return res.json({
      message: "Email verified successfully! Your account is now active.",
      token: accessToken,
      refreshToken,
      user: sanitizedVerifiedUser
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/verify-email", async (req, res) => {
  const { email, code } = req.query;
  if (!email || !code) {
    return res.status(400).send("<h3>Email and verification code are required.</h3>");
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode = String(code).trim();
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }
    if (!dbUser && isFirebaseActive()) {
      try {
        const fbStatus = await firebaseCheckUserVerificationStatus(normalizedEmail);
        const emailPrefix = normalizedEmail.split("@")[0];
        const readableName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        if (fbStatus.exists) {
          const rawUser = {
            id: fbStatus.uid || `fb-user-${Date.now()}`,
            firebaseUid: fbStatus.uid || "",
            provider: "email",
            fullName: readableName,
            email: normalizedEmail,
            passwordHash: "",
            role: "student",
            status: fbStatus.verified ? "active" : "Pending",
            accountStatus: fbStatus.verified ? "Active" : "Pending",
            emailVerified: fbStatus.verified,
            isVerified: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            registrationCompleted: fbStatus.verified
          };
          dbUser = await saveOrUpdateUser(rawUser);
        }
      } catch (fbErr) {
        console.error("\u26A0\uFE0F Failed to restore user profile during email verification (GET):", fbErr.message);
      }
    }
    if (!dbUser) {
      return res.status(404).send("<h3>User account not found.</h3>");
    }
    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.send("<h3>Your email is already verified. You can log in now.</h3>");
    }
    const storedCode = String(dbUser.verificationCode || "").trim();
    if (!storedCode || storedCode !== normalizedCode) {
      return res.status(400).send("<h3>Invalid verification code.</h3>");
    }
    const expiresVal = dbUser.verificationExpiresAt || dbUser.verificationCodeExpires || dbUser.verificationExpires;
    if (expiresVal && /* @__PURE__ */ new Date() > new Date(expiresVal)) {
      return res.status(400).send("<h3>Verification code has expired.</h3>");
    }
    dbUser.emailVerified = true;
    dbUser.email_verified = true;
    dbUser.registrationCompleted = true;
    dbUser.status = "active";
    dbUser.accountStatus = "Active";
    delete dbUser.verificationCode;
    delete dbUser.verificationCodeExpires;
    delete dbUser.verificationExpires;
    delete dbUser.verificationExpiresAt;
    await saveOrUpdateUser(dbUser);
    return res.send("<h3>Email verified successfully! Your account is now active. You can close this tab and sign in now.</h3>");
  } catch (err) {
    return res.status(500).send(`<h3>Error verifying email: ${err.message}</h3>`);
  }
});
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User account not found." });
    }
    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.status(400).json({ error: "This email is already verified." });
    }
    const now = /* @__PURE__ */ new Date();
    if (dbUser.verificationSentAt) {
      const lastSent = new Date(dbUser.verificationSentAt);
      const diffMs = now.getTime() - lastSent.getTime();
      const diffSec = diffMs / 1e3;
      if (diffSec < 60) {
        const remaining = Math.ceil(60 - diffSec);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new verification email.` });
      }
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    dbUser.verificationCode = code;
    dbUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    dbUser.verificationSentAt = (/* @__PURE__ */ new Date()).toISOString();
    dbUser.verificationExpiresAt = dbUser.verificationCodeExpires;
    dbUser.verificationExpires = dbUser.verificationCodeExpires;
    dbUser.verificationAttempts = 0;
    await saveOrUpdateUser(dbUser);
    await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || "Student");
    return res.json({
      message: "A fresh secure activation code has been successfully sent to your registered mail."
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
router.post("/resend-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    if (!dbUser) {
      const { store } = getFallbackData();
      dbUser = (store.users || []).find((u) => u.email && u.email.trim().toLowerCase() === normalizedEmail);
    }
    if (!dbUser) {
      return res.status(404).json({ error: "User account not found." });
    }
    if (dbUser.emailVerified || dbUser.email_verified) {
      return res.status(400).json({ error: "This email is already verified." });
    }
    const now = /* @__PURE__ */ new Date();
    if (dbUser.verificationSentAt) {
      const lastSent = new Date(dbUser.verificationSentAt);
      const diffMs = now.getTime() - lastSent.getTime();
      const diffSec = diffMs / 1e3;
      if (diffSec < 60) {
        const remaining = Math.ceil(60 - diffSec);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new verification email.` });
      }
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    dbUser.verificationCode = code;
    dbUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    dbUser.verificationSentAt = (/* @__PURE__ */ new Date()).toISOString();
    dbUser.verificationExpiresAt = dbUser.verificationCodeExpires;
    dbUser.verificationExpires = dbUser.verificationCodeExpires;
    dbUser.verificationAttempts = 0;
    await saveOrUpdateUser(dbUser);
    await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || "Student");
    return res.json({
      message: "A fresh secure activation code has been successfully sent to your registered mail."
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const allUsers = await getAllUsersList();
    let loginEmail = email.trim().toLowerCase();
    if (!loginEmail.includes("@")) {
      const userByReg = allUsers.find(
        (u) => String(u.studentId || u.student_id || "").trim().toLowerCase() === loginEmail
      );
      if (!userByReg) {
        return res.status(404).json({ error: "No account found with this Registration Number / Student ID." });
      }
      loginEmail = userByReg.email.trim().toLowerCase();
    }
    let fbUser = null;
    let isAuthenticated = false;
    let dbUser = allUsers.find((u) => u.email.toLowerCase() === loginEmail);
    if (dbUser) {
      const storedHash = dbUser.passwordHash || dbUser.password_hash;
      if (storedHash && import_bcryptjs2.default.compareSync(password, storedHash)) {
        isAuthenticated = true;
        if (isFirebaseActive()) {
          try {
            fbUser = await firebaseLoginUser(loginEmail, password);
          } catch (fbErr) {
            console.log("\u2139\uFE0F Firebase session sync deferred for locally verified user.");
            const targetUid = dbUser.firebaseUid || dbUser.id;
            if (targetUid) {
              try {
                await firebaseUpdateUserPasswordAdmin(targetUid, password);
                console.log(`\u{1F525} Auto-repaired Firebase password for UID: ${targetUid}`);
              } catch (repairErr) {
              }
            }
          }
        }
      }
    }
    if (!isAuthenticated) {
      if (isFirebaseActive()) {
        try {
          fbUser = await firebaseLoginUser(loginEmail, password);
          isAuthenticated = true;
        } catch (fbErr) {
          const isCredentialError = fbErr.message?.includes("credential") || fbErr.message?.includes("user-not-found") || fbErr.message?.includes("wrong-password") || fbErr.message?.includes("invalid-email");
          const errorMsg = isCredentialError ? "Invalid email, registration number, or password." : fbErr.message || "Invalid email, registration number, or password.";
          return res.status(401).json({ error: errorMsg });
        }
      } else {
        return res.status(401).json({ error: "Invalid email, registration number, or password." });
      }
    }
    if (!dbUser) {
      if (fbUser) {
        const loginPrefix = loginEmail.split("@")[0];
        const readableLoginName = loginPrefix.charAt(0).toUpperCase() + loginPrefix.slice(1);
        const rawUser = {
          id: fbUser.uid,
          firebaseUid: fbUser.uid,
          provider: "email",
          fullName: fbUser.displayName || readableLoginName,
          email: loginEmail,
          passwordHash: import_bcryptjs2.default.hashSync(password, 10),
          role: "student",
          status: fbUser.emailVerified ? "active" : "Pending",
          accountStatus: fbUser.emailVerified ? "Active" : "Pending",
          emailVerified: fbUser.emailVerified,
          isVerified: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        dbUser = await saveOrUpdateUser(rawUser);
      } else {
        return res.status(401).json({ error: "Invalid email, registration number, or password." });
      }
    }
    const currentStatus = (dbUser.status || "").trim().toLowerCase();
    const currentAccountStatus = (dbUser.accountStatus || "").trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;
    if (currentStatus === "suspended" || currentAccountStatus === "suspended" || isSuspendedFlag) {
      return res.status(403).json({ error: "This account is suspended. Please contact university administrators." });
    }
    if (currentStatus === "disabled" || currentAccountStatus === "disabled") {
      return res.status(403).json({ error: "This account has been disabled. Please contact university administrators." });
    }
    if (currentStatus === "banned" || currentAccountStatus === "banned") {
      return res.status(403).json({ error: "This account has been permanently banned from Nazrul Retrievers." });
    }
    if (currentStatus === "locked" || currentAccountStatus === "locked") {
      return res.status(403).json({ error: "This account is locked for security reasons. Please contact university administrators." });
    }
    if (fbUser && fbUser.emailVerified && !dbUser.emailVerified) {
      dbUser.emailVerified = true;
      dbUser.email_verified = true;
      dbUser.status = "active";
      dbUser.accountStatus = "Active";
      await saveOrUpdateUser(dbUser);
    }
    const isStaffOrAdmin = dbUser.role === "admin" || dbUser.role === "moderator" || dbUser?.role === "coordinator" || dbUser.email.toLowerCase() === "nazrulretrievers@gmail.com";
    if (isStaffOrAdmin) {
      if (!dbUser.emailVerified || !dbUser.email_verified || dbUser.status === "Pending" || dbUser.accountStatus === "Pending") {
        dbUser.emailVerified = true;
        dbUser.email_verified = true;
        dbUser.registrationCompleted = true;
        dbUser.status = "active";
        dbUser.accountStatus = "Active";
        delete dbUser.verificationCode;
        delete dbUser.verificationCodeExpires;
        delete dbUser.verificationExpires;
        delete dbUser.verificationExpiresAt;
        await saveOrUpdateUser(dbUser);
      }
    } else if (!dbUser.emailVerified && !dbUser.email_verified) {
      const code = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
      dbUser.verificationCode = code;
      dbUser.verificationCodeExpires = expiresAt;
      dbUser.verificationSentAt = (/* @__PURE__ */ new Date()).toISOString();
      await saveOrUpdateUser(dbUser);
      try {
        await sendVerificationEmail(dbUser.email, code, dbUser.fullName || dbUser.full_name || "Student");
      } catch (mailErr) {
        console.warn("Login verification mail dispatch error:", mailErr.message);
      }
      return res.status(403).json({
        error: "Your email address is not verified yet. A 6-digit verification code has been sent to your email address.",
        requiresVerification: true,
        email: dbUser.email
      });
    }
    dbUser.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
    dbUser.last_login = dbUser.lastLogin;
    const { accessToken, refreshToken, payload } = generateTokenPair(dbUser);
    dbUser.refreshToken = refreshToken;
    const finalUser = await saveOrUpdateUser(dbUser);
    const { passwordHash, password_hash, refreshToken: _, ...sanitizedUser } = finalUser;
    return res.json({
      message: "Login successful!",
      token: accessToken,
      refreshToken,
      user: sanitizedUser
    });
  } catch (err) {
    console.error("Error in login endpoint:", err);
    return res.status(500).json({ error: "Internal server error during login: " + err.message });
  }
});
router.post("/google-login", async (req, res) => {
  const { email, fullName, avatar, googleUid } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required for Google Sign-In." });
  }
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!dbUser) {
      const generatedId = googleUid || String(Date.now() + Math.floor(Math.random() * 1e3));
      const isNewAdmin = email.trim().toLowerCase() === "nazrulretrievers@gmail.com";
      const role = isNewAdmin ? "admin" : "student";
      const rawUser = {
        id: generatedId,
        firebaseUid: googleUid || `fb-google-${generatedId}`,
        provider: "google",
        fullName: fullName || "Google Student",
        email: email.trim().toLowerCase(),
        passwordHash: "",
        role,
        status: "active",
        emailVerified: true,
        // Google accounts are auto-verified
        isVerified: false,
        // verified badge is false until complete profile conditions are met
        profilePhoto: avatar || "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      dbUser = await saveOrUpdateUser(rawUser);
    } else {
      dbUser.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
      dbUser.last_login = dbUser.lastLogin;
      if (googleUid) {
        dbUser.firebaseUid = googleUid;
      }
      dbUser = await saveOrUpdateUser(dbUser);
    }
    const currentStatus = (dbUser.status || "").trim().toLowerCase();
    const currentAccountStatus = (dbUser.accountStatus || "").trim().toLowerCase();
    const isSuspendedFlag = dbUser.is_suspended || dbUser.isSuspended;
    if (currentStatus === "suspended" || currentAccountStatus === "suspended" || isSuspendedFlag) {
      return res.status(403).json({ error: "This account is suspended. Please contact university administrators." });
    }
    if (currentStatus === "disabled" || currentAccountStatus === "disabled") {
      return res.status(403).json({ error: "This account has been disabled. Please contact university administrators." });
    }
    if (currentStatus === "banned" || currentAccountStatus === "banned") {
      return res.status(403).json({ error: "This account is permanently banned." });
    }
    if (currentStatus === "locked" || currentAccountStatus === "locked") {
      return res.status(403).json({ error: "This account is locked for security reasons. Please contact university administrators." });
    }
    const { accessToken, refreshToken, payload } = generateTokenPair(dbUser);
    dbUser.refreshToken = refreshToken;
    const finalUser = await saveOrUpdateUser(dbUser);
    const { passwordHash, password_hash, refreshToken: _, ...sanitizedUser } = finalUser;
    return res.json({
      message: "Google Sign-In successful!",
      token: accessToken,
      refreshToken,
      user: sanitizedUser
    });
  } catch (err) {
    console.error("Error in google-login endpoint:", err);
    return res.status(500).json({ error: "Internal server error during Google Sign-In: " + err.message });
  }
});
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }
  try {
    const decoded = import_jsonwebtoken2.default.verify(refreshToken, REFRESH_SECRET);
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find((u) => String(u.id) === String(decoded.id));
    if (!dbUser || dbUser.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Invalid or expired refresh token." });
    }
    const { accessToken } = generateTokenPair(dbUser);
    return res.json({ token: accessToken });
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired refresh token." });
  }
});
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const allUsers = await getAllUsersList();
      const dbUser = allUsers.find((u) => u.refreshToken === refreshToken);
      if (dbUser) {
        dbUser.refreshToken = "";
        await saveOrUpdateUser(dbUser);
      }
    } catch (err) {
      console.error("Logout refresh token update error:", err);
    }
  }
  return res.json({ message: "Successfully logged out." });
});
router.get("/me", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  try {
    const allUsers = await getAllUsersList();
    let dbUser = allUsers.find(
      (u) => String(u.id) === String(userId) || String(u._id) === String(userId) || String(u.firebaseUid) === String(userId) || String(u.user_id) === String(userId) || userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase()
    );
    if (!dbUser && userEmail) {
      if (isFirebaseActive()) {
        try {
          const fbStatus = await firebaseCheckUserVerificationStatus(userEmail);
          if (fbStatus.exists) {
            const emailP = userEmail.trim().split("@")[0];
            const readableEmailName = emailP.charAt(0).toUpperCase() + emailP.slice(1);
            const rawUser = {
              id: userId,
              firebaseUid: userId,
              provider: "email",
              fullName: req.user?.fullName || readableEmailName,
              email: userEmail.trim().toLowerCase(),
              passwordHash: "",
              role: req.user?.role || "student",
              status: fbStatus.verified ? "active" : "Pending",
              accountStatus: fbStatus.verified ? "Active" : "Pending",
              emailVerified: fbStatus.verified,
              isVerified: false,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              registrationCompleted: fbStatus.verified
            };
            dbUser = await saveOrUpdateUser(rawUser);
          }
        } catch (fbErr) {
          console.error("\u26A0\uFE0F Failed to restore user profile in /me:", fbErr.message);
        }
      }
    }
    if (!dbUser) {
      return res.status(404).json({ error: "Active user session not found." });
    }
    const evaluated = await saveOrUpdateUser(dbUser);
    return res.json({ user: evaluated });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router.get("/profile", async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "User ID is required to fetch profile." });
  }
  try {
    const allUsers = await getAllUsersList();
    const queryKey = String(id).trim().toLowerCase();
    const rawUser = allUsers.find(
      (u) => String(u.id) === String(id) || u.email && u.email.trim().toLowerCase() === queryKey || u.fullName && u.fullName.trim().toLowerCase() === queryKey || u.full_name && u.full_name.trim().toLowerCase() === queryKey
    );
    if (!rawUser) {
      return res.status(404).json({ error: "Student profile not found." });
    }
    const dbUser = syncAndEvaluateUser(rawUser, allUsers);
    const resultProfile = { ...dbUser };
    delete resultProfile.passwordHash;
    delete resultProfile.password_hash;
    delete resultProfile.refreshToken;
    const roleLower = (resultProfile.role || "").toLowerCase();
    const isStaffOrAdmin = roleLower === "admin" || roleLower === "moderator" || roleLower === "staff" || roleLower === "coordinator" || resultProfile.fullName && resultProfile.fullName.toLowerCase().includes("admin");
    if (isStaffOrAdmin) {
      resultProfile.department = roleLower === "admin" ? "ICT Administration" : roleLower === "moderator" ? "Campus Community Moderation" : "University Staff";
      resultProfile.studentId = "ADMIN-OFFICIAL";
      resultProfile.employeeId = "ADMIN-OFFICIAL";
      resultProfile.staffId = "ADMIN-OFFICIAL";
      resultProfile.rollNumber = "ADMIN-OFFICIAL";
      resultProfile.classRoll = "ADMIN-OFFICIAL";
      resultProfile.phone = "Protected Official Contact";
      resultProfile.address = "JKKNIU Administration Office";
      delete resultProfile.bloodGroup;
    }
    const isPrivate = resultProfile.profileVisibility === "private" || resultProfile.hidePhone === true || resultProfile.isPhonePrivate === true;
    if (isPrivate) {
      delete resultProfile.phone;
      delete resultProfile.phoneNumber;
      delete resultProfile.phone_number;
      delete resultProfile.emergencyContact;
      delete resultProfile.emergencyContactName;
      resultProfile.profileVisibility = "private";
      resultProfile.hidePhone = true;
      resultProfile.isPhonePrivate = true;
    }
    return res.json({ user: resultProfile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var handleProfileUpdate = async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const fields = req.body;
  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(
      (u) => String(u.id) === String(userId) || String(u._id) === String(userId) || String(u.firebaseUid) === String(userId) || String(u.user_id) === String(userId) || userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase()
    );
    if (!dbUser) {
      return res.status(404).json({ error: "Profile not found." });
    }
    if (fields.fullName) fields.fullName = sanitizeInput(fields.fullName);
    if (fields.full_name) fields.full_name = sanitizeInput(fields.full_name);
    if (fields.bio) fields.bio = sanitizeInput(fields.bio);
    if (fields.address) fields.address = sanitizeInput(fields.address);
    const isStaff = dbUser?.role === "admin" || dbUser?.role === "moderator" || dbUser?.role === "coordinator" || req.user?.role === "admin" || req.user?.role === "moderator";
    if (fields.fullName || fields.full_name) {
      const nameErr = validateName(fields.fullName || fields.full_name);
      if (nameErr) return res.status(400).json({ error: nameErr });
    }
    if (fields.phone) {
      const phoneErr = validatePhone(fields.phone);
      if (phoneErr) return res.status(400).json({ error: phoneErr });
    }
    if (!isStaff) {
      const checkSession = fields.academicSession || fields.sessionYear || fields.session_year;
      if (checkSession) {
        const sessionErr = validateSession(checkSession);
        if (sessionErr) return res.status(400).json({ error: sessionErr });
      }
      const checkStudentId = fields.studentId || fields.student_id;
      if (checkStudentId) {
        const regDigits = String(checkStudentId).replace(/\D/g, "");
        if (regDigits.length !== String(checkStudentId).trim().length || regDigits.length !== 5) {
          return res.status(400).json({ error: "Registration Number must be exactly 5 numeric digits." });
        }
      }
      const checkClassRoll = fields.classRoll !== void 0 ? fields.classRoll : fields.rollNumber !== void 0 ? fields.rollNumber : fields.roll !== void 0 ? fields.roll : fields.class_roll;
      if (checkClassRoll && String(checkClassRoll).trim() !== "") {
        const activeSession = fields.academicSession || fields.sessionYear || fields.session_year || dbUser.academicSession || dbUser.sessionYear || "";
        const rollErr = validateRollNumber(String(checkClassRoll).trim(), activeSession);
        if (rollErr) return res.status(400).json({ error: rollErr });
      }
      if (fields.faculty !== void 0 || fields.department !== void 0) {
        let checkFaculty = fields.faculty !== void 0 ? fields.faculty : dbUser.faculty;
        let checkDept = fields.department !== void 0 ? fields.department : dbUser.department;
        if (checkDept && !checkFaculty) {
          const inferred = inferFacultyFromDepartment(checkDept);
          if (inferred) checkFaculty = inferred;
        }
        if (checkFaculty && checkDept) {
          const facultyDeptErr = validateFacultyAndDepartment(checkFaculty, checkDept);
          if (facultyDeptErr) return res.status(400).json({ error: facultyDeptErr });
        }
      }
    }
    const newStudentId = fields.studentId !== void 0 ? String(fields.studentId).trim() : fields.student_id !== void 0 ? String(fields.student_id).trim() : null;
    if (newStudentId !== null && newStudentId !== "") {
      const normalizedId = newStudentId.toLowerCase();
      const duplicateUser = allUsers.find(
        (u) => String(u.id) !== String(userId) && (String(u.studentId || u.student_id || "").trim().toLowerCase() === normalizedId || u.email.toLowerCase() === normalizedId)
      );
      if (duplicateUser) {
        return res.status(400).json({ error: "This Student ID or Email is already registered to another account." });
      }
    }
    if (fields.password && fields.password.trim() !== "") {
      const oldPassword = fields.oldPassword;
      if (!oldPassword) {
        return res.status(400).json({ error: "Current password is required to change your password." });
      }
      const storedHash = dbUser.passwordHash || dbUser.password_hash;
      if (storedHash) {
        const isMatch = await import_bcryptjs2.default.compare(oldPassword, storedHash);
        if (!isMatch) {
          return res.status(400).json({ error: "Incorrect current password." });
        }
      }
      const hasMinLength = fields.password.length >= 8;
      const hasLowercase = /[a-z]/.test(fields.password);
      const hasUppercase = /[A-Z]/.test(fields.password);
      const hasNumber = /\d/.test(fields.password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(fields.password);
      if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({
          error: "New password does not meet security requirements: Minimum 8 characters, at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character."
        });
      }
      if (isFirebaseActive()) {
        try {
          await firebaseUpdateUserPassword(dbUser.email, oldPassword, fields.password);
        } catch (fbErr) {
          return res.status(400).json({ error: "Firebase Auth password update failed: " + fbErr.message });
        }
      }
      dbUser.passwordHash = await import_bcryptjs2.default.hash(fields.password, 10);
      dbUser.password_hash = dbUser.passwordHash;
    }
    let targetFaculty = fields.faculty !== void 0 ? fields.faculty : dbUser.faculty;
    let targetDepartment = fields.department !== void 0 ? fields.department : dbUser.department;
    if (!isStaff) {
      if (fields.faculty !== void 0 && fields.faculty !== dbUser.faculty) {
        if (fields.department === void 0) {
          targetDepartment = "";
        }
      }
      if (targetDepartment && !targetFaculty) {
        const inferred = inferFacultyFromDepartment(targetDepartment);
        if (inferred) {
          targetFaculty = inferred;
        } else if (fields.faculty !== void 0 || fields.department !== void 0) {
          return res.status(400).json({ error: "Faculty must be selected before selecting a Department." });
        }
      }
      if (targetFaculty && targetDepartment && (fields.faculty !== void 0 || fields.department !== void 0)) {
        if (!isValidFacultyDepartment(targetFaculty, targetDepartment)) {
          return res.status(400).json({ error: "The selected Department does not belong to the selected Faculty." });
        }
      }
    }
    if (fields.fullName !== void 0) dbUser.fullName = fields.fullName;
    if (fields.full_name !== void 0) dbUser.fullName = fields.full_name;
    if (fields.phone !== void 0) dbUser.phone = fields.phone;
    if (fields.phoneNumber !== void 0) dbUser.phone = fields.phoneNumber;
    if (fields.phone_number !== void 0) dbUser.phone = fields.phone_number;
    dbUser.faculty = targetFaculty || "";
    dbUser.department = targetDepartment || "";
    if (fields.faculty_id !== void 0) dbUser.faculty_id = fields.faculty_id;
    if (fields.department_id !== void 0) dbUser.department_id = fields.department_id;
    if (fields.academicSession !== void 0) dbUser.academicSession = fields.academicSession;
    if (fields.sessionYear !== void 0) dbUser.academicSession = fields.sessionYear;
    if (fields.session_year !== void 0) dbUser.academicSession = fields.session_year;
    if (fields.designation !== void 0) dbUser.designation = fields.designation;
    if (fields.semester !== void 0) dbUser.semester = fields.semester;
    if (fields.dateOfBirth !== void 0) dbUser.dateOfBirth = fields.dateOfBirth;
    if (fields.gender !== void 0) dbUser.gender = fields.gender;
    if (fields.address !== void 0) dbUser.address = fields.address;
    if (fields.emergencyContact !== void 0) dbUser.emergencyContact = fields.emergencyContact;
    if (fields.emergencyContactName !== void 0) dbUser.emergencyContactName = fields.emergencyContactName;
    if (fields.bloodGroup !== void 0) dbUser.bloodGroup = fields.bloodGroup;
    if (fields.residentialHall !== void 0) dbUser.residentialHall = fields.residentialHall;
    else if (fields.residential_hall !== void 0) dbUser.residentialHall = fields.residential_hall;
    else if (fields.hall !== void 0) dbUser.residentialHall = fields.hall;
    if (fields.socialLink !== void 0) dbUser.socialLink = fields.socialLink;
    if (fields.bio !== void 0) dbUser.bio = fields.bio;
    if (fields.classRoll !== void 0 || fields.rollNumber !== void 0 || fields.roll !== void 0 || fields.class_roll !== void 0) {
      const targetRoll = fields.classRoll !== void 0 ? fields.classRoll : fields.rollNumber !== void 0 ? fields.rollNumber : fields.roll !== void 0 ? fields.roll : fields.class_roll;
      dbUser.classRoll = targetRoll;
      dbUser.rollNumber = targetRoll;
      dbUser.roll = targetRoll;
      dbUser.class_roll = targetRoll;
    }
    if (fields.profileVisibility !== void 0) {
      dbUser.profileVisibility = fields.profileVisibility;
      dbUser.hidePhone = fields.profileVisibility === "private" || !!fields.hidePhone;
      dbUser.isPhonePrivate = dbUser.hidePhone;
    }
    if (fields.hidePhone !== void 0) {
      dbUser.hidePhone = !!fields.hidePhone;
      dbUser.isPhonePrivate = !!fields.hidePhone;
      if (fields.hidePhone) {
        dbUser.profileVisibility = "private";
      }
    }
    if (fields.isPhonePrivate !== void 0) {
      dbUser.hidePhone = !!fields.isPhonePrivate;
      dbUser.isPhonePrivate = !!fields.isPhonePrivate;
    }
    if (fields.accountSettings !== void 0) dbUser.accountSettings = fields.accountSettings;
    if (fields.preferredContactMethod !== void 0) {
      dbUser.preferredContactMethod = fields.preferredContactMethod;
      if (!dbUser.accountSettings) dbUser.accountSettings = {};
      dbUser.accountSettings.preferredContactMethod = fields.preferredContactMethod;
    }
    if (fields.autoFillDetails !== void 0) {
      if (!dbUser.accountSettings) dbUser.accountSettings = {};
      dbUser.accountSettings.autoFillDetails = !!fields.autoFillDetails;
    }
    if (fields.notificationSettings !== void 0) dbUser.notificationSettings = fields.notificationSettings;
    if (fields.language !== void 0) dbUser.language = fields.language;
    if (fields.theme !== void 0) dbUser.theme = fields.theme;
    if (newStudentId !== null) {
      dbUser.studentId = newStudentId;
      dbUser.registrationNumber = newStudentId;
    } else if (fields.registrationNumber !== void 0) {
      dbUser.studentId = fields.registrationNumber;
      dbUser.registrationNumber = fields.registrationNumber;
    } else if (fields.studentId !== void 0) {
      dbUser.studentId = fields.studentId;
      dbUser.registrationNumber = fields.studentId;
    }
    if (fields.profilePhoto !== void 0) {
      dbUser.profilePhoto = fields.profilePhoto;
      dbUser.avatar = fields.profilePhoto;
      dbUser.profile_photo = fields.profilePhoto;
      dbUser.profileImage = fields.profilePhoto;
    } else if (fields.avatar !== void 0) {
      dbUser.profilePhoto = fields.avatar;
      dbUser.avatar = fields.avatar;
      dbUser.profile_photo = fields.avatar;
      dbUser.profileImage = fields.avatar;
    }
    const updated = await saveOrUpdateUser(dbUser);
    return res.json({
      message: "Profile updated successfully!",
      user: updated
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
};
router.put("/profile", authenticateToken, handleProfileUpdate);
router.patch("/profile", authenticateToken, handleProfileUpdate);
router.get("/profile/claims", authenticateToken, async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  try {
    if (isMongoDBActive()) {
      const claims = await MClaim.find({
        $or: [{ user_id: userId }, { userId }]
      }).lean();
      const itemIds = claims.map((c) => String(c.item_id || c.itemId));
      const dbItems = await MItem.find({
        $or: [{ id: { $in: itemIds } }, { _id: { $in: itemIds.filter((id) => import_mongoose3.default.Types.ObjectId.isValid(id)) } }]
      }).lean();
      const claimsWithDetails = [];
      for (const c of claims) {
        const item = dbItems.find((i) => String(i.id) === String(c.item_id || c.itemId) || String(i._id) === String(c.item_id || c.itemId));
        if (!item || item.isDeleted || item.status === "deleted") continue;
        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || "",
          created_at: c.created_at || c.createdAt,
          item_title: item.title || "Untitled Item",
          item_type: item.type || "lost",
          item_status: item.status || "active",
          image_url: item.image || ""
        });
      }
      return res.json({ claims: claimsWithDetails });
    } else {
      const { store } = getFallbackData();
      const claims = (store.claims || []).filter((c) => String(c.user_id || c.userId) === userId);
      const claimsWithDetails = [];
      for (const c of claims) {
        const item = (store.items || []).find((i) => String(i.id) === String(c.item_id || c.itemId));
        if (!item || item.isDeleted || item.status === "deleted") continue;
        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || "",
          created_at: c.created_at,
          item_title: item.title || "Untitled Item",
          item_type: item.type || "lost",
          item_status: item.status || "active",
          image_url: item.image || "",
          location: item.location || "",
          category: item.category || ""
        });
      }
      return res.json({ claims: claimsWithDetails });
    }
  } catch (err) {
    console.error("Error fetching user claims:", err);
    return res.status(500).json({ error: "Failed to fetch claims: " + err.message });
  }
});
router.delete("/profile/claims/:id", authenticateToken, async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const { id } = req.params;
  try {
    if (isMongoDBActive()) {
      const claim = await MClaim.findOne({
        $and: [
          { $or: [{ claim_id: id }, { id }, { _id: import_mongoose3.default.Types.ObjectId.isValid(id) ? id : void 0 }] },
          { $or: [{ user_id: userId }, { userId }] }
        ]
      });
      if (!claim) {
        return res.status(404).json({ error: "Claim request not found or unauthorized." });
      }
      const itemId = claim.item_id;
      await MClaim.deleteOne({ _id: claim._id });
      const remainingClaims = await MClaim.countDocuments({ item_id: itemId, status: "pending" });
      if (remainingClaims === 0) {
        await MItem.updateOne({ id: String(itemId), status: "under_verification" }, { $set: { status: "active" } });
      }
      return res.json({ success: true, message: "Claim withdrawn successfully." });
    } else {
      const { store, save } = getFallbackData();
      if (!store.claims) store.claims = [];
      const claimIndex = store.claims.findIndex(
        (c) => (String(c.claim_id) === String(id) || String(c.id) === String(id)) && (String(c.user_id) === userId || String(c.userId) === userId)
      );
      if (claimIndex === -1) {
        return res.status(404).json({ error: "Claim request not found or unauthorized." });
      }
      const removedClaim = store.claims.splice(claimIndex, 1)[0];
      const remainingClaims = store.claims.filter((c) => String(c.item_id) === String(removedClaim.item_id) && c.status === "pending");
      if (remainingClaims.length === 0) {
        const item = (store.items || []).find((i) => String(i.id) === String(removedClaim.item_id));
        if (item && item.status === "under_verification") {
          item.status = "active";
        }
      }
      save();
      return res.json({ success: true, message: "Claim withdrawn successfully." });
    }
  } catch (err) {
    console.error("Error canceling claim:", err);
    return res.status(500).json({ error: "Failed to cancel claim: " + err.message });
  }
});
router.get("/profile/export-data", authenticateToken, async (req, res) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const userEmail = String(req.user?.email || "").toLowerCase();
  try {
    const allUsers = await getAllUsersList();
    const rawUser = allUsers.find((u) => String(u.id) === userId || userEmail && String(u.email).toLowerCase() === userEmail);
    if (!rawUser) {
      return res.status(404).json({ error: "User account not found" });
    }
    const synced = syncAndEvaluateUser(rawUser, allUsers);
    const exportProfile = { ...synced };
    delete exportProfile.passwordHash;
    delete exportProfile.password_hash;
    delete exportProfile.refreshToken;
    delete exportProfile.verificationToken;
    delete exportProfile.verificationOtp;
    let userItems = [];
    if (isMongoDBActive()) {
      userItems = await MItem.find({
        $or: [
          { userId },
          { firebaseUid: userId },
          { email: userEmail },
          { "postedBy.userId": userId },
          { "postedBy.email": userEmail }
        ],
        isDeleted: { $ne: true }
      }).lean();
    } else {
      const { store } = getFallbackData();
      userItems = (store.items || []).filter(
        (i) => String(i.userId || i.firebaseUid || i.postedBy && i.postedBy.userId) === userId || i.email && String(i.email).toLowerCase() === userEmail
      );
    }
    let userClaims = [];
    if (isMongoDBActive()) {
      userClaims = await MClaim.find({
        $or: [{ user_id: userId }, { userId }]
      }).lean();
    } else {
      const { store } = getFallbackData();
      userClaims = (store.claims || []).filter((c) => String(c.user_id || c.userId) === userId);
    }
    return res.json({
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      platform: "JKKNIU Lost & Found Portal (Nazrul Retrievers)",
      user: {
        id: synced.id,
        fullName: synced.fullName,
        email: synced.email,
        department: synced.department,
        faculty: synced.faculty,
        studentId: synced.studentId,
        sessionYear: synced.sessionYear || synced.academicSession,
        role: synced.role,
        isVerified: synced.isVerified,
        reputationScore: synced.reputationScore,
        joinedDate: synced.createdAt || synced.created_at
      },
      profile: exportProfile,
      summary: {
        totalItemsPosted: userItems.length,
        totalClaimsSubmitted: userClaims.length
      },
      items: userItems,
      claims: userClaims
    });
  } catch (err) {
    console.error("Error exporting user data:", err);
    return res.status(500).json({ error: "Failed to export account data: " + err.message });
  }
});
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!dbUser) {
      return res.json({
        message: "If this email address is registered, a 6-digit password reset verification code has been sent to your email."
      });
    }
    if (isMongoDBActive()) {
      try {
        const mongoOtp = await MOtp.findOne({ email: normalizedEmail, verified: 0, used: false }).sort({ createdAt: -1 });
        if (mongoOtp) {
          const createdAtTime = new Date(mongoOtp.created_at || mongoOtp.createdAt).getTime();
          if (Date.now() - createdAtTime < 60 * 1e3) {
            return res.status(429).json({ error: "Please wait at least 60 seconds before requesting a new code." });
          }
        }
      } catch (mErr) {
      }
    }
    const { store, save } = getFallbackData();
    const existingOtp = store.otps?.find((o) => o.email.toLowerCase() === normalizedEmail);
    if (existingOtp) {
      const elapsed = Date.now() - new Date(existingOtp.created_at).getTime();
      if (elapsed < 60 * 1e3) {
        return res.status(429).json({ error: "Please wait at least 60 seconds before requesting a new code." });
      }
    }
    const newCode = Math.floor(1e5 + Math.random() * 9e5).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    const hashedCode = await import_bcryptjs2.default.hash(newCode, 10);
    if (isMongoDBActive()) {
      try {
        await MOtp.deleteMany({ email: normalizedEmail });
        await MOtp.create({
          user_id: String(dbUser.id),
          email: normalizedEmail,
          verification_code: hashedCode,
          created_at: /* @__PURE__ */ new Date(),
          expires_at: expiresAt,
          verified: 0,
          used: false,
          attempts: 0
        });
      } catch (mongoErr) {
        console.error("Error saving OTP to MongoDB:", mongoErr);
      }
    }
    if (!store.otps) store.otps = [];
    store.otps = store.otps.filter((o) => o.email.toLowerCase() !== normalizedEmail);
    store.otps.push({
      user_id: String(dbUser.id),
      email: normalizedEmail,
      verification_code: hashedCode,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      expires_at: expiresAt.toISOString(),
      verified: 0,
      used: false,
      attempts: 0
    });
    save();
    try {
      await sendPasswordResetEmail(normalizedEmail, newCode, dbUser.fullName || dbUser.full_name || "Student");
    } catch (mailErr) {
      console.error("Failed to send password reset email via Nodemailer:", mailErr);
    }
    return res.json({
      message: "A 6-digit password reset verification code has been successfully sent to your email."
    });
  } catch (err) {
    console.error("Error initiating password reset:", err);
    return res.status(500).json({ error: "Failed to initiate password reset: " + err.message });
  }
});
router.post("/reset-password", async (req, res) => {
  const { email, code, otpCode, newPassword } = req.body;
  const targetEmail = String(email || "").trim().toLowerCase();
  const targetCode = String(code || otpCode || "").trim();
  if (!targetEmail || !targetCode || !newPassword) {
    return res.status(400).json({ error: "Email, verification code, and new password are required." });
  }
  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find((u) => u.email.toLowerCase() === targetEmail);
    if (!dbUser) {
      return res.status(404).json({ error: "Associated user account not found." });
    }
    let mongoOtpRecord = null;
    if (isMongoDBActive()) {
      try {
        mongoOtpRecord = await MOtp.findOne({
          email: targetEmail,
          verified: 0,
          used: false,
          expires_at: { $gt: /* @__PURE__ */ new Date() }
        }).sort({ createdAt: -1 });
      } catch (mErr) {
        console.error("Error fetching OTP from MongoDB:", mErr);
      }
    }
    const { store, save } = getFallbackData();
    const fallbackOtpIndex = store.otps?.findIndex(
      (o) => o.email.toLowerCase() === targetEmail && (o.verified === 0 || o.used === false) && new Date(o.expires_at).getTime() > Date.now()
    );
    if (!mongoOtpRecord && (fallbackOtpIndex === void 0 || fallbackOtpIndex === -1)) {
      return res.status(400).json({ error: "Invalid or expired password reset verification code." });
    }
    const attempts = mongoOtpRecord ? mongoOtpRecord.attempts || 0 : store.otps[fallbackOtpIndex].attempts;
    if (attempts >= 5) {
      return res.status(400).json({ error: "Too many incorrect attempts. Please request a new verification code." });
    }
    const storedVerificationCode = mongoOtpRecord ? mongoOtpRecord.verification_code : store.otps[fallbackOtpIndex].verification_code;
    const isMatch = await import_bcryptjs2.default.compare(targetCode, storedVerificationCode);
    if (!isMatch) {
      if (isMongoDBActive() && mongoOtpRecord) {
        await MOtp.updateOne({ _id: mongoOtpRecord._id }, { $inc: { attempts: 1 } });
      }
      if (fallbackOtpIndex !== void 0 && fallbackOtpIndex !== -1 && store.otps[fallbackOtpIndex]) {
        store.otps[fallbackOtpIndex].attempts = (store.otps[fallbackOtpIndex].attempts || 0) + 1;
        save();
      }
      return res.status(400).json({ error: "Incorrect verification code. Please try again." });
    }
    const hasMinLength = newPassword.length >= 8;
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({
        error: "New password does not meet security requirements: Minimum 8 characters, at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character."
      });
    }
    const hashedNewPassword = await import_bcryptjs2.default.hash(newPassword, 10);
    dbUser.passwordHash = hashedNewPassword;
    dbUser.password_hash = hashedNewPassword;
    if (isMongoDBActive() && mongoOtpRecord) {
      await MOtp.updateOne({ _id: mongoOtpRecord._id }, { $set: { verified: 1, used: true } });
    }
    if (store.otps) {
      store.otps = store.otps.filter((o) => o.email.toLowerCase() !== targetEmail);
      save();
    }
    if (isFirebaseActive()) {
      const targetUid = dbUser.firebaseUid || dbUser.id;
      if (targetUid) {
        try {
          await firebaseUpdateUserPasswordAdmin(targetUid, newPassword);
        } catch (repairErr) {
          console.warn("Firebase Admin password sync note:", repairErr.message);
        }
      }
    }
    await saveOrUpdateUser(dbUser);
    return res.json({ message: "Your password has been successfully reset! You can now log in with your new credentials." });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
});
router.post("/upload-profile-photo", authenticateToken, async (req, res) => {
  const { image } = req.body;
  const userId = req.user?.id;
  if (!image) {
    return res.status(400).json({ error: "Image base64 content is required." });
  }
  try {
    const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || "eeae5ac8abaf61efd5cadc10b0fd0922";
    let cleanBase64 = image;
    if (image.startsWith("data:")) {
      cleanBase64 = image.split(",")[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, "");
    let uploadedUrl = "";
    let success = false;
    try {
      const multipartForm = new FormData();
      multipartForm.append("image", cleanBase64);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: multipartForm
      });
      const data = await response.json();
      if (data && data.success) {
        uploadedUrl = data.data.url;
        success = true;
      }
    } catch (multipartErr) {
      console.warn("ImgBB multipart upload in profile photo failed, trying fallback...", multipartErr);
    }
    if (!success) {
      try {
        const formParams = new URLSearchParams();
        formParams.append("image", cleanBase64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formParams.toString()
        });
        const data = await response.json();
        if (data && data.success) {
          uploadedUrl = data.data.url;
          success = true;
        }
      } catch (e) {
        console.error("All ImgBB uploads failed, saving locally:", e);
      }
    }
    if (!success) {
      try {
        const UPLOADS_DIR3 = import_path5.default.join(process.cwd(), "server-uploads");
        if (!import_fs5.default.existsSync(UPLOADS_DIR3)) {
          import_fs5.default.mkdirSync(UPLOADS_DIR3, { recursive: true });
        }
        const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/) || [null, "png", cleanBase64];
        const ext = matches[1] || "png";
        const rawBase64 = matches[2] || cleanBase64;
        const buffer = Buffer.from(rawBase64, "base64");
        const filename = `avatar-${userId}-${Date.now()}.${ext}`;
        import_fs5.default.writeFileSync(import_path5.default.join(UPLOADS_DIR3, filename), buffer);
        uploadedUrl = `/server-uploads/${filename}`;
      } catch (localErr) {
        return res.status(500).json({ error: "Failed to upload photo locally: " + localErr.message });
      }
    }
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find((u) => String(u.id) === String(userId));
    if (!dbUser) {
      return res.status(404).json({ error: "User profile not found." });
    }
    dbUser.profilePhoto = uploadedUrl;
    dbUser.profile_photo = uploadedUrl;
    dbUser.avatar = uploadedUrl;
    const updatedUser = await saveOrUpdateUser(dbUser);
    return res.json({
      message: "Profile photo uploaded successfully!",
      profilePhoto: uploadedUrl,
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process photo upload: " + err.message });
  }
});
router.post("/submit-verification", authenticateToken, async (req, res) => {
  const { verificationDocument } = req.body;
  const userId = req.user?.id;
  if (!verificationDocument) {
    return res.status(400).json({ error: "Both front and back side photos of your student ID card are required." });
  }
  const docUrls = String(verificationDocument).split(",").map((s) => s.trim()).filter(Boolean);
  if (docUrls.length < 2) {
    return res.status(400).json({
      error: "Incomplete ID submission: Both front and back side photos of your physical student ID card are strictly mandatory."
    });
  }
  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find((u) => String(u.id) === String(userId));
    if (!dbUser) {
      return res.status(404).json({ error: "User profile not found." });
    }
    dbUser.verificationDocument = docUrls.join(",");
    dbUser.idVerificationStatus = "pending";
    dbUser.idVerificationSubmittedAt = (/* @__PURE__ */ new Date()).toISOString();
    const updatedUser = await saveOrUpdateUser(dbUser);
    try {
      await createAdminNotification({
        title: `\u{1F9D1}\u200D\u{1F393} Student ID Verification Submitted`,
        message: `${dbUser.fullName || dbUser.email} (ID: ${dbUser.studentId || dbUser.student_id || "N/A"}, Dept: ${dbUser.department || "N/A"}) submitted ID card verification documents for review.`,
        type: "id_verification_submitted",
        category: "User",
        priority: "medium",
        relatedUserId: dbUser.id
      });
    } catch (notifErr) {
      console.warn("Failed to create admin notification for verification:", notifErr);
    }
    return res.json({
      message: "Student ID verification request submitted successfully! An administrator will review your ID shortly.",
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit verification request: " + err.message });
  }
});
router.delete(["/account", "/delete-account"], authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const { password } = req.body;
  try {
    const allUsers = await getAllUsersList();
    const dbUser = allUsers.find(
      (u) => String(u.id) === String(userId) || String(u._id) === String(userId) || String(u.firebaseUid) === String(userId) || String(u.user_id) === String(userId) || userEmail && u.email && u.email.trim().toLowerCase() === userEmail.trim().toLowerCase()
    );
    if (!dbUser) {
      return res.status(404).json({ error: "User account not found." });
    }
    if (dbUser.role === "admin" && String(dbUser.email || "").toLowerCase() === "nazrulretrievers@gmail.com") {
      return res.status(403).json({ error: "Root administrative account cannot be deleted." });
    }
    const passHash = dbUser.passwordHash || dbUser.password_hash || "";
    if (passHash) {
      if (!password) {
        return res.status(400).json({ error: "Password confirmation is required to delete your account." });
      }
      const isPasswordCorrect = import_bcryptjs2.default.compareSync(password, passHash);
      if (!isPasswordCorrect) {
        return res.status(401).json({ error: "Incorrect password. Account deletion aborted." });
      }
    }
    await performCascadeDeleteUser(dbUser.id || userId, dbUser);
    res.clearCookie("token");
    res.clearCookie("refreshToken");
    return res.json({ message: "Your JKKNIU student account, listings, claims, and all associated registry records have been permanently deleted." });
  } catch (err) {
    console.error("Error in account deletion:", err);
    return res.status(500).json({ error: "Failed to delete account: " + err.message });
  }
});
router.post("/upload-imgbb", async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "Image content is required." });
  try {
    const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || "eeae5ac8abaf61efd5cadc10b0fd0922";
    let cleanBase64 = image;
    if (image.startsWith("data:")) {
      cleanBase64 = image.split(",")[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, "");
    const form = new URLSearchParams();
    form.append("image", cleanBase64);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    const data = await response.json();
    if (data && data.success) {
      return res.json({
        url: data.data.url,
        display_url: data.data.display_url,
        thumb_url: data.data.thumb?.url
      });
    }
    const UPLOADS_DIR3 = import_path5.default.join(process.cwd(), "server-uploads");
    if (!import_fs5.default.existsSync(UPLOADS_DIR3)) {
      import_fs5.default.mkdirSync(UPLOADS_DIR3, { recursive: true });
    }
    const filename = `img-${Date.now()}.png`;
    import_fs5.default.writeFileSync(import_path5.default.join(UPLOADS_DIR3, filename), Buffer.from(cleanBase64, "base64"));
    const localUrl = `/server-uploads/${filename}`;
    return res.json({
      url: localUrl,
      display_url: localUrl
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/contact", async (req, res) => {
  try {
    let { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Please provide name, email, and message." });
    }
    name = sanitizeInput(name);
    email = sanitizeInput(email);
    message = sanitizeInput(message);
    const validationErr = validateSupportContact({ name, email, message });
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }
    const success = await sendSupportContactEmail(name, email, message);
    if (success) {
      return res.json({ success: true, message: "Your support contact request was sent successfully." });
    } else {
      return res.status(500).json({ error: "Failed to transmit your message. Please try again later." });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var auth_default = router;

// server/routes/items.ts
var import_mongoose4 = __toESM(require("mongoose"), 1);
var import_express2 = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_fs6 = __toESM(require("fs"), 1);
var import_jsonwebtoken3 = __toESM(require("jsonwebtoken"), 1);
init_db();
init_mongodb();
var router2 = (0, import_express2.Router)();
var UPLOADS_DIR = import_path6.default.join(process.cwd(), "server-uploads");
if (!import_fs6.default.existsSync(UPLOADS_DIR)) {
  import_fs6.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + import_path6.default.extname(file.originalname));
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(import_path6.default.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG, PNG, and WEBP image files are allowed."));
  }
});
router2.get("/", async (req, res) => {
  const { q, category, subcategory, location, type, status, owner, department, date } = req.query;
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    let currentUserId = null;
    let currentUserEmail = null;
    let currentUserName = null;
    let currentUserStudentId = null;
    let currentUserRole = null;
    const JWT_SECRET3 = process.env.JWT_SECRET || "NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%";
    if (token) {
      try {
        const decoded = import_jsonwebtoken3.default.verify(token, JWT_SECRET3);
        if (decoded) {
          if (decoded.id) currentUserId = String(decoded.id);
          if (decoded.email) currentUserEmail = String(decoded.email).toLowerCase().trim();
          if (decoded.fullName || decoded.full_name) currentUserName = String(decoded.fullName || decoded.full_name).toLowerCase().trim();
          if (decoded.studentId || decoded.student_id || decoded.rollNumber) currentUserStudentId = String(decoded.studentId || decoded.student_id || decoded.rollNumber).trim();
          if (decoded.role) currentUserRole = String(decoded.role).toLowerCase();
        }
      } catch (err) {
      }
    }
    const { store, save } = getFallbackData();
    const isAdminOrMod = currentUserRole === "admin" || currentUserRole === "moderator";
    let filtered = store.items.filter((i) => {
      if (i.isDeleted || i.status === "deleted") return false;
      if (isAdminOrMod) return true;
      const isApproved = i.approvalStatus === "approved" || i.status === "active" || i.isApproved === true || i.approval_status === "approved";
      const isMyItem = !!(currentUserId && (String(i.userId || i.firebaseUid || i.ownerUid || "") === String(currentUserId) || i.postedBy && i.postedBy.userId && String(i.postedBy.userId) === String(currentUserId)) || currentUserEmail && (i.email && String(i.email).toLowerCase().trim() === currentUserEmail || i.postedBy && i.postedBy.email && String(i.postedBy.email).toLowerCase().trim() === currentUserEmail) || currentUserStudentId && (i.studentId && String(i.studentId).trim() === currentUserStudentId || i.postedBy && i.postedBy.studentId && String(i.postedBy.studentId).trim() === currentUserStudentId) || currentUserName && (i.displayName && String(i.displayName).toLowerCase().trim() === currentUserName || i.postedBy && i.postedBy.name && String(i.postedBy.name).toLowerCase().trim() === currentUserName));
      return isApproved || isMyItem;
    });
    if (type) {
      filtered = filtered.filter((i) => i.type === type);
    }
    if (category && category !== "All Categories" && category !== "All") {
      filtered = filtered.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    if (subcategory && subcategory !== "All Subcategories" && subcategory !== "All") {
      filtered = filtered.filter((i) => i.subcategory && i.subcategory.toLowerCase() === subcategory.toLowerCase());
    }
    if (status) {
      if (status === "active" || status === "approved") {
        filtered = filtered.filter((i) => i.status === "active" || i.status === "approved" || i.approvalStatus === "approved");
      } else {
        filtered = filtered.filter((i) => i.status === status || i.approvalStatus === status);
      }
    }
    if (location && location !== "All Locations" && location !== "All") {
      filtered = filtered.filter((i) => i.location === location);
    }
    if (owner) {
      const ownerLower = String(owner).toLowerCase();
      filtered = filtered.filter(
        (i) => i.userId?.toLowerCase() === ownerLower || i.email?.toLowerCase() === ownerLower || i.postedBy && i.postedBy.userId && String(i.postedBy.userId).toLowerCase() === ownerLower || i.postedBy && i.postedBy.email && String(i.postedBy.email).toLowerCase() === ownerLower || i.postedBy?.name?.toLowerCase().includes(ownerLower)
      );
    }
    if (department && department !== "All Departments") {
      const deptLower = String(department).toLowerCase();
      filtered = filtered.filter(
        (i) => i.postedBy?.department?.toLowerCase() === deptLower || i.postedBy?.department?.toLowerCase().includes(deptLower)
      );
    }
    if (date) {
      const dateStr = String(date);
      filtered = filtered.filter((i) => i.date && i.date.startsWith(dateStr));
    }
    if (q) {
      const queryStr = String(q).toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(queryStr) || i.description.toLowerCase().includes(queryStr) || i.location.toLowerCase().includes(queryStr)
      );
      const existingKeyword = store.searchKeywords.find((k) => k.keyword.toLowerCase() === queryStr);
      if (existingKeyword) {
        existingKeyword.count += 1;
        if (category && category !== "All Categories" && category !== "All") {
          existingKeyword.category = String(category);
        }
        if (subcategory && subcategory !== "All Subcategories" && subcategory !== "All") {
          existingKeyword.subcategory = String(subcategory);
        }
      } else {
        store.searchKeywords.push({
          keyword: String(q),
          count: 1,
          category: String(category && category !== "All Categories" && category !== "All" ? category : "General"),
          subcategory: String(subcategory && subcategory !== "All Subcategories" && subcategory !== "All" ? subcategory : "")
        });
      }
      let searchUserId = "guest";
      let searchDepartment = "General";
      const authHeader2 = req.headers["authorization"];
      const token2 = authHeader2 && authHeader2.split(" ")[1];
      const JWT_SECRET4 = process.env.JWT_SECRET || "NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%";
      if (token2) {
        try {
          const decoded = import_jsonwebtoken3.default.verify(token2, JWT_SECRET4);
          if (decoded && decoded.id) {
            searchUserId = String(decoded.id);
            const userObj = store.users.find((u) => String(u.id) === searchUserId);
            if (userObj && userObj.department) {
              searchDepartment = userObj.department;
            }
          }
        } catch (err) {
        }
      }
      if (!store.searchLogs) {
        store.searchLogs = [];
      }
      store.searchLogs.push({
        keyword: String(q),
        department: searchDepartment,
        category: String(category && category !== "All Categories" && category !== "All" ? category : "General"),
        subcategory: String(subcategory && subcategory !== "All Subcategories" && subcategory !== "All" ? subcategory : ""),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        userId: searchUserId
      });
      save();
    }
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    console.error("Error fetching items:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router2.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { store, save } = getFallbackData();
    const item = store.items.find((i) => String(i.id) === String(id));
    if (!item) {
      return res.status(404).json({ error: "Item listing not found." });
    }
    let loggedInUser = null;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const JWT_SECRET3 = process.env.JWT_SECRET || "NazrulRetrievers_JKKNIU_2026_jwt_secret_@#%";
    if (token) {
      try {
        loggedInUser = import_jsonwebtoken3.default.verify(token, JWT_SECRET3);
      } catch (err) {
      }
    }
    const viewerId = loggedInUser ? String(loggedInUser.id) : "guest-" + String(req.ip || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");
    const isOwner = loggedInUser && (String(item.userId) === viewerId || String(item.ownerUid) === viewerId);
    const isAdmin = loggedInUser && loggedInUser.role === "admin";
    const isModerator = loggedInUser && loggedInUser.role === "moderator";
    if (!isOwner && !isAdmin && !isModerator) {
      if (isMongoDBActive()) {
        try {
          const alreadyViewed = await MItemView.findOne({ itemId: id, userId: viewerId });
          if (!alreadyViewed) {
            await MItemView.create({
              itemId: id,
              userId: viewerId,
              ip: req.ip || "",
              userAgent: req.headers["user-agent"] || ""
            });
            await MItem.updateOne({ id }, { $inc: { views: 1 } });
            item.views = (item.views || 0) + 1;
            save();
          }
        } catch (mongoErr) {
          if (mongoErr.code !== 11e3) {
            console.error("Failed to register MongoDB item view:", mongoErr);
          }
        }
      } else {
        if (!store.itemViews) {
          store.itemViews = [];
        }
        const alreadyViewed = store.itemViews.some(
          (v) => String(v.itemId) === String(id) && String(v.userId) === String(viewerId)
        );
        if (!alreadyViewed) {
          store.itemViews.push({
            itemId: id,
            userId: viewerId,
            viewedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          item.views = (item.views || 0) + 1;
          save();
        }
      }
    }
    if (isMongoDBActive()) {
      const dbItem = await MItem.findOne({ id }).lean();
      if (dbItem) {
        item.views = dbItem.views || 0;
      }
    }
    return res.json({ item: mapItemResponse(item) });
  } catch (err) {
    console.error("Error fetching item detail:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router2.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  let { emoji, title, location, specificSpot, type, category, subcategory, description, secretNotes, secret_notes, rewardOffered, rewardAmount, image, capturedViaCamera, capturedImage } = req.body;
  const userId = req.user?.id;
  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: "Missing mandatory fields for post submission." });
  }
  title = sanitizeInput(title);
  location = sanitizeInput(location);
  if (specificSpot) specificSpot = sanitizeInput(specificSpot);
  description = sanitizeInput(description);
  const validationErr = validateItemPost({
    title,
    location,
    category,
    subcategory,
    type,
    description,
    specificSpot
  });
  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }
  let imageUrl = req.file ? `/server-uploads/${req.file.filename}` : null;
  if (!imageUrl && image && image.startsWith("data:image/")) {
    try {
      const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const dataBuffer = Buffer.from(matches[2], "base64");
        const uniqueFilename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = import_path6.default.join(UPLOADS_DIR, uniqueFilename);
        import_fs6.default.writeFileSync(filePath, dataBuffer);
        imageUrl = `/server-uploads/${uniqueFilename}`;
      }
    } catch (err) {
      console.error("Error saving base64 image:", err);
    }
  } else if (!imageUrl && image) {
    imageUrl = image;
  }
  try {
    const posterName = req.user?.fullName || "Student";
    const posterDept = req.user?.department || "Computer Science & Engineering";
    const posterInitials = req.user?.avatar || "ST";
    const userRole = req.user?.role || "";
    const isStaffRole = userRole === "admin" || userRole === "moderator" || userRole === "coordinator" || String(req.user?.email || "").toLowerCase().trim() === "nazrulretrievers@gmail.com";
    const isUserVerifiedStudent = !isStaffRole && (req.user?.idVerificationStatus === "verified" || req.user?.isVerified === true && req.user?.idVerificationStatus === "verified");
    const { store, save } = getFallbackData();
    const existingIds = store.items.map((i) => parseInt(String(i.id), 10)).filter((n) => !isNaN(n));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = String(maxId + 1);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newItem = {
      id: newId,
      emoji: emoji || (type === "lost" ? "\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD" : "\u{1F511}"),
      title,
      location,
      specificSpot,
      date: nowIso,
      type,
      category,
      subcategory: subcategory || "Other",
      description,
      secretNotes: secretNotes || secret_notes || "",
      status: isStaffRole ? "active" : "pending",
      // Auto-approved directly for Admin and Moderator staff
      approvalStatus: isStaffRole ? "approved" : "pending",
      // Instant approval for staff
      views: 1,
      postedBy: {
        name: posterName,
        department: posterDept,
        verified: isStaffRole ? true : !!isUserVerifiedStudent,
        initials: posterInitials,
        avatar: posterInitials,
        email: req.user?.email || "",
        userId: userId || ""
      },
      rewardOffered: (() => {
        if (type !== "lost") return "";
        const text = (rewardAmount || (typeof rewardOffered === "string" ? rewardOffered : "") || "").toString().trim();
        if (!text || text === "true" || text === "false" || text === "null" || text === "undefined") return "";
        return text;
      })(),
      rewardAmount: (() => {
        if (type !== "lost") return "";
        const text = (rewardAmount || (typeof rewardOffered === "string" ? rewardOffered : "") || "").toString().trim();
        if (!text || text === "true" || text === "false" || text === "null" || text === "undefined") return "";
        return text;
      })(),
      createdAt: nowIso
    };
    newItem.created_at = nowIso;
    newItem.isApproved = isStaffRole ? true : false;
    newItem.isRejected = false;
    newItem.isDeleted = false;
    newItem.approvedAt = isStaffRole ? nowIso : void 0;
    newItem.approvedBy = isStaffRole ? req.user?.fullName || userRole || "Staff Authority" : void 0;
    newItem.firebaseUid = userId || "";
    newItem.userId = userId || "";
    newItem.email = req.user?.email || "";
    newItem.displayName = req.user?.fullName || "";
    newItem.photoURL = req.user?.avatar || "";
    let parsedImages = [];
    if (req.body.images) {
      try {
        parsedImages = typeof req.body.images === "string" ? JSON.parse(req.body.images) : req.body.images;
      } catch (e) {
        parsedImages = [];
      }
    }
    if (imageUrl && (!parsedImages || parsedImages.length === 0)) {
      parsedImages = [{
        url: imageUrl,
        storagePath: "",
        order: 1,
        isCover: true,
        width: 800,
        height: 600,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: userId || "anonymous",
        fileSize: 0
      }];
    }
    if (!parsedImages || parsedImages.length === 0) {
      return res.status(400).json({ error: "At least one image is required." });
    }
    if (parsedImages.length > 5) {
      return res.status(400).json({ error: "You can upload a maximum of 5 images." });
    }
    newItem.images = parsedImages;
    newItem.coverImage = req.body.coverImage || (parsedImages[0] ? parsedImages[0].url : imageUrl || "");
    newItem.image = newItem.coverImage;
    newItem.imageUrl = newItem.coverImage;
    newItem.revision = 1;
    newItem.ownerUid = userId || "";
    if (capturedViaCamera === "true" || capturedViaCamera === true) {
      newItem.capturedViaCamera = true;
      newItem.capturedImage = capturedImage || imageUrl || newItem.image;
    }
    store.items.unshift(newItem);
    if (isMongoDBActive()) {
      try {
        const mongoItem = { ...newItem };
        delete mongoItem._id;
        await MItem.create(mongoItem);
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Direct MItem.create failed:", mErr.message);
      }
    }
    if (isStaffRole) {
      await createUserNotification({
        userId,
        title: "Listing Published Instantly",
        message: `Your listing "${title}" has been auto-approved as staff and is now live on the public feed!`,
        text: `Your listing <strong>"${title}"</strong> has been auto-approved as staff (${userRole || "Staff"}) and is now live on the public feed!`,
        type: "item_approved"
      });
    } else {
      await createUserNotification({
        userId,
        title: "Listing Submitted",
        message: `Your listing "${title}" has been successfully submitted and is awaiting administrator approval!`,
        text: `Your listing <strong>"${title}"</strong> has been successfully submitted and is awaiting administrator approval!`,
        type: "item_posted"
      });
    }
    save();
    if (isStaffRole) {
      await createAdminNotification({
        title: `\u26A1 Staff Listing Published: ${title}`,
        message: `A new ${type} item listing "${title}" was published directly by ${userRole || "Staff"} ${posterName}.`,
        type: "item_posted",
        category: type === "lost" ? "Lost Items" : "Found Items",
        priority: "low",
        relatedUserId: userId,
        relatedItemId: newItem.id
      });
    } else {
      await createAdminNotification({
        title: `\u{1F195} New Listing Posted: ${title}`,
        message: `A new ${type} item listing "${title}" was submitted by ${posterName} (${posterDept}) and requires review.`,
        type: "item_posted",
        category: type === "lost" ? "Lost Items" : "Found Items",
        priority: "medium",
        relatedUserId: userId,
        relatedItemId: newItem.id
      });
    }
    return res.status(201).json({
      message: isStaffRole ? "Listing published directly and is now live (Auto-Approved for Staff)!" : "Listing submitted successfully! Awaiting review.",
      item: mapItemResponse(newItem),
      autoApproved: isStaffRole
    });
  } catch (err) {
    console.error("Error submitting post:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router2.put("/:id", authenticateToken, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { emoji, title, location, specificSpot, type, category, subcategory, description, rewardOffered, rewardAmount, image } = req.body;
  const userId = req.user?.id;
  if (!title || !location || !type || !category || !description) {
    return res.status(400).json({ error: "Missing mandatory fields for post update." });
  }
  const validationErr = validateItemPost({
    title,
    location,
    category,
    subcategory,
    type,
    description,
    specificSpot
  });
  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }
  let imageUrl = req.file ? `/server-uploads/${req.file.filename}` : null;
  if (!imageUrl && image && image.startsWith("data:image/")) {
    try {
      const matches = image.match(/^data:image\/([A-Za-z-+0-9]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1];
        const dataBuffer = Buffer.from(matches[2], "base64");
        const uniqueFilename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = import_path6.default.join(UPLOADS_DIR, uniqueFilename);
        import_fs6.default.writeFileSync(filePath, dataBuffer);
        imageUrl = `/server-uploads/${uniqueFilename}`;
      }
    } catch (err) {
      console.error("Error saving base64 image:", err);
    }
  } else if (!imageUrl && image) {
    imageUrl = image;
  }
  try {
    const { store, save } = getFallbackData();
    const item = store.items.find((i) => String(i.id) === String(id));
    if (!item) {
      return res.status(404).json({ error: "Listing not found." });
    }
    const isOwner = item.userId && String(item.userId) === String(userId) || item.user_id && String(item.user_id) === String(userId) || item.firebaseUid && String(item.firebaseUid) === String(userId) || item.ownerUid && String(item.ownerUid) === String(userId) || item.email && req.user?.email && String(item.email).toLowerCase() === String(req.user.email).toLowerCase() || item.postedBy && item.postedBy.email && req.user?.email && item.postedBy.email.toLowerCase() === req.user.email.toLowerCase() || item.postedBy && item.postedBy.userId && String(item.postedBy.userId) === String(userId);
    if (!isOwner && req.user?.role !== "admin" && req.user?.role !== "moderator") {
      return res.status(403).json({ error: "Access denied. You are not authorized to update this listing." });
    }
    let parsedImages = [];
    if (req.body.images) {
      try {
        parsedImages = typeof req.body.images === "string" ? JSON.parse(req.body.images) : req.body.images;
      } catch (e) {
        parsedImages = [];
      }
    }
    if (imageUrl && (!parsedImages || parsedImages.length === 0)) {
      parsedImages = [{
        url: imageUrl,
        storagePath: "",
        order: 1,
        isCover: true,
        width: 800,
        height: 600,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: userId || "anonymous",
        fileSize: 0
      }];
    } else if ((!parsedImages || parsedImages.length === 0) && item.images && item.images.length > 0) {
      parsedImages = item.images;
    }
    if (!parsedImages || parsedImages.length === 0) {
      return res.status(400).json({ error: "At least one image is required." });
    }
    if (parsedImages.length > 5) {
      return res.status(400).json({ error: "You can upload a maximum of 5 images." });
    }
    item.title = title;
    item.location = location;
    item.category = category;
    item.subcategory = subcategory || "Other";
    item.description = description;
    item.emoji = emoji || item.emoji;
    item.specificSpot = specificSpot || "";
    item.type = type;
    const sanitizedReward = (() => {
      const targetType = type || item.type;
      if (targetType !== "lost") return "";
      const candidate = (rewardAmount || (typeof rewardOffered === "string" ? rewardOffered : "") || "").toString().trim();
      if (!candidate || candidate === "true" || candidate === "false" || candidate === "null" || candidate === "undefined") return "";
      return candidate;
    })();
    item.rewardOffered = sanitizedReward;
    item.rewardAmount = sanitizedReward;
    item.images = parsedImages;
    item.coverImage = req.body.coverImage || (parsedImages[0] ? parsedImages[0].url : imageUrl || item.coverImage || "");
    item.image = item.coverImage;
    item.imageUrl = item.coverImage;
    if (req.body.date) {
      item.date = req.body.date;
    }
    if (req.body.contactPreference) {
      item.contactPreference = req.body.contactPreference;
    }
    const isItemApproved = item.approvalStatus === "approved" || item.isApproved === true;
    if (!isItemApproved) {
      item.approvalStatus = "pending";
      item.status = "pending";
      item.isApproved = false;
      item.isRejected = false;
    }
    item.hasPendingRevision = false;
    save();
    return res.json({
      message: "Listing updated successfully!",
      revisionCreated: false,
      item: mapItemResponse(item)
    });
  } catch (err) {
    console.error("Error updating post details:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
var updateItemStatusHandler = async (req, res) => {
  const { id } = req.params;
  let status = req.body?.status;
  if (!status && typeof req.body === "string") {
    try {
      status = JSON.parse(req.body)?.status;
    } catch (_) {
    }
  }
  const userId = req.user?.id;
  const validStatuses = [
    "active",
    "claim_requested",
    "under_verification",
    "handover_pending",
    "claimed",
    "returned",
    "reunited",
    "closed",
    "resolved"
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Please provide a valid item status parameter. Valid statuses: ${validStatuses.join(", ")}` });
  }
  try {
    const { store, save } = getFallbackData();
    const itemInStore = store.items.find((i) => String(i.id) === String(id));
    let dbItem = null;
    if (isMongoDBActive()) {
      try {
        dbItem = await MItem.findOne({ id: String(id) });
      } catch (err) {
        console.warn("Failed to find item in MongoDB for status update:", err?.message);
      }
    }
    if (!itemInStore && !dbItem) {
      return res.status(404).json({ error: "Listing not found." });
    }
    const refItem = dbItem || itemInStore;
    const isOwner = refItem.userId && String(refItem.userId) === String(userId) || refItem.user_id && String(refItem.user_id) === String(userId) || refItem.firebaseUid && String(refItem.firebaseUid) === String(userId) || refItem.ownerUid && String(refItem.ownerUid) === String(userId) || refItem.email && req.user?.email && String(refItem.email).toLowerCase() === String(req.user.email).toLowerCase() || refItem.postedBy && refItem.postedBy.email && req.user?.email && refItem.postedBy.email.toLowerCase() === req.user.email.toLowerCase() || refItem.postedBy && refItem.postedBy.userId && String(refItem.postedBy.userId) === String(userId);
    if (!isOwner && req.user?.role !== "admin" && req.user?.role !== "moderator") {
      return res.status(403).json({ error: "Access denied. You are not authorized to update this listing." });
    }
    const resolutionMethod = req.body?.resolutionMethod;
    const resolutionNotes = req.body?.resolutionNotes;
    const now = /* @__PURE__ */ new Date();
    if (itemInStore) {
      itemInStore.status = status;
      if (status === "returned" || status === "reunited" || status === "claimed" || status === "resolved") {
        itemInStore.returnedAt = now.toISOString();
        if (resolutionMethod) itemInStore.resolutionMethod = resolutionMethod;
        if (resolutionNotes) itemInStore.resolutionNotes = resolutionNotes;
        itemInStore.resolvedBy = req.user?.fullName || req.user?.email || "User";
      }
      save();
    }
    if (isMongoDBActive() && dbItem) {
      try {
        dbItem.status = status;
        if (status === "returned" || status === "reunited" || status === "claimed" || status === "resolved") {
          dbItem.returnedAt = now;
          if (resolutionMethod) dbItem.resolutionMethod = resolutionMethod;
          if (resolutionNotes) dbItem.resolutionNotes = resolutionNotes;
          dbItem.resolvedBy = req.user?.fullName || req.user?.email || "User";
        }
        await dbItem.save();
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to save status update to MongoDB:", mErr.message);
      }
    }
    return res.json({ message: `Listing status updated to ${status}.`, item: mapItemResponse(itemInStore || dbItem) });
  } catch (err) {
    console.error("Error updating status:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
};
router2.put("/:id/status", authenticateToken, updateItemStatusHandler);
router2.patch("/:id/status", authenticateToken, updateItemStatusHandler);
router2.post("/:id/claims", authenticateToken, async (req, res) => {
  const { id } = req.params;
  let { proofDescription, contactDetails } = req.body;
  const userId = req.user?.id;
  if (!proofDescription) {
    return res.status(400).json({ error: "Please explain your claim proof clearly." });
  }
  proofDescription = sanitizeInput(proofDescription);
  if (contactDetails) contactDetails = sanitizeInput(contactDetails);
  const validationErr = validateClaim({ proofDescription, contactDetails: contactDetails || "" });
  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }
  try {
    let itemTitle = "Unknown Item";
    let itemOwnerId = "";
    if (isMongoDBActive()) {
      const dbItem = await MItem.findOne({ id: String(id) });
      if (!dbItem) {
        return res.status(404).json({ error: "Listing not found." });
      }
      itemTitle = dbItem.title || "Unknown Item";
      itemOwnerId = String(dbItem.userId || dbItem.user_id || "");
      if (dbItem.status === "active") {
        dbItem.status = "under_verification";
        dbItem.claimCount = (dbItem.claimCount || 0) + 1;
        await dbItem.save();
      }
    } else {
      const { store: store2 } = getFallbackData();
      const item = store2.items.find((i) => String(i.id) === String(id));
      if (!item) {
        return res.status(404).json({ error: "Listing not found." });
      }
      itemTitle = item.title || "Unknown Item";
      itemOwnerId = String(item.userId || item.user_id || "");
      if (item.status === "active") {
        item.status = "under_verification";
        item.claimCount = (item.claimCount || 0) + 1;
      }
    }
    if (itemOwnerId && userId && String(itemOwnerId) === String(userId)) {
      return res.status(400).json({ error: "You cannot submit a claim or match verification on your own post." });
    }
    console.log(`Claim submitted for item "${itemTitle}" by user ID ${userId}`);
    const claimId = `CLM-${Date.now()}`;
    const claimData = {
      claim_id: claimId,
      id: claimId,
      item_id: id,
      user_id: userId,
      proof_description: proofDescription,
      contact_details: contactDetails || "",
      status: "pending",
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { store, save } = getFallbackData();
    if (!store.claims) {
      store.claims = [];
    }
    store.claims.push(claimData);
    if (itemOwnerId) {
      await createUserNotification({
        userId: itemOwnerId,
        title: "New Claim Request",
        message: `New claim request submitted for your item "${itemTitle}". Click Chat to verify ownership.`,
        text: `New claim request submitted for your item <strong>"${itemTitle}"</strong>. Click Chat to verify ownership.`,
        type: "claim"
      });
    }
    if (isMongoDBActive()) {
      await MClaim.create({
        claim_id: claimId,
        id: claimId,
        item_id: id,
        user_id: userId,
        proof_description: proofDescription,
        contact_details: contactDetails || "",
        status: "pending"
      });
    }
    await createAdminNotification({
      title: `\u{1F511} New Claim Submitted: ${itemTitle}`,
      message: `A new claim request was submitted for item "${itemTitle}" (ID: ${id}) by user ID ${userId}.`,
      type: "claim_submitted",
      category: "Claims",
      priority: "medium",
      relatedUserId: userId,
      relatedItemId: id
    });
    save();
    return res.status(201).json({ message: "Claim submitted successfully!" });
  } catch (err) {
    console.error("Error processing claim:", err);
    return res.status(500).json({ error: "Internal server error processing claim: " + err.message });
  }
});
router2.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role || "student";
  const deletedBy = req.user?.fullName || req.user?.email || "user";
  const deletedAt = /* @__PURE__ */ new Date();
  try {
    const { store, save } = getFallbackData();
    let item = store.items.find((i) => String(i.id) === String(id));
    let dbItem = null;
    if (isMongoDBActive()) {
      try {
        const queryConds = [{ id: String(id) }];
        if (import_mongoose4.default.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        dbItem = await MItem.findOne({ $or: queryConds });
      } catch (dbErr) {
        console.warn("\u26A0\uFE0F Error finding item in MongoDB for deletion:", dbErr.message);
      }
    }
    if (!item && !dbItem) {
      return res.status(404).json({ error: "Listing not found." });
    }
    const refItem = item || dbItem;
    const isOwner = refItem.userId && String(refItem.userId) === String(userId) || refItem.user_id && String(refItem.user_id) === String(userId) || refItem.firebaseUid && String(refItem.firebaseUid) === String(userId) || refItem.ownerUid && String(refItem.ownerUid) === String(userId) || refItem.email && req.user?.email && String(refItem.email).toLowerCase() === String(req.user.email).toLowerCase() || refItem.postedBy && refItem.postedBy.email && req.user?.email && refItem.postedBy.email.toLowerCase() === req.user.email.toLowerCase() || refItem.postedBy && refItem.postedBy.userId && String(refItem.postedBy.userId) === String(userId);
    if (!isOwner && userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({ error: "Access denied. Unauthorized deletion request." });
    }
    if (item) {
      item.status = "deleted";
      item.isDeleted = true;
      item.deletedBy = deletedBy;
      item.deletedAt = deletedAt;
    }
    if (isMongoDBActive()) {
      try {
        const queryConds = [{ id: String(id) }];
        if (import_mongoose4.default.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MItem.updateMany(
          { $or: queryConds },
          {
            $set: {
              status: "deleted",
              isDeleted: true,
              deletedBy,
              deletedAt
            }
          }
        );
        await MClaim.updateMany(
          { $or: [{ itemId: String(id) }, { item_id: String(id) }], status: "pending" },
          { $set: { status: "cancelled" } }
        );
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to update MItem delete status in MongoDB:", mErr.message);
      }
    }
    const postOwnerName = refItem.postedBy?.name || refItem.name || "";
    const postOwnerUid = refItem.userId || refItem.user_id || refItem.firebaseUid || refItem.ownerUid;
    if (postOwnerName !== req.user?.fullName && (userRole === "admin" || userRole === "moderator")) {
      await createUserNotification({
        userId: postOwnerUid,
        title: "Listing Removed",
        message: `Your listing "${refItem.title}" has been removed/moderated by the administration coordinators.`,
        text: `Your listing <strong>"${refItem.title}"</strong> has been removed/moderated by the administration coordinators.`,
        type: "listing_removed"
      });
    }
    save();
    return res.json({
      message: "Listing deleted successfully!",
      item: mapItemResponse(item || dbItem)
    });
  } catch (err) {
    console.error("Error deleting listing:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
var syncLatestViews = async (items) => {
  if (isMongoDBActive()) {
    try {
      const ids = items.map((i) => String(i.id));
      const dbItems = await MItem.find({ id: { $in: ids } }).select("id views").lean();
      const viewsMap = new Map(dbItems.map((i) => [String(i.id), i.views || 0]));
      for (const i of items) {
        if (viewsMap.has(String(i.id))) {
          i.views = viewsMap.get(String(i.id)) || 0;
        }
      }
    } catch (err) {
      console.error("Failed to sync latest views from MongoDB:", err);
    }
  }
};
var mapItemResponse = (r, defaultType = "lost") => {
  const createdTime = r.createdAt || r.created_at || (r.date && r.date !== "Just now" ? r.date : null) || r.date_posted || (/* @__PURE__ */ new Date()).toISOString();
  const dateVal = r.date && r.date !== "Just now" ? r.date : r.date_posted || createdTime;
  return {
    id: String(r.item_id || r.id),
    emoji: r.emoji || (r.item_type || defaultType === "lost" ? "\u{1F392}" : "\u{1F511}"),
    title: r.title,
    location: r.location,
    specificSpot: r.specific_spot || r.specificSpot,
    date: dateVal,
    createdAt: createdTime,
    approvedAt: r.approvedAt || r.approved_at || null,
    approvedBy: r.approvedBy || r.approved_by || null,
    rejectedAt: r.rejectedAt || r.rejected_at || null,
    rejectedBy: r.rejectedBy || r.rejected_by || null,
    type: r.item_type || r.type || defaultType,
    category: r.category,
    subcategory: r.subcategory || "Other",
    description: r.description,
    status: r.status || (r.approvalStatus === "approved" || r.approval_status === "approved" || r.isApproved === true ? "active" : "pending"),
    approvalStatus: (() => {
      if (r.approvalStatus === "rejected" || r.approval_status === "rejected" || r.status === "rejected" || r.isRejected === true) {
        return "rejected";
      }
      if (r.approvalStatus === "approved" || r.approval_status === "approved" || r.isApproved === true || r.status === "active" || r.status === "returned" || r.status === "reunited" || r.status === "claimed" || r.status === "handover_pending" || r.status === "under_verification" || r.status === "claim_requested") {
        return "approved";
      }
      return r.approvalStatus || r.approval_status || "pending";
    })(),
    isApproved: (() => {
      if (r.approvalStatus === "rejected" || r.approval_status === "rejected" || r.status === "rejected" || r.isRejected === true) {
        return false;
      }
      return r.isApproved === 1 || r.isApproved === true || r.approvalStatus === "approved" || r.approval_status === "approved" || r.status === "active" || r.status === "returned" || r.status === "reunited" || r.status === "claimed";
    })(),
    isRejected: r.isRejected === 1 || r.isRejected === true || r.approvalStatus === "rejected" || r.status === "rejected" || false,
    isDeleted: r.isDeleted === 1 || r.isDeleted === true || false,
    firebaseUid: r.firebaseUid || "",
    userId: r.user_id || r.userId || "",
    email: r.email || "",
    displayName: r.displayName || "",
    photoURL: r.photoURL || "",
    views: r.views || 0,
    postedBy: (() => {
      const { store } = getFallbackData();
      const pUserId = String(r.userId || r.user_id || r.postedBy && r.postedBy.userId || "");
      const pEmail = String(r.email || r.postedBy && r.postedBy.email || "").toLowerCase().trim();
      const pUser = (store.users || []).find(
        (u) => pUserId && String(u.id || u.user_id || u._id) === pUserId || pEmail && u.email && String(u.email).toLowerCase().trim() === pEmail
      );
      const isStaffPoster = pUser ? pUser.role === "admin" || pUser.role === "moderator" || pUser.role === "coordinator" : r.postedBy?.role === "admin" || r.postedBy?.role === "moderator" || r.role === "admin" || r.role === "moderator";
      const isVerifiedStudent = pUser ? !isStaffPoster && pUser.idVerificationStatus === "verified" : !isStaffPoster && (r.postedBy?.verified === true || r.postedBy?.verified === 1) && (r.postedBy?.idVerificationStatus === "verified" || r.idVerificationStatus === "verified");
      if (r.postedBy) {
        return {
          name: r.postedBy.name || (pUser ? pUser.fullName : "Anonymous Student"),
          department: r.postedBy.department || (pUser ? pUser.department : "General"),
          verified: !!isVerifiedStudent,
          initials: r.postedBy.avatar || r.postedBy.profilePhoto || r.postedBy.profile_photo || r.postedBy.initials || (pUser ? pUser.avatar : "U"),
          role: pUser ? pUser.role : r.postedBy.role || "student",
          email: pEmail || (pUser ? pUser.email : ""),
          userId: pUserId || (pUser ? pUser.id : "")
        };
      } else {
        return {
          name: r.full_name || (pUser ? pUser.fullName : "Anonymous Student"),
          department: r.department || (pUser ? pUser.department : "General"),
          verified: !!isVerifiedStudent,
          initials: r.avatar || r.profilePhoto || r.profile_photo || (pUser ? pUser.avatar : (r.full_name || "Anonymous Student").split(" ").map((n) => n[0]).join("").toUpperCase()),
          role: pUser ? pUser.role : r.role || "student",
          email: pEmail || (pUser ? pUser.email : ""),
          userId: pUserId || (pUser ? pUser.id : "")
        };
      }
    })(),
    rewardOffered: (() => {
      if (r.type !== "lost") return "";
      const amt = (r.rewardAmount || r.reward_amount || (typeof r.rewardOffered === "string" ? r.rewardOffered : typeof r.reward_offered === "string" ? r.reward_offered : "") || "").toString().trim();
      if (!amt || amt === "true" || amt === "false" || amt === "1" || amt === "0" || amt === "null" || amt === "undefined") return "";
      return amt;
    })(),
    rewardAmount: (() => {
      if (r.type !== "lost") return "";
      const amt = (r.rewardAmount || r.reward_amount || (typeof r.rewardOffered === "string" ? r.rewardOffered : typeof r.reward_offered === "string" ? r.reward_offered : "") || "").toString().trim();
      if (!amt || amt === "true" || amt === "false" || amt === "1" || amt === "0" || amt === "null" || amt === "undefined") return "";
      return amt;
    })(),
    imageUrl: r.image_url || r.imageUrl || r.image || null,
    image: r.image_url || r.imageUrl || r.image || null,
    images: r.images ? typeof r.images === "string" ? JSON.parse(r.images) : r.images : []
  };
};
router2.get("/pending", async (req, res) => {
  try {
    const { store } = getFallbackData();
    const filtered = store.items.filter(
      (i) => !i.isDeleted && i.status !== "deleted" && (i.approvalStatus === "pending" || i.status === "pending" || i.approval_status === "pending")
    );
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.get("/approved", async (req, res) => {
  try {
    const { store } = getFallbackData();
    const filtered = store.items.filter((i) => (i.approvalStatus === "approved" || i.status === "approved") && !i.isDeleted);
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.get("/rejected", authenticateToken, authorizeModOrAdmin, async (req, res) => {
  try {
    const { store } = getFallbackData();
    const filtered = store.items.filter((i) => (i.approvalStatus === "rejected" || i.status === "rejected") && !i.isDeleted);
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.patch("/:id/approve", authenticateToken, authorizeModOrAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const approvedBy = req.user?.fullName || req.user?.email || "admin";
    const approvedAt = /* @__PURE__ */ new Date();
    const { store, save } = getFallbackData();
    let item = store.items.find((i) => String(i.id) === String(id) || String(i._id) === String(id) || String(i.item_id) === String(id));
    if (!item && isMongoDBActive()) {
      try {
        const isObjectId = typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
        const mongoItem = await MItem.findOne(isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) }).lean();
        if (mongoItem) {
          item = { ...mongoItem, id: String(mongoItem.id || mongoItem._id) };
          store.items.unshift(item);
        }
      } catch (err) {
        console.warn("MongoDB item lookup error during patch approve:", err.message);
      }
    }
    if (!item) return res.status(404).json({ error: "Listing not found." });
    item.approvalStatus = "approved";
    item.approval_status = "approved";
    item.status = "active";
    item.isApproved = true;
    item.isRejected = false;
    item.approvedBy = approvedBy;
    item.approvedAt = approvedAt;
    save();
    if (isMongoDBActive()) {
      try {
        const isObjectId = typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
        const filter = isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) };
        await MItem.updateOne(
          filter,
          {
            $set: {
              approvalStatus: "approved",
              status: "active",
              isApproved: true,
              isRejected: false,
              approvedBy,
              approvedAt
            }
          }
        );
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to update MItem approve status in MongoDB:", mErr.message);
      }
    }
    return res.json({ message: "Listing approved successfully!", item: mapItemResponse(item) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.patch("/:id/reject", authenticateToken, authorizeModOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  try {
    const rejectedBy = req.user?.fullName || req.user?.email || "admin";
    const rejectedAt = /* @__PURE__ */ new Date();
    const { store, save } = getFallbackData();
    const item = store.items.find((i) => String(i.id) === String(id));
    if (!item) return res.status(404).json({ error: "Listing not found." });
    item.approvalStatus = "rejected";
    item.approval_status = "rejected";
    item.status = "rejected";
    item.isRejected = true;
    item.isApproved = false;
    item.rejectedBy = rejectedBy;
    item.rejectedAt = rejectedAt;
    item.rejectionReason = reason || "Violation of campus community guidelines or incomplete details.";
    save();
    if (isMongoDBActive()) {
      try {
        await MItem.updateOne(
          { id: String(id) },
          {
            $set: {
              approvalStatus: "rejected",
              status: "rejected",
              isRejected: true,
              isApproved: false,
              rejectedBy,
              rejectedAt,
              rejectionReason: reason || "Violation of campus community guidelines or incomplete details."
            }
          }
        );
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to update MItem reject status in MongoDB:", mErr.message);
      }
    }
    return res.json({ message: "Listing rejected successfully!", item: mapItemResponse(item) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.patch("/:id/delete", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    const deletedBy = req.user?.fullName || req.user?.email || "user";
    const deletedAt = /* @__PURE__ */ new Date();
    const { store, save } = getFallbackData();
    const item = store.items.find((i) => String(i.id) === String(id));
    if (!item) return res.status(404).json({ error: "Listing not found." });
    const isOwner = item.userId && String(item.userId) === String(userId) || item.user_id && String(item.user_id) === String(userId) || item.firebaseUid && String(item.firebaseUid) === String(userId) || item.ownerUid && String(item.ownerUid) === String(userId) || item.email && req.user?.email && String(item.email).toLowerCase() === String(req.user.email).toLowerCase() || item.postedBy && item.postedBy.email && req.user?.email && item.postedBy.email.toLowerCase() === req.user.email.toLowerCase() || item.postedBy && item.postedBy.userId && String(item.postedBy.userId) === String(userId);
    if (!isOwner && req.user?.role !== "admin" && req.user?.role !== "moderator") {
      return res.status(403).json({ error: "Access denied. You are not authorized to delete this listing." });
    }
    item.status = "deleted";
    item.isDeleted = true;
    item.deletedBy = deletedBy;
    item.deletedAt = deletedAt;
    save();
    return res.json({ message: "Listing soft deleted successfully!", item: mapItemResponse(item) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.get("/my-items", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store } = getFallbackData();
    const filtered = store.items.filter((i) => {
      if (i.isDeleted) return false;
      const matchesUid = String(i.userId || i.firebaseUid || i.ownerUid || "") === String(userId);
      const matchesPostedByUid = i.postedBy && i.postedBy.userId && String(i.postedBy.userId) === String(userId);
      const matchesEmail = i.email && req.user?.email && String(i.email).toLowerCase() === String(req.user.email).toLowerCase();
      const matchesPostedByEmail = i.postedBy && i.postedBy.email && req.user?.email && String(i.postedBy.email).toLowerCase() === String(req.user.email).toLowerCase();
      return matchesUid || matchesPostedByUid || matchesEmail || matchesPostedByEmail;
    });
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.get("/admin/items", authenticateToken, authorizeModOrAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const { store } = getFallbackData();
    let filtered = [...store.items];
    if (status) {
      filtered = filtered.filter((i) => i.status === status || i.approvalStatus === status);
    }
    await syncLatestViews(filtered);
    return res.json({ items: filtered.map((item) => mapItemResponse(item)) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var items_default = router2;

// server/routes/chats.ts
var import_express3 = require("express");
var import_path7 = __toESM(require("path"), 1);
var import_fs7 = __toESM(require("fs"), 1);
var import_multer2 = __toESM(require("multer"), 1);
init_db();
init_mongodb();
var router3 = (0, import_express3.Router)();
var UPLOADS_DIR2 = import_path7.default.join(process.cwd(), "server-uploads");
if (!import_fs7.default.existsSync(UPLOADS_DIR2)) {
  import_fs7.default.mkdirSync(UPLOADS_DIR2, { recursive: true });
}
var chatStorage = import_multer2.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR2);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, "chat-" + uniqueSuffix + "-" + sanitizedOriginalName);
  }
});
var chatUpload = (0, import_multer2.default)({
  storage: chatStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  // 15MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|xls|xlsx|csv/;
    const ext = import_path7.default.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowedExtensions.test(ext)) {
      return cb(null, true);
    }
    cb(new Error("Supported file types: Images (JPG, PNG, WEBP, GIF) and Documents (PDF, DOC, DOCX, TXT)."));
  }
});
var formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};
router3.post("/upload", authenticateToken, chatUpload.single("file"), async (req, res) => {
  try {
    if (req.file) {
      const ext = import_path7.default.extname(req.file.originalname).toLowerCase();
      const isImage = /jpeg|jpg|png|webp|gif/.test(ext.replace(".", ""));
      const fileType = isImage ? "image" : ext === ".pdf" ? "pdf" : "document";
      let finalUrl = `/server-uploads/${req.file.filename}`;
      const fileSize = formatBytes(req.file.size);
      if (isImage) {
        try {
          const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || "eeae5ac8abaf61efd5cadc10b0fd0922";
          const fileBuffer = import_fs7.default.readFileSync(req.file.path);
          const base64Data = fileBuffer.toString("base64");
          const form = new URLSearchParams();
          form.append("image", base64Data);
          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString()
          });
          const imgbbData = await imgbbRes.json();
          if (imgbbData && imgbbData.success && imgbbData.data?.url) {
            finalUrl = imgbbData.data.url;
          }
        } catch (imgbbErr) {
          console.warn("ImgBB chat upload failed, using local static storage:", imgbbErr);
        }
      }
      return res.json({
        success: true,
        url: finalUrl,
        name: req.file.originalname,
        type: fileType,
        size: fileSize
      });
    }
    const { base64, fileName, mimeType, fileSize: clientSize } = req.body || {};
    if (base64) {
      let cleanBase64 = base64;
      let detectedExt = ".png";
      if (base64.startsWith("data:")) {
        const mimeMatch = base64.match(/data:([^;]+);/);
        if (mimeMatch) {
          const mime = mimeMatch[1];
          if (mime.includes("pdf")) detectedExt = ".pdf";
          else if (mime.includes("jpeg") || mime.includes("jpg")) detectedExt = ".jpg";
          else if (mime.includes("webp")) detectedExt = ".webp";
          else if (mime.includes("gif")) detectedExt = ".gif";
          else if (mime.includes("word") || mime.includes("doc")) detectedExt = ".docx";
          else if (mime.includes("text/plain")) detectedExt = ".txt";
        }
        cleanBase64 = base64.split(",")[1];
      }
      cleanBase64 = cleanBase64.replace(/\s/g, "");
      const isImage = /jpg|jpeg|png|webp|gif/.test(detectedExt.replace(".", ""));
      const finalFileName = fileName || `chat-${Date.now()}${detectedExt}`;
      const isPdf = detectedExt === ".pdf" || fileName && fileName.toLowerCase().endsWith(".pdf");
      const fileType = isImage ? "image" : isPdf ? "pdf" : "document";
      let finalUrl = "";
      const buffer = Buffer.from(cleanBase64, "base64");
      const sizeStr = clientSize || formatBytes(buffer.length);
      if (isImage) {
        try {
          const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || "eeae5ac8abaf61efd5cadc10b0fd0922";
          const form = new URLSearchParams();
          form.append("image", cleanBase64);
          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString()
          });
          const imgbbData = await imgbbRes.json();
          if (imgbbData && imgbbData.success && imgbbData.data?.url) {
            finalUrl = imgbbData.data.url;
          }
        } catch (imgbbErr) {
          console.warn("ImgBB base64 upload failed, writing locally:", imgbbErr);
        }
      }
      if (!finalUrl) {
        const uniqueName = `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${detectedExt}`;
        import_fs7.default.writeFileSync(import_path7.default.join(UPLOADS_DIR2, uniqueName), buffer);
        finalUrl = `/server-uploads/${uniqueName}`;
      }
      return res.json({
        success: true,
        url: finalUrl,
        name: finalFileName,
        type: fileType,
        size: sizeStr
      });
    }
    return res.status(400).json({ error: "No file or base64 data provided." });
  } catch (err) {
    console.error("Error handling chat upload:", err);
    return res.status(500).json({ error: "Failed to upload chat file: " + err.message });
  }
});
function formatThreadForUser(t, userId, store, currentUser) {
  const otherId = (t.participants || []).find((pId) => String(pId) !== String(userId));
  const otherUser = store.users ? store.users.find((u) => String(u.id) === String(otherId)) : void 0;
  const otherName = otherUser?.full_name || otherUser?.fullName || t.name || "Campus User";
  const otherAvatar = otherUser?.avatar || t.avatar || "";
  const otherInitials = otherAvatar || otherName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U";
  const validRawMessages = (t.messages || []).filter(
    (m) => !(m.deletedForUsers || []).map(String).includes(String(userId))
  );
  const threadUnreadCount = validRawMessages.filter((m) => {
    const isMe = String(m.senderId) === String(userId) || m.senderId === "me";
    if (isMe) return false;
    if (m.isDeleted || m.deletedForEveryone) return false;
    if (m.readBy && Array.isArray(m.readBy)) {
      return !m.readBy.map(String).includes(String(userId));
    }
    if (m.isRead !== void 0) {
      return !m.isRead;
    }
    return false;
  }).length;
  const messages = validRawMessages.map((m) => {
    const isMe = String(m.senderId) === String(userId) || m.senderId === "me";
    const senderUser = store.users ? store.users.find((u) => String(u.id) === String(m.senderId)) : void 0;
    const sName = isMe ? currentUser?.fullName || "Me" : senderUser?.full_name || senderUser?.fullName || m.senderName || otherName;
    const sInitials = isMe ? currentUser?.avatar || (currentUser?.fullName || "Me").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : senderUser?.avatar || m.senderInitials || sName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || otherInitials;
    const isDeleted = !!(m.isDeleted || m.deletedForEveryone);
    let attachmentObj = void 0;
    if (m.attachment && m.attachment.url) {
      attachmentObj = m.attachment;
    } else if (m.imageUrl) {
      attachmentObj = {
        url: m.imageUrl,
        name: m.fileName || "Photo.png",
        type: "image",
        size: m.fileSize
      };
    } else if (m.fileUrl) {
      attachmentObj = {
        url: m.fileUrl,
        name: m.fileName || "Document.pdf",
        type: m.fileType || (m.fileUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "document"),
        size: m.fileSize
      };
    }
    return {
      id: String(m.id || `msg-${Date.now()}-${Math.random()}`),
      senderId: isMe ? "me" : String(m.senderId),
      senderName: sName,
      senderInitials: sInitials,
      text: isDeleted ? "This message was deleted" : m.text,
      time: m.time || "Just now",
      attachment: isDeleted ? void 0 : attachmentObj,
      imageUrl: isDeleted ? void 0 : m.imageUrl || (attachmentObj?.type === "image" ? attachmentObj.url : void 0),
      fileUrl: isDeleted ? void 0 : m.fileUrl || (attachmentObj && attachmentObj.type !== "image" ? attachmentObj.url : void 0),
      fileName: isDeleted ? void 0 : m.fileName || attachmentObj?.name,
      fileType: isDeleted ? void 0 : m.fileType || attachmentObj?.type,
      fileSize: isDeleted ? void 0 : m.fileSize || attachmentObj?.size,
      isDeleted,
      deletedForEveryone: !!m.deletedForEveryone
    };
  });
  const lastMsg = messages[messages.length - 1];
  return {
    id: String(t.id),
    name: otherName,
    initials: otherInitials,
    preview: lastMsg ? lastMsg.isDeleted ? "This message was deleted" : lastMsg.attachment ? lastMsg.attachment.type === "image" ? "\u{1F4F7} Photo" : `\u{1F4CE} ${lastMsg.attachment.name}` : lastMsg.text : t.preview || "No messages yet",
    time: t.time || "Just now",
    unreadCount: threadUnreadCount,
    itemTitle: t.itemTitle || "General Inquiry",
    online: true,
    otherUserId: otherId ? String(otherId) : void 0,
    participants: t.participants ? t.participants.map(String) : [],
    messages
  };
}
router3.get("/", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store } = getFallbackData();
    const userThreads = (store.threads || []).filter(
      (t) => t && t.participants && t.participants.map(String).includes(String(userId)) && !(t.deletedForUsers || []).map(String).includes(String(userId))
    );
    const mappedThreads = userThreads.map(
      (t) => formatThreadForUser(t, String(userId), store, req.user)
    );
    return res.json({ threads: mappedThreads });
  } catch (err) {
    console.error("Error fetching chats:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.post("/initiate", authenticateToken, async (req, res) => {
  const senderId = String(req.user?.id);
  const {
    itemId,
    itemTitle,
    itemType,
    recipientId: rawRecipientId,
    recipientName: rawRecipientName,
    recipientAvatar,
    recipientEmail,
    draftMessage,
    threadId: clientThreadId
  } = req.body;
  try {
    const { store, save } = getFallbackData();
    let recipientUser = void 0;
    if (rawRecipientId) {
      recipientUser = store.users.find((u) => String(u.id) === String(rawRecipientId));
    }
    if (!recipientUser && recipientEmail) {
      recipientUser = store.users.find((u) => (u.email || "").toLowerCase() === String(recipientEmail).toLowerCase());
    }
    if (!recipientUser && rawRecipientName) {
      recipientUser = store.users.find(
        (u) => (u.full_name || u.fullName || "").toLowerCase() === String(rawRecipientName).toLowerCase()
      );
    }
    let finalRecipientId = recipientUser ? String(recipientUser.id) : String(rawRecipientId || `user-${String(rawRecipientName || "poster").toLowerCase().replace(/[^a-z0-9]/g, "-")}`);
    let finalRecipientName = recipientUser ? recipientUser.full_name || recipientUser.fullName : rawRecipientName || "Campus User";
    let finalRecipientAvatar = recipientUser?.avatar || recipientAvatar || "";
    if (String(senderId) === String(finalRecipientId)) {
      return res.status(400).json({ error: "You cannot initiate a chat with yourself." });
    }
    let targetThread = store.threads.find(
      (t) => t && t.participants && t.participants.map(String).includes(String(senderId)) && t.participants.map(String).includes(String(finalRecipientId)) && (!itemTitle || t.itemTitle && t.itemTitle.trim().toLowerCase() === String(itemTitle).trim().toLowerCase())
    );
    if (!targetThread) {
      targetThread = store.threads.find(
        (t) => t && t.participants && t.participants.map(String).includes(String(senderId)) && t.participants.map(String).includes(String(finalRecipientId))
      );
    }
    if (targetThread) {
      targetThread.deletedForUsers = (targetThread.deletedForUsers || []).filter((uId) => String(uId) !== String(senderId));
      if (itemTitle && (!targetThread.itemTitle || targetThread.itemTitle === "General Inquiry")) {
        targetThread.itemTitle = itemTitle;
      }
      save();
      return res.json({ thread: formatThreadForUser(targetThread, senderId, store, req.user) });
    }
    const newThreadId = clientThreadId || `thread-${Date.now()}`;
    const newThread = {
      id: newThreadId,
      name: finalRecipientName,
      initials: finalRecipientAvatar || finalRecipientName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U",
      avatar: finalRecipientAvatar,
      itemTitle: itemTitle || "Campus Listing",
      preview: draftMessage || "Inquiry regarding listing",
      time: "Just now",
      unreadCount: 0,
      online: true,
      otherUserId: finalRecipientId,
      participants: [String(senderId), String(finalRecipientId)],
      messages: [],
      deletedForUsers: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.threads.unshift(newThread);
    save();
    return res.json({ thread: formatThreadForUser(newThread, senderId, store, req.user) });
  } catch (err) {
    console.error("Error initiating chat thread:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.post("/messages", authenticateToken, async (req, res) => {
  let { recipientName, itemTitle, messageText, threadId, attachment, imageUrl, fileUrl, fileName, fileType, fileSize } = req.body;
  const senderId = req.user?.id;
  const senderName = req.user?.fullName || "Anonymous";
  const senderInitials = req.user?.avatar || "U";
  let normalizedAttachment = void 0;
  if (attachment && attachment.url) {
    normalizedAttachment = attachment;
  } else if (imageUrl) {
    normalizedAttachment = {
      url: imageUrl,
      name: fileName || "Photo.png",
      type: "image",
      size: fileSize
    };
  } else if (fileUrl) {
    normalizedAttachment = {
      url: fileUrl,
      name: fileName || "Document.pdf",
      type: fileType || (fileUrl.toLowerCase().endsWith(".pdf") ? "pdf" : "document"),
      size: fileSize
    };
  }
  if (!messageText || typeof messageText !== "string" || !messageText.trim()) {
    if (normalizedAttachment) {
      messageText = normalizedAttachment.type === "image" ? "\u{1F4F7} Photo" : `\u{1F4CE} ${normalizedAttachment.name || "Document"}`;
    } else {
      return res.status(400).json({ error: "Message body or file attachment cannot be empty." });
    }
  }
  messageText = sanitizeInput(messageText);
  const messageErr = validateMessage(messageText);
  if (messageErr && !normalizedAttachment) {
    return res.status(400).json({ error: messageErr });
  }
  if (recipientName) recipientName = sanitizeInput(recipientName);
  if (itemTitle) itemTitle = sanitizeInput(itemTitle);
  try {
    const { store, save } = getFallbackData();
    let targetThread = void 0;
    let recipientId = null;
    let realRecipientName = recipientName;
    let recipientAvatar = "";
    if (threadId) {
      targetThread = store.threads.find((t) => String(t.id) === String(threadId));
      if (targetThread && targetThread.participants) {
        const otherId = targetThread.participants.find((pId) => String(pId) !== String(senderId));
        if (otherId) {
          recipientId = String(otherId);
          const foundRecipient = store.users.find((u) => String(u.id) === String(otherId));
          if (foundRecipient) {
            realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
            recipientAvatar = foundRecipient.avatar || "";
          }
        }
      }
    }
    if (!recipientId && (req.body.recipientId || req.body.otherUserId)) {
      const idToTry = String(req.body.recipientId || req.body.otherUserId);
      const foundRecipient = store.users.find((u) => String(u.id) === idToTry);
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || "";
      } else {
        recipientId = idToTry;
        realRecipientName = recipientName || "Poster";
      }
    }
    if (!recipientId && req.body.recipientEmail) {
      const foundRecipient = store.users.find((u) => (u.email || "").toLowerCase() === String(req.body.recipientEmail).toLowerCase());
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || "";
      }
    }
    if (!recipientId && recipientName) {
      const foundRecipient = store.users.find(
        (u) => (u.full_name || u.fullName || "").toLowerCase() === recipientName.toLowerCase() || (u.full_name || u.fullName || "").toLowerCase().includes(recipientName.toLowerCase()) || recipientName.toLowerCase().includes((u.full_name || u.fullName || "").toLowerCase())
      );
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || "";
      } else {
        recipientId = `user-${recipientName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        realRecipientName = recipientName;
      }
    }
    if (recipientId && String(senderId) === String(recipientId)) {
      return res.status(400).json({ error: "You cannot send a message to yourself." });
    }
    if (!targetThread && recipientId) {
      targetThread = store.threads.find(
        (t) => t.participants && t.participants.map(String).includes(String(senderId)) && t.participants.map(String).includes(String(recipientId)) && (!itemTitle || t.itemTitle && t.itemTitle.toLowerCase() === itemTitle.toLowerCase())
      );
      if (!targetThread) {
        targetThread = store.threads.find(
          (t) => t.participants && t.participants.map(String).includes(String(senderId)) && t.participants.map(String).includes(String(recipientId))
        );
      }
    }
    const newMessage = {
      id: `m-${Date.now()}-${Math.random()}`,
      senderId: String(senderId),
      senderName,
      senderInitials,
      text: messageText,
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      readBy: [String(senderId)],
      isRead: false,
      attachment: normalizedAttachment,
      imageUrl: normalizedAttachment?.type === "image" ? normalizedAttachment.url : void 0,
      fileUrl: normalizedAttachment && normalizedAttachment.type !== "image" ? normalizedAttachment.url : void 0,
      fileName: normalizedAttachment?.name,
      fileType: normalizedAttachment?.type,
      fileSize: normalizedAttachment?.size
    };
    const threadPreview = normalizedAttachment ? normalizedAttachment.type === "image" ? "\u{1F4F7} Photo" : `\u{1F4CE} ${normalizedAttachment.name}` : messageText;
    if (targetThread) {
      if (!targetThread.messages) targetThread.messages = [];
      targetThread.messages.push(newMessage);
      targetThread.preview = threadPreview;
      targetThread.time = "Just now";
      targetThread.deletedForUsers = [];
    } else {
      if (!recipientId) {
        return res.status(404).json({ error: "Recipient user not found in local user registry." });
      }
      const newThread = {
        id: threadId || `thread-${Date.now()}`,
        name: realRecipientName || recipientName || "Anonymous",
        initials: (realRecipientName || recipientName || "Anonymous").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U",
        participants: [String(senderId), String(recipientId)],
        preview: threadPreview,
        time: "Just now",
        unreadCount: 0,
        itemTitle: itemTitle || "General Listing",
        online: true,
        messages: [newMessage],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.threads.unshift(newThread);
      targetThread = newThread;
    }
    if (recipientId && String(recipientId) !== String(senderId)) {
      const notifSnippet = normalizedAttachment ? normalizedAttachment.type === "image" ? "sent you a photo \u{1F4F7}" : `sent you a document (${normalizedAttachment.name}) \u{1F4CE}` : messageText.length > 50 ? `${messageText.substring(0, 47)}...` : messageText;
      await createUserNotification({
        userId: String(recipientId),
        title: `Message from ${senderName}`,
        message: `${senderName}: ${notifSnippet}`,
        text: `\u{1F4AC} <strong>${senderName}</strong> sent you a message regarding <em>"${targetThread.itemTitle || "Item"}"</em>: "${notifSnippet}"`,
        type: "chat_message"
      });
    }
    save();
    const responseThread = formatThreadForUser(targetThread, String(senderId), store, req.user);
    return res.status(201).json({ message: "Message sent successfully!", thread: responseThread });
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.delete("/messages/:messageId", authenticateToken, async (req, res) => {
  const { messageId } = req.params;
  const { threadId, deleteType = "everyone" } = req.body || {};
  const userId = req.user?.id;
  const userRole = req.user?.role || "student";
  try {
    const { store, save } = getFallbackData();
    let targetThread = (store.threads || []).find(
      (t) => (threadId ? String(t.id) === String(threadId) : true) && (t.messages || []).some((m) => String(m.id) === String(messageId))
    );
    if (!targetThread) {
      return res.status(404).json({ error: "Message or thread not found." });
    }
    const targetMessage = (targetThread.messages || []).find((m) => String(m.id) === String(messageId));
    if (!targetMessage) {
      return res.status(404).json({ error: "Message not found in conversation." });
    }
    const isMessageSender = String(targetMessage.senderId) === String(userId) || targetMessage.senderId === "me";
    const isAdminOrMod = userRole === "admin" || userRole === "moderator";
    if (deleteType === "everyone") {
      if (!isMessageSender && !isAdminOrMod) {
        return res.status(403).json({ error: "You can only delete your own messages for everyone." });
      }
      targetMessage.deletedForEveryone = true;
      targetMessage.isDeleted = true;
      targetMessage.text = "This message was deleted";
    } else {
      if (!targetMessage.deletedForUsers) {
        targetMessage.deletedForUsers = [];
      }
      if (!targetMessage.deletedForUsers.map(String).includes(String(userId))) {
        targetMessage.deletedForUsers.push(String(userId));
      }
    }
    const validMessagesForSender = targetThread.messages.filter(
      (m) => !(m.deletedForUsers || []).map(String).includes(String(userId))
    );
    const lastMsg = validMessagesForSender[validMessagesForSender.length - 1];
    if (lastMsg) {
      targetThread.preview = lastMsg.isDeleted || lastMsg.deletedForEveryone ? "This message was deleted" : lastMsg.text;
    } else {
      targetThread.preview = "No messages in conversation";
    }
    if (isMongoDBActive()) {
      try {
        if (deleteType === "everyone") {
          await MChatThread.updateOne(
            { id: String(targetThread.id), "messages.id": String(messageId) },
            {
              $set: {
                "messages.$.deletedForEveryone": true,
                "messages.$.isDeleted": true,
                "messages.$.text": "This message was deleted",
                preview: targetThread.preview
              }
            }
          );
        } else {
          await MChatThread.updateOne(
            { id: String(targetThread.id), "messages.id": String(messageId) },
            {
              $addToSet: { "messages.$.deletedForUsers": String(userId) },
              $set: { preview: targetThread.preview }
            }
          );
        }
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to sync message deletion with MongoDB:", mErr.message);
      }
    }
    save();
    return res.json({
      message: deleteType === "everyone" ? "Message deleted for everyone successfully." : "Message deleted for you.",
      messageId,
      deleteType
    });
  } catch (err) {
    console.error("Error deleting message:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.delete("/:threadId", authenticateToken, async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    const threadIndex = (store.threads || []).findIndex((t) => String(t.id) === String(threadId));
    if (threadIndex === -1) {
      return res.status(404).json({ error: "Thread not found." });
    }
    const thread = store.threads[threadIndex];
    if (!thread.deletedForUsers) {
      thread.deletedForUsers = [];
    }
    if (!thread.deletedForUsers.map(String).includes(String(userId))) {
      thread.deletedForUsers.push(String(userId));
    }
    const participants = thread.participants || [];
    const allDeleted = participants.every(
      (pId) => (thread.deletedForUsers || []).map(String).includes(String(pId))
    );
    if (allDeleted) {
      store.threads.splice(threadIndex, 1);
    }
    if (isMongoDBActive()) {
      try {
        if (allDeleted) {
          await MChatThread.deleteOne({ id: String(threadId) });
        } else {
          await MChatThread.updateOne(
            { id: String(threadId) },
            { $addToSet: { deletedForUsers: String(userId) } }
          );
        }
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Failed to sync thread deletion with MongoDB:", mErr.message);
      }
    }
    save();
    return res.json({ message: "Conversation thread deleted successfully.", threadId });
  } catch (err) {
    console.error("Error deleting thread:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.post("/:threadId/report", authenticateToken, async (req, res) => {
  const { threadId } = req.params;
  const { reason, description } = req.body;
  const reporterId = req.user?.id;
  const reporterName = req.user?.fullName || "Anonymous";
  if (!reason) {
    return res.status(400).json({ error: "Please specify a reason for reporting the conversation." });
  }
  try {
    const { store, save } = getFallbackData();
    const thread = store.threads.find((t) => String(t.id) === String(threadId));
    if (!thread) {
      return res.status(404).json({ error: "Chat thread not found." });
    }
    thread.status = "under_review";
    thread.reportStatus = "pending";
    let reportedUserId = "1";
    const otherId = thread.participants?.find((pId) => String(pId) !== String(reporterId));
    const otherUser = otherId ? store.users.find((u) => String(u.id) === String(otherId)) : null;
    if (otherUser) {
      reportedUserId = otherUser.id;
    }
    const reportedName = otherUser ? otherUser.full_name || otherUser.fullName : "Other User";
    if (!store.conversation_reports) {
      store.conversation_reports = [];
    }
    const newReport = {
      reportId: `rep-${Date.now()}`,
      conversationId: threadId,
      reportedBy: reporterId,
      reportedByName: reporterName,
      reportedUser: reportedUserId,
      reportedUserName: reportedName,
      reason,
      description: description || "",
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.conversation_reports.push(newReport);
    save();
    if (isMongoDBActive()) {
      MConversationReport.create(newReport).catch((mErr) => console.warn("MConversationReport create error:", mErr));
    }
    await createAdminNotification({
      title: `\u{1F6A8} Conversation Reported: ${reason}`,
      message: `Chat between ${reporterName} and ${reportedName} has been reported for "${reason}". Content is now open for admin review.`,
      type: "conversation_reported",
      category: "Messages",
      priority: "high",
      relatedUserId: reporterId,
      relatedConversationId: threadId
    });
    return res.status(201).json({ message: "Conversation reported successfully. It is now under administrator review.", report: newReport });
  } catch (err) {
    console.error("Error reporting conversation:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.post("/read-all", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    (store.threads || []).forEach((t) => {
      if (t.participants && t.participants.map(String).includes(String(userId))) {
        (t.messages || []).forEach((m) => {
          if (!m.readBy) {
            m.readBy = [String(m.senderId)];
          }
          if (userId && !m.readBy.map(String).includes(String(userId))) {
            m.readBy.push(String(userId));
          }
          m.isRead = true;
        });
        t.unreadCount = 0;
      }
    });
    save();
    return res.json({ success: true, message: "All conversations marked as read." });
  } catch (err) {
    console.error("Error marking all conversations as read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.post("/:threadId/read", authenticateToken, async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    const targetThread = (store.threads || []).find((t) => String(t.id) === String(threadId));
    if (targetThread) {
      (targetThread.messages || []).forEach((m) => {
        if (!m.readBy) {
          m.readBy = [String(m.senderId)];
        }
        if (userId && !m.readBy.map(String).includes(String(userId))) {
          m.readBy.push(String(userId));
        }
        m.isRead = true;
      });
      targetThread.unreadCount = 0;
      save();
    }
    return res.json({ success: true, threadId, message: "Thread marked as read." });
  } catch (err) {
    console.error("Error marking thread as read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router3.put("/:threadId/read", authenticateToken, async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    const targetThread = (store.threads || []).find((t) => String(t.id) === String(threadId));
    if (targetThread) {
      (targetThread.messages || []).forEach((m) => {
        if (!m.readBy) {
          m.readBy = [String(m.senderId)];
        }
        if (userId && !m.readBy.map(String).includes(String(userId))) {
          m.readBy.push(String(userId));
        }
        m.isRead = true;
      });
      targetThread.unreadCount = 0;
      save();
    }
    return res.json({ success: true, threadId, message: "Thread marked as read." });
  } catch (err) {
    console.error("Error marking thread as read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
var chats_default = router3;

// server/routes/notifications.ts
var import_express4 = require("express");
var import_mongoose5 = __toESM(require("mongoose"), 1);
init_db();
init_mongodb();
var router4 = (0, import_express4.Router)();
function formatNotificationDate(rawDate) {
  if (!rawDate) return "Just now";
  if (typeof rawDate === "string" && /^(just now|\d+\s*(m|h|d|s|min|hr|day)s?\s*ago|today|yesterday)/i.test(rawDate.trim())) {
    return rawDate.trim();
  }
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const now = /* @__PURE__ */ new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1e3);
      if (diffSecs < 60) return "Just now";
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
  }
  return String(rawDate);
}
router4.get("/", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store } = getFallbackData();
    if (!store.notifications) {
      store.notifications = [];
    }
    if (isMongoDBActive() && userId) {
      try {
        const dbNotifs = await MNotification.find({
          $or: [
            { userId: String(userId) },
            { user_id: String(userId) },
            { user_id: "" },
            { user_id: { $exists: false } }
          ]
        }).sort({ createdAt: -1, created_at: -1, _id: -1 }).limit(40).lean();
        if (dbNotifs && dbNotifs.length > 0) {
          const existingIds = new Set(store.notifications.map((n) => String(n.id || n._id)));
          for (const dn of dbNotifs) {
            const notifId = String(dn.id || dn._id);
            if (!existingIds.has(notifId)) {
              const notifTitle = (dn.title || "").trim().replace(/^notification:?/i, "").trim();
              const notifMsg = sanitizeNotificationText(dn.message || "");
              const notifText = sanitizeNotificationText(dn.text || (notifTitle && notifTitle.toLowerCase() !== "notification" ? `<strong>${notifTitle}</strong>: ${notifMsg}` : notifMsg));
              const notifDate = dn.createdAt || dn.created_at || dn.time;
              store.notifications.push({
                id: notifId,
                userId: String(dn.user_id || dn.userId || userId),
                user_id: String(dn.user_id || dn.userId || userId),
                text: notifText || "Campus alert notification",
                title: notifTitle && notifTitle.toLowerCase() !== "notification" ? notifTitle : "Notification",
                message: notifMsg || notifText,
                time: formatNotificationDate(notifDate),
                unread: dn.is_read !== true && dn.isRead !== true,
                type: dn.type || "system"
              });
            }
          }
        }
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error querying MNotification in MongoDB:", mErr.message);
      }
    }
    const userNotifications = store.notifications.filter(
      (n) => !n.user_id && !n.userId || String(n.user_id) === String(userId) || String(n.userId) === String(userId)
    ).map((n) => {
      const cleanTitle = (n.title || "").trim().replace(/^notification:?/i, "").trim();
      const rawMsg = sanitizeNotificationText(n.message || "");
      const rawTxt = sanitizeNotificationText(n.text || "");
      let text = rawTxt || rawMsg;
      if (!text || text.trim().length === 0) {
        if (cleanTitle && cleanTitle.toLowerCase() !== "notification" && rawMsg) {
          text = `<strong>${cleanTitle}</strong>: ${rawMsg}`;
        } else if (rawMsg) {
          text = rawMsg;
        } else if (cleanTitle && cleanTitle.toLowerCase() !== "notification") {
          text = `<strong>${cleanTitle}</strong>`;
        } else {
          text = "Campus alert notification";
        }
      }
      text = sanitizeNotificationText(text);
      const isUnread = n.unread !== false && n.is_read !== true && n.isRead !== true && n.read !== true;
      const timeStr = formatNotificationDate(n.time || n.createdAt || n.created_at || n.timestamp);
      return {
        id: String(n.id || n._id || generateUniqueId("notif")),
        userId: String(n.userId || n.user_id || userId || ""),
        user_id: String(n.user_id || n.userId || userId || ""),
        text,
        title: cleanTitle && cleanTitle.toLowerCase() !== "notification" ? cleanTitle : "Notification",
        message: rawMsg || text,
        time: timeStr,
        unread: isUnread,
        isRead: !isUnread,
        is_read: !isUnread,
        type: n.type || "general",
        createdAt: n.createdAt || n.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    return res.json({ notifications: userNotifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router4.post("/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n) => {
        if (String(n.id) === String(id) || String(n._id) === String(id)) {
          return { ...n, unread: false, is_read: true, isRead: true };
        }
        return n;
      });
      save();
    }
    if (isMongoDBActive()) {
      try {
        const queryConds = [{ id: String(id) }];
        if (import_mongoose5.default.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MNotification.updateMany(
          { $or: queryConds },
          { $set: { is_read: true } }
        );
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error updating single MNotification read status in MongoDB:", mErr.message);
      }
    }
    return res.json({ success: true, message: "Notification marked as read." });
  } catch (err) {
    console.error("Error marking single notification read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router4.put("/:id/read", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n) => {
        if (String(n.id) === String(id) || String(n._id) === String(id)) {
          return { ...n, unread: false, is_read: true, isRead: true };
        }
        return n;
      });
      save();
    }
    if (isMongoDBActive()) {
      try {
        const queryConds = [{ id: String(id) }];
        if (import_mongoose5.default.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MNotification.updateMany(
          { $or: queryConds },
          { $set: { is_read: true } }
        );
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error updating single MNotification read status in MongoDB:", mErr.message);
      }
    }
    return res.json({ success: true, message: "Notification marked as read." });
  } catch (err) {
    console.error("Error marking single notification read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router4.post("/read-all", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    if (store.notifications) {
      store.notifications = store.notifications.map((n) => {
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
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error updating MNotification read-all in MongoDB:", mErr.message);
      }
    }
    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router4.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    const idx = (store.notifications || []).findIndex(
      (n) => String(n.id) === String(id) && (!n.user_id && !n.userId || String(n.user_id) === String(userId) || String(n.userId) === String(userId))
    );
    if (idx !== -1) {
      store.notifications.splice(idx, 1);
      save();
    }
    if (isMongoDBActive()) {
      try {
        const queryConds = [{ id: String(id) }];
        if (import_mongoose5.default.Types.ObjectId.isValid(String(id))) {
          queryConds.push({ _id: String(id) });
        }
        await MNotification.deleteMany({
          $and: [
            { $or: queryConds },
            { $or: [{ userId: String(userId) }, { user_id: String(userId) }] }
          ]
        });
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error deleting MNotification in MongoDB:", mErr.message);
      }
    }
    return res.json({ success: true, message: "Notification deleted." });
  } catch (err) {
    console.error("Error deleting notification:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router4.delete("/", authenticateToken, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { store, save } = getFallbackData();
    store.notifications = (store.notifications || []).filter(
      (n) => Boolean(n.user_id && n.userId && String(n.user_id) !== String(userId) && String(n.userId) !== String(userId))
    );
    save();
    if (isMongoDBActive() && userId) {
      try {
        await MNotification.deleteMany({
          $or: [{ userId: String(userId) }, { user_id: String(userId) }]
        });
      } catch (mErr) {
        console.warn("\u26A0\uFE0F Error clearing user MNotification in MongoDB:", mErr.message);
      }
    }
    return res.json({ success: true, message: "All notifications cleared." });
  } catch (err) {
    console.error("Error clearing notifications:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
var notifications_default = router4;

// server/routes/admin.ts
var import_express5 = require("express");
var import_mongoose6 = __toESM(require("mongoose"), 1);
init_db();
init_mongodb();
init_firebase();
init_profile();
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
var router5 = (0, import_express5.Router)();
router5.use(authenticateToken);
router5.use(authorizeModOrAdmin);
var isRegisteredAndVerifiedUser = (u) => {
  if (!u || u.fullName === "Verified Student") return false;
  if (u.role === "admin" || u.role === "moderator") return true;
  const isVerified = u.emailVerified === true || u.email_verified === true || u.registrationCompleted === true;
  const isPending = String(u.status || "").toLowerCase() === "pending" || String(u.accountStatus || "").toLowerCase() === "pending";
  return isVerified && !isPending;
};
router5.get("/stats", async (req, res) => {
  try {
    if (isMongoDBActive()) {
      const validStudentCondition = {
        $and: [
          { fullName: { $ne: "Verified Student" } },
          { role: { $nin: ["admin", "moderator"] } },
          {
            $or: [
              { emailVerified: true },
              { email_verified: true },
              { registrationCompleted: true }
            ]
          },
          { status: { $nin: ["Pending", "pending"] } },
          { accountStatus: { $nin: ["Pending", "pending"] } }
        ]
      };
      const totalStudents = await MUser.countDocuments(validStudentCondition);
      const totalAdmins = await MUser.countDocuments({ role: "admin" });
      const totalModerators = await MUser.countDocuments({ role: "moderator" });
      const totalStaff = totalAdmins + totalModerators;
      const totalAccounts = totalStudents + totalStaff;
      const activeStudents = await MUser.countDocuments({
        $and: [
          validStudentCondition,
          { status: { $nin: ["suspended", "banned", "Pending", "pending"] } },
          { accountStatus: { $nin: ["suspended", "banned", "Pending", "pending"] } },
          { isSuspended: { $ne: true } },
          { isBanned: { $ne: true } }
        ]
      });
      const suspendedStudents = await MUser.countDocuments({
        $and: [
          validStudentCondition,
          { $or: [{ status: "suspended" }, { status: "locked" }, { accountStatus: "suspended" }, { isSuspended: true }] }
        ]
      });
      const bannedUsers = await MUser.countDocuments({
        $or: [{ status: "banned" }, { accountStatus: "banned" }, { isBanned: true }]
      });
      const flaggedUsers = await MUser.countDocuments({
        $or: [{ status: "flagged" }, { accountStatus: "flagged" }, { isFlagged: true }, { warningCount: { $gt: 0 } }]
      });
      const verifiedUsers = await MUser.countDocuments({
        $or: [{ isVerified: true }, { is_verified: true }, { idVerificationStatus: "verified" }]
      });
      const totalPosts = await MItem.countDocuments({ isDeleted: { $ne: true } });
      const pendingApproval = await MItem.countDocuments({
        $or: [{ status: "pending" }, { approvalStatus: "pending" }],
        isDeleted: { $ne: true }
      });
      const approvedPosts = await MItem.countDocuments({
        $or: [{ status: "approved" }, { approvalStatus: "approved" }, { status: "active" }],
        isDeleted: { $ne: true }
      });
      const returnedItems = await MItem.countDocuments({
        $or: [{ status: "returned" }, { status: "claimed" }, { status: "resolved" }],
        isDeleted: { $ne: true }
      });
      const deletedListings = await MItem.countDocuments({
        $or: [{ isDeleted: true }, { status: "deleted" }]
      });
      const totalItems = totalPosts;
      const claimedItems = returnedItems;
      const lostItems = await MItem.countDocuments({ type: "lost", isDeleted: { $ne: true } });
      const foundItems = await MItem.countDocuments({ type: "found", isDeleted: { $ne: true } });
      const activeItems = await MItem.countDocuments({ status: "active", isDeleted: { $ne: true } });
      const viewsAggregation = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
      ]);
      const totalViews = viewsAggregation[0]?.totalViews || 0;
      const matchSuccessRate = totalPosts > 0 ? `${(returnedItems / totalPosts * 100).toFixed(1)}%` : "0.0%";
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
      const isStudentUser = (u) => {
        if (!u || u.fullName === "Verified Student") return false;
        if (u.role === "admin" || u.role === "moderator") return false;
        const isVerified = u.emailVerified === true || u.email_verified === true || u.registrationCompleted === true;
        const isPending = String(u.status || "").toLowerCase() === "pending" || String(u.accountStatus || "").toLowerCase() === "pending";
        return isVerified && !isPending;
      };
      const validStudents = rawUsers.filter(isStudentUser);
      const totalStudents = validStudents.length;
      const totalAdmins = rawUsers.filter((u) => u.role === "admin").length;
      const totalModerators = rawUsers.filter((u) => u.role === "moderator").length;
      const totalStaff = totalAdmins + totalModerators;
      const totalAccounts = totalStudents + totalStaff;
      const activeStudents = validStudents.filter(
        (u) => String(u.status || "").toLowerCase() !== "suspended" && String(u.status || "").toLowerCase() !== "banned" && String(u.accountStatus || "").toLowerCase() !== "suspended" && String(u.accountStatus || "").toLowerCase() !== "banned" && !u.isSuspended && !u.isBanned
      ).length;
      const suspendedStudents = validStudents.filter(
        (u) => String(u.status || "").toLowerCase() === "suspended" || String(u.status || "").toLowerCase() === "locked" || String(u.accountStatus || "").toLowerCase() === "suspended" || u.isSuspended
      ).length;
      const bannedUsers = rawUsers.filter(
        (u) => String(u.status || "").toLowerCase() === "banned" || String(u.accountStatus || "").toLowerCase() === "banned" || u.isBanned
      ).length;
      const flaggedUsers = rawUsers.filter(
        (u) => String(u.status || "").toLowerCase() === "flagged" || String(u.accountStatus || "").toLowerCase() === "flagged" || u.isFlagged || u.warningCount && u.warningCount > 0
      ).length;
      const verifiedUsers = rawUsers.filter(
        (u) => u.isVerified || u.is_verified || u.idVerificationStatus === "verified"
      ).length;
      const totalPosts = rawItems.filter((i) => !i.isDeleted && i.status !== "deleted").length;
      const pendingApproval = rawItems.filter((i) => !i.isDeleted && (i.status === "pending" || i.approvalStatus === "pending")).length;
      const approvedPosts = rawItems.filter((i) => !i.isDeleted && (i.status === "approved" || i.approvalStatus === "approved" || i.status === "active")).length;
      const returnedItems = rawItems.filter((i) => !i.isDeleted && (i.status === "returned" || i.status === "claimed" || i.status === "resolved")).length;
      const deletedListings = rawItems.filter((i) => i.isDeleted || i.status === "deleted").length;
      const totalItems = totalPosts;
      const lostItems = store.items.filter((i) => !i.isDeleted && i.type === "lost").length;
      const foundItems = store.items.filter((i) => !i.isDeleted && i.type === "found").length;
      const activeItems = store.items.filter((i) => !i.isDeleted && i.status === "active").length;
      const claimedItems = returnedItems;
      const totalViews = store.items.filter((i) => !i.isDeleted).reduce((sum, item) => sum + (item.views || 0), 0);
      const matchSuccessRate = totalPosts > 0 ? `${(returnedItems / totalPosts * 100).toFixed(1)}%` : "0.0%";
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
  } catch (err) {
    console.error("Error fetching admin dashboard stats:", err);
    return res.status(500).json({ error: "Internal server error fetching admin stats: " + err.message });
  }
});
router5.get("/analytics", async (req, res) => {
  try {
    if (isMongoDBActive()) {
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
      const lostCount = await MItem.countDocuments({ type: "lost", isDeleted: { $ne: true } });
      const foundCount = await MItem.countDocuments({ type: "found", isDeleted: { $ne: true } });
      const postsByDeptAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
          _id: { $ifNull: ["$postedBy.department", "General"] },
          count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { department: "$_id", count: 1, _id: 0 } }
      ]);
      const postsByCategoryAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
          _id: { $ifNull: ["$category", "Other"] },
          count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { category: "$_id", count: 1, _id: 0 } }
      ]);
      const postsBySubcategoryAgg = await MItem.aggregate([
        { $match: { isDeleted: { $ne: true }, subcategory: { $exists: true, $ne: "" } } },
        { $group: {
          _id: { $ifNull: ["$subcategory", "Other"] },
          count: { $sum: 1 }
        } },
        { $sort: { count: -1 } },
        { $project: { subcategory: "$_id", count: 1, _id: 0 } }
      ]);
      const totalPosts = await MItem.countDocuments({ isDeleted: { $ne: true } }) || 1;
      const approvedPosts = await MItem.countDocuments({
        $or: [{ status: "approved" }, { approvalStatus: "approved" }, { status: "active" }],
        isDeleted: { $ne: true }
      });
      const pendingApproval = await MItem.countDocuments({
        $or: [{ status: "pending" }, { approvalStatus: "pending" }],
        isDeleted: { $ne: true }
      });
      const returnedItems = await MItem.countDocuments({
        status: { $in: ["returned", "reunited", "claimed", "resolved"] },
        isDeleted: { $ne: true }
      });
      const approvalRate = (approvedPosts / totalPosts * 100).toFixed(1);
      const pendingRate = (pendingApproval / totalPosts * 100).toFixed(1);
      const returnedRate = (returnedItems / totalPosts * 100).toFixed(1);
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
      const claimsSubmitted = await MClaim.countDocuments({});
      const claimsApproved = await MClaim.countDocuments({ status: "approved" });
      const claimsRejected = await MClaim.countDocuments({ status: "rejected" });
      const claimsPending = await MClaim.countDocuments({ status: "pending" });
      const returnedList = await MItem.find({ status: "returned", isDeleted: { $ne: true } }).lean();
      let totalResolutionHours = 0;
      let countWithResolution = 0;
      for (const item of returnedList) {
        if (item.createdAt && item.updatedAt) {
          const start = new Date(item.createdAt).getTime();
          const end = new Date(item.updatedAt).getTime();
          const diff = end - start;
          if (diff > 0) {
            totalResolutionHours += diff / (1e3 * 60 * 60);
            countWithResolution++;
          }
        }
      }
      const avgResolutionTime = countWithResolution > 0 ? (totalResolutionHours / countWithResolution).toFixed(1) : "0";
      const totalUsers = await MUser.countDocuments({}) || 0;
      const verifiedUsers = await MUser.countDocuments({ $or: [{ isVerified: true }, { is_verified: true }, { emailVerified: true }, { verified: true }] }) || 0;
      const studentUsers = await MUser.countDocuments({ role: { $in: ["student", "user"] } }) || 0;
      const staffUsers = await MUser.countDocuments({ role: { $in: ["admin", "moderator", "coordinator", "staff"] } }) || 0;
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
      const enrichedMods = [];
      for (const mod of mostActiveModeratorsAgg) {
        const user = await MUser.findOne({ id: mod.moderatorId }).lean();
        enrichedMods.push({
          moderatorId: mod.moderatorId,
          count: mod.count,
          name: user ? user.full_name : `Mod ${mod.moderatorId}`
        });
      }
      const mostViewedPosts = await MItem.find({ isDeleted: { $ne: true } }).sort({ views: -1 }).limit(10).select("id title views category type status").lean();
      const approvedClaims = await MClaim.find({ status: "approved" }).lean();
      const claimedItemsIds = approvedClaims.map((c) => c.item_id);
      const mostClaimedItems = await MItem.find({ id: { $in: claimedItemsIds } }).limit(10).select("id title category type status").lean();
      const days = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
      }
      const dailyActivity = [];
      for (const date of days) {
        const startOfDay = /* @__PURE__ */ new Date(date + "T00:00:00.000Z");
        const endOfDay = /* @__PURE__ */ new Date(date + "T23:59:59.999Z");
        const dateObj = new Date(date);
        const dayName = isNaN(dateObj.getTime()) ? date : dayNames[dateObj.getDay()];
        const registrations = await MUser.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
        const lostPosts = await MItem.countDocuments({
          $or: [
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
            { date }
          ],
          type: "lost",
          isDeleted: { $ne: true }
        });
        const foundPosts = await MItem.countDocuments({
          $or: [
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
            { date }
          ],
          type: "found",
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
      const topCategoryObj = postsByCategoryAgg[0] || { category: "None", count: 0 };
      const topCategoryPercent = totalPosts > 0 ? (topCategoryObj.count / totalPosts * 100).toFixed(1) : "0";
      const topDeptObj = postsByDeptAgg[0] || { department: "General", count: 0 };
      const dynamicInsights = [
        {
          type: "category",
          title: "Top Reported Category",
          description: topCategoryObj.count > 0 ? `Category "${topCategoryObj.category}" leads listings with ${topCategoryObj.count} items (${topCategoryPercent}% of all recorded reports).` : "No category distribution logged yet."
        },
        {
          type: "department",
          title: "Active Department",
          description: topDeptObj.count > 0 ? `The "${topDeptObj.department}" department logged the highest activity with ${topDeptObj.count} registered items.` : "Department data is distributed evenly across campus."
        },
        {
          type: "resolution",
          title: "Campus Return Rate",
          description: returnedItems > 0 ? `Successfully recovered and returned ${returnedItems} items with a resolution rate of ${returnedRate}%.` : "No items marked as reunited or returned yet."
        },
        {
          type: "pending",
          title: "Queue Status",
          description: pendingApproval > 0 ? `${pendingApproval} item post${pendingApproval === 1 ? "" : "s"} currently pending administrator review.` : "All listings and student verification reviews are up to date with zero backlog."
        }
      ];
      const isRealAccount = (u) => {
        if (!u) return false;
        const email = String(u.email || "").trim().toLowerCase();
        const id = String(u.id || u.user_id || u._id || "");
        const name = String(u.fullName || u.full_name || u.name || "").trim().toLowerCase();
        if (id.startsWith("sim-")) return false;
        if (email.startsWith("student_") && email.endsWith("@jkkniu.edu.bd")) return false;
        if (name === "test student" || name === "verified student") return false;
        if (!email) return false;
        return true;
      };
      const allLiveUsers = await getAllUsersList();
      const recentRegisteredUsers = allLiveUsers.filter(isRealAccount).sort((a, b) => {
        const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
        return db - da;
      }).slice(0, 15).map((rawU) => {
        const u = syncAndEvaluateUser(rawU, allLiveUsers);
        const isStaff = u.role === "admin" || u.role === "moderator" || u.role === "coordinator" || String(u.email || "").toLowerCase() === "nazrulretrievers@gmail.com";
        const hasDoc = !!(u.verificationDocument && String(u.verificationDocument).trim().length > 0);
        const isApproved = (u.idVerificationStatus === "verified" || u.isVerified === true || u.is_verified === true || u.verified === true) && !isStaff;
        let idStatus = "unverified";
        if (isStaff) {
          idStatus = "verified";
        } else if (isApproved) {
          idStatus = "verified";
        } else if (u.idVerificationStatus === "pending" || hasDoc) {
          idStatus = "pending";
        } else {
          idStatus = "unverified";
        }
        const originalTime = u.createdAt || u.created_at || rawU.createdAt || rawU.created_at || u.date || (/* @__PURE__ */ new Date()).toISOString();
        return {
          id: String(u.id || u.user_id || u._id || "USR-N/A"),
          name: u.fullName || u.full_name || u.name || "Campus User",
          email: u.email || "N/A",
          role: u.role || "student",
          department: u.department || "General",
          studentId: u.studentId || u.student_id || u.rollNumber || "-",
          isVerified: isApproved || isStaff,
          idVerificationStatus: idStatus,
          hasIdDocument: hasDoc,
          createdAt: originalTime,
          status: u.status || u.accountStatus || "active"
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
      const { store } = getFallbackData();
      const getMonthStr = (dateVal) => {
        if (!dateVal) return (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
        try {
          if (typeof dateVal === "string") {
            if (dateVal.length >= 7) return dateVal.substring(0, 7);
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 7);
          } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal.toISOString().substring(0, 7);
          } else if (typeof dateVal === "number") {
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 7);
          }
        } catch {
        }
        return (/* @__PURE__ */ new Date()).toISOString().substring(0, 7);
      };
      const getDateStr = (dateVal) => {
        if (!dateVal) return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
        try {
          if (typeof dateVal === "string") {
            if (dateVal.length >= 10) return dateVal.substring(0, 10);
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
          } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal.toISOString().substring(0, 10);
          } else if (typeof dateVal === "number") {
            const parsed = new Date(dateVal);
            if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
          }
        } catch {
        }
        return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
      };
      const monthlyMap = /* @__PURE__ */ new Map();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const m = getMonthStr(i.date);
        if (!monthlyMap.has(m)) {
          monthlyMap.set(m, { lost: 0, found: 0 });
        }
        const val = monthlyMap.get(m);
        if (i.type === "lost") val.lost++;
        else val.found++;
      }
      const postsPerMonth = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        lost: data.lost,
        found: data.found
      })).sort((a, b) => a.month.localeCompare(b.month));
      const lostCount = store.items.filter((i) => !i.isDeleted && i.type === "lost").length;
      const foundCount = store.items.filter((i) => !i.isDeleted && i.type === "found").length;
      const deptMap = /* @__PURE__ */ new Map();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const dept = i.postedBy?.department || "General";
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      }
      const postsByDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({
        department,
        count
      })).sort((a, b) => b.count - a.count);
      const catMap = /* @__PURE__ */ new Map();
      for (const i of store.items) {
        if (i.isDeleted) continue;
        const cat = i.category || "Other";
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
      }
      const postsByCategory = Array.from(catMap.entries()).map(([category, count]) => ({
        category,
        count
      })).sort((a, b) => b.count - a.count);
      const subMap = /* @__PURE__ */ new Map();
      for (const i of store.items) {
        if (i.isDeleted || !i.subcategory) continue;
        subMap.set(i.subcategory, (subMap.get(i.subcategory) || 0) + 1);
      }
      const postsBySubcategory = Array.from(subMap.entries()).map(([subcategory, count]) => ({
        subcategory,
        count
      })).sort((a, b) => b.count - a.count);
      const totalPosts = store.items.filter((i) => !i.isDeleted).length || 1;
      const approvedPosts = store.items.filter((i) => !i.isDeleted && (i.status === "approved" || i.approvalStatus === "approved" || i.status === "active")).length;
      const pendingApproval = store.items.filter((i) => !i.isDeleted && (i.status === "pending" || i.approvalStatus === "pending")).length;
      const returnedItems = store.items.filter((i) => !i.isDeleted && i.status === "returned").length;
      const approvalRate = (approvedPosts / totalPosts * 100).toFixed(1);
      const pendingRate = (pendingApproval / totalPosts * 100).toFixed(1);
      const returnedRate = (returnedItems / totalPosts * 100).toFixed(1);
      const userMonthMap = /* @__PURE__ */ new Map();
      for (const u of store.users) {
        const m = getMonthStr(u.createdAt);
        if (!userMonthMap.has(m)) {
          userMonthMap.set(m, { students: 0, staff: 0 });
        }
        const val = userMonthMap.get(m);
        if (u.role === "student" || u.role === "user") val.students++;
        else val.staff++;
      }
      const usersJoinedPerMonth = Array.from(userMonthMap.entries()).map(([month, data]) => ({
        month,
        students: data.students,
        staff: data.staff,
        total: data.students + data.staff
      })).sort((a, b) => a.month.localeCompare(b.month));
      const repMap = /* @__PURE__ */ new Map();
      const reportsList = store.conversation_reports || [];
      for (const r of reportsList) {
        const d = getDateStr(r.createdAt);
        repMap.set(d, (repMap.get(d) || 0) + 1);
      }
      const reportsCreatedDaily = Array.from(repMap.entries()).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date));
      const validClaimsList = (store.claims || []).filter((c) => {
        const item = (store.items || []).find((i) => String(i.id) === String(c.item_id) || String(i._id) === String(c.item_id));
        const user = (store.users || []).find((u) => String(u.id) === String(c.user_id) || String(u._id) === String(c.user_id));
        return item && user && !item.isDeleted && item.status !== "deleted";
      });
      const claimsSubmitted = validClaimsList.length;
      const claimsApproved = validClaimsList.filter((c) => c.status === "approved").length;
      const claimsRejected = validClaimsList.filter((c) => c.status === "rejected").length;
      const claimsPending = validClaimsList.filter((c) => c.status === "pending").length;
      const returnedList = (store.items || []).filter((i) => !i.isDeleted && ["returned", "reunited", "claimed", "resolved"].includes(i.status));
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
            totalResolutionHours += diff / (1e3 * 60 * 60);
            countWithResolution++;
          }
        }
      }
      const avgResolutionTime = countWithResolution > 0 ? (totalResolutionHours / countWithResolution).toFixed(1) : "0";
      const totalUsers = store.users.length;
      const verifiedUsers = store.users.filter((u) => u.isVerified || u.is_verified || u.emailVerified || u.verified).length;
      const studentUsers = store.users.filter((u) => u.role === "student" || u.role === "user").length;
      const staffUsers = store.users.filter((u) => u.role === "admin" || u.role === "moderator" || u.role === "coordinator" || u.role === "staff").length;
      const userPostCount = /* @__PURE__ */ new Map();
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
      const modCount = /* @__PURE__ */ new Map();
      for (const i of store.items) {
        if (i.isDeleted || !i.approvedBy) continue;
        modCount.set(i.approvedBy, (modCount.get(i.approvedBy) || 0) + 1);
      }
      const mostActiveModerators = Array.from(modCount.entries()).map(([moderatorId, count]) => {
        const u = store.users.find((usr) => String(usr.id) === String(moderatorId));
        return {
          moderatorId,
          count,
          name: u ? u.full_name : `Mod ${moderatorId}`
        };
      }).sort((a, b) => b.count - a.count).slice(0, 10);
      const mostViewedPosts = [...store.items].filter((i) => !i.isDeleted).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10).map((i) => ({
        id: i.id,
        title: i.title,
        views: i.views || 0,
        category: i.category,
        type: i.type,
        status: i.status
      }));
      const approvedClaimItemIds = validClaimsList.filter((c) => c.status === "approved").map((c) => c.item_id);
      const mostClaimedItems = store.items.filter((i) => approvedClaimItemIds.includes(i.id)).slice(0, 10).map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        type: i.type,
        status: i.status
      }));
      const days = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
      }
      const dailyActivity = [];
      for (const date of days) {
        const dateObj = new Date(date);
        const dayName = isNaN(dateObj.getTime()) ? date : dayNames[dateObj.getDay()];
        const registrations = store.users.filter((u) => {
          const uDate = u.createdAt || u.date;
          return getDateStr(uDate) === date;
        }).length;
        const lostPosts = store.items.filter((i) => {
          const iDate = i.date || i.createdAt;
          return !i.isDeleted && i.type === "lost" && getDateStr(iDate) === date;
        }).length;
        const foundPosts = store.items.filter((i) => {
          const iDate = i.date || i.createdAt;
          return !i.isDeleted && i.type === "found" && getDateStr(iDate) === date;
        }).length;
        const claims = validClaimsList.filter((c) => {
          const cDate = c.createdAt || c.date;
          return getDateStr(cDate) === date;
        }).length;
        const approvals = store.items.filter((i) => {
          const appAt = i.approvedAt || i.reviewedAt;
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
      const logs = store.searchLogs || [];
      const keywordsMap = /* @__PURE__ */ new Map();
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
      const topCategoryObj = postsByCategory[0] || { category: "None", count: 0 };
      const topCategoryPercent = totalPosts > 0 ? (topCategoryObj.count / totalPosts * 100).toFixed(1) : "0";
      const topDeptObj = postsByDepartment[0] || { department: "General", count: 0 };
      const dynamicInsights = [
        {
          type: "category",
          title: "Top Reported Category",
          description: topCategoryObj.count > 0 ? `Category "${topCategoryObj.category}" leads listings with ${topCategoryObj.count} items (${topCategoryPercent}% of all recorded reports).` : "No category distribution logged yet."
        },
        {
          type: "department",
          title: "Active Department",
          description: topDeptObj.count > 0 ? `The "${topDeptObj.department}" department logged the highest activity with ${topDeptObj.count} registered items.` : "Department data is distributed evenly across campus."
        },
        {
          type: "resolution",
          title: "Campus Return Rate",
          description: returnedItems > 0 ? `Successfully recovered and returned ${returnedItems} items with a resolution rate of ${returnedRate}%.` : "No items marked as reunited or returned yet."
        },
        {
          type: "pending",
          title: "Queue Status",
          description: pendingApproval > 0 ? `${pendingApproval} item post${pendingApproval === 1 ? "" : "s"} currently pending administrator review.` : "All listings and student verification reviews are up to date with zero backlog."
        }
      ];
      const isRealAccount = (u) => {
        if (!u) return false;
        const email = String(u.email || "").trim().toLowerCase();
        const id = String(u.id || u.user_id || u._id || "");
        const name = String(u.fullName || u.full_name || u.name || "").trim().toLowerCase();
        if (id.startsWith("sim-")) return false;
        if (email.startsWith("student_") && email.endsWith("@jkkniu.edu.bd")) return false;
        if (name === "test student" || name === "verified student") return false;
        if (!email) return false;
        return true;
      };
      const allFallbackUsers = [...store.users || []];
      const recentRegisteredUsers = allFallbackUsers.filter(isRealAccount).sort((a, b) => {
        const da = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
        return db - da;
      }).slice(0, 15).map((rawU) => {
        const u = syncAndEvaluateUser(rawU, allFallbackUsers);
        const isStaff = u.role === "admin" || u.role === "moderator" || u.role === "coordinator" || String(u.email || "").toLowerCase() === "nazrulretrievers@gmail.com";
        const hasDoc = !!(u.verificationDocument && String(u.verificationDocument).trim().length > 0);
        const isApproved = (u.idVerificationStatus === "verified" || u.isVerified === true || u.is_verified === true || u.verified === true) && !isStaff;
        let idStatus = "unverified";
        if (isStaff) {
          idStatus = "verified";
        } else if (isApproved) {
          idStatus = "verified";
        } else if (u.idVerificationStatus === "pending" || hasDoc) {
          idStatus = "pending";
        } else {
          idStatus = "unverified";
        }
        const originalTime = u.createdAt || u.created_at || rawU.createdAt || rawU.created_at || u.date || (/* @__PURE__ */ new Date()).toISOString();
        return {
          id: String(u.id || u.user_id || u._id || "USR-N/A"),
          name: u.fullName || u.full_name || u.name || "Campus User",
          email: u.email || "N/A",
          role: u.role || "student",
          department: u.department || "General",
          studentId: u.studentId || u.student_id || u.rollNumber || "-",
          isVerified: isApproved || isStaff,
          idVerificationStatus: idStatus,
          hasIdDocument: hasDoc,
          createdAt: originalTime,
          status: u.status || u.accountStatus || "active"
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
  } catch (err) {
    console.error("Error fetching admin analytics:", err);
    return res.status(500).json({ error: "Internal server error fetching analytics: " + err.message });
  }
});
router5.post("/simulate-activity", async (req, res) => {
  try {
    const departmentsList = [
      "Computer Science & Engineering",
      "Information & Communication Technology",
      "Electrical & Electronic Engineering",
      "Economics",
      "Business Administration",
      "Social Science"
    ];
    const namesList = [
      "Anik Sen",
      "Farhana Yasmin",
      "Mahedi Hasan",
      "Tasnim Rahman",
      "Naimur Rahman",
      "Sadia Chowdhury",
      "Mehedi Al-Amin",
      "Zarin Tasnim"
    ];
    const typesList = ["lost", "found"];
    const itemsList = [
      { emoji: "\u{1F4F1}", title: "iPhone 13 Pro", category: "Electronics", desc: "Lost my graphite grey iPhone 13 Pro with a matte black back cover." },
      { emoji: "\u{1F392}", title: "Nike Black Backpack", category: "Bags & Luggage", desc: "Found a black Nike backpack containing some notes and a calculator." },
      { emoji: "\u{1FAAA}", title: "JKKNIU Student ID Card", category: "Documents & ID Cards", desc: "Lost my student ID card. Name: Tanvir Rahman, Roll: 181012." },
      { emoji: "\u{1F511}", title: "Keychain with Brass Keys", category: "Keys & Access Cards", desc: "Found a bunch of keys on a red ring near the social science cafeteria." },
      { emoji: "\u{1F4D8}", title: "CSE-301 Textbook", category: "Books & Stationery", desc: "Found a Database Systems textbook in room 405." },
      { emoji: "\u{1F3A7}", title: "Sony WH-1000XM4 Headphones", category: "Electronics", desc: "Lost my silver Sony headphones in the library study lounge." }
    ];
    const randomName = namesList[Math.floor(Math.random() * namesList.length)];
    const randomDept = departmentsList[Math.floor(Math.random() * departmentsList.length)];
    const randomItemTemplate = itemsList[Math.floor(Math.random() * itemsList.length)];
    const randomType = typesList[Math.floor(Math.random() * typesList.length)];
    const id = `sim-${Date.now()}`;
    const email = `${randomName.toLowerCase().replace(/\s/g, "")}@jkkniu.edu`;
    const mockItem = {
      id,
      emoji: randomItemTemplate.emoji,
      title: `${randomItemTemplate.title} (${randomType === "lost" ? "Lost" : "Found"})`,
      category: randomItemTemplate.category,
      description: randomItemTemplate.desc,
      type: randomType,
      location: "Science Building",
      specificSpot: "Room 302",
      views: Math.floor(Math.random() * 50) + 10,
      status: "active",
      approvalStatus: "approved",
      userId: id,
      email,
      isApproved: true,
      isRejected: false,
      isDeleted: false,
      createdAt: /* @__PURE__ */ new Date(),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      postedBy: {
        name: randomName,
        email,
        department: randomDept,
        phone: "+880 1711-222333"
      }
    };
    const mockSearchLog = {
      keyword: randomItemTemplate.title.split(" ")[0],
      count: Math.floor(Math.random() * 5) + 1,
      category: randomItemTemplate.category,
      createdAt: /* @__PURE__ */ new Date()
    };
    if (isMongoDBActive()) {
      await MItem.create({ ...mockItem, _id: void 0 });
      await MSearchLog.create({ ...mockSearchLog, _id: void 0 });
      if (Math.random() > 0.5) {
        await MClaim.create({
          claim_id: `claim-${id}`,
          id: `claim-${id}`,
          item_id: id,
          itemId: id,
          user_id: id,
          claimant_id: id,
          claimantId: id,
          proof_description: "This matches my lost property description perfectly.",
          description: "This matches my lost property description perfectly.",
          status: "pending",
          createdAt: /* @__PURE__ */ new Date()
        });
      }
    } else {
      const { store, save } = getFallbackData();
      store.items.push(mockItem);
      if (!store.searchLogs) store.searchLogs = [];
      store.searchLogs.push(mockSearchLog);
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
          proof_description: "This matches my lost property description perfectly.",
          description: "This matches my lost property description perfectly.",
          status: "pending",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      await save();
    }
    return res.json({ success: true, message: "Activity simulated successfully!", item: mockItem });
  } catch (err) {
    console.error("Error simulating activity:", err);
    return res.status(500).json({ error: "Failed to simulate activity: " + err.message });
  }
});
router5.put("/items/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body || {};
  const isReject = action === "reject";
  try {
    const adminName = req.user?.fullName || req.user?.email || "Admin/Moderator";
    const now = /* @__PURE__ */ new Date();
    const { store, save } = getFallbackData();
    let item = store.items.find((i) => String(i.id) === String(id) || String(i._id) === String(id) || String(i.item_id) === String(id));
    if (!item && isMongoDBActive()) {
      try {
        const isObjectId = typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
        const mongoItem = await MItem.findOne(isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) }).lean();
        if (mongoItem) {
          item = { ...mongoItem, id: String(mongoItem.id || mongoItem._id) };
          store.items.unshift(item);
        }
      } catch (err) {
        console.warn("MongoDB item lookup error during approve:", err.message);
      }
    }
    if (!item) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (isReject) {
      item.approvalStatus = "rejected";
      item.approval_status = "rejected";
      item.status = "rejected";
      item.isRejected = true;
      item.isApproved = false;
      item.rejectedBy = adminName;
      item.rejectedAt = now;
      item.rejectionReason = reason || "Spam listing or policy violation.";
    } else {
      item.approvalStatus = "approved";
      item.approval_status = "approved";
      item.status = "active";
      item.isApproved = true;
      item.isRejected = false;
      item.approvedBy = adminName;
      item.approvedAt = now;
    }
    save();
    if (isMongoDBActive()) {
      try {
        const updateFields = isReject ? {
          approvalStatus: "rejected",
          status: "rejected",
          isRejected: true,
          isApproved: false,
          rejectedBy: adminName,
          rejectedAt: now,
          rejectionReason: reason || "Spam listing or policy violation."
        } : {
          approvalStatus: "approved",
          status: "active",
          isApproved: true,
          isRejected: false,
          approvedBy: adminName,
          approvedAt: now
        };
        const isObjectId = typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
        const filter = isObjectId ? { $or: [{ id: String(id) }, { _id: id }] } : { id: String(id) };
        await MItem.updateOne(filter, { $set: updateFields });
      } catch (mErr) {
        console.warn("Failed to update MItem in MongoDB:", mErr.message);
      }
    }
    if (item.userId || item.firebaseUid || item.email) {
      const uId = item.userId || item.firebaseUid || item.email;
      const notifTitle = isReject ? "Listing Rejected" : "Listing Approved";
      const notifText = isReject ? `\u274C Your listing <strong>"${item.title}"</strong> was rejected by moderator. Reason: ${reason || "Spam listing or policy violation."}` : `\u2705 Your listing <strong>"${item.title}"</strong> has been approved and is now live!`;
      await createUserNotification({
        userId: uId,
        title: notifTitle,
        message: notifText,
        text: notifText,
        type: "admin"
      });
    }
    await logAdminActivity(
      req.user?.id || "System",
      `${isReject ? "Rejected" : "Approved"} listing: "${item.title}" (ID: #${id})`,
      "item",
      item.id,
      req.ip
    );
    return res.json({
      message: `Listing ${isReject ? "rejected" : "approved"} successfully!`,
      item
    });
  } catch (err) {
    console.error("Error approving/rejecting item:", err);
    return res.status(500).json({ error: err.message });
  }
});
router5.post("/reset-analytics", async (req, res) => {
  try {
    if (isMongoDBActive()) {
      await MItem.deleteMany({ id: /^sim-/ });
      await MUser.deleteMany({ id: /^sim-/ });
      await MClaim.deleteMany({ id: /^claim-sim-/ });
      await MSearchLog.deleteMany({ keyword: { $in: ["iPhone", "Nike", "JKKNIU", "Keychain", "CSE-301", "Sony", "iphone", "nike", "jkkniu", "keychain", "cse-301", "sony"] } });
    } else {
      const { store, save } = getFallbackData();
      store.items = store.items.filter((i) => !String(i.id).startsWith("sim-"));
      store.users = store.users.filter((u) => !String(u.id).startsWith("sim-"));
      if (store.claims) {
        store.claims = store.claims.filter((c) => !String(c.id).startsWith("claim-sim-"));
      }
      if (store.searchLogs) {
        store.searchLogs = store.searchLogs.filter((s) => !["iphone", "nike", "jkkniu", "keychain", "cse-301", "sony"].includes(s.keyword.toLowerCase()));
      }
      await save();
    }
    return res.json({ success: true, message: "Analytics and simulated activities reset successfully." });
  } catch (err) {
    console.error("Error resetting analytics:", err);
    return res.status(500).json({ error: "Failed to reset analytics: " + err.message });
  }
});
router5.get("/search-history", async (req, res) => {
  try {
    let rawSearchKeywords = [];
    let items = [];
    if (isMongoDBActive()) {
      rawSearchKeywords = await MSearchKeyword.find({}).lean();
      items = await MItem.find({ isDeleted: { $ne: true } }).lean();
    } else {
      const { store } = getFallbackData();
      rawSearchKeywords = store.searchKeywords || [];
      items = store.items || [];
    }
    const keywordMap = /* @__PURE__ */ new Map();
    for (const sk of rawSearchKeywords) {
      if (!sk || !sk.keyword) continue;
      const key = String(sk.keyword).trim().toLowerCase();
      if (key) {
        keywordMap.set(key, {
          keyword: String(sk.keyword).trim(),
          count: typeof sk.count === "number" ? sk.count : 1,
          category: sk.category || "Other"
        });
      }
    }
    for (const item of items) {
      if (!item || !item.title || item.isDeleted || item.status === "deleted") continue;
      const key = String(item.title).trim().toLowerCase();
      const itemViews = typeof item.views === "number" ? item.views : 0;
      if (keywordMap.has(key)) {
        const existing = keywordMap.get(key);
        existing.count += Math.max(itemViews, 1);
        if (item.category) {
          existing.category = item.category;
        }
      } else if (itemViews > 0) {
        keywordMap.set(key, {
          keyword: String(item.title).trim(),
          count: itemViews,
          category: item.category || "Other"
        });
      }
    }
    const sortedKeywords = Array.from(keywordMap.values()).filter((k) => k.count > 0 && k.keyword.trim().length > 0).sort((a, b) => b.count - a.count).slice(0, 20);
    return res.json({ searchHistory: sortedKeywords });
  } catch (err) {
    console.error("Error fetching search history statistics:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.get("/claims", async (req, res) => {
  try {
    if (isMongoDBActive()) {
      const claims = await MClaim.find({}).lean();
      const dbItems = await MItem.find({}).lean();
      const dbUsers = await MUser.find({}).lean();
      const orphanedClaimIds = [];
      const claimsWithDetails = [];
      for (const c of claims) {
        const item = dbItems.find((i) => String(i.id) === String(c.item_id) || String(i._id) === String(c.item_id));
        const user = dbUsers.find((u) => String(u.id) === String(c.user_id) || String(u._id) === String(c.user_id));
        if (!item || !user || item.isDeleted || item.status === "deleted") {
          orphanedClaimIds.push(c._id || c.claim_id);
          continue;
        }
        const finder = dbUsers.find((u) => String(u.id) === String(item.userId || item.user_id));
        claimsWithDetails.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || "",
          created_at: c.created_at || c.createdAt || "",
          item_title: item.title || "Untitled Item",
          item_type: item.type || "lost",
          item_status: item.status || "active",
          item_category: item.category || "General",
          item_subcategory: item.subcategory || "",
          item_description: item.description || "",
          item_secret_notes: item.secretNotes || item.secret_notes || "",
          item_location: item.location || "",
          item_specific_spot: item.specificSpot || item.specific_spot || "",
          item_reward_offered: item.rewardOffered || item.reward_offered || "",
          item_date: item.date || item.dateFound || item.dateLost || "",
          finder_name: item.reporterName || item.reporter_name || (finder ? finder.fullName || finder.full_name : item.email ? item.email.split("@")[0] : "Campus Member"),
          finder_email: item.reporterEmail || item.reporter_email || item.email || (finder ? finder.email : ""),
          finder_phone: item.phone || item.reporterPhone || item.reporter_phone || (finder ? finder.phone : ""),
          image_url: item.image || "",
          student_name: user.fullName || user.full_name || "Verified Student",
          student_id: user.studentId || user.student_id || "STU-000",
          student_email: user.email || ""
        });
      }
      if (orphanedClaimIds.length > 0) {
        MClaim.deleteMany({ $or: [{ _id: { $in: orphanedClaimIds } }, { claim_id: { $in: orphanedClaimIds } }] }).catch(() => {
        });
      }
      return res.json({ claims: claimsWithDetails });
    } else {
      const { store, save } = getFallbackData();
      const claims = store.claims || [];
      const validClaims = [];
      const updatedStoreClaims = [];
      for (const c of claims) {
        const item = (store.items || []).find((i) => String(i.id) === String(c.item_id) || String(i._id) === String(c.item_id));
        const user = (store.users || []).find((u) => String(u.id) === String(c.user_id) || String(u._id) === String(c.user_id));
        if (!item || !user || item.isDeleted || item.status === "deleted") {
          continue;
        }
        updatedStoreClaims.push(c);
        const finder = (store.users || []).find((u) => String(u.id) === String(item.userId || item.user_id));
        validClaims.push({
          claim_id: c.claim_id,
          item_id: c.item_id,
          user_id: c.user_id,
          proof_description: c.proof_description,
          contact_details: c.contact_details,
          status: c.status,
          admin_notes: c.admin_notes || "",
          created_at: c.created_at,
          item_title: item.title || "Untitled Item",
          item_type: item.type || "lost",
          item_status: item.status || "active",
          item_category: item.category || "General",
          item_subcategory: item.subcategory || "",
          item_description: item.description || "",
          item_secret_notes: item.secretNotes || item.secret_notes || "",
          item_location: item.location || "",
          item_specific_spot: item.specificSpot || item.specific_spot || "",
          item_reward_offered: item.rewardOffered || item.reward_offered || "",
          item_date: item.date || item.dateFound || item.dateLost || "",
          finder_name: item.reporterName || item.reporter_name || (finder ? finder.fullName || finder.full_name : item.email ? item.email.split("@")[0] : "Campus Member"),
          finder_email: item.reporterEmail || item.reporter_email || item.email || (finder ? finder.email : ""),
          finder_phone: item.phone || item.reporterPhone || item.reporter_phone || (finder ? finder.phone : ""),
          image_url: item.image || "",
          student_name: user.fullName || user.full_name || "Verified Student",
          student_id: user.studentId || user.student_id || "STU-000",
          student_email: user.email || ""
        });
      }
      if (updatedStoreClaims.length !== claims.length) {
        store.claims = updatedStoreClaims;
        save();
      }
      return res.json({ claims: validClaims });
    }
  } catch (err) {
    console.error("Error fetching admin claims:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.post("/claims/:id/action", async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  const allowedActions = ["approve", "reject", "handover", "returned"];
  if (!action || !allowedActions.includes(action)) {
    return res.status(400).json({ error: `Please specify a valid action: ${allowedActions.join(", ")}` });
  }
  try {
    const statusVal = action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "returned" ? "completed" : "approved";
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (isMongoDBActive()) {
      const claim = await MClaim.findOne({ claim_id: String(id) });
      if (!claim) {
        return res.status(404).json({ error: "Claim not found." });
      }
      claim.status = statusVal;
      claim.admin_notes = notes || "";
      claim.updated_at = nowIso;
      await claim.save();
      const item = await MItem.findOne({ id: String(claim.item_id) });
      const itemTitle = item?.title || "Item";
      const itemOwnerId = item?.userId || item?.user_id;
      const claimantId = claim.user_id;
      if (item) {
        if (action === "approve") {
          item.status = "handover_pending";
          item.activeClaimId = claim.claim_id;
          item.claimedBy = claimantId;
          await item.save();
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Claim Approved! \u{1F389}",
              message: `Your ownership claim for "${itemTitle}" was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              type: "claim_approved"
            });
          }
          if (itemOwnerId) {
            await createUserNotification({
              userId: itemOwnerId,
              title: "Claim Verified for Your Post",
              message: `Administrators have verified a claimant for "${itemTitle}". Status is now Handover Pending.`,
              type: "claim_approved"
            });
          }
        } else if (action === "reject") {
          const remainingPending = await MClaim.countDocuments({ item_id: String(claim.item_id), status: "pending" });
          if (remainingPending === 0 && (item.status === "under_verification" || item.status === "claim_requested")) {
            item.status = "active";
            await item.save();
          }
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Claim Verification Update",
              message: `Your claim for "${itemTitle}" could not be verified.${notes ? ` Admin Note: ${notes}` : ""}`,
              type: "claim_rejected"
            });
          }
        } else if (action === "returned") {
          item.status = "returned";
          item.returnedAt = /* @__PURE__ */ new Date();
          await item.save();
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Item Returned! \u{1F91D}",
              message: `"${itemTitle}" has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              type: "item_returned"
            });
          }
        }
      }
      await logAdminActivity(
        req.user?.id || 2,
        `Verified claim ${id} as ${statusVal} (Action: ${action}). Notes: ${notes || "None"}`,
        "CLAIM",
        id
      );
      return res.json({ message: `Claim status updated to ${statusVal} successfully.` });
    } else {
      const { store, save } = getFallbackData();
      const claim = (store.claims || []).find((c) => String(c.claim_id) === String(id));
      if (!claim) {
        return res.status(404).json({ error: "Claim not found." });
      }
      claim.status = statusVal;
      claim.admin_notes = notes || "";
      claim.updated_at = nowIso;
      const item = store.items.find((i) => String(i.id) === String(claim.item_id));
      const itemTitle = item?.title || "Item";
      const itemOwnerId = item?.userId || item?.user_id;
      const claimantId = claim.user_id;
      if (item) {
        if (action === "approve") {
          item.status = "handover_pending";
          item.activeClaimId = claim.claim_id;
          item.claimedBy = claimantId;
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Claim Approved! \u{1F389}",
              message: `Your ownership claim for "${itemTitle}" was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              text: `Your ownership claim for <strong>"${itemTitle}"</strong> was verified by administrators! Handover is now pending. Please coordinate meetup.`,
              type: "claim_approved"
            });
          }
          if (itemOwnerId) {
            await createUserNotification({
              userId: itemOwnerId,
              title: "Claim Verified for Your Post",
              message: `Administrators have verified a claimant for "${itemTitle}". Status is now Handover Pending.`,
              text: `Administrators have verified a claimant for <strong>"${itemTitle}"</strong>. Status is now Handover Pending.`,
              type: "claim_approved"
            });
          }
        } else if (action === "reject") {
          const remainingPending = (store.claims || []).filter((c) => String(c.item_id) === String(claim.item_id) && c.status === "pending" && String(c.claim_id) !== String(id));
          if (remainingPending.length === 0 && (item.status === "under_verification" || item.status === "claim_requested")) {
            item.status = "active";
          }
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Claim Verification Update",
              message: `Your claim for "${itemTitle}" could not be verified.${notes ? ` Admin Note: ${notes}` : ""}`,
              text: `Your claim for <strong>"${itemTitle}"</strong> could not be verified.${notes ? ` Admin Note: ${notes}` : ""}`,
              type: "claim_rejected"
            });
          }
        } else if (action === "returned") {
          item.status = "returned";
          item.returnedAt = nowIso;
          if (claimantId) {
            await createUserNotification({
              userId: claimantId,
              title: "Item Returned! \u{1F91D}",
              message: `"${itemTitle}" has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              text: `<strong>"${itemTitle}"</strong> has been officially marked as Reunited / Returned. Thank you for using Campus Lost & Found!`,
              type: "item_returned"
            });
          }
        }
      }
      await logAdminActivity(
        req.user?.id || 2,
        `Verified claim ${id} as ${statusVal} (Action: ${action}). Notes: ${notes || "None"}`,
        "CLAIM",
        id
      );
      save();
      return res.json({ message: `Claim status updated to ${statusVal} successfully.` });
    }
  } catch (err) {
    console.error("Error updating claim status:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.delete("/items/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "system";
  const adminName = req.user?.fullName || req.user?.email || "Admin";
  try {
    let itemTitle = `Item #${id}`;
    let itemFound = false;
    const { store, save } = getFallbackData();
    const item = (store.items || []).find((i) => String(i.id) === String(id) || String(i._id) === String(id));
    if (item) {
      itemTitle = item.title || itemTitle;
      item.isDeleted = true;
      item.status = "deleted";
      item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
      item.deletedBy = adminName;
      itemFound = true;
    }
    if (isMongoDBActive()) {
      const mongoose8 = await import("mongoose");
      const queryConds = [{ id: String(id) }];
      if (mongoose8.default.Types.ObjectId.isValid(String(id))) {
        queryConds.push({ _id: String(id) });
      }
      const dbItem = await MItem.findOne({ $or: queryConds });
      if (dbItem) {
        itemTitle = dbItem.title || itemTitle;
        dbItem.isDeleted = true;
        dbItem.status = "deleted";
        dbItem.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
        dbItem.deletedBy = adminName;
        await dbItem.save();
        itemFound = true;
      }
    }
    if (!itemFound) {
      return res.status(404).json({ error: "Listing not found." });
    }
    save();
    await logAdminActivity(
      adminId,
      `Moved Listing to Archive: "${itemTitle}" (ID: ${id})`,
      "Item",
      id,
      req.ip
    );
    return res.json({ message: `Listing "${itemTitle}" moved to deleted archive successfully.` });
  } catch (err) {
    console.error("Error moving item to deleted archive:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.post("/items/batch-delete", async (req, res) => {
  const { itemIds } = req.body;
  const adminId = req.user?.id || "system";
  const adminName = req.user?.fullName || req.user?.email || "Admin";
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: "Please provide at least one item ID to delete." });
  }
  try {
    const stringIds = itemIds.map((id) => String(id));
    const { store, save } = getFallbackData();
    let processedCount = 0;
    for (const item of store.items || []) {
      if (stringIds.includes(String(item.id)) || stringIds.includes(String(item._id))) {
        item.isDeleted = true;
        item.status = "deleted";
        item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
        item.deletedBy = adminName;
        processedCount++;
      }
    }
    if (isMongoDBActive()) {
      const mongoose8 = await import("mongoose");
      const validObjectIds = stringIds.filter((id) => mongoose8.default.Types.ObjectId.isValid(id));
      await MItem.updateMany(
        {
          $or: [
            { id: { $in: stringIds } },
            ...validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []
          ]
        },
        {
          $set: {
            isDeleted: true,
            status: "deleted",
            deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
            deletedBy: adminName
          }
        }
      );
    }
    save();
    await logAdminActivity(
      adminId,
      `Batch moved ${stringIds.length} listings to deleted archive`,
      "Item",
      stringIds.join(","),
      req.ip
    );
    return res.json({
      message: `Successfully moved ${stringIds.length} listings to deleted archive.`,
      count: stringIds.length
    });
  } catch (err) {
    console.error("Error in batch delete items:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.post("/items/batch-permanent-delete", authorizeAdmin, async (req, res) => {
  const { itemIds } = req.body;
  const adminId = req.user?.id || "system";
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: "Please provide at least one item ID to permanently delete." });
  }
  try {
    const stringIds = itemIds.map((id) => String(id));
    const { store, save } = getFallbackData();
    store.items = (store.items || []).filter((i) => !stringIds.includes(String(i.id)) && !stringIds.includes(String(i._id)));
    store.claims = (store.claims || []).filter((c) => !stringIds.includes(String(c.itemId || c.item_id || "")));
    if (isMongoDBActive()) {
      const mongoose8 = await import("mongoose");
      const validObjectIds = stringIds.filter((id) => mongoose8.default.Types.ObjectId.isValid(id));
      const matchCond = {
        $or: [
          { id: { $in: stringIds } },
          ...validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []
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
      "Item",
      stringIds.join(","),
      req.ip
    );
    return res.json({
      message: `Successfully permanently deleted ${stringIds.length} listings.`,
      count: stringIds.length
    });
  } catch (err) {
    console.error("Error in batch permanent delete items:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.delete("/items/:id/permanent", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "system";
  const adminName = req.user?.fullName || "Admin";
  try {
    let itemTitle = `Item #${id}`;
    let itemExists = false;
    const { store, save } = getFallbackData();
    const itemIndex = store.items.findIndex((i) => String(i.id) === String(id));
    if (itemIndex !== -1) {
      itemTitle = store.items[itemIndex].title || itemTitle;
      store.items.splice(itemIndex, 1);
      itemExists = true;
    }
    store.claims = store.claims.filter((c) => String(c.itemId || c.item_id || "") !== String(id));
    if (isMongoDBActive()) {
      const mongoose8 = await import("mongoose");
      const queryConds = [{ id: String(id) }];
      if (mongoose8.default.Types.ObjectId.isValid(String(id))) {
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
      return res.status(404).json({ error: "Listing not found." });
    }
    save();
    await logAdminActivity(
      adminId,
      `Permanently Deleted Listing: "${itemTitle}" (ID: ${id})`,
      "Item",
      id,
      req.ip
    );
    return res.json({ message: "Listing permanently deleted from the database." });
  } catch (err) {
    console.error("Error permanently deleting listing:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.get("/notifications", async (req, res) => {
  try {
    const { category, q } = req.query;
    if (isMongoDBActive()) {
      let filter = {};
      if (category && category !== "All") {
        filter.category = category;
      }
      if (q) {
        const regex = new RegExp(String(q), "i");
        filter.$or = [
          { title: regex },
          { message: regex }
        ];
      }
      const dbNotifs = await MAdminNotification.find(filter).sort({ createdAt: -1 }).lean();
      const mapped = dbNotifs.filter((n) => n.title || n.message || n.text).map((n) => ({
        id: String(n.id || n._id),
        title: n.title || (n.text ? n.text.replace(/<[^>]*>?/gm, "").split(":")[0] : "Campus Activity Alert"),
        message: n.message || (n.text ? n.text.replace(/<[^>]*>?/gm, "") : "New moderation or activity update."),
        type: n.type || "system",
        category: n.category || "System",
        priority: n.priority || "medium",
        isRead: n.isRead === true || n.isRead === 1,
        relatedUserId: n.relatedUserId ? String(n.relatedUserId) : "",
        relatedItemId: n.relatedItemId ? String(n.relatedItemId) : "",
        relatedConversationId: n.relatedConversationId ? String(n.relatedConversationId) : "",
        createdAt: n.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      }));
      return res.json({ notifications: mapped });
    } else {
      const { store } = getFallbackData();
      if (!store.admin_notifications) store.admin_notifications = [];
      let list = store.admin_notifications.filter((n) => n.title || n.message || n.text).map((n) => ({
        id: String(n.id || n._id),
        title: n.title || (n.text ? n.text.replace(/<[^>]*>?/gm, "").split(":")[0] : "Campus Activity Alert"),
        message: n.message || (n.text ? n.text.replace(/<[^>]*>?/gm, "") : "New moderation or activity update."),
        type: n.type || "system",
        category: n.category || "System",
        priority: n.priority || "medium",
        isRead: n.isRead === true || n.isRead === 1,
        relatedUserId: n.relatedUserId ? String(n.relatedUserId) : "",
        relatedItemId: n.relatedItemId ? String(n.relatedItemId) : "",
        relatedConversationId: n.relatedConversationId ? String(n.relatedConversationId) : "",
        createdAt: n.createdAt || n.created_at || (/* @__PURE__ */ new Date()).toISOString()
      }));
      if (category && category !== "All") {
        list = list.filter((n) => n.category === category);
      }
      if (q) {
        const queryStr = String(q).toLowerCase();
        list = list.filter(
          (n) => n.title.toLowerCase().includes(queryStr) || n.message.toLowerCase().includes(queryStr)
        );
      }
      return res.json({ notifications: list });
    }
  } catch (err) {
    console.error("Error fetching admin notifications:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.put("/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  const idStr = String(id).trim();
  try {
    if (isMongoDBActive()) {
      let conditions = [{ id: idStr }];
      if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          conditions.push({ _id: new import_mongoose6.default.Types.ObjectId(idStr) });
        } catch (e) {
        }
        conditions.push({ _id: idStr });
      }
      await MAdminNotification.updateMany({ $or: conditions }, { isRead: true });
    }
    const { store, save } = getFallbackData();
    const matches = store.admin_notifications?.filter((n) => String(n.id) === idStr || String(n._id) === idStr);
    if (matches && matches.length > 0) {
      matches.forEach((n) => {
        n.isRead = true;
        n.unread = false;
      });
      save();
    }
    try {
      const { setFirestoreDocument: setFirestoreDocument2, getFirestoreDB: getFirestoreDB2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
      if (getFirestoreDB2()) {
        const found = matches?.[0] || { id: idStr, isRead: true };
        await setFirestoreDocument2("admin_notifications", idStr, { ...found, isRead: true });
      }
    } catch (fsErr) {
    }
    return res.json({ success: true, message: "Notification marked as read." });
  } catch (err) {
    console.error("Error updating notification read state:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.put("/notifications/read-all", async (req, res) => {
  try {
    if (isMongoDBActive()) {
      await MAdminNotification.updateMany({}, { isRead: true });
    }
    const { store, save } = getFallbackData();
    if (store.admin_notifications) {
      store.admin_notifications.forEach((n) => {
        n.isRead = true;
        n.unread = false;
      });
      save();
    }
    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("Error reading all notifications:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.delete("/notifications/:id", async (req, res) => {
  const { id } = req.params;
  const idStr = String(id).trim();
  try {
    if (isMongoDBActive()) {
      let conditions = [{ id: idStr }];
      if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          conditions.push({ _id: new import_mongoose6.default.Types.ObjectId(idStr) });
        } catch (e) {
        }
        conditions.push({ _id: idStr });
      }
      await MAdminNotification.deleteMany({ $or: conditions });
    }
    const { store, save } = getFallbackData();
    if (store.admin_notifications) {
      store.admin_notifications = store.admin_notifications.filter((n) => String(n.id) !== idStr && String(n._id) !== idStr);
      save();
    }
    return res.json({ success: true, message: "Notification deleted." });
  } catch (err) {
    console.error("Error deleting admin notification:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.get("/reports", async (req, res) => {
  try {
    if (isMongoDBActive()) {
      const dbReports = await MConversationReport.find().sort({ createdAt: -1 }).lean();
      const mapped = dbReports.map((r) => ({
        reportId: r.reportId,
        conversationId: r.conversationId,
        reportedBy: r.reportedBy,
        reportedByName: r.reportedByName || "Deleted User",
        reportedUser: r.reportedUser,
        reportedUserName: r.reportedUserName || "Deleted User",
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
  } catch (err) {
    console.error("Error getting reports:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.get("/reports/:reportId/messages", async (req, res) => {
  const { reportId } = req.params;
  const adminId = req.user?.id || 2;
  try {
    const { store } = getFallbackData();
    const report = store.conversation_reports?.find((r) => String(r.reportId) === String(reportId));
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    const thread = store.threads.find((t) => String(t.id) === String(report.conversationId));
    if (!thread) {
      return res.status(404).json({ error: "Conversation thread not found." });
    }
    if (thread.status !== "under_review" && report.status !== "under_review" && report.status !== "pending") {
      return res.status(403).json({ error: "Access Denied: Conversation content is private by default. Access is restricted unless under active review." });
    }
    await logAdminActivity(
      adminId,
      `Accessed and reviewed messages for conversation thread #${thread.id} via report #${reportId}`,
      "conversation_report",
      reportId,
      req.ip
    );
    return res.json({ messages: thread.messages, thread });
  } catch (err) {
    console.error("Error fetching reported messages:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.put("/reports/mark-all-reviewed", async (req, res) => {
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || "Admin";
  try {
    const { store, save } = getFallbackData();
    if (store.conversation_reports) {
      store.conversation_reports.forEach((r) => {
        if (r.status === "pending") {
          r.status = "under_review";
          r.reviewedBy = adminId;
          r.reviewedByName = adminName;
          r.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      });
      save();
    }
    if (isMongoDBActive()) {
      await MConversationReport.updateMany(
        { status: "pending" },
        {
          status: "under_review",
          reviewedBy: adminId,
          reviewedByName: adminName,
          reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ).catch((mErr) => console.warn("Mongo updateMany reports error:", mErr));
    }
    await logAdminActivity(
      adminId,
      `Marked all pending conversation reports as reviewed`,
      "conversation_report",
      "all",
      req.ip
    );
    return res.json({ success: true, message: "All pending conversation reports have been marked as under review." });
  } catch (err) {
    console.error("Error marking all reports as reviewed:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.put("/reports/:reportId/status", async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || "Admin";
  if (!status || !["pending", "under_review", "resolved", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "Please provide a valid status: pending, under_review, resolved or dismissed" });
  }
  try {
    const { store, save } = getFallbackData();
    const report = store.conversation_reports?.find((r) => String(r.reportId) === String(reportId));
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    report.status = status;
    report.reviewedBy = adminId;
    report.reviewedByName = adminName;
    report.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (status === "resolved" || status === "dismissed") {
      const thread = store.threads.find((t) => String(t.id) === String(report.conversationId));
      if (thread) {
        thread.status = "active";
        thread.reportStatus = status;
        thread.messages.push({
          id: `msg-sys-${Date.now()}`,
          senderId: String(adminId),
          senderName: "System Moderator",
          senderInitials: "SM",
          text: `\u26A0\uFE0F [System Notification]: The report regarding this conversation has been marked as "${status.toUpperCase()}" by our administration. The chat is fully active and open.`,
          time: "Just now"
        });
      }
    } else if (status === "under_review") {
      const thread = store.threads.find((t) => String(t.id) === String(report.conversationId));
      if (thread) {
        thread.status = "under_review";
        thread.reportStatus = "under_review";
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
          reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      ).catch((mErr) => console.warn("Mongo update report status error:", mErr));
    }
    await logAdminActivity(
      adminId,
      `Updated report #${reportId} status to '${status}'`,
      "conversation_report",
      reportId,
      req.ip
    );
    return res.json({ message: `Report status successfully updated to ${status}.`, report });
  } catch (err) {
    console.error("Error updating report status:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.post("/reports/:reportId/log-reveal", async (req, res) => {
  const { reportId } = req.params;
  const adminId = req.user?.id || 2;
  try {
    const { store, save } = getFallbackData();
    const report = store.conversation_reports?.find((r) => String(r.reportId) === String(reportId));
    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }
    await logAdminActivity(
      adminId,
      `REVEALED and inspected reported chat transcript for conversation #${report.conversationId} (Report #${reportId})`,
      "conversation_report",
      reportId,
      req.ip
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Error logging transcript reveal:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.post("/moderation/user-action", async (req, res) => {
  const { targetUserId, action, reason } = req.body;
  const adminId = req.user?.id || 2;
  const adminName = req.user?.fullName || "Admin";
  const callerRole = req.user?.role || "student";
  const validActions = ["warn", "suspend", "reactivate", "delete", "ban", "unban", "lock", "unlock"];
  if (!targetUserId || !action || !validActions.includes(action)) {
    return res.status(400).json({ error: "Missing targetUserId, or invalid action parameter." });
  }
  try {
    const { store, save } = getFallbackData();
    let userDetails = { fullName: "User", email: "", role: "student" };
    if (isMongoDBActive()) {
      const u = await MUser.findOne({ id: String(targetUserId) });
      if (u) {
        userDetails.fullName = u.fullName || u.full_name || "User";
        userDetails.email = u.email;
        userDetails.role = u.role || "student";
      }
    } else {
      const u = store.users.find((usr) => String(usr.id) === String(targetUserId));
      if (u) {
        userDetails.fullName = u.fullName || u.full_name || "User";
        userDetails.email = u.email;
        userDetails.role = u.role || "student";
      }
    }
    const isSelfTarget = String(targetUserId) === String(req.user?.id) || userDetails.email && req.user?.email && userDetails.email.toLowerCase() === req.user.email.toLowerCase();
    if (isSelfTarget) {
      return res.status(400).json({ error: "Security Constraint: You cannot execute moderation actions (warning, suspension, lock, ban, or deletion) on your own active account." });
    }
    if (userDetails.role === "admin" || userDetails.email === "nazrulretrievers@gmail.com" || String(targetUserId) === "2") {
      return res.status(403).json({ error: "Security Constraint: Administrator and root accounts are protected and cannot be moderated or suspended from the registry." });
    }
    if (callerRole === "moderator" && (userDetails.role === "admin" || userDetails.role === "moderator" || userDetails.role === "coordinator")) {
      return res.status(403).json({ error: "Permission Denied: Moderators cannot moderate Administrators or other Coordinators." });
    }
    if (action === "delete" && userDetails.role === "admin") {
      let adminCount = 0;
      if (isMongoDBActive()) {
        adminCount = await MUser.countDocuments({ role: "admin" });
      } else {
        adminCount = store.users.filter((u) => u.role === "admin").length;
      }
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Security Constraint: You cannot delete the last Admin of this platform." });
      }
    }
    let newStatus = "Active";
    let isSuspended = false;
    let shouldUpdateStatus = true;
    if (action === "suspend") {
      newStatus = "suspended";
      isSuspended = true;
    } else if (action === "ban") {
      newStatus = "banned";
      isSuspended = true;
    } else if (action === "lock") {
      newStatus = "locked";
      isSuspended = true;
    } else if (action === "reactivate" || action === "unsuspend" || action === "unban" || action === "unlock") {
      newStatus = "Active";
      isSuspended = false;
    } else if (action === "warn") {
      shouldUpdateStatus = false;
    }
    if (action === "delete") {
      if (callerRole !== "admin") {
        return res.status(403).json({ error: "Permission Denied: Moderators are not permitted to permanently delete user accounts." });
      }
      await performCascadeDeleteUser(targetUserId);
    } else {
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
      const user = store.users.find((u) => String(u.id) === String(targetUserId));
      if (user) {
        if (shouldUpdateStatus) {
          user.is_suspended = isSuspended;
          user.status = newStatus;
          user.accountStatus = newStatus;
        }
        const notifText = action === "warn" ? `\u{1F6E1}\uFE0F <strong>Security Warning:</strong> You have received a formal warning. Action: WARNING. Reason: ${reason || "Campus policy review"}.` : `\u{1F6E1}\uFE0F <strong>Security Alert:</strong> Your account status has been set to <strong>${newStatus.toUpperCase()}</strong>. Action: ${action.toUpperCase()}. Reason: ${reason || "Policy review"}.`;
        await createUserNotification({
          userId: targetUserId,
          title: action === "warn" ? "Security Warning" : "Security Alert",
          message: notifText,
          text: notifText,
          type: "moderation"
        });
      }
    }
    await logAdminActivity(
      adminId,
      `Moderation Action: '${action}' applied to user ${userDetails.fullName} (${userDetails.email}). Reason: ${reason || "None provided"}`,
      "user",
      targetUserId,
      req.ip
    );
    await createAdminNotification({
      title: `\u{1F6E1}\uFE0F User Account Action: ${action.toUpperCase()}`,
      message: `${adminName} applied action '${action}' to user ${userDetails.fullName}. Reason: ${reason || "Standard audit"}.`,
      type: `user_${action}`,
      category: "User",
      priority: "high",
      relatedUserId: targetUserId
    });
    return res.json({ message: `Successfully applied '${action}' action to user account.` });
  } catch (err) {
    console.error("Error applying moderation action:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.get("/activity-logs", async (req, res) => {
  try {
    const { action, q } = req.query;
    let rawLogs = [];
    let usersList = [];
    if (isMongoDBActive()) {
      rawLogs = await MAdminActivityLog.find().lean();
      usersList = await MUser.find({}).lean();
    } else {
      const { store } = getFallbackData();
      rawLogs = store.admin_activity_logs || [];
      usersList = store.users || [];
    }
    const userMap = /* @__PURE__ */ new Map();
    for (const u of usersList) {
      const uId = String(u.id || u._id || u.user_id || "");
      if (uId) {
        userMap.set(uId, u);
      }
    }
    let enrichedLogs = rawLogs.map((log, idx) => {
      const adminIdStr = String(log.adminId || "");
      const adminUser = userMap.get(adminIdStr);
      let adminName = "System Administrator";
      if (adminUser) {
        adminName = adminUser.fullName || adminUser.full_name || adminUser.displayName || adminUser.email || "Admin";
      } else if (adminIdStr === "2" || adminIdStr === "admin") {
        adminName = "Main Administrator";
      }
      const descriptionText = log.description || log.action || "Administrative action performed";
      let actionCategory = "system_config";
      const descLower = descriptionText.toLowerCase();
      if (descLower.includes("warn")) {
        actionCategory = "user_warned";
      } else if (descLower.includes("suspend") || descLower.includes("ban")) {
        actionCategory = "user_suspended";
      } else if (descLower.includes("reactivate") || descLower.includes("unsuspend") || descLower.includes("unban") || descLower.includes("unlock")) {
        actionCategory = "user_activated";
      } else if (descLower.includes("approved") || descLower.includes("approve")) {
        actionCategory = "item_approved";
      } else if (descLower.includes("rejected") || descLower.includes("reject")) {
        actionCategory = "item_rejected";
      } else if (descLower.includes("resolved") || descLower.includes("resolve") || descLower.includes("dispute") || descLower.includes("reviewed")) {
        actionCategory = "report_resolved";
      }
      return {
        id: log.id || `aal-${log._id || idx}`,
        logId: log.id ? String(log.id).replace("aal-", "") : String(idx),
        adminId: log.adminId,
        adminName,
        targetId: log.targetId,
        targetType: log.targetType,
        action: actionCategory,
        description: descriptionText,
        ipAddress: log.ipAddress || "",
        createdAt: log.createdAt || log.created_at || (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    if (action && typeof action === "string" && action !== "All") {
      enrichedLogs = enrichedLogs.filter((log) => log.action === action);
    }
    if (q && typeof q === "string" && q.trim()) {
      const queryLower = q.toLowerCase().trim();
      enrichedLogs = enrichedLogs.filter(
        (log) => log.description.toLowerCase().includes(queryLower) || log.adminName.toLowerCase().includes(queryLower) || String(log.logId).toLowerCase().includes(queryLower)
      );
    }
    enrichedLogs.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
    return res.json({ logs: enrichedLogs });
  } catch (err) {
    console.error("Error getting activity logs:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});
router5.delete(["/activity-logs", "/activity-logs/clear"], authorizeAdmin, async (req, res) => {
  try {
    if (isMongoDBActive()) {
      await MAdminActivityLog.deleteMany({});
    }
    const { store, save } = getFallbackData();
    store.admin_activity_logs = [];
    save();
    return res.json({ success: true, message: "All previous admin activity logs have been cleared successfully." });
  } catch (err) {
    console.error("Error clearing activity logs:", err);
    return res.status(500).json({ error: "Failed to clear activity logs: " + err.message });
  }
});
router5.get("/users", async (req, res) => {
  try {
    const roleFilter = req.query.role ? String(req.query.role).toLowerCase().trim() : "all";
    let allUsers = [];
    if (isMongoDBActive()) {
      const dbUsers = await MUser.find({
        fullName: { $ne: "Verified Student" },
        $and: [
          {
            $or: [
              { role: { $in: ["admin", "moderator", "coordinator"] } },
              { emailVerified: true },
              { email_verified: true },
              { registrationCompleted: true }
            ]
          },
          { status: { $nin: ["Pending", "pending"] } },
          { accountStatus: { $nin: ["Pending", "pending"] } }
        ]
      }).lean();
      allUsers = dbUsers.filter(isRegisteredAndVerifiedUser);
    } else {
      const { store } = getFallbackData();
      const rawUsers = store.users || [];
      allUsers = rawUsers.filter(isRegisteredAndVerifiedUser);
    }
    let filtered = allUsers;
    if (roleFilter === "student") {
      filtered = allUsers.filter((u) => u.role === "student" || !u.role || u.role === "");
    } else if (roleFilter === "moderator" || roleFilter === "coordinator") {
      filtered = allUsers.filter((u) => u.role === "moderator" || u.role === "coordinator");
    } else if (roleFilter === "admin") {
      filtered = allUsers.filter((u) => u.role === "admin");
    } else if (roleFilter === "verified") {
      filtered = allUsers.filter((u) => {
        const isStaff = u.role === "admin" || u.role === "moderator" || u.role === "coordinator" || String(u.email || "").toLowerCase() === "nazrulretrievers@gmail.com";
        return !isStaff && (u.isVerified || u.is_verified || u.idVerificationStatus === "verified");
      });
    }
    const formatted = filtered.map((rawU) => {
      const u = syncAndEvaluateUser(rawU, allUsers);
      return {
        id: String(u.id || u.user_id || u._id || ""),
        user_id: String(u.id || u.user_id || u._id || ""),
        student_id: u.studentId || u.student_id || u.rollNumber || "",
        studentId: u.studentId || u.student_id || u.rollNumber || "",
        rollNumber: u.rollNumber || u.classRoll || u.roll || "",
        full_name: u.fullName || u.full_name || "User",
        fullName: u.fullName || u.full_name || "User",
        email: u.email || "",
        department: u.department || "Not Specified",
        faculty: u.faculty || "",
        role: u.role || "student",
        phone: u.phone || "",
        session_year: u.academicSession || u.session_year || u.sessionYear || "",
        sessionYear: u.academicSession || u.session_year || u.sessionYear || "",
        is_verified: !!(u.isVerified || u.is_verified || u.idVerificationStatus === "verified"),
        isVerified: !!(u.isVerified || u.is_verified || u.idVerificationStatus === "verified"),
        idVerificationStatus: u.idVerificationStatus || (u.isVerified || u.is_verified ? "verified" : "unverified"),
        idVerificationRemarks: u.idVerificationRemarks || "",
        idVerificationSubmittedAt: u.idVerificationSubmittedAt || "",
        verificationDocument: u.verificationDocument || "",
        avatar: u.profilePhoto || u.avatar || "",
        profilePhoto: u.profilePhoto || u.avatar || "",
        status: u.status || u.accountStatus || "Active",
        accountStatus: u.accountStatus || u.status || "Active",
        isSuspended: !!(u.isSuspended || u.is_suspended || String(u.status || "").toLowerCase() === "suspended" || String(u.accountStatus || "").toLowerCase() === "suspended" || String(u.status || "").toLowerCase() === "locked"),
        isBanned: !!(u.isBanned || u.banned || String(u.status || "").toLowerCase() === "banned" || String(u.accountStatus || "").toLowerCase() === "banned"),
        isFlagged: !!(u.isFlagged || u.flagged || String(u.status || "").toLowerCase() === "flagged" || u.warningCount && u.warningCount > 0),
        warningCount: u.warningCount || 0,
        gender: u.gender || "",
        dateOfBirth: u.dateOfBirth || "",
        bloodGroup: u.bloodGroup || "",
        address: u.address || "",
        emergencyContact: u.emergencyContact || "",
        emergencyContactName: u.emergencyContactName || "",
        residentialHall: u.residentialHall || "",
        facebook: u.facebook || "",
        linkedin: u.linkedin || "",
        bio: u.bio || "",
        totalLostPosts: u.totalLostPosts || 0,
        totalFoundPosts: u.totalFoundPosts || 0,
        successfulReturns: u.successfulReturns || 0,
        reputationScore: u.reputationScore !== void 0 ? u.reputationScore : 100,
        emailVerified: !!(u.emailVerified || u.email_verified),
        lastLogin: u.lastLogin || u.last_login || "",
        createdAt: u.createdAt || ""
      };
    });
    return res.json({ users: formatted });
  } catch (err) {
    console.error("Error fetching registry users:", err);
    return res.status(500).json({ error: "Failed to fetch users: " + err.message });
  }
});
router5.get("/verifications", async (req, res) => {
  try {
    const dbUsers = await getAllUsersList();
    const isStaffOrAdmin = (u) => {
      const role = String(u.role || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      return role === "admin" || role === "moderator" || role === "coordinator" || email === "nazrulretrievers@gmail.com";
    };
    const verifications = dbUsers.filter((u) => {
      if (isStaffOrAdmin(u)) return false;
      const hasDoc = !!u.verificationDocument && String(u.verificationDocument).trim() !== "";
      const hasStatus = u.idVerificationStatus === "pending" || u.idVerificationStatus === "verified" || u.idVerificationStatus === "rejected";
      return hasDoc || hasStatus;
    });
    const formatted = verifications.map((rawU) => {
      const u = syncAndEvaluateUser(rawU, dbUsers);
      const isApprovedVerified = u.idVerificationStatus === "verified";
      let status = u.idVerificationStatus;
      if (!status || status === "unverified") {
        status = u.verificationDocument ? "pending" : "unverified";
      }
      return {
        id: String(u.id || u.user_id || u._id || ""),
        user_id: String(u.id || u.user_id || u._id || ""),
        studentId: u.studentId || u.student_id || u.rollNumber || "",
        student_id: u.studentId || u.student_id || u.rollNumber || "",
        rollNumber: u.rollNumber || u.classRoll || u.roll || "",
        fullName: u.fullName || u.full_name || "User",
        full_name: u.fullName || u.full_name || "User",
        email: u.email || "",
        department: u.department || "Not Specified",
        role: u.role || "student",
        phone: u.phone || "",
        academicSession: u.academicSession || u.session_year || u.sessionYear || "",
        sessionYear: u.academicSession || u.session_year || u.sessionYear || "",
        isVerified: isApprovedVerified,
        is_verified: isApprovedVerified,
        idVerificationStatus: status,
        idVerificationRemarks: u.idVerificationRemarks || "",
        idVerificationSubmittedAt: u.idVerificationSubmittedAt || u.createdAt || "",
        verificationDocument: u.verificationDocument || "",
        avatar: u.profilePhoto || u.avatar || "",
        profilePhoto: u.profilePhoto || u.avatar || ""
      };
    });
    return res.json({ verifications: formatted });
  } catch (err) {
    console.error("Error fetching verifications:", err);
    return res.status(500).json({ error: "Failed to fetch verifications: " + err.message });
  }
});
router5.post("/verifications/:userId/approve", async (req, res) => {
  const { userId } = req.params;
  const { remarks } = req.body;
  const adminName = req.user?.fullName || req.user?.email || "admin";
  const adminId = req.user?.id || "System";
  try {
    const allUsers = await getAllUsersList();
    const targetUser = allUsers.find(
      (u) => String(u.id || "") === String(userId) || String(u.user_id || "") === String(userId) || String(u._id || "") === String(userId) || String(u.firebaseUid || "") === String(userId)
    );
    if (!targetUser) {
      return res.status(404).json({ error: "Student account not found." });
    }
    targetUser.idVerificationStatus = "verified";
    targetUser.verified = true;
    targetUser.isVerified = true;
    targetUser.is_verified = true;
    targetUser.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    targetUser.verificationSource = "administrator";
    targetUser.idVerificationRemarks = remarks || "Approved";
    const savedUser = await saveOrUpdateUser(targetUser);
    await createUserNotification({
      userId: savedUser.id,
      title: "Institutional Verification Approved",
      message: `Your student ID has been approved by ${adminName}. You are now verified!`,
      text: `\u{1F6E1}\uFE0F <strong>Institutional Verification:</strong> Your student ID has been approved by <strong>${adminName}</strong>. You are now verified!`,
      type: "verification_approved"
    });
    await logAdminActivity(
      adminId,
      `Approved student ID verification for: ${savedUser.fullName} (${savedUser.email})`,
      "user",
      savedUser.id,
      req.ip
    );
    return res.json({ message: "User verification approved successfully!", user: savedUser });
  } catch (err) {
    console.error("Error approving verification:", err);
    return res.status(500).json({ error: "Failed to approve: " + err.message });
  }
});
router5.post("/verifications/:userId/reject", async (req, res) => {
  const { userId } = req.params;
  const { remarks } = req.body;
  const adminName = req.user?.fullName || req.user?.email || "admin";
  const adminId = req.user?.id || "System";
  try {
    const allUsers = await getAllUsersList();
    const targetUser = allUsers.find(
      (u) => String(u.id || "") === String(userId) || String(u.user_id || "") === String(userId) || String(u._id || "") === String(userId) || String(u.firebaseUid || "") === String(userId)
    );
    if (!targetUser) {
      return res.status(404).json({ error: "Student account not found." });
    }
    targetUser.idVerificationStatus = "rejected";
    targetUser.verified = false;
    targetUser.isVerified = false;
    targetUser.is_verified = false;
    targetUser.verifiedAt = null;
    targetUser.verificationSource = null;
    targetUser.idVerificationRemarks = remarks || "Rejected";
    const savedUser = await saveOrUpdateUser(targetUser);
    await createUserNotification({
      userId: savedUser.id,
      title: "Institutional Verification Rejected",
      message: `Your student ID was not approved. Reason: ${remarks || "No explanation provided."}`,
      text: `\u274C <strong>Institutional Verification Rejected:</strong> Your student ID was not approved. Reason: ${remarks || "No explanation provided."}`,
      type: "verification_rejected"
    });
    await logAdminActivity(
      adminId,
      `Rejected student ID verification for: ${savedUser.fullName} (${savedUser.email})`,
      "user",
      savedUser.id,
      req.ip
    );
    return res.json({ message: "User verification rejected successfully!", user: savedUser });
  } catch (err) {
    console.error("Error rejecting verification:", err);
    return res.status(500).json({ error: "Failed to reject: " + err.message });
  }
});
router5.get("/moderators", authorizeAdmin, async (req, res) => {
  try {
    if (isMongoDBActive()) {
      const dbUsers = await MUser.find({ role: "moderator" }).lean();
      const formatted2 = dbUsers.map((u) => {
        return {
          id: String(u.id || u._id),
          student_id: u.studentId || u.student_id,
          studentId: u.studentId || u.student_id,
          rollNumber: u.rollNumber || u.classRoll || u.roll,
          full_name: u.fullName || u.full_name,
          fullName: u.fullName || u.full_name,
          email: u.email,
          department: u.department,
          role: u.role || "moderator",
          phone: u.phone,
          session_year: u.academicSession || u.session_year || u.sessionYear || "Staff",
          sessionYear: u.academicSession || u.session_year || u.sessionYear || "Staff",
          is_verified: !!u.isVerified,
          isVerified: !!u.isVerified,
          idVerificationStatus: u.idVerificationStatus || "unverified",
          avatar: u.profilePhoto || u.avatar || (u.fullName || u.full_name || "M").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(),
          profilePhoto: u.profilePhoto || u.avatar,
          status: u.status || "Active",
          permissions: u.permissions || { approve_posts: true, delete_posts: true, warn_users: true, view_audit_logs: true },
          assigned_date: u.assigned_date || u.assignedDate || (u.createdAt ? typeof u.createdAt === "string" ? u.createdAt.split("T")[0] : u.createdAt.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
          assignedDate: u.assigned_date || u.assignedDate || (u.createdAt ? typeof u.createdAt === "string" ? u.createdAt.split("T")[0] : u.createdAt.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
          total_verified_claims: u.total_verified_claims || 0,
          total_approved_listings: u.total_approved_listings || 0,
          total_rejected_listings: u.total_rejected_listings || 0
        };
      });
      return res.json({ moderators: formatted2 });
    }
    const { store } = getFallbackData();
    const rawMods = (store.users || []).filter((u) => u.role === "moderator" || u.role === "coordinator");
    const formatted = rawMods.map((u) => {
      return {
        id: String(u.id || u.user_id || u._id || ""),
        student_id: u.studentId || u.student_id || u.rollNumber || "",
        studentId: u.studentId || u.student_id || u.rollNumber || "",
        rollNumber: u.rollNumber || u.classRoll || u.roll || "",
        full_name: u.fullName || u.full_name || "Moderator",
        fullName: u.fullName || u.full_name || "Moderator",
        email: u.email || "",
        department: u.department || "Administration",
        role: u.role || "moderator",
        phone: u.phone || "",
        session_year: u.academicSession || u.session_year || u.sessionYear || "Staff",
        sessionYear: u.academicSession || u.session_year || u.sessionYear || "Staff",
        is_verified: !!(u.isVerified || u.is_verified),
        isVerified: !!(u.isVerified || u.is_verified),
        idVerificationStatus: u.idVerificationStatus || "verified",
        avatar: u.profilePhoto || u.avatar || (u.fullName || u.full_name || "M").split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(),
        profilePhoto: u.profilePhoto || u.avatar || "",
        status: u.status || "Active",
        permissions: u.permissions || { approve_posts: true, delete_posts: true, warn_users: true, view_audit_logs: true },
        assigned_date: u.assigned_date || u.assignedDate || (u.createdAt ? typeof u.createdAt === "string" ? u.createdAt.split("T")[0] : u.createdAt.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        assignedDate: u.assigned_date || u.assignedDate || (u.createdAt ? typeof u.createdAt === "string" ? u.createdAt.split("T")[0] : u.createdAt.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
        total_verified_claims: u.total_verified_claims || 0,
        total_approved_listings: u.total_approved_listings || 0,
        total_rejected_listings: u.total_rejected_listings || 0
      };
    });
    return res.json({ moderators: formatted });
  } catch (err) {
    console.error("Error fetching moderators:", err);
    return res.status(500).json({ error: "Failed to fetch moderators: " + err.message });
  }
});
router5.post("/moderators", authorizeAdmin, async (req, res) => {
  const { fullName, studentId, email, password, department, phone, permissions, moderatorType, isExternal } = req.body;
  const adminId = req.user?.id || "System";
  const cleanName = String(fullName || "").trim();
  const cleanId = String(studentId || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanDept = String(department || "").trim();
  const cleanPhone = String(phone || "").trim();
  if (!cleanName || !cleanId || !cleanEmail || !password || !cleanDept) {
    return res.status(400).json({ error: "All required fields marked with * must be filled." });
  }
  if (cleanName.length < 2) {
    return res.status(400).json({ error: "Full Name must be at least 2 characters long." });
  }
  const isStaffOrExternal = isExternal || moderatorType === "external" || moderatorType === "staff" || moderatorType === "faculty";
  if (!isStaffOrExternal) {
    const regDigits = cleanId.replace(/\D/g, "");
    if (regDigits.length !== cleanId.length || regDigits.length !== 5) {
      if (!cleanId.includes("-") && !cleanId.toUpperCase().startsWith("EMP") && !cleanId.toUpperCase().startsWith("STAFF") && !cleanId.toUpperCase().startsWith("EXT")) {
        return res.status(400).json({ error: "Student Registration Number must be exactly 5 numeric digits (or select Staff / Faculty / External for Employee Code)." });
      }
    }
  } else {
    if (cleanId.length < 2) {
      return res.status(400).json({ error: "Employee Code / Staff ID must be at least 2 characters long (e.g. EMP-001)." });
    }
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address (e.g., student@jkkniu.edu or user@gmail.com)." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({ error: "Password must combine at least one uppercase letter (A-Z), one lowercase letter (a-z), one digit (0-9), and one special symbol (@, #, $, etc.)." });
  }
  if (cleanDept.length < 2) {
    return res.status(400).json({ error: isStaffOrExternal ? "Please enter a valid Office / Cell / Affiliation." : "Please enter a valid Academic Department." });
  }
  if (cleanPhone && !/^[0-9+\s\-()]{6,20}$/.test(cleanPhone)) {
    return res.status(400).json({ error: "Please enter a valid phone number (e.g. +880 1712-XXXXXX)." });
  }
  try {
    const hashedPassword = import_bcryptjs3.default.hashSync(password, 10);
    const assignedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const initialPermissions = permissions || {
      approve_posts: true,
      delete_posts: true,
      warn_users: true,
      view_audit_logs: true
    };
    const { store, save } = getFallbackData();
    if (isMongoDBActive()) {
      const emailDup = await MUser.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } });
      if (emailDup) {
        return res.status(400).json({ error: `An account with email "${cleanEmail}" is already registered.` });
      }
      const idDup = await MUser.findOne({
        $or: [
          { studentId: { $regex: new RegExp(`^${cleanId}$`, "i") } },
          { student_id: { $regex: new RegExp(`^${cleanId}$`, "i") } },
          { employeeCode: { $regex: new RegExp(`^${cleanId}$`, "i") } },
          { employee_code: { $regex: new RegExp(`^${cleanId}$`, "i") } }
        ]
      });
      if (idDup) {
        return res.status(400).json({
          error: isStaffOrExternal ? `Employee Code / Staff ID "${cleanId}" is already registered. Please provide a unique code.` : `Registration Number "${cleanId}" is already registered in the system.`
        });
      }
    }
    const emailDupStore = store.users.some((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (emailDupStore) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" is already registered.` });
    }
    const idDupStore = store.users.some((u) => {
      const uId = u.student_id || u.studentId || u.employeeCode || u.employee_code;
      return uId && String(uId).trim().toLowerCase() === cleanId.toLowerCase();
    });
    if (idDupStore) {
      return res.status(400).json({
        error: isStaffOrExternal ? `Employee Code / Staff ID "${cleanId}" is already registered. Please provide a unique code.` : `Registration Number "${cleanId}" is already registered in the system.`
      });
    }
    let modId = String(Date.now());
    if (isFirebaseActive()) {
      try {
        const adminAuth = getFirebaseAdminAuth();
        if (adminAuth) {
          try {
            const existingFbUser = await adminAuth.getUserByEmail(cleanEmail);
            if (existingFbUser) {
              modId = existingFbUser.uid;
              await adminAuth.updateUser(modId, {
                password,
                displayName: cleanName,
                emailVerified: true
              });
            }
          } catch (getErr) {
            if (getErr.code === "auth/user-not-found" || getErr.message?.includes("user-not-found")) {
              const createdFb = await adminAuth.createUser({
                email: cleanEmail,
                password,
                displayName: cleanName,
                emailVerified: true
              });
              modId = createdFb.uid;
            }
          }
        }
      } catch (fbErr) {
        console.warn("Firebase moderator creation note:", fbErr.message);
      }
    }
    const newMod = {
      id: modId,
      firebaseUid: modId,
      student_id: cleanId,
      studentId: cleanId,
      employeeCode: isStaffOrExternal ? cleanId : "",
      employee_code: isStaffOrExternal ? cleanId : "",
      full_name: cleanName,
      fullName: cleanName,
      email: cleanEmail,
      password_hash: hashedPassword,
      passwordHash: hashedPassword,
      department: cleanDept,
      role: "moderator",
      phone: cleanPhone || "",
      session_year: isStaffOrExternal ? "Staff" : "Student",
      sessionYear: isStaffOrExternal ? "Staff" : "Student",
      academicSession: isStaffOrExternal ? "Staff" : "Student",
      is_verified: true,
      isVerified: true,
      emailVerified: true,
      email_verified: true,
      registrationCompleted: true,
      avatar: cleanName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(),
      profilePhoto: cleanName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase(),
      assigned_date: assignedDate,
      assignedDate,
      status: "Active",
      accountStatus: "Active",
      last_login: "Never",
      lastLogin: "Never",
      total_verified_claims: 0,
      total_approved_listings: 0,
      total_rejected_listings: 0,
      permissions: initialPermissions,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (isMongoDBActive()) {
      await MUser.updateOne({ id: newMod.id }, newMod, { upsert: true });
    }
    const existingStoreIdx = store.users.findIndex((u) => String(u.id) === String(newMod.id) || u.email.toLowerCase() === newMod.email.toLowerCase());
    if (existingStoreIdx >= 0) {
      store.users[existingStoreIdx] = newMod;
    } else {
      store.users.push(newMod);
    }
    save();
    try {
      const { setFirestoreDocument: setFirestoreDocument2, getFirestoreDB: getFirestoreDB2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
      if (getFirestoreDB2()) {
        await setFirestoreDocument2("users", newMod.id, newMod);
      }
    } catch (fsErr) {
      console.warn("Firestore coordinator sync note:", fsErr.message);
    }
    await logAdminActivity(
      adminId,
      `Moderator/Coordinator Account Created: ${cleanName} (${cleanEmail})`,
      "user",
      newMod.id,
      req.ip
    );
    return res.status(201).json({ message: "Coordinator account created successfully.", moderator: newMod });
  } catch (err) {
    console.error("Error creating moderator:", err);
    return res.status(500).json({ error: "Failed to create coordinator account: " + err.message });
  }
});
router5.post("/moderators/promote", authorizeAdmin, async (req, res) => {
  const { studentId, email, permissions } = req.body;
  const adminId = req.user?.id || "System";
  if (!studentId && !email) {
    return res.status(400).json({ error: "Please specify the Student ID or Email to promote." });
  }
  try {
    const assignedDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const initialPermissions = permissions || {
      approve_posts: true,
      delete_posts: true,
      warn_users: true,
      view_audit_logs: true
    };
    const { store, save } = getFallbackData();
    let user = null;
    if (isMongoDBActive()) {
      const query = {};
      if (studentId) {
        query.$or = [
          { studentId },
          { student_id: studentId }
        ];
      } else if (email) {
        query.email = { $regex: new RegExp(`^${email.trim()}$`, "i") };
      }
      const dbUser = await MUser.findOne(query);
      if (!dbUser) {
        return res.status(404).json({ error: "Student account not found." });
      }
      if (dbUser.role === "admin" || dbUser.role === "moderator") {
        return res.status(400).json({ error: `User is already an ${dbUser.role}.` });
      }
      dbUser.role = "moderator";
      dbUser.assignedDate = assignedDate;
      dbUser.assigned_date = assignedDate;
      dbUser.status = "Active";
      dbUser.permissions = initialPermissions;
      await dbUser.save();
      user = {
        id: String(dbUser.id || dbUser._id),
        student_id: dbUser.studentId || dbUser.student_id,
        studentId: dbUser.studentId || dbUser.student_id,
        full_name: dbUser.fullName || dbUser.full_name,
        email: dbUser.email,
        role: "moderator",
        assigned_date: assignedDate,
        status: "Active",
        permissions: initialPermissions
      };
      const localU = store.users.find((u) => String(u.id) === String(user.id));
      if (localU) {
        localU.role = "moderator";
        localU.assigned_date = assignedDate;
        localU.status = "Active";
        localU.permissions = initialPermissions;
      } else {
        store.users.push({
          ...dbUser.toObject(),
          id: user.id,
          role: "moderator",
          assigned_date: assignedDate,
          status: "Active",
          permissions: initialPermissions
        });
      }
    } else {
      user = store.users.find(
        (u) => studentId && String(u.student_id).toLowerCase() === String(studentId).toLowerCase() || email && String(u.email).toLowerCase() === String(email).toLowerCase()
      );
      if (!user) {
        return res.status(404).json({ error: "Student account not found." });
      }
      if (user.role === "admin" || user.role === "moderator") {
        return res.status(400).json({ error: `User is already an ${user.role}.` });
      }
      user.role = "moderator";
      user.assigned_date = assignedDate;
      user.status = "Active";
      user.total_verified_claims = user.total_verified_claims || 0;
      user.total_approved_listings = user.total_approved_listings || 0;
      user.total_rejected_listings = user.total_rejected_listings || 0;
      user.permissions = initialPermissions;
    }
    save();
    await logAdminActivity(
      adminId,
      `Student Promoted to Moderator: ${user.full_name} (${user.email})`,
      "user",
      user.id,
      req.ip
    );
    return res.json({ message: `Successfully promoted ${user.full_name} to Moderator.`, user });
  } catch (err) {
    console.error("Error promoting student:", err);
    return res.status(500).json({ error: "Failed to promote student: " + err.message });
  }
});
router5.post("/moderators/:id/demote", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "System";
  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (!dbUser) {
        return res.status(404).json({ error: "Moderator account not found." });
      }
      if (dbUser.role !== "moderator") {
        return res.status(400).json({ error: "User is not a Moderator." });
      }
      dbUser.role = "student";
      dbUser.assignedDate = void 0;
      dbUser.assigned_date = void 0;
      dbUser.permissions = void 0;
      await dbUser.save();
    }
    const { store, save } = getFallbackData();
    const user = store.users.find((u) => String(u.id) === String(id));
    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: "Moderator account not found in local cache." });
    }
    if (user) {
      user.role = "student";
      delete user.assigned_date;
      delete user.permissions;
    }
    save();
    const displayName = user ? user.full_name : isMongoDBActive() ? (await MUser.findOne({ id: String(id) }))?.fullName : "Moderator";
    await logAdminActivity(
      adminId,
      `Moderator Demoted to Student: ${displayName || "Moderator"}`,
      "user",
      id,
      req.ip
    );
    return res.json({ message: `Successfully demoted ${displayName || "Moderator"} to Student.` });
  } catch (err) {
    console.error("Error demoting moderator:", err);
    return res.status(500).json({ error: "Failed to demote moderator: " + err.message });
  }
});
router5.put("/moderators/:id", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { fullName, department, phone, permissions } = req.body;
  const adminId = req.user?.id || "System";
  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        if (fullName) {
          dbUser.fullName = fullName;
          dbUser.full_name = fullName;
        }
        if (department) dbUser.department = department;
        if (phone !== void 0) dbUser.phone = phone;
        if (permissions) dbUser.permissions = permissions;
        await dbUser.save();
      }
    }
    const { store, save } = getFallbackData();
    const user = store.users.find((u) => String(u.id) === String(id));
    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: "Moderator account not found." });
    }
    if (user) {
      if (fullName) user.full_name = fullName;
      if (department) user.department = department;
      if (phone !== void 0) user.phone = phone;
      if (permissions) user.permissions = permissions;
    }
    save();
    const displayName = user ? user.full_name : fullName || "Moderator";
    const displayEmail = user ? user.email : "";
    await logAdminActivity(
      adminId,
      `Moderator Updated: ${displayName} (${displayEmail})`,
      "user",
      id,
      req.ip
    );
    return res.json({ message: "Moderator details updated successfully.", moderator: user || { id } });
  } catch (err) {
    console.error("Error updating moderator:", err);
    return res.status(500).json({ error: "Failed to update moderator: " + err.message });
  }
});
router5.post("/moderators/:id/status", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id || "System";
  if (!status || !["Active", "Suspended", "Disabled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Choose Active, Suspended, or Disabled." });
  }
  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        dbUser.status = status;
        dbUser.is_suspended = status === "Suspended";
        await dbUser.save();
      }
    }
    const { store, save } = getFallbackData();
    const user = store.users.find((u) => String(u.id) === String(id));
    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: "Moderator account not found." });
    }
    if (user) {
      user.status = status;
      if (status === "Suspended") {
        user.is_suspended = true;
      } else {
        user.is_suspended = false;
      }
    }
    save();
    const displayName = user ? user.full_name : "Moderator";
    await logAdminActivity(
      adminId,
      `Moderator ${status === "Suspended" ? "Suspended" : status === "Active" ? "Activated" : "Disabled"}: ${displayName}`,
      "user",
      id,
      req.ip
    );
    return res.json({ message: `Moderator status updated to ${status}.` });
  } catch (err) {
    console.error("Error updating moderator status:", err);
    return res.status(500).json({ error: "Failed to update moderator status: " + err.message });
  }
});
router5.post("/moderators/:id/reset-password", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const adminId = req.user?.id || "System";
  if (!oldPassword) {
    return res.status(400).json({ error: "Please enter the old password for verification." });
  }
  if (!newPassword) {
    return res.status(400).json({ error: "Please enter a new password." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New password and confirm password do not match." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters long." });
  }
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
    return res.status(400).json({
      error: "New password must combine at least one uppercase letter, one lowercase letter, one digit, and one special character."
    });
  }
  try {
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (!dbUser) {
        return res.status(404).json({ error: "Moderator account not found." });
      }
      const currentHash = dbUser.passwordHash || dbUser.password_hash || "";
      if (!currentHash || !import_bcryptjs3.default.compareSync(oldPassword, currentHash)) {
        return res.status(400).json({ error: "Incorrect old password. Please try again." });
      }
      const hashedPassword = import_bcryptjs3.default.hashSync(newPassword, 10);
      dbUser.passwordHash = hashedPassword;
      dbUser.password_hash = hashedPassword;
      await dbUser.save();
    }
    const { store, save } = getFallbackData();
    const user = store.users.find((u) => String(u.id) === String(id));
    if (!user && !isMongoDBActive()) {
      return res.status(404).json({ error: "Moderator account not found." });
    }
    if (user) {
      const currentHash = user.password_hash || user.passwordHash || "";
      if (!isMongoDBActive()) {
        if (!currentHash || !import_bcryptjs3.default.compareSync(oldPassword, currentHash)) {
          return res.status(400).json({ error: "Incorrect old password. Please try again." });
        }
      }
      const hashedPassword = import_bcryptjs3.default.hashSync(newPassword, 10);
      user.password_hash = hashedPassword;
      user.passwordHash = hashedPassword;
    }
    save();
    const displayName = user ? user.full_name : "Moderator";
    await logAdminActivity(
      adminId,
      `Moderator Password Reset: ${displayName}`,
      "user",
      id,
      req.ip
    );
    return res.json({ message: "Moderator password updated successfully." });
  } catch (err) {
    console.error("Error resetting moderator password:", err);
    return res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
});
router5.delete("/moderators/:id", authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "System";
  try {
    let fullName = "Moderator";
    let email = "";
    if (isMongoDBActive()) {
      const dbUser = await MUser.findOne({ id: String(id) });
      if (dbUser) {
        fullName = dbUser.fullName || dbUser.full_name || "Moderator";
        email = dbUser.email || "";
      }
    } else {
      const { store } = getFallbackData();
      const user = store.users.find((u) => String(u.id) === String(id));
      if (user) {
        fullName = user.full_name || user.fullName || "Moderator";
        email = user.email || "";
      }
    }
    await performCascadeDeleteUser(id);
    await logAdminActivity(
      adminId,
      `Moderator Deleted: ${fullName} (${email})`,
      "user",
      id,
      req.ip
    );
    return res.json({ message: "Moderator account and associated data deleted successfully." });
  } catch (err) {
    console.error("Error deleting moderator:", err);
    return res.status(500).json({ error: "Failed to delete moderator: " + err.message });
  }
});
router5.get("/revisions", async (req, res) => {
  try {
    const { store } = getFallbackData();
    const pendingRevisions = (store.listing_revisions || []).filter((r) => r.status === "pending_review");
    return res.json({ revisions: pendingRevisions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.post("/revisions/:id/approve", async (req, res) => {
  const { id } = req.params;
  const adminName = req.user?.fullName || req.user?.email || "admin";
  try {
    const { store, save } = getFallbackData();
    const revision = (store.listing_revisions || []).find((r) => String(r.revisionId) === String(id));
    if (!revision) {
      return res.status(404).json({ error: "Revision not found." });
    }
    if (revision.status !== "pending_review") {
      return res.status(400).json({ error: `Revision has already been ${revision.status}.` });
    }
    const item = store.items.find((i) => String(i.id) === String(revision.postId));
    if (!item) {
      return res.status(404).json({ error: "Original listing not found." });
    }
    if (String(revision.ownerUid) === String(req.user?.id)) {
      return res.status(403).json({ error: "Security breach: You cannot approve your own listing revision." });
    }
    const nd = revision.newData || {};
    item.title = nd.title || item.title;
    item.location = nd.location || item.location;
    item.category = nd.category || item.category;
    item.description = nd.description || item.description;
    item.specificSpot = nd.specificSpot || item.specificSpot || "";
    item.type = nd.type || item.type;
    item.emoji = nd.emoji || item.emoji;
    const sanitizedRevReward = (() => {
      const targetType = nd.type || item.type;
      if (targetType !== "lost") return "";
      const candidate = (nd.rewardAmount || (typeof nd.rewardOffered === "string" ? nd.rewardOffered : "") || "").toString().trim();
      if (!candidate || candidate === "true" || candidate === "false" || candidate === "null" || candidate === "undefined") return "";
      return candidate;
    })();
    item.rewardOffered = sanitizedRevReward;
    item.rewardAmount = sanitizedRevReward;
    if (nd.images && nd.images.length > 0) {
      item.images = nd.images;
      const firstCover = nd.images.find((img) => img.isCover) || nd.images[0];
      item.coverImage = firstCover.url;
      item.image = firstCover.url;
      item.imageUrl = firstCover.url;
    }
    item.approvalStatus = "approved";
    item.status = "active";
    item.isApproved = true;
    item.isRejected = false;
    item.lastApprovedAt = /* @__PURE__ */ new Date();
    item.approvedBy = adminName;
    item.editedBy = revision.ownerUid;
    item.revision = (item.revision || 1) + 1;
    item.hasPendingRevision = false;
    revision.status = "approved";
    revision.approvedBy = adminName;
    revision.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    await createUserNotification({
      userId: revision.ownerUid,
      title: "Listing Revision Approved",
      message: `Your listing updates for "${item.title}" have been approved by ${adminName} and are now live!`,
      text: `Your listing updates for <strong>"${item.title}"</strong> have been approved by <strong>${adminName}</strong> and are now live!`,
      type: "revision_approved"
    });
    await logAdminActivity(
      req.user?.id || "System",
      `Approved listing revision for post: ${item.title}`,
      "item",
      item.id,
      req.ip
    );
    save();
    return res.json({ message: "Revision approved and listing updated successfully!", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.post("/revisions/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminName = req.user?.fullName || req.user?.email || "admin";
  try {
    const { store, save } = getFallbackData();
    const revision = (store.listing_revisions || []).find((r) => String(r.revisionId) === String(id));
    if (!revision) {
      return res.status(404).json({ error: "Revision not found." });
    }
    if (revision.status !== "pending_review") {
      return res.status(400).json({ error: `Revision has already been ${revision.status}.` });
    }
    const item = store.items.find((i) => String(i.id) === String(revision.postId));
    if (!item) {
      return res.status(404).json({ error: "Original listing not found." });
    }
    if (String(revision.ownerUid) === String(req.user?.id)) {
      return res.status(403).json({ error: "Security breach: You cannot review your own listing revision." });
    }
    revision.status = "rejected";
    revision.approvedBy = adminName;
    revision.reviewComment = reason || "No comment provided by reviewer.";
    revision.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    item.hasPendingRevision = false;
    await createUserNotification({
      userId: revision.ownerUid,
      title: "Listing Revision Rejected",
      message: `Your listing updates for "${item.title}" were rejected by ${adminName}. Reason: ${reason || "No explanation provided."}`,
      text: `Your listing updates for <strong>"${item.title}"</strong> were rejected by <strong>${adminName}</strong>. Reason: ${reason || "No explanation provided."}`,
      type: "revision_rejected"
    });
    await logAdminActivity(
      req.user?.id || "System",
      `Rejected listing revision for post: ${item.title}`,
      "item",
      item.id,
      req.ip
    );
    save();
    return res.json({ message: "Revision rejected successfully!", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.get("/settings", async (req, res) => {
  try {
    const { store } = getFallbackData();
    if (!store.system_settings) {
      store.system_settings = {
        autoApprovePosts: true,
        autoSpamFilter: true,
        maxImageSize: "5 MB per image",
        archiveDuration: "30 Days Active"
      };
    }
    return res.json({ settings: store.system_settings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router5.post("/settings", async (req, res) => {
  const { autoApprovePosts, autoSpamFilter, maxImageSize, archiveDuration } = req.body;
  try {
    const { store, save } = getFallbackData();
    store.system_settings = {
      autoApprovePosts: typeof autoApprovePosts === "boolean" ? autoApprovePosts : true,
      autoSpamFilter: typeof autoSpamFilter === "boolean" ? autoSpamFilter : true,
      maxImageSize: maxImageSize || "5 MB per image",
      archiveDuration: archiveDuration || "30 Days Active"
    };
    await logAdminActivity(
      req.user?.id || "System",
      `Updated system settings: Auto-Approve=${store.system_settings.autoApprovePosts}, Auto-Spam=${store.system_settings.autoSpamFilter}, MaxImageSize="${store.system_settings.maxImageSize}", ArchiveDuration="${store.system_settings.archiveDuration}"`,
      "system_config",
      "settings",
      req.ip
    );
    save();
    return res.json({ message: "System configurations stored and synchronized successfully.", settings: store.system_settings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
var handleDeleteUserCascade = async (req, res) => {
  const { id } = req.params;
  const reason = req.body?.reason || req.query?.reason || "Permanently deleted account registry cascades.";
  const adminId = req.user?.id || req.user?._id || "System";
  const adminName = req.user?.fullName || req.user?.full_name || req.user?.email || "Admin";
  if (!id) {
    return res.status(400).json({ error: "Missing user ID parameter." });
  }
  try {
    const mongoose8 = await import("mongoose");
    let userDetails = null;
    if (isMongoDBActive()) {
      const queryConditions = [
        { id: String(id) },
        { firebaseUid: String(id) },
        { email: String(id).toLowerCase() },
        { studentId: String(id) },
        { student_id: String(id) }
      ];
      if (mongoose8.default.Types.ObjectId.isValid(id)) {
        queryConditions.push({ _id: id });
      }
      const u = await MUser.findOne({ $or: queryConditions });
      if (u) {
        userDetails = {
          id: String(u.id || u._id),
          _id: String(u._id),
          fullName: u.fullName || u.full_name || "User",
          email: u.email || "",
          role: u.role || "student",
          firebaseUid: u.firebaseUid || ""
        };
      }
    }
    if (!userDetails) {
      const { store } = getFallbackData();
      const sId = String(id).toLowerCase();
      const u = (store.users || []).find(
        (usr) => String(usr.id) === String(id) || String(usr._id) === String(id) || usr.firebaseUid && String(usr.firebaseUid) === String(id) || usr.email && String(usr.email).toLowerCase() === sId || usr.studentId && String(usr.studentId) === String(id) || usr.student_id && String(usr.student_id) === String(id)
      );
      if (u) {
        userDetails = {
          id: String(u.id || u._id),
          _id: String(u._id || u.id),
          fullName: u.fullName || u.full_name || "User",
          email: u.email || "",
          role: u.role || "student",
          firebaseUid: u.firebaseUid || ""
        };
      }
    }
    if (!userDetails) {
      await performCascadeDeleteUser(id);
      return res.json({
        message: "Cascade cleanup executed for user ID: " + id,
        deletedUserId: id
      });
    }
    if (String(userDetails.id) === String(req.user?.id) || String(userDetails._id) === String(req.user?.id)) {
      return res.status(400).json({ error: "Security Constraint: You cannot delete your own account." });
    }
    if (userDetails.email === "nazrulretrievers@gmail.com" || String(userDetails.id) === "2") {
      return res.status(403).json({ error: "Security Constraint: The primary Super Admin account cannot be deleted." });
    }
    if (userDetails.role === "admin") {
      let adminCount = 0;
      if (isMongoDBActive()) {
        adminCount = await MUser.countDocuments({ role: "admin" });
      } else {
        const { store } = getFallbackData();
        adminCount = store.users.filter((u) => u.role === "admin").length;
      }
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Security Constraint: You cannot delete the last Admin of this platform." });
      }
    }
    const logMsg = `ADMIN DELETE USER - Admin ID: ${adminId}, Admin Name: ${adminName}, Deleted User ID: ${userDetails.id}, Deleted User Name: ${userDetails.fullName} (${userDetails.email}), Reason: ${reason}`;
    await logAdminActivity(
      adminId,
      logMsg,
      "user",
      userDetails.id,
      req.ip
    );
    await performCascadeDeleteUser(userDetails.id, userDetails);
    return res.json({
      message: "User account and all associated data permanently deleted successfully!",
      deletedUserId: userDetails.id
    });
  } catch (err) {
    console.error("Error in user cascade deletion:", err);
    return res.status(500).json({ error: "Failed to permanently delete user: " + err.message });
  }
};
router5.post("/users/batch-delete", authorizeAdmin, async (req, res) => {
  const { userIds, reason } = req.body;
  const adminId = req.user?.id || req.user?._id || "System";
  const adminName = req.user?.fullName || req.user?.full_name || req.user?.email || "Admin";
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: "Please select at least one user to delete." });
  }
  const deleteReason = reason || "Batch cascade deletion executed by Admin.";
  const deletedIds = [];
  const errors = [];
  try {
    const mongoose8 = await import("mongoose");
    for (const rawId of userIds) {
      const id = String(rawId);
      try {
        let userDetails = null;
        if (isMongoDBActive()) {
          const queryConditions = [
            { id },
            { firebaseUid: id },
            { email: id.toLowerCase() },
            { studentId: id },
            { student_id: id }
          ];
          if (mongoose8.default.Types.ObjectId.isValid(id)) {
            queryConditions.push({ _id: id });
          }
          const u = await MUser.findOne({ $or: queryConditions });
          if (u) {
            userDetails = {
              id: String(u.id || u._id),
              _id: String(u._id),
              fullName: u.fullName || u.full_name || "User",
              email: u.email || "",
              role: u.role || "student",
              firebaseUid: u.firebaseUid || ""
            };
          }
        }
        if (!userDetails) {
          const { store } = getFallbackData();
          const sId = id.toLowerCase();
          const u = (store.users || []).find(
            (usr) => String(usr.id) === id || String(usr._id) === id || usr.firebaseUid && String(usr.firebaseUid) === id || usr.email && String(usr.email).toLowerCase() === sId || usr.studentId && String(usr.studentId) === id || usr.student_id && String(usr.student_id) === id
          );
          if (u) {
            userDetails = {
              id: String(u.id || u._id),
              _id: String(u._id || u.id),
              fullName: u.fullName || u.full_name || "User",
              email: u.email || "",
              role: u.role || "student",
              firebaseUid: u.firebaseUid || ""
            };
          }
        }
        if (!userDetails) {
          await performCascadeDeleteUser(id);
          deletedIds.push(id);
          continue;
        }
        const isSelf = String(userDetails.id) === String(req.user?.id) || String(userDetails._id) === String(req.user?.id) || userDetails.email && req.user?.email && userDetails.email.toLowerCase() === req.user.email.toLowerCase();
        if (isSelf) {
          errors.push(`Skipped ${userDetails.fullName || id}: Cannot delete your own active account.`);
          continue;
        }
        if (userDetails.role === "admin" || userDetails.email === "nazrulretrievers@gmail.com" || String(userDetails.id) === "2") {
          errors.push(`Skipped ${userDetails.fullName || id}: Administrative accounts are protected from batch deletion.`);
          continue;
        }
        const logMsg = `ADMIN BATCH DELETE USER - Admin ID: ${adminId}, Admin Name: ${adminName}, Deleted User: ${userDetails.fullName} (${userDetails.email || id}), Reason: ${deleteReason}`;
        await logAdminActivity(
          adminId,
          logMsg,
          "user",
          userDetails.id,
          req.ip
        );
        await performCascadeDeleteUser(userDetails.id, userDetails);
        deletedIds.push(userDetails.id);
        if (userDetails._id && userDetails._id !== userDetails.id) {
          deletedIds.push(userDetails._id);
        }
      } catch (err) {
        console.error(`Error deleting user ${id} in batch:`, err);
        errors.push(`Failed to delete user ID ${id}: ${err.message}`);
      }
    }
    return res.json({
      message: `Successfully deleted ${deletedIds.length} user(s) and all their associated posts, claims, messages, and uploaded files!`,
      deletedCount: deletedIds.length,
      deletedUserIds: deletedIds,
      errors: errors.length > 0 ? errors : void 0
    });
  } catch (err) {
    console.error("Error in batch-delete users:", err);
    return res.status(500).json({ error: "Failed to batch delete users: " + err.message });
  }
});
router5.post("/users/delete-all", authorizeAdmin, async (req, res) => {
  const { reason } = req.body;
  const adminId = req.user?.id || req.user?._id || "System";
  const adminName = req.user?.fullName || req.user?.full_name || req.user?.email || "Admin";
  const deleteReason = reason || "Purge all user accounts and associated posts executed by Admin.";
  try {
    const userMap = /* @__PURE__ */ new Map();
    if (isMongoDBActive()) {
      try {
        const dbUsers = await MUser.find({}).lean();
        for (const u of dbUsers) {
          const key = String(u.id || u._id || u.email);
          userMap.set(key, u);
        }
      } catch (err) {
        console.error("Error querying MongoDB users for delete-all:", err);
      }
    }
    const { store, save } = getFallbackData();
    for (const u of store.users || []) {
      const key = String(u.id || u._id || u.email);
      if (!userMap.has(key)) {
        userMap.set(key, u);
      }
    }
    const allUsers = Array.from(userMap.values());
    const currentAdminId = String(req.user?.id || req.user?._id || "");
    const currentAdminEmail = String(req.user?.email || "").toLowerCase().trim();
    const targetsToDelete = allUsers.filter((u) => {
      const uId = String(u.id || u._id || "");
      const uEmail = String(u.email || "").toLowerCase().trim();
      if (uId === currentAdminId) return false;
      if (currentAdminEmail && uEmail === currentAdminEmail) return false;
      if (uEmail === "nazrulretrievers@gmail.com" || uId === "2") return false;
      if (u.role === "admin") return false;
      return true;
    });
    const deletedIds = [];
    for (const u of targetsToDelete) {
      const uId = String(u.id || u._id);
      const userDetails = {
        id: uId,
        _id: String(u._id || uId),
        fullName: u.fullName || u.full_name || "User",
        email: u.email || "",
        role: u.role || "student",
        firebaseUid: u.firebaseUid || ""
      };
      await logAdminActivity(
        adminId,
        `ADMIN PURGE ALL USERS - Deleted: ${userDetails.fullName} (${userDetails.email || uId})`,
        "user",
        userDetails.id,
        req.ip
      );
      await performCascadeDeleteUser(userDetails.id, userDetails);
      deletedIds.push(userDetails.id);
      if (userDetails._id && userDetails._id !== userDetails.id) {
        deletedIds.push(userDetails._id);
      }
    }
    if (isMongoDBActive()) {
      try {
        await MItem.deleteMany({
          $and: [
            { email: { $ne: "nazrulretrievers@gmail.com" } },
            { userId: { $ne: "2" } },
            { ownerUid: { $ne: "2" } }
          ]
        });
        await MClaim.deleteMany({
          $and: [
            { email: { $ne: "nazrulretrievers@gmail.com" } },
            { user_id: { $ne: "2" } }
          ]
        });
        await MChatThread.deleteMany({
          participants: { $ne: "2" }
        });
      } catch (sweepErr) {
        console.warn("MongoDB sweep warning:", sweepErr);
      }
    }
    if (store.items) {
      store.items = store.items.filter((item) => {
        const itemEmail = String(item.email || item.postedBy?.email || "").toLowerCase().trim();
        const itemUserId = String(item.userId || item.ownerUid || "");
        return itemEmail === "nazrulretrievers@gmail.com" || itemUserId === "2";
      });
    }
    if (store.claims) {
      store.claims = store.claims.filter((c) => {
        const cEmail = String(c.email || c.user_email || "").toLowerCase().trim();
        const cUserId = String(c.userId || c.user_id || "");
        return cEmail === "nazrulretrievers@gmail.com" || cUserId === "2";
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
  } catch (err) {
    console.error("Error in delete-all users:", err);
    return res.status(500).json({ error: "Failed to delete all users: " + err.message });
  }
});
router5.delete("/users/all", authorizeAdmin, async (req, res) => {
  req.url = "/users/delete-all";
  return router5.handle(req, res);
});
router5.delete("/users/:id", authorizeAdmin, handleDeleteUserCascade);
router5.delete("/users/:id/cascade", authorizeAdmin, handleDeleteUserCascade);
var admin_default = router5;

// server/app.ts
var app = (0, import_express6.default)();
app.use((0, import_helmet.default)({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use((0, import_cors.default)({
  origin: "*",
  credentials: true
}));
app.use(import_express6.default.json({ limit: "10mb" }));
app.use(import_express6.default.urlencoded({ limit: "10mb", extended: true }));
app.set("trust proxy", 1);
var limiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 1e6,
  message: { error: "Too many requests from this IP. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});
app.use("/api/", limiter);
app.use("/server-uploads", import_express6.default.static(import_path8.default.join(process.cwd(), "server-uploads")));
app.use("/api", (req, res, next) => {
  if (!isMongoDBActive()) {
    connectMongoDB().then(async (connected) => {
      if (connected) {
        await reloadFallbackStoreFromMongoDB(true);
      }
    }).catch((err) => {
      console.warn("MongoDB lazy background connection notice:", err?.message || err);
    });
  }
  next();
});
app.use("/api", (req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;
  const waitForSync = async () => {
    const syncPromise = getPendingSyncPromise();
    if (syncPromise) {
      const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.race([syncPromise, timeout]);
    }
  };
  res.json = function(body) {
    waitForSync().then(() => {
      originalJson.call(this, body);
    }).catch(() => {
      originalJson.call(this, body);
    });
    return this;
  };
  res.send = function(body) {
    waitForSync().then(() => {
      originalSend.call(this, body);
    }).catch(() => {
      originalSend.call(this, body);
    });
    return this;
  };
  next();
});
app.use("/api/auth", auth_default);
app.use("/api/items", items_default);
app.use("/api/chats", chats_default);
app.use("/api/notifications", notifications_default);
app.use("/api/admin", admin_default);
app.get("/api/faculties", (req, res) => {
  const { store } = getFallbackData();
  res.json(store.faculties || []);
});
app.get("/api/faculties/:id/departments", (req, res) => {
  const { store } = getFallbackData();
  const facultyId = req.params.id;
  const depts = (store.departments || []).filter((d) => d.faculty_id === facultyId);
  res.json(depts);
});
app.get("/api/departments/search", (req, res) => {
  const { store } = getFallbackData();
  const q = String(req.query.q || "").toLowerCase();
  if (!q) {
    return res.json([]);
  }
  const matchingDepts = (store.departments || []).filter((d) => {
    const deptNameMatches = d.department_name.toLowerCase().includes(q);
    const faculty = (store.faculties || []).find((f) => f.id === d.faculty_id);
    const facultyNameMatches = faculty ? faculty.faculty_name.toLowerCase().includes(q) : false;
    return deptNameMatches || facultyNameMatches;
  });
  res.json(matchingDepts);
});
app.get("/api/db-status", async (req, res) => {
  try {
    let active = isMongoDBActive();
    if (!active) {
      active = await connectMongoDB();
      if (active) {
        await reloadFallbackStoreFromMongoDB(true);
      }
    }
    const uri = getEffectiveMongoUri();
    const maskedUri = uri ? uri.replace(/:([^@:]+)@/g, ":******@") : "NOT_SET";
    res.json({
      connected: isMongoDBActive(),
      readyState: import_mongoose7.default.connection ? import_mongoose7.default.connection.readyState : 0,
      mongodb_uri: maskedUri,
      databaseName: import_mongoose7.default.connection && import_mongoose7.default.connection.db ? import_mongoose7.default.connection.db.databaseName : "N/A",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.use("/api/my-items", (req, res, next) => {
  req.url = "/my-items";
  items_default(req, res, next);
});
app.use("/api/admin/items", (req, res, next) => {
  req.url = "/admin/items";
  items_default(req, res, next);
});
var app_default = app;

// api/index.ts
var index_default = app_default;
