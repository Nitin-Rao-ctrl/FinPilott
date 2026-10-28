import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Filter,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { Reveal } from "@/lib/animations";
import { supabase } from "@/lib/supabase";
import {
  MonthSelector,
  type SelectedPeriod,
} from '@/components/MonthSelector';

/* ============================================================
   API
============================================================ */

const API_BASE =
  "https://finpilot-backend-23iz.onrender.com/api";

/* ============================================================
   TYPES
============================================================ */

type TransactionType = "income" | "expense";
type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

type Transaction = {
  id?: string;
  _id?: string;
  userId?: string;

  type: TransactionType;

  amount: number;

  // Original currency used when entering this transaction.
  currency?: CurrencyCode;

  category: string;

  expenseType?: "fixed" | "variable";
  isFixed?: boolean;

  description: string;

  merchant?: string;

  date: string;
};

/* ============================================================
   AUTH
============================================================ */

async function getUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("User is not logged in");
  }

  return user.id;
}

/* ============================================================
   CATEGORIES
============================================================ */

const CATEGORIES = [
  "Food",
  "Groceries",
  "Dining Out",
  "Tea & Coffee",
  "Snacks & Sweets",
  "Milk & Dairy",
  "Fruits & Vegetables",
  "Meat & Seafood",
  "Bakery",
  "Water & Drinking",
  "Household Supplies",
  "Home Maintenance",
  "Rent",
  "EMI",
  "Loan Payment",
  "Mess",
  "Hostel",
  "PG",
  "Maintenance",
  "Electricity",
  "Water Bill",
  "Gas & LPG",
  "Internet & Broadband",
  "Mobile & Recharge",
  "DTH & Cable",
  "Subscription",
  "Fuel",
  "Metro",
  "Bus",
  "Auto & Rickshaw",
  "Cab & Ride Hailing",
  "Train",
  "Flight",
  "Parking",
  "Toll",
  "Vehicle Maintenance",
  "Vehicle Insurance",
  "Personal Care",
  "Salon & Barber",
  "Clothing",
  "Footwear",
  "Jewellery",
  "Fitness & Gym",
  "Baby & Childcare",
  "School Fees",
  "Family Support",
  "Pet Care",
  "Medical",
  "Medicine",
  "Doctor & Clinic",
  "Dental",
  "Diagnostics",
  "Health Insurance",
  "Wellness",
  "Education",
  "Books & Stationery",
  "Coaching & Tuition",
  "Online Courses",
  "Professional Development",
  "Office & Work",
  "Shopping",
  "Electronics",
  "Mobile & Gadgets",
  "Home & Furniture",
  "Appliances",
  "Beauty & Cosmetics",
  "Entertainment",
  "Movies & Cinema",
  "Gaming",
  "Sports",
  "Hobbies",
  "Events & Concerts",
  "Travel",
  "Hotels & Stays",
  "Vacation",
  "Religious Travel",
  "Gifts",
  "Festivals & Celebrations",
  "Wedding & Functions",
  "Donations & Charity",
  "Religious & Pooja",
  "Bank Charges",
  "Credit Card Payment",
  "Insurance",
  "Investment",
  "Mutual Funds",
  "Stocks",
  "Gold & Jewellery Investment",
  "Salary",
  "Freelance",
  "Business",
  "Commission",
  "Bonus",
  "Interest Income",
  "Dividend",
  "Gift Received",
  "Cashback",
  "Refund",
  "Reimbursement",
  "Other",
];

/* ============================================================
   CATEGORY RULES
============================================================ */

