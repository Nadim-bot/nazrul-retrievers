import { z } from 'zod';
import { DEPARTMENT_GROUPS, CATEGORY_STRUCTURE } from '../data';

// Helper to sanitize text and prevent HTML / XSS injection
export function sanitizeInput(val: string): string {
  if (typeof val !== 'string') return val;
  // Replace standard HTML brackets and strip script tags
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Strip all HTML tags
    .trim();
}

// 1. Name Schema & Validator
export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters.')
  .max(50, 'Name cannot exceed 50 characters.')
  .regex(/^[a-zA-Z\s\-]+$/, 'Name can only contain letters, spaces, and hyphens.');

export function validateName(name: string): string | null {
  const result = nameSchema.safeParse(name);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// 2. Email Schema & Validator
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailSchema = z.string()
  .min(5, 'Email is too short.')
  .max(100, 'Email is too long.')
  .regex(STRICT_EMAIL_REGEX, 'Invalid email address format.');

export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return 'Email address is required.';
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length < 5) {
    return 'Invalid email address format.';
  }
  if (trimmedEmail.length > 100) {
    return 'Email is too long (maximum 100 characters).';
  }

  if (!STRICT_EMAIL_REGEX.test(trimmedEmail)) {
    return 'Invalid email address format. Please enter a valid email address (e.g. name@gmail.com).';
  }

  const lowerEmail = trimmedEmail.toLowerCase();
  const parts = lowerEmail.split('@');
  if (parts.length !== 2) {
    return 'Invalid email address format.';
  }

  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return 'Invalid email address format.';
  }

  // Typos mapping check first to provide friendly suggestions
  const typos: Record<string, string> = {
    'gamil.com': 'gmail.com',
    'gamil.co': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmael.com': 'gmail.com',
    'gamil.net': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmali.com': 'gmail.com',
    'gamil.org': 'gmail.com',
    'gmaail.com': 'gmail.com',
    'gmaail.co': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gmaill.co': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmial.co': 'gmail.com',
    'gmil.com': 'gmail.com',
    'gml.com': 'gmail.com',
    'gmaul.com': 'gmail.com',
    'gmeil.com': 'gmail.com',
    'gmall.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yhoo.com': 'yahoo.com',
    'hotml.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
  };

  if (typos[domain]) {
    return `Common email typo detected: "${domain}". Did you mean "${typos[domain]}"? Please enter a valid gmail.com or institutional edu mail.`;
  }

  // Strict domain validation: Gmail (gmail.com) and Institutional Edu emails (.edu or .edu.bd)
  const isGmail = domain === 'gmail.com';
  const isEdu = domain.endsWith('.edu') || domain.endsWith('.edu.bd');

  if (!isGmail && !isEdu) {
    return 'Only Gmail (gmail.com) and university edu email addresses (.edu, .edu.bd) are allowed.';
  }

  return null;
}

// 3. Password Schema & Validator
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter.')
  .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter.')
  .refine((val) => /\d/.test(val), 'Password must contain at least one number.')
  .refine((val) => /[^A-Za-z0-9]/.test(val), 'Password must contain at least one special character.');

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// 4. Phone Schema & Validator
export const phoneSchema = z.string()
  .regex(/^(?:\+88)?01[3-9]\d{8}$/, 'Invalid Bangladesh phone number. Format should be 01XXXXXXXXX or +8801XXXXXXXXX.');

export function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-]/g, ''); // Allow spaces and hyphens in UI, but clean them
  const result = phoneSchema.safeParse(cleaned);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// 5. Academic Session Schema & Validator
export const sessionSchema = z.string()
  .regex(/^(\d{2,4})-(\d{2})$/, 'Academic session must match format (e.g., 2020-21 or 20-21).');

