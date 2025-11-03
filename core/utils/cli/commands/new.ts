#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Deno Genesis New Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Generate industry-specific frontends
 * - Accept text input: User prompts for business information
 * - Produce text output: HTML, CSS, JS, and configuration files
 * - Filter and transform: Business data → Professional website frontend
 * - Composable: Works with existing site structure from init command
 *
 * Security-First Approach:
 * - Explicit permissions for file operations
 * - Input validation for all user data
 * - Safe file path handling
 *
 * Separation of Concerns:
 * - init command: Creates site structure and symlinks
 * - new command: Generates frontend (public directory)
 * - This command ONLY handles public directory and business-specific files
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.224.0/fs/mod.ts";

// ============================================================================
// TYPES
// ============================================================================

interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface BusinessInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string;
  email: string;
  industry: string;
  businessType: string;
  colorScheme: ColorScheme;
}

interface ColorScheme {
  name: string;
  primaryDark: string;
  primaryMedium: string;
  primaryLight: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}

interface IndustryDefinition {
  id: string;
  name: string;
  description: string;
  businessTypes: string[];
  defaultColorSchemes: string[];
  templateFeatures: string[];
}

// ============================================================================
// INDUSTRY DEFINITIONS
// ============================================================================

const INDUSTRIES: IndustryDefinition[] = [
  {
    id: "construction",
    name: "Construction & Roofing",
    description: "Contractors, roofers, builders, renovation",
    businessTypes: [
      "General Contractor",
      "Roofing Contractor",
      "Remodeling",
      "Home Building",
      "Commercial Construction",
    ],
    defaultColorSchemes: ["earth-tones", "industrial-blue", "trust-gray"],
    templateFeatures: [
      "portfolio-gallery",
      "project-showcase",
      "service-areas-map",
      "emergency-contact",
      "licensing-display",
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare & Beauty",
    description: "Clinics, salons, spas, dental, medical",
    businessTypes: [
      "Hair Salon",
      "Medical Spa",
      "Dental Practice",
      "Physical Therapy",
      "Aesthetics Clinic",
    ],
    defaultColorSchemes: ["medical-blue", "spa-green", "wellness-purple"],
    templateFeatures: [
      "appointment-booking",
      "service-menu",
      "before-after-gallery",
      "staff-profiles",
      "insurance-accepted",
    ],
  },
  {
    id: "professional-services",
    name: "Professional Services",
    description: "Legal, accounting, consulting, financial",
    businessTypes: [
      "Law Firm",
      "Accounting Firm",
      "Consulting",
      "Financial Planning",
      "Real Estate",
    ],
    defaultColorSchemes: [
      "corporate-navy",
      "trust-burgundy",
      "professional-gray",
    ],
    templateFeatures: [
      "case-studies",
      "team-expertise",
      "credentials-display",
      "client-testimonials",
      "consultation-booking",
    ],
  },
  {
    id: "logistics",
    name: "Logistics & Transportation",
    description: "Moving, shipping, freight, delivery",
    businessTypes: [
      "Moving Company",
      "Freight Services",
      "Last-Mile Delivery",
      "Courier Services",
      "Logistics Provider",
    ],
    defaultColorSchemes: ["logistics-orange", "reliable-blue", "speed-red"],
    templateFeatures: [
      "quote-calculator",
      "tracking-system",
      "service-coverage",
      "fleet-information",
      "insurance-info",
    ],
  },
  {
    id: "retail",
    name: "Retail & E-commerce",
    description: "Stores, shops, online retail",
    businessTypes: [
      "Boutique",
      "General Store",
      "Specialty Shop",
      "E-commerce",
      "Marketplace",
    ],
    defaultColorSchemes: [
      "retail-vibrant",
      "ecommerce-clean",
      "boutique-elegant",
    ],
    templateFeatures: [
      "product-catalog",
      "shopping-cart",
      "inventory-display",
      "promotions-banner",
      "store-locator",
    ],
  },
  {
    id: "food-beverage",
    name: "Food & Beverage",
    description: "Restaurants, cafes, catering, food service",
    businessTypes: [
      "Restaurant",
      "Cafe",
      "Catering",
      "Food Truck",
      "Bar",
    ],
    defaultColorSchemes: ["appetite-red", "organic-green", "elegant-black"],
    templateFeatures: [
      "menu-display",
      "online-ordering",
      "table-reservation",
      "photo-gallery",
      "dietary-icons",
    ],
  },
];

// ============================================================================
// COLOR SCHEME DEFINITIONS
// ============================================================================

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  // Construction & Industrial
  "earth-tones": {
    name: "Earth Tones (Construction)",
    primaryDark: "#2d1810",
    primaryMedium: "#5a3d2b",
    primaryLight: "#8b5a3c",
    accentPrimary: "#d4a574",
    accentSecondary: "#f4a261",
    textPrimary: "#f5f3f0",
    textSecondary: "#d1ccc7",
    textTertiary: "#a8a29e",
  },
  "industrial-blue": {
    name: "Industrial Blue",
    primaryDark: "#0d1b2a",
    primaryMedium: "#1b263b",
    primaryLight: "#415a77",
    accentPrimary: "#778da9",
    accentSecondary: "#e76f51",
    textPrimary: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textTertiary: "#94a3b8",
  },
  "trust-gray": {
    name: "Trust Gray",
    primaryDark: "#1f2937",
    primaryMedium: "#374151",
    primaryLight: "#4b5563",
    accentPrimary: "#60a5fa",
    accentSecondary: "#3b82f6",
    textPrimary: "#f9fafb",
    textSecondary: "#e5e7eb",
    textTertiary: "#d1d5db",
  },

  // Healthcare & Wellness
  "medical-blue": {
    name: "Medical Blue (Healthcare)",
    primaryDark: "#1a365d",
    primaryMedium: "#2c5282",
    primaryLight: "#4299e1",
    accentPrimary: "#38a169",
    accentSecondary: "#3182ce",
    textPrimary: "#ffffff",
    textSecondary: "#e2e8f0",
    textTertiary: "#cbd5e1",
  },
  "spa-green": {
    name: "Spa Green (Wellness)",
    primaryDark: "#1c4532",
    primaryMedium: "#2f855a",
    primaryLight: "#48bb78",
    accentPrimary: "#9ae6b4",
    accentSecondary: "#68d391",
    textPrimary: "#f7fafc",
    textSecondary: "#e6fffa",
    textTertiary: "#b2f5ea",
  },
  "wellness-purple": {
    name: "Wellness Purple",
    primaryDark: "#44337a",
    primaryMedium: "#5a4a91",
    primaryLight: "#7c6ba8",
    accentPrimary: "#b794f6",
    accentSecondary: "#9f7aea",
    textPrimary: "#faf5ff",
    textSecondary: "#e9d8fd",
    textTertiary: "#d6bcfa",
  },

  // Professional Services
  "corporate-navy": {
    name: "Corporate Navy (Professional)",
    primaryDark: "#1e3a8a",
    primaryMedium: "#1e40af",
    primaryLight: "#3b82f6",
    accentPrimary: "#60a5fa",
    accentSecondary: "#93c5fd",
    textPrimary: "#f8fafc",
    textSecondary: "#e2e8f0",
    textTertiary: "#cbd5e1",
  },
  "trust-burgundy": {
    name: "Trust Burgundy (Legal)",
    primaryDark: "#7f1d1d",
    primaryMedium: "#991b1b",
    primaryLight: "#dc2626",
    accentPrimary: "#ef4444",
    accentSecondary: "#f87171",
    textPrimary: "#fef2f2",
    textSecondary: "#fee2e2",
    textTertiary: "#fecaca",
  },
  "professional-gray": {
    name: "Professional Gray",
    primaryDark: "#18181b",
    primaryMedium: "#27272a",
    primaryLight: "#3f3f46",
    accentPrimary: "#a1a1aa",
    accentSecondary: "#71717a",
    textPrimary: "#fafafa",
    textSecondary: "#e4e4e7",
    textTertiary: "#d4d4d8",
  },

  // Logistics & Transportation
  "logistics-orange": {
    name: "Logistics Orange",
    primaryDark: "#7c2d12",
    primaryMedium: "#9a3412",
    primaryLight: "#c2410c",
    accentPrimary: "#fb923c",
    accentSecondary: "#f97316",
    textPrimary: "#fff7ed",
    textSecondary: "#fed7aa",
    textTertiary: "#fdba74",
  },
  "reliable-blue": {
    name: "Reliable Blue",
    primaryDark: "#1e40af",
    primaryMedium: "#2563eb",
    primaryLight: "#3b82f6",
    accentPrimary: "#60a5fa",
    accentSecondary: "#93c5fd",
    textPrimary: "#eff6ff",
    textSecondary: "#dbeafe",
    textTertiary: "#bfdbfe",
  },
  "speed-red": {
    name: "Speed Red",
    primaryDark: "#991b1b",
    primaryMedium: "#b91c1c",
    primaryLight: "#dc2626",
    accentPrimary: "#f87171",
    accentSecondary: "#ef4444",
    textPrimary: "#fef2f2",
    textSecondary: "#fee2e2",
    textTertiary: "#fecaca",
  },

  // Retail & E-commerce
  "retail-vibrant": {
    name: "Retail Vibrant",
    primaryDark: "#be123c",
    primaryMedium: "#e11d48",
    primaryLight: "#f43f5e",
    accentPrimary: "#fb7185",
    accentSecondary: "#fda4af",
    textPrimary: "#fff1f2",
    textSecondary: "#ffe4e6",
    textTertiary: "#fecdd3",
  },
  "ecommerce-clean": {
    name: "E-commerce Clean",
    primaryDark: "#0f172a",
    primaryMedium: "#1e293b",
    primaryLight: "#334155",
    accentPrimary: "#06b6d4",
    accentSecondary: "#22d3ee",
    textPrimary: "#f8fafc",
    textSecondary: "#e2e8f0",
    textTertiary: "#cbd5e1",
  },
  "boutique-elegant": {
    name: "Boutique Elegant",
    primaryDark: "#4a044e",
    primaryMedium: "#701a75",
    primaryLight: "#a21caf",
    accentPrimary: "#d946ef",
    accentSecondary: "#e879f9",
    textPrimary: "#fdf4ff",
    textSecondary: "#fae8ff",
    textTertiary: "#f5d0fe",
  },

  // Food & Beverage
  "appetite-red": {
    name: "Appetite Red",
    primaryDark: "#7f1d1d",
    primaryMedium: "#991b1b",
    primaryLight: "#dc2626",
    accentPrimary: "#f87171",
    accentSecondary: "#fca5a5",
    textPrimary: "#fef2f2",
    textSecondary: "#fee2e2",
    textTertiary: "#fecaca",
  },
  "organic-green": {
    name: "Organic Green",
    primaryDark: "#14532d",
    primaryMedium: "#166534",
    primaryLight: "#16a34a",
    accentPrimary: "#4ade80",
    accentSecondary: "#86efac",
    textPrimary: "#f0fdf4",
    textSecondary: "#dcfce7",
    textTertiary: "#bbf7d0",
  },
  "elegant-black": {
    name: "Elegant Black",
    primaryDark: "#0a0a0a",
    primaryMedium: "#171717",
    primaryLight: "#262626",
    accentPrimary: "#d4af37",
    accentSecondary: "#ffd700",
    textPrimary: "#fafafa",
    textSecondary: "#e5e5e5",
    textTertiary: "#d4d4d4",
  },
};

