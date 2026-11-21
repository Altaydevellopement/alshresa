// Envoi d'emails via l'API Brevo (https://developers.brevo.com/reference/sendtransacemail)
//
// Secrets (Supabase > Edge Functions > Secrets) :
//   BREVO_API_KEY  clé API Brevo (SMTP & API > Clés API)
//   EMAIL_FROM     expéditeur, ex. "Espace des 2 Rives <reservation@e2rives.fr>"
//                  (l'adresse doit être un expéditeur validé dans Brevo)
//   EMAIL_TO       secrétariat, ex. "accueil@e2rives.fr"

export interface EmailAttachment {
  filename: string;
  /** Contenu texte brut (ex. fichier .ics) */
  content: string;
}

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

/** "Nom <email@x.fr>" ou "email@x.fr" → { name, email } */
export const parseAddress = (value: string): { name?: string; email: string } => {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2] };
  return { email: value.trim() };
};

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

export const secretariatEmail = () => Deno.env.get("EMAIL_TO") ?? "accueil@e2rives.fr";

/** Envoie un email. Lève une erreur explicite si Brevo refuse l'envoi. */
export async function sendEmail(message: EmailMessage): Promise<{ messageId?: string }> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) throw new Error("BREVO_API_KEY manquante dans les secrets des fonctions Supabase");
  const from = Deno.env.get("EMAIL_FROM");
  if (!from) throw new Error("EMAIL_FROM manquant (adresse d'expéditeur validée dans Brevo)");

  const body: Record<string, unknown> = {
    sender: parseAddress(from),
    to: message.to.map((email) => parseAddress(email)),
    subject: message.subject,
    htmlContent: message.html,
  };
  if (message.bcc?.length) body.bcc = message.bcc.map((email) => parseAddress(email));
  if (message.replyTo) body.replyTo = parseAddress(message.replyTo);
  if (message.attachments?.length) {
    body.attachment = message.attachments.map((a) => ({ name: a.filename, content: toBase64(a.content) }));
  }

  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo a refusé l'envoi (${response.status}) : ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
