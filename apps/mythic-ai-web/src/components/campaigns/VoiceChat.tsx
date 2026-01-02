"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWavPCM16 } from "@/lib/wav";
import VoiceVisualStatus from "@/components/campaigns/VoiceVisualStatus";

// TypeScript declarations for browser compatibility
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __vcCtx?: AudioContext;
  }
}

type Role = "user" | "assistant" | "system";
type ChatMsg = { role: Role; content: string };

// WebSocket message types
type WebSocketMessage =
  | { type: "status"; text: string }
  | { type: "text" | "transcript"; text: string }
  | {
      type: "audio" | "assistant";
      text?: string;
      audio?: string | { audio: string };
    };

export default function VoiceChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [playbackEl, setPlaybackEl] = useState<HTMLAudioElement | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const pendingTtsRef = useRef(0); // number of TTS chunks not yet fully played
  const serverReadyRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const serverUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${process.env.NEXT_PUBLIC_WS_HOST}/websocket`;
  }, []);

  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => setStatus("Listening…"),
    onSpeechEnd: (audio) => {
      setStatus("Processing…");
      const wav = encodeWavPCM16(audio, 16_000); // audio is Float32Array@16k
      wsRef.current?.send(wav);
    },
  });

  // helper for a nice status string
  const uiStatus = aiSpeaking
    ? "Speaking…"
    : vad.loading
      ? "Loading VAD…"
      : !listening
        ? "Idle"
        : vad.userSpeaking
          ? "User speaking"
          : "Listening";

  useEffect(
    () => setStatus(uiStatus),
    [uiStatus, aiSpeaking, vad.loading, vad.userSpeaking, listening]
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  async function unlockAudio(): Promise<AudioContext | null> {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx: AudioContext = window.__vcCtx ?? new AC();
      window.__vcCtx = ctx;
      if (ctx.state !== "running") await ctx.resume(); // must be in user gesture
      return ctx;
    } catch {
      return null;
    }
  }

  const playNext = () => {
    if (isPlayingRef.current) return;

    const next = audioQueueRef.current.shift();
    if (!next) {
      if (pendingTtsRef.current <= 0) setAiSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    const url = URL.createObjectURL(next);
    const a = new Audio(url);
    setPlaybackEl(a); // <-- give visualizer access to the exact element
    // a.playsInline = true;

    a.onplaying = () => {
      setAiSpeaking(true);
      setStatus("Speaking…");
    };
    a.onwaiting = () => setStatus("Buffering audio…"); // MDN: waiting fires on data gap. :contentReference[oaicite:4]{index=4}
    a.onended = () => {
      URL.revokeObjectURL(url);
      isPlayingRef.current = false;
      pendingTtsRef.current = Math.max(0, pendingTtsRef.current - 1);
      if (pendingTtsRef.current <= 0 && audioQueueRef.current.length === 0) {
        setAiSpeaking(false);
        setStatus(listening ? "Listening…" : "Idle");
      }
      playNext();
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      isPlayingRef.current = false;
      pendingTtsRef.current = Math.max(0, pendingTtsRef.current - 1);
      playNext();
    };

    a.play().catch((err) => {
      setStatus(`Playback blocked: ${String(err)}`); // rejected promises = autoplay blocks. :contentReference[oaicite:5]{index=5}
    });
  };

  const enqueueAudio = (blob: Blob) => {
    audioQueueRef.current.push(blob);
    pendingTtsRef.current += 1; // we have one more chunk to play
    playNext();
  };

  const connect = () => {
    if (!serverUrl) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;
    const ws = new WebSocket(serverUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnected(true);
      setStatus("Connected");
    };
    ws.onclose = () => {
      setConnected(false);
      setStatus("");
    };
    ws.onerror = () => setStatus("WebSocket error");

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: WebSocketMessage;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      // ✅ handle server status — including the initial "ready" ping
      if (msg.type === "status") {
        if (msg.text === "ready") {
          serverReadyRef.current = true;
          setStatus("Connected (server ready)");
        } else {
          setStatus(String(msg.text ?? ""));
        }
        return;
      }

      // show *your* words (server sends {type:"text"} or {type:"transcript"})
      if (msg.type === "text" || msg.type === "transcript") {
        setMessages((m) => [...m, { role: "user", content: msg.text }]);
        return;
      }

      // assistant audio + text (handle flat or nested audio)
      if (msg.type === "audio" || msg.type === "assistant") {
        if (msg.text)
          setMessages((m) => [
            ...m,
            { role: "assistant", content: msg.text as string },
          ]);
        const raw =
          typeof msg.audio === "string"
            ? msg.audio
            : (msg.audio?.audio ?? null);
        if (!raw) return;

        const mime = sniffAudioMime(raw); // picks audio/mpeg for MeloTTS
        enqueueAudio(b64ToBlob(raw, mime));
        return;

        // log play() errors so you see if autoplay is blocked
        // (see autoplay policies below)
        //  - put this inside playNext() on the Audio element:
        // a.play().catch(err => setStatus(`Playback blocked: ${String(err)}`));
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  // VAD: sends WAV PCM16 (mono 16k) as binary
  //   const vad = useMicVAD({
  //     startOnLoad: false,
  //     onSpeechStart: () => setStatus("Listening…"),
  //     onSpeechEnd: (audio) => {
  //       setStatus("Processing…");
  //       const wav = encodeWavPCM16(audio, 16_000);
  //       wsRef.current?.send(wav);
  //     },
  //   });

  const onStart = async () => {
    connect(); // creates wsRef.current
    await waitForOpen(wsRef.current!); // 1) socket OPEN
    try {
      await waitFor(() => serverReadyRef.current, "server ready", 2500); // 2) DO ready ping
    } catch {
      console.warn("No 'ready' ping seen; proceeding after open()");
      serverReadyRef.current = true; // soft fallback
    }
    // also ensure VAD model is loaded before we start
    await waitFor(() => vad.loading === false, "VAD load", 15000); // 3) VAD loaded (see docs)

    const ctx = await unlockAudio();
    if (ctx) setAudioCtx(ctx);

    vad.start();
    setListening(true);
    setStatus("Listening…");
  };
  const onStop = () => {
    vad.pause();
    setListening(false);
    setStatus("");
  };
  const onClear = () => {
    setMessages([]);
    setStatus("");
    wsRef.current?.send(JSON.stringify({ type: "cmd", data: "clear" }));
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  useEffect(() => {
    return () => {
      vad.pause();
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={chatContainerRef}
        className="rounded-xl border bg-white p-4 h-[420px] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-gray-400">
            No messages yet. Click &ldquo;Start Conversation&rdquo; to talk.
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => (
              <li
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : m.role === "assistant"
                        ? "bg-gray-200 text-gray-900"
                        : "bg-amber-100 text-amber-900",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VoiceVisualStatus
        mode={aiSpeaking ? "playback" : "mic"}
        audioContext={audioCtx}
        playbackEl={playbackEl}
        statusText={status}
        listening={listening}
        vadLoading={vad.loading}
        userSpeaking={vad.userSpeaking}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onStart}
          disabled={listening}
          className={`rounded-lg px-4 py-2 font-medium ${
            listening
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:opacity-90 active:scale-95"
          } text-white shadow`}
        >
          Start Conversation
        </button>

        <button
          onClick={onStop}
          disabled={!listening}
          className={`rounded-lg px-4 py-2 font-medium ${
            !listening
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:opacity-90 active:scale-95"
          } text-white shadow`}
        >
          Stop Conversation
        </button>

        <button
          onClick={onClear}
          className="ml-auto rounded-lg px-4 py-2 font-medium bg-gray-700 text-white shadow hover:opacity-90 active:scale-95"
        >
          Clear Chat
        </button>

        <span
          className={`text-xs ${
            connected ? "text-green-700" : "text-gray-400"
          }`}
        >
          {connected ? "WS connected" : "WS disconnected"}
        </span>
      </div>
    </div>
  );
}

function b64ToBlob(b64: string, mime: string) {
  const i = b64.indexOf(","); // handles data:audio/mpeg;base64,XXX too
  const clean = i >= 0 ? b64.slice(i + 1) : b64;
  const bin = atob(clean);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function sniffAudioMime(b64: string) {
  const head = b64.slice(0, 8);
  // WAV often starts with "RIFF" -> base64 "UklGR"
  if (head.startsWith("UklGR")) return "audio/wav";
  // MP3 with ID3 tag often starts "ID3" -> base64 "SUQz"
  if (head.startsWith("SUQz") || b64.startsWith("/+")) return "audio/mpeg";
  return "audio/mpeg";
}

function waitForOpen(ws: WebSocket, timeoutMs = 5000) {
  return new Promise<void>((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("WS open timeout"));
    }, timeoutMs);
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("WS error before open"));
    };
    const cleanup = () => {
      clearTimeout(t);
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onErr);
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onErr);
  });
}

function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 15000,
  checkMs = 50
) {
  return new Promise<void>((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - t0 > timeoutMs)
        return reject(new Error(`${label} timeout`));
      setTimeout(tick, checkMs);
    };
    tick();
  });
}
