// -------------------------------------------------------------------------
// DocuMind 100+ Free Presentation & Document Template Catalog
// 100% Free Access Policy: Every template is fully available with no paywalls.
// -------------------------------------------------------------------------

import type { ThemeKind } from "@/components/landing/ThemeThumb";

export type TemplateCategory =
  | "All"
  | "Business"
  | "Education"
  | "Research"
  | "Technology"
  | "Creative"
  | "Portfolio"
  | "Reports"
  | "Academic"
  | "Pitch Decks"
  | "Minimal";

export interface SlideTemplate {
  title: string;
  subtitle?: string;
  bullets?: string[];
  layout: "title" | "agenda" | "content" | "two-column" | "metrics" | "conclusion";
}

export interface TemplateItem {
  id: string;
  name: string;
  category: string;
  kind: ThemeKind;
  slidesCount: number;
  fonts: string;
  colors: {
    primary: string;
    accent: string;
    bg: string;
  };
  bestFor: string;
  description: string;
  tags: string[];
  slides: SlideTemplate[];
  tier: "free" | "pro";
  isFree: boolean;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "All",
  "Business",
  "Education",
  "Research",
  "Technology",
  "Creative",
  "Portfolio",
  "Reports",
  "Academic",
  "Pitch Decks",
  "Minimal",
];

