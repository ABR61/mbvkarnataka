"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Live camera capture — no file attachment. Streams the device camera via
 * getUserMedia and grabs a still frame on demand, so an applicant must take a
 * fresh photo (front camera by default) rather than upload an existing one.
 * Requires a secure context (https or localhost).
 */
export function CameraCapture({
  onCapture,
}: {
  onCapture: (dataUrl: string) => void;
}) {
  const t = useTranslations("Apply");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState("");
  const [error, setError] = useState("");

  function stop() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  // Always release the camera when this component goes away.
  useEffect(() => stop, []);

  async function start() {
    setError("");
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      setError(t("cameraUnsupported"));
      return;
    }
    try {
      const stream = await md.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCaptured("");
      onCapture("");
      setStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setError(t("cameraDenied"));
    }
  }

  function take() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCaptured(dataUrl);
    onCapture(dataUrl);
    stop();
  }

  const btn =
    "rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      {captured ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={captured}
            alt=""
            className="max-h-64 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-800"
          />
          <button type="button" onClick={start} className={`${btn} bg-gray-600 hover:bg-gray-700 self-start`}>
            {t("retake")}
          </button>
        </>
      ) : streaming ? (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-64 w-full rounded-lg border border-gray-200 bg-black object-contain dark:border-gray-800"
          />
          <button type="button" onClick={take} className={`${btn} bg-emerald-600 hover:bg-emerald-700 self-start`}>
            {t("takePhoto")}
          </button>
        </>
      ) : (
        <button type="button" onClick={start} className={`${btn} bg-emerald-600 hover:bg-emerald-700 self-start`}>
          {t("openCamera")}
        </button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
