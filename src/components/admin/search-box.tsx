// A no-JS search box: a GET form that submits `?q=` to the current route.
// Resets pagination by omitting `page`. Server-renderable.

export function SearchBox({
  placeholder,
  defaultValue = "",
}: {
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
      />
    </form>
  );
}
