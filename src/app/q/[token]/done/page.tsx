export default function Done() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-3">
        <h1 className="text-3xl font-semibold">Submitted ✓</h1>
        <p className="text-neutral-400">
          Thanks for completing the assessment. The Generic team will review
          your answers and be in touch. If you have questions, contact{" "}
          <a className="text-emerald-400" href="mailto:hello@generic.com">
            hello@generic.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
