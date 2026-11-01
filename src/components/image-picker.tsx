"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Image input for activity/programme photos: pick a file from the device OR take
 * one with the camera. Unlike CameraCapture (applicant identity photos, which
 * stay live-capture on purpose), branch staff post pictures taken earlier at an
 * event, so a file picker is the primary path here.
 *
 * The picked image is downscaled and re-encoded in the browser, then uploaded
 * straight to object storage via a presigned PUT — so a 6MB phone photo becomes
 * a ~200KB WebP and the bytes never touch the app server. If object storage
 * isn't configured (local dev without R2 credentials), it falls back to
 * embedding a data URL, which is what the app did previously.
 */

const MAX_EDGE = 1600; // longest side after downscale
const QUALITY = 0.82;

export function ImagePicker({
  kind,
  value,
  onChange,
}: {
  /** Upload bucket + permission bucket; must match a key in the sign route. */
  kind: "post" | "future-program" | "session";
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("ImageUpload");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  // Always release the camera when this component goes away.
  useEffect(() => stopCamera, []);

  /** Downscale to MAX_EDGE and re-encode, preferring WebP. */
  async function shrink(source: CanvasImageSource, w: number, h: number) {
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    // Safari versions without WebP encoding return null — fall back to JPEG.
    if (blob) return blob;
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!jpeg) throw new Error("encode failed");
    return jpeg;
  }

  /** Upload to object storage, or fall back to a data URL if it isn't set up. */
  async function store(blob: Blob) {
    const res = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, contentType: blob.type, size: blob.size }),
    });

    if (res.status === 503) {
      // No object storage on this deployment — embed the image as before.
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(new Error("read failed"));
        fr.readAsDataURL(blob);
      });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? t("uploadFailed"));
    }

    const { uploadUrl, publicUrl } = await res.json();
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!put.ok) throw new Error(t("uploadFailed"));
    return publicUrl as string;
  }

  async function handle(work: () => Promise<Blob>) {
    setError("");
    setBusy(true);
    try {
      onChange(await store(await work()));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("notAnImage"));
      return;
    }
    void handle(async () => {
      const bitmap = await createImageBitmap(file);
      try {
        return await shrink(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    });
  }

  async function startCamera() {
    setError("");
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      setError(t("cameraUnsupported"));
      return;
    }
    try {
      // Rear camera by default — staff are photographing an event, not themselves.
      const stream = await md.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setError(t("cameraDenied"));
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    stopCamera();
    void handle(() => shrink(video, w, h));
  }

  function clear() {
    onChange("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const btn =
    "rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      {value && !streaming && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-h-64 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-800"
          />
          <button
            type="button"
            onClick={clear}
            className={`${btn} self-start bg-gray-600 hover:bg-gray-700`}
          >
            {t("remove")}
          </button>
        </>
      )}

      {streaming && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-64 w-full rounded-lg border border-gray-200 bg-black object-contain dark:border-gray-800"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={takePhoto}
              className={`${btn} bg-emerald-600 hover:bg-emerald-700`}
            >
              {t("takePhoto")}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className={`${btn} bg-gray-600 hover:bg-gray-700`}
            >
              {t("cancel")}
            </button>
          </div>
        </>
      )}

      {!value && !streaming && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700`}
          >
            {busy ? t("uploading") : t("choosePhoto")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={startCamera}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:hover:bg-emerald-950/40"
          >
            {t("useCamera")}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFile}
      />
      {busy && <span className="text-sm text-gray-500">{t("uploading")}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
