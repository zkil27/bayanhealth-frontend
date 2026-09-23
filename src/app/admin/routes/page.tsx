"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  FileHeart,
  FileSignature,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  History,
  LayoutDashboard,
  Lock,
  MessagesSquare,
  Moon,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
  UserCog,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RouteCategory = "all" | "consultation" | "doctor" | "patient" | "admin" | "public";

interface AppRouteItem {
  path: string;
  title: string;
  description: string;
  category: "consultation" | "doctor" | "patient" | "admin" | "public";
  role: "Public" | "Doctor" | "Patient" | "Admin" | "Demo / Anyone";
  icon: LucideIcon;
  isSpecialDemo?: boolean;
}

const ALL_APP_ROUTES: AppRouteItem[] = [
  // Demo Launchers & Consultation
  {
    path: "/consultation/room/demo",
    title: "Live Consultation Room (Demo Session)",
    description: "Interactive consultation room with simulated HD video feed, controls, patient intake preview, and live dual-way demo chat without requiring a booking ID.",
    category: "consultation",
    role: "Demo / Anyone",
    icon: Video,
    isSpecialDemo: true,
  },
  {
    path: "/doctor/post-consultation/id?consultationId=demo&bookingId=demo",
    title: "Post-Consultation CDS Workspace (Demo Session)",
    description: "Assessment-first clinical workspace with pre-populated CDS diagnosis (J06.9), active medication orders, med cert, and scroll-contained deliverables deck.",
    category: "consultation",
    role: "Demo / Anyone",
    icon: FileSignature,
    isSpecialDemo: true,
  },

  // Doctor Suite
  {
    path: "/doctor",
    title: "Doctor Flight Deck & Queue",
    description: "Primary physician cockpit displaying duty status, triage queue, active consultation callouts, and standby roster.",
    category: "doctor",
    role: "Doctor",
    icon: LayoutDashboard,
  },
  {
    path: "/doctor/schedule",
    title: "Doctor Schedule & Availability",
    description: "Physician working calendar, weekly shifts, consultation slots management, and unassigned coverage windows.",
    category: "doctor",
    role: "Doctor",
    icon: Calendar,
  },
  {
    path: "/doctor/history",
    title: "Doctor Consultation History",
    description: "Archived patient consultations, past clinical notes, completed prescriptions, and encounter timestamps.",
    category: "doctor",
    role: "Doctor",
    icon: History,
  },
  {
    path: "/doctor/chat",
    title: "Doctor Clinical Messages",
    description: "Secure messaging dashboard with patient conversation threads and pre-consult triage chat.",
    category: "doctor",
    role: "Doctor",
    icon: MessagesSquare,
  },
  {
    path: "/doctor/kyc",
    title: "Doctor Credentialing & Verification",
    description: "PRC license upload, government ID verification, and clinical practice credentials review.",
    category: "doctor",
    role: "Doctor",
    icon: UserCheck,
  },
  {
    path: "/doctor/moonlight",
    title: "Doctor Moonlight Shifts",
    description: "Off-hours clinical shifts, emergency overflow triage roster, and after-hours availability toggle.",
    category: "doctor",
    role: "Doctor",
    icon: Moon,
  },
  {
    path: "/doctor/profile",
    title: "Doctor Professional Profile",
    description: "Physician public bio, medical specialties, clinical subspecialties, and consultation rates.",
    category: "doctor",
    role: "Doctor",
    icon: Stethoscope,
  },

  // Patient Suite
  {
    path: "/patient",
    title: "Patient Dashboard & Portal",
    description: "Mobile-first patient command center showing upcoming consultations, active medications, and quick health actions.",
    category: "patient",
    role: "Patient",
    icon: HeartPulse,
  },
  {
    path: "/patient/booking",
    title: "Book a Consultation",
    description: "Specialty triage selector, chief complaint intake, and clinical department selection.",
    category: "patient",
    role: "Patient",
    icon: Calendar,
  },
  {
    path: "/patient/booking/search",
    title: "Find a Doctor & Search",
    description: "Filter licensed physicians by specialty, language, fee, and immediate availability.",
    category: "patient",
    role: "Patient",
    icon: Search,
  },
  {
    path: "/patient/health",
    title: "Health Records & Vitals",
    description: "Medical history, lab results, uploaded diagnostics, and chronic condition tracking.",
    category: "patient",
    role: "Patient",
    icon: FileHeart,
  },
  {
    path: "/patient/chat",
    title: "Patient Consult Chat",
    description: "Direct teleconsultation messaging thread with attending physicians.",
    category: "patient",
    role: "Patient",
    icon: MessagesSquare,
  },
  {
    path: "/patient/profile",
    title: "Patient Profile & Account",
    description: "Personal details, emergency contacts, PhilHealth/HMO insurance identifiers, and preferences.",
    category: "patient",
    role: "Patient",
    icon: User,
  },
  {
    path: "/redesign",
    title: "Tagalog Patient Flow (Design Preview)",
    description: "Figma hardog board preview featuring localized Tagalog patient onboarding and step-by-step intake.",
    category: "patient",
    role: "Demo / Anyone",
    icon: Compass,
    isSpecialDemo: true,
  },

  // Admin Suite
  {
    path: "/admin",
    title: "Admin Operations Overview",
    description: "High-level platform analytics, real-time consultation volume, active doctor roster, and alert metrics.",
    category: "admin",
    role: "Admin",
    icon: LayoutDashboard,
  },
  {
    path: "/admin/bookings",
    title: "Admin Bookings Operations",
    description: "Live management of all platform consultations, dispute triage, doctor reassignment, and refund processing.",
    category: "admin",
    role: "Admin",
    icon: FileSpreadsheet,
  },
  {
    path: "/admin/users",
    title: "Admin User Management",
    description: "Platform accounts directory, role assignments (Patient, Doctor, Admin), and account status control.",
    category: "admin",
    role: "Admin",
    icon: Users,
  },
  {
    path: "/admin/kyc",
    title: "Admin KYC Supervision",
    description: "Physician PRC license verification queue, document auditing, and approval workflow.",
    category: "admin",
    role: "Admin",
    icon: ShieldCheck,
  },
  {
    path: "/admin/notifications",
    title: "System Notification Outbox",
    description: "SMS and email delivery logs, broadcast queue, and clinical alert dispatch history.",
    category: "admin",
    role: "Admin",
    icon: FileText,
  },
  {
    path: "/admin/settings",
    title: "Platform Configuration & Rules",
    description: "System parameters, payout rules, clinic operating hours, and security parameters.",
    category: "admin",
    role: "Admin",
    icon: Settings,
  },

  // Public & Marketing
  {
    path: "/",
    title: "BayanHealth Landing Page",
    description: "Public homepage showcasing telehealth services, doctor recruitment, and patient trust badges.",
    category: "public",
    role: "Public",
    icon: BookOpen,
  },
  {
    path: "/medical-hub",
    title: "Medical Hub & Clinical Guidelines",
    description: "Public clinical protocol reference, patient educational guides, and health advisories.",
    category: "public",
    role: "Public",
    icon: HeartPulse,
  },
  {
    path: "/para-sa-organisasyon",
    title: "Para Sa Organisasyon (Enterprise)",
    description: "Corporate wellness packages, B2B clinic partnerships, and organizational healthcare programs.",
    category: "public",
    role: "Public",
    icon: Users,
  },
  {
    path: "/signIn",
    title: "Sign In",
    description: "Cognito authentication portal supporting password and OTP login.",
    category: "public",
    role: "Public",
    icon: Lock,
  },
  {
    path: "/signUp",
    title: "Patient / Provider Registration",
    description: "Account creation flow for patients and healthcare providers.",
    category: "public",
    role: "Public",
    icon: UserCog,
  },
  {
    path: "/verify",
    title: "Account Verification (OTP)",
    description: "Verification code confirmation portal for phone and email validation.",
    category: "public",
    role: "Public",
    icon: Shield,
  },
  {
    path: "/privacy",
    title: "Privacy Policy",
    description: "Data Privacy Act (RA 10173) compliance, patient health information security disclosures.",
    category: "public",
    role: "Public",
    icon: ShieldAlert,
  },
  {
    path: "/refund",
    title: "Refund Policy",
    description: "Terms and conditions for cancelled bookings, medical triage refunds, and dispute resolution.",
    category: "public",
    role: "Public",
    icon: FileText,
  },
];