// ============================================================================
// MAIN COMMAND HANDLER
// ============================================================================

export async function newCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    console.log(`
🎨 Deno Genesis - Frontend Generator

Unix Philosophy + Industry Expertise = Professional Results
Generating business-specific frontend...
`);

    // Step 1: Determine which site to generate frontend for
    const siteDirectory = await selectSiteDirectory(context);
    if (!siteDirectory) {
      console.error("❌ No site directory selected. Exiting.");
      return 1;
    }

    // Step 2: Check if site structure exists (created by init command)
    const siteExists = await exists(siteDirectory);
    if (!siteExists) {
      console.error(`❌ Site directory does not exist: ${siteDirectory}`);
      console.error(
        `   Run 'genesis init' first to create the site structure.`,
      );
      return 1;
    }

    // Step 3: Check if public directory already exists
    const publicDir = join(siteDirectory, "public");
    if (await exists(publicDir)) {
      const overwrite = await promptYesNo(
        `Public directory already exists. Overwrite?`,
        false,
      );
      if (!overwrite) {
        console.log("❌ Operation cancelled by user.");
        return 1;
      }
    }

    // Step 4: Gather business information
    const businessInfo = await gatherBusinessInformation(context);

    // Step 5: Validate all inputs
    const validation = validateBusinessInfo(businessInfo);
    if (!validation.valid) {
      console.error(`❌ Validation failed: ${validation.error}`);
      return 1;
    }

    // Step 6: Generate frontend
    await generateFrontend(businessInfo, siteDirectory, context);

    console.log(`
✅ Frontend generated successfully!

📁 Site Location: ${siteDirectory}
🌐 Business: ${businessInfo.name}
🎨 Color Scheme: ${businessInfo.colorScheme.name}
📋 Industry: ${businessInfo.industry}

Next Steps:
1. cd ${siteDirectory}
2. Review generated frontend in public/
3. Customize content and images
4. Start server: deno run --allow-all main.ts
5. Deploy: genesis deploy yourdomain.com

📖 Documentation: ${siteDirectory}/README.md
`);

    return 0;
  } catch (error) {
    console.error(`❌ Error generating frontend:`, error.message);
    if (context.verbose) {
      console.error(error.stack);
    }
    return 1;
  }
}

