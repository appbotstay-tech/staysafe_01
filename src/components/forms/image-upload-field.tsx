"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  IMAGE_UPLOAD_ACCEPT_ATTRIBUTE,
  validateImageUploadFile
} from "@/lib/image-upload-rules";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
  inputClassName?: string;
  existingImageDataUrl?: string | null;
  existingFileName?: string | null;
  requiredStatusFieldName?: string;
  requiredStatusValues?: string[];
  requiredMessage?: string;
};

const DEFAULT_INPUT_CLASS =
  "bpma-input";

export function ImageUploadField({
  name,
  label,
  required = false,
  helperText,
  inputClassName = DEFAULT_INPUT_CLASS,
  existingImageDataUrl = null,
  existingFileName = null,
  requiredStatusFieldName,
  requiredStatusValues = [],
  requiredMessage = "Anexe uma foto para continuar."
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>(
    existingFileName ?? ""
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageDataUrl ?? null
  );
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    setPreviewUrl(existingImageDataUrl ?? null);
    setSelectedFileName(existingFileName ?? "");
    setValidationError("");
  }, [existingFileName, existingImageDataUrl]);

  const isDataUrlPreview = useMemo(
    () => Boolean(previewUrl?.startsWith("data:")),
    [previewUrl]
  );

  const clearSelectedFile = () => {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      input.setCustomValidity("");
    }

    if (previewUrl && !previewUrl.startsWith("data:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFileName(existingFileName ?? "");
    setPreviewUrl(existingImageDataUrl ?? null);
    setValidationError("");
  };

  useEffect(() => {
    return () => {
      if (previewUrl && !isDataUrlPreview) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isDataUrlPreview, previewUrl]);

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!input || !form || !requiredStatusFieldName || requiredStatusValues.length === 0) {
      return;
    }

    const getStatusValue = () => {
      const statusField = form.elements.namedItem(requiredStatusFieldName) as
        | HTMLInputElement
        | null;

      return statusField?.value ?? "";
    };

    const hasUpload = () => Boolean(input.files?.length) || Boolean(existingImageDataUrl);

    const clearValidation = () => {
      input.setCustomValidity("");
      setValidationError("");
    };

    const clearValidationWhenRequirementChanged = () => {
      const isRequiredByStatus = requiredStatusValues.includes(getStatusValue());

      if (!isRequiredByStatus || hasUpload()) {
        clearValidation();
      }
    };

    const handleSubmit = (event: Event) => {
      const isRequiredByStatus = requiredStatusValues.includes(getStatusValue());
      const hasFile = hasUpload();
      const file = input.files?.[0] ?? null;
      const fileValidationMessage = file
        ? validateImageUploadFile({
            name: file.name,
            size: file.size,
            type: file.type
          })
        : "";

      if (fileValidationMessage) {
        input.setCustomValidity(fileValidationMessage);
        setValidationError(fileValidationMessage);
        event.preventDefault();
        event.stopPropagation();
        input.reportValidity();
        return;
      }

      if (isRequiredByStatus && !hasFile) {
        input.setCustomValidity(requiredMessage);
        setValidationError(requiredMessage);
        event.preventDefault();
        event.stopPropagation();
        input.reportValidity();
        return;
      }

      clearValidation();
    };

    form.addEventListener("submit", handleSubmit);
    form.addEventListener("input", clearValidationWhenRequirementChanged);
    form.addEventListener("change", clearValidationWhenRequirementChanged);
    clearValidationWhenRequirementChanged();

    return () => {
      form.removeEventListener("submit", handleSubmit);
      form.removeEventListener("input", clearValidationWhenRequirementChanged);
      form.removeEventListener("change", clearValidationWhenRequirementChanged);
    };
  }, [
    existingImageDataUrl,
    requiredMessage,
    requiredStatusFieldName,
    requiredStatusValues
  ]);

  return (
    <label className="text-sm text-slate-700 dark:text-slate-200">
      {label}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={IMAGE_UPLOAD_ACCEPT_ATTRIBUTE}
        required={required && !existingImageDataUrl}
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
            if (!existingImageDataUrl) {
              setSelectedFileName("");
              setPreviewUrl(null);
            }
            return;
          }

          const fileValidationMessage = validateImageUploadFile({
            name: file.name,
            size: file.size,
            type: file.type
          });

          if (fileValidationMessage) {
            event.target.value = "";
            event.target.setCustomValidity(fileValidationMessage);
            setValidationError(fileValidationMessage);
            setSelectedFileName("");
            if (previewUrl && !previewUrl.startsWith("data:")) {
              URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(existingImageDataUrl ?? null);
            return;
          }

          if (previewUrl && !previewUrl.startsWith("data:")) {
            URL.revokeObjectURL(previewUrl);
          }

          setSelectedFileName(file.name);
          setPreviewUrl(URL.createObjectURL(file));
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
          Remover foto selecionada
        </button>
      ) : null}
      {previewUrl ? (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Pré-visualização da imagem"
            className="max-h-44 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
          />
        </div>
      ) : null}
    </label>
  );
}
