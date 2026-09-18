import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type PortraitRequest = { cardId: string; imageUrl: string; accessToken: string };

async function requestPortrait(input: PortraitRequest, stream: boolean) {
  return fetch("/api/card-portrait", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ cardId: input.cardId, imageUrl: input.imageUrl, stream }),
  });
}

export async function streamPortrait(
  input: PortraitRequest,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
) {
  const response = await requestPortrait(input, true);
  if (!response.ok || !response.body) throw new Error((await response.text().catch(() => "")) || "Không thể tạo ảnh AI.");

  let sawEvent = false;
  let completed = false;
  let gatewayError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: { type?: string; b64_json?: string; error?: { message?: string } } | undefined;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (event.event === "error" || payload?.type === "error") {
        sawEvent = true;
        gatewayError = payload?.error?.message || "Không thể tạo ảnh AI.";
        return;
      }
      const isImage = event.event === "image_edit.partial_image" || event.event === "image_edit.completed";
      if (!isImage || !payload?.b64_json) return;
      sawEvent = true;
      const isFinal = event.event === "image_edit.completed";
      flushSync(() => onFrame(`data:image/png;base64,${payload?.b64_json}`, isFinal));
      if (isFinal) completed = true;
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      let part: ReadableStreamReadResult<string>;
      try { part = await reader.read(); } catch (error) {
        if (sawEvent || (error instanceof Error && error.name === "AbortError")) throw error;
        break;
      }
      if (part.done) break;
      parser.feed(part.value);
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
  if (gatewayError) throw new Error(gatewayError);
  if (!sawEvent) {
    const replay = await requestPortrait(input, false);
    if (!replay.ok) throw new Error((await replay.text().catch(() => "")) || "Không thể tạo ảnh AI.");
    const json = await replay.json() as { data?: Array<{ b64_json?: string }> };
    const image = json.data?.[0]?.b64_json;
    if (!image) throw new Error("AI chưa trả về hình ảnh.");
    onFrame(`data:image/png;base64,${image}`, true);
    return;
  }
  if (!completed) throw new Error("Quá trình tạo ảnh chưa hoàn tất.");
}