// ============================================================================
// SITE SELECTION
// ============================================================================

async function selectSiteDirectory(
  context: CLIContext,
): Promise<string | null> {
  const sitesDir = join(context.cwd, "sites");

  // Check if sites directory exists
  if (!await exists(sitesDir)) {
    console.error("❌ No sites directory found.");
    console.error("   Run 'genesis init' first to create a site.");
    return null;
  }

  // List available sites
  const sites: string[] = [];
  for await (const entry of Deno.readDir(sitesDir)) {
    if (entry.isDirectory) {
      sites.push(entry.name);
    }
  }

  if (sites.length === 0) {
    console.error("❌ No sites found in sites directory.");
    console.error("   Run 'genesis init <site-name>' to create a site.");
    return null;
  }

  console.log("\n📁 Available Sites:");
  sites.forEach((site, idx) => {
    console.log(`${idx + 1}. ${site}`);
  });
  console.log(`${sites.length + 1}. Cancel`);

  const choice = await promptNumber(
    "\nSelect site to generate frontend for",
    { min: 1, max: sites.length + 1 },
  );

  if (choice === sites.length + 1) {
    return null;
  }

  return join(sitesDir, sites[choice - 1]);
}

// ============================================================================
// INTERACTIVE PROMPTS
// ============================================================================

async function gatherBusinessInformation(
  context: CLIContext,
): Promise<BusinessInfo> {
  console.log("\n📋 Business Information");
  console.log("Please provide the following details:\n");

  // Business Name
  const name = await promptText(
    "Business Name",
    { required: true, validator: validateBusinessName },
  );

  // Address Information
  console.log("\n📍 Address Information:");
  const street = await promptText("Street Address", { required: true });
  const city = await promptText("City", { required: true });
  const state = await promptText("State/Province", { required: true });
  const zip = await promptText("ZIP/Postal Code", { required: true });
  const country = await promptText("Country", { default: "United States" });

  const address = { street, city, state, zip, country };

  // Contact Information
  console.log("\n📞 Contact Information:");
  const phone = await promptText(
    "Phone Number",
    {
      required: true,
      validator: validatePhoneNumber,
      hint: "Format: (555) 123-4567",
    },
  );

  const email = await promptText(
    "Email Address",
    {
      required: true,
      validator: validateEmail,
      hint: "Format: contact@business.com",
    },
  );

  // Industry Selection
  console.log("\n🏭 Industry Selection:");
  const industry = await selectIndustry();

  // Business Type
  const businessType = await selectBusinessType(industry);

  // Color Scheme
  console.log("\n🎨 Color Scheme:");
  const colorScheme = await selectColorScheme(industry);

  return {
    name,
    address,
    phone,
    email,
    industry,
    businessType,
    colorScheme,
  };
}