export const TEMPLATES: TemplateItem[] = [
  {
    id: "executive-brief",
    name: "Executive Brief",
    category: "Business",
    kind: "business",
    slidesCount: 20,
    fonts: "Newsreader + Manrope",
    colors: {
      primary: "#0F294A",
      accent: "#2563EB",
      bg: "#FAF8F5",
    },
    bestFor: "Quarterly reviews, board updates, operating plans",
    description:
      "Subdued corporate aesthetic engineered for rapid C-suite decision making and tabular clarity.",
    tags: ["Executive", "Board", "Corporate", "Quarterly"],
    slides: [
      {
        title: "Quarterly Executive Brief",
        subtitle: "Q4 Performance & Strategic Priorities",
        layout: "title",
      },
      {
        title: "Executive Agenda",
        bullets: ["Financial Performance", "Market Expansion", "Risk Factors", "2026 Objectives"],
        layout: "agenda",
      },
      {
        title: "Core Financial Metrics",
        bullets: [
          "ARR Growth +42% YoY",
          "Net Revenue Retention 118%",
          "Gross Margin expansion to 78%",
        ],
        layout: "metrics",
      },
      {
        title: "Strategic Roadmap",
        bullets: [
          "Phase 1: Enterprise Core",
          "Phase 2: Global Rollout",
          "Phase 3: Autonomous Workflows",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "corporate-strategy-2026",
    name: "Corporate Strategy 2026",
    category: "Business",
    kind: "business",
    slidesCount: 24,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#1E3A8A",
      accent: "#3B82F6",
      bg: "#FFFFFF",
    },
    bestFor: "Long-term organizational vision, market positioning, competitive moats",
    description: "Modern strategic framework decks with clear vision-to-execution hierarchies.",
    tags: ["Strategy", "Vision", "Enterprise", "Roadmap"],
    slides: [
      {
        title: "Corporate Strategy 2026",
        subtitle: "Building Category Leadership",
        layout: "title",
      },
      {
        title: "Strategic Pillars",
        bullets: ["Operational Excellence", "Customer Intimacy", "Product Innovation"],
        layout: "agenda",
      },
      {
        title: "Competitive Differentiation",
        bullets: ["Proprietary Processing Engine", "Zero Vendor Lock-in", "Community Distribution"],
        layout: "two-column",
      },
      {
        title: "Execution Timetable",
        bullets: ["H1 Milestones", "H2 Expansion", "Key Performance Indicators"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "board-governance-deck",
    name: "Board Governance Deck",
    category: "Business",
    kind: "business",
    slidesCount: 28,
    fonts: "Cormorant Garamond + Helvetica Neue",
    colors: {
      primary: "#111827",
      accent: "#4B5563",
      bg: "#F9FAFB",
    },
    bestFor: "Formal board of directors meetings, compliance, audit resolutions",
    description: "High-gravity governance deck designed for fiduciary rigor and voting matters.",
    tags: ["Board", "Governance", "Audit", "Compliance"],
    slides: [
      {
        title: "Board of Directors Regular Meeting",
        subtitle: "Fiduciary Review & Resolutions",
        layout: "title",
      },
      {
        title: "Order of Business",
        bullets: ["Call to Order", "Committee Reports", "Audit & Compensation", "Formal Votes"],
        layout: "agenda",
      },
      {
        title: "Audit Committee Summary",
        bullets: ["Clean Audit Opinion", "Internal Controls Validated", "Risk Register Review"],
        layout: "content",
      },
      {
        title: "Board Resolutions",
        bullets: ["Resolution 24-B Passed", "Budget Authorization", "Adjournment"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "global-supply-chain-brief",
    name: "Global Supply Chain Brief",
    category: "Business",
    kind: "business",
    slidesCount: 18,
    fonts: "Space Grotesk + Inter",
    colors: {
      primary: "#064E3B",
      accent: "#10B981",
      bg: "#F0FDF4",
    },
    bestFor: "Logistics optimization, procurement, vendor resilience",
    description:
      "Logistics-oriented presentation with route flowcharts and vendor reliability scorecards.",
    tags: ["Logistics", "Procurement", "Operations", "Manufacturing"],
    slides: [
      {
        title: "Global Supply Chain Assessment",
        subtitle: "Resilience, Lead Times & Optimization",
        layout: "title",
      },
      {
        title: "Network Status",
        bullets: ["Port Congestion Indices", "Route Diversification", "Inventory Buffer Targets"],
        layout: "content",
      },
      {
        title: "Supplier Reliability Matrix",
        bullets: ["Tier 1 Suppliers: 99.2%", "Secondary Redundancy: 100% active"],
        layout: "metrics",
      },
      {
        title: "Mitigation Playbook",
        bullets: ["Nearshoring Initiatives", "Safety Stock Policy", "Quarterly Review"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "commercial-banking-advisory",
    name: "Commercial Banking Advisory",
    category: "Business",
    kind: "business",
    slidesCount: 22,
    fonts: "Newsreader + Calibri",
    colors: {
      primary: "#0C4A6E",
      accent: "#0284C7",
      bg: "#F8FAFC",
    },
    bestFor: "Treasury management, credit facilities, liquidity analysis",
    description:
      "Financial institution presentation with debt maturity schedules and cash conversion metrics.",
    tags: ["Banking", "Treasury", "Finance", "Credit"],
    slides: [
      {
        title: "Commercial Banking & Treasury Proposal",
        subtitle: "Optimizing Working Capital",
        layout: "title",
      },
      {
        title: "Credit Facility Structure",
        bullets: ["Revolving Credit Line", "Term Loan Amortization", "Covenant Highlights"],
        layout: "two-column",
      },
      {
        title: "Liquidity Analysis",
        bullets: ["Cash Conversion Cycle", "Yield Optimization", "Automated Sweeps"],
        layout: "metrics",
      },
      {
        title: "Implementation Schedule",
        bullets: ["Onboarding Phase", "Integration Testing", "Go-Live Date"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "ma-advisory-deck",
    name: "Mergers & Acquisitions Advisory",
    category: "Business",
    kind: "business",
    slidesCount: 26,
    fonts: "Playfair Display + Manrope",
    colors: {
      primary: "#312E81",
      accent: "#6366F1",
      bg: "#FAFAFA",
    },
    bestFor: "Deal origination, synergy models, valuation teasers",
    description:
      "Investment banking standard layout with transaction rationale and post-merger integration timelines.",
    tags: ["M&A", "Deal", "Investment Banking", "Valuation"],
    slides: [
      {
        title: "Project Apex: Strategic Acquisition",
        subtitle: "Confidential Information Memorandum",
        layout: "title",
      },
      {
        title: "Transaction Rationale",
        bullets: [
          "Accretive Synergy Realization",
          "Geographic Market Expansion",
          "IP Portfolio Addition",
        ],
        layout: "agenda",
      },
      {
        title: "Valuation & Multiples",
        bullets: ["EV/EBITDA Benchmarks", "DCF Sensitivity Analysis", "Debt Financing Terms"],
        layout: "metrics",
      },
      {
        title: "Closing Conditions",
        bullets: ["Regulatory Clearance", "Shareholder Approval", "100-Day Integration Plan"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "franchise-expansion-plan",
    name: "Franchise Expansion Plan",
    category: "Business",
    kind: "business",
    slidesCount: 16,
    fonts: "Outfit + Public Sans",
    colors: {
      primary: "#831843",
      accent: "#EC4899",
      bg: "#FFF1F2",
    },
    bestFor: "Multi-unit franchise sales, territory mapping, unit economics",
    description:
      "High-energy commercial development presentation with territory maps and payback models.",
    tags: ["Franchise", "Retail", "Expansion", "Unit Economics"],
    slides: [
      {
        title: "Franchise Expansion Playbook",
        subtitle: "Multi-Unit Opportunity 2026-2028",
        layout: "title",
      },
      {
        title: "Unit Economics",
        bullets: [
          "Average Unit Volume: $2.4M",
          "Store-Level EBITDA: 23%",
          "18-Month CapEx Payback",
        ],
        layout: "metrics",
      },
      {
        title: "Territory Allocation",
        bullets: [
          "Exclusive Metro Territories",
          "Development Agreement Timelines",
          "Site Criteria",
        ],
        layout: "two-column",
      },
      {
        title: "Support Systems",
        bullets: ["Supply Chain Integration", "Brand Marketing Fund", "Training Academy"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "performance-management-review",
    name: "Performance Management Review",
    category: "Business",
    kind: "business",
    slidesCount: 20,
    fonts: "DM Sans + Inter",
    colors: {
      primary: "#1E293B",
      accent: "#64748B",
      bg: "#F8FAFC",
    },
    bestFor: "Annual talent reviews, 9-box grids, leadership pipeline",
    description:
      "People operations framework with succession planning and compensation band transparency.",
    tags: ["HR", "Talent", "Performance", "Leadership"],
    slides: [
      {
        title: "Annual Talent & Performance Review",
        subtitle: "Organizational Health & Succession",
        layout: "title",
      },
      {
        title: "Talent Distribution",
        bullets: ["9-Box Calibration", "Top Talent Retention: 96%", "Promotions & Mobility"],
        layout: "metrics",
      },
      {
        title: "Leadership Succession",
        bullets: [
          "Ready-Now Candidates: 82%",
          "Bench Strength by Department",
          "Critical Skills Training",
        ],
        layout: "two-column",
      },
      {
        title: "Development Commitments",
        bullets: ["Individual Growth Plans", "Executive Mentorship", "Quarterly Checkpoints"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "enterprise-procurement-proposal",
    name: "Enterprise Procurement Proposal",
    category: "Business",
    kind: "business",
    slidesCount: 18,
    fonts: "Public Sans + Roboto",
    colors: {
      primary: "#14532D",
      accent: "#22C55E",
      bg: "#F0FDF4",
    },
    bestFor: "Vendor selection, RFP evaluation, SLA negotiations",
    description:
      "Structured evaluation deck comparing vendor scorecards, compliance criteria, and pricing tiers.",
    tags: ["Procurement", "RFP", "Vendor", "Enterprise"],
    slides: [
      {
        title: "Vendor Selection Recommendation",
        subtitle: "RFP-2026-08 Evaluation Committee Report",
        layout: "title",
      },
      {
        title: "Scoring Summary",
        bullets: [
          "Security & Compliance: 98/100",
          "Feature Coverage: 95/100",
          "TCO Advantage: 24%",
        ],
        layout: "metrics",
      },
      {
        title: "SLA Framework",
        bullets: [
          "99.99% Availability Guarantee",
          "15-Minute Critical Incident SLA",
          "Dedicated TAM Support",
        ],
        layout: "content",
      },
      {
        title: "Final Recommendation",
        bullets: ["Award Contract to Vendor A", "Negotiation Addendum", "Phased Migration"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "retail-omnichannel-blueprint",
    name: "Retail Omni-Channel Blueprint",
    category: "Business",
    kind: "business",
    slidesCount: 20,
    fonts: "Montserrat + Open Sans",
    colors: {
      primary: "#431407",
      accent: "#F97316",
      bg: "#FFF7ED",
    },
    bestFor: "BOPIS rollouts, store modernization, clienteling apps",
    description:
      "Retail operations layout focused on customer journey mapping and unified commerce.",
    tags: ["Retail", "Omnichannel", "Ecommerce", "Store Ops"],
    slides: [
      {
        title: "Omni-Channel Retail Strategy",
        subtitle: "Unifying In-Store & Digital Touchpoints",
        layout: "title",
      },
      {
        title: "Customer Journey Flow",
        bullets: ["Browse Online", "Real-Time Local Inventory", "Seamless Curbside Pickup"],
        layout: "agenda",
      },
      {
        title: "Conversion Lift",
        bullets: ["Digital Influenced Store Sales +35%", "Cross-Channel Basket Size +28%"],
        layout: "metrics",
      },
      {
        title: "Store Associate Enablement",
        bullets: ["Mobile POS Devices", "Clienteling Profiles", "Inventory Scanning"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "brand-governance-deck",
    name: "Brand Governance & Brand Guidelines",
    category: "Business",
    kind: "business",
    slidesCount: 22,
    fonts: "Syne + Inter",
    colors: {
      primary: "#18181B",
      accent: "#3B82F6",
      bg: "#FAFAFA",
    },
    bestFor: "Corporate identity rollouts, marketing enablement, partner standards",
    description:
      "Disciplined brand architecture deck defining logo safe zones, voice principles, and visual assets.",
    tags: ["Brand", "Marketing", "Identity", "Design System"],
    slides: [
      {
        title: "Brand Identity Standards",
        subtitle: "Voice, Typography, Palette & Expression",
        layout: "title",
      },
      {
        title: "Core Brand Principles",
        bullets: ["Precision", "Simplicity", "Humanity", "Accessibility"],
        layout: "agenda",
      },
      {
        title: "Color & Typography Systems",
        bullets: [
          "Primary Palette: Deep Midnight & Warm Ivory",
          "Accent: Electric Blue",
          "Dual Editorial Hierarchy",
        ],
        layout: "two-column",
      },
      {
        title: "Asset Repositories & Approvals",
        bullets: ["Figma Token Library", "Vector Emblem CDN", "Brand Council Review"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "classroom-bright",
    name: "Classroom Bright",
    category: "Education",
    kind: "education",
    slidesCount: 18,
    fonts: "Outfit + Public Sans",
    colors: {
      primary: "#1E40AF",
      accent: "#3B82F6",
      bg: "#EFF6FF",
    },
    bestFor: "Course modules, student workshops, lecture series",
    description:
      "Accessible, high-contrast layouts designed to engage learners and highlight key conceptual checkpoints.",
    tags: ["Classroom", "Lecture", "Teaching", "High School"],
    slides: [
      {
        title: "Course Module 1: Foundations",
        subtitle: "Core Concepts & Learning Outcomes",
        layout: "title",
      },
      {
        title: "Today's Learning Goals",
        bullets: ["Understand Core Terminology", "Analyze Case Scenario", "Complete Guided Lab"],
        layout: "agenda",
      },
      {
        title: "Concept Deep Dive",
        bullets: ["Definition & Etymology", "Real-World Examples", "Common Misconceptions"],
        layout: "content",
      },
      {
        title: "Knowledge Check & Reflection",
        bullets: ["Group Discussion Prompt", "Assignment Due Friday", "Office Hours Schedule"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "interactive-stem-syllabus",
    name: "Interactive STEM Syllabus",
    category: "Education",
    kind: "education",
    slidesCount: 20,
    fonts: "Space Grotesk + Fira Code",
    colors: {
      primary: "#164E63",
      accent: "#06B6D4",
      bg: "#ECFEFF",
    },
    bestFor: "Calculus, computer science, organic chemistry syllabi",
    description:
      "Formula containers and lab safety callouts tailored for technical and scientific coursework.",
    tags: ["STEM", "Math", "Science", "Syllabus"],
    slides: [
      {
        title: "Physics 201: Mechanics & Heat",
        subtitle: "Spring Semester Course Syllabus",
        layout: "title",
      },
      {
        title: "Lab Schedule & Grading",
        bullets: ["Weekly Problem Sets: 30%", "Laboratory Practicals: 35%", "Final Exam: 35%"],
        layout: "metrics",
      },
      {
        title: "Safety Regulations",
        bullets: ["Mandatory Eye Protection", "Hazardous Waste Disposal", "Emergency Protocols"],
        layout: "content",
      },
      {
        title: "Course Resources",
        bullets: ["Digital Textbook Access", "Online Forum (Piazza)", "Teaching Assistant Hours"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "university-lecture-series",
    name: "University Lecture Series",
    category: "Education",
    kind: "education",
    slidesCount: 30,
    fonts: "Fraunces + Inter",
    colors: {
      primary: "#701A75",
      accent: "#D946EF",
      bg: "#FDF4FF",
    },
    bestFor: "Undergraduate surveys, faculty seminars, symposium intros",
    description:
      "Scholarly, authoritative presentation style with prominent quote blocks and primary source citations.",
    tags: ["University", "Lecture", "Academic", "Humanities"],
    slides: [
      {
        title: "Modern European Intellectual History",
        subtitle: "Lecture 8: The Enlightenment Public Sphere",
        layout: "title",
      },
      {
        title: "Contextual Framework",
        bullets: ["Coffee Houses & Salons", "The Printing Revolution", "Censorship & Diffusion"],
        layout: "agenda",
      },
      {
        title: "Primary Source Excerpt",
        subtitle: "Kant, 'What is Enlightenment?' (1784)",
        layout: "content",
      },
      {
        title: "Seminar Questions for Thursday",
        bullets: [
          "How did literacy rates shape public debate?",
          "Critique of institutional authority",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "history-primary-sources",
    name: "History & Primary Sources",
    category: "Education",
    kind: "education",
    slidesCount: 22,
    fonts: "Cinzel + EB Garamond",
    colors: {
      primary: "#451A03",
      accent: "#D97706",
      bg: "#FEF3C7",
    },
    bestFor: "Archival studies, historical debates, museum curation",
    description:
      "Antiquarian parchment tones with dedicated artifact framing and side-by-side paleographic notes.",
    tags: ["History", "Archives", "Humanities", "Museum"],
    slides: [
      {
        title: "Archival Perspectives: 1848",
        subtitle: "Revolutionary Broadsides & Public Sentiment",
        layout: "title",
      },
      {
        title: "Document Timeline",
        bullets: ["February Proclamation", "March Demonstrations", "Constitutional Assembly"],
        layout: "agenda",
      },
      {
        title: "Artifact Comparison",
        bullets: [
          "Original Press Pamphlet vs State Gazette",
          "Transcription of Handwritten Marginalia",
        ],
        layout: "two-column",
      },
      {
        title: "Historiographical Takeaway",
        bullets: ["Evolution of Republican Slogans", "Bibliographical References"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "k12-project-showcase",
    name: "K-12 Project Showcase",
    category: "Education",
    kind: "education",
    slidesCount: 16,
    fonts: "Fredoka + Quicksand",
    colors: {
      primary: "#047857",
      accent: "#F59E0B",
      bg: "#FFFBEB",
    },
    bestFor: "Science fairs, student team presentations, parent nights",
    description:
      "Vibrant, friendly cards with milestone stickers and celebratory student accomplishment layouts.",
    tags: ["K12", "School", "Science Fair", "Projects"],
    slides: [
      {
        title: "Our Solar System Rover",
        subtitle: "Grade 6 Science Fair Capstone",
        layout: "title",
      },
      {
        title: "What We Tested",
        bullets: ["Terrain Navigation", "Solar Cell Efficiency", "Soil Sample Collection"],
        layout: "agenda",
      },
      {
        title: "Our Results & Charts",
        bullets: [
          "Rover traveled 14.2 meters",
          "Battery recharged in 45 minutes",
          "Camera snapped 60 photos",
        ],
        layout: "metrics",
      },
      {
        title: "What We Learned",
        bullets: ["Teamwork is key", "Engineering takes patience", "Special thanks to Mr. Davis!"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "digital-literacy-workshop",
    name: "Digital Literacy Workshop",
    category: "Education",
    kind: "education",
    slidesCount: 20,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#0F766E",
      accent: "#14B8A6",
      bg: "#F0FDFA",
    },
    bestFor: "Adult education, cyber hygiene, community library classes",
    description:
      "Gentle step-by-step UI guides with large high-contrast buttons and scam awareness checklists.",
    tags: ["Digital Literacy", "Community", "Security", "Workshop"],
    slides: [
      {
        title: "Navigating the Internet Safely",
        subtitle: "Spotting Phishing, Strong Passwords & Privacy",
        layout: "title",
      },
      {
        title: "Red Flags to Watch For",
        bullets: [
          "Urgent Demands for Payment",
          "Unknown Sender Email Addresses",
          "Suspicious Hyperlinks",
        ],
        layout: "content",
      },
      {
        title: "Two-Factor Authentication",
        bullets: ["SMS vs Authenticator Apps", "Why Password Alone Isn't Enough"],
        layout: "two-column",
      },
      {
        title: "Hands-on Practice Time",
        bullets: ["Inspect Sample Emails", "Generate a Strong Passphrase", "Help Desk Assistance"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "higher-ed-orientation",
    name: "Higher Ed Student Orientation",
    category: "Education",
    kind: "education",
    slidesCount: 24,
    fonts: "Cabinet Grotesk + Satoshi",
    colors: {
      primary: "#1E3A8A",
      accent: "#F97316",
      bg: "#FFF7ED",
    },
    bestFor: "Freshman week, campus services tour, residential life",
    description:
      "Campus lifestyle theme with dining hall hours, advisor scheduling, and academic integrity pledges.",
    tags: ["Orientation", "College", "Freshman", "Campus"],
    slides: [
      {
        title: "Welcome to Campus! Class of 2030",
        subtitle: "Your Guide to University Life",
        layout: "title",
      },
      {
        title: "Essential Campus Services",
        bullets: ["Student Health Center", "Writing & Tutoring Lab", "Career Services Office"],
        layout: "content",
      },
      {
        title: "Academic Calendar Highlights",
        bullets: ["Add/Drop Deadline: Sept 15", "Midterm Week: Oct 20", "Reading Period: Dec 8"],
        layout: "agenda",
      },
      {
        title: "Your Orientation Advisor Team",
        bullets: ["Dorm Resident Directors", "Peer Mentors", "Welcome Week Socials"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "comparative-lit-seminar",
    name: "Comparative Literature Seminar",
    category: "Education",
    kind: "education",
    slidesCount: 22,
    fonts: "Libre Baskerville + Karla",
    colors: {
      primary: "#3B0764",
      accent: "#A855F7",
      bg: "#FAF5FF",
    },
    bestFor: "Poetics, translation theory, literary canon analysis",
    description:
      "Editorial layout with parallel multilingual text comparison columns and thematic motif tags.",
    tags: ["Literature", "Humanities", "Comparative", "Seminar"],
    slides: [
      {
        title: "Translation & Poetic Transgression",
        subtitle: "Baudelaire, Celan, and the Polyphonic Voice",
        layout: "title",
      },
      {
        title: "Textual Divergence",
        bullets: [
          "Syntactical Inversion in German",
          "Rhythmic Alliteration in French",
          "Semantic Shift across Editions",
        ],
        layout: "two-column",
      },
      {
        title: "Hermeneutic Framework",
        bullets: ["Walter Benjamin's 'Task of the Translator'", "Fidelity vs Invention"],
        layout: "content",
      },
      {
        title: "Discussion & Close Reading",
        bullets: ["Stanza-by-Stanza Exegesis", "Next Week's Readings Assigned"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "environmental-science-lab",
    name: "Environmental Science Field Lab",
    category: "Education",
    kind: "education",
    slidesCount: 20,
    fonts: "General Sans + Newsreader",
    colors: {
      primary: "#15803D",
      accent: "#84CC16",
      bg: "#F7FEE7",
    },
    bestFor: "Hydrology, forest ecology, climate soil sampling",
    description:
      "Field notebook inspired design featuring geo-coordinates, species taxonomy tables, and pH charts.",
    tags: ["Ecology", "Environment", "Field Lab", "Biology"],
    slides: [
      {
        title: "Watershed Riparian Zone Study",
        subtitle: "Field Sampling Station 4B",
        layout: "title",
      },
      {
        title: "Water Quality Parameters",
        bullets: ["Dissolved Oxygen: 8.4 mg/L", "pH: 7.2 Neutral", "Turbidity: 3.1 NTU"],
        layout: "metrics",
      },
      {
        title: "Macroinvertebrate Biodiversity",
        bullets: [
          "Ephemeroptera (Mayflies): High Count",
          "Trichoptera (Caddisflies): Present",
          "Bioindicator Index: Excellent",
        ],
        layout: "two-column",
      },
      {
        title: "Conservation Implications",
        bullets: [
          "Riparian Buffer Restoration",
          "Long-term Monitoring Station",
          "Next Sampling Date",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "faculty-curriculum-guide",
    name: "Faculty Curriculum Guide",
    category: "Education",
    kind: "education",
    slidesCount: 26,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#1E293B",
      accent: "#38BDF8",
      bg: "#F8FAFC",
    },
    bestFor: "Departmental accreditation, rubric alignment, degree maps",
    description:
      "Institutional policy format with matrix alignment tables and learning outcome taxonomy charts.",
    tags: ["Curriculum", "Accreditation", "Faculty", "Higher Ed"],
    slides: [
      {
        title: "Undergraduate Curriculum Redesign",
        subtitle: "Five-Year Accreditation Self-Study",
        layout: "title",
      },
      {
        title: "Bloom's Taxonomy Mapping",
        bullets: [
          "Remember & Understand: 100-Level",
          "Apply & Analyze: 200/300-Level",
          "Evaluate & Create: 400-Level Capstone",
        ],
        layout: "content",
      },
      {
        title: "Assessment Rubric Standardization",
        bullets: [
          "Quantitative Reasoning Benchmark",
          "Oral Communication Standard",
          "Ethical Decision Framework",
        ],
        layout: "two-column",
      },
      {
        title: "Implementation Roadmap",
        bullets: ["Faculty Senate Vote", "Catalog Update", "Advising Degree Audit Launch"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "language-immersion-unit",
    name: "Language Immersion Unit",
    category: "Education",
    kind: "education",
    slidesCount: 18,
    fonts: "Urbanist + Plus Jakarta",
    colors: {
      primary: "#991B1B",
      accent: "#F87171",
      bg: "#FEF2F2",
    },
    bestFor: "Second language acquisition, dialogue drills, cultural vignettes",
    description:
      "Dual-language dialogue balloons, phonetic pronunciation guides, and cultural context callout cards.",
    tags: ["Language", "ESL", "Immersion", "Culture"],
    slides: [
      {
        title: "Unidad 4: En el Mercado y la Cocina",
        subtitle: "Vocabulario, Modismos y Conversación Cotidiana",
        layout: "title",
      },
      {
        title: "Diálogo en Parejas",
        bullets: [
          "¿Cuánto cuesta el kilo de tomates?",
          "¿Tiene usted cambio de veinte?",
          "Me gustaría ordenar...",
        ],
        layout: "two-column",
      },
      {
        title: "Grammar Note: Subjunctive Mood",
        bullets: ["Duda e Incertidumbre", "Expresiones de Cortesía", "Ejemplos Prácticos"],
        layout: "content",
      },
      {
        title: "Tarea y Práctica de Pronunciación",
        bullets: ["Grabar audio de 2 minutos", "Vocabulario en la app", "Próxima sesión"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "findings-column",
    name: "Findings Column",
    category: "Research",
    kind: "research",
    slidesCount: 26,
    fonts: "Crimson Pro + Manrope",
    colors: {
      primary: "#1F2937",
      accent: "#3B82F6",
      bg: "#FAF8F5",
    },
    bestFor: "Scientific symposia, clinical findings, thesis defenses",
    description:
      "Dual-column academic paper proportions with confidence regression charts and standardized footnotes.",
    tags: ["Science", "Symposium", "Thesis", "Clinical"],
    slides: [
      {
        title: "Empirical Analysis of Model Latency",
        subtitle: "Findings from 50,000 Benchmarked Invocations",
        layout: "title",
      },
      {
        title: "Methodological Overview",
        bullets: [
          "Controlled Randomized Trials",
          "p < 0.001 Statistical Significance",
          "Hardware Heterogeneity Controls",
        ],
        layout: "agenda",
      },
      {
        title: "Regression Results",
        bullets: ["Latency reduction: -34% [95% CI: -38%, -30%]", "Peak Memory Footprint: -52%"],
        layout: "metrics",
      },
      {
        title: "Conclusion & Reproducibility",
        bullets: ["Code & Dataset Open Sourced", "Zenodo DOI Registered", "Symposium Q&A"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "clinical-trial-deck",
    name: "Peer-Reviewed Clinical Trial",
    category: "Research",
    kind: "research",
    slidesCount: 28,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#0F172A",
      accent: "#0EA5E9",
      bg: "#F8FAFC",
    },
    bestFor: "Phase II/III trials, medical congresses, FDA advisory panels",
    description:
      "Strict CONSORT flow diagrams, Kaplan-Meier survival curves, and adverse event incidence tables.",
    tags: ["Clinical", "Medicine", "FDA", "Pharma"],
    slides: [
      {
        title: "Phase 3 Efficacy & Safety Evaluation",
        subtitle: "Randomized Double-Blind Placebo-Controlled Trial",
        layout: "title",
      },
      {
        title: "Patient Cohort (CONSORT Flow)",
        bullets: [
          "Enrolled: n = 1,420",
          "Randomized 1:1 Active vs Control",
          "Retention Rate: 97.4%",
        ],
        layout: "metrics",
      },
      {
        title: "Primary Endpoint Survival",
        bullets: ["Hazard Ratio: 0.68 (p = 0.002)", "Median Progression-Free Survival +5.4 mos"],
        layout: "content",
      },
      {
        title: "Safety Profile & Adverse Events",
        bullets: [
          "Grade 3/4 AEs comparable to standard of care",
          "No unexpected toxicities reported",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "quant-social-science",
    name: "Quantitative Social Science",
    category: "Research",
    kind: "research",
    slidesCount: 24,
    fonts: "Fraunces + DM Sans",
    colors: {
      primary: "#3730A3",
      accent: "#818CF8",
      bg: "#EEF2FF",
    },
    bestFor: "Sociology, political polling, econometric regressions",
    description:
      "Demographic survey heatmaps, cross-tabulation grids, and instrumental variable identification strategies.",
    tags: ["Sociology", "Economics", "Econometrics", "Polling"],
    slides: [
      {
        title: "Electoral Participation in Polarized Districts",
        subtitle: "An Instrumental Variables Approach",
        layout: "title",
      },
      {
        title: "Identification Strategy",
        bullets: ["Exogenous Boundary Shifts", "Synthetic Control Method", "Robustness Checks"],
        layout: "agenda",
      },
      {
        title: "Estimated Treatment Effects",
        bullets: ["Turnout Delta: +4.2 percentage points", "Youth Cohort Engagement: +8.1%"],
        layout: "metrics",
      },
      {
        title: "Policy Implications",
        bullets: ["Redistricting Neutrality Guidelines", "Civic Tech Interventions"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "particle-physics-defense",
    name: "Particle Physics Defense",
    category: "Research",
    kind: "research",
    slidesCount: 30,
    fonts: "Space Mono + Inter",
    colors: {
      primary: "#1E1B4B",
      accent: "#8B5CF6",
      bg: "#F5F3FF",
    },
    bestFor: "CERN analyses, dark matter searches, detector instrumentation",
    description:
      "Dark-matter distribution scatter plots, event reconstruction diagrams, and 5-sigma discovery thresholds.",
    tags: ["Physics", "CERN", "Quantum", "Defense"],
    slides: [
      {
        title: "Search for Rare Higgs Decays to Four Leptons",
        subtitle: "LHC Run 3 Collision Dataset (13.6 TeV)",
        layout: "title",
      },
      {
        title: "Detector Instrumentation",
        bullets: [
          "Tracker Resolution: 15 microns",
          "Calorimeter Linearity",
          "Muon Spectrometer Alignment",
        ],
        layout: "content",
      },
      {
        title: "Signal Significance",
        bullets: ["Observed Local Significance: 5.2 Sigma", "Branching Ratio Measurement"],
        layout: "metrics",
      },
      {
        title: "Standard Model Compatibility",
        bullets: ["Coupling Strengths within Standard Error", "Outlook for High-Luminosity Run"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "genomic-sequencing-analysis",
    name: "Genomic Sequencing Analysis",
    category: "Research",
    kind: "research",
    slidesCount: 22,
    fonts: "JetBrains Mono + Newsreader",
    colors: {
      primary: "#042F2E",
      accent: "#14B8A6",
      bg: "#F0FDFA",
    },
    bestFor: "Bioinformatics, CRISPR off-target screens, metagenomics",
    description:
      "Manhattan plot visualizations, phylogenetic tree trees, and single-cell RNA-seq clustering layouts.",
    tags: ["Genomics", "Bioinformatics", "CRISPR", "RNA-seq"],
    slides: [
      {
        title: "Single-Cell Transcriptomic Atlas of Immune Infiltration",
        subtitle: "10x Genomics 3' scRNA-seq Analysis",
        layout: "title",
      },
      {
        title: "UMAP Cluster Annotations",
        bullets: [
          "Identified 18 Distinct Cell Types",
          "CD8+ T-Cell Exhaustion Markers",
          "Macrophage M1/M2 Polarization",
        ],
        layout: "content",
      },
      {
        title: "Differential Gene Expression",
        bullets: [
          "Top Upregulated Genes (log2FC > 2.0)",
          "FDR < 0.01 Benjamini-Hochberg Correction",
        ],
        layout: "metrics",
      },
      {
        title: "Biological Validation",
        bullets: ["Flow Cytometry Confirmation", "Spatial Transcriptomics Cross-Check"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "economic-policy-paper",
    name: "Economic Policy Working Paper",
    category: "Research",
    kind: "research",
    slidesCount: 24,
    fonts: "Libre Baskerville + Source Sans Pro",
    colors: {
      primary: "#1C1917",
      accent: "#78716C",
      bg: "#FAFAF9",
    },
    bestFor: "Central bank briefings, IMF/World Bank reports, fiscal stimulus",
    description:
      "DSGE model shock responses, Philips curve comparisons, and sovereign yield curve spreads.",
    tags: ["Economics", "Central Bank", "Fiscal", "Monetary"],
    slides: [
      {
        title: "Monetary Transmission in a Supply-Constrained Regime",
        subtitle: "NBER Working Paper Series #30491",
        layout: "title",
      },
      {
        title: "Model Calibration",
        bullets: [
          "Sticky Prices & Wages (Calvo Parameter 0.75)",
          "Taylor Rule Reaction Function",
          "Financial Friction Wedges",
        ],
        layout: "agenda",
      },
      {
        title: "Impulse Response Functions",
        bullets: ["Inflation Persistence Horizon", "Output Gap Dynamics (-1.2% at trough)"],
        layout: "metrics",
      },
      {
        title: "Policy Recommendations",
        bullets: ["Forward Guidance Clarity", "Balance Sheet Normalization Rate"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "materials-science-lab",
    name: "Materials Science Laboratory",
    category: "Research",
    kind: "research",
    slidesCount: 20,
    fonts: "Syne + Space Grotesk",
    colors: {
      primary: "#0F172A",
      accent: "#F59E0B",
      bg: "#FFFBEB",
    },
    bestFor: "Solid-state batteries, nanomaterials, perovskite solar cells",
    description:
      "SEM micrograph panels, XRD diffraction pattern overlays, and tensile stress-strain curves.",
    tags: ["Materials", "Nanotech", "Batteries", "Solar"],
    slides: [
      {
        title: "Synthesis of High-Entropy Perovskite Oxide Photocatalysts",
        subtitle: "Advanced Energy Materials Symposium",
        layout: "title",
      },
      {
        title: "Characterization Suite",
        bullets: [
          "Powder X-ray Diffraction (XRD)",
          "High-Resolution TEM Micrograph",
          "X-ray Photoelectron Spectroscopy (XPS)",
        ],
        layout: "two-column",
      },
      {
        title: "Photocatalytic Efficiency",
        bullets: ["Hydrogen Evolution Rate: 42 mmol/g/h", "Quantum Yield: 14.8% at 420 nm"],
        layout: "metrics",
      },
      {
        title: "Durability & Cycling",
        bullets: ["Stable over 1,000 consecutive hours", "Minimal lattice degradation"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "astrophysics-observational-deck",
    name: "Astrophysics Observational Deck",
    category: "Research",
    kind: "research",
    slidesCount: 26,
    fonts: "Space Mono + Archivo",
    colors: {
      primary: "#030712",
      accent: "#38BDF8",
      bg: "#0F172A",
    },
    bestFor: "James Webb Space Telescope findings, exoplanet spectroscopy",
    description:
      "Spectroscopic emission line charts, transit photometry light curves, and gravitational lens models.",
    tags: ["Astronomy", "JWST", "Space", "Astrophysics"],
    slides: [
      {
        title: "Atmospheric Characterization of Sub-Neptune TOI-270 d",
        subtitle: "JWST NIRSpec Transmission Spectroscopy",
        layout: "title",
      },
      {
        title: "Transit Observations",
        bullets: [
          "Five Consecutive Primary Transits",
          "Spectral Resolution R ~ 1000",
          "Detrended Residuals < 20 ppm",
        ],
        layout: "content",
      },
      {
        title: "Molecular Detections",
        bullets: [
          "Methane (CH4): 4.5-sigma Detection",
          "Carbon Dioxide (CO2): Confirmed",
          "Absence of Ammonia (NH3)",
        ],
        layout: "metrics",
      },
      {
        title: "Habitability Modeling",
        bullets: ["Hycean World Hypothesis", "Follow-up MIRI Thermal Phase Curves"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "public-health-epidemiology",
    name: "Public Health Epidemiology",
    category: "Research",
    kind: "research",
    slidesCount: 22,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#134E4A",
      accent: "#0D9488",
      bg: "#F0FDFA",
    },
    bestFor: "CDC/WHO surveillance, vaccine efficacy cohorts, outbreak tracing",
    description:
      "Epi curves, reproductive R0 estimates, contact tracing network trees, and mortality risk ratios.",
    tags: ["Health", "Epidemiology", "WHO", "Surveillance"],
    slides: [
      {
        title: "Respiratory Pathogen Surveillance Report",
        subtitle: "Winter 2025-2026 Epidemiological Bulletin",
        layout: "title",
      },
      {
        title: "Transmission Dynamics",
        bullets: [
          "Effective Reproduction Number (Rt): 1.08",
          "Secondary Attack Rate in Households: 22%",
          "Incubation Period: 3.4 days",
        ],
        layout: "metrics",
      },
      {
        title: "Geographic Spread & Hotspots",
        bullets: ["Metropolitan Cluster Analysis", "Wastewater Viral Load Correlation"],
        layout: "two-column",
      },
      {
        title: "Intervention Guidelines",
        bullets: ["Targeted Booster Campaigns", "Ventilation Standards in Public Schools"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "neural-computation-report",
    name: "Neural Computation Report",
    category: "Research",
    kind: "research",
    slidesCount: 24,
    fonts: "Fira Code + Outfit",
    colors: {
      primary: "#1E1B4B",
      accent: "#6366F1",
      bg: "#EEF2FF",
    },
    bestFor: "Transformer architecture innovations, attention head sparsity",
    description:
      "Attention map heatmaps, loss convergence curves, and hardware FLOP utilization benchmarks.",
    tags: ["AI", "Neural", "Machine Learning", "Transformers"],
    slides: [
      {
        title: "Sparse Linear Attention via Learned Token Permutations",
        subtitle: "Conference on Neural Information Processing Systems",
        layout: "title",
      },
      {
        title: "Algorithmic Complexity",
        bullets: [
          "Quadratic O(N^2) reduced to O(N log N)",
          "Sub-quadratic memory footprint during inference",
        ],
        layout: "content",
      },
      {
        title: "Benchmark Performance",
        bullets: [
          "Long-Context Needle in a Haystack: 99.4%",
          "128k Token Perplexity parity with Dense Attention",
        ],
        layout: "metrics",
      },
      {
        title: "Hardware Scaling",
        bullets: ["Tensor Core Kernel Optimization", "Release of Triton Implementation"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "field-ecology-survey",
    name: "Field Ecology Survey",
    category: "Research",
    kind: "research",
    slidesCount: 20,
    fonts: "Cormorant + DM Sans",
    colors: {
      primary: "#14532D",
      accent: "#65A30D",
      bg: "#F7FEE7",
    },
    bestFor: "Biodiversity inventory, camera trap surveys, canopy research",
    description:
      "Species abundance rank curves, GIS habitat fragmentation maps, and Shannon-Wiener diversity indices.",
    tags: ["Ecology", "Wildlife", "Conservation", "Biodiversity"],
    slides: [
      {
        title: "Apex Predator Trophic Cascades in Old-Growth Rainforest",
        subtitle: "Three-Year Camera Trap & Bioacoustic Census",
        layout: "title",
      },
      {
        title: "Sampling Methodology",
        bullets: [
          "80 Automated Camera Traps",
          "2,400 Trap-Nights Recorded",
          "AI Acoustic Classification of Avian Calls",
        ],
        layout: "content",
      },
      {
        title: "Diversity Indices",
        bullets: ["Shannon-Wiener H' = 3.84", "Prey Density Correlated with Forest Cover"],
        layout: "metrics",
      },
      {
        title: "Recommended Corridors",
        bullets: ["Connecting Discontinuous Reserves", "Community Ranger Partnership"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "neural-grid",
    name: "Neural Grid",
    category: "Technology",
    kind: "tech",
    slidesCount: 22,
    fonts: "Sora + JetBrains Mono",
    colors: {
      primary: "#090D16",
      accent: "#00E5FF",
      bg: "#0D1322",
    },
    bestFor: "Developer keynotes, AI architecture, system roadmaps",
    description:
      "Technical precision layouts featuring system topology diagrams and clean code containers.",
    tags: ["AI", "Developer", "Architecture", "Engineering"],
    slides: [
      {
        title: "Decentralized Inference Architecture",
        subtitle: "Edge Orchestration & Sub-Millisecond Dispatch",
        layout: "title",
      },
      {
        title: "System Topology",
        bullets: ["Global Anycast Ingress", "WASM Sandbox Runtimes", "Zero-Copy IPC Buffers"],
        layout: "content",
      },
      {
        title: "Performance Benchmarks",
        bullets: ["P99 Latency: 12ms", "Throughput: 84,000 req/sec", "Memory per Worker: 4MB"],
        layout: "metrics",
      },
      {
        title: "SDK Integration",
        bullets: ["npm install @documind/core", "Quickstart Example", "Developer Docs Link"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "microservices-architecture",
    name: "Microservices Architecture",
    category: "Technology",
    kind: "tech",
    slidesCount: 24,
    fonts: "JetBrains Mono + Inter",
    colors: {
      primary: "#0F172A",
      accent: "#38BDF8",
      bg: "#F8FAFC",
    },
    bestFor: "Distributed systems, event meshes, gRPC contract reviews",
    description:
      "Clean service boundary diagrams, circuit breaker patterns, and Kafka topic choreography.",
    tags: ["Microservices", "Cloud", "Distributed Systems", "Backend"],
    slides: [
      {
        title: "Event-Driven Microservices Evolution",
        subtitle: "Decomposing the Legacy Monolith",
        layout: "title",
      },
      {
        title: "Service Decomposition Strategy",
        bullets: [
          "Domain-Driven Design Bounded Contexts",
          "Outbox Pattern for Transactional Integrity",
          "gRPC over HTTP/2 for Internal Calls",
        ],
        layout: "content",
      },
      {
        title: "Resilience Mechanisms",
        bullets: [
          "Circuit Breaker via Envoy",
          "Exponential Backoff & Dead Letter Queues",
          "Distributed Tracing via OpenTelemetry",
        ],
        layout: "two-column",
      },
      {
        title: "Migration Milestones",
        bullets: [
          "Phase 1: Read-Only Replicas",
          "Phase 2: Traffic Shadowing",
          "Phase 3: Full Cutover",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "cloud-security-posture",
    name: "Cloud Security Posture",
    category: "Technology",
    kind: "tech",
    slidesCount: 20,
    fonts: "Red Hat Text + Space Mono",
    colors: {
      primary: "#18181B",
      accent: "#EF4444",
      bg: "#FEF2F2",
    },
    bestFor: "SOC 2 audits, DevSecOps pipelines, penetration test debriefs",
    description:
      "Vulnerability severity matrices, IAM least-privilege heatmaps, and automated remediation playbooks.",
    tags: ["Security", "DevSecOps", "SOC2", "Cloud"],
    slides: [
      {
        title: "Cloud Security Posture Assessment",
        subtitle: "Q1 Vulnerability & Compliance Audit",
        layout: "title",
      },
      {
        title: "Compliance Scorecards",
        bullets: [
          "SOC 2 Type II: 100% Passing",
          "ISO 27001 Re-certification",
          "HIPAA Safeguards Active",
        ],
        layout: "metrics",
      },
      {
        title: "Threat Vectors & Attack Surface",
        bullets: [
          "Zero Critical CVEs in Production",
          "Ephemeral Bastion Hosts Deployed",
          "Automated Secret Scanning in CI/CD",
        ],
        layout: "two-column",
      },
      {
        title: "Remediation Commitments",
        bullets: ["SLA for High: 48 Hours", "Quarterly External Pentest Schedule"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "devops-pipeline-blueprint",
    name: "DevOps Pipeline Blueprint",
    category: "Technology",
    kind: "tech",
    slidesCount: 18,
    fonts: "Ubuntu + JetBrains Mono",
    colors: {
      primary: "#1E293B",
      accent: "#10B981",
      bg: "#F0FDF4",
    },
    bestFor: "CI/CD modernization, GitOps workflows, automated canary releases",
    description:
      "Visual build-test-deploy pipelines, DORA metrics dashboards, and infrastructure-as-code snippets.",
    tags: ["DevOps", "CI/CD", "GitOps", "Kubernetes"],
    slides: [
      {
        title: "Modern GitOps & Canary Deployment Engine",
        subtitle: "Accelerating Software Delivery Velocity",
        layout: "title",
      },
      {
        title: "DORA Metric Benchmarks",
        bullets: [
          "Deployment Frequency: 18x / day",
          "Lead Time for Changes: 24 mins",
          "Change Failure Rate: 0.8%",
        ],
        layout: "metrics",
      },
      {
        title: "Automated Canary Verification",
        bullets: [
          "Argo Rollouts Progression: 5% -> 25% -> 100%",
          "Automatic Rollback on Error Spike",
        ],
        layout: "content",
      },
      {
        title: "Platform Engineering Next Steps",
        bullets: ["Internal Developer Portal (Backstage)", "Self-Service Environment Provisioning"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "zero-trust-identity",
    name: "Zero Trust Identity",
    category: "Technology",
    kind: "tech",
    slidesCount: 20,
    fonts: "Inter + Space Grotesk",
    colors: {
      primary: "#1E1B4B",
      accent: "#6366F1",
      bg: "#EEF2FF",
    },
    bestFor: "Passkey rollout, context-aware authorization, SASE integration",
    description:
      "Never trust, always verify: identity provider architecture, device health checks, and continuous token evaluation.",
    tags: ["Zero Trust", "IAM", "Authentication", "Passkeys"],
    slides: [
      {
        title: "Enterprise Zero Trust Architecture",
        subtitle: "Continuous Context-Aware Access Policy",
        layout: "title",
      },
      {
        title: "Verification Dimensions",
        bullets: [
          "FIDO2 Hardware Key Verification",
          "Managed Device Health Attestation",
          "Geo-Velocity Risk Scoring",
        ],
        layout: "content",
      },
      {
        title: "Micro-Segmentation Policies",
        bullets: ["Software-Defined Perimeter", "No Direct Network Access to DBs"],
        layout: "two-column",
      },
      {
        title: "Implementation Phasing",
        bullets: ["Staff Onboarding Complete", "Legacy VPN Sunset by Q3"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "distributed-database-topology",
    name: "Distributed Database Topology",
    category: "Technology",
    kind: "tech",
    slidesCount: 22,
    fonts: "Space Grotesk + Fira Code",
    colors: {
      primary: "#0C4A6E",
      accent: "#0EA5E9",
      bg: "#F0F9FF",
    },
    bestFor: "Raft consensus, multi-region sharding, ACID vs BASE trade-offs",
    description:
      "Consensus leader election diagrams, shard split visualizers, and cross-datacenter replication latency charts.",
    tags: ["Database", "Distributed", "Consensus", "Storage"],
    slides: [
      {
        title: "Multi-Region Distributed Consensus",
        subtitle: "Raft Log Replication at 100k IOPS",
        layout: "title",
      },
      {
        title: "CAP Theorem Trade-Offs",
        bullets: [
          "CP Configuration for Financial Ledgers",
          "Linearizable Reads via Read-Index",
          "Async Replicas for Analytics",
        ],
        layout: "content",
      },
      {
        title: "Replication Benchmarks",
        bullets: ["P95 Cross-Region RTT: 42ms", "Zero Data Loss on Zone Outage"],
        layout: "metrics",
      },
      {
        title: "Backup & Recovery Runbook",
        bullets: ["Point-in-Time Recovery to Any Second", "Automated Drill Schedule"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "api-reference-showcase",
    name: "API Reference Showcase",
    category: "Technology",
    kind: "tech",
    slidesCount: 18,
    fonts: "Fira Code + DM Sans",
    colors: {
      primary: "#18181B",
      accent: "#A855F7",
      bg: "#FAF5FF",
    },
    bestFor: "Partner integrations, developer evangelism, OpenAPI specs",
    description:
      "Syntax-highlighted REST/GraphQL request-response pairs with error handling status code guides.",
    tags: ["API", "SDK", "Developer Relations", "GraphQL"],
    slides: [
      {
        title: "DocuMind Public Developer API",
        subtitle: "REST & Webhook Specification v2",
        layout: "title",
      },
      {
        title: "Core Endpoints",
        bullets: [
          "POST /api/documents/convert",
          "POST /api/presentations/generate",
          "GET /api/jobs/{id}/status",
        ],
        layout: "content",
      },
      {
        title: "Rate Limits & Webhooks",
        bullets: ["1,000 requests/minute tier", "HMAC-SHA256 Signed Event Payloads"],
        layout: "two-column",
      },
      {
        title: "SDK Libraries",
        bullets: ["TypeScript / Node.js", "Python SDK", "Go Client Library"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "kubernetes-infrastructure",
    name: "Kubernetes Infrastructure",
    category: "Technology",
    kind: "tech",
    slidesCount: 24,
    fonts: "Ubuntu + Source Code Pro",
    colors: {
      primary: "#1E3A8A",
      accent: "#3B82F6",
      bg: "#EFF6FF",
    },
    bestFor: "Cluster autoscaling, service mesh ingress, node pool governance",
    description:
      "Pod topology spread constraints, CNI network policy maps, and horizontal pod autoscaler profiles.",
    tags: ["Kubernetes", "K8s", "Infrastructure", "Cloud Native"],
    slides: [
      {
        title: "Production EKS Multi-Cluster Architecture",
        subtitle: "Automated Scaling & Workload Isolation",
        layout: "title",
      },
      {
        title: "Node Pool Stratification",
        bullets: [
          "Spot Instances for Batch Rendering: 70% Savings",
          "On-Demand Graviton Nodes for API Servers",
        ],
        layout: "metrics",
      },
      {
        title: "Networking & Service Mesh",
        bullets: ["Cilium eBPF Routing", "mTLS Zero-Trust Encryption between Pods"],
        layout: "content",
      },
      {
        title: "Cluster Upgrades & Disaster Recovery",
        bullets: ["Blue/Green Cluster Switching", "Velero Daily Etcd Snapshots"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "mobile-application-architecture",
    name: "Mobile Application Architecture",
    category: "Technology",
    kind: "tech",
    slidesCount: 18,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#312E81",
      accent: "#818CF8",
      bg: "#EEF2FF",
    },
    bestFor: "React Native / Swift architecture, offline-first sync, battery savings",
    description:
      "Mobile data flow diagrams with local SQLite persistence, optimistic UI updates, and push notification pipelines.",
    tags: ["Mobile", "iOS", "Android", "React Native"],
    slides: [
      {
        title: "Offline-First Mobile Document Studio",
        subtitle: "React Native & WatermelonDB Architecture",
        layout: "title",
      },
      {
        title: "Data Synchronization Lifecycle",
        bullets: [
          "Local SQLite Writes First",
          "CRDT Conflict-Free Synchronization",
          "Background Sync when Connected",
        ],
        layout: "content",
      },
      {
        title: "Performance Metrics",
        bullets: ["Cold App Launch: 420ms", "Battery Drain: < 1.2% per active hour"],
        layout: "metrics",
      },
      {
        title: "App Store Release Flight Plan",
        bullets: ["TestFlight Internal Beta", "Google Play Staged Rollout (10%)"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "mlops-platform-deck",
    name: "Machine Learning Operations (MLOps)",
    category: "Technology",
    kind: "tech",
    slidesCount: 22,
    fonts: "Space Mono + Sora",
    colors: {
      primary: "#042F2E",
      accent: "#14B8A6",
      bg: "#F0FDFA",
    },
    bestFor: "Model registry, feature stores, data drift detection, continuous training",
    description:
      "End-to-end ML lifecycle diagrams, model lineage graphs, and shadow deployment evaluators.",
    tags: ["MLOps", "AI", "Feature Store", "Machine Learning"],
    slides: [
      {
        title: "Enterprise MLOps & Model Lineage Platform",
        subtitle: "From Experiment Tracking to Continuous Deployment",
        layout: "title",
      },
      {
        title: "Feature Store & Data Lineage",
        bullets: [
          "Feast Online/Offline Feature Consistency",
          "Point-in-Time Accurate Training Joins",
        ],
        layout: "content",
      },
      {
        title: "Model Monitoring & Drift Detection",
        bullets: [
          "Evidently AI Embedding Drift Watchers",
          "Automatic Retraining Triggers on Concept Shift",
        ],
        layout: "two-column",
      },
      {
        title: "Governance & Artifact Registry",
        bullets: ["Model Card Generation", "Weights & Biases Artifact Tracking"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "quantum-algorithm-brief",
    name: "Quantum Algorithm Brief",
    category: "Technology",
    kind: "tech",
    slidesCount: 16,
    fonts: "Space Grotesk + Fira Code",
    colors: {
      primary: "#020617",
      accent: "#C084FC",
      bg: "#FAF5FF",
    },
    bestFor: "NISQ era quantum circuits, VQE chemistry, Grover search algorithms",
    description:
      "Quantum circuit gate schematics, Bloch sphere state representations, and error mitigation benchmarking.",
    tags: ["Quantum", "Qiskit", "Physics", "DeepTech"],
    slides: [
      {
        title: "Variational Quantum Eigensolver on 127-Qubit Eagle",
        subtitle: "Simulating Molecular Ground State Energy",
        layout: "title",
      },
      {
        title: "Circuit Topology & Transpilation",
        bullets: ["Hardware-Native Basis Gates", "Zero-Noise Extrapolation (ZNE) Error Mitigation"],
        layout: "content",
      },
      {
        title: "Energy Convergence",
        bullets: [
          "Chemical Accuracy (< 1.6 mHa) Achieved",
          "Comparison against Full CI Classical Limit",
        ],
        layout: "metrics",
      },
      {
        title: "Roadmap to Fault Tolerance",
        bullets: ["Surface Code Logical Qubit Milestones", "Hardware Roadmap through 2028"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "creative-story",
    name: "Creative Narrative",
    category: "Creative",
    kind: "creative",
    slidesCount: 16,
    fonts: "Syne + Space Grotesk",
    colors: {
      primary: "#1E1B4B",
      accent: "#EC4899",
      bg: "#FFF1F2",
    },
    bestFor: "Brand identity, storytelling decks, media launches",
    description:
      "Art-directed layout featuring bold editorial typography, mood palettes, and balanced whitespace.",
    tags: ["Creative", "Story", "Art Direction", "Brand"],
    slides: [
      {
        title: "The Narrative Arc: Reclaiming Attention",
        subtitle: "A Brand Manifesto for the Deep Work Era",
        layout: "title",
      },
      {
        title: "The Cultural Tension",
        bullets: [
          "Fragmented attention spans",
          "Algorithmic homogenization",
          "The yearning for deliberate craft",
        ],
        layout: "content",
      },
      {
        title: "Our Visual Manifestation",
        bullets: [
          "Uncompromising Typography",
          "Warm Ivory Tactile Canvas",
          "Generous Breaths of Negative Space",
        ],
        layout: "two-column",
      },
      {
        title: "The Campaign Rollout",
        bullets: [
          "Cinematic Teaser Film",
          "Limited-Run Print Monograph",
          "Community Workshop Series",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "typographic-exhibition",
    name: "Typographic Exhibition",
    category: "Creative",
    kind: "creative",
    slidesCount: 20,
    fonts: "Playfair Display + Helvetica",
    colors: {
      primary: "#000000",
      accent: "#E11D48",
      bg: "#FFFFFF",
    },
    bestFor: "Typefoundry specimens, graphic design conferences, gallery catalogs",
    description:
      "High-contrast Swiss modernist layouts celebrating ligature details, kerning nuances, and glyph scale.",
    tags: ["Typography", "Type Specimen", "Design", "Exhibition"],
    slides: [
      {
        title: "Glyph & Counter: The Modern Sans",
        subtitle: "Type Specimen & Historical Retrospective",
        layout: "title",
      },
      {
        title: "Anatomy of the Letterform",
        bullets: [
          "Ascender / Descender Proportions",
          "Optically Balanced Terminals",
          "True Display Kerning Pairs",
        ],
        layout: "content",
      },
      {
        title: "Weights & Optical Sizes",
        bullets: ["Hairline to Ultra Black", "Micro-Sizes engineered for legible mobile reading"],
        layout: "two-column",
      },
      {
        title: "Specimen Poster Series",
        bullets: ["Museum of Design Exhibition", "Silk-screened Limited Edition Prints"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "film-production-lookbook",
    name: "Film Production Lookbook",
    category: "Creative",
    kind: "creative",
    slidesCount: 24,
    fonts: "Cinzel + Montserrat",
    colors: {
      primary: "#0A0A0A",
      accent: "#EAB308",
      bg: "#171717",
    },
    bestFor: "Feature film pitching, director treatments, cinematography reels",
    description:
      "Widescreen 2.39:1 letterbox frames, color temperature swatches, and character archetype portfolios.",
    tags: ["Film", "Cinema", "Lookbook", "Director"],
    slides: [
      {
        title: "Chroma: A Feature Film Pitch",
        subtitle: "Written & Directed by Elena Vance",
        layout: "title",
      },
      {
        title: "Logline & Thematic Core",
        bullets: [
          "In a hyper-surveilled archipelago, an acoustic archivist uncovers a frequency that erases digital memories.",
        ],
        layout: "content",
      },
      {
        title: "Cinematography & Lighting Palette",
        bullets: ["Anamorphic 35mm Prime Lenses", "Cool Tungsten Highlights vs Amber Neon Shadows"],
        layout: "two-column",
      },
      {
        title: "Production Schedule & Budget",
        bullets: ["Principal Photography: 32 Days", "Post-Production & Sound Design in London"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "brand-identity-standards",
    name: "Brand Identity Standards",
    category: "Creative",
    kind: "creative",
    slidesCount: 22,
    fonts: "Cabinet Grotesk + Satoshi",
    colors: {
      primary: "#0F172A",
      accent: "#2563EB",
      bg: "#F8FAFC",
    },
    bestFor: "Corporate rebrands, design agencies, visual identity guidelines",
    description:
      "Grid systems, logo isolation clearance, secondary color ratios, and tone of voice matrices.",
    tags: ["Branding", "Style Guide", "Design Agency", "Guidelines"],
    slides: [
      {
        title: "DocuMind Visual Identity System",
        subtitle: "Comprehensive Brand Guidelines v3.0",
        layout: "title",
      },
      {
        title: "Logo Lockups & Clear Space",
        bullets: [
          "Primary Horizontal Emblem",
          "Monochrome Inversions",
          "Minimum Digital Exclusion Zone",
        ],
        layout: "content",
      },
      {
        title: "Color Hierarchy & Ratios",
        bullets: [
          "60% Warm Ivory Canvas",
          "30% Deep Midnight Charcoal",
          "10% Electric Cobalt Spark",
        ],
        layout: "two-column",
      },
      {
        title: "Downloadable Brand Assets",
        bullets: ["Vector SVG Logos", "Font Licensing Documentation", "Figma Design Tokens"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "audio-studio-deck",
    name: "Audio Production Studio Deck",
    category: "Creative",
    kind: "creative",
    slidesCount: 18,
    fonts: "Urbanist + JetBrains Mono",
    colors: {
      primary: "#18181B",
      accent: "#8B5CF6",
      bg: "#27272A",
    },
    bestFor: "Music producers, podcast networks, mastering engineers",
    description:
      "Frequency response diagrams, studio gear inventories, and release campaign rollout timelines.",
    tags: ["Audio", "Music", "Podcast", "Production"],
    slides: [
      {
        title: "Spatial Sound Studios",
        subtitle: "Dolby Atmos Mixing & Mastering Facility",
        layout: "title",
      },
      {
        title: "Acoustic Engineering",
        bullets: [
          "7.1.4 Immersive Speaker Array",
          "Custom Floating Floor Isolation",
          "Genelec Smart Active Monitors",
        ],
        layout: "content",
      },
      {
        title: "Selected Discography & Credits",
        bullets: ["Grammy-Nominated Master 2025", "Top 10 Global Podcast Series Mix"],
        layout: "metrics",
      },
      {
        title: "Booking Rates & Sessions",
        bullets: ["Day Rate Packages", "Remote Stem Mastering", "Contact Studio Manager"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "high-fashion-editorial",
    name: "High Fashion Editorial",
    category: "Creative",
    kind: "creative",
    slidesCount: 22,
    fonts: "Bodoni Moda + Montserrat",
    colors: {
      primary: "#000000",
      accent: "#D4AF37",
      bg: "#FAFAFA",
    },
    bestFor: "Runway previews, luxury fashion lines, capsule collections",
    description:
      "Dramatic full-bleed image containers, minimalist serifs, and textile texture descriptions.",
    tags: ["Fashion", "Editorial", "Luxury", "Runway"],
    slides: [
      {
        title: "AURA: Autumn/Winter Capsule",
        subtitle: "Sustainable Silk & Sculptural Tailoring",
        layout: "title",
      },
      {
        title: "Collection Narrative",
        bullets: [
          "Organic textures meet sharp architectural silhouettes",
          "Deadstock merino wool and vegan silk blends",
        ],
        layout: "content",
      },
      {
        title: "Look 01 through Look 12",
        bullets: ["Oversized Trench in Raw Ecru", "Bias-Cut Slip Dress with Brushed Hardware"],
        layout: "two-column",
      },
      {
        title: "Retail Distribution & Pop-Ups",
        bullets: ["Paris Fashion Week Showroom", "Flagship Pop-Up in Tokyo & New York"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "indie-publishing-zine",
    name: "Independent Publishing Zine",
    category: "Creative",
    kind: "creative",
    slidesCount: 16,
    fonts: "Space Mono + Newsreader",
    colors: {
      primary: "#292524",
      accent: "#F97316",
      bg: "#F5F5F4",
    },
    bestFor: "Literary magazines, experimental essays, art collectives",
    description:
      "Risograph-inspired overlays, raw scan textures, and rebellious grid-breaking typography.",
    tags: ["Zine", "Publishing", "Indie", "Risograph"],
    slides: [
      {
        title: "MARGINALIA Issue 07",
        subtitle: "Essays on Analog Media & Digital Ghosts",
        layout: "title",
      },
      {
        title: "Table of Contents",
        bullets: [
          "The Disappearing Floppy Disk",
          "Field Notes from a Lost Frequency",
          "Five Poets on Solitude",
        ],
        layout: "agenda",
      },
      {
        title: "Featured Visual Essay",
        bullets: ["Photocopy Degradation Studies", "Micro-Interviews with Printmakers"],
        layout: "two-column",
      },
      {
        title: "Print Specifications & Stockists",
        bullets: ["Risograph 3-Color on Munken Print", "Independent Bookstores Worldwide"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "digital-art-retrospective",
    name: "Digital Art Retrospective",
    category: "Creative",
    kind: "creative",
    slidesCount: 20,
    fonts: "Syne + Inter",
    colors: {
      primary: "#090D16",
      accent: "#06B6D4",
      bg: "#0D1322",
    },
    bestFor: "Generative art collections, NFT gallery retrospectives, museum exhibitions",
    description:
      "Dark gallery aesthetic with curated metadata cards, shader math annotations, and provenance logs.",
    tags: ["Digital Art", "Generative", "Museum", "NFT"],
    slides: [
      {
        title: "Autonomous Emergence: Ten Years of Shaders",
        subtitle: "Selected Works 2016-2026",
        layout: "title",
      },
      {
        title: "Series 1: Fluid Dynamics",
        bullets: ["Navier-Stokes Simulations in WebGL", "Real-Time Participant Interaction"],
        layout: "content",
      },
      {
        title: "Provenance & Smart Contract Records",
        bullets: ["On-Chain Immutable Metadata", "Exhibited at Centre Pompidou"],
        layout: "two-column",
      },
      {
        title: "Artist Monograph & Q&A",
        bullets: ["Essays by Leading Digital Curators", "Upcoming Gallery Retrospective in London"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "game-design-document",
    name: "Narrative Game Design Document",
    category: "Creative",
    kind: "creative",
    slidesCount: 26,
    fonts: "Cinzel + Space Grotesk",
    colors: {
      primary: "#1E1B4B",
      accent: "#10B981",
      bg: "#0F172A",
    },
    bestFor: "Indie game studios, publisher pitches, game loop documents",
    description:
      "Core gameplay loops, branching dialogue state trees, character progression trees, and level flowcharts.",
    tags: ["Gaming", "GDD", "Game Design", "Narrative"],
    slides: [
      {
        title: "Project Echo: Narrative Stealth RPG",
        subtitle: "Publisher Pitch & Game Design Overview",
        layout: "title",
      },
      {
        title: "Core Gameplay Loop",
        bullets: [
          "Infiltrate Unseen",
          "Manipulate Sound Waves",
          "Uncover Historical Conspiracies",
          "Upgrade Acoustic Gear",
        ],
        layout: "agenda",
      },
      {
        title: "Progression & Skill Trees",
        bullets: ["Acoustic Stealth", "Electronic Warfare", "Social Engineering"],
        layout: "two-column",
      },
      {
        title: "Production Budget & Target Platforms",
        bullets: ["Steam & Current-Gen Consoles", "18-Month Development Timeline"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "architectural-concept-monograph",
    name: "Architectural Concept Monograph",
    category: "Creative",
    kind: "creative",
    slidesCount: 24,
    fonts: "Newsreader + Archivo",
    colors: {
      primary: "#1C1917",
      accent: "#57534E",
      bg: "#FAF8F5",
    },
    bestFor: "Competition entries, civic masterplans, residential design reviews",
    description:
      "Axonometric drawing callouts, sun path orientation studies, and material board swatch panels.",
    tags: ["Architecture", "Urban Planning", "Civic", "Monograph"],
    slides: [
      {
        title: "The Highline Pavilion & Community Commons",
        subtitle: "Public Space Competition Finalist Submission",
        layout: "title",
      },
      {
        title: "Site Context & Environmental Integration",
        bullets: [
          "Passive Solar Orientation",
          "Rainwater Harvesting Cisterns",
          "Locally Sourced Timber Structure",
        ],
        layout: "content",
      },
      {
        title: "Floor Plan & Section Diagrams",
        bullets: [
          "Ground Floor Multi-Use Auditorium",
          "Mezzanine Maker Studio Spaces",
          "Rooftop Botanical Garden",
        ],
        layout: "two-column",
      },
      {
        title: "Phased Construction & Civic Budget",
        bullets: ["Groundbreaking Spring 2027", "LEED Platinum Certification Target"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "culinary-brand-book",
    name: "Culinary & Beverage Brand Book",
    category: "Creative",
    kind: "creative",
    slidesCount: 18,
    fonts: "Fraunces + DM Sans",
    colors: {
      primary: "#451A03",
      accent: "#EA580C",
      bg: "#FFF7ED",
    },
    bestFor: "Artisanal food brands, winery stories, Michelin restaurant press",
    description:
      "Terroir soil storytelling, harvest season photo grids, flavor profile radar charts, and farm partnerships.",
    tags: ["Culinary", "Hospitality", "Wine", "Food"],
    slides: [
      {
        title: "Terroir & Heritage: Single-Origin Olive Oil",
        subtitle: "Estate Bottled in Andalusia Since 1888",
        layout: "title",
      },
      {
        title: "The Harvest Process",
        bullets: [
          "Cold-Pressed within 4 Hours of Picking",
          "Unfiltered Picual Olives",
          "Acidity Level < 0.18%",
        ],
        layout: "content",
      },
      {
        title: "Tasting Profile & Sommelier Notes",
        bullets: ["Bright Grassy Aromas", "Peppery Finish with Green Almond Notes"],
        layout: "two-column",
      },
      {
        title: "Wholesale & Restaurant Partnerships",
        bullets: ["Featured in 40 Michelin-Starred Dining Rooms", "Bespoke Pourer Presentation"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "folio-contrast",
    name: "Folio Contrast",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 14,
    fonts: "Newsreader Italic + Grotesk",
    colors: {
      primary: "#18181B",
      accent: "#3B82F6",
      bg: "#FAF8F5",
    },
    bestFor: "Design proposals, architecture portfolios, agency pitches",
    description:
      "Expressive editorial geometry with asymmetric gallery frames that give visual work maximum presence.",
    tags: ["Portfolio", "Design", "Agency", "Minimal"],
    slides: [
      {
        title: "Selected Works: 2024-2026",
        subtitle: "Product Design, Creative Direction & Systems",
        layout: "title",
      },
      {
        title: "Project 01: Global Fintech App",
        bullets: [
          "Redesigned mobile experience for 4M daily active users",
          "Reduced onboarding drop-off by 38%",
        ],
        layout: "content",
      },
      {
        title: "Project 02: Hardware Sound Interface",
        bullets: ["Custom tactile rotary controllers", "Industrial Design Excellence Award 2025"],
        layout: "two-column",
      },
      {
        title: "Contact & Availability",
        bullets: ["Available for Q3 Creative Direction & Advisory", "hello@designer.com"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "product-designer-portfolio",
    name: "Product Designer Portfolio",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 18,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#0F172A",
      accent: "#0284C7",
      bg: "#FFFFFF",
    },
    bestFor: "Senior UX/UI case studies, design system leadership, hiring loops",
    description:
      "Comprehensive problem-solution-impact frameworks with user research quotes and Figma component breakdowns.",
    tags: ["Product Design", "UX/UI", "Case Study", "Design Systems"],
    slides: [
      {
        title: "Designing the Next Generation Document Studio",
        subtitle: "Principal Product Designer Case Study",
        layout: "title",
      },
      {
        title: "The Problem & Discovery",
        bullets: [
          "Users overwhelmed by bloated PDF editors",
          "Fragmented conversion and compression tools",
          "Need for single focused workspace",
        ],
        layout: "content",
      },
      {
        title: "User Research & Iteration",
        bullets: [
          "Tested with 24 academic researchers and creators",
          "3 iterations of the floating toolbelt",
        ],
        layout: "two-column",
      },
      {
        title: "Business & User Impact",
        bullets: [
          "Retention improved by 45%",
          "Average session task completion in under 30 seconds",
        ],
        layout: "metrics",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "senior-architect-monograph",
    name: "Senior Architect Monograph",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 20,
    fonts: "Newsreader + Helvetica",
    colors: {
      primary: "#1C1917",
      accent: "#44403C",
      bg: "#F5F5F4",
    },
    bestFor: "Licensed architects, urban planning directors, award submissions",
    description:
      "Clean orthogonal grids, high-res structural photography frames, and client endorsement sidebars.",
    tags: ["Architecture", "Monograph", "Civic", "Structural"],
    slides: [
      {
        title: "Civic Structures & Sustainable Sanctuaries",
        subtitle: "Architectural Portfolio of Marcus Vance, AIA",
        layout: "title",
      },
      {
        title: "Metropolitan Library of Modern Art",
        bullets: ["Mass-Timber Cantilevered Roof", "Daylight Autonomy Factor: 92%"],
        layout: "content",
      },
      {
        title: "Passive Housing Community",
        bullets: ["Zero Net Energy Verified", "Rainwater Recycling Facade"],
        layout: "two-column",
      },
      {
        title: "Awards & Peer Recognition",
        bullets: ["AIA Honor Award 2025", "RIBA International Award Shortlist"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "creative-director-retrospective",
    name: "Creative Director Retrospective",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 22,
    fonts: "Bodoni Moda + DM Sans",
    colors: {
      primary: "#0A0A0A",
      accent: "#E11D48",
      bg: "#FAFAFA",
    },
    bestFor: "Agency leadership candidates, jury reels, executive pitches",
    description:
      "Impactful full-spread headlines, Cannes Lions award lists, and brand transformation revenue figures.",
    tags: ["Creative Director", "Advertising", "Agency", "Leadership"],
    slides: [
      {
        title: "Reinventing Icons: A Decade in Creative Direction",
        subtitle: "Global Campaigns that Defined Culture",
        layout: "title",
      },
      {
        title: "Campaign Alpha: The Sound of Tomorrow",
        bullets: ["1.2 Billion organic impressions", "Won 4 Cannes Gold Lions"],
        layout: "metrics",
      },
      {
        title: "Strategic Brand Repositioning",
        bullets: [
          "Transitioned legacy heritage brand to Gen-Z relevance",
          "Global revenue growth +28%",
        ],
        layout: "two-column",
      },
      {
        title: "Leadership Philosophy",
        bullets: ["Nurturing cross-disciplinary talent", "Zero room for creative complacency"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "fullstack-engineering-showcase",
    name: "Full Stack Engineering Showcase",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 16,
    fonts: "JetBrains Mono + Inter",
    colors: {
      primary: "#020617",
      accent: "#38BDF8",
      bg: "#0F172A",
    },
    bestFor: "Staff engineers, tech lead portfolios, startup CTO interviews",
    description:
      "System throughput graphs, open-source repository stars, architecture refactors, and technical blog posts.",
    tags: ["Engineering", "Full Stack", "Open Source", "Staff Engineer"],
    slides: [
      {
        title: "Distributed Systems & Frontend Engineering",
        subtitle: "Engineering Portfolio of Sophia Chen",
        layout: "title",
      },
      {
        title: "Featured Open-Source Engine",
        bullets: [
          "8,500 GitHub Stars",
          "Used in production by Fortune 500 teams",
          "Sub-millisecond serialization",
        ],
        layout: "metrics",
      },
      {
        title: "High-Throughput Streaming Pipeline",
        bullets: ["Handled 2.4M WebSocket events/sec", "Zero data loss during AWS region outage"],
        layout: "content",
      },
      {
        title: "Publications & Talks",
        bullets: ["Keynote at Strange Loop 2025", "Co-Author of RFC-9820"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "fine-art-photography-folio",
    name: "Fine Art Photography Folio",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 18,
    fonts: "Newsreader + Karla",
    colors: {
      primary: "#171717",
      accent: "#A3A3A3",
      bg: "#0A0A0A",
    },
    bestFor: "Gallery exhibitions, photo books, grant proposals",
    description:
      "Minimalist black borders, museum wall simulation, printing specs (Hahnemühle archival), and artist statements.",
    tags: ["Photography", "Fine Art", "Gallery", "Archival"],
    slides: [
      {
        title: "Silent Horizons: Arctic Studies",
        subtitle: "Large Format Silver Gelatin Prints",
        layout: "title",
      },
      {
        title: "Artist Statement",
        bullets: [
          "Documenting the ephemeral glacial edge",
          "8x10 field camera long exposures in polar dusk",
        ],
        layout: "content",
      },
      {
        title: "Plate I through Plate VI",
        bullets: ["Ice Floe No. 4, Svalbard", "Meltwater Channel at Midnight"],
        layout: "two-column",
      },
      {
        title: "Selected Public Collections",
        bullets: ["Permanent Collection, San Francisco MOMA", "Tate Modern Gallery Acquisition"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "motion-design-reel-deck",
    name: "Motion Design Reel Deck",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 16,
    fonts: "Space Grotesk + Plus Jakarta",
    colors: {
      primary: "#090D16",
      accent: "#F43F5E",
      bg: "#18181B",
    },
    bestFor: "3D animators, Houdini specialists, title sequence artists",
    description:
      "Styleframe moodboards, wireframe breakdown sliders, frame rate pacing breakdowns, and client roll.",
    tags: ["Motion Design", "3D", "Animation", "Cinema 4D"],
    slides: [
      {
        title: "Kinetic Worlds: 3D Motion & Title Design",
        subtitle: "Commercial Reel & Case Studies",
        layout: "title",
      },
      {
        title: "Brand Ident in Houdini",
        bullets: ["Procedural particle simulation", "Real-time Octane rendering pipeline"],
        layout: "content",
      },
      {
        title: "Main Title Sequence for Sci-Fi Series",
        bullets: ["Typographic choreography", "Seamless camera flythroughs"],
        layout: "two-column",
      },
      {
        title: "Software Proficiency & Gear",
        bullets: ["Houdini, Cinema 4D, After Effects, Redshift", "Custom GPU Render Farm"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "industrial-design-showcase",
    name: "Industrial Design Showcase",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 20,
    fonts: "Sora + Inter",
    colors: {
      primary: "#18181B",
      accent: "#EAB308",
      bg: "#F4F4F5",
    },
    bestFor: "Consumer hardware designers, ergonomic prototypes, DFM portfolios",
    description:
      "Exploded view mechanical assemblies, CMF (Color, Material, Finish) swatches, and ergonomic test data.",
    tags: ["Industrial Design", "Hardware", "Prototyping", "CMF"],
    slides: [
      {
        title: "Tactile Precision: Hardware & Product Design",
        subtitle: "From Concept Sketch to Tooling",
        layout: "title",
      },
      {
        title: "Acoustic ANC Headphone Design",
        bullets: [
          "Anodized aluminum earcups",
          "Memory foam lambskin cushions",
          "Intuitive capacitive rotary dial",
        ],
        layout: "content",
      },
      {
        title: "Exploded Assembly & DFM",
        bullets: ["Injection molded inner chassis", "Snap-fit modular battery replacement"],
        layout: "two-column",
      },
      {
        title: "Patents & Manufacturing History",
        bullets: ["3 Utility Patents Granted", "Managed high-volume tooling in Taiwan"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "copywriter-selected-works",
    name: "Copywriter Selected Works",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 16,
    fonts: "Newsreader + Public Sans",
    colors: {
      primary: "#1C1917",
      accent: "#2563EB",
      bg: "#FAF8F5",
    },
    bestFor: "Brand voice guidelines, billboard campaigns, punchy taglines",
    description:
      "Large headline typography, manifesto passages, before-and-after conversion copy comparisons.",
    tags: ["Copywriting", "Creative Writing", "Advertising", "Brand Voice"],
    slides: [
      {
        title: "Words that Build Worlds",
        subtitle: "Copywriting Portfolio of Julian Vance",
        layout: "title",
      },
      {
        title: "Global Brand Tagline Campaign",
        bullets: [
          "'Your Documents. Smarter.'",
          "Adopted across 42 countries and translated into 18 languages",
        ],
        layout: "content",
      },
      {
        title: "Editorial Brand Manifesto",
        bullets: [
          "Crafted voice guide for high-growth SaaS",
          "Increased homepage conversion by 26%",
        ],
        layout: "two-column",
      },
      {
        title: "Client Praise & References",
        bullets: [
          "'Julian has the rarest ear for rhythmic corporate prose.'",
          "Available for contract retainers",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "tech-writer-folio",
    name: "Technical Writer Documentation Folio",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 18,
    fonts: "Space Mono + Inter",
    colors: {
      primary: "#0F172A",
      accent: "#10B981",
      bg: "#F8FAFC",
    },
    bestFor: "Developer docs specialists, API documentation portfolios, information architects",
    description:
      "Information architecture site trees, code tutorial readability scores, and community forum deflections.",
    tags: ["Tech Writing", "Documentation", "API Docs", "Developer"],
    slides: [
      {
        title: "Clarity at Scale: Developer Documentation",
        subtitle: "Technical Writing Portfolio & Information Architecture",
        layout: "title",
      },
      {
        title: "API Reference Overhaul",
        bullets: [
          "Rebuilt 200+ endpoint documentation with interactive curl testers",
          "Reduced support ticket volume by 42%",
        ],
        layout: "metrics",
      },
      {
        title: "Information Architecture Redesign",
        bullets: ["User-tested navigation tree", "Search CTR increased to 94%"],
        layout: "two-column",
      },
      {
        title: "Style Guide & Terminology Standard",
        bullets: [
          "Authored company-wide technical writing style guide",
          "Automated Vale linting in CI",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "data-journalist-visual-essays",
    name: "Data Journalist Visual Essays",
    category: "Portfolio",
    kind: "creative",
    slidesCount: 20,
    fonts: "Fraunces + DM Sans",
    colors: {
      primary: "#030712",
      accent: "#F97316",
      bg: "#FFF7ED",
    },
    bestFor: "Interactive scrollytelling, investigative reporting, chart portfolios",
    description:
      "Custom D3.js chart mockups, geospatial polygon maps, and investigative methodology notes.",
    tags: ["Data Journalism", "Infographics", "Reporting", "Visual Storytelling"],
    slides: [
      {
        title: "Mapping the Invisible: Data Journalism Portfolio",
        subtitle: "Visual Essays from Elena Rostova",
        layout: "title",
      },
      {
        title: "Investigative Investigation: Groundwater Depletion",
        bullets: [
          "Analyzed 40 years of satellite telemetry data",
          "Published interactive scrollytelling piece with 2M reads",
        ],
        layout: "content",
      },
      {
        title: "Data Visualization Breakdown",
        bullets: [
          "Custom bivariate choropleth mapping",
          "Accessible high-contrast color palettes for colorblind readers",
        ],
        layout: "two-column",
      },
      {
        title: "Awards & Press",
        bullets: ["Data Journalism Award 2025 Finalist", "Featured in The Pudding and Nieman Lab"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "annual-sustainability-report",
    name: "Annual Sustainability Report",
    category: "Reports",
    kind: "business",
    slidesCount: 28,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#064E3B",
      accent: "#10B981",
      bg: "#F0FDF4",
    },
    bestFor: "ESG compliance, carbon footprint accounting, circular economy",
    description:
      "GRI and SASB framework alignment, Scope 1/2/3 greenhouse gas emissions, and green energy transition progress.",
    tags: ["ESG", "Sustainability", "Annual Report", "Carbon"],
    slides: [
      {
        title: "2025 Corporate Sustainability & ESG Report",
        subtitle: "Net Zero Milestones & Environmental Stewardship",
        layout: "title",
      },
      {
        title: "Executive ESG Dashboard",
        bullets: [
          "Scope 1 & 2 Emissions reduced by 54%",
          "100% Renewable Energy in Data Centers",
          "Zero Waste to Landfill achieved at HQ",
        ],
        layout: "metrics",
      },
      {
        title: "Scope 3 Supply Chain Decarbonization",
        bullets: [
          "Engaged 80% of Tier-1 suppliers in Science-Based Targets (SBTi)",
          "Transition to low-carbon freight corridors",
        ],
        layout: "content",
      },
      {
        title: "Governance & Independent Assurance",
        bullets: ["Third-party audit verification statement", "GRI Content Index & Disclosures"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "financial-audit-compliance",
    name: "Financial Audit & Compliance",
    category: "Reports",
    kind: "business",
    slidesCount: 24,
    fonts: "Cormorant + Calibri",
    colors: {
      primary: "#0F172A",
      accent: "#0284C7",
      bg: "#F8FAFC",
    },
    bestFor: "Statutory audits, external accounting reviews, internal controls",
    description:
      "Balance sheet reconciliation, cash flow waterfall tables, and material weakness remediation registers.",
    tags: ["Audit", "Finance", "Accounting", "Compliance"],
    slides: [
      {
        title: "Annual Statutory Financial Audit Report",
        subtitle: "Independent Auditor's Report for Fiscal Year 2025",
        layout: "title",
      },
      {
        title: "Auditor's Unqualified Opinion",
        bullets: [
          "Financial statements present fairly in all material respects",
          "Compliance with US GAAP and IFRS standards",
        ],
        layout: "content",
      },
      {
        title: "Consolidated Financial Statements",
        bullets: [
          "Net Revenue: $184.2M (+22% YoY)",
          "Operating Income: $42.8M",
          "Operating Cash Flow: $58.1M",
        ],
        layout: "metrics",
      },
      {
        title: "Internal Controls & Governance",
        bullets: [
          "No material weaknesses identified",
          "Management representation letter submitted",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "cybersecurity-threat-intel",
    name: "Cybersecurity Threat Intelligence",
    category: "Reports",
    kind: "business",
    slidesCount: 22,
    fonts: "JetBrains Mono + Space Grotesk",
    colors: {
      primary: "#18181B",
      accent: "#DC2626",
      bg: "#FEF2F2",
    },
    bestFor: "CISO board updates, incident response retrospectives, threat hunting",
    description:
      "MITRE ATT&CK framework mapping, ransomware family trends, and mean time to detect/contain (MTTD/MTTC).",
    tags: ["Cybersecurity", "CISO", "Threat Intel", "Infosec"],
    slides: [
      {
        title: "Global Cybersecurity Threat Intelligence Briefing",
        subtitle: "Q4 Threat Landscape & Defense Posture",
        layout: "title",
      },
      {
        title: "Key Threat Metrics",
        bullets: [
          "Blocked Intrusions: 1.4M malicious attempts",
          "Mean Time to Detect (MTTD): 4.2 minutes",
          "Mean Time to Contain (MTTC): 18.5 minutes",
        ],
        layout: "metrics",
      },
      {
        title: "MITRE ATT&CK Threat Mapping",
        bullets: [
          "Observed TTPs: Credential stuffing, cloud token replay",
          "Hardened endpoint protection rules deployed",
        ],
        layout: "content",
      },
      {
        title: "Strategic Security Roadmap",
        bullets: ["Mandatory hardware passkey enforcement", "Automated SOAR playbook expansion"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "customer-success-nps-report",
    name: "Customer Success Metrics & NPS",
    category: "Reports",
    kind: "business",
    slidesCount: 20,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#1E3A8A",
      accent: "#3B82F6",
      bg: "#EFF6FF",
    },
    bestFor: "Executive quarterly reviews, customer churn analysis, CSAT scores",
    description:
      "Net Promoter Score distribution, churn cohorts by ACV, health score algorithms, and customer quotes.",
    tags: ["Customer Success", "NPS", "Churn", "SaaS"],
    slides: [
      {
        title: "Customer Success & Retention Performance",
        subtitle: "Q4 Net Promoter Score & Cohort Analysis",
        layout: "title",
      },
      {
        title: "Customer Sentiment Overview",
        bullets: [
          "Net Promoter Score: +68 (Top Quartile)",
          "Customer Satisfaction (CSAT): 96.4%",
          "Gross Revenue Retention: 98.2%",
        ],
        layout: "metrics",
      },
      {
        title: "Churn & Downgrade Analysis",
        bullets: [
          "Primary reason: M&A consolidation (62%)",
          "Zero customer losses due to product unreliability",
        ],
        layout: "two-column",
      },
      {
        title: "Action Plan for Customer Health",
        bullets: [
          "Proactive high-touch onboarding for enterprise tier",
          "Quarterly Executive Business Reviews scheduled",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "hr-diversity-inclusion-report",
    name: "Human Resources Diversity & Inclusion",
    category: "Reports",
    kind: "business",
    slidesCount: 22,
    fonts: "Cabinet Grotesk + Satoshi",
    colors: {
      primary: "#701A75",
      accent: "#D946EF",
      bg: "#FDF4FF",
    },
    bestFor: "EEOC disclosures, equitable pay audits, inclusive hiring pipeline",
    description:
      "Gender and ethnicity representation charts, pay parity regression results, and ERG initiative reviews.",
    tags: ["HR", "Diversity", "Inclusion", "People Ops"],
    slides: [
      {
        title: "Workforce Representation & Inclusion Report",
        subtitle: "Annual Equity Audit & Belonging Survey Results",
        layout: "title",
      },
      {
        title: "Workforce Demographics",
        bullets: [
          "Leadership Diversity: 48% underrepresented groups",
          "Technical Roles: 42% women in engineering",
          "Global Retention Parity achieved",
        ],
        layout: "metrics",
      },
      {
        title: "Pay Equity Regression Study",
        bullets: [
          "Statistical parity (100.0%) across identical job bands",
          "Annual third-party pay compensation audit completed",
        ],
        layout: "content",
      },
      {
        title: "2026 Commitments",
        bullets: [
          "Expanded university fellowship partnerships",
          "Employee Resource Group executive sponsorship",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "operations-facility-audit",
    name: "Operations & Facility Audit",
    category: "Reports",
    kind: "business",
    slidesCount: 18,
    fonts: "Public Sans + Inter",
    colors: {
      primary: "#1E293B",
      accent: "#64748B",
      bg: "#F8FAFC",
    },
    bestFor: "Plant manager reviews, safety incident tracking, energy audits",
    description:
      "OSHA recordable rate trackers, square-footage utilization, HVAC energy efficiency, and equipment uptime.",
    tags: ["Operations", "Facility", "Safety", "Manufacturing"],
    slides: [
      {
        title: "Global Facilities & Operational Safety Audit",
        subtitle: "Semi-Annual Plant Inspection & Efficiency Review",
        layout: "title",
      },
      {
        title: "Safety Milestone",
        bullets: [
          "Zero Lost-Time Incidents in 720 days",
          "OSHA Recordable Incident Rate: 0.12 (industry benchmark: 1.4)",
        ],
        layout: "metrics",
      },
      {
        title: "Facility Space Optimization",
        bullets: [
          "Transition to flexible hybrid office density",
          "Energy consumption reduced by 22% via smart BMS",
        ],
        layout: "content",
      },
      {
        title: "Preventive Maintenance Schedule",
        bullets: ["100% on-time critical equipment servicing", "Backup generator load test passed"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "marketing-attribution-report",
    name: "Quarterly Marketing Attribution",
    category: "Reports",
    kind: "business",
    slidesCount: 24,
    fonts: "Outfit + Plus Jakarta",
    colors: {
      primary: "#312E81",
      accent: "#818CF8",
      bg: "#EEF2FF",
    },
    bestFor: "CMO briefings, CAC payback analysis, multi-touch channel attribution",
    description:
      "First-touch vs W-shaped attribution models, customer acquisition costs, blended ROAS, and pipeline velocity.",
    tags: ["Marketing", "Attribution", "ROAS", "Growth"],
    slides: [
      {
        title: "Marketing Performance & Attribution Report",
        subtitle: "Q4 Pipeline Generation & Channel Efficiency",
        layout: "title",
      },
      {
        title: "Executive Growth Summary",
        bullets: [
          "Marketing Sourced Pipeline: $48.2M (+34% YoY)",
          "Blended CAC Payback: 8.2 Months",
          "Organic Search Traffic: +85%",
        ],
        layout: "metrics",
      },
      {
        title: "Channel ROI Comparison",
        bullets: [
          "Paid Search ROAS: 3.8x",
          "Organic Content & SEO: Highest LTV customer cohort",
          "Events & Conferences: High ACV enterprise deals",
        ],
        layout: "two-column",
      },
      {
        title: "2026 Budget Reallocation",
        bullets: [
          "Double down on developer content marketing",
          "Streamline underperforming display ad spend",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "supply-chain-carbon-report",
    name: "Supply Chain Carbon Footprint",
    category: "Reports",
    kind: "business",
    slidesCount: 20,
    fonts: "General Sans + Space Grotesk",
    colors: {
      primary: "#14532D",
      accent: "#22C55E",
      bg: "#F0FDF4",
    },
    bestFor: "Scope 3 emissions accounting, life cycle assessment (LCA), packaging audit",
    description:
      "Grams CO2e per unit shipped, raw material extraction impact, rail vs air freight modal shift, and supplier compliance.",
    tags: ["Supply Chain", "Carbon", "Scope 3", "LCA"],
    slides: [
      {
        title: "Supply Chain Decarbonization & LCA Report",
        subtitle: "Tracking Embodied Carbon from Factory to Customer",
        layout: "title",
      },
      {
        title: "Unit Carbon Intensity",
        bullets: [
          "Carbon per Shipped Unit: 420g CO2e (-28% vs 2024)",
          "100% Recyclable FSC-Certified Packaging",
        ],
        layout: "metrics",
      },
      {
        title: "Freight Modal Shift",
        bullets: [
          "Replaced 80% of regional air freight with electric rail corridors",
          "Reduced logistics emissions by 3,400 metric tons",
        ],
        layout: "content",
      },
      {
        title: "Supplier Tier Engagement",
        bullets: [
          "Mandatory supplier carbon accounting audits",
          "Supplier decarbonization rebate program",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "product-velocity-retrospective",
    name: "Product Velocity & Sprint Retrospective",
    category: "Reports",
    kind: "business",
    slidesCount: 18,
    fonts: "JetBrains Mono + Inter",
    colors: {
      primary: "#0F172A",
      accent: "#38BDF8",
      bg: "#F8FAFC",
    },
    bestFor: "Engineering all-hands, sprint velocity, technical debt tracking",
    description:
      "Story points delivered, burndown velocity, bug escape rate, and epic milestone progress.",
    tags: ["Agile", "Sprint", "Velocity", "Engineering"],
    slides: [
      {
        title: "Engineering Velocity & Product Retrospective",
        subtitle: "Q4 Sprint Cadence & Platform Delivery",
        layout: "title",
      },
      {
        title: "Sprint Output Metrics",
        bullets: [
          "Story Points Completed: 1,840 pts (94% commitment rate)",
          "Bug Escape Rate to Production: < 0.4%",
          "Average PR Review Time: 3.2 hours",
        ],
        layout: "metrics",
      },
      {
        title: "Technical Debt Paydown",
        bullets: [
          "Eliminated legacy session store",
          "Upgraded React compiler & Tailwind v4",
          "End-to-End test suite runtime reduced by 60%",
        ],
        layout: "two-column",
      },
      {
        title: "Next Quarter Priorities",
        bullets: ["Launch offline WASM document tools", "Scale internationalization support"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "enterprise-risk-assessment",
    name: "Enterprise Risk Assessment & Mitigation",
    category: "Reports",
    kind: "business",
    slidesCount: 22,
    fonts: "Red Hat Text + Manrope",
    colors: {
      primary: "#7F1D1D",
      accent: "#F87171",
      bg: "#FEF2F2",
    },
    bestFor: "Board risk committees, enterprise risk management (ERM), regulatory buffers",
    description:
      "Heatmap of likelihood vs impact, geopolitical exposures, operational contingencies, and risk appetite statements.",
    tags: ["Risk", "Compliance", "ERM", "Governance"],
    slides: [
      {
        title: "Enterprise Risk Management (ERM) Report",
        subtitle: "2026 Comprehensive Risk Register & Controls",
        layout: "title",
      },
      {
        title: "Top Inherent Risks",
        bullets: [
          "Geopolitical supply chain disruptions",
          "Regulatory AI governance compliance",
          "Critical cloud infrastructure concentration",
        ],
        layout: "content",
      },
      {
        title: "Residual Risk Heatmap",
        bullets: [
          "All identified risks reduced into acceptable tolerance band",
          "Adequate liquidity buffers maintained",
        ],
        layout: "metrics",
      },
      {
        title: "Business Continuity Testing",
        bullets: ["Simulated full datacenter failover drill", "Zero data loss RPO verified"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "healthcare-quality-benchmark",
    name: "Healthcare Quality & Patient Safety Benchmark",
    category: "Reports",
    kind: "business",
    slidesCount: 24,
    fonts: "Newsreader + Open Sans",
    colors: {
      primary: "#0C4A6E",
      accent: "#0EA5E9",
      bg: "#F0F9FF",
    },
    bestFor: "Hospital board reviews, clinical quality indicators, CMS quality stars",
    description:
      "Hospital-acquired infection (HAI) rates, 30-day readmission indices, HCAHPS patient experience scores.",
    tags: ["Healthcare", "Hospital", "Patient Safety", "Clinical"],
    slides: [
      {
        title: "Clinical Quality & Patient Safety Report",
        subtitle: "Annual Healthcare Benchmark & Outcomes Review",
        layout: "title",
      },
      {
        title: "Quality Indicators",
        bullets: [
          "CMS 5-Star Hospital Quality Rating Awarded",
          "30-Day Readmission Rate: 11.2% (Below National Avg: 15.4%)",
          "Zero CLABSI incidents in intensive care units",
        ],
        layout: "metrics",
      },
      {
        title: "HCAHPS Patient Satisfaction",
        bullets: [
          "Nurse Communication: 94th percentile",
          "Discharge Information Clarity: 96th percentile",
        ],
        layout: "content",
      },
      {
        title: "Continuous Quality Improvement",
        bullets: [
          "Implemented AI-assisted clinical documentation",
          "Expanded outpatient telemetry monitoring",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "doctoral-dissertation-defense",
    name: "Doctoral Dissertation Defense",
    category: "Academic",
    kind: "academic",
    slidesCount: 32,
    fonts: "Newsreader + Calibri",
    colors: {
      primary: "#1E293B",
      accent: "#2563EB",
      bg: "#FAF8F5",
    },
    bestFor: "PhD oral defenses, dissertation committees, viva voce examinations",
    description:
      "Authoritative academic defense structure with literature gap framing, methodology justification, and chapter summaries.",
    tags: ["PhD", "Dissertation", "Defense", "Academic"],
    slides: [
      {
        title: "A Relational Theory of Distributed Semantic Synthesis",
        subtitle: "Doctoral Dissertation Defense in Computer Science",
        layout: "title",
      },
      {
        title: "The Research Problem",
        bullets: [
          "Limitations of contemporary distributed consensus",
          "Semantic divergence in high-latency network partitions",
          "Thesis Statement & Primary Contributions",
        ],
        layout: "content",
      },
      {
        title: "Methodological Validation",
        bullets: [
          "Formal TLA+ Proof Specification",
          "Empirical Evaluation across 1,000 Global Nodes",
          "Statistically Significant Convergence Speed",
        ],
        layout: "metrics",
      },
      {
        title: "Committee Questions & Acknowledgments",
        bullets: [
          "Special thanks to Dissertation Advisor Dr. Aris Thorne",
          "Q&A Session with Committee Members",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "masters-thesis-presentation",
    name: "Master's Thesis Presentation",
    category: "Academic",
    kind: "academic",
    slidesCount: 24,
    fonts: "EB Garamond + Inter",
    colors: {
      primary: "#1E3A8A",
      accent: "#3B82F6",
      bg: "#F8FAFC",
    },
    bestFor: "MSc and MA degree final presentations, graduate symposiums",
    description:
      "Clear research questions, controlled experiments, hypothesis testing, and future work proposals.",
    tags: ["Thesis", "Masters", "Graduate", "Research"],
    slides: [
      {
        title: "Investigation of Microplastic Deposition in Alpine Snowpack",
        subtitle: "Master of Science Thesis Presentation",
        layout: "title",
      },
      {
        title: "Hypothesis & Sample Sites",
        bullets: [
          "Atmospheric transport hypothesis",
          "Samples collected across 12 high-altitude ridges in the Alps",
        ],
        layout: "content",
      },
      {
        title: "Spectroscopic Identification",
        bullets: [
          "FTIR Spectroscopy confirmed polyethylene microfibers",
          "Average concentration: 42 particles / liter meltwater",
        ],
        layout: "metrics",
      },
      {
        title: "Significance & Future Research",
        bullets: [
          "Impact on albedo and melt acceleration",
          "Recommendations for seasonal monitoring",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "postdoc-colloquium",
    name: "Postdoctoral Fellowship Colloquium",
    category: "Academic",
    kind: "academic",
    slidesCount: 28,
    fonts: "Crimson Pro + Manrope",
    colors: {
      primary: "#312E81",
      accent: "#6366F1",
      bg: "#EEF2FF",
    },
    bestFor: "Tenure-track job talks, institute colloquiums, fellowship reviews",
    description:
      "High-level research vision, grant funding track record, and multi-year laboratory expansion roadmap.",
    tags: ["Postdoc", "Fellowship", "Job Talk", "Tenure"],
    slides: [
      {
        title: "Precision Epigenomic Editing: From Mechanism to Therapeutics",
        subtitle: "Faculty Candidate Colloquium & Research Proposal",
        layout: "title",
      },
      {
        title: "Track Record & Key Publications",
        bullets: [
          "First-author paper in Nature Biotechnology",
          "Co-Investigator on $2.4M NIH R01 Grant",
          "3 Granted Patents in CRISPR Activation",
        ],
        layout: "metrics",
      },
      {
        title: "Five-Year Laboratory Vision",
        bullets: [
          "Establish High-Throughput Screening Platform",
          "Train graduate students and postdocs",
          "Foster interdisciplinary university collaborations",
        ],
        layout: "content",
      },
      {
        title: "Teaching Philosophy & Course Proposals",
        bullets: [
          "Mentoring diverse researchers",
          "Proposed graduate seminar: 'Modern Genome Engineering'",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "departmental-research-seminar",
    name: "Departmental Research Seminar",
    category: "Academic",
    kind: "academic",
    slidesCount: 26,
    fonts: "Newsreader + Source Sans",
    colors: {
      primary: "#0F172A",
      accent: "#0EA5E9",
      bg: "#F8FAFC",
    },
    bestFor: "Weekly department brown-bags, visiting scholar lectures",
    description:
      "Informal yet rigorous structure prioritizing interactive debate, preliminary data, and unpolished insights.",
    tags: ["Departmental", "Seminar", "Faculty", "Lecture"],
    slides: [
      {
        title: "Preliminary Observations on Non-Equilibrium Phase Transitions",
        subtitle: "Physics Department Weekly Colloquium",
        layout: "title",
      },
      {
        title: "Theoretical Foundations",
        bullets: [
          "Landau-Ginzburg free energy functional",
          "Fluctuation-dissipation theorem breakdown under high drive",
        ],
        layout: "content",
      },
      {
        title: "Laboratory Measurements",
        bullets: ["Ultra-fast laser excitation data", "Unexpected metastable state at 4.2 Kelvin"],
        layout: "metrics",
      },
      {
        title: "Open Questions for the Room",
        bullets: [
          "Alternative interpretations of anomalous damping",
          "Suggestions for cryostat configuration",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "undergraduate-capstone-showcase",
    name: "Undergraduate Capstone Showcase",
    category: "Academic",
    kind: "academic",
    slidesCount: 20,
    fonts: "Plus Jakarta + Inter",
    colors: {
      primary: "#1E40AF",
      accent: "#60A5FA",
      bg: "#EFF6FF",
    },
    bestFor: "Senior design projects, undergraduate research symposia",
    description:
      "Project problem statements, prototypes built, challenges overcome, and career aspirations.",
    tags: ["Capstone", "Undergraduate", "Senior Design", "Showcase"],
    slides: [
      {
        title: "Solar-Powered Water Desalination for Coastal Communities",
        subtitle: "Senior Engineering Capstone Project",
        layout: "title",
      },
      {
        title: "The Problem & Engineering Challenge",
        bullets: [
          "Limited freshwater access in remote coastal villages",
          "Design a low-maintenance, zero-grid powered system under $500",
        ],
        layout: "content",
      },
      {
        title: "Prototype Performance",
        bullets: [
          "Yield: 18 Liters of potable water per day",
          "TDS reduced from 35,000 ppm to 180 ppm (WHO standards met)",
        ],
        layout: "metrics",
      },
      {
        title: "Team Members & Future Work",
        bullets: [
          "Mechanical & Chemical Engineering Senior Team",
          "Open-source CAD blueprints released",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "international-academic-symposium",
    name: "International Academic Symposium",
    category: "Academic",
    kind: "academic",
    slidesCount: 26,
    fonts: "Fraunces + DM Sans",
    colors: {
      primary: "#431407",
      accent: "#D97706",
      bg: "#FEF3C7",
    },
    bestFor: "Global conferences, keynote addresses, multi-institution summits",
    description:
      "Multi-lingual translation acknowledgment, institution logos, global collaboration maps, and policy whitepapers.",
    tags: ["Symposium", "International", "Keynote", "Conference"],
    slides: [
      {
        title: "Global Climate Resilience & Indigenous Land Stewardship",
        subtitle: "Keynote Address: 14th International Resilience Congress",
        layout: "title",
      },
      {
        title: "Participating Institutions",
        bullets: [
          "Consortium of 48 Global Universities",
          "Pan-Arctic and Amazonian Community Leaders",
          "UNESCO Policy Working Group",
        ],
        layout: "content",
      },
      {
        title: "Empirical Ecological Evidence",
        bullets: [
          "Biodiversity indices 35% higher in community-stewarded forests",
          "Deforestation rates 4x lower",
        ],
        layout: "metrics",
      },
      {
        title: "The 2026 Declaration of Action",
        bullets: ["Legal recognition of ancestral boundaries", "Direct climate finance mechanisms"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "qualitative-ethnography-deck",
    name: "Qualitative Ethnography Presentation",
    category: "Academic",
    kind: "academic",
    slidesCount: 24,
    fonts: "Cinzel + EB Garamond",
    colors: {
      primary: "#365314",
      accent: "#84CC16",
      bg: "#F7FEE7",
    },
    bestFor: "Anthropology, field interviews, grounded theory findings",
    description:
      "In-depth informant quotations, field photography, thematic coding frameworks, and reflexivity statements.",
    tags: ["Ethnography", "Anthropology", "Qualitative", "Interviews"],
    slides: [
      {
        title: "Craft, Identity, and Resistance in Post-Industrial Shipyards",
        subtitle: "An 18-Month Ethnographic Fieldwork Study",
        layout: "title",
      },
      {
        title: "Methodology & Field Immersion",
        bullets: [
          "Participant observation on the drydock floor",
          "64 in-depth semi-structured interviews with master shipwrights",
        ],
        layout: "content",
      },
      {
        title: "Emergent Thematic Codes",
        bullets: [
          "'The Memory in the Steel': Tacit physical knowledge",
          "Generational transmission vs digital automation",
        ],
        layout: "two-column",
      },
      {
        title: "Reflexivity & Theoretical Contribution",
        bullets: [
          "Positionality of the researcher",
          "Rethinking labor sociology in the 21st century",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "philosophy-ethics-discourse",
    name: "Philosophy & Ethics Discourse",
    category: "Academic",
    kind: "academic",
    slidesCount: 22,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#18181B",
      accent: "#A1A1AA",
      bg: "#FAFAFA",
    },
    bestFor: "Bioethics panels, moral philosophy seminars, AI governance debates",
    description:
      "Thought experiment step-throughs, dialectical counterarguments, premise-conclusion logical syllogisms.",
    tags: ["Philosophy", "Ethics", "Bioethics", "Logic"],
    slides: [
      {
        title: "Autonomous Agency and Moral Responsibility in Synthetic Systems",
        subtitle: "Moral Philosophy Faculty Colloquium",
        layout: "title",
      },
      {
        title: "The Core Philosophical Dilemma",
        bullets: [
          "Can non-sentient cognitive systems be moral patients?",
          "The attribution of blame in black-box algorithmic decisions",
        ],
        layout: "content",
      },
      {
        title: "Dialectical Counter-Arguments",
        bullets: [
          "Objection 1: The Epistemic Gap",
          "Objection 2: Intentionality and Searle's Chinese Room revisited",
        ],
        layout: "two-column",
      },
      {
        title: "A Relational Framework for Normative Accountability",
        bullets: ["Distributed agency models", "Questions for the plenary discussion"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "historiography-defense",
    name: "Historical Historiography Defense",
    category: "Academic",
    kind: "academic",
    slidesCount: 28,
    fonts: "Libre Baskerville + Karla",
    colors: {
      primary: "#451A03",
      accent: "#B45309",
      bg: "#FEF3C7",
    },
    bestFor: "History doctoral defenses, archival source critiques, historical revisionism",
    description:
      "Comparative school of thought tables (Annales vs Marxist vs Post-Colonial), archival source provenance.",
    tags: ["History", "Historiography", "Archives", "Defense"],
    slides: [
      {
        title: "Rethinking the Grain Crises of the Mediterranean Basin (1590-1620)",
        subtitle: "Historiographical Defense for the Degree of Doctor of Philosophy",
        layout: "title",
      },
      {
        title: "The Historiographical Debate",
        bullets: [
          "Fernand Braudel and the Longue Durée",
          "Climatic Little Ice Age Shocks vs Institutional Hoarding",
        ],
        layout: "content",
      },
      {
        title: "New Archival Discoveries in Venice & Seville",
        bullets: [
          "Harbor customs ledgers newly transcribed",
          "Shipment arrival dates correlated with local price spikes",
        ],
        layout: "two-column",
      },
      {
        title: "Conclusions & Contributions",
        bullets: [
          "Challenging traditional deterministic models",
          "Full annotated corpus deposited in open repository",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "cognitive-neuroscience-defense",
    name: "Cognitive Neuroscience Defense",
    category: "Academic",
    kind: "academic",
    slidesCount: 30,
    fonts: "Space Mono + Inter",
    colors: {
      primary: "#1E1B4B",
      accent: "#8B5CF6",
      bg: "#F5F3FF",
    },
    bestFor: "fMRI brain mapping, electrophysiology defenses, neural decoding",
    description:
      "Cortical surface activation overlays, event-related potentials (ERP), Granger causality connectivity graphs.",
    tags: ["Neuroscience", "fMRI", "Brain", "Cognitive"],
    slides: [
      {
        title: "Neural Decoding of Working Memory Representations during Sleep Replay",
        subtitle: "PhD Defense in Cognitive Neuroscience",
        layout: "title",
      },
      {
        title: "Experimental Paradigm & 7T fMRI",
        bullets: [
          "High-resolution multi-voxel pattern analysis (MVPA)",
          "Hippocampal-prefrontal functional connectivity during slow-wave sleep",
        ],
        layout: "content",
      },
      {
        title: "Decoding Accuracy Results",
        bullets: [
          "Classified memory replay trajectories at 84% accuracy (chance: 25%)",
          "Replay correlated with morning recall performance",
        ],
        layout: "metrics",
      },
      {
        title: "Theoretical Implications",
        bullets: [
          "Consolidation mechanisms in the human cortex",
          "Future optogenetic translation in animal models",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "comp-linguistics-colloquium",
    name: "Computational Linguistics Colloquium",
    category: "Academic",
    kind: "academic",
    slidesCount: 26,
    fonts: "JetBrains Mono + Newsreader",
    colors: {
      primary: "#042F2E",
      accent: "#14B8A6",
      bg: "#F0FDFA",
    },
    bestFor: "Syntactic parsing, typological NLP, low-resource language preservation",
    description:
      "Syntax parse trees, cross-lingual embedding alignment plots, and BLEU/ChrF score evaluation tables.",
    tags: ["Linguistics", "NLP", "Syntax", "Colloquium"],
    slides: [
      {
        title: "Cross-Lingual Transfer in Low-Resource Morphologically Rich Languages",
        subtitle: "ACL Conference Paper & University Colloquium",
        layout: "title",
      },
      {
        title: "The Typological Challenge",
        bullets: [
          "Overcoming zero-shot degradation in agglutinative languages",
          "Subword tokenization failures in polysynthetic languages",
        ],
        layout: "content",
      },
      {
        title: "Evaluation across 40 Languages",
        bullets: [
          "Morphological accuracy improved by +14.2 points",
          "Zero-shot syntactic parsing parity on Universal Dependencies",
        ],
        layout: "metrics",
      },
      {
        title: "Open-Source Release",
        bullets: [
          "Dataset of 12 Indigenous languages annotated with native speakers",
          "Model weights published on Hugging Face",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "series-a",
    name: "Series A Venture Deck",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 16,
    fonts: "Plus Jakarta + Manrope",
    colors: {
      primary: "#090D16",
      accent: "#2563EB",
      bg: "#FAF8F5",
    },
    bestFor: "Venture fundraising, demo days, investor updates",
    description:
      "Traction-focused slide structure calibrated to convey market size, unit economics, and velocity.",
    tags: ["Pitch", "Series A", "Venture Capital", "Startup"],
    slides: [
      {
        title: "DocuMind: The Intelligent Document Studio",
        subtitle: "Raising $12M Series A to Redefine Everyday Knowledge Work",
        layout: "title",
      },
      {
        title: "The Problem",
        bullets: [
          "1.2B knowledge workers trapped in bloated 90s document software",
          "Fragmented PDF tools that charge exorbitant subscriptions",
        ],
        layout: "content",
      },
      {
        title: "Traction & Market Validation",
        bullets: [
          "$3.2M ARR (+340% YoY Growth)",
          "140,000 Monthly Active Creators",
          "Net Dollar Retention: 138%",
        ],
        layout: "metrics",
      },
      {
        title: "The Ask & Use of Funds",
        bullets: [
          "Expanding Engineering & Core Engine Team",
          "Enterprise Security & Compliance",
          "Targeting Cash-Flow Positive in 18 Months",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "pre-seed-founder-story",
    name: "Pre-Seed Founder Story",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 12,
    fonts: "Newsreader + Inter",
    colors: {
      primary: "#1E293B",
      accent: "#0EA5E9",
      bg: "#FFFFFF",
    },
    bestFor: "Angel rounds, accelerator applications (Y Combinator), founder vision",
    description:
      "High-authenticity founder narrative, earned secrets, rapid MVP validation, and early user love.",
    tags: ["Pre-Seed", "Angel", "YC", "Founders"],
    slides: [
      {
        title: "Project Spark: Pre-Seed Pitch",
        subtitle: "Built by Former DeepMind & Stanford Engineers",
        layout: "title",
      },
      {
        title: "The Earned Secret",
        bullets: [
          "Documents don't need heavyweight apps—they need lightweight, deterministic browser intelligence.",
          "Why now: WebAssembly + modern local AI",
        ],
        layout: "content",
      },
      {
        title: "Early Organic Signals",
        bullets: [
          "12,000 signups in 48 hours on Product Hunt",
          "100% organic word of mouth",
          "48% weekly user retention",
        ],
        layout: "metrics",
      },
      {
        title: "Pre-Seed Financing Round",
        bullets: [
          "Raising $1.5M Safe at $12M Cap",
          "Lead angel committed",
          "Contact founders: founders@documind.com",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "b2b-enterprise-saas-pitch",
    name: "B2B Enterprise SaaS Pitch",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 18,
    fonts: "Cabinet Grotesk + Satoshi",
    colors: {
      primary: "#0F172A",
      accent: "#3B82F6",
      bg: "#F8FAFC",
    },
    bestFor: "Growth equity, strategic corporate venture, annual contract value (ACV) decks",
    description:
      "Total Addressable Market (TAM) bottom-up calculations, sales pipeline velocity, customer logos, and net retention.",
    tags: ["B2B", "Enterprise", "SaaS", "Growth Equity"],
    slides: [
      {
        title: "Enterprise Knowledge Automation Platform",
        subtitle: "Transforming Unstructured Documents into Actionable Intelligence",
        layout: "title",
      },
      {
        title: "Market Opportunity ($48B TAM)",
        bullets: [
          "Bottom-up calculation across 200,000 Global Enterprises",
          "Average ACV expanding from $40k to $120k",
        ],
        layout: "metrics",
      },
      {
        title: "Enterprise Moats & Architecture",
        bullets: [
          "On-premise air-gapped deployment option",
          "SOC 2 Type II, HIPAA, and GDPR compliant",
          "Integrations with Salesforce, Slack, Workday",
        ],
        layout: "content",
      },
      {
        title: "Financial Forecast & Scale Plan",
        bullets: [
          "Projected ARR: $24M by 2027",
          "Gross Margins: 82%",
          "Capital efficiency score in top decile",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "climate-tech-pitch",
    name: "Climate Tech & Sustainability Deck",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 16,
    fonts: "Space Grotesk + Newsreader",
    colors: {
      primary: "#064E3B",
      accent: "#10B981",
      bg: "#F0FDF4",
    },
    bestFor: "Clean energy venture capital, ARPA-E grants, carbon removal funds",
    description:
      "Gigaton scale impact modeling, levelized cost of carbon removal (LCOCR), and pilot facility milestones.",
    tags: ["Climate Tech", "Clean Energy", "Carbon Removal", "Sustainability"],
    slides: [
      {
        title: "TerraCarbon: Gigaton-Scale Direct Ocean Capture",
        subtitle: "Series Seed Investment Deck",
        layout: "title",
      },
      {
        title: "The Global Climate Imperative",
        bullets: [
          "10 Gigatons of annual atmospheric carbon removal required by 2050",
          "Ocean holds 50x more carbon than the atmosphere naturally",
        ],
        layout: "content",
      },
      {
        title: "Techno-Economic Advantage",
        bullets: [
          "Target cost: < $60 per ton CO2 removed",
          "Energy consumption: 60% less than direct air capture",
          "Operational pilot plant capturing 500 tons/yr",
        ],
        layout: "metrics",
      },
      {
        title: "Financing & First Commercial Facility",
        bullets: [
          "Raising $8M to construct 50,000-ton facility",
          "Offtake agreements signed with major tech buyers",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "healthtech-diagnostic-pitch",
    name: "HealthTech Diagnostic Pitch",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 16,
    fonts: "Red Hat Text + Inter",
    colors: {
      primary: "#0C4A6E",
      accent: "#0284C7",
      bg: "#F0F9FF",
    },
    bestFor: "Biotech venture, FDA breakthrough devices, life science funds",
    description:
      "Clinical sensitivity/specificity curves, CPT reimbursement pathway, hospital procurement pilots.",
    tags: ["HealthTech", "Biotech", "Diagnostics", "FDA"],
    slides: [
      {
        title: "AuraHealth: AI-Guided Early Oncology Diagnostics",
        subtitle: "Series A Financing: Scaling Clinical Deployments",
        layout: "title",
      },
      {
        title: "Unmet Clinical Need",
        bullets: [
          "Stage I cancer detection increases 5-year survival to 92%",
          "Current biopsies are invasive, slow, and expensive",
        ],
        layout: "content",
      },
      {
        title: "Clinical Trial Validation",
        bullets: [
          "Sensitivity: 96.4% | Specificity: 98.2%",
          "Tested across 3,200 multi-center patient samples",
          "FDA Breakthrough Device Designation Granted",
        ],
        layout: "metrics",
      },
      {
        title: "Reimbursement & Go-To-Market",
        bullets: [
          "Existing CPT Reimbursement Codes in place ($850/test)",
          "Pilots active in 6 premier cancer institutes",
        ],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "fintech-infrastructure-deck",
    name: "FinTech Infrastructure Deck",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 18,
    fonts: "JetBrains Mono + Manrope",
    colors: {
      primary: "#111827",
      accent: "#6366F1",
      bg: "#EEF2FF",
    },
    bestFor: "Fintech VC, payment rails, banking-as-a-service (BaaS) rounds",
    description:
      "Payment volume processed (TPV), interchange economics, regulatory licenses, and API developer adoption.",
    tags: ["Fintech", "Payments", "Banking", "Infrastructure"],
    slides: [
      {
        title: "LedgerFlow: Instant Cross-Border Liquidity Rails",
        subtitle: "Seed Extension: Powering Global Trade Settlement",
        layout: "title",
      },
      {
        title: "The Legacy Payment Bottleneck",
        bullets: [
          "$120T in annual B2B cross-border transfers trapped in correspondent banking",
          "Average settlement time: 3-5 business days with 3% fees",
        ],
        layout: "content",
      },
      {
        title: "Our Solution & Traction",
        bullets: [
          "Total Payment Volume (TPV): $480M annualized",
          "Instant 2-second settlement via local currency networks",
          "Revenue run-rate: $1.8M ARR (38 bps net take rate)",
        ],
        layout: "metrics",
      },
      {
        title: "Regulatory Defensibility & The Ask",
        bullets: [
          "Authorized Payment Institution (API) licenses secured",
          "Raising $5M to expand into Latin America & APAC",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "consumer-social-growth-pitch",
    name: "Consumer Social Growth Pitch",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 14,
    fonts: "Urbanist + Plus Jakarta",
    colors: {
      primary: "#18181B",
      accent: "#EC4899",
      bg: "#FDF2F8",
    },
    bestFor: "Consumer tech VCs, viral growth loops, Gen-Z mobile communities",
    description:
      "K-factor virality coefficients, Day 1/7/30 retention curves, daily time in app, user-generated content volume.",
    tags: ["Consumer", "Social", "Mobile", "Gen-Z"],
    slides: [
      {
        title: "Verve: Collaborative Creative Micro-Communities",
        subtitle: "Seed Pitch: 500k Active Creators in 90 Days",
        layout: "title",
      },
      {
        title: "Organic Viral Loops",
        bullets: [
          "K-Factor: 1.84 (Every user invites almost 2 friends)",
          "Zero paid ad acquisition spend to date",
        ],
        layout: "metrics",
      },
      {
        title: "Cohort Retention & Engagement",
        bullets: [
          "D30 Retention: 42% (Outperforming industry top decile)",
          "Average time spent: 38 minutes/day",
        ],
        layout: "content",
      },
      {
        title: "Creator Monetization & Next Phase",
        bullets: [
          "Digital tipping and subscriber patronage live",
          "Raising $3.5M to launch Android app & scale infrastructure",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "deeptech-ai-hardware",
    name: "DeepTech AI Hardware Deck",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 20,
    fonts: "Space Mono + Sora",
    colors: {
      primary: "#030712",
      accent: "#00E5FF",
      bg: "#0D1322",
    },
    bestFor: "Semiconductor VC, photonics, next-gen compute accelerators",
    description:
      "TeraOPS per Watt benchmarks, silicon tape-out timeline, foundry partnerships (TSMC), patent moat.",
    tags: ["DeepTech", "Hardware", "Semiconductor", "Photonics"],
    slides: [
      {
        title: "PhotonCore: Optical Neural Inference Accelerators",
        subtitle: "Series A: Delivering 100x Energy Efficiency for LLMs",
        layout: "title",
      },
      {
        title: "The Looming AI Power Wall",
        bullets: [
          "Data centers projected to consume 8% of global electricity by 2030",
          "Copper interconnects hitting thermal physics limits",
        ],
        layout: "content",
      },
      {
        title: "Silicon Photonic Advantage",
        bullets: [
          "120 TeraOPS / Watt (18x better than state-of-the-art GPUs)",
          "Sub-nanosecond optical matrix multiplication verified on test chips",
        ],
        layout: "metrics",
      },
      {
        title: "Manufacturing & Tape-Out Timeline",
        bullets: [
          "Foundry agreement with TSMC 28nm photonic process",
          "Tape-out planned Q4 2026 | Raising $25M",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "edtech-platform-seed-deck",
    name: "EdTech Platform Seed Deck",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 16,
    fonts: "Outfit + Public Sans",
    colors: {
      primary: "#1E3A8A",
      accent: "#F59E0B",
      bg: "#FFFBEB",
    },
    bestFor: "Future of work, student learning platforms, university enterprise deals",
    description:
      "Student engagement scores, teacher adoption metrics, freemium-to-school conversion pipelines.",
    tags: ["EdTech", "Education", "Learning", "Seed"],
    slides: [
      {
        title: "SocratesAI: Personalized Interactive Mastery",
        subtitle: "Seed Deck: Empowering 250,000 Students Worldwide",
        layout: "title",
      },
      {
        title: "The Problem in Modern Classrooms",
        bullets: [
          "One-size-fits-all curricula leave 40% of students behind",
          "Overworked teachers spend 15+ hours weekly grading",
        ],
        layout: "content",
      },
      {
        title: "Proven Academic Outcomes",
        bullets: [
          "Students achieve 1.4 letter grade improvement in 12 weeks",
          "Teacher grading time reduced by 70%",
          "14 School District Enterprise Contracts",
        ],
        layout: "metrics",
      },
      {
        title: "Seed Financing & Expansion",
        bullets: [
          "Raising $2.5M to expand K-12 STEM subjects",
          "Backed by leading education angels",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "robotics-accelerator-pitch",
    name: "Robotics & Autonomous Systems Accelerator",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 18,
    fonts: "Space Grotesk + JetBrains Mono",
    colors: {
      primary: "#18181B",
      accent: "#10B981",
      bg: "#F0FDF4",
    },
    bestFor: "Warehouse automation, quadrupeds, agricultural robotics",
    description:
      "Mean time between interventions (MTBI), cost per pick/pack, payload capacity, customer ROI payback period.",
    tags: ["Robotics", "Hardware", "Autonomous", "Warehouse"],
    slides: [
      {
        title: "KineticBot: Autonomous Warehouse Micro-Fulfillment",
        subtitle: "Series Seed Pitch Deck",
        layout: "title",
      },
      {
        title: "Labor Shortage in Logistics",
        bullets: [
          "Over 400,000 unfilled warehouse picking jobs in North America",
          "E-commerce order volume surging 22% annually",
        ],
        layout: "content",
      },
      {
        title: "Field Robot Performance",
        bullets: [
          "650 picks per hour (2x human worker speed)",
          "Zero collisions in 120,000 operating hours",
          "6-Month CapEx payback period for customer",
        ],
        layout: "metrics",
      },
      {
        title: "Production Scaling",
        bullets: [
          "Contract manufacturing partnership secured in Ohio",
          "Raising $4M to deploy 200 commercial units",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "web3-protocol-deck",
    name: "Web3 & Decentralized Protocol",
    category: "Pitch Decks",
    kind: "pitch",
    slidesCount: 16,
    fonts: "Space Mono + Inter",
    colors: {
      primary: "#090D16",
      accent: "#A855F7",
      bg: "#FAF5FF",
    },
    bestFor: "Layer 1/2 protocols, zero-knowledge proofs, crypto funds",
    description:
      "Total Value Locked (TVL), validator node geography, ZK verification gas costs, community governance tokenomics.",
    tags: ["Web3", "Crypto", "Zero Knowledge", "Protocol"],
    slides: [
      {
        title: "AuraNet: Zero-Knowledge Verifiable Document Proofs",
        subtitle: "Protocol Architecture & Ecosystem Funding Deck",
        layout: "title",
      },
      {
        title: "The Need for Verifiable Truth",
        bullets: [
          "Deepfakes and forged digital documents eroding institutional trust",
          "Need for zero-knowledge proofs of authenticity without exposing raw private data",
        ],
        layout: "content",
      },
      {
        title: "Cryptographic Efficiency",
        bullets: [
          "Recursive SNARK proofs verified in < 15ms",
          "Sub-cent gas fees on Ethereum L2 rollup",
          "42 dApps building on testnet",
        ],
        layout: "metrics",
      },
      {
        title: "Ecosystem Tokenomics & Foundation",
        bullets: [
          "Non-profit Swiss Foundation governance",
          "Decentralized validator network launch Q3 2026",
        ],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "quiet-space",
    name: "Quiet Space",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 12,
    fonts: "Inter + Cormorant",
    colors: {
      primary: "#18181B",
      accent: "#71717A",
      bg: "#FAF8F5",
    },
    bestFor: "Keynote speeches, manifesto decks, strategic alignment",
    description:
      "Swiss-inspired minimalism with generous whitespace and disciplined single-thought slide architecture.",
    tags: ["Minimal", "Whitespace", "Keynote", "Swiss"],
    slides: [
      {
        title: "Quiet Space",
        subtitle: "Disciplined Simplicity for High-Gravity Ideas",
        layout: "title",
      },
      {
        title: "The Single Thought",
        bullets: ["Remove every element that does not directly advance comprehension."],
        layout: "content",
      },
      {
        title: "Whitespace is Architecture",
        bullets: [
          "Negative space is not empty space",
          "It is the breathing room that gives clarity weight",
        ],
        layout: "content",
      },
      {
        title: "Final Takeaway",
        bullets: ["Clarity is kindness", "Thank you"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "monolith-monochrome",
    name: "Monolith Monochrome",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 14,
    fonts: "Helvetica Neue + Space Mono",
    colors: {
      primary: "#000000",
      accent: "#FFFFFF",
      bg: "#000000",
    },
    bestFor: "Design manifestos, dramatic keynotes, high-fashion launches",
    description:
      "Pure stark black and white contrasts with oversized typography and razor-thin hair lines.",
    tags: ["Monochrome", "Dark", "Minimal", "Bold"],
    slides: [
      {
        title: "MONOLITH",
        subtitle: "Essentialism in High-Contrast Black and White",
        layout: "title",
      },
      {
        title: "Zero Superfluous Color",
        bullets: ["Only light and absence of light", "Stripped of decorative distraction"],
        layout: "content",
      },
      {
        title: "Scale as Hierarchy",
        bullets: [
          "Massive headlines command presence",
          "Tiny monospaced footnotes convey surgical precision",
        ],
        layout: "two-column",
      },
      {
        title: "Conclusion",
        bullets: ["What remains is undeniable"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "swiss-grid-precision",
    name: "Swiss Grid Precision",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 16,
    fonts: "Inter + Helvetica",
    colors: {
      primary: "#111827",
      accent: "#EF4444",
      bg: "#F9FAFB",
    },
    bestFor: "Corporate standards, design systems, architectural presentations",
    description:
      "Strict 12-column Swiss modernist baseline grid with subtle mathematical red accents.",
    tags: ["Swiss", "Grid", "International Typographic Style", "Modernist"],
    slides: [
      {
        title: "International Typographic Style",
        subtitle: "Objective Information Architecture",
        layout: "title",
      },
      {
        title: "The 12-Column Mathematical Grid",
        bullets: [
          "Every element anchored to strict baseline rhythm",
          "Asymmetrical balance and visual equilibrium",
        ],
        layout: "content",
      },
      {
        title: "Typographic Scale & Legibility",
        bullets: ["Unjustified flush-left rag-right setting", "Standardized modular point sizes"],
        layout: "two-column",
      },
      {
        title: "Universal Clarity",
        bullets: ["Functional, objective, enduring"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "paper-and-ink-serif",
    name: "Paper & Ink Serif",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 14,
    fonts: "Newsreader + Source Sans",
    colors: {
      primary: "#1C1917",
      accent: "#78716C",
      bg: "#FAF8F5",
    },
    bestFor: "Book publishing, long-form essays, literary colloquia",
    description:
      "Warm tactile paper background with ink-black literary serif typography and understated roman numbering.",
    tags: ["Paper", "Serif", "Editorial", "Warm"],
    slides: [
      {
        title: "Of Paper & Ink",
        subtitle: "An Inquiry into Digital Typography and the Printed Word",
        layout: "title",
      },
      {
        title: "Chapter I: The Tactile Surface",
        bullets: ["Warm cream tones reduce ocular fatigue", "The permanence of printed prose"],
        layout: "content",
      },
      {
        title: "Chapter II: The Voice of the Serif",
        bullets: [
          "Brackets, serifs, and calligraphic rhythm",
          "Honoring the lineage of Baskerville and Bodoni",
        ],
        layout: "two-column",
      },
      {
        title: "Finis",
        bullets: ["Bound and distributed in digital format"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "pure-geometry",
    name: "Pure Geometry",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 16,
    fonts: "Space Grotesk + Outfit",
    colors: {
      primary: "#0F172A",
      accent: "#3B82F6",
      bg: "#F8FAFC",
    },
    bestFor: "Technology manifestos, industrial design principles, engineering axioms",
    description:
      "Bauhaus-inspired circular, triangular, and square framing with generous negative space.",
    tags: ["Bauhaus", "Geometry", "Modern", "Minimal"],
    slides: [
      {
        title: "Form Follows Function",
        subtitle: "Bauhaus Principles for the Digital Age",
        layout: "title",
      },
      {
        title: "The Primary Shapes",
        bullets: [
          "The Circle: Continuity and Focus",
          "The Square: Structure and Order",
          "The Triangle: Direction and Tension",
        ],
        layout: "content",
      },
      {
        title: "Unified Design Axiom",
        bullets: ["Art and technology: a new unity", "Crafting tools for humanity"],
        layout: "two-column",
      },
      {
        title: "Closing Synthesis",
        bullets: ["Elegance through structural truth"],
        layout: "conclusion",
      },
    ],
    tier: "free",
    isFree: true,
  },
  {
    id: "distilled-typography",
    name: "Distilled Typography",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 12,
    fonts: "Syne + Inter",
    colors: {
      primary: "#18181B",
      accent: "#F97316",
      bg: "#FFFFFF",
    },
    bestFor: "Creative agency pitches, bold short statements, keynote hooks",
    description:
      "Extreme typographic scale where words become the primary visual art form, zero fluff.",
    tags: ["Typography", "Minimal", "Bold", "Creative"],
    slides: [
      {
        title: "FEWER WORDS. MORE TRUTH.",
        subtitle: "A Distillation of Modern Communication",
        layout: "title",
      },
      {
        title: "The Problem is Noise",
        bullets: ["When everything shouts, nothing is heard."],
        layout: "content",
      },
      {
        title: "The Solution is Precision",
        bullets: ["Say in ten words what others lose in fifty."],
        layout: "two-column",
      },
      {
        title: "Execute with Conviction",
        bullets: ["DocuMind Document Studio"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "architectural-baseline",
    name: "Architectural Baseline",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 16,
    fonts: "Public Sans + JetBrains Mono",
    colors: {
      primary: "#27272A",
      accent: "#A1A1AA",
      bg: "#F4F4F5",
    },
    bestFor: "Structural engineering, blueprint reviews, construction scheduling",
    description:
      "Subtle blueprint millimeter tick marks, monospaced metadata headers, and disciplined alignment rules.",
    tags: ["Architectural", "Technical", "Baseline", "Minimal"],
    slides: [
      {
        title: "Project Datum: Structural Baseline",
        subtitle: "Engineering Specifications & Dimensioning",
        layout: "title",
      },
      {
        title: "Tolerances & Load Paths",
        bullets: [
          "Maximum allowable deflection: L/360",
          "Uniform load distribution across perimeter columns",
        ],
        layout: "content",
      },
      {
        title: "Material Schedule",
        bullets: ["Post-tensioned concrete slab (f'c = 5,000 psi)", "Structural steel grade 50"],
        layout: "two-column",
      },
      {
        title: "Approval Sign-Off",
        bullets: ["Engineer of Record stamp required prior to pour"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "nordic-contrast",
    name: "Nordic Contrast",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 14,
    fonts: "Plus Jakarta + Newsreader",
    colors: {
      primary: "#1E293B",
      accent: "#38BDF8",
      bg: "#F8FAFC",
    },
    bestFor: "Scandinavian design, calm productivity, executive sabbaticals",
    description:
      "Pale frosty blue and charcoal accents reflecting Arctic light, calm pacing, and understated dignity.",
    tags: ["Nordic", "Scandinavian", "Calm", "Minimal"],
    slides: [
      {
        title: "Lagom: Balance in Product Design",
        subtitle: "Not Too Little, Not Too Much. Just Enough.",
        layout: "title",
      },
      {
        title: "The Philosophy of Restraint",
        bullets: [
          "Removing digital friction without creating sterility",
          "Creating space for intentional reflection",
        ],
        layout: "content",
      },
      {
        title: "Natural Materials & Light",
        bullets: ["Brushed birch tones and natural diffuse light", "Subtle haptic feedback cues"],
        layout: "two-column",
      },
      {
        title: "Dwell in Peace",
        bullets: ["A sustainable rhythm for modern work"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "studio-slate",
    name: "Studio Slate",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 16,
    fonts: "DM Sans + Space Mono",
    colors: {
      primary: "#0F172A",
      accent: "#94A3B8",
      bg: "#1E293B",
    },
    bestFor: "Recording studios, screenwriters, audio engineering showcases",
    description:
      "Deep slate surfaces with cool gray typography and minimal studio console indicators.",
    tags: ["Slate", "Dark Minimal", "Studio", "Audio"],
    slides: [
      {
        title: "Studio Slate: Master Tracking",
        subtitle: "Session Notes & Audio Engineering Log",
        layout: "title",
      },
      {
        title: "Signal Chain & Preamps",
        bullets: ["Neve 1073 into 1176 Peak Limiter", "Schoeps Colette pair on acoustic grand"],
        layout: "content",
      },
      {
        title: "Track Stems & Dynamic Range",
        bullets: ["Master LUFS: -14 integrated", "Dynamic range preservation without clipping"],
        layout: "two-column",
      },
      {
        title: "Deliverables",
        bullets: ["96kHz / 24-bit uncompressed WAV stems archived"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "essentialist-outline",
    name: "Essentialist Outline",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 12,
    fonts: "Inter + Newsreader Italic",
    colors: {
      primary: "#18181B",
      accent: "#52525B",
      bg: "#FFFFFF",
    },
    bestFor: "Board memorandums, team alignment memos, one-page briefs",
    description:
      "Roman numeral outlines with clean hierarchy, zero bullet fatigue, and effortless readability.",
    tags: ["Essentialist", "Outline", "Clean", "Memo"],
    slides: [
      {
        title: "I. Strategic Memorandum on Execution",
        subtitle: "Internal Working Document for Executive Leadership",
        layout: "title",
      },
      {
        title: "II. Current State & Critical Bottlenecks",
        bullets: ["A. Cross-team dependency delays", "B. Fragmented customer touchpoints"],
        layout: "content",
      },
      {
        title: "III. The Path to Operational Simplicity",
        bullets: ["A. Consolidate core workflow pipelines", "B. Empower local decision velocity"],
        layout: "two-column",
      },
      {
        title: "IV. Immediate Next Steps",
        bullets: ["All teams aligned by end of quarter"],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
  {
    id: "zen-columnar",
    name: "Zen Columnar",
    category: "Minimal",
    kind: "minimal",
    slidesCount: 14,
    fonts: "Cormorant Garamond + Inter",
    colors: {
      primary: "#292524",
      accent: "#78716C",
      bg: "#FAF8F5",
    },
    bestFor: "Mindfulness, meditative literature, non-profit annual messages",
    description:
      "Single centered column of quiet wisdom, generous top and bottom margins, and classical proportions.",
    tags: ["Zen", "Mindfulness", "Columnar", "Peaceful"],
    slides: [
      {
        title: "The Art of Doing Less",
        subtitle: "Meditations on Focus in an Age of Acceleration",
        layout: "title",
      },
      {
        title: "Stillness as Strength",
        bullets: [
          "In the pause between thoughts, true discernment emerges.",
          "Do not mistake busyness for contribution.",
        ],
        layout: "content",
      },
      {
        title: "The Clean Slate",
        bullets: ["Return daily to beginner's mind", "Clear the workspace, clear the attention"],
        layout: "two-column",
      },
      {
        title: "Peace to Your Work",
        bullets: ["DocuMind — Your Documents. Smarter."],
        layout: "conclusion",
      },
    ],
    tier: "pro",
    isFree: false,
  },
];
