"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

const MAX_MB = 2;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

interface AvatarUploaderProps {
  currentImage: string | null;
  name: string | null;
}

export function AvatarUploader({ currentImage, name }: AvatarUploaderProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(currentImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_MB} MB.`);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Upload failed. Please try again.");
        return;
      }
      setImage(data.image as string);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    setError(undefined);
    setBusy(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Couldn't remove your photo. Please try again.");
        return;
      }
      setImage(null);
      router.refresh();
    } catch {
      setError("Couldn't remove your photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <FormMessage error={error} />
      <div className="flex items-center gap-4">
        <span className="border-border-strong bg-surface-muted text-ink flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border text-2xl font-medium">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? "Working…" : image ? "Change photo" : "Upload photo"}
            </Button>
            {image ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                disabled={busy}
                className="text-danger hover:bg-danger-soft"
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-muted text-xs">JPEG, PNG, WebP or AVIF · up to {MAX_MB} MB</p>
        </div>
      </div>
    </div>
  );
}