async function selectIndustry(): Promise<string> {
  console.log("\nAvailable Industries:");
  INDUSTRIES.forEach((ind, idx) => {
    console.log(`${idx + 1}. ${ind.name}`);
    console.log(`   ${ind.description}`);
  });

  const choice = await promptNumber(
    "\nSelect industry",
    { min: 1, max: INDUSTRIES.length },
  );

  return INDUSTRIES[choice - 1].id;
}

async function selectBusinessType(industryId: string): Promise<string> {
  const industry = INDUSTRIES.find((i) => i.id === industryId);
  if (!industry) throw new Error("Invalid industry");

  console.log(`\n${industry.name} - Business Types:`);
  industry.businessTypes.forEach((type, idx) => {
    console.log(`${idx + 1}. ${type}`);
  });

  const choice = await promptNumber(
    "\nSelect business type",
    { min: 1, max: industry.businessTypes.length },
  );

  return industry.businessTypes[choice - 1];
}

async function selectColorScheme(industryId: string): Promise<ColorScheme> {
  const industry = INDUSTRIES.find((i) => i.id === industryId);
  if (!industry) throw new Error("Invalid industry");

  console.log("\nRecommended Color Schemes:");

  industry.defaultColorSchemes.forEach((schemeId, idx) => {
    const scheme = COLOR_SCHEMES[schemeId];
    console.log(`${idx + 1}. ${scheme.name}`);
  });

  console.log(
    `${industry.defaultColorSchemes.length + 1}. Browse all color schemes`,
  );

  const choice = await promptNumber(
    "\nSelect color scheme",
    { min: 1, max: industry.defaultColorSchemes.length + 1 },
  );

  if (choice === industry.defaultColorSchemes.length + 1) {
    return await browseAllColorSchemes();
  }

  const schemeId = industry.defaultColorSchemes[choice - 1];
  return COLOR_SCHEMES[schemeId];
}

async function browseAllColorSchemes(): Promise<ColorScheme> {
  console.log("\n🎨 All Available Color Schemes:\n");

  const schemes = Object.entries(COLOR_SCHEMES);
  schemes.forEach(([id, scheme], idx) => {
    console.log(`${idx + 1}. ${scheme.name}`);
  });

  const choice = await promptNumber(
    "\nSelect color scheme",
    { min: 1, max: schemes.length },
  );

  return schemes[choice - 1][1];
}

// ============================================================================
// PROMPT UTILITIES
// ============================================================================

async function promptText(
  question: string,
  options: {
    required?: boolean;
    default?: string;
    validator?: (input: string) => boolean;
    hint?: string;
  } = {},
): Promise<string> {
  while (true) {
    const hint = options.hint ? ` (${options.hint})` : "";
    const defaultText = options.default ? ` [${options.default}]` : "";

    const prompt = `${question}${hint}${defaultText}: `;

    await Deno.stdout.write(new TextEncoder().encode(prompt));

    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);
    const input = new TextDecoder().decode(buf.subarray(0, n || 0)).trim();

    if (!input && options.default) {
      return options.default;
    }

    if (options.required && !input) {
      console.log("❌ This field is required.");
      continue;
    }

    if (!input) {
      return "";
    }

    if (options.validator && !options.validator(input)) {
      console.log("❌ Invalid input format. Please try again.");
      continue;
    }

    return input;
  }
}

async function promptNumber(
  question: string,
  options: { min?: number; max?: number; default?: number } = {},
): Promise<number> {
  while (true) {
    const rangeText = options.min !== undefined && options.max !== undefined
      ? ` (${options.min}-${options.max})`
      : "";
    const defaultText = options.default !== undefined
      ? ` [${options.default}]`
      : "";

    const prompt = `${question}${rangeText}${defaultText}: `;

    await Deno.stdout.write(new TextEncoder().encode(prompt));

    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);
    const input = new TextDecoder().decode(buf.subarray(0, n || 0)).trim();

    if (!input && options.default !== undefined) {
      return options.default;
    }

    const num = parseInt(input, 10);

    if (isNaN(num)) {
      console.log("❌ Please enter a valid number.");
      continue;
    }

    if (options.min !== undefined && num < options.min) {
      console.log(`❌ Number must be at least ${options.min}.`);
      continue;
    }

    if (options.max !== undefined && num > options.max) {
      console.log(`❌ Number must be at most ${options.max}.`);
      continue;
    }

    return num;
  }
}

