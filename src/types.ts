export interface User {
  id: string;
  fullName: string;
  full_name?: string;
  studentId: string;
  student_id?: string;
  registrationNumber?: string;
  email: string;
  department: string;
  department_id?: string;
  phone?: string;
  phoneNumber?: string;
  phone_number?: string;
  sessionYear?: string;
  session_year?: string;
  academicSession?: string;
  avatar?: string;
  profilePhoto?: string;
  profile_photo?: string;
  profileImage?: string;
  faculty?: string;
  faculty_id?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  bloodGroup?: string;
  residentialHall?: string;
  socialLink?: string;
  facebook?: string;
  linkedin?: string;
  bio?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  verified?: boolean;
  idVerificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  idVerificationRemarks?: string;
  verificationDocument?: string;
  emailVerified?: boolean;
  status?: string;
  role?: 'student' | 'admin' | 'moderator' | 'staff' | 'coordinator' | string;
  designation?: string;
  profileCompletion?: number;
  profileCompleted?: number;
  classRoll?: string;
  rollNumber?: string;
  profileVisibility?: 'public' | 'private';
  hidePhone?: boolean;
  isPhonePrivate?: boolean;
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    matchAlerts?: boolean;
    sound?: boolean;
    activityBadges?: boolean;
    showAcademicBadge?: boolean;
  };
  accountSettings?: {
    preferredContactMethod?: 'chat' | 'phone' | 'both';
    autoFillDetails?: boolean;
    compactView?: boolean;
  };
  preferredContactMethod?: 'chat' | 'phone' | 'both';
  language?: 'EN' | 'BN';
  theme?: 'light' | 'dark';
}

export type ItemStatus = 
  | 'active' 
  | 'claim_requested' 
  | 'under_verification' 
  | 'handover_pending' 
  | 'claimed' 
  | 'returned' 
  | 'reunited' 
  | 'closed' 
  | 'resolved' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'deleted';

export interface Item {
  id: string;
  emoji: string;
  title: string;
  location: string;
  specificSpot?: string;
  date: string;
  type: 'lost' | 'found';
  category: string;
  subcategory?: string;
  description: string;
  secretNotes?: string;
  secret_notes?: string;
  status: ItemStatus;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  views: number;
  image?: string;
  capturedViaCamera?: boolean;
  capturedImage?: string;
  postedBy: {
    name: string;
    department: string;
    verified: boolean;
    initials: string;
    avatar?: string;
    profilePhoto?: string;
    email?: string;
    userId?: string;
  };
  rewardOffered?: boolean | string;
  rewardAmount?: string;
  reward_amount?: string;
  isApproved?: boolean;
  isRejected?: boolean;
  isDeleted?: boolean;
  firebaseUid?: string;
  userId?: string;
  user_id?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  approvedBy?: string;
  approvedAt?: string | Date;
  rejectedBy?: string;
  rejectedAt?: string | Date;
  rejectionReason?: string;
  deletedBy?: string;
  deletedAt?: string | Date;
  images?: ImageMetadata[];
  coverImage?: string;
  lastApprovedAt?: string | Date;
  editedBy?: string;
  revision?: number;
  ownerUid?: string;
  createdAt?: string;
  claimCount?: number;
  activeClaimId?: string;
  claimedBy?: string;
  returnedAt?: string | Date;
  handoverLocation?: string;
}

export interface Claim {
  claim_id: string;
  id?: string;
  item_id: string;
  user_id: string;
  proof_description: string;
  contact_details?: string;
  status: 'pending' | 'under_verification' | 'approved' | 'rejected' | 'completed';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  item_title?: string;
  item_type?: 'lost' | 'found';
  item_status?: string;
  item_category?: string;
  item_location?: string;
  finder_name?: string;
  finder_email?: string;
  finder_phone?: string;
  student_name?: string;
  student_id?: string;
  student_email?: string;
  image_url?: string;
}

export interface ImageMetadata {
  url: string;
  storagePath: string;
  order: number;
  isCover: boolean;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: number;
  width: number;
  height: number;
}

export interface ListingRevision {
  revisionId: string;
  postId: string;
  ownerUid: string;
  previousData: Partial<Item>;
  newData: Partial<Item>;
  editedImages: ImageMetadata[];
  editedAt: string;
  status: 'pending_review' | 'approved' | 'rejected';
  approvedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
  revisionNumber: number;
}

export interface MessageAttachment {
  url: string;
  name: string;
  type: 'image' | 'document' | 'pdf' | 'file';
  size?: string;
  previewUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  text: string;
  time: string;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  deletedForUsers?: string[];
  attachment?: MessageAttachment;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'document' | 'pdf' | 'file';
  fileSize?: string;
  readBy?: string[];
  isRead?: boolean;
  createdAt?: string;
}

export interface ChatThread {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  itemId?: string | number;
  color?: string;
  preview: string;
  time: string;
  unreadCount: number;
  itemTitle: string;
  online: boolean;
  messages: Message[];
  otherUserId?: string;
  participants?: string[];
  deletedForUsers?: string[];
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  text: string;
  time: string;
  unread: boolean;
  userId?: string | number;
  user_id?: string | number;
  title?: string;
  message?: string;
  category?: string;
  type?: string;
  relatedId?: string;
  relatedItemId?: string;
  relatedUserId?: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
}

export interface Department {
  name: string;
  aliases: string[];
}

export interface DepartmentGroup {
  label: string;
  open: boolean;
  departments: Department[];
}

export interface AdminNotification {
  id: string | number;
  title: string;
  message: string;
  type: string;
  category: 'User' | 'Lost Items' | 'Found Items' | 'Claims' | 'Messages' | 'Security' | 'System';
  priority: 'low' | 'medium' | 'high';
  relatedUserId?: string | number;
  relatedItemId?: string | number;
  relatedConversationId?: string | number;
  isRead: boolean | number;
  createdAt: string;
}

export interface ConversationReport {
  reportId: string | number;
  conversationId: string | number;
  reportedBy: string | number;
  reportedByName?: string;
  reportedUser: string | number;
  reportedUserName?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  reviewedBy?: string | number;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AdminActivityLog {
  id?: string | number;
  logId?: string | number;
  adminId: string | number;
  adminName?: string;
  action: string;
  targetType?: string;
  targetId?: string | number;
  targetUserId?: string | number;
  targetUserName?: string;
  targetItemId?: string | number;
  ipAddress?: string;
  description?: string;
  category?: string;
  createdAt: string;
}

