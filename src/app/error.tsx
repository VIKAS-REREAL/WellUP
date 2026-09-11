"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("WellUP App Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 font-bold text-xl">
          !
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-zinc-400 text-sm">
          An unexpected error occurred while loading this view.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