async function promptYesNo(
  question: string,
  defaultValue: boolean = false,
): Promise<boolean> {
  const defaultText = defaultValue ? "[Y/n]" : "[y/N]";
  const prompt = `${question} ${defaultText}: `;

  await Deno.stdout.write(new TextEncoder().encode(prompt));

  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  const input = new TextDecoder().decode(buf.subarray(0, n || 0)).trim()
    .toLowerCase();

  if (!input) {
    return defaultValue;
  }

  return input === "y" || input === "yes";
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateBusinessName(name: string): boolean {
  const regex = /^[A-Za-z0-9\s\-&',\.]{2,100}$/;
  return regex.test(name);
}

function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function validateEmail(email: string): boolean {
  const regex =
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email);
}

function validateBusinessInfo(
  info: BusinessInfo,
): { valid: boolean; error?: string } {
  if (!validateBusinessName(info.name)) {
    return { valid: false, error: "Invalid business name format" };
  }

  if (!validatePhoneNumber(info.phone)) {
    return { valid: false, error: "Invalid phone number format" };
  }

  if (!validateEmail(info.email)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (!info.address.street || !info.address.city || !info.address.state) {
    return { valid: false, error: "Incomplete address information" };
  }

  return { valid: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${
      cleaned.slice(6)
    }`;
  }

  return phone;
}

function formatFullAddress(address: BusinessInfo["address"]): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}

function formatAddressDisplay(address: BusinessInfo["address"]): string {
  return `${address.city}, ${address.state}`;
}

function generateGoogleMapsURL(address: BusinessInfo["address"]): string {
  const query = encodeURIComponent(formatFullAddress(address));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function generateMetaDescription(info: BusinessInfo): string {
  return `${info.name} - Professional ${info.businessType} services in ${info.address.city}, ${info.address.state}. Contact us at ${
    formatPhoneDisplay(info.phone)
  }.`;
}

function generateMetaKeywords(info: BusinessInfo): string {
  const industry = INDUSTRIES.find((i) => i.id === info.industry);
  const keywords = [
    info.businessType.toLowerCase(),
    info.address.city.toLowerCase(),
    info.address.state.toLowerCase(),
    info.industry,
  ];

  if (industry) {
    keywords.push(...industry.businessTypes.map((t) => t.toLowerCase()));
  }

  return keywords.join(", ");
}

function generateCanonicalURL(info: BusinessInfo): string {
  const slug = generateSiteName(info.name);
  return `https://${slug}.example.com/`;
}

function generateHeroHeading(info: BusinessInfo): string {
  return `Welcome to ${info.name}`;
}

function generateHeroSubheading(info: BusinessInfo): string {
  const templates: Record<string, string> = {
    construction:
      `Professional ${info.businessType} serving ${info.address.city}`,
    healthcare: `Your trusted ${info.businessType} in ${info.address.city}`,
    "professional-services":
      `Expert ${info.businessType} for ${info.address.city} and surrounding areas`,
    logistics: `Reliable ${info.businessType} throughout ${info.address.state}`,
    retail: `Quality products and service in ${info.address.city}`,
    "food-beverage":
      `Experience exceptional ${info.businessType} in ${info.address.city}`,
  };

  return templates[info.industry] || `Quality service in ${info.address.city}`;
}

function generateSiteName(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateOpeningHoursSchema(): string {
  return JSON.stringify([
    "Monday 9:00-17:00",
    "Tuesday 9:00-17:00",
    "Wednesday 9:00-17:00",
    "Thursday 9:00-17:00",
    "Friday 9:00-17:00",
  ]);
}

// ============================================================================
// FRONTEND GENERATION - PUBLIC DIRECTORY ONLY
//
// Note: This command does NOT create symlinks or core framework structure.
// The 'init' command handles all symlinks to the existing core directory.
// This command focuses solely on generating the public directory and
// business-specific configuration files.
// ============================================================================

async function generateFrontend(
  businessInfo: BusinessInfo,
  siteDirectory: string,
  context: CLIContext,
): Promise<void> {
  console.log("\n📝 Generating frontend files...");

  // Create public directory structure
  await createPublicDirectories(siteDirectory);

  // Generate business configuration file
  await generateBusinessConfig(businessInfo, siteDirectory);

  // Generate HTML pages
  await generateHTMLPages(businessInfo, siteDirectory);

  // Generate CSS stylesheets
  await generateStylesheets(businessInfo, siteDirectory);

  // Generate JavaScript files
  await generateScripts(businessInfo, siteDirectory);

  // Create placeholder images directories
  await createImagePlaceholders(siteDirectory);

  console.log("✅ All frontend files generated successfully!");
}

async function createPublicDirectories(siteDirectory: string): Promise<void> {
  const directories = [
    join(siteDirectory, "public"),
    join(siteDirectory, "public/pages"),
    join(siteDirectory, "public/pages/home"),
    join(siteDirectory, "public/pages/about"),
    join(siteDirectory, "public/pages/services"),
    join(siteDirectory, "public/pages/contact"),
    join(siteDirectory, "public/styles"),
    join(siteDirectory, "public/scripts"),
    join(siteDirectory, "public/images"),
    join(siteDirectory, "public/images/gallery"),
    join(siteDirectory, "public/images/team"),
    join(siteDirectory, "public/images/icons"),
    join(siteDirectory, "public/images/logo"),
  ];

  for (const dir of directories) {
    await ensureDir(dir);
  }

  console.log(`  ✅ Created public directory structure`);
}

async function generateBusinessConfig(
  businessInfo: BusinessInfo,
  siteDirectory: string,
): Promise<void> {
  const config = `// Business Configuration
// Generated by: genesis new
// Date: ${new Date().toISOString()}

/**
 * Business Information
 * 
 * This file contains business-specific configuration.
 * Update this file to change business details across the site.
 */

export interface BusinessConfig {
  name: string;
  tagline: string;
  industry: string;
  businessType: string;
  
  contact: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  
  branding: {
    colorScheme: string;
    colors: {
      primaryDark: string;
      primaryMedium: string;
      primaryLight: string;
      accentPrimary: string;
      accentSecondary: string;
      textPrimary: string;
      textSecondary: string;
      textTertiary: string;
    };
  };
  
  seo: {
    description: string;
    keywords: string[];
  };
  
  social: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export const businessConfig: BusinessConfig = {
  name: "${businessInfo.name}",
  tagline: "${generateHeroSubheading(businessInfo)}",
  industry: "${businessInfo.industry}",
  businessType: "${businessInfo.businessType}",
  
  contact: {
    phone: "${businessInfo.phone}",
    email: "${businessInfo.email}",
    address: {
      street: "${businessInfo.address.street}",
      city: "${businessInfo.address.city}",
      state: "${businessInfo.address.state}",
      zip: "${businessInfo.address.zip}",
      country: "${businessInfo.address.country}"
    }
  },
  
  branding: {
    colorScheme: "${businessInfo.colorScheme.name}",
    colors: {
      primaryDark: "${businessInfo.colorScheme.primaryDark}",
      primaryMedium: "${businessInfo.colorScheme.primaryMedium}",
      primaryLight: "${businessInfo.colorScheme.primaryLight}",
      accentPrimary: "${businessInfo.colorScheme.accentPrimary}",
      accentSecondary: "${businessInfo.colorScheme.accentSecondary}",
      textPrimary: "${businessInfo.colorScheme.textPrimary}",
      textSecondary: "${businessInfo.colorScheme.textSecondary}",
      textTertiary: "${businessInfo.colorScheme.textTertiary}"
    }
  },
  
  seo: {
    description: "${generateMetaDescription(businessInfo)}",
    keywords: ${JSON.stringify(generateMetaKeywords(businessInfo).split(", "))}
  },
  
  social: {
    // Add your social media URLs here
    // facebook: "https://facebook.com/yourbusiness",
    // twitter: "https://twitter.com/yourbusiness",
    // instagram: "https://instagram.com/yourbusiness",
    // linkedin: "https://linkedin.com/company/yourbusiness"
  }
};

export default businessConfig;
`;

  const configPath = join(siteDirectory, "business.config.ts");
  await Deno.writeTextFile(configPath, config);

  console.log(`  ✅ Generated: business.config.ts`);
}

async function generateHTMLPages(
  businessInfo: BusinessInfo,
  siteDirectory: string,
): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${generateMetaDescription(businessInfo)}">
    <meta name="keywords" content="${generateMetaKeywords(businessInfo)}">
    
    <title>${businessInfo.name} - ${businessInfo.businessType} in ${businessInfo.address.city}</title>
    
    <!-- Schema.org Local Business -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "${businessInfo.name}",
      "description": "${generateMetaDescription(businessInfo)}",
      "telephone": "${businessInfo.phone}",
      "email": "${businessInfo.email}",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "${businessInfo.address.street}",
        "addressLocality": "${businessInfo.address.city}",
        "addressRegion": "${businessInfo.address.state}",
        "postalCode": "${businessInfo.address.zip}",
        "addressCountry": "${businessInfo.address.country}"
      },
      "openingHours": ${generateOpeningHoursSchema()},
      "areaServed": ["${businessInfo.address.city}"]
    }
    </script>
    
    <link rel="canonical" href="${generateCanonicalURL(businessInfo)}">
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <header role="banner">
        <div class="container">
            <div class="header-content">
                <div class="logo">${businessInfo.name}</div>
                <nav role="navigation" aria-label="Main navigation">
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/pages/about/">About</a></li>
                        <li><a href="/pages/services/">Services</a></li>
                        <li><a href="/pages/contact/">Contact</a></li>
                    </ul>
                </nav>
            </div>
        </div>
    </header>

    <main role="main">
        <section class="hero" aria-label="Hero section">
            <div class="container">
                <div class="hero-content">
                    <h1>${generateHeroHeading(businessInfo)}</h1>
                    <p class="hero-subheading">${
    generateHeroSubheading(businessInfo)
  }</p>
                    
                    <div class="hero-cta">
                        <a href="#contact" class="btn btn-primary" aria-label="Contact us">Get Started</a>
                        <a href="/pages/services/" class="btn btn-secondary" aria-label="View our services">Our Services</a>
                    </div>
                    
                    <div class="hero-contact" id="contact-info">
                        <div class="contact-item">
                            <a href="tel:${businessInfo.phone}" class="contact-link phone-link" aria-label="Call ${businessInfo.name}">
                                📞 ${formatPhoneDisplay(businessInfo.phone)}
                            </a>
                        </div>
                        
                        <div class="contact-item">
                            <a href="mailto:${businessInfo.email}" class="contact-link email-link" aria-label="Email ${businessInfo.name}">
                                ✉️ ${businessInfo.email}
                            </a>
                        </div>
                        
                        <div class="contact-item">
                            <a href="${
    generateGoogleMapsURL(businessInfo.address)
  }" class="contact-link address-link" target="_blank" rel="noopener" aria-label="View ${businessInfo.name} location on map">
                                📍 ${formatAddressDisplay(businessInfo.address)}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
        <section class="section" id="about" aria-label="About us">
            <div class="container">
                <h2>About ${businessInfo.name}</h2>
                <p>Welcome to ${businessInfo.name}, your trusted ${businessInfo.businessType} in ${businessInfo.address.city}, ${businessInfo.address.state}.</p>
                <p>We are committed to providing exceptional service and quality workmanship to all our clients.</p>
            </div>
        </section>
        
        <section class="section" id="services" aria-label="Our services">
            <div class="container">
                <h2>Our Services</h2>
                <p>Discover the range of professional services we offer to meet your needs.</p>
                <!-- Add your services here -->
            </div>
        </section>
        
        <section class="section" id="contact" aria-label="Contact information">
            <div class="container">
                <h2>Contact Us</h2>
                <div class="contact-info">
                    <div class="contact-item">
                        <h3>📞 Phone</h3>
                        <a href="tel:${businessInfo.phone}">${
    formatPhoneDisplay(businessInfo.phone)
  }</a>
                    </div>
                    <div class="contact-item">
                        <h3>✉️ Email</h3>
                        <a href="mailto:${businessInfo.email}">${businessInfo.email}</a>
                    </div>
                    <div class="contact-item">
                        <h3>📍 Address</h3>
                        <p>${formatFullAddress(businessInfo.address)}</p>
                        <a href="${
    generateGoogleMapsURL(businessInfo.address)
  }" target="_blank" rel="noopener">View on Map</a>
                    </div>
                </div>
            </div>
        </section>
    </main>
    
    <footer role="contentinfo">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>${businessInfo.name}</h3>
                    <p>${generateHeroSubheading(businessInfo)}</p>
                </div>
                
                <div class="footer-section">
                    <h4>Contact</h4>
                    <p>Phone: <a href="tel:${businessInfo.phone}">${
    formatPhoneDisplay(businessInfo.phone)
  }</a></p>
                    <p>Email: <a href="mailto:${businessInfo.email}">${businessInfo.email}</a></p>
                </div>
                
                <div class="footer-section">
                    <h4>Location</h4>
                    <p>${formatFullAddress(businessInfo.address)}</p>
                </div>
            </div>

            <div class="footer-bottom">
                <p>&copy; ${
    new Date().getFullYear()
  } ${businessInfo.name}. All rights reserved.</p>
                <p>Built with <a href="https://github.com/grenas405/deno-genesis" target="_blank" rel="noopener">Deno Genesis Framework</a></p>
            </div>
        </div>
    </footer>

    <script src="/scripts/main.js"></script>
