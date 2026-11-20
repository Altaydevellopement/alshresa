// Envoie par email les notifications en attente (table public.notifications)
// et marque comme expirées les inscriptions de liste d'attente dont la date est passée.
//
// À appeler toutes les minutes via Supabase Cron (voir README).
// Variables (Supabase > Edge Functions > Secrets) :
//   RESEND_API_KEY  clé API Resend
//   EMAIL_FROM      expéditeur, ex. "Espace des 2 Rives <reservation@e2rives.fr>"
//   EMAIL_TO        secrétariat, reçoit une copie cachée de chaque email
//   SITE_URL        adresse du site, ex. https://reservation.e2rives.fr
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { Resend } from "npm:resend@4.0.0";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Réservation <onboarding@resend.dev>";
  const secretariat = Deno.env.get("EMAIL_TO");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

  try {
    const { data: expired } = await supabase.rpc("expire_waitlist_entries");

    if (!resendKey) return json({ error: "RESEND_API_KEY manquante", expired }, 500);
    const resend = new Resend(resendKey);

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, link, email_attempts")
      .eq("email_status", "pending")
      .order("created_at")
      .limit(BATCH_SIZE);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    for (const n of notifications ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(n.user_id);
      const email = userData?.user?.email;
      if (!email) {
        await supabase.from("notifications")
          .update({ email_status: "skipped", email_error: "Utilisateur sans email" })
          .eq("id", n.id);
        continue;
      }

      const link = n.link && siteUrl ? `${siteUrl}${n.link}` : null;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #0f766e;">${escapeHtml(n.title)}</h2>
          <p style="line-height: 1.5;">${escapeHtml(n.body)}</p>
          ${link ? `<p><a href="${link}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Voir mes réservations</a></p>` : ""}
          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            Espace des 2 Rives — ceci est un message automatique.
            ${secretariat ? `Pour annuler, écrivez à <a href="mailto:${secretariat}">${secretariat}</a>.` : ""}
          </p>
        </div>`;

      const { error: sendError } = await resend.emails.send({
        from,
        to: [email],
        ...(secretariat ? { bcc: [secretariat], reply_to: secretariat } : {}),
        subject: n.title,
        html,
      });

      if (sendError) {
        const attempts = (n.email_attempts ?? 0) + 1;
        await supabase.from("notifications").update({
          email_attempts: attempts,
          email_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          email_error: String(sendError.message ?? sendError).slice(0, 500),
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