const CATEGORY_RULES: Record<string, string[]> = {
  "Food": [
    "zomato",
    "swiggy",
    "restaurant",
    "dhaba",
    "food",
    "meal",
    "lunch",
    "dinner",
    "breakfast",
    "takeaway",
    "delivery",
    "biryani",
    "thali",
    "pizza",
    "burger",
    "dominos",
    "mcdonalds",
    "kfc",
    "haldirams",
    "barbeque",
    "bbq",
    "canteen",
  ],
  "Groceries": [
    "blinkit",
    "zepto",
    "instamart",
    "bigbasket",
    "dmart",
    "reliance smart",
    "more supermarket",
    "spencers",
    "jiomart",
    "grocery",
    "groceries",
    "supermarket",
    "kirana",
    "ration",
    "general store",
  ],
  "Dining Out": [
    "restaurant",
    "dine",
    "dining",
    "swiggy",
    "zomato",
    "eatsure",
    "eatclub",
    "buffet",
  ],
  "Tea & Coffee": [
    "chai",
    "tea",
    "coffee",
    "starbucks",
    "costa",
    "chaayos",
    "chaipoint",
    "cafe coffee day",
    "ccd",
  ],
  "Snacks & Sweets": [
    "snack",
    "chips",
    "namkeen",
    "biscuit",
    "chocolate",
    "ice cream",
    "mithai",
    "sweets",
    "haldiram",
    "bikanervala",
    "amul",
  ],
  "Milk & Dairy": [
    "milk",
    "dairy",
    "curd",
    "dahi",
    "paneer",
    "ghee",
    "amul",
    "mother dairy",
  ],
  "Fruits & Vegetables": [
    "fruit",
    "fruits",
    "vegetable",
    "sabzi",
    "sabji",
    "matar",
    "tomato",
    "potato",
    "onion",
  ],
  "Meat & Seafood": [
    "chicken",
    "mutton",
    "fish",
    "seafood",
    "meat",
    "eggs",
    "egg",
  ],
  "Bakery": [
    "bakery",
    "cake",
    "cakes",
    "bread",
    "pastry",
    "bake",
  ],
  "Water & Drinking": [
    "water",
    "bisleri",
    "aquafina",
    "kinley",
    "mineral water",
  ],
  "Household Supplies": [
    "household",
    "cleaning",
    "detergent",
    "surf",
    "harpic",
    "vim",
    "phenyl",
    "tissue",
    "toilet cleaner",
    "laundry",
  ],
  "Home Maintenance": [
    "plumber",
    "electrician",
    "carpenter",
    "repair",
    "maintenance",
    "home repair",
  ],
  "Rent": [
    "rent",
    "house rent",
    "room rent",
    "flat rent",
    "landlord",
    "housing",
  ],
  "EMI": [
    "emi",
    "equated monthly installment",
    "loan emi",
  ],
  "Loan Payment": [
    "loan payment",
    "loan repayment",
    "repayment",
    "personal loan",
    "education loan",
    "home loan",
  ],
  "Mess": [
    "mess fee",
    "mess fees",
    "mess charges",
    "mess",
  ],
  "Hostel": [
    "hostel",
    "hostel fee",
    "hostel fees",
  ],
  "PG": [
    "pg rent",
    "pg",
    "paying guest",
  ],
  "Maintenance": [
    "society maintenance",
    "maintenance fee",
    "maintenance charges",
    "apartment maintenance",
  ],
  "Electricity": [
    "electricity",
    "electric bill",
    "bescom",
    "tata power",
    "adani electricity",
    "torrent power",
  ],
  "Water Bill": [
    "water bill",
    "jal board",
    "water charges",
  ],
  "Gas & LPG": [
    "lpg",
    "gas cylinder",
    "gas bill",
    "indane",
    "bharatgas",
    "hp gas",
  ],
  "Internet & Broadband": [
    "internet",
    "wifi",
    "broadband",
    "jiofiber",
    "airtel xstream",
    "act fibernet",
    "excitel",
    "hathway",
  ],
  "Mobile & Recharge": [
    "recharge",
    "mobile recharge",
    "prepaid",
    "postpaid",
    "airtel",
    "jio",
    "vi",
    "vodafone idea",
    "bsnl",
    "mobile bill",
  ],
  "DTH & Cable": [
    "dth",
    "tata play",
    "tataplay",
    "dish tv",
    "dishtv",
    "airtel digital tv",
    "cable tv",
    "set top box",
  ],
  "Subscription": [
    "subscription",
    "membership",
    "monthly plan",
    "annual plan",
    "icloud",
    "google one",
    "dropbox",
    "prime",
    "netflix",
    "spotify",
    "youtube premium",
    "hotstar",
    "jiohotstar",
  ],
  "Fuel": [
    "petrol",
    "diesel",
    "fuel",
    "cng",
    "hpcl",
    "bpcl",
    "iocl",
    "indian oil",
    "bharat petroleum",
    "reliance petrol",
  ],
  "Metro": [
    "metro",
    "dmrc",
    "namma metro",
    "hyderabad metro",
    "mumbai metro",
    "delhi metro",
  ],
  "Bus": [
    "bus",
    "dtc",
    "redbus",
    "upsrtc",
    "msrtc",
    "ksrtc",
    "tsrtc",
  ],
  "Auto & Rickshaw": [
    "auto",
    "rickshaw",
    "e-rickshaw",
  ],
  "Cab & Ride Hailing": [
    "uber",
    "ola",
    "rapido",
    "cab",
    "taxi",
  ],
  "Train": [
    "train",
    "irctc",
    "railway",
    "railways",
    "vande bharat",
    "rajdhani",
    "shatabdi",
  ],
  "Flight": [
    "flight",
    "airline",
    "airport",
    "indigo",
    "air india",
    "akasa",
    "spicejet",
    "vistara",
  ],
  "Parking": [
    "parking",
    "parking fee",
    "parking charges",
  ],
  "Toll": [
    "toll",
    "fastag",
    "highway toll",
  ],
  "Vehicle Maintenance": [
    "car service",
    "bike service",
    "vehicle service",
    "puncture",
    "tyre",
    "tire",
    "oil change",
    "garage",
    "mechanic",
    "service center",
  ],
  "Vehicle Insurance": [
    "car insurance",
    "bike insurance",
    "motor insurance",
    "vehicle insurance",
  ],
  "Personal Care": [
    "personal care",
    "toiletries",
    "deodorant",
    "shampoo",
    "soap",
    "skincare",
  ],
  "Salon & Barber": [
    "salon",
    "barber",
    "haircut",
    "hair salon",
    "parlour",
    "parlor",
    "spa",
  ],
  "Clothing": [
    "clothes",
    "clothing",
    "shirt",
    "tshirt",
    "t-shirt",
    "jeans",
    "dress",
    "kurta",
    "saree",
    "suit",
    "jacket",
    "myntra",
    "ajio",
    "westside",
    "zudio",
  ],
  "Footwear": [
    "shoe",
    "shoes",
    "footwear",
    "sandal",
    "sandals",
    "slippers",
    "crocs",
  ],
  "Jewellery": [
    "jewellery",
    "jewelry",
    "gold",
    "silver",
    "tanishq",
    "kalyan jewellers",
    "malabar gold",
  ],
  "Fitness & Gym": [
    "gym",
    "fitness",
    "cult.fit",
    "cult fit",
    "yoga",
    "pilates",
    "workout",
  ],
  "Baby & Childcare": [
    "baby",
    "diaper",
    "diapers",
    "formula",
    "childcare",
    "daycare",
    "kids",
  ],
  "School Fees": [
    "school fee",
    "school fees",
    "school tuition",
  ],
  "Family Support": [
    "family support",
    "parents",
    "parent support",
    "home allowance",
    "allowance",
  ],
  "Pet Care": [
    "pet",
    "vet",
    "veterinary",
    "dog food",
    "cat food",
    "pet food",
  ],
  "Medical": [
    "medical",
    "medicine",
    "pharmacy",
    "apollo",
    "netmeds",
    "pharmeasy",
    "1mg",
    "tata 1mg",
    "medplus",
  ],
  "Medicine": [
    "medicine",
    "tablet",
    "capsule",
    "syrup",
    "prescription",
    "pharmacy",
  ],
  "Doctor & Clinic": [
    "doctor",
    "clinic",
    "consultation",
    "hospital",
    "apollo",
    "fortis",
    "max hospital",
    "manipal",
  ],
  "Dental": [
    "dentist",
    "dental",
    "tooth",
    "teeth",
  ],
  "Diagnostics": [
    "diagnostic",
    "diagnostics",
    "pathology",
    "blood test",
    "lab test",
    "thyrocare",
  ],
  "Health Insurance": [
    "health insurance",
    "medical insurance",
    "mediclaim",
    "star health",
    "hdfc ergo",
  ],
  "Wellness": [
    "wellness",
    "therapy",
    "massage",
    "ayurveda",
    "ayurvedic",
    "wellness center",
  ],
  "Education": [
    "education",
    "college",
    "university",
    "school",
    "course",
    "tuition",
    "fees",
  ],
  "Books & Stationery": [
    "book",
    "books",
    "stationery",
    "notebook",
    "pen",
    "pencil",
    "printer ink",
  ],
  "Coaching & Tuition": [
    "coaching",
    "tuition",
    "academy",
    "byju",
    "unacademy",
    "vedantu",
    "physics wallah",
    "pw",
    "allen",
  ],
  "Online Courses": [
    "udemy",
    "coursera",
    "skillshare",
    "online course",
  ],
  "Professional Development": [
    "certification",
    "professional development",
    "conference",
    "seminar",
    "workshop",
  ],
  "Office & Work": [
    "office",
    "work",
    "coworking",
    "printing",
    "business expense",
  ],
  "Shopping": [
    "shopping",
    "amazon",
    "flipkart",
    "meesho",
    "mall",
    "purchase",
  ],
  "Electronics": [
    "electronics",
    "croma",
    "reliance digital",
    "vijay sales",
    "electronic",
  ],
  "Mobile & Gadgets": [
    "mobile",
    "phone",
    "smartphone",
    "laptop",
    "tablet",
    "ipad",
    "iphone",
    "samsung",
    "oneplus",
    "realme",
    "xiaomi",
    "headphones",
    "earbuds",
    "smartwatch",
  ],
  "Home & Furniture": [
    "furniture",
    "sofa",
    "bed",
    "table",
    "chair",
    "ikea",
    "pepperfry",
    "urban ladder",
    "home decor",
  ],
  "Appliances": [
    "appliance",
    "refrigerator",
    "fridge",
    "washing machine",
    "microwave",
    "mixer",
    "ac",
    "air conditioner",
    "fan",
  ],
  "Beauty & Cosmetics": [
    "cosmetics",
    "makeup",
    "lipstick",
    "foundation",
    "beauty",
    "nykaa",
    "sephora",
  ],
  "Entertainment": [
    "entertainment",
    "netflix",
    "prime video",
    "hotstar",
    "jiohotstar",
    "spotify",
    "youtube",
  ],
  "Movies & Cinema": [
    "movie",
    "movies",
    "cinema",
    "pvr",
    "inox",
    "bookmyshow",
    "film",
  ],
  "Gaming": [
    "game",
    "games",
    "gaming",
    "steam",
    "playstation",
    "xbox",
    "nintendo",
    "free fire",
    "pubg",
    "bgmi",
  ],
  "Sports": [
    "sports",
    "cricket",
    "football",
    "badminton",
    "sportswear",
    "decathlon",
    "stadium",
  ],
  "Hobbies": [
    "hobby",
    "hobbies",
    "music class",
    "art",
    "craft",
    "painting",
    "photography",
  ],
  "Events & Concerts": [
    "concert",
    "event",
    "events",
    "theatre",
    "theater",
    "ticket",
    "bookmyshow",
  ],
  "Travel": [
    "travel",
    "trip",
    "tour",
    "vacation",
    "holiday",
  ],
  "Hotels & Stays": [
    "hotel",
    "airbnb",
    "oyo",
    "booking.com",
    "makemytrip",
    "agoda",
  ],
  "Vacation": [
    "vacation",
    "holiday",
    "resort",
    "tour package",
  ],
  "Religious Travel": [
    "pilgrimage",
    "tirth",
    "yatra",
    "char dham",
    "vaishno devi",
    "tirupati",
  ],
  "Gifts": [
    "gift",
    "present",
    "birthday gift",
    "anniversary gift",
  ],
  "Festivals & Celebrations": [
    "diwali",
    "holi",
    "rakhi",
    "raksha bandhan",
    "eid",
    "christmas",
    "navratri",
    "ganesh chaturthi",
    "pongal",
    "onam",
    "durga puja",
    "festival",
  ],
  "Wedding & Functions": [
    "wedding",
    "marriage",
    "shaadi",
    "function",
    "engagement",
    "baraat",
  ],
  "Donations & Charity": [
    "donation",
    "charity",
    "ngo",
    "daan",
    "contribution",
  ],
  "Religious & Pooja": [
    "pooja",
    "puja",
    "temple",
    "mandir",
    "gurudwara",
    "church",
    "mosque",
    "prasad",
  ],
  "Bank Charges": [
    "bank charge",
    "bank charges",
    "service charge",
    "atm fee",
    "cash withdrawal fee",
    "cheque bounce",
    "minimum balance",
  ],
  "Credit Card Payment": [
    "credit card payment",
    "credit card bill",
    "cc payment",
  ],
  "Insurance": [
    "insurance",
    "premium",
    "lic",
  ],
  "Investment": [
    "investment",
    "investing",
    "brokerage",
    "demat",
  ],
  "Mutual Funds": [
    "mutual fund",
    "mutual funds",
    "sip",
    "systematic investment",
  ],
  "Stocks": [
    "stock",
    "stocks",
    "share",
    "shares",
    "equity",
    "trading",
  ],
  "Gold & Jewellery Investment": [
    "gold investment",
    "sovereign gold bond",
    "gold bond",
    "digital gold",
  ],
};

