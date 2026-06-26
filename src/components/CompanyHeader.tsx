import React from "react";

/**
 * Pixel-perfect SVG Logo representing Wara Wara Construction & General Services.
 * Incorporates an orange excavator, green Koinadugu mountains, 
 * construction crane & buildings, and bold display branding text.
 */
export function CompanyLogo({ className = "h-16 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1000 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dynamic Graphic Top Section */}
      <g id="artwork">
        {/* Mountain Peaks (Koinadugu Range) - Green layers */}
        <polygon points="260,110 390,30 500,90 590,40 700,110" fill="#15803d" opacity="0.85" />
        <polygon points="340,110 440,50 540,110" fill="#166534" />
        <polygon points="460,110 560,35 660,110" fill="#14532d" opacity="0.9" />
        {/* Snowy/Light Highlights on peaks */}
        <polygon points="390,30 375,45 400,48" fill="#a7f3d0" />
        <polygon points="590,40 575,55 600,58" fill="#a7f3d0" />
        <polygon points="560,35 545,48 570,52" fill="#86efac" />

        {/* Orange Excavator - Left Side */}
        <g id="excavator" transform="translate(40, -10)">
          {/* Tracks Base */}
          <rect x="110" y="100" width="100" height="15" rx="7" fill="#1e293b" />
          <line x1="120" y1="108" x2="200" y2="108" stroke="#ffffff" strokeWidth="2" strokeDasharray="4 3" />
          {/* Main Cabin Body */}
          <path d="M125,75 L165,75 L175,100 L120,100 Z" fill="#ea580c" />
          <path d="M135,55 L155,55 L165,75 L130,75 Z" fill="#1e293b" /> {/* Drivers window */}
          <rect x="138" y="59" width="12" height="11" fill="#bae6fd" />
          {/* Hydraulic Arm */}
          <path d="M165,80 L210,35 L200,30 L160,75 Z" fill="#ea580c" />
          <path d="M205,33 L230,65 L245,60 L210,25 Z" fill="#ea580c" />
          {/* Shovel Bucket */}
          <path d="M230,65 C230,75 210,88 195,80 C190,75 195,68 210,68 C215,68 225,62 230,65 Z" fill="#1e293b" />
          {/* Details */}
          <circle cx="150" cy="108" r="5" fill="#475569" />
          <circle cx="175" cy="108" r="5" fill="#475569" />
        </g>

        {/* High-Rise Buildings & Tower Crane - Right Side */}
        <g id="crane-and-city" transform="translate(560, -5)">
          {/* Skyline */}
          <rect x="50" y="55" width="40" height="60" fill="#475569" />
          <rect x="95" y="30" width="50" height="85" fill="#334155" />
          <rect x="150" y="45" width="45" height="70" fill="#1e293b" />
          <rect x="200" y="65" width="35" height="50" fill="#475569" />
          {/* Windows on building */}
          <rect x="105" y="40" width="8" height="10" fill="#cbd5e1" />
          <rect x="120" y="40" width="8" height="10" fill="#cbd5e1" />
          <rect x="135" y="40" width="8" height="10" fill="#cbd5e1" />
          <rect x="105" y="60" width="8" height="10" fill="#cbd5e1" />
          <rect x="120" y="60" width="8" height="10" fill="#cbd5e1" />
          <rect x="135" y="60" width="8" height="10" fill="#cbd5e1" />
          <rect x="105" y="80" width="8" height="10" fill="#cbd5e1" />
          <rect x="120" y="80" width="8" height="10" fill="#cbd5e1" />
          <rect x="135" y="80" width="8" height="10" fill="#cbd5e1" />
          
          <rect x="160" y="55" width="8" height="8" fill="#f1f5f9" />
          <rect x="175" y="55" width="8" height="8" fill="#f1f5f9" />
          <rect x="160" y="75" width="8" height="8" fill="#f1f5f9" />
          <rect x="175" y="75" width="8" height="8" fill="#f1f5f9" />

          {/* Construction Tower Crane */}
          <line x1="185" y1="115" x2="185" y2="10" stroke="#0f172a" strokeWidth="4" />
          <line x1="100" y1="20" x2="250" y2="20" stroke="#0f172a" strokeWidth="3" />
          <line x1="250" y1="20" x2="185" y2="10" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="100" y1="20" x2="185" y2="10" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="185" y1="10" x2="185" y2="20" stroke="#ea580c" strokeWidth="3" />
          {/* Crane Hook */}
          <line x1="230" y1="20" x2="230" y2="55" stroke="#334155" strokeWidth="1.5" />
          <path d="M227,55 C227,59 233,59 233,55" stroke="#1e293b" strokeWidth="2" fill="none" />
          {/* Counterweight */}
          <rect x="120" y="15" width="20" height="10" fill="#ea580c" />
        </g>

        {/* Thick elegant ground base support line */}
        <path d="M10,114 L990,114" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
        <path d="M40,117 L960,117" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Corporate Bold Text Typography Section */}
      <g id="typography">
        {/* "WARA WARA" in huge, solid, italicized navy/dark custom display design */}
        <text
          x="500"
          y="178"
          textAnchor="middle"
          fill="#0c1d3a"
          fontSize="72"
          fontWeight="900"
          fontStyle="oblique"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="4"
        >
          WARA WARA
        </text>

        {/* "CONSTRUCTION & GENERAL SERVICES" in neat dark-orange capital letters */}
        <text
          x="500"
          y="218"
          textAnchor="middle"
          fill="#ea580c"
          fontSize="24"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="6"
        >
          CONSTRUCTION & GENERAL SERVICES
        </text>
      </g>
    </svg>
  );
}

/**
 * Beautiful digital letterhead with official company details and contact information.
 */
export function CompanyLetterhead({ darkTheme = false, centered = true }: { darkTheme?: boolean; centered?: boolean }) {
  return (
    <div className={`w-full ${centered ? "text-center" : "text-left"} space-y-3`}>
      {/* Visual SVG Brand Logo */}
      <div className={`max-w-2xl ${centered ? "mx-auto" : ""} px-2`}>
        <CompanyLogo className="w-full max-h-36 object-contain" />
      </div>

      {/* Letterhead address details strictly matching the provided uploaded image */}
      <div className="space-y-1.5 px-4">
        {/* Line 1: Main Scope Tagline */}
        <p className={`text-sm md:text-base font-extrabold tracking-wide ${darkTheme ? "text-blue-400" : "text-[#1d4ed8]"}`}>
          Construction & Supply of Building Material & Electricals
        </p>
        
        {/* Line 2: Real Physical Headquarters Address */}
        <p className={`text-xs md:text-sm font-semibold tracking-tight ${darkTheme ? "text-slate-300" : "text-slate-700"}`}>
          8 Shekie Bockarie Street - Kabala, Koinadugu
        </p>

        {/* Line 3: Official Hotlines & Registered Mail Support info */}
        <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm font-bold ${darkTheme ? "text-slate-400" : "text-slate-650"}`}>
          <span>
            Mobile: <span className={darkTheme ? "text-[#38bdf8]" : "text-indigo-700"}>076 -667575 / 077 – 263939</span>
          </span>
          <span className="hidden md:inline text-slate-400">•</span>
          <span>
            E-mail: <span className="underline font-mono lowercase">{`wararaconstructionkoinadugu@gmail.com`}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * The standard consistent software branding footer text requested by the user.
 */
export const COMPANY_SOFTWARE_FOOTER = 
  "All rights reserved this software is a property of Wara Wara Construction and General Services and Watasai Stone Investment . Software built and managed by Andrew Tech Solutions andrewdrive2025@gmail.com";
