"use client";
import {
  languages,
  ICE_SERVERS,
  VOICE_CONNECT_TIMEOUT_MS,
} from "@/constants/constants";
import type { TranscriptMessage, VoiceSession } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  CircleHelp,
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "./workspace";
import {
  getClinicInfo,
  createVoiceSession,
  endVoiceSession,
  message,
} from "@/lib/api";
import {
  Empty,
  ErrorNotice,
  PageTitle,
  Spinner,
  TemplateIcon,
  Wave,
} from "./ui";
import { ClinicInfo } from "@/lib/types";
export function Playground({
  feature = "conversation",
}: {
  feature?: "clinic" | "conversation";
}) {
  const w = useWorkspace();
  const query = useSearchParams();
  const bots = w.features[feature].bots;
  const [selected, setSelected] = useState(
    bots.find((b) => b.id === query.get("bot"))?.id || bots[0]?.id || "",
  );
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "ended"
  >("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [speaking, setSpeaking] = useState<"none" | "user" | "bot">("none");
  const live = useRef<VoiceSession | null>(null);
  const attempt = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  const bot = bots.find((b) => b.id === selected);
  const template = w.templates.find((t) => t.id === bot?.template_id);
  const isClinic = template?.service_type === "clinic";
  useEffect(() => {
    setClinicInfo(null);
    setTranscript([]);
    if (!isClinic || !w.org?.id || !bot?.id) return;
    const controller = new AbortController();
    getClinicInfo(w.org.id, bot.id, controller.signal)
      .then(setClinicInfo)
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Could not load clinic information.");
      });
    return () => controller.abort();
  }, [bot?.id, isClinic, w.org?.id]);
  const cleanup = useCallback(() => {
    attempt.current++;
    const call = live.current;
    live.current = null;
    if (!call) return;
    clearTimeout(call.timer);
    call.abort.abort();
    call.pc.onconnectionstatechange = null;
    call.pc.ontrack = null;
    call.stream?.getTracks().forEach((t) => t.stop());
    call.pc.close();
    if (audio.current) audio.current.srcObject = null;
    if (call.pcId)
      void endVoiceSession(call.organizationId, call.botId, call.pcId).catch(
        () => {},
      );
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);
  const stop = () => {
    cleanup();
    setStatus("ended");
    setMuted(false);
  };
  async function start() {
    if (!bot || !w.org) return;
    cleanup();
    const run = attempt.current;
    setError("");
    setStatus("connecting");
    setSeconds(0);
    setMuted(false);
    setAutoplayBlocked(false);
    setTranscript([]);
    setSpeaking("none");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Microphone access requires HTTPS or localhost and a supported browser.",
        );
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const call: VoiceSession = {
        pc,
        organizationId: w.org.id,
        botId: bot.id,
        abort: new AbortController(),
      };
      live.current = call;
      call.timer = setTimeout(() => {
        if (live.current === call) {
          cleanup();
          setError(
            "Connection timed out. Check your backend and TURN configuration, then try again.",
          );
          setStatus("ended");
        }
      }, VOICE_CONNECT_TIMEOUT_MS);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (run !== attempt.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      call.stream = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const channel = pc.createDataChannel("pipecat");
      channel.onopen = () => {
        channel.send(
          JSON.stringify({
            label: "rtvi-ai",
            type: "client-ready",
            id: crypto.randomUUID(),
            data: { version: "1.0.0" },
          }),
        );
      };
      channel.onmessage = (event) => {
        if (!isClinic) return;
        try {
          const message = JSON.parse(event.data);
          if (message.label !== "rtvi-ai") return;
          const payload = message.data || {};
          if (
            message.type === "user-transcription" &&
            payload.final !== false &&
            payload.text?.trim()
          ) {
            setTranscript((items) => [
              ...items,
              { id: crypto.randomUUID(), role: "user", text: payload.text },
            ]);
            setSpeaking("none");
          } else if (message.type === "bot-tts-text" && payload.text?.trim()) {
            setTranscript((items) => [
              ...items,
              { id: crypto.randomUUID(), role: "bot", text: payload.text },
            ]);
          } else if (message.type === "bot-started-speaking") {
            setSpeaking("bot");
          } else if (message.type === "bot-stopped-speaking") {
            setSpeaking("none");
          }
        } catch {
          // Ignore non-RTVI and malformed data-channel messages.
        }
      };
      pc.ontrack = (event) => {
        if (audio.current) {
          audio.current.srcObject = new MediaStream([event.track]);
          void audio.current.play().catch(() => setAutoplayBlocked(true));
        }
      };
      pc.onconnectionstatechange = () => {
        if (live.current !== call) return;
        if (pc.connectionState === "connected") {
          clearTimeout(call.timer);
          setStatus("connected");
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          const failed = pc.connectionState === "failed";
          cleanup();
          setStatus("ended");
          if (failed)
            setError(
              "The voice connection failed. Check your network or TURN configuration.",
            );
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((resolve, reject) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const done = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", done);
            call.abort.signal.removeEventListener("abort", cancel);
            resolve();
          }
        };
        const cancel = () => {
          pc.removeEventListener("icegatheringstatechange", done);
          reject(new DOMException("Cancelled", "AbortError"));
        };
        call.abort.signal.addEventListener("abort", cancel, { once: true });
        pc.addEventListener("icegatheringstatechange", done);
        if (call.abort.signal.aborted) cancel();
      });
      if (run !== attempt.current) return;
      const answer = await createVoiceSession(
        call.organizationId,
        call.botId,
        {
          sdp: pc.localDescription?.sdp || "",
          type: "offer",
        },
        call.abort.signal,
      );
      call.pcId = answer.pc_id;
      if (run !== attempt.current) {
        void endVoiceSession(
          call.organizationId,
          call.botId,
          answer.pc_id,
        ).catch(() => {});
        return;
      }
      await pc.setRemoteDescription({ sdp: answer.sdp, type: answer.type });
    } catch (e) {
      if (run !== attempt.current) return;
      cleanup();
      setStatus("ended");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser and try again."
          : message(e),
      );
    }
  }
  const toggleMute = () => {
    const value = !muted;
    live.current?.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !value;
    });
    setMuted(value);
  };
  return (
    <>
      <PageTitle
        eyebrow="HEAR THE DIFFERENCE"
        title={
          feature === "clinic" ? "Clinic test ground" : "Agent test ground"
        }
        description="A real conversation is the best way to get to know your agent."
      />
      {!bots.length ? (
        <Empty
          icon={<Headphones size={26} />}
          title="First, give your agent a name"
          description="Create an agent before starting a voice conversation."
          action={
            <Link
              className="button primary"
              href={feature === "clinic" ? "/clinic" : "/agents"}
            >
              Set up an agent <ArrowRight size={16} />
            </Link>
          }
        />
      ) : (
        <div className="playground-layout">
          <aside className="playground-config">
            <h3>Your conversation</h3>
            <label className="field">
              Voice agent
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setError("");
                  setStatus("idle");
                }}
                disabled={status === "connecting" || status === "connected"}
              >
                {bots.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="selected-template">
              <span className="template-icon clinic">
                <TemplateIcon slug={template?.slug} />
              </span>
              <div>
                <b>{template?.name || "Unavailable template"}</b>
                <small>
                  {isClinic
                    ? "Clinic receptionist service"
                    : "Platform template"}
                </small>
              </div>
            </div>
            <div className="config-detail">
              <span>Language</span>
              <b>
                {languages.find((l) => l[0] === bot?.language)?.[1] ||
                  bot?.language}
              </b>
            </div>
            <div className="config-detail">
              <span>Voice provider</span>
              <b>Sarvam AI</b>
            </div>
            {isClinic && (
              <div className="context-preview clinic-facts">
                <span className="eyebrow">
                  {clinicInfo?.clinic_name || "CLINIC DETAILS"}
                </span>
                {clinicInfo ? (
                  <>
                    {[
                      ["Hours", clinicInfo.hours],
                      ["Break", clinicInfo.lunch],
                      ["Address", clinicInfo.address],
                      ["Front desk", clinicInfo.phone],
                      ["Fees", clinicInfo.fees],
                      ["Parking", clinicInfo.parking],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <p key={label}>
                          <b>{label}</b>
                          <br />
                          {value}
                        </p>
                      ))}
                    {clinicInfo.doctors.length > 0 && (
                      <p>
                        <b>Doctors</b>
                        <br />
                        {clinicInfo.doctors
                          .map((d) => `${d.name} · ${d.specialty}`)
                          .join("; ")}
                      </p>
                    )}
                    {!clinicInfo.booking_ready && (
                      <p>
                        Add a booking schedule in My agents to enable
                        appointments.
                      </p>
                    )}
                    {!clinicInfo.background && !clinicInfo.clinic_name && (
                      <p>Add clinic details in your agent context.</p>
                    )}
                  </>
                ) : (
                  <p>Loading clinic details…</p>
                )}
              </div>
            )}
            <div className="context-preview">
              <span className="eyebrow">COMPANY CONTEXT</span>
              <p>
                {(isClinic ? clinicInfo?.background : bot?.company_context) ||
                  "No company context added yet."}
              </p>
            </div>
            <div className="inline-note">
              <ShieldCheck size={17} />
              <span>
                This playground uses your signed-in account. No API key needed.
              </span>
            </div>
          </aside>
          <section className="voice-stage">
            <div className="stage-label">
              <span
                className={`status-pill ${status === "connected" ? "green" : ""}`}
              >
                <span className="tiny-dot" />
                {status === "connected"
                  ? speaking === "bot"
                    ? "Receptionist speaking"
                    : "Listening"
                  : status === "connecting"
                    ? "Connecting…"
                    : status === "ended"
                      ? "Conversation ended"
                      : "Ready when you are"}
              </span>
              <span className="session-time">
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(seconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div
              className={`voice-orb ${status === "connected" ? "live" : ""}`}
            >
              <div className="orb-ring" />
              <AudioLines size={58} strokeWidth={1.25} />
            </div>
            <h2>
              {status === "connected"
                ? `You’re talking to ${bot?.name}`
                : status === "connecting"
                  ? "Making the connection…"
                  : status === "ended"
                    ? "Every conversation is a fresh start."
                    : "Say hello to your agent."}
            </h2>
            <p>
              {status === "connected"
                ? isClinic
                  ? "Speak naturally. Your receptionist can help with appointments and clinic questions."
                  : "Go ahead, speak naturally. Your agent is listening."
                : status === "connecting"
                  ? "Allow microphone access when your browser asks."
                  : "Put on your headphones, find a quiet spot, and start talking."}
            </p>
            {isClinic && (
              <div
                className="clinic-transcript"
                aria-live="polite"
                aria-label="Call transcript"
              >
                {transcript.length === 0 ? (
                  <p className="transcript-empty">
                    {status === "connected"
                      ? "Your conversation will appear here."
                      : "Start a call to talk to the receptionist."}
                  </p>
                ) : (
                  transcript.map((item) => (
                    <div
                      className={`transcript-line ${item.role}`}
                      key={item.id}
                    >
                      <span>
                        {item.role === "user"
                          ? "You"
                          : bot?.name || "Receptionist"}
                      </span>
                      <p>{item.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            <Wave active={status === "connected" && !muted} />
            <ErrorNotice text={error} />
            <div className="voice-controls">
              {status === "connected" ? (
                <>
                  <button
                    className={`button secondary ${muted ? "muted-button" : ""}`}
                    onClick={toggleMute}
                  >
                    {muted ? <MicOff size={18} /> : <Mic size={18} />}{" "}
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  <button className="button danger" onClick={stop}>
                    <PhoneOff size={17} /> End conversation
                  </button>
                </>
              ) : status === "connecting" ? (
                <button className="button secondary" onClick={stop}>
                  <Spinner /> Cancel connection
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={start}
                  disabled={!bot || !template}
                >
                  <Mic size={17} /> Start conversation
                </button>
              )}
            </div>
            <audio
              ref={audio}
              autoPlay
              playsInline
              controls={autoplayBlocked}
            />
            {autoplayBlocked && (
              <small>Press play above to hear your agent.</small>
            )}
            <div className="stage-footer">
              <Headphones size={15} /> Headphones recommended <span>·</span>{" "}
              {isClinic
                ? "Ask about appointments or the clinic"
                : "Speak first to begin"}
            </div>
          </section>
        </div>
      )}
      <div className="playground-tip">
        <CircleHelp size={17} />
        <p>
          Your context is used for every new conversation. Update it in{" "}
          <Link href={feature === "clinic" ? "/clinic" : "/agents"}>
            My agents
          </Link>{" "}
          to fine-tune the experience. VoiceSession voice requires the backend’s
          Sarvam API key.
        </p>
      </div>
    </>
  );
}