/* ============================================================
   INCOME CATEGORY RULES
============================================================ */

const INCOME_CATEGORY_RULES: Record<string, string[]> = {
  "Salary": [
    "salary",
    "payroll",
    "pay check",
    "paycheck",
    "monthly salary",
    "wages",
    "wage",
    "ctc",
    "compensation",
    "salary credit",
  ],
  "Freelance": [
    "freelance",
    "freelancing",
    "client payment",
    "project payment",
    "project income",
    "contract work",
    "contractor",
    "upwork",
    "fiverr",
  ],
  "Business": [
    "business",
    "sales",
    "sale",
    "revenue",
    "profit",
    "shop income",
    "store income",
    "business income",
  ],
  "Commission": [
    "commission",
    "brokerage commission",
    "referral commission",
  ],
  "Bonus": [
    "bonus",
    "incentive",
    "performance bonus",
    "joining bonus",
    "annual bonus",
  ],
  "Interest Income": [
    "interest income",
    "bank interest",
    "fd interest",
    "fixed deposit interest",
    "savings interest",
  ],
  "Dividend": [
    "dividend",
    "dividends",
  ],
  "Gift Received": [
    "gift received",
    "cash gift",
    "birthday money",
    "wedding gift",
  ],
  "Cashback": [
    "cashback",
    "cash back",
    "reward cashback",
  ],
  "Refund": [
    "refund",
    "returned payment",
    "reversal",
  ],
  "Reimbursement": [
    "reimbursement",
    "reimburse",
    "expense reimbursement",
    "travel reimbursement",
  ],
};

