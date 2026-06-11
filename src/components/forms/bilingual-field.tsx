// A labeled pair of inputs for an { en, kn } localized field. Emits `${name}En`
// and `${name}Kn` form values. Presentational — usable in server or client forms.

export function BilingualField({
  name,
  label,
  defaultEn = "",
  defaultKn = "",
  required = false,
  error,
}: {
  name: string;
  label: string;
  defaultEn?: string;
  defaultKn?: string;
  required?: boolean;
  error?: string;
}) {
  const input =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name={`${name}En`}
          defaultValue={defaultEn}
          placeholder="English"
          required={required}
          className={input}
        />
        <input
          name={`${name}Kn`}
          defaultValue={defaultKn}
          placeholder="ಕನ್ನಡ"
          lang="kn"
          className={input}
        />
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
