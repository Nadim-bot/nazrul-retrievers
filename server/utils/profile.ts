/**
 * profile.ts - Redesign and fully implement the Profile Completion and Verified Profile Qualification Systems.
 */

import { DEPARTMENT_GROUPS } from '../../src/data';
import { getFallbackData } from '../db';

export function inferFacultyFromDepartment(department: string): string | null {
  if (!department || typeof department !== 'string') return null;
  const cleanDept = department.trim().toLowerCase();
  for (const group of DEPARTMENT_GROUPS) {
    for (const d of group.departments) {
      if (d.name.trim().toLowerCase() === cleanDept) return group.label;
      if (d.aliases && d.aliases.some(a => a.toLowerCase() === cleanDept || cleanDept.includes(a.toLowerCase()))) {
        return group.label;
      }
      const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
        ? `${d.name} (${d.aliases[0]})`
        : d.name;
      if (formatted.trim().toLowerCase() === cleanDept) return group.label;
    }
  }
  return null;
}

export function isValidFacultyDepartment(faculty: string, department: string): boolean {
  if (!faculty || !department) return false;
  const facultyGroup = DEPARTMENT_GROUPS.find(
    g => g.label.trim().toLowerCase() === faculty.trim().toLowerCase()
  );
  if (!facultyGroup) return false;
  return facultyGroup.departments.some(d => {
    if (d.name.trim().toLowerCase() === department.trim().toLowerCase()) return true;
    if (d.aliases && d.aliases.some(a => a.toLowerCase() === department.trim().toLowerCase() || department.toLowerCase().includes(a.toLowerCase()))) {
      return true;
    }
    const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
      ? `${d.name} (${d.aliases[0]})`
      : d.name;
    return formatted.trim().toLowerCase() === department.trim().toLowerCase();
  });
}

export function calculateProfileCompletion(user: any): {
  completion: number;
  checklist: { [key: string]: boolean };
  missingFields: string[];
} {
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

  const filledCount = fields.filter(f => f.value).length;
  const completion = Math.round((filledCount / fields.length) * 100);

  const missingFields = fields.filter(f => !f.value).map(f => f.label);

  return {
    completion,
    checklist,
    missingFields
  };
}

export function evaluateVerification(user: any, allUsers: any[] = []): {
  isVerified: boolean;
  verifiedAt: string | null;
  verificationSource: string | null;
  missingRequirements: string[];
} {
  const isEmailVerified = !!(user.emailVerified || user.email_verified);
  const hasPhoto = !!(user.avatar || user.profilePhoto || user.profile_photo || user.profileImage);
  const hasFirstName = !!(user.firstName || '').trim();
  const hasLastName = !!(user.lastName || '').trim();
  const hasPhone = !!(user.phone || '').trim();
  const hasFaculty = !!(user.faculty || '').trim();
  const hasDept = !!(user.department || '').trim();
  const hasSession = !!(user.academicSession || user.session_year || user.sessionYear || '').trim();
  const hasStudentId = !!(user.studentId || user.student_id || '').trim();

  // Profile completion from sync/calculated:
  const completion = user.profileCompleted || user.profileCompletion || 0;

  const missingRequirements: string[] = [];
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

  const isIdVerified = user.idVerificationStatus === 'verified' || user.isVerified === true || user.is_verified === true || user.verified === true;
  if (!isIdVerified) missingRequirements.push("Institutional Registration Number verified by administrator");

  const isStaff = user.role === 'admin' || user.role === 'moderator' || user.role === 'coordinator';
  const isVerified = isIdVerified && !isStaff;

  return {
    isVerified,
    verifiedAt: isVerified ? (user.verifiedAt || new Date().toISOString()) : null,
    verificationSource: isVerified ? (user.verificationSource || 'administrator') : null,
    missingRequirements
  };
}

/**
 * Synchronize the user fields between snake_case and camelCase, and calculate 
 * the profile completion progress and the verification status.
 */