export default function AdminRoutesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<RouteCategory>("all");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const filteredRoutes = useMemo(() => {
    return ALL_APP_ROUTES.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.path.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const copyToClipboard = (path: string) => {
    navigator.clipboard.writeText(window.location.origin + path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const countsByCategory = useMemo(() => {
    return {
      all: ALL_APP_ROUTES.length,
      consultation: ALL_APP_ROUTES.filter((r) => r.category === "consultation").length,
      doctor: ALL_APP_ROUTES.filter((r) => r.category === "doctor").length,
      patient: ALL_APP_ROUTES.filter((r) => r.category === "patient").length,
      admin: ALL_APP_ROUTES.filter((r) => r.category === "admin").length,
      public: ALL_APP_ROUTES.filter((r) => r.category === "public").length,
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Compass className="size-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-(--navy-700)">
                BayanHealth Route Directory
              </h1>
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
                {ALL_APP_ROUTES.length} Routes
              </Badge>
            </div>
            <p className="text-sm text-(--text-muted)">
              Complete site index and zero-backend preview launchers for rapid testing and design inspection.
            </p>
          </div>

          {/* Quick Demo Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/consultation/room/demo"
              className={cn(buttonVariants(), "bg-(--teal-700) font-semibold text-white shadow-xs hover:bg-(--teal-700)/90")}
            >
              <Video className="mr-1.5 size-4" />
              Live Room Demo
            </Link>
            <Link
              href="/doctor/post-consultation/id?consultationId=demo&bookingId=demo"
              className={cn(buttonVariants({ variant: "outline" }), "border-(--border-subtle) text-(--navy-700) hover:bg-(--surface-warm)")}
            >
              <FileSignature className="mr-1.5 size-4" />
              Post-Consult CDS Demo
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-(--border-subtle) sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by path, title, description, or role (e.g., 'consultation', 'doctor', 'patient')..."
              className="h-10 pl-9 rounded-xl border-(--border-subtle) bg-(--surface-card)"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "consultation", label: "Consultation" },
                { id: "doctor", label: "Doctor" },
                { id: "patient", label: "Patient" },
                { id: "admin", label: "Admin" },
                { id: "public", label: "Public & Auth" },
              ] as const
            ).map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className={
                  selectedCategory === cat.id
                    ? "rounded-xl bg-(--navy-700) text-white hover:bg-(--navy-700)/90"
                    : "rounded-xl border-(--border-subtle) text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-body)"
                }
              >
                {cat.label}
                <span className="ml-1.5 text-[11px] opacity-70">
                  ({countsByCategory[cat.id]})
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Zero-Backend Launchers (When viewing all or consultation) */}
      {(selectedCategory === "all" || selectedCategory === "consultation") && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-(--text-muted)">
              Instant Demo Workspaces (Zero-Backend Required)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Consultation Room Launcher */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-teal-600/30 bg-gradient-to-br from-teal-50/40 via-(--surface-card) to-(--surface-card) p-5 shadow-xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge className="border-teal-200 bg-teal-100 text-teal-800">
                    Live Demo Ready
                  </Badge>
                  <span className="text-xs font-mono text-teal-700 font-semibold">
                    /consultation/room/demo
                  </span>
                </div>
                <h3 className="text-base font-bold text-(--navy-700)">
                  Interactive Consultation Room
                </h3>
                <p className="text-xs leading-relaxed text-(--text-muted)">
                  Opens the active video consultation experience without needing an existing booking in DynamoDB. Includes simulated patient video feed (Maria Santos), intake reference drawer, and live interactive demo chat.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-(--border-subtle)">
                <Link
                  href="/consultation/room/demo"
                  className={cn(buttonVariants({ size: "sm" }), "flex-1 rounded-xl bg-(--teal-700) font-semibold text-white hover:bg-(--teal-700)/90")}
                >
                  <Video className="mr-1.5 size-4" />
                  Enter Consultation Room
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl border-(--border-subtle)"
                  onClick={() => copyToClipboard("/consultation/room/demo")}
                  title="Copy link"
                >
                  {copiedPath === "/consultation/room/demo" ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4 text-(--text-muted)" />
                  )}
                </Button>
              </div>
            </div>

            {/* Post-Consultation Workspace Launcher */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-indigo-600/20 bg-gradient-to-br from-indigo-50/40 via-(--surface-card) to-(--surface-card) p-5 shadow-xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge className="border-indigo-200 bg-indigo-100 text-indigo-800">
                    CDS Demo Ready
                  </Badge>
                  <span className="text-xs font-mono text-indigo-700 font-semibold truncate max-w-[200px]">
                    /doctor/post-consultation/...
                  </span>
                </div>
                <h3 className="text-base font-bold text-(--navy-700)">
                  Assessment-First CDS Workspace
                </h3>
                <p className="text-xs leading-relaxed text-(--text-muted)">
                  Inspect the post-consultation screen with pre-populated ICD-10 diagnostics, interactive Amoxicillin + Paracetamol prescriptions, scroll-contained medical certificate, and verified patient vitals.
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 pt-3 border-t border-(--border-subtle)">
                <Link
                  href="/doctor/post-consultation/id?consultationId=demo&bookingId=demo"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1 rounded-xl border-indigo-300 text-indigo-950 hover:bg-indigo-50 font-semibold")}
                >
                  <FileSignature className="mr-1.5 size-4 text-indigo-600" />
                  Open CDS Workspace
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl border-(--border-subtle)"
                  onClick={() =>
                    copyToClipboard(
                      "/doctor/post-consultation/id?consultationId=demo&bookingId=demo"
                    )
                  }
                  title="Copy link"
                >
                  {copiedPath ===
                  "/doctor/post-consultation/id?consultationId=demo&bookingId=demo" ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4 text-(--text-muted)" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of All Filtered Routes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-(--text-muted)">
            {selectedCategory.toUpperCase()} ROUTES ({filteredRoutes.length})
          </h2>
          {searchQuery && (
            <span className="text-xs text-(--text-muted)">
              Filtered by &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        {filteredRoutes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--border-subtle) bg-(--surface-card) p-12 text-center">
            <Compass className="mx-auto size-8 text-(--text-muted)/50" />
            <p className="mt-2 text-sm font-semibold text-(--text-body)">No matching routes found</p>
            <p className="mt-1 text-xs text-(--text-muted)">
              Try searching for a different keyword or reset the category filter.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 rounded-xl border-(--border-subtle)"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoutes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  className="group flex flex-col justify-between rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-(--surface-warm) text-(--navy-700)">
                          <Icon className="size-4" />
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-semibold tracking-wider text-(--text-muted)"
                        >
                          {item.role}
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.path)}
                        className="rounded-md p-1 text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-body) transition-colors"
                        title="Copy relative route"
                      >
                        {copiedPath === item.path ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-(--navy-700) group-hover:text-teal-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-(--text-muted)">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-(--border-subtle) pt-3">
                    <code className="rounded bg-(--surface-warm) px-1.5 py-0.5 font-mono text-[11px] text-(--text-muted) max-w-[170px] truncate">
                      {item.path}
                    </code>

                    <Link
                      href={item.path}
                      className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold text-(--teal-700) hover:bg-teal-50 hover:text-teal-800")}
                    >
                      Launch
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
