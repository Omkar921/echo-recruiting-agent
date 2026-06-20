"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraPreviewProps = {
  autoStart?: boolean;
  label?: string;
};

export function CameraPreview({
  autoStart = false,
  label = "You",
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachStream = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // Autoplay blocked — user gesture may be required on some browsers
    }
  }, []);

  const start = useCallback(async () => {
    try {
      if (streamRef.current) {
        setActive(true);
        await attachStream();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setActive(true);
      setError(null);
    } catch {
      setError("Allow camera in browser settings, then click Turn on.");
      setActive(false);
    }
  }, [attachStream]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  // Attach stream after video mounts (video is always in DOM)
  useEffect(() => {
    if (active) void attachStream();
  }, [active, attachStream]);

  useEffect(() => {
    if (!autoStart) return;

    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setActive(true);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Allow camera in browser settings, then click Turn on.");
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoStart]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="relative aspect-video min-h-[180px] bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted">
            <span>{label} — your camera</span>
            <button
              type="button"
              onClick={() => void start()}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs transition hover:border-foreground hover:text-foreground"
            >
              Turn on camera
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-muted">
          {error ?? (active ? `${label} — live preview` : "Camera off")}
        </span>
        {active && (
          <button
            type="button"
            onClick={stop}
            className="text-xs text-muted hover:text-foreground"
          >
            Turn off
          </button>
        )}
      </div>
    </div>
  );
}
