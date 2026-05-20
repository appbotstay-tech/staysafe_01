"use client";

import { useEffect, useRef, useState } from "react";

import {
  PDF_UPLOAD_ACCEPT_ATTRIBUTE,
  validatePdfUploadFile
} from "@/lib/pdf-upload-rules";

type PdfUploadFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
  inputClassName?: string;
  existingFileName?: string | null;
};

const DEFAULT_INPUT_CLASS = "bpma-input";

export function PdfUploadField({
  name,
  label,
  required = false,
  helperText,
  inputClassName = DEFAULT_INPUT_CLASS,
  existingFileName = null
}: PdfUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState(existingFileName ?? "");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setSelectedFileName(existingFileName ?? "");
    setValidationError("");
  }, [existingFileName]);

  const clearSelectedFile = () => {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      input.setCustomValidity("");
    }

    setSelectedFileName(existingFileName ?? "");
    setValidationError("");
  };

  return (
    <label className="text-sm text-slate-700 dark:text-slate-200">
      {label}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={PDF_UPLOAD_ACCEPT_ATTRIBUTE}
        required={required && !existingFileName}
        className={`${inputClassName} ${
          validationError
            ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
            : ""
        }`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setValidationError("");
          event.target.setCustomValidity("");

          if (!file) {
            setSelectedFileName(existingFileName ?? "");
            return;
          }

          const fileValidationMessage = validatePdfUploadFile({
            name: file.name,
            size: file.size,
            type: file.type
          });

          if (fileValidationMessage) {
            event.target.value = "";
            event.target.setCustomValidity(fileValidationMessage);
            setValidationError(fileValidationMessage);
            setSelectedFileName(existingFileName ?? "");
            return;
          }

          setSelectedFileName(file.name);
        }}
      />
      {helperText ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </span>
      ) : null}
      {validationError ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-300">
          {validationError}
        </span>
      ) : null}
      {selectedFileName ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          Arquivo selecionado: {selectedFileName}
        </span>
      ) : null}
      {selectedFileName && selectedFileName !== existingFileName ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-slate-700 underline dark:text-slate-200"
          onClick={clearSelectedFile}
        >
          Remover PDF selecionado
        </button>
      ) : null}
    </label>
  );
}
