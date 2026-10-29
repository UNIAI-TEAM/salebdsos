import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const zaloVerifierMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { ZALO_VERIFIER_PATH, zaloVerifierHtml } = await import("./lib/zalo-oa");
  const m = ZALO_VERIFIER_PATH.exec(new URL(request.url).pathname);
  if (!m) return next();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("zalo_site_verifications").select("code").eq("code", m[1]).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(zaloVerifierHtml(m[1]), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }) as never;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, zaloVerifierMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
