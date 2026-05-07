import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-neutral-950 to-slate-950 text-neutral-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none"></div>

      <div className="relative container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-10">
          {/* Main Heading */}
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
              ORVAIT
            </h1>
            <p className="text-2xl md:text-3xl text-neutral-200 font-light tracking-wide">
              Advanced Recruitment Technology
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto opacity-80"></div>
          </div>

          {/* Description */}
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-xl text-neutral-300 leading-relaxed font-light">
              Revolutionizing recruitment with advanced proctoring technology and comprehensive assessment tools for all professional roles.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 mt-12">
            <Link
              href="/admin"
              className="group relative inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-semibold rounded-2xl shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-400/40 transition-all duration-500 transform hover:scale-105 hover:-translate-y-1"
            >
              <span className="relative z-10">Admin Portal</span>
              <svg className="ml-3 w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            </Link>
          </div>

          {/* Candidate Note */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="p-8 bg-gradient-to-r from-neutral-900/80 to-slate-900/80 rounded-2xl border border-neutral-700/50 backdrop-blur-xl shadow-2xl shadow-black/50">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">For Candidates</span>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Please use the unique assessment link provided in your email invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
