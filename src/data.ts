import { DepartmentGroup, Item, ChatThread, NotificationItem } from './types';

export const DEPARTMENT_GROUPS: DepartmentGroup[] = [
  {
    label: 'Faculty of Science and Engineering',
    open: true,
    departments: [
      { name: 'Computer Science and Engineering', aliases: ['CSE', 'Computer', 'Computer Science'] },
      { name: 'Electrical and Electronic Engineering', aliases: ['EEE', 'Electrical', 'Electrical Engineering'] },
      { name: 'Environmental Science and Engineering', aliases: ['ESE', 'Environmental', 'Environmental Science'] },
      { name: 'Statistics', aliases: ['STAT', 'Stats'] }
    ]
  },
  {
    label: 'Faculty of Business Administration',
    open: false,
    departments: [
      { name: 'Accounting and Information Systems', aliases: ['AIS', 'Accounting', 'Information Systems'] },
      { name: 'Finance and Banking', aliases: ['FNB', 'Finance', 'Banking'] },
      { name: 'Human Resource Management', aliases: ['HRM', 'Human Resource', 'HR'] },
      { name: 'Management', aliases: ['Mgmt', 'Management Studies'] },
      { name: 'Marketing', aliases: ['MKT', 'Market'] }
    ]
  },
  {
    label: 'Faculty of Social Science',
    open: false,
    departments: [
      { name: 'Economics', aliases: ['Econ', 'Economics'] },
      { name: 'Public Administration and Governance Studies', aliases: ['PAGS', 'Public Administration', 'Governance'] },
      { name: 'Folklore', aliases: ['Folk', 'Folklore'] },
      { name: 'Anthropology', aliases: ['Anthro', 'Anthropology'] },
      { name: 'Population Science', aliases: ['Pop Science', 'Population'] },
      { name: 'Local Government and Urban Development', aliases: ['LGUD', 'Local Government', 'Urban Development'] },
      { name: 'Sociology', aliases: ['Socio', 'Sociology'] }
    ]
  },
  {
    label: 'Faculty of Arts',
    open: false,
    departments: [
      { name: 'Bangla Language and Literature', aliases: ['Bangla', 'BLL'] },
      { name: 'English Language and Literature', aliases: ['English', 'ELL'] },
      { name: 'Music', aliases: ['Music'] },
      { name: 'Theatre and Performance Studies', aliases: ['TPS', 'Theatre', 'Performance'] },
      { name: 'Film and Media Studies', aliases: ['FMS', 'Film', 'Media'] },
      { name: 'Philosophy', aliases: ['Phil', 'Philosophy'] },
      { name: 'History', aliases: ['Hist', 'History'] }
    ]
  },
  {
    label: 'Faculty of Law',
    open: false,
    departments: [
      { name: 'Law and Justice', aliases: ['Law'] }
    ]
  },
  {
    label: 'Faculty of Fine Arts',
    open: false,
    departments: [
      { name: 'Fine Arts', aliases: ['Arts', 'Fine Arts'] }
    ]
  }
];

export const ALLOWED_DEPARTMENTS = DEPARTMENT_GROUPS.flatMap(group => group.departments.map(d => d.name));

export const INITIAL_ITEMS: Item[] = [];