</body>
</html>`;

  const outputPath = join(siteDirectory, "public/pages/home/index.html");
  await Deno.writeTextFile(outputPath, html);

  console.log(`  ✅ Generated: public/pages/home/index.html`);
}

async function generateStylesheets(
  businessInfo: BusinessInfo,
  siteDirectory: string,
): Promise<void> {
  const css = `/* 
 * ${businessInfo.name} - Main Stylesheet
 * Generated by: genesis new
 * Industry: ${businessInfo.industry}
 * Color Scheme: ${businessInfo.colorScheme.name}
 */

:root {
  /* Color Scheme - ${businessInfo.colorScheme.name} */
  --color-primary-dark: ${businessInfo.colorScheme.primaryDark};
  --color-primary-medium: ${businessInfo.colorScheme.primaryMedium};
  --color-primary-light: ${businessInfo.colorScheme.primaryLight};
  --color-accent-primary: ${businessInfo.colorScheme.accentPrimary};
  --color-accent-secondary: ${businessInfo.colorScheme.accentSecondary};
  --color-text-primary: ${businessInfo.colorScheme.textPrimary};
  --color-text-secondary: ${businessInfo.colorScheme.textSecondary};
  --color-text-tertiary: ${businessInfo.colorScheme.textTertiary};
  
  /* Typography */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-heading: 'Inter', sans-serif;
  --font-size-base: 16px;
  --font-size-small: 0.875rem;
  --font-size-large: 1.125rem;
  --font-size-h1: 2.5rem;
  --font-size-h2: 2rem;
  --font-size-h3: 1.75rem;
  --line-height-base: 1.6;
  --line-height-heading: 1.2;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  /* Layout */
  --container-max-width: 1200px;
  --container-padding: var(--spacing-lg);
  
  /* Borders */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
}

