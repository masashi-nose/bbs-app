import { cn } from "@/utils/cn";

const fieldClass =
  "w-full rounded-md border border-border bg-surface p-2.5 text-base aria-invalid:border-danger";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  // 入力欄の説明として読み上げさせる要素の id（エラー表示の id は自動で付与する）
  describedBy?: string;
  children?: React.ReactNode;
};

function Field({
  id,
  label,
  error,
  children,
  control,
}: FieldProps & { control: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block font-bold" htmlFor={id}>
        {label}
      </label>
      {control}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {children}
    </div>
  );
}

function describedByOf(id: string, error?: string, describedBy?: string) {
  return cn(error && `${id}-error`, describedBy) || undefined;
}

export function FieldError(props: React.ComponentProps<"p">) {
  return <p className="mt-1 text-sm text-danger" {...props} />;
}

// label + input + エラー表示。children は入力欄の下（エラーの後）に表示する補足要素
export function TextField({
  id,
  label,
  error,
  describedBy,
  children,
  ...inputProps
}: FieldProps & Omit<React.ComponentProps<"input">, "id" | "children">) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      control={
        <input
          id={id}
          name={id}
          className={fieldClass}
          aria-invalid={!!error}
          aria-describedby={describedByOf(id, error, describedBy)}
          {...inputProps}
        />
      }
    >
      {children}
    </Field>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  describedBy,
  children,
  ...textareaProps
}: FieldProps & Omit<React.ComponentProps<"textarea">, "id" | "children">) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      control={
        <textarea
          id={id}
          name={id}
          className={cn(fieldClass, "min-h-[150px] resize-y")}
          aria-invalid={!!error}
          aria-describedby={describedByOf(id, error, describedBy)}
          {...textareaProps}
        />
      }
    >
      {children}
    </Field>
  );
}
