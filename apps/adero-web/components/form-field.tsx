// Shared form field primitives for Adero application forms.
// Not "use client" — these are plain presentational components usable anywhere.

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  errors?: string[] | undefined;
  hint?: string;
}

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  errors,
  hint,
}: FieldProps) {
  const id = `field-${name}`;
  const hasError = errors && errors.length > 0;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium"
        style={{ color: "#1e293b" }}
      >
        {label}
        {required && <span style={{ color: "#6366f1" }} className="ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors"
        style={{
          borderColor: hasError ? "#ef4444" : "#e2e8f0",
          color: "#0f172a",
          background: "#ffffff",
        }}
      />
      {hasError && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {errors![0]}
        </p>
      )}
    </div>
  );
}

interface TextareaFieldProps extends Omit<FieldProps, "type"> {
  rows?: number;
}

export function TextareaField({
  label,
  name,
  required,
  placeholder,
  defaultValue,
  errors,
  hint,
  rows = 4,
}: TextareaFieldProps) {
  const id = `field-${name}`;
  const hasError = errors && errors.length > 0;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium"
        style={{ color: "#1e293b" }}
      >
        {label}
        {required && <span style={{ color: "#6366f1" }} className="ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {hint}
        </p>
      )}
      <textarea
        id={id}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors resize-y"
        style={{
          borderColor: hasError ? "#ef4444" : "#e2e8f0",
          color: "#0f172a",
          background: "#ffffff",
        }}
      />
      {hasError && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {errors![0]}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps extends Omit<FieldProps, "type"> {
  options: { value: string; label: string }[];
}

export function SelectField({
  label,
  name,
  required,
  defaultValue,
  errors,
  hint,
  options,
}: SelectFieldProps) {
  const id = `field-${name}`;
  const hasError = errors && errors.length > 0;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium"
        style={{ color: "#1e293b" }}
      >
        {label}
        {required && <span style={{ color: "#6366f1" }} className="ml-0.5">*</span>}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {hint}
        </p>
      )}
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors bg-white"
        style={{
          borderColor: hasError ? "#ef4444" : "#e2e8f0",
          color: "#0f172a",
        }}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {errors![0]}
        </p>
      )}
    </div>
  );
}