/* Reset & Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: var(--font-size-base);
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family-primary);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  background-color: var(--color-primary-dark);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-family-heading);
  font-weight: 700;
  line-height: var(--line-height-heading);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

h1 { font-size: var(--font-size-h1); }
h2 { font-size: var(--font-size-h2); }
h3 { font-size: var(--font-size-h3); }

p {
  margin-bottom: var(--spacing-md);
}

a {
  color: var(--color-accent-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-accent-secondary);
}

/* Layout */
.container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.section {
  padding: var(--spacing-3xl) 0;
}

/* Header */
header {
  background-color: var(--color-primary-dark);
  padding: var(--spacing-lg) 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: var(--shadow-md);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: var(--font-size-h3);
  font-weight: 700;
  color: var(--color-text-primary);
}

nav ul {
  display: flex;
  list-style: none;
  gap: var(--spacing-xl);
}

nav a {
  color: var(--color-text-secondary);
  font-weight: 500;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
}

nav a:hover {
  background-color: var(--color-primary-medium);
  color: var(--color-text-primary);
}

/* Hero Section */
.hero {
  background: linear-gradient(
    135deg,
    var(--color-primary-dark) 0%,
    var(--color-primary-medium) 100%
  );
  padding: var(--spacing-3xl) 0;
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: var(--spacing-lg);
}