/* ============================================================
   INCOME CATEGORY PREDICTOR
============================================================ */

function predictIncomeCategory(
  description: string,
  merchant: string,
): string {
  const text = normalizeText(
    `${description} ${merchant}`,
  );

  if (!text) {
    return "Other";
  }

  const priority = [
    "Salary",
    "Freelance",
    "Business",
    "Commission",
    "Bonus",
    "Interest Income",
    "Dividend",
    "Gift Received",
    "Cashback",
    "Refund",
    "Reimbursement",
  ];

  for (const category of priority) {
    const keywords =
      INCOME_CATEGORY_RULES[category] || [];

    const matched = keywords.some(
      (keyword) =>
        keywordMatches(text, keyword),
    );

    if (matched) {
      return category;
    }
  }

  return "Other";
}

/* ============================================================
   NORMALIZE TEXT
============================================================ */

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
   KEYWORD MATCH
============================================================ */

function keywordMatches(
  text: string,
  keyword: string,
): boolean {
  const normalizedKeyword =
    normalizeText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  if (normalizedKeyword.includes(" ")) {
    return text.includes(normalizedKeyword);
  }

  const words = text.split(" ");

  return words.some(
    (word) => word === normalizedKeyword,
  );
}

/* ============================================================
   CATEGORY PREDICTOR
============================================================ */

function predictCategory(
  description: string,
  merchant: string,
): string {
  const text = normalizeText(
    `${description} ${merchant}`,
  );

  if (!text) {
    return "Other";
  }

  const priority = [
    "Rent",
    "EMI",
    "Loan Payment",
    "Mess",
    "Hostel",
    "PG",
    "Maintenance",
    "Groceries",
    "Dining Out",
    "Food",
    "Tea & Coffee",
    "Snacks & Sweets",
    "Milk & Dairy",
    "Fruits & Vegetables",
    "Meat & Seafood",
    "Bakery",
    "Household Supplies",
    "Home Maintenance",
    "Electricity",
    "Water Bill",
    "Gas & LPG",
    "Internet & Broadband",
    "Mobile & Recharge",
    "DTH & Cable",
    "Subscription",
    "Fuel",
    "Metro",
    "Bus",
    "Auto & Rickshaw",
    "Cab & Ride Hailing",
    "Train",
    "Flight",
    "Parking",
    "Toll",
    "Vehicle Maintenance",
    "Vehicle Insurance",
    "Medical",
    "Medicine",
    "Doctor & Clinic",
    "Dental",
    "Diagnostics",
    "Health Insurance",
    "Wellness",
    "School Fees",
    "Education",
    "Books & Stationery",
    "Coaching & Tuition",
    "Online Courses",
    "Professional Development",
    "Office & Work",
    "Baby & Childcare",
    "Family Support",
    "Pet Care",
    "Personal Care",
    "Salon & Barber",
    "Clothing",
    "Footwear",
    "Jewellery",
    "Fitness & Gym",
    "Beauty & Cosmetics",
    "Electronics",
    "Mobile & Gadgets",
    "Home & Furniture",
    "Appliances",
    "Shopping",
    "Movies & Cinema",
    "Gaming",
    "Sports",
    "Hobbies",
    "Events & Concerts",
    "Entertainment",
    "Hotels & Stays",
    "Vacation",
    "Religious Travel",
    "Travel",
    "Wedding & Functions",
    "Festivals & Celebrations",
    "Gifts",
    "Donations & Charity",
    "Religious & Pooja",
    "Bank Charges",
    "Credit Card Payment",
    "Insurance",
    "Mutual Funds",
    "Stocks",
    "Gold & Jewellery Investment",
    "Investment",
  ];

  for (const category of priority) {
    const keywords =
      CATEGORY_RULES[category] || [];

    const matched = keywords.some(
      (keyword) =>
        keywordMatches(text, keyword),
    );

    if (matched) {
      return category;
    }
  }

  return "Other";
}

