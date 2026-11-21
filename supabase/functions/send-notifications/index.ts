// Prévient l'ACCUEIL par email lorsqu'une place libérée a été attribuée
// automatiquement à un enfant de la liste d'attente (table public.notifications).
// Aucun email n'est envoyé aux familles : le secrétariat les informe lui-même.
// Le bouton « Répondre » de l'email écrit directement à la famille concernée.
//
// Marque aussi comme expirées les inscriptions de liste d'attente dont la date est passée.
// À appeler toutes les minutes via Supabase Cron (voir README).
//
// Secrets (Supabase > Edge Functions > Secrets) :
//   BREVO_API_KEY   clé API Brevo
//   EMAIL_FROM      expéditeur validé dans Brevo
//   EMAIL_TO        adresse de l'accueil (destinataire)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { secretariatEmail, sendEmail } from "../_shared/email.ts";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const formatDay = (day?: string) => {
  if (!day) return "date inconnue";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: expired } = await supabase.rpc("expire_waitlist_entries");

    if (!Deno.env.get("BREVO_API_KEY")) return json({ error: "BREVO_API_KEY manquante", expired }, 500);

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, data, email_attempts")
      .eq("email_status", "pending")
      .order("created_at")
      .limit(BATCH_SIZE);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    for (const n of notifications ?? []) {
      const data = (n.data ?? {}) as Record<string, unknown>;

      // Coordonnées de la famille, pour que l'accueil puisse la prévenir
      const [{ data: userData }, { data: profile }] = await Promise.all([
        supabase.auth.admin.getUserById(n.user_id),
        supabase.from("profiles").select("first_name, last_name").eq("id", n.user_id).maybeSingle(),
      ]);
      const parentEmail = userData?.user?.email ?? "";
      const parentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Parent";

      const childName = String(data.child_name ?? "Enfant");
      const day = formatDay(data.date as string | undefined);
      const kind = data.kind === "wednesday" ? "Mercredi" : "Vacances";
      const options = [data.without_meal ? "sans repas" : null, data.early_dropoff ? "accueil du matin" : null]
        .filter(Boolean)
        .join(", ");

      const subject =
        n.type === "waitlist_booked"
          ? `Liste d'attente : place attribuée à ${childName} — ${day}`
          : n.title;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1f2937;">
          <h2 style="color: #B4493E; margin-bottom: 4px;">Place attribuée depuis la liste d'attente</h2>
          <p style="margin-top: 0;">Une place s'est libérée et l'enfant ci-dessous a été <strong>réservé automatiquement</strong>.
          La famille n'a pas été prévenue par email : merci de l'informer.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #667085; width: 160px;">Enfant</td><td style="padding: 6px 0;"><strong>${escapeHtml(childName)}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #667085;">Journée</td><td style="padding: 6px 0;">${escapeHtml(kind)} — ${escapeHtml(day)}</td></tr>
            ${options ? `<tr><td style="padding: 6px 0; color: #667085;">Options</td><td style="padding: 6px 0;">${escapeHtml(options)}</td></tr>` : ""}
            ${data.reservation_number ? `<tr><td style="padding: 6px 0; color: #667085;">Réservation</td><td style="padding: 6px 0;">n° ${escapeHtml(String(data.reservation_number))}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #667085;">Parent</td><td style="padding: 6px 0;">${escapeHtml(parentName)}</td></tr>
            <tr><td style="padding: 6px 0; color: #667085;">Email</td><td style="padding: 6px 0;">${parentEmail ? `<a href="mailto:${escapeHtml(parentEmail)}">${escapeHtml(parentEmail)}</a>` : "non renseigné"}</td></tr>
          </table>
          <p style="font-size: 13px; color: #667085;">Répondre à cet email écrit directement à la famille.</p>
        </div>`;

      let sendError: Error | null = null;
      try {
        await sendEmail({
          to: [secretariatEmail()],
          ...(parentEmail ? { replyTo: parentEmail } : {}),
          subject,
          html,
        });
      } catch (e) {
        sendError = e instanceof Error ? e : new Error(String(e));
      }

      if (sendError) {
        const attempts = (n.email_attempts ?? 0) + 1;
        await supabase.from("notifications").update({
          email_attempts: attempts,
          email_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          email_error: sendError.message.slice(0, 500),
        }).eq("id", n.id);
        failed++;
      } else {
        await supabase.from("notifications").update({
          email_status: "sent",
          email_sent_at: new Date().toISOString(),
          email_attempts: (n.email_attempts ?? 0) + 1,
          email_error: null,
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
