import { useState, useEffect, useRef, useMemo } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWavPCM16 } from "@/lib/audio";
import { b64ToBlob, sniffAudioMime } from "@/lib/audio";
import { ChatMsg, WebSocketMessage } from "@/lib/types/campaign";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __vcCtx?: AudioContext;
  }
}

export const useAgentConversation = (campaignId: string) => {
  const [muted, setMuted] = useState(false);
  const [playStatus, setPlayStatus] = useState<
    "playing" | "paused" | "not-started"
  >("not-started");
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
    return `${proto}://${process.env.NEXT_PUBLIC_WS_HOST}/websocket?campaignId=${campaignId}`;
  }, [campaignId]);

  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => setStatus("Listening…"),
    onSpeechEnd: (audio) => {
      setStatus("Thinking...");
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
      const AC = window.AudioContext;
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
        if (msg.text) {
          setMessages((m) => {
            if (m.length > 0 && m[m.length - 1].role === "user") {
              const lastUser = m[m.length - 1];
              return [
                ...m.slice(0, -1),
                {
                  role: "user",
                  content: `${lastUser.content} ${msg.text}`,
                },
              ];
            } else {
              return [...m, { role: "user", content: msg.text }];
            }
          });
        }
        return;
      }

      // assistant audio + text (handle flat or nested audio)
      if (msg.type === "audio" || msg.type === "assistant") {
        if (msg.text) {
          setMessages((m) => {
            if (m.length > 0 && m[m.length - 1].role === "assistant") {
              const lastAssistant = m[m.length - 1];
              return [
                ...m.slice(0, -1),
                {
                  role: "assistant",
                  content: `${lastAssistant.content} ${msg.text}`,
                },
              ];
            } else {
              return [...m, { role: "assistant", content: msg.text as string }];
            }
          });
        }
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
    setPlayStatus("playing");
    setListening(true);
    setStatus("Listening…");
  };

  const onStop = () => {
    vad.pause();
    setListening(false);
    setPlayStatus("not-started");
    playbackEl?.pause();
    setStatus("Stopped");
    disconnect();
  };
  const onClear = () => {
    setMessages([]);
    setStatus("");
    wsRef.current?.send(JSON.stringify({ type: "cmd", data: "clear" }));
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const pauseSession = () => {
    vad.pause();
    setListening(false);
    playbackEl?.pause();
    setPlayStatus("paused");
  };
  const resumeSession = () => {
    vad.start();
    setListening(true);
    playbackEl?.play();
    setPlayStatus("playing");
  };

  const onMute = () => {
    setMuted(true);
    vad.pause();
    audioCtx?.suspend();
  };

  const onUnmute = () => {
    setMuted(false);
    vad.start();
    audioCtx?.resume();
  };

  useEffect(() => {
    return () => {
      vad.pause();
      disconnect();
    };
  }, []);

  return {
    onMute,
    onUnmute,
    messages,
    status,
    connected,
    listening,
    vad,
    playbackEl,
    aiSpeaking,
    audioCtx,
    onStart,
    onStop,
    onClear,
    playStatus,
    pauseSession,
    resumeSession,
    muted,
    chatContainerRef,
  };
};

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
