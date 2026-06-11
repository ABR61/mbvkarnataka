import Link from "next/link";

// Rendered by Next's forbidden() (see requirePermission) when a signed-in user
// lacks a required permission. Bilingual + static so it needs no locale context.
export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-5xl font-bold text-emerald-600">403</span>
      <h1 className="text-2xl font-bold">
        Access denied · ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ
      </h1>
      <p className="max-w-md text-gray-600 dark:text-gray-300">
        You don’t have permission to view this page. Contact an administrator if
        you think this is a mistake. · ಈ ಪುಟವನ್ನು ವೀಕ್ಷಿಸಲು ನಿಮಗೆ ಅನುಮತಿ ಇಲ್ಲ.
      </p>
      <Link
        href="/admin"
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Dashboard
      </Link>
    </main>
  );
}