export const INITIAL_THREADS: ChatThread[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export interface CategoryConfig {
  name: string;
  subcategories: string[];
}

export const CATEGORY_STRUCTURE: CategoryConfig[] = [
  {
    name: 'Electronics',
    subcategories: [
      'Mobile Phone',
      'Laptop',
      'Tablet',
      'Smart Watch',
      'Calculator',
      'Power Bank',
      'Charger',
      'Earphones / Headphones',
      'USB Drive',
      'Hard Disk'
    ]
  },
  {
    name: 'Bags & Luggage',
    subcategories: ['Backpack', 'Handbag', 'Travel Bag', 'Laptop Bag', 'Wallet', 'Purse']
  },
  {
    name: 'Documents & ID Cards',
    subcategories: [
      'University ID Card',
      'Registration Card',
      'Admit Card',
      'Library Card',
      'NID',
      'Passport',
      'Driving License',
      'Birth Certificate',
      'Certificates',
      'Important Documents'
    ]
  },
  {
    name: 'Keys & Access Cards',
    subcategories: ['Room Key', 'Bike Key', 'Car Key', 'Office Key', 'Locker Key', 'Access Card']
  },
  {
    name: 'Books & Stationery',
    subcategories: ['Books', 'Notebook', 'File', 'Assignment', 'Pen', 'Pencil Box', 'Scientific Calculator']
  },
  {
    name: 'Clothing & Wearables',
    subcategories: ['Jacket', 'Shirt', 'T-shirt', 'Shoes', 'Sandals', 'Cap', 'Umbrella', 'Glasses']
  },
  {
    name: 'Accessories',
    subcategories: ['Watch', 'Ring', 'Necklace', 'Bracelet', 'Belt', 'Sunglasses']
  },
  {
    name: 'Academic Items',
    subcategories: ['Thesis', 'Lab Report', 'Project File', 'Drawing Sheet', 'Practical Copy', 'Academic Folder']
  },
  {
    name: 'Sports Equipment',
    subcategories: ['Football', 'Cricket Bat', 'Badminton Racket', 'Jersey', 'Football Boots', 'Sports Bag']
  },
  {
    name: 'Money & Valuables',
    subcategories: ['Cash', 'ATM Card', 'Credit Card', 'Debit Card', 'Gift Card', 'Cheque Book']
  },
  {
    name: 'Vehicles & Transport',
    subcategories: ['Bicycle', 'Motorcycle Helmet', 'Bicycle Lock', 'Bike Accessories']
  },
  {
    name: 'Personal Items',
    subcategories: ['Water Bottle', 'Lunch Box', 'Cosmetic Bag', 'Medicine', 'Prayer Mat', 'Miscellaneous Personal Items']
  },
  {
    name: 'Other',
    subcategories: ['Other']
  }
];

export const CATEGORIES = CATEGORY_STRUCTURE.map(c => c.name);

export function mapOldCategory(oldCategory: string, oldSubcategory?: string): { category: string; subcategory: string } {
  const norm = (oldCategory || '').trim().toLowerCase();
  
  let mappedCategory = 'Other';
  let mappedSubcategory = 'Other';

  if (norm === 'electronics') {
    mappedCategory = 'Electronics';
  } else if (norm === 'bags & luggage' || norm === 'bags' || norm === 'luggage') {
    mappedCategory = 'Bags & Luggage';
  } else if (norm === 'documents & id cards' || norm === 'documents' || norm === 'id cards') {
    mappedCategory = 'Documents & ID Cards';
  } else if (norm === 'accessories') {
    mappedCategory = 'Accessories';
  } else if (norm === 'clothing' || norm === 'clothing & wearables') {
    mappedCategory = 'Clothing & Wearables';
  } else if (norm === 'books & stationery' || norm === 'books' || norm === 'stationery') {
    mappedCategory = 'Books & Stationery';
  } else if (norm === 'keys & cards' || norm === 'keys & access cards' || norm === 'keys') {
    mappedCategory = 'Keys & Access Cards';
  } else if (norm === 'sports equipment' || norm === 'sports') {
    mappedCategory = 'Sports Equipment';
  } else if (norm === 'academic items') {
    mappedCategory = 'Academic Items';
  } else if (norm === 'money & valuables') {
    mappedCategory = 'Money & Valuables';
  } else if (norm === 'vehicles & transport') {
    mappedCategory = 'Vehicles & Transport';
  } else if (norm === 'personal items') {
    mappedCategory = 'Personal Items';
  } else {
    mappedCategory = 'Other';
  }

  // Find corresponding config
  const targetCategoryConfig = CATEGORY_STRUCTURE.find(c => c.name.toLowerCase() === mappedCategory.toLowerCase());
  if (targetCategoryConfig) {
    if (oldSubcategory) {
      const match = targetCategoryConfig.subcategories.find(sub => sub.toLowerCase() === oldSubcategory.trim().toLowerCase());
      if (match) {
        mappedSubcategory = match;
      } else {
        // Fallback to match close ones or first subcategory
        mappedSubcategory = targetCategoryConfig.subcategories[0] || 'Other';
      }
    } else {
      mappedSubcategory = targetCategoryConfig.subcategories[0] || 'Other';
    }
  }

  return { category: mappedCategory, subcategory: mappedSubcategory };
}

export const LOCATIONS = [
  'Central Library',
  'Old Science Building',
  'New Science Building',
  'Science Lab',
  'Old Administration Building',
  'New Administration Building',
  'Old Kola Bhaban',
  'New Kola Bhaban',
  'BBA Building',
  'Social Science Building',
  'Agnibina Hall',
  'Bidrohi Hall',
  'Shiulimala Hall',
  'Dhulonchapa Hall',
  'Main Canteen',
  'TSC',
  'Chondrobindo Café',
  'Singhara House',
  'Chokrobak',
  'Central Mosque',
  'Medical Center',
  'Bottola',
  'Bethar Dhan',
  'Nazrul Bhaskorjo',
  'Joy Bangla Bhaskorjo',
  '1st Gate',
  '2nd Gate',
  'Sports Ground',
  'Parking Area',
  'Block A',
  'Block B',
  'Block C',
  'Other'
];