/* ============================================================
   NORMALIZE TRANSACTION
============================================================ */

function normalizeTransaction(
  transaction: any,
): Transaction {
  return {
    id: transaction?.id,
    _id: transaction?._id,
    userId: transaction?.userId,

    type:
      transaction?.type === "income"
        ? "income"
        : "expense",

    amount: Number(
      transaction?.amount || 0,
    ),

    currency: (["INR", "USD", "EUR", "GBP"].includes(
      String(transaction?.currency || "INR").toUpperCase(),
    )
      ? String(transaction?.currency || "INR").toUpperCase()
      : "INR") as CurrencyCode,

    category:
      transaction?.category || "Other",

    // Support both fields for backward compatibility.
    // A transaction is fixed when either isFixed === true
    // or expenseType === "fixed".
    expenseType:
      transaction?.isFixed === true ||
      String(transaction?.expenseType || "").toLowerCase() === "fixed"
        ? "fixed"
        : "variable",

    isFixed:
      transaction?.isFixed === true ||
      String(transaction?.expenseType || "").toLowerCase() === "fixed",

    description:
      transaction?.description || "",

    merchant:
      transaction?.merchant || "",

    date:
      transaction?.date ||
      new Date()
        .toISOString()
        .split("T")[0],
  };
}

/* ============================================================
   DATE FORMAT
============================================================ */