export function validateSession(session: string): string | null {
  const result = sessionSchema.safeParse(session);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// 6. Registration Number Validator
export function validateRegistrationNumber(registrationNumber: string): string | null {
  if (!registrationNumber || registrationNumber.trim() === '') {
    return 'Registration Number is required.';
  }
  const digits = registrationNumber.replace(/\D/g, '');
  if (digits.length !== registrationNumber.trim().length) {
    return 'Registration Number must contain only numeric digits.';
  }
  if (digits.length !== 5) {
    return 'Registration Number must be exactly 5 digits.';
  }
  return null;
}

// 6b. Academic Session End-Year Helper
export function getSessionEndYear(sessionYear?: string | null): string | null {
  if (!sessionYear || typeof sessionYear !== 'string') return null;
  const clean = sessionYear.trim();
  const match = clean.match(/^(\d{2,4})-(\d{2,4})$/);
  if (match) {
    return match[2].slice(-2);
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.slice(-2);
  }
  return null;
}

// 6c. Student Roll Number Validator (8 Digits: 2 Digits Session Year + 6 Digits)
export function validateRollNumber(rollNumber: string, sessionYear?: string | null): string | null {
  if (!rollNumber || typeof rollNumber !== 'string' || rollNumber.trim() === '') {
    return null;
  }

  const trimmed = rollNumber.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length !== trimmed.length) {
    return 'Roll Number must contain only numeric digits.';
  }

  const sessionEndYear = sessionYear ? getSessionEndYear(sessionYear) : null;

  if (digits.length !== 8) {
    const exampleFormat = sessionEndYear ? `${sessionEndYear}XXXXXX` : '23XXXXXX';
    return `Roll Number must be exactly 8 digits (e.g., ${exampleFormat}). You entered ${digits.length} digits.`;
  }

  if (sessionEndYear) {
    const rollPrefix = digits.slice(0, 2);
    if (rollPrefix !== sessionEndYear) {
      return `First 2 digits of Roll Number (${rollPrefix}) must match the selected session end year (${sessionEndYear}). For session "${sessionYear}", Roll Number must start with "${sessionEndYear}" (e.g. ${sessionEndYear}123456).`;
    }
  }

  return null;
}

// 7. Faculty and Department Validator
export function validateFacultyAndDepartment(faculty: string, department: string): string | null {
  if (!faculty && !department) return null;
  if (faculty && !department) return 'Department is required when Faculty is specified.';
  if (!faculty && department) return 'Faculty is required when Department is specified.';

  const group = DEPARTMENT_GROUPS.find(g => g.label === faculty);
  if (!group) {
    return 'The selected Faculty is invalid.';
  }

  const hasDept = group.departments.some(d => {
    if (d.name === department) return true;
    const formatted = d.aliases && d.aliases.length > 0 && d.aliases[0].length <= 5
      ? `${d.name} (${d.aliases[0]})`
      : d.name;
    return formatted === department;
  });
  if (!hasDept) {
    return `The Department "${department}" is not a valid department within "${faculty}".`;
  }

  return null;
}

// 8. General Item Post Validator (Lost/Found Item Listings)
export const itemPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100, 'Title cannot exceed 100 characters.'),
  location: z.string().min(2, 'Location is required.').max(100, 'Location is too long.'),
  category: z.string().min(2, 'Category is required.').max(50, 'Category is too long.'),
  subcategory: z.string().min(2, 'Subcategory is required.').max(50, 'Subcategory is too long.').optional().nullable(),
  type: z.string().refine((val) => val === 'lost' || val === 'found', { message: 'Listing type must be lost or found.' }),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000, 'Description cannot exceed 2000 characters.'),
  specificSpot: z.string().max(200, 'Specific spot description cannot exceed 200 characters.').optional().nullable()
});

export function validateItemPost(data: {
  title: string;
  location: string;
  category: string;
  subcategory?: string | null;
  type: string;
  description: string;
  specificSpot?: string | null;
}): string | null {
  const result = itemPostSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0].message;
  }

  const foundCat = CATEGORY_STRUCTURE.find(c => c.name.toLowerCase() === data.category.toLowerCase());
  if (!foundCat) {
    return `Invalid category: "${data.category}".`;
  }

  if (data.subcategory) {
    const foundSub = foundCat.subcategories.find(s => s.toLowerCase() === data.subcategory!.toLowerCase());
    if (!foundSub) {
      return `Invalid subcategory: "${data.subcategory}" for category "${data.category}".`;
    }
  }

  return null;
}

// 9. Claim Form Validator
export const claimSchema = z.object({
  proofDescription: z.string().min(15, 'Proof description must contain at least 15 characters detailing your ownership.').max(2000, 'Proof description is too long.'),
  contactDetails: z.string().min(5, 'Please provide valid contact details (phone or email) of at least 5 characters.').max(500, 'Contact details are too long.')
});

export function validateClaim(data: { proofDescription: string; contactDetails: string }): string | null {
  const result = claimSchema.safeParse(data);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}

// 10. Support Contact Form Validator
export const supportContactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: z.string().min(10, 'Your support request message must be at least 10 characters.').max(1500, 'Support message is too long.')
});

export function validateSupportContact(data: { name: string; email: string; message: string }): string | null {
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

// 11. Chat Message Validator
export const messageSchema = z.string()
  .min(1, 'Message cannot be empty.')
  .max(1000, 'Message cannot exceed 1000 characters.');

export function validateMessage(message: string): string | null {
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    return result.error.issues[0].message;
  }
  return null;
}
