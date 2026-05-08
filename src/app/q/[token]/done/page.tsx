export default function Done() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        {/* Success ring */}
        <div className="flex items-center justify-center">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
            <span className="text-3xl">✓</span>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/10 scale-110" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-100">Assessment Submitted</h1>
          <p className="text-sm text-emerald-400 font-medium">Your responses have been recorded.</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-left space-y-2">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Thank you for completing the assessment. Our team will carefully review your responses
            and reach out within the next few business days.
          </p>
          <p className="text-sm text-neutral-400">
            Questions? Contact{" "}
            <a
              href="mailto:hello@orvait.com"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              hello@orvait.com
            </a>
          </p>
        </div>

        <p className="text-xs text-neutral-700">
          You may now safely close this tab.
        </p>
      </div>
    </main>
  );
}