function formatDate(date: string): string {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

/* ============================================================
   TRANSACTIONS PAGE
============================================================ */

export function TransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [search, setSearch] =
    useState("");

  const [filterType, setFilterType] =
    useState<
      "all" | TransactionType
    >("all");

  const [filterCategory, setFilterCategory] =
    useState("all");

  const [sortBy, setSortBy] =
    useState<"date" | "amount">("date");

  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<Transaction | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);
    const [selectedPeriod, setSelectedPeriod] =
  useState<SelectedPeriod>(() => {
    try {
      const saved = localStorage.getItem(
        'finpilot_selected_period'
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed?.type === 'all') {
          return { type: 'all' };
        }

        if (
          parsed?.type === 'month' &&
          typeof parsed.year === 'number' &&
          typeof parsed.month === 'number'
        ) {
          return {
            type: 'month',
            year: parsed.year,
            month: parsed.month,
          };
        }
      }
    } catch {
      // Ignore invalid saved period
    }

    const now = new Date();

    return {
      type: 'month',
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  });

  useEffect(() => {
    localStorage.setItem(
      "finpilot_selected_period",
      JSON.stringify(selectedPeriod)
    );
  }, [selectedPeriod]);

  /* ==========================================================
     CUSTOM DELETE MODAL
  ========================================================== */

  const [deleteTarget, setDeleteTarget] =
    useState<Transaction | null>(null);

  /* ==========================================================
     DELETE SUCCESS MODAL
  ========================================================== */

  const [deleteSuccess, setDeleteSuccess] =
    useState(false);

  /* ==========================================================
     ERROR MODAL
  ========================================================== */

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  /* ==========================================================
     FETCH
  ========================================================== */

  async function fetchTransactions() {
    try {
      setLoading(true);

      const userId = await getUserId();

      const response = await fetch(
        `${API_BASE}/transactions?userId=${encodeURIComponent(
          userId,
        )}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch transactions: ${response.status}`,
        );
      }

      const data =
        await response.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(
              data?.transactions,
            )
          ? data.transactions
          : [];

      setTransactions(
        list.map(normalizeTransaction),
      );
    } catch (error) {
      console.error(
        "Error fetching transactions:",
        error,
      );

      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  /* ==========================================================
     FILTER + SORT
  ========================================================== */
const periodTransactions = useMemo(() => {
  if (selectedPeriod.type === "all") {
    return transactions;
  }

  return transactions.filter((transaction) => {
    if (!transaction.date) return false;

    const date = new Date(transaction.date);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return (
      date.getFullYear() === selectedPeriod.year &&
      date.getMonth() === selectedPeriod.month
    );
  });
}, [transactions, selectedPeriod]);

const filtered = useMemo(() => {
  let result = [...periodTransactions];

  if (search.trim()) {
    const q = normalizeText(search);

    result = result.filter((transaction) => {
      const description = normalizeText(
        transaction.description
      );

      const merchant = normalizeText(
        transaction.merchant || ""
      );

      const category = normalizeText(
        transaction.category
      );

      return (
        description.includes(q) ||
        merchant.includes(q) ||
        category.includes(q)
      );
    });
  }

  if (filterType !== "all") {
    result = result.filter(
      (transaction) =>
        transaction.type === filterType
    );
  }

  if (filterCategory !== "all") {
    result = result.filter(
      (transaction) =>
        transaction.category === filterCategory
    );
  }

  result.sort((a, b) => {
    if (sortBy === "amount") {
      return (
        Number(b.amount || 0) -
        Number(a.amount || 0)
      );
    }

    return (
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
    );
  });

  return result;
}, [
  periodTransactions,
  search,
  filterType,
  filterCategory,
  sortBy,
]);

  /* ==========================================================
     TOTALS
  ========================================================== */

  const totalIncome = useMemo(
    () =>
      periodTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "income",
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0,
            ),
          0,
        ),
    [periodTransactions],
  );

  const totalExpense = useMemo(
    () =>
      periodTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            "expense",
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0,
            ),
          0,
        ),
    [periodTransactions],
  );

  /* ==========================================================
     CREATE / UPDATE
  ========================================================== */

  async function handleSave(
    data: Transaction,
  ) {
    try {
      setActionLoading(true);

      const userId =
        await getUserId();

      const payload = {
        ...data,
        userId,
        amount: Number(data.amount),
      };

      const transactionId =
        data.id || data._id;

      const response = await fetch(
        transactionId
          ? `${API_BASE}/transactions/${transactionId}`
          : `${API_BASE}/transactions`,
        {
          method: transactionId
            ? "PUT"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload,
          ),
        },
      );

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          `Failed to save transaction: ${response.status} ${text}`,
        );
      }

      setShowForm(false);
      setEditing(null);

      await fetchTransactions();
    } catch (error) {
      console.error(
        "Error saving transaction:",
        error,
      );

      setErrorMessage(
        "Could not save transaction.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     EDIT
  ========================================================== */

  function handleEdit(
    transaction: Transaction,
  ) {
    setEditing(transaction);
    setShowForm(true);
  }

  /* ==========================================================
     OPEN DELETE MODAL
  ========================================================== */

  function handleDelete(
    transaction: Transaction,
  ) {
    const id =
      transaction._id ||
      transaction.id;

    if (!id) {
      setErrorMessage(
        "Transaction ID is missing.",
      );
      return;
    }

    setDeleteTarget(transaction);
  }

  /* ==========================================================
     CONFIRM DELETE
  ========================================================== */

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    const id =
      deleteTarget._id ||
      deleteTarget.id;

    if (!id) {
      setDeleteTarget(null);
      setErrorMessage(
        "Transaction ID is missing.",
      );
      return;
    }

    try {
      setActionLoading(true);

      const userId =
        await getUserId();

      const url =
        `${API_BASE}/transactions/${encodeURIComponent(id)}` +
        `?userId=${encodeURIComponent(userId)}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const responseText =
        await response.text();

      if (!response.ok) {
        throw new Error(
          `Delete failed (${response.status}): ${
            responseText ||
            "Unknown backend error"
          }`,
        );
      }

      /* Remove from UI after backend confirms */
      setTransactions(
        (previous) =>
          previous.filter(
            (item) =>
              item._id !== id &&
              item.id !== id,
          ),
      );

      /* Close confirmation */
      setDeleteTarget(null);

      /* Show custom success modal */
      setDeleteSuccess(true);
    } catch (error) {
      console.error(
        "Error deleting transaction:",
        error,
      );

      setDeleteTarget(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not delete transaction.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <>
      <div className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Transactions
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Track and manage your income
                and expenses.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <MonthSelector
                value={selectedPeriod}
                onChange={setSelectedPeriod}
              />

              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            </div>
          </div>
        </Reveal>

        {/* ======================================================
            SUMMARY
        ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" />

              <span className="text-sm text-gray-400">
                Total Income
              </span>
            </div>

            <p className="text-2xl font-bold text-white mt-3">
              ₹
              {totalIncome.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="w-5 h-5 text-red-400" />

              <span className="text-sm text-gray-400">
                Total Expense
              </span>
            </div>

            <p className="text-2xl font-bold text-white mt-3">
              ₹
              {totalExpense.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />

              <span className="text-sm text-gray-400">
                Balance
              </span>
            </div>

            <p className="text-2xl font-bold text-white mt-3">
              ₹
              {(
                totalIncome -
                totalExpense
              ).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </p>
          </div>
        </div>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <Reveal>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search transactions..."
                  className="w-full rounded-xl border border-white/[0.08] bg-black/20 pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/40"
                />
              </div>

              <select
                value={filterType}
                onChange={(event) =>
                  setFilterType(
                    event.target
                      .value as
                      | "all"
                      | TransactionType,
                  )
                }
                className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="all">
                  All Types
                </option>

                <option value="income">
                  Income
                </option>

                <option value="expense">
                  Expense
                </option>
              </select>

              <select
                value={filterCategory}
                onChange={(event) =>
                  setFilterCategory(
                    event.target.value,
                  )
                }
                className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="all">
                  All Categories
                </option>

                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target
                      .value as
                      | "date"
                      | "amount",
                  )
                }
                className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="date">
                  Sort by Date
                </option>

                <option value="amount">
                  Sort by Amount
                </option>
              </select>
            </div>
          </div>
        </Reveal>

        {/* ======================================================
            TRANSACTION LIST
        ====================================================== */}

        <Reveal>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Filter className="w-8 h-8 text-gray-600 mx-auto mb-3" />

                <p className="text-gray-400">
                  No transactions found.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                  className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Add your first transaction
                </button>
              </div>
            ) : (
              <div>
                {filtered.map(
                  (transaction) => {
                    const isIncome =
                      transaction.type ===
                      "income";

                    return (
                      <div
                        key={
                          transaction.id ||
                          transaction._id
                        }
                        className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.05] last:border-b-0"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isIncome
                              ? "bg-emerald-400/10"
                              : "bg-red-400/10"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {transaction.description ||
                              "Transaction"}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {transaction.merchant ||
                                "No merchant"}
                            </span>

                            <span className="text-gray-700">
                              •
                            </span>

                            <span className="text-xs text-emerald-400">
                              {transaction.category}
                            </span>

                            {transaction.type === "expense" &&
                              (transaction.isFixed === true || transaction.expenseType === "fixed") && (
                                <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                  Fixed
                                </span>
                              )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 hidden sm:block">
                          {formatDate(
                            transaction.date,
                          )}
                        </div>

                        <div
                          className={`text-sm font-semibold ${
                            isIncome
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {isIncome
                            ? "+"
                            : "-"}
                          ₹
                          {Number(
                            transaction.amount ||
                              0,
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                transaction,
                              )
                            }
                            disabled={
                              actionLoading
                            }
                            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05]"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                transaction,
                              )
                            }
                            disabled={
                              actionLoading
                            }
                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/[0.05]"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* ======================================================
            FORM MODAL
        ====================================================== */}

        {showForm && (
          <TransactionForm
            editing={editing}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSave={handleSave}
            saving={actionLoading}
          />
        )}
      </div>

      {/* ========================================================
          DELETE CONFIRMATION MODAL
      ======================================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => {
              if (!actionLoading) {
                setDeleteTarget(null);
              }
            }}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.10] bg-[#101313] shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-semibold text-white mt-5">
                Delete transaction?
              </h2>

              <p className="text-sm text-gray-400 mt-2 leading-6">
                Are you sure you want to delete
                this transaction? This action
                cannot be undone.
              </p>

              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white truncate">
                  {deleteTarget.description ||
                    "Transaction"}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {deleteTarget.category}
                    </span>

                    {deleteTarget.type === "expense" &&
                      (deleteTarget.isFixed === true || deleteTarget.expenseType === "fixed") && (
                        <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          Fixed
                        </span>
                      )}
                  </div>

                  <span
                    className={`text-sm font-semibold ${
                      deleteTarget.type ===
                      "income"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {deleteTarget.type ===
                    "income"
                      ? "+"
                      : "-"}
                    ₹
                    {Number(
                      deleteTarget.amount ||
                        0,
                    ).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.05] transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={confirmDelete}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-400 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE SUCCESS MODAL
      ======================================================== */}

      {deleteSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() =>
              setDeleteSuccess(false)
            }
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-emerald-400/20 bg-[#101313] shadow-2xl p-7 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <h2 className="text-xl font-semibold text-white mt-5">
              Transaction deleted
            </h2>

            <p className="text-sm text-gray-400 mt-2 leading-6">
              This transaction has been
              deleted successfully.
            </p>

            <button
              type="button"
              onClick={() =>
                setDeleteSuccess(false)
              }
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          ERROR MODAL
      ======================================================== */}

      {errorMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() =>
              setErrorMessage(null)
            }
          />

          <div className="relative w-full max-w-sm rounded-3xl border border-red-400/20 bg-[#101313] shadow-2xl p-7 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center">
              <AlertCircle className="w-9 h-9 text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-white mt-5">
              Something went wrong
            </h2>

            <p className="text-sm text-gray-400 mt-2 leading-6">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(null)
              }
              className="mt-6 w-full rounded-xl bg-white/[0.08] border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.12] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   TRANSACTION FORM
