"use client";

// Submits a server action to delete a record, guarded by a native confirm dialog.
// The server action is passed in as a prop (allowed: server action → client component).

export function DeleteButton({
  action,
  id,
  locale,
  label,
  confirmText,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  locale: string;
  label: string;
  confirmText: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        onClick={(e) => {
          if (!window.confirm(confirmText)) e.preventDefault();
        }}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
      >
        {label}
      </button>
    </form>
  );
}
