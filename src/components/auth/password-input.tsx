"use client";

import { useState } from "react";

type PasswordInputProps = {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export function PasswordInput({
  name,
  label,
  required = false,
  placeholder,
  className
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="text-sm text-slate-700 dark:text-slate-200">
      {label}
      <div className="mt-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          required={required}
          placeholder={placeholder}
          className={`${className ?? "bpma-input"} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="btn-secondary min-h-10 px-3 py-2 text-xs sm:whitespace-nowrap"
        >
          {showPassword ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </label>
  );
}
