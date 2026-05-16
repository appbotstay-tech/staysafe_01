"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  normalizeSifValue,
  SIF_INPUT_REQUIRED_MESSAGE
} from "./sif";

type SifInputProps = {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  className: string;
  list?: string;
  placeholder?: string;
  ariaLabel?: string;
  serverError?: string;
};

const INVALID_INPUT_CLASS =
  "border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-950 dark:text-red-200";

export function SifInput({
  name,
  defaultValue = "",
  disabled = false,
  className,
  list,
  placeholder = "Ex.: 1234 ou NA",
  ariaLabel,
  serverError = ""
}: SifInputProps) {
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState(serverError);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setCustomValidity(serverError);
    }

    setError(serverError);
  }, [serverError]);

  function setInputValidity(input: HTMLInputElement, message: string) {
    input.setCustomValidity(message);
    setError(message);
  }

  function clearInputValidity(input: HTMLInputElement) {
    input.setCustomValidity("");
    setError("");
  }

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        name={name}
        defaultValue={defaultValue}
        list={list}
        required
        pattern=".*\S.*"
        title={SIF_INPUT_REQUIRED_MESSAGE}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`${className} ${error ? INVALID_INPUT_CLASS : ""}`}
        onInvalid={(event) => {
          setInputValidity(event.currentTarget, SIF_INPUT_REQUIRED_MESSAGE);
        }}
        onInput={(event) => {
          const input = event.currentTarget;
          const hasOnlyBlank = input.value.length > 0 && input.value.trim().length === 0;
          if (hasOnlyBlank) {
            setInputValidity(input, SIF_INPUT_REQUIRED_MESSAGE);
            return;
          }

          clearInputValidity(input);
        }}
        onBlur={(event) => {
          const input = event.currentTarget;
          const normalized = normalizeSifValue(input.value);

          if (!normalized) {
            setInputValidity(input, SIF_INPUT_REQUIRED_MESSAGE);
            return;
          }

          input.value = normalized;
          clearInputValidity(input);
        }}
      />
      {error ? (
        <span
          id={errorId}
          className="mt-1 block text-xs font-medium text-red-600 dark:text-red-300"
        >
          {error}
        </span>
      ) : null}
    </>
  );
}
