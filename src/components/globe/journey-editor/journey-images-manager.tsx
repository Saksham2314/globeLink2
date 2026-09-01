"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  deleteImageAction,
  reorderImagesAction,
  setCoverImageAction,
  updateImageCaptionAction,
} from "@/modules/journeys/journey.actions";
import type { JourneyEditDto } from "@/modules/journeys/journey.mappers";

type Img = JourneyEditDto["images"][number];

const MAX_MB = 4;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function JourneyImagesManager({ journey }: { journey: JourneyEditDto }) {
  const [images, setImages] = useState<Img[]>(journey.images);
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(undefined);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          setError(`"${file.name}" is over ${MAX_MB} MB`);
          continue;
        }
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/journeys/${journey.id}/images`, { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error?.message ?? "Upload failed");
          continue;
        }
        setImages((prev) => [...prev, data as Img]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
    });

  function reorder(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    setImages(next);
    run(() =>
      reorderImagesAction(
        journey.id,
        next.map((i) => i.id),
      ),
    );
  }

  function makeCover(id: string) {
    setImages((prev) => prev.map((i) => ({ ...i, isCover: i.id === id })));
    run(() => setCoverImageAction(id));
  }

  function remove(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
    run(() => deleteImageAction(id));
  }

  return (
    <div className="space-y-4">
      <FormMessage error={error} />

      <div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <span className="text-muted ml-3 text-xs">
          JPEG, PNG, WebP or AVIF · up to {MAX_MB} MB each
        </span>
      </div>

      {images.length === 0 ? (
        <p className="text-muted text-sm">No photos yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((img, i) => (
            <li key={img.id} className="border-border bg-surface overflow-hidden rounded-lg border">
              <div className="bg-surface-muted relative aspect-[4/3]">
                <Image src={img.url} alt="" fill sizes="50vw" className="object-cover" />
                {img.isCover ? (
                  <span className="bg-accent text-accent-contrast absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <Input
                  defaultValue={img.caption ?? ""}
                  placeholder="Caption (optional)"
                  onBlur={(e) => run(() => updateImageCaptionAction(img.id, e.target.value))}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {!img.isCover ? (
                    <button
                      type="button"
                      onClick={() => makeCover(img.id)}
                      className="border-border text-muted hover:bg-surface-muted hover:text-ink rounded border px-2 py-1"
                    >
                      Set as cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Move earlier"
                    onClick={() => reorder(i, i - 1)}
                    className="border-border text-muted hover:bg-surface-muted hover:text-ink rounded border px-2 py-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    onClick={() => reorder(i, i + 1)}
                    className="border-border text-muted hover:bg-surface-muted hover:text-ink rounded border px-2 py-1"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(img.id)}
                    className="border-border text-danger hover:bg-danger-soft ml-auto rounded border px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