.hero-subheading {
  font-size: var(--font-size-large);
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto var(--spacing-xl);
}

.hero-cta {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-bottom: var(--spacing-2xl);
}

.hero-contact {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  justify-content: center;
  margin-top: var(--spacing-2xl);
}

/* Buttons */
.btn {
  display: inline-block;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--border-radius-md);
  font-weight: 600;
  text-align: center;
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  font-size: var(--font-size-base);
}

.btn-primary {
  background-color: var(--color-accent-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-secondary {
  background-color: transparent;
  color: var(--color-accent-primary);
  border: 2px solid var(--color-accent-primary);
}

.btn-secondary:hover {
  background-color: var(--color-accent-primary);
  color: white;
}

/* Contact Section */
.contact-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
  margin-top: var(--spacing-2xl);
}

.contact-item {
  padding: var(--spacing-lg);
  background-color: var(--color-primary-medium);
  border-radius: var(--border-radius-lg);
  text-align: center;
  transition: transform var(--transition-base);
}

.contact-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.contact-link {
  color: var(--color-text-primary);
  font-size: var(--font-size-large);
  font-weight: 600;
}

/* Footer */
footer {
  background-color: var(--color-primary-dark);
  padding: var(--spacing-2xl) 0 var(--spacing-lg);
  margin-top: var(--spacing-3xl);
  border-top: 1px solid var(--color-primary-medium);
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.footer-section h3,
.footer-section h4 {
  margin-bottom: var(--spacing-md);
  color: var(--color-text-primary);
}

.footer-bottom {
  text-align: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-primary-medium);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-small);
}

/* Responsive Design */
@media (max-width: 768px) {
  :root {
    --font-size-h1: 2rem;
    --font-size-h2: 1.75rem;
    --font-size-h3: 1.5rem;
    --container-padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  nav ul {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }
  
  .hero h1 {
    font-size: 2rem;
  }
  
  .hero-cta {
    flex-direction: column;
    align-items: stretch;
  }
  
  .hero-contact {
    flex-direction: column;
  }
}

/* Utility Classes */
.text-center { text-align: center; }
.mt-lg { margin-top: var(--spacing-lg); }
.mb-lg { margin-bottom: var(--spacing-lg); }
`;

  const stylePath = join(siteDirectory, "public/styles/main.css");
  await Deno.writeTextFile(stylePath, css);

  console.log(`  ✅ Generated: public/styles/main.css`);
}

async function generateScripts(
  businessInfo: BusinessInfo,
  siteDirectory: string,
): Promise<void> {
  const js = `/**
 * ${businessInfo.name} - Main JavaScript
 * Generated by: genesis new
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('${businessInfo.name} - Site initialized');
  
  initSmoothScroll();
  initMobileMenu();
});

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * Mobile menu functionality
 * Add mobile menu toggle button and expand this function as needed
 */
function initMobileMenu() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  // TODO: Add mobile menu toggle functionality
  // This is a placeholder for future enhancement
}
`;

  const scriptPath = join(siteDirectory, "public/scripts/main.js");
  await Deno.writeTextFile(scriptPath, js);

  console.log(`  ✅ Generated: public/scripts/main.js`);
}

async function createImagePlaceholders(siteDirectory: string): Promise<void> {
  // Create README files in image directories to explain their purpose

  const galleryReadme = `# Gallery Images

Place your project/portfolio images here.

Recommended:
- Format: JPG or WebP
- Size: 1200x800px (landscape) or 800x1200px (portrait)
- Optimize for web (< 200KB per image)
- Use descriptive filenames (e.g., kitchen-remodel-2024.jpg)
`;

  const teamReadme = `# Team Photos

Place staff/team member photos here.

Recommended:
- Format: JPG or WebP
- Size: 400x400px (square)
- Professional headshots
- Consistent lighting and background
- Optimize for web (< 100KB per image)
`;

  const logoReadme = `# Logo Files

Place your business logo files here.

Recommended formats:
- logo.svg (vector, preferred)
- logo.png (transparent background, high-res)
- favicon.ico (16x16, 32x32, 48x48)
`;

  await Deno.writeTextFile(
    join(siteDirectory, "public/images/gallery/README.md"),
    galleryReadme,
  );

  await Deno.writeTextFile(
    join(siteDirectory, "public/images/team/README.md"),
    teamReadme,
  );

  await Deno.writeTextFile(
    join(siteDirectory, "public/images/logo/README.md"),
    logoReadme,
  );

  console.log(`  ✅ Created image directory placeholders`);
}

// ============================================================================
// EXPORT FOR CLI INTEGRATION
// ============================================================================

export default newCommand;
