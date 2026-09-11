import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 font-bold text-xl">
          404
        </div>
        <h2 className="text-2xl font-bold">Page Not Found</h2>
        <p className="text-zinc-400 text-sm">
          The requested page could not be found. Return to the WellUP health assistant.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
        >
          Return to WellUP
        </Link>
      </div>
    </div>
  );
}
