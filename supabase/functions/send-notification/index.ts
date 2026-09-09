import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firebaseServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!firebaseServiceAccount) {
      console.error("FIREBASE_SERVICE_ACCOUNT not configured");
      return new Response(
        JSON.stringify({
          error: "Push notifications not configured on server",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, notification } = await req.json();

    if (!targetUserId || !notification) {
      return new Response(
        JSON.stringify({ error: "Missing targetUserId or notification" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: tokens, error: tokenError } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", targetUserId)
      .eq("active", true);

    if (tokenError) {
      console.error("Token fetch error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No active tokens for user:", targetUserId);
      return new Response(
        JSON.stringify({ message: "No active devices", sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(firebaseServiceAccount);
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid server configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    let sentCount = 0;
    const invalidTokens = [];

    for (const { token } of tokens) {
      try {
        const fcmPayload = {
          message: {
            token: token,
            data: {
              title: notification.title || "SkillSwap",
              body: notification.body || "",
              type: notification.type || "general",
              tag: notification.tag || "skillswap-notification",
              ...(notification.conversationId && {
                conversationId: notification.conversationId,
              }),
              ...(notification.callId && { callId: notification.callId }),
              ...(notification.callerId && {
                callerId: notification.callerId,
              }),
              ...(notification.requestId && {
                requestId: notification.requestId,
              }),
              ...(notification.sessionId && {
                sessionId: notification.sessionId,
              }),
              ...(notification.senderId && {
                senderId: notification.senderId,
              }),
            },
            webpush: {
              notification: {
                title: notification.title || "SkillSwap",
                body: notification.body || "",
                icon: "/favicon.svg",
                badge: "/favicon.svg",
                tag: notification.tag || "skillswap-notification",
                renotify: true,
              },
            },
          },
        };

        const projectId = serviceAccount.project_id;
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(fcmPayload),
          }
        );

        if (response.ok) {
          sentCount++;
        } else {
          const errBody = await response.text();
          console.error(`FCM send failed for token:`, response.status, errBody);

          if (
            response.status === 404 ||
            response.status === 400 ||
            errBody.includes("UNREGISTERED") ||
            errBody.includes("INVALID_ARGUMENT")
          ) {
            invalidTokens.push(token);
          }
        }
      } catch (sendErr) {
        console.error("Error sending to token:", sendErr);
      }
    }

    if (invalidTokens.length > 0) {
      await supabase
        .from("device_tokens")
        .update({ active: false })
        .in("token", invalidTokens);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: tokens.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signedContent = `${encodedHeader}.${encodedPayload}`;

  const keyData = serviceAccount.private_key;
  const encoder = new TextEncoder();
  const keyBuffer = pemToArrayBuffer(keyData);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signedContent)
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signedContent}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