============================================================ */

function TransactionForm({
  editing,
  onClose,
  onSave,
  saving,
}: {
  editing: Transaction | null;
  onClose: () => void;
  onSave: (
    data: Transaction,
  ) => void;
  saving: boolean;
}) {
  const [type, setType] =
    useState<TransactionType>(
      editing?.type || "expense",
    );

  const [amount, setAmount] =
    useState(
      editing
        ? String(editing.amount)
        : "",
    );

  const [currency, setCurrency] = useState<CurrencyCode>(
    editing?.currency || "INR",
  );

  // Use the currency selected in Profile for new transactions.
  // Existing transactions keep their original currency when edited.
  useEffect(() => {
    if (editing) {
      setCurrency(editing.currency || "INR");
      return;
    }

    let cancelled = false;

    async function loadProfileCurrency() {
      try {
        const userId = await getUserId();
        const rawProfile = localStorage.getItem(`finpilot_profile_${userId}`);
        if (!rawProfile || cancelled) return;

        const profile = JSON.parse(rawProfile);
        const preferredCurrency = String(profile?.currency || "INR").toUpperCase();
        if (["INR", "USD", "EUR", "GBP"].includes(preferredCurrency)) {
          setCurrency(preferredCurrency as CurrencyCode);
        }
      } catch (error) {
        console.error("Unable to load profile currency:", error);
      }
    }

    loadProfileCurrency();
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const [category, setCategory] =
    useState(
      editing?.category || "Other",
    );
    const [expenseType, setExpenseType] =
  useState<"fixed" | "variable">(
    editing?.isFixed === true ||
    editing?.expenseType === "fixed"
      ? "fixed"
      : "variable",
  );

  const [description, setDescription] =
    useState(
      editing?.description || "",
    );

  const [merchant, setMerchant] =
    useState(
      editing?.merchant || "",
    );

  const [date, setDate] =
    useState(
      editing?.date ||
        new Date()
          .toISOString()
          .split("T")[0],
    );

  const [isPredicting, setIsPredicting] =
    useState(false);

  const [
    predictionSource,
    setPredictionSource,
  ] = useState<
    "automatic" | "manual" | "initial"
  >(
    editing
      ? "initial"
      : "automatic",
  );

  /* ==========================================================
     AUTOMATIC CATEGORY PREDICTION
  ========================================================== */

  useEffect(() => {
    if (type !== "expense" && type !== "income") {
      return;
    }

    const text =
      `${description} ${merchant}`.trim();

    if (text.length < 2) {
      return;
    }

    setIsPredicting(true);

    const timer =
      window.setTimeout(() => {
        const predicted =
          type === "income"
            ? predictIncomeCategory(
                description,
                merchant,
              )
            : predictCategory(
                description,
                merchant,
              );

        setCategory(predicted);

        setPredictionSource(
          "automatic",
        );

        setIsPredicting(false);
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    description,
    merchant,
    type,
  ]);

  /* ==========================================================
     MANUAL CATEGORY
  ========================================================== */

  function handleManualCategoryChange(
    value: string,
  ) {
    setCategory(value);

    setPredictionSource(
      "manual",
    );
  }

  /* ==========================================================
     SUBMIT
  ========================================================== */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsedAmount =
      Number(amount);

    if (
      !Number.isFinite(
        parsedAmount,
      ) ||
      parsedAmount <= 0
    ) {
      return;
    }

    if (!description.trim()) {
      return;
    }

    if (!date) {
      return;
    }

    onSave({
      id: editing?.id,
      _id: editing?._id,
      userId: editing?.userId,
      type,
      amount: parsedAmount,
      currency,
      category,
expenseType:
  type === "expense" ? expenseType : undefined,
      isFixed:
        type === "expense"
          ? expenseType === "fixed"
          : false,
      description:
  description.trim(),
      merchant:
        merchant.trim(),
      date,
    });
  }

  /* ==========================================================
     FORM UI
  ========================================================== */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/70 backdrop-blur-sm">
      <div
        className="
          w-full max-w-md sm:max-w-lg
          h-[calc(100dvh-1.5rem)] max-h-[760px]
          rounded-2xl border border-white/[0.1]
          bg-[#101313] shadow-2xl overflow-hidden
          flex flex-col min-h-0
        "
      >
        {/* HEADER - always visible */}

        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {editing
                ? "Edit Transaction"
                : "Add Transaction"}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              AI automatically predicts
              the category.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 min-h-0 flex-col"
        >
          {/* SCROLLABLE FORM BODY */}

          <div
            className="
              flex-1 min-h-0 overflow-y-auto
              overscroll-contain touch-pan-y
              px-5 py-4 space-y-4
              [scrollbar-width:thin]
            "
          >
            {/* TYPE */}

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Type
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setType("expense")
                  }
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    type === "expense"
                      ? "border-red-400/40 bg-red-400/10 text-red-400"
                      : "border-white/[0.08] text-gray-500"
                  }`}
                >
                  Expense
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setType("income")
                  }
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    type === "income"
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                      : "border-white/[0.08] text-gray-500"
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            {/* AMOUNT + DATE */}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                  required
                />
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                  aria-label="Transaction currency"
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#101313] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                  required
                />
              </div>
            </div>

            {/* DESCRIPTION + MERCHANT */}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder={
                    type === "income"
                      ? "Salary / freelance"
                      : "e.g. Rent, food, movie"
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Merchant <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(event) =>
                    setMerchant(event.target.value)
                  }
                  placeholder="Amazon, Uber, Zomato (optional)"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                  
                />
              </div>
            </div>

            {/* PREDICTION */}

            

            {((type === "expense" || type === "income") &&
              (description.trim().length >= 2 ||
                merchant.trim().length >= 2)) && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3">
                {isPredicting ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                )}

                <div>
                  <p className="text-xs font-medium text-emerald-400">
                    {isPredicting
                      ? "Predicting category..."
                      : predictionSource ===
                          "manual"
                        ? `Category selected: ${category}`
                        : `ML predicted: ${category}`}
                  </p>

                  {!isPredicting && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Based on description
                      and merchant
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CATEGORY */}

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Category
              </label>

              <select
                value={category}
                onChange={(event) =>
                  handleManualCategoryChange(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
              >
                {CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* EXPENSE TYPE */}

            {type === "expense" && (
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Expense Type
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpenseType("variable")
                    }
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      expenseType === "variable"
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                        : "border-white/[0.08] text-gray-500"
                    }`}
                  >
                    Variable
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExpenseType("fixed")
                    }
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      expenseType === "fixed"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                        : "border-white/[0.08] text-gray-500"
                    }`}
                  >
                    Fixed
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 mt-1">
                  Fixed expenses like rent, EMI or mess fees won't affect
                  your variable spending insights.
                </p>
              </div>
            )}

            {/* DATE */}

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                required
              />
            </div>

            {/* Extra bottom space so the last field is never hidden behind the footer */}
            <div className="h-1" aria-hidden="true" />
          </div>

          {/* STICKY FOOTER - always visible */}

          <div className="shrink-0 flex gap-3 border-t border-white/[0.08] bg-[#101313] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {editing
                ? "Update"
                : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}