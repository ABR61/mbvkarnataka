// A no-JS search box: a GET form that submits `?q=` to the current route.
// Resets pagination by omitting `page`. Server-renderable.
// `placeholder` is the translated word "Search" — it also labels the input for
// screen readers and the visible submit button (not every phone keyboard makes
// "press Enter to search" obvious).

export function SearchBox({
  placeholder,
  defaultValue = "",
}: {
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form role="search" className="flex w-full max-w-md gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {placeholder}
      </button>
    </form>
  );
}
