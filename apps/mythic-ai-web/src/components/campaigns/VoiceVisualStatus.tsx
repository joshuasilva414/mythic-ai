"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  mode?: "mic" | "playback";
  /** Reuse an unlocked AudioContext from the parent (created after a user gesture). */
  audioContext?: AudioContext | null;
  /** High-level app/VAD/WS status text to show beside the pill. */
  statusText?: string;
  /** Parent flags for mic/VAD UI. */
  listening?: boolean;
  vadLoading?: boolean;
  userSpeaking?: boolean;
  /** True when the browser is actually playing AI audio (set from <audio> events). */
  aiSpeaking?: boolean;
  /** The <audio> element currently playing TTS (if mode="playback"). */
  playbackEl?: HTMLAudioElement | null;
  className?: string;
};

export default function VoiceVisualStatus({
  mode = "mic",
  audioContext = null,
  statusText = "",
  listening = false,
  vadLoading = false,
  userSpeaking = false,
  aiSpeaking = false,
  playbackEl = null,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // we keep references so we can tear down cleanly
  const acRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<
    MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null
  >(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Pill logic: prefer "Speaking…" when AI is actually playing audio.
  const pill = useMemo(() => {
    if (aiSpeaking)
      return { label: "Speaking…", cls: "bg-indigo-100 text-indigo-800" };
    if (vadLoading)
      return { label: "Mic loading…", cls: "bg-amber-100 text-amber-900" };
    if (!listening) return { label: "Idle", cls: "bg-gray-100 text-gray-600" };
    if (userSpeaking)
      return { label: "User speaking", cls: "bg-green-100 text-green-800" };
    return {
      label: statusText || "Listening…",
      cls: "bg-blue-100 text-blue-800",
    };
  }, [aiSpeaking, vadLoading, listening, userSpeaking, statusText]);

  // Build/tear down audio graph whenever mode, playbackEl, or context changes.
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Choose context: parent-provided (preferred) or create a local one.
      const AC = typeof window !== "undefined" && window.AudioContext;
      if (!AC) return;

      const ac = audioContext ?? new AC();
      acRef.current = ac;

      // If this context was created before a gesture, it may be suspended; try to resume. (Must be called post-gesture.)
      try {
        if (ac.state !== "running") await ac.resume();
      } catch {}

      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect source depending on mode
      try {
        if (mode === "mic") {
          // Separate mic stream for visualization (keeps your VAD pipeline untouched).
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          micStreamRef.current = stream;

          const src = ac.createMediaStreamSource(stream);
          src.connect(analyser);
          // No need to connect to destination for visualization-only mic.
          sourceRef.current = src;
        } else if (mode === "playback" && playbackEl) {
          // Tap the element into the Web Audio graph.
          const src = ac.createMediaElementSource(playbackEl);
          // Feed the analyser so we can draw bars...
          src.connect(analyser);
          // ...and also to the destination so audio keeps being audible.
          src.connect(ac.destination); // Important to keep sound. :contentReference[oaicite:1]{index=1}
          sourceRef.current = src;
        }
      } catch (e) {
        console.warn("[VoiceVisualStatus] setup error:", e);
      }

      // Start drawing
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(data); // 0..255 energy bins. :contentReference[oaicite:2]{index=2}
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        // background
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, width, height);

        // bars
        const bars = 32;
        const gap = 2;
        const bw = (width - gap * (bars - 1)) / bars;

        for (let i = 0; i < bars; i++) {
          // pick roughly-even bins across spectrum
          const idx = Math.floor(((i + 1) / bars) * data.length);
          const v = data[idx] / 255; // 0..1
          const h = Math.max(2, v * height);
          const x = i * (bw + gap);
          const y = height - h;

          const color =
            v > 0.75
              ? "#16a34a"
              : v > 0.5
                ? "#22c55e"
                : v > 0.25
                  ? "#60a5fa"
                  : "#93c5fd";
          ctx.fillStyle = color;
          ctx.fillRect(x, y, bw, h);
        }
      };

      draw();
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      // Disconnect nodes
      try {
        sourceRef.current?.disconnect();
      } catch {}
      try {
        analyserRef.current?.disconnect();
      } catch {}
      // Stop mic tracks if we opened them
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      micStreamRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;

      // Only close the context if we created it locally (not when parent provided one)
      if (!audioContext && acRef.current) {
        try {
          acRef.current.close();
        } catch {}
      }
      acRef.current = null;
    };
  }, [mode, playbackEl, audioContext]);

  // Resize canvas to container size (HiDPI-aware).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(64 * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = "64px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* status pill */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${pill.cls}`}
        >
          <span
            className={[
              "mr-1 inline-block h-2 w-2 rounded-full",
              aiSpeaking ? "bg-indigo-600" : "",
              !aiSpeaking && userSpeaking ? "bg-green-600" : "",
              !aiSpeaking && !userSpeaking && vadLoading ? "bg-amber-500" : "",
              !aiSpeaking && !userSpeaking && !vadLoading && listening
                ? "bg-blue-600"
                : "",
              !aiSpeaking && !userSpeaking && !listening ? "bg-gray-400" : "",
            ].join(" ")}
          />
          {pill.label}
        </span>
        {/* <span className="text-xs text-gray-400">
          {mode === "playback" ? "Playback visualizer" : "Mic visualizer"}
        </span> */}
      </div>

      {/* bars */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-16" />
      </div>
    </div>
  );
}
