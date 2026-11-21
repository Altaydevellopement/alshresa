// ===========================================================================
// Fonction send-notifications — version EN UN SEUL FICHIER pour l'éditeur du tableau de bord Supabase
// (Edge Functions > Deploy a new function > Via Editor). Générée automatiquement depuis
// supabase/functions/send-notifications/ : ne pas modifier ici, modifier les sources puis régénérer.
// Réglage « Verify JWT » : DÉSACTIVÉ (appelée par la tâche planifiée)
// Secrets requis : BREVO_API_KEY, EMAIL_FROM, EMAIL_TO
// ===========================================================================
// supabase/functions/send-notifications/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// supabase/functions/_shared/email.ts
var BREVO_URL = "https://api.brevo.com/v3/smtp/email";
var parseAddress = (value) => {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || void 0, email: match[2] };
  return { email: value.trim() };
};
var toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};
var secretariatEmail = () => Deno.env.get("EMAIL_TO") ?? "accueil@e2rives.fr";
async function sendEmail(message) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY manquante dans les secrets des fonctions Supabase");
  const from = Deno.env.get("EMAIL_FROM");
  if (!from) throw new Error("EMAIL_FROM manquant (adresse d'exp\xE9diteur valid\xE9e dans Brevo)");
  const body = {
    sender: parseAddress(from),
    to: message.to.map((email) => parseAddress(email)),
    subject: message.subject,
    htmlContent: message.html
  };
  if (message.bcc?.length) body.bcc = message.bcc.map((email) => parseAddress(email));
  if (message.replyTo) body.replyTo = parseAddress(message.replyTo);
  if (message.attachments?.length) {
    body.attachment = message.attachments.map((a) => ({ name: a.filename, content: toBase64(a.content) }));
  }
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo a refus\xE9 l'envoi (${response.status}) : ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// supabase/functions/send-notifications/index.ts
var MAX_ATTEMPTS = 5;
var BATCH_SIZE = 50;
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
var escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
var formatDay = (day) => {
  if (!day) return "date inconnue";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const { data: expired } = await supabase.rpc("expire_waitlist_entries");
    if (!Deno.env.get("BREVO_API_KEY")) return json({ error: "BREVO_API_KEY manquante", expired }, 500);
    const { data: notifications, error } = await supabase.from("notifications").select("id, user_id, type, title, body, data, email_attempts").eq("email_status", "pending").order("created_at").limit(BATCH_SIZE);
    if (error) throw error;
    let sent = 0;
    let failed = 0;
    for (const n of notifications ?? []) {
      const data = n.data ?? {};
      const [{ data: userData }, { data: profile }] = await Promise.all([
        supabase.auth.admin.getUserById(n.user_id),
        supabase.from("profiles").select("first_name, last_name").eq("id", n.user_id).maybeSingle()
      ]);
      const parentEmail = userData?.user?.email ?? "";
      const parentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Parent";
      const childName = String(data.child_name ?? "Enfant");
      const day = formatDay(data.date);
      const kind = data.kind === "wednesday" ? "Mercredi" : "Vacances";
      const options = [data.without_meal ? "sans repas" : null, data.early_dropoff ? "accueil du matin" : null].filter(Boolean).join(", ");
      const subject = n.type === "waitlist_booked" ? `Liste d'attente : place attribu\xE9e \xE0 ${childName} \u2014 ${day}` : n.title;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1f2937;">
          <h2 style="color: #B4493E; margin-bottom: 4px;">Place attribu\xE9e depuis la liste d'attente</h2>
          <p style="margin-top: 0;">Une place s'est lib\xE9r\xE9e et l'enfant ci-dessous a \xE9t\xE9 <strong>r\xE9serv\xE9 automatiquement</strong>.
          La famille n'a pas \xE9t\xE9 pr\xE9venue par email : merci de l'informer.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #667085; width: 160px;">Enfant</td><td style="padding: 6px 0;"><strong>${escapeHtml(childName)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #667085;">Journ\xE9e</td><td style="padding: 6px 0;">${escapeHtml(kind)} \u2014 ${escapeHtml(day)}</td></tr>
            ${options ? `<tr><td style="padding: 6px 0; color: #667085;">Options</td><td style="padding: 6px 0;">${escapeHtml(options)}</td></tr>` : ""}
            ${data.reservation_number ? `<tr><td style="padding: 6px 0; color: #667085;">R\xE9servation</td><td style="padding: 6px 0;">n\xB0 ${escapeHtml(String(data.reservation_number))}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #667085;">Parent</td><td style="padding: 6px 0;">${escapeHtml(parentName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #667085;">Email</td><td style="padding: 6px 0;">${parentEmail ? `<a href="mailto:${escapeHtml(parentEmail)}">${escapeHtml(parentEmail)}</a>` : "non renseign\xE9"}</td></tr>
          </table>
          <p style="font-size: 13px; color: #667085;">R\xE9pondre \xE0 cet email \xE9crit directement \xE0 la famille.</p>
        </div>`;
      let sendError = null;
      try {
        await sendEmail({
          to: [secretariatEmail()],
          ...parentEmail ? { replyTo: parentEmail } : {},
          subject,
          html
        });
      } catch (e) {
        sendError = e instanceof Error ? e : new Error(String(e));
      }
      if (sendError) {
        const attempts = (n.email_attempts ?? 0) + 1;
        await supabase.from("notifications").update({
          email_attempts: attempts,
          email_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          email_error: sendError.message.slice(0, 500)
        }).eq("id", n.id);
        failed++;
      } else {
        await supabase.from("notifications").update({
          email_status: "sent",
          email_sent_at: (/* @__PURE__ */ new Date()).toISOString(),
          email_attempts: (n.email_attempts ?? 0) + 1,
          email_error: null
        }).eq("id", n.id);
        sent++;
      }
    }
    return json({ sent, failed, expired });
  } catch (e) {
    console.error("send-notifications:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
