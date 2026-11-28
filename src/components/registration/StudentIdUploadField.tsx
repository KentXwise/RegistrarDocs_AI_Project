"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ImagePlus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  formatFileSize,
  validateStudentIdImage,
} from "@/lib/registration-validation";

interface StudentIdUploadFieldProps {
  file: File | null;
  error?: string;
  onFileChange: (file: File | null, validationError?: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function StudentIdUploadField({
  file,
  error,
  onFileChange,
  triggerRef,
}: StudentIdUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSelectedFile = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const validationError = validateStudentIdImage(selectedFile);
    if (validationError) {
      onFileChange(null, validationError);
    } else {
      onFileChange(selectedFile, undefined);
    }

    // Reset native input value so re-selecting the same file triggers onChange
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    handleSelectedFile(selectedFile);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(droppedFile);
  };

  const handleOpenPicker = () => {
    inputRef.current?.click();
  };

  const handleRemove = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileChange(null, undefined);
  };

  const errorId = "student-id-image-error";
  const hintId = "student-id-image-hint";

  return (
    <div>
      <label
        htmlFor="student-id-image"
        className="block text-sm font-semibold text-[#25352B]"
      >
        DNSC Student ID Image <span className="text-red-700">*</span>
      </label>
      <p id={hintId} className="mt-1 text-xs leading-relaxed text-slate-600">
        Upload a clear photo of your DNSC Student ID for administrator
        verification. Accepted formats: JPG, JPEG, or PNG (max 5 MB).
      </p>

      <input
        ref={inputRef}
        id="student-id-image"
        name="studentIdImage"
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={handleInputChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        className="sr-only"
      />

      {!file || !previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-2.5 rounded-xl border-2 border-dashed p-5 text-center transition-colors sm:p-6 ${
            error
              ? "border-red-400 bg-red-50/40"
              : isDragging
                ? "border-[#174D32] bg-[#E6EFE8]/70"
                : "border-slate-300 bg-[#F5F5EF]/70 hover:border-[#246B45]/60 hover:bg-[#E6EFE8]/35"
          }`}
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#E6EFE8] text-[#174D32]">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </div>

          <p className="mt-3 text-sm font-medium text-[#25352B]">
            Select your Student ID photo or drag and drop it here
          </p>
          <p className="mt-1 text-xs text-slate-500">
            JPG, JPEG, or PNG &middot; Up to 5 MB &middot; Preview stays local
            in your browser
          </p>

          <button
            ref={triggerRef}
            type="button"
            onClick={handleOpenPicker}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[#174D32] bg-white px-4 py-2 text-sm font-semibold text-[#174D32] shadow-2xs transition-colors hover:bg-[#E6EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] focus-visible:ring-offset-2"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Choose ID Image</span>
          </button>
        </div>
      ) : (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-[#246B45]/30 bg-[#F5F5EF]/60">
          <div className="flex items-center justify-center border-b border-slate-200/80 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Selected Student ID preview: ${file.name}`}
              className="max-h-56 w-auto max-w-full rounded-lg border border-slate-200 object-contain"
            />
          </div>

          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#25352B]">
                {file.name}
              </p>
              <p className="text-xs text-slate-600">
                {formatFileSize(file.size)} &middot; Temporary local preview
                only
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                ref={triggerRef}
                type="button"
                onClick={handleOpenPicker}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#25352B] transition-colors hover:border-[#174D32] hover:bg-[#E6EFE8] hover:text-[#174D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700"
        >
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
