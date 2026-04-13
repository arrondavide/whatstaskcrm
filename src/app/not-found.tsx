import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
          <FileQuestion size={32} className="text-gray-500" />
        </div>
        <h1 className="mt-4 text-4xl font-bold text-white">404</h1>
        <p className="mt-2 text-gray-400">This page could not be found.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