export function syncAndEvaluateUser(user: any, allUsers: any[] = []): any {
  // Deep or flat copy to keep original untouched if desired
  const synced = { ...user };

  // Sync basic field aliases
  synced.firebaseUid = synced.firebaseUid || synced.id || '';
  synced.provider = synced.provider || (synced.password_hash ? 'email' : 'google');
  synced.firstName = synced.firstName || '';
  synced.lastName = synced.lastName || '';

  // Unified avatar handling with fallbacks
  const originalUser = allUsers.find(u => {
    if (!u) return false;
    const uId = String(u.id || u.user_id || u._id || u.firebaseUid || '');
    const sId = String(synced.id || synced.user_id || synced._id || synced.firebaseUid || '');
    if (sId && uId && sId === uId) return true;

    const uFb = String(u.firebaseUid || '');
    const sFb = String(synced.firebaseUid || '');
    if (sFb && uFb && sFb === uFb) return true;

    const uEmail = u.email ? String(u.email).trim().toLowerCase() : '';
    const sEmail = synced.email ? String(synced.email).trim().toLowerCase() : '';
    if (sEmail && uEmail && sEmail === uEmail) return true;

    return false;
  });
  const origPhoto = originalUser ? (originalUser.avatar || originalUser.profilePhoto || originalUser.profileImage || originalUser.profile_photo || '') : '';
  
  let finalAvatar = '';
  if (synced.avatar !== undefined && synced.avatar !== null && synced.avatar !== '') {
    finalAvatar = synced.avatar;
  } else if (synced.profilePhoto !== undefined && synced.profilePhoto !== null && synced.profilePhoto !== '') {
    finalAvatar = synced.profilePhoto;
  } else if (synced.profileImage !== undefined && synced.profileImage !== null && synced.profileImage !== '') {
    finalAvatar = synced.profileImage;
  } else if (synced.profile_photo !== undefined && synced.profile_photo !== null && synced.profile_photo !== '') {
    finalAvatar = synced.profile_photo;
  } else {
    // Preserve existing photo so it never disappears on refresh, logout, or re-login!
    finalAvatar = origPhoto;
  }

  synced.avatar = finalAvatar;
  synced.profileImage = finalAvatar;
  synced.profilePhoto = finalAvatar;
  synced.profile_photo = finalAvatar;

  // Preserve existing fields from originalUser if omitted in incoming update
  if (originalUser) {
    if (synced.phone === undefined && (originalUser.phone || originalUser.phoneNumber || originalUser.phone_number)) {
      synced.phone = originalUser.phone || originalUser.phoneNumber || originalUser.phone_number;
    }
    if (synced.faculty === undefined && originalUser.faculty) {
      synced.faculty = originalUser.faculty;
    }
    if (synced.department === undefined && originalUser.department) {
      synced.department = originalUser.department;
    }
    if (synced.academicSession === undefined && (originalUser.academicSession || originalUser.sessionYear || originalUser.session_year)) {
      synced.academicSession = originalUser.academicSession || originalUser.sessionYear || originalUser.session_year;
    }
    if (synced.studentId === undefined && (originalUser.studentId || originalUser.registrationNumber || originalUser.student_id)) {
      synced.studentId = originalUser.studentId || originalUser.registrationNumber || originalUser.student_id;
    }
    if (synced.gender === undefined && originalUser.gender) {
      synced.gender = originalUser.gender;
    }
    if (synced.dateOfBirth === undefined && originalUser.dateOfBirth) {
      synced.dateOfBirth = originalUser.dateOfBirth;
    }
    if (synced.address === undefined && originalUser.address) {
      synced.address = originalUser.address;
    }
    if (synced.emergencyContact === undefined && originalUser.emergencyContact) {
      synced.emergencyContact = originalUser.emergencyContact;
    }
    if (synced.emergencyContactName === undefined && originalUser.emergencyContactName) {
      synced.emergencyContactName = originalUser.emergencyContactName;
    }
    if (synced.bloodGroup === undefined && originalUser.bloodGroup) {
      synced.bloodGroup = originalUser.bloodGroup;
    }
    if ((synced.residentialHall === undefined || synced.residentialHall === '') && (originalUser.residentialHall || originalUser.residential_hall || originalUser.hall)) {
      synced.residentialHall = originalUser.residentialHall || originalUser.residential_hall || originalUser.hall;
    }
    if (synced.socialLink === undefined && (originalUser.socialLink || originalUser.facebook || originalUser.linkedin)) {
      synced.socialLink = originalUser.socialLink || originalUser.facebook || originalUser.linkedin;
    }
    if (synced.bio === undefined && originalUser.bio) {
      synced.bio = originalUser.bio;
    }
    const incomingRoll = (synced.classRoll !== undefined && synced.classRoll !== null && String(synced.classRoll).trim() !== '') 
      ? String(synced.classRoll).trim() 
      : ((synced.rollNumber !== undefined && synced.rollNumber !== null && String(synced.rollNumber).trim() !== '') 
        ? String(synced.rollNumber).trim() 
        : (synced.roll !== undefined && synced.roll !== null && String(synced.roll).trim() !== '' 
          ? String(synced.roll).trim() 
          : (synced.class_roll !== undefined && synced.class_roll !== null && String(synced.class_roll).trim() !== '' ? String(synced.class_roll).trim() : undefined)));
    if (incomingRoll === undefined && (originalUser.classRoll || originalUser.rollNumber || originalUser.roll || originalUser.class_roll)) {
      const origRoll = originalUser.classRoll || originalUser.rollNumber || originalUser.roll || originalUser.class_roll;
      synced.classRoll = origRoll;
      synced.rollNumber = origRoll;
      synced.roll = origRoll;
      synced.class_roll = origRoll;
    } else if (incomingRoll !== undefined) {
      synced.classRoll = incomingRoll;
      synced.rollNumber = incomingRoll;
      synced.roll = incomingRoll;
      synced.class_roll = incomingRoll;
    }
    if (synced.verificationDocument === undefined && originalUser.verificationDocument) {
      synced.verificationDocument = originalUser.verificationDocument;
    }
    if (synced.idVerificationStatus === undefined && originalUser.idVerificationStatus) {
      synced.idVerificationStatus = originalUser.idVerificationStatus;
    }
    if (synced.idVerificationRemarks === undefined && originalUser.idVerificationRemarks) {
      synced.idVerificationRemarks = originalUser.idVerificationRemarks;
    }
    if (synced.verified === undefined && originalUser.verified !== undefined) {
      synced.verified = originalUser.verified;
    }
    if (synced.isVerified === undefined && originalUser.isVerified !== undefined) {
      synced.isVerified = originalUser.isVerified;
    }
    if (synced.createdAt === undefined && (originalUser.createdAt || originalUser.created_at)) {
      synced.createdAt = originalUser.createdAt || originalUser.created_at;
    }
    if (synced.created_at === undefined && (originalUser.createdAt || originalUser.created_at)) {
      synced.created_at = originalUser.createdAt || originalUser.created_at;
    }
    if (synced.idVerificationSubmittedAt === undefined && originalUser.idVerificationSubmittedAt) {
      synced.idVerificationSubmittedAt = originalUser.idVerificationSubmittedAt;
    }
    if (synced.verifiedAt === undefined && originalUser.verifiedAt) {
      synced.verifiedAt = originalUser.verifiedAt;
    }
  }

  // Split fullName if firstName/lastName are empty
  if (synced.fullName && (!synced.firstName || !synced.lastName)) {
    const parts = synced.fullName.trim().split(/\s+/);
    if (parts.length > 0) {
      synced.firstName = synced.firstName || parts[0];
      if (parts.length > 1) {
        synced.lastName = synced.lastName || parts.slice(1).join(' ');
      }
    }
  } else if (!synced.fullName && (synced.firstName || synced.lastName)) {
    synced.fullName = `${synced.firstName} ${synced.lastName}`.trim();
  }

  synced.fullName = synced.fullName || synced.full_name || '';
  synced.full_name = synced.fullName;
  synced.email = synced.email || '';
  synced.passwordHash = synced.passwordHash || synced.password_hash || '';
  synced.password_hash = synced.passwordHash;

  const rawReg = (synced.studentId !== undefined && String(synced.studentId).trim() !== '')
    ? String(synced.studentId).trim()
    : (synced.student_id !== undefined && String(synced.student_id).trim() !== '')
    ? String(synced.student_id).trim()
    : (synced.registrationNumber !== undefined && String(synced.registrationNumber).trim() !== '')
    ? String(synced.registrationNumber).trim()
    : '';

  synced.studentId = rawReg;
  synced.registrationNumber = rawReg;
  synced.student_id = rawReg;

  synced.department = synced.department || '';
  synced.academicSession = synced.academicSession || synced.session_year || synced.sessionYear || '';
  synced.session_year = synced.academicSession;
  synced.sessionYear = synced.academicSession;
  
  synced.faculty = synced.faculty || '';
  if (synced.department) {
    for (const group of DEPARTMENT_GROUPS) {
      for (const d of group.departments) {
        const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
          ? `${d.name} (${d.aliases[0]})`
          : d.name;
        if (
          d.name.trim().toLowerCase() === synced.department.trim().toLowerCase() ||
          formatted.trim().toLowerCase() === synced.department.trim().toLowerCase() ||
          (d.aliases && d.aliases.some(a => a.toLowerCase() === synced.department.trim().toLowerCase()))
        ) {
          synced.department = d.name;
          if (!synced.faculty) {
            synced.faculty = group.label;
          }
          break;
        }
      }
    }
  }

  synced.semester = synced.semester || '';
  synced.phone = (synced.phone !== undefined && String(synced.phone).trim() !== '')
    ? String(synced.phone).trim()
    : (synced.phoneNumber !== undefined && String(synced.phoneNumber).trim() !== '')
    ? String(synced.phoneNumber).trim()
    : (synced.phone_number !== undefined && String(synced.phone_number).trim() !== '')
    ? String(synced.phone_number).trim()
    : '';
  synced.phoneNumber = synced.phone;
  synced.phone_number = synced.phone;

  const finalRoll = (synced.classRoll !== undefined && synced.classRoll !== null && String(synced.classRoll).trim() !== '')
    ? String(synced.classRoll).trim()
    : ((synced.rollNumber !== undefined && synced.rollNumber !== null && String(synced.rollNumber).trim() !== '')
      ? String(synced.rollNumber).trim()
      : ((synced.roll !== undefined && synced.roll !== null && String(synced.roll).trim() !== '')
        ? String(synced.roll).trim()
        : ((synced.class_roll !== undefined && synced.class_roll !== null && String(synced.class_roll).trim() !== '')
          ? String(synced.class_roll).trim()
          : '')));
  synced.classRoll = finalRoll;
  synced.rollNumber = finalRoll;
  synced.roll = finalRoll;
  synced.class_roll = finalRoll;
  synced.dateOfBirth = synced.dateOfBirth || '';
  synced.gender = synced.gender || '';
  synced.address = synced.address || '';
  synced.emergencyContact = synced.emergencyContact || '';
  synced.emergencyContactName = synced.emergencyContactName || '';
  synced.residentialHall = (synced.residentialHall !== undefined && synced.residentialHall !== null && String(synced.residentialHall).trim() !== '')
    ? String(synced.residentialHall).trim()
    : (synced.residential_hall !== undefined && synced.residential_hall !== null && String(synced.residential_hall).trim() !== '')
    ? String(synced.residential_hall).trim()
    : (synced.hall !== undefined && synced.hall !== null && String(synced.hall).trim() !== '')
    ? String(synced.hall).trim()
    : '';
  synced.residential_hall = synced.residentialHall;
  synced.hall = synced.residentialHall;

  // Synchronize facebook & linkedin from socialLink if available
  synced.facebook = synced.facebook || '';
  synced.linkedin = synced.linkedin || '';
  if (synced.socialLink && !synced.facebook && !synced.linkedin) {
    if (synced.socialLink.includes('linkedin.com')) {
      synced.linkedin = synced.socialLink;
    } else if (synced.socialLink.includes('facebook.com')) {
      synced.facebook = synced.socialLink;
    } else {
      synced.facebook = synced.socialLink;
    }
  }
  synced.socialLink = synced.facebook || synced.linkedin || synced.socialLink || '';

  synced.bio = synced.bio || '';
  synced.role = synced.role || 'student';
  
  const isStaffRole = synced.role === 'admin' || synced.role === 'moderator' || synced.role === 'coordinator';

  if (isStaffRole) {
    synced.status = synced.status && synced.status !== 'Pending' ? synced.status : 'Active';
    synced.accountStatus = synced.accountStatus && synced.accountStatus !== 'Pending' ? synced.accountStatus : 'Active';
    synced.emailVerified = true;
    synced.email_verified = true;
    synced.registrationCompleted = true;
    synced.verificationCode = null;
    synced.verificationCodeExpires = null;
  } else {
    synced.status = synced.status || 'Pending';
    synced.accountStatus = synced.accountStatus || synced.status;
    // Ensure consistency between both status fields
    if (synced.status !== synced.accountStatus) {
      synced.accountStatus = synced.status;
    }

    synced.verificationCode = (user.verificationCode !== undefined && user.verificationCode !== null)
      ? String(user.verificationCode).trim()
      : (originalUser && originalUser.verificationCode ? String(originalUser.verificationCode).trim() : null);

    synced.verificationCodeExpires = user.verificationCodeExpires || user.verificationExpiresAt || user.verificationExpires || (originalUser ? originalUser.verificationCodeExpires || originalUser.verificationExpiresAt || originalUser.verificationExpires : null);
  }
  synced.verificationExpires = synced.verificationCodeExpires;
  synced.verificationExpiresAt = synced.verificationCodeExpires;
  
  synced.otpAttempts = synced.otpAttempts !== undefined ? Number(synced.otpAttempts) : (originalUser && originalUser.otpAttempts !== undefined ? Number(originalUser.otpAttempts) : 0);
  synced.lastOtpSentAt = synced.lastOtpSentAt || user.verificationSentAt || (originalUser ? originalUser.lastOtpSentAt || originalUser.verificationSentAt : null);
  
  synced.verificationSentAt = user.verificationSentAt || synced.lastOtpSentAt || (originalUser ? originalUser.verificationSentAt || originalUser.lastOtpSentAt : null);
  synced.verificationAttempts = synced.verificationAttempts !== undefined ? Number(synced.verificationAttempts) : (originalUser && originalUser.verificationAttempts !== undefined ? Number(originalUser.verificationAttempts) : 0);
  synced.registrationCompleted = synced.registrationCompleted !== undefined ? !!synced.registrationCompleted : (originalUser ? !!originalUser.registrationCompleted : (synced.emailVerified || false));
  
  synced.emailVerified = synced.emailVerified !== undefined ? !!synced.emailVerified : (synced.is_verified !== undefined ? !!synced.is_verified : (originalUser ? !!(originalUser.emailVerified || originalUser.email_verified) : false));
  
  // Sync institutional ID verification fields
  let resolvedIdStatus: string = user.idVerificationStatus || '';
  if (!resolvedIdStatus || resolvedIdStatus === 'unverified') {
    if (originalUser && originalUser.idVerificationStatus && originalUser.idVerificationStatus !== 'unverified') {
      resolvedIdStatus = originalUser.idVerificationStatus;
    } else if (originalUser && (originalUser.isVerified === true || originalUser.is_verified === true || originalUser.verified === true)) {
      resolvedIdStatus = 'verified';
    } else if (user.isVerified === true || user.is_verified === true || user.verified === true) {
      resolvedIdStatus = 'verified';
    }
  }

  const resolvedDoc = (user.verificationDocument !== undefined && user.verificationDocument !== null && String(user.verificationDocument).trim() !== '')
    ? String(user.verificationDocument).trim()
    : (originalUser && originalUser.verificationDocument ? String(originalUser.verificationDocument).trim() : '');

  if ((!resolvedIdStatus || resolvedIdStatus === 'unverified') && resolvedDoc) {
    resolvedIdStatus = 'pending';
  }
  if (!resolvedIdStatus) {
    resolvedIdStatus = 'unverified';
  }

  const resolvedRemarks = (user.idVerificationRemarks !== undefined && user.idVerificationRemarks !== null)
    ? String(user.idVerificationRemarks)
    : (originalUser && originalUser.idVerificationRemarks ? String(originalUser.idVerificationRemarks) : '');

  const resolvedSubmittedAt = user.idVerificationSubmittedAt || (originalUser ? originalUser.idVerificationSubmittedAt : null) || (resolvedDoc ? new Date().toISOString() : null);

  const isApprovedVerified = resolvedIdStatus === 'verified';
  const resolvedVerifiedAt = isApprovedVerified
    ? (user.verifiedAt || (originalUser ? originalUser.verifiedAt : null) || new Date().toISOString())
    : null;
  const resolvedVerificationSource = isApprovedVerified
    ? (user.verificationSource || (originalUser ? originalUser.verificationSource : null) || 'administrator')
    : null;

  synced.idVerificationStatus = resolvedIdStatus;
  synced.verificationDocument = resolvedDoc;
  synced.idVerificationRemarks = resolvedRemarks;
  synced.idVerificationSubmittedAt = resolvedSubmittedAt;
  synced.verified = isApprovedVerified && !isStaffRole;
  synced.isVerified = isApprovedVerified && !isStaffRole;
  synced.is_verified = isApprovedVerified && !isStaffRole;
  synced.verifiedAt = resolvedVerifiedAt;
  synced.verificationSource = resolvedVerificationSource;
  
  // Calculate completion
  const completionStats = calculateProfileCompletion(synced);
  synced.profileCompleted = completionStats.completion;
  synced.profileCompletion = completionStats.completion;

  // Evaluate verification
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
  synced.verifiedAt = synced.verified ? (synced.verifiedAt || verificationStats.verifiedAt || new Date().toISOString()) : null;
  synced.verificationSource = synced.verified ? (synced.verificationSource || verificationStats.verificationSource || 'administrator') : null;

  // Extra audit/reputation defaults
  synced.profileVisibility = user.profileVisibility || (originalUser ? originalUser.profileVisibility : undefined) || synced.profileVisibility || 'public';
  synced.hidePhone = user.hidePhone !== undefined ? !!user.hidePhone : (originalUser && originalUser.hidePhone !== undefined ? !!originalUser.hidePhone : (synced.profileVisibility === 'private'));
  synced.isPhonePrivate = synced.hidePhone;
  synced.notificationSettings = user.notificationSettings || (originalUser ? originalUser.notificationSettings : undefined) || synced.notificationSettings || { sound: true, matchAlerts: true, activityBadges: true, showAcademicBadge: true };
  if (synced.notificationSettings.matchAlerts === undefined) {
    synced.notificationSettings.matchAlerts = true;
  }
  synced.accountSettings = user.accountSettings || (originalUser ? originalUser.accountSettings : undefined) || synced.accountSettings || { preferredContactMethod: 'chat', autoFillDetails: true };
  synced.preferredContactMethod = user.preferredContactMethod || (originalUser ? originalUser.preferredContactMethod : undefined) || synced.accountSettings.preferredContactMethod || 'chat';
  synced.language = user.language || (originalUser ? originalUser.language : undefined) || synced.language || 'EN';
  synced.theme = user.theme || (originalUser ? originalUser.theme : undefined) || synced.theme || 'light';
  synced.reputationScore = synced.reputationScore !== undefined ? Number(synced.reputationScore) : 100;

  // Dynamically compute post metrics from fallbackStore/MongoDB mirrored items list
  let computedLost = 0;
  let computedFound = 0;
  let computedReturns = 0;

  const uId = String(synced.id || synced.user_id || synced._id || synced.firebaseUid || '');
  if (uId) {
    try {
      const { store } = getFallbackData();
      if (store && store.items) {
        const userItems = store.items.filter((i: any) => {
          const itemUserId = String(i.userId || i.ownerUid || i.firebaseUid || (i.postedBy && i.postedBy.userId) || '');
          return itemUserId === uId && !i.isDeleted;
        });
        computedLost = userItems.filter((i: any) => i.type === 'lost').length;
        computedFound = userItems.filter((i: any) => i.type === 'found').length;
        computedReturns = userItems.filter((i: any) => i.status === 'returned').length;
      }
    } catch (err) {
      console.warn('Error fetching fallbackStore items for profile sync:', err);
    }
  }

  synced.totalLostPosts = computedLost;
  synced.totalFoundPosts = computedFound;
  synced.successfulReturns = computedReturns;

  // Mutate source user so references are permanently updated in fallbackStore in-memory
  if (user) {
    user.totalLostPosts = computedLost;
    user.totalFoundPosts = computedFound;
    user.successfulReturns = computedReturns;
  }
  synced.createdAt = synced.createdAt || synced.created_at || (originalUser ? (originalUser.createdAt || originalUser.created_at) : null) || new Date().toISOString();
  synced.created_at = synced.createdAt;
  synced.updatedAt = new Date().toISOString();
  synced.updated_at = synced.updatedAt;
  synced.lastLogin = synced.lastLogin || synced.last_login || null;
  synced.refreshToken = synced.refreshToken || '';

  return synced;
}
