// The offer API receives one SDP snapshot; it has no trickle-ICE endpoint.
// Allow time for relay candidates without waiting for every server to respond.
export const ICE_GATHERING_TIMEOUT_MS = 10_000;

export function waitForIceCandidates(
  pc: RTCPeerConnection,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", changed);
      signal.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve();
    };
    const changed = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const cancel = () => finish(new DOMException("Cancelled", "AbortError"));
    if (signal.aborted) return cancel();
    if (pc.iceGatheringState === "complete") return finish();

    pc.addEventListener("icegatheringstatechange", changed);
    signal.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      if (/^a=candidate:/m.test(pc.localDescription?.sdp || "")) {
        // localDescription includes candidates gathered so far. Slow/unreachable
        // ICE servers must not prevent us from trying those available routes.
        finish();
      } else {
        finish(
          new Error(
            "No voice network routes were found. Check your browser’s WebRTC settings, network, and TURN configuration, then try again.",
          ),
        );
      }
    }, ICE_GATHERING_TIMEOUT_MS);
  });
}
