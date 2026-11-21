// ===========================================================================
// Fonction send-reservation-email — version EN UN SEUL FICHIER pour l'éditeur du tableau de bord Supabase
// (Edge Functions > Deploy a new function > Via Editor). Générée automatiquement depuis
// supabase/functions/send-reservation-email/ : ne pas modifier ici, modifier les sources puis régénérer.
// Réglage « Verify JWT » : ACTIVÉ
// Secrets requis : BREVO_API_KEY, EMAIL_FROM, EMAIL_TO
// ===========================================================================
// supabase/functions/send-reservation-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// supabase/functions/send-reservation-email/utils.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
var processedRequests = /* @__PURE__ */ new Map();
var CACHE_TTL = 5 * 60 * 1e3;
function setupCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of processedRequests.entries()) {
      if (now - timestamp > CACHE_TTL) {
        processedRequests.delete(key);
      }
    }
  }, 60 * 1e3);
}
function isRequestProcessed(requestId) {
  return processedRequests.has(requestId);
}
function markRequestAsProcessed(requestId) {
  processedRequests.set(requestId, Date.now());
}
function initSupabase() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, supabaseServiceKey);
}
function generateICalendarString(eventDetails) {
  const formatDateToICS = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
  };
  const now = /* @__PURE__ */ new Date();
  const startDate = formatDateToICS(eventDetails.start);
  const endDate = formatDateToICS(eventDetails.end);
  const createdDate = formatDateToICS(now);
  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//E2Rives//Reservation System//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    `X-WR-CALNAME:Rendez-vous E2Rives`
  ];
  calendarLines.push(
    "BEGIN:VEVENT",
    `DTSTAMP:${createdDate}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `UID:${eventDetails.uid}@e2rives.fr`,
    `CREATED:${createdDate}`,
    `DESCRIPTION:${eventDetails.description.replace(/\n/g, "\\n")}`,
    `LAST-MODIFIED:${createdDate}`,
    `LOCATION:${eventDetails.location}`,
    `SEQUENCE:0`,
    `STATUS:CONFIRMED`,
    `SUMMARY:${eventDetails.summary}`,
    `TRANSP:OPAQUE`
  );
  if (eventDetails.organizer) {
    calendarLines.push(
      `ORGANIZER;CN=${eventDetails.organizer.name}:mailto:${eventDetails.organizer.email}`
    );
  }
  if (eventDetails.attendee) {
    calendarLines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=${eventDetails.attendee.name}:mailto:${eventDetails.attendee.email}`
    );
  }
  calendarLines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel du rendez-vous",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );
  return calendarLines.join("\r\n");
}
function generateCalendarButtons(icsContent, eventSummary, startDateTime, endDateTime, location, description) {
  const googleStartTime = startDateTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/g, "");
  const googleEndTime = endDateTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/g, "");
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventSummary)}&dates=${googleStartTime}/${googleEndTime}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
  return `
    <div style="margin-top: 20px; margin-bottom: 20px; text-align: center;">
      <p style="margin-bottom: 10px; font-weight: bold;">Ajouter \xE0 votre calendrier :</p>
      
      <a href="${googleCalendarUrl}" target="_blank" style="background-color: #4285F4; color: white; padding: 10px 15px; text-align: center; text-decoration: none; display: inline-block; font-size: 14px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">
        Google Calendar
      </a>
      
      <p style="margin-top: 15px; margin-bottom: 5px;">Le fichier calendrier est joint \xE0 cet email.</p>
      <p style="font-size: 13px; color: #666;">Ouvrez le fichier .ics attach\xE9 pour l'ajouter \xE0 Outlook, Apple Calendar ou autre application de calendrier.</p>
    </div>
  `;
}

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

// supabase/functions/send-reservation-email/holiday.ts
async function processHolidayReservation(requestData, requestId) {
  console.log(`[${Date.now()}] Processing a ${requestData.reservationType} reservation with ${requestData.dates?.length || 0} dates`);
  if (!requestData.dates || requestData.dates.length === 0) {
    console.error(`[${Date.now()}] No dates provided in request data`);
    return new Response(
      JSON.stringify({ error: "No dates provided in request" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
  let tableRows = "";
  requestData.dates.forEach((date, index) => {
    const earlyDropoff = requestData.earlyDropoff && requestData.earlyDropoff[index] ? "\u2713" : "";
    const withoutMeal = requestData.withoutMeal && requestData.withoutMeal[index] ? "\u2713" : "";
    tableRows += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${date}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${earlyDropoff}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${withoutMeal}</td>
      </tr>
    `;
  });
  const tableHtml = `
    <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Date</th>
          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Arriv\xE9e avant 8h30</th>
          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Sans Repas</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
  let reservationTypeDisplay = "vacances";
  let additionalNote = "";
  if (requestData.reservationType === "wednesday") {
    reservationTypeDisplay = "mercredi";
  } else if (requestData.reservationType === "teen-holiday") {
    reservationTypeDisplay = "vacances Club Ado";
    additionalNote = `<p><strong>Note:</strong> Pour les r\xE9servations Club Ado, les enfants sont accueillis \xE0 11h30 (avec un pique-nique \xE0 apporter) ou \xE0 13h30, selon l'option "Sans Repas" s\xE9lectionn\xE9e. Une "Carte jeune" d'une valeur de 5 euros par enfant est factur\xE9e pour l'ann\xE9e civile.</p>`;
  }
  const emailHtml = `
    <h1>Nouvelle r\xE9servation de ${reservationTypeDisplay}</h1>
    ${requestData.userId ? `<p><strong>ID Utilisateur:</strong> ${requestData.userId}</p>` : ""}
    ${requestData.childName ? `<p><strong>Enfant:</strong> ${requestData.childName}</p>` : ""}
    ${requestData.childClass ? `<p><strong>Classe:</strong> ${requestData.childClass}</p>` : ""}
    ${requestData.period ? `<p><strong>P\xE9riode:</strong> ${requestData.period}</p>` : ""}
    <p><strong>Dates r\xE9serv\xE9es:</strong></p>
    ${tableHtml}
    <p><strong>ID de requ\xEAte:</strong> ${requestId}</p>
    ${additionalNote}
  `;
  const isCM2 = requestData.childClass?.trim().toUpperCase() === "CM2";
  const emailSubject = isCM2 ? `Nouvelle r\xE9servation - Club Ado${requestData.childName ? " - " + requestData.childName : ""}` : `Nouvelle r\xE9servation - ${requestData.reservationType === "wednesday" ? "Mercredi" : requestData.reservationType === "teen-holiday" ? "Club Ado" : "Vacances"}${requestData.childName ? " - " + requestData.childName : ""}`;
  try {
    console.log(`[${Date.now()}] Attempting to send email to accueil@e2rives.fr with subject: ${emailSubject}`);
    const emailResponse = await sendEmail({
      to: [secretariatEmail()],
      subject: emailSubject,
      html: emailHtml
    });
    console.log(`[${Date.now()}] Email sent successfully:`, JSON.stringify(emailResponse));
    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (emailError) {
    console.error(`[${Date.now()}] Error sending email:`, emailError.message || emailError);
    return new Response(JSON.stringify({ error: emailError.message || "Unknown error sending email" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}

// supabase/functions/send-reservation-email/rdv.ts
async function processRdvReservation(requestData, requestId) {
  console.log("Processing an RDV reservation");
  const supabase = initSupabase();
  const { data: rdvData, error: rdvError } = await supabase.from("rdv").select("*").eq("id", requestData.rdvId).single();
  if (rdvError) {
    console.error("Error fetching rdv:", rdvError);
    throw new Error("Error fetching rdv details");
  }
  let userFullName = requestData.userName || "Utilisateur";
  let userEmail = requestData.userEmail;
  if (requestData.userId && (!userFullName || userFullName === "Utilisateur" || !userEmail)) {
    const { data: profileData, error: profileError } = await supabase.from("profiles").select("first_name, last_name").eq("id", requestData.userId).single();
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    } else if (profileData) {
      userFullName = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "Utilisateur";
      console.log("Retrieved user profile:", profileData);
    }
  }
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  const formatTime = (timeStr) => {
    return timeStr.substring(0, 5);
  };
  const appointmentDate = /* @__PURE__ */ new Date(rdvData.date + "T00:00:00");
  const startTime = rdvData.heure_debut.split(":");
  const endTime = rdvData.heure_fin.split(":");
  const startDateTime = new Date(
    appointmentDate.getFullYear(),
    appointmentDate.getMonth(),
    appointmentDate.getDate(),
    parseInt(startTime[0], 10),
    parseInt(startTime[1], 10),
    0
  );
  const endDateTime = new Date(
    appointmentDate.getFullYear(),
    appointmentDate.getMonth(),
    appointmentDate.getDate(),
    parseInt(endTime[0], 10),
    parseInt(endTime[1], 10),
    0
  );
  console.log("Appointment times:", {
    date: rdvData.date,
    startTime: rdvData.heure_debut,
    endTime: rdvData.heure_fin,
    startDateTime: startDateTime.toString(),
    endDateTime: endDateTime.toString()
  });
  const eventSummary = `Rendez-vous E2Rives`;
  const eventDescription = `Motifs: ${requestData.motifs?.join(", ") || "Non sp\xE9cifi\xE9"}`;
  const eventLocation = "Centre Entre 2 Rives";
  const organizer = userEmail ? {
    email: userEmail,
    name: userFullName
  } : void 0;
  const attendee = {
    email: "accueil@e2rives.fr",
    name: "Centre Entre 2 Rives"
  };
  const icsContent = generateICalendarString({
    summary: eventSummary,
    description: eventDescription,
    location: eventLocation,
    start: startDateTime,
    end: endDateTime,
    uid: `rdv-${rdvData.id}`,
    organizer,
    attendee
  });
  const calendarButtons = generateCalendarButtons(
    icsContent,
    eventSummary,
    startDateTime,
    endDateTime,
    eventLocation,
    eventDescription
  );
  const emailResponse = await sendEmail({
    to: [secretariatEmail()],
    replyTo: userEmail || void 0,
    subject: `Nouvelle r\xE9servation de rendez-vous - ${userFullName}`,
    html: `
      <h1>Nouvelle r\xE9servation de rendez-vous</h1>
      <p><strong>Utilisateur:</strong> ${userFullName}</p>
      <p><strong>Date:</strong> ${formatDate(rdvData.date)}</p>
      <p><strong>Horaire:</strong> ${formatTime(rdvData.heure_debut)} - ${formatTime(rdvData.heure_fin)}</p>
      <p><strong>Motifs:</strong> ${requestData.motifs?.join(", ") || "Non sp\xE9cifi\xE9"}</p>
      ${calendarButtons}
      <p><strong>ID de requ\xEAte:</strong> ${requestId}</p>
    `,
    attachments: [
      {
        filename: "rendez-vous.ics",
        content: icsContent
      }
    ]
  });
  console.log("Email sent successfully:", emailResponse);
  return new Response(JSON.stringify({ success: true, data: emailResponse }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// supabase/functions/send-reservation-email/index.ts
setupCacheCleanup();
var handler = async (req) => {
  console.log(`[${Date.now()}] New send-reservation-email request received`);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: authData } = await initSupabase().auth.getUser(token);
  if (!authData?.user) {
    return new Response(JSON.stringify({ error: "Non autoris\xE9" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  try {
    const requestData = await req.json();
    console.log(`[${Date.now()}] Received request data:`, JSON.stringify(requestData));
    const requestId = requestData.requestId || `${requestData.childName || ""}-${requestData.reservationType || ""}-${requestData.period || ""}-${Date.now()}`;
    console.log(`[${Date.now()}] Request ID:`, requestId);
    if (isRequestProcessed(requestId)) {
      console.log(`[${Date.now()}] Duplicate request detected. Skipping email send:`, requestId);
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate request, email not sent" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    markRequestAsProcessed(requestId);
    console.log(`[${Date.now()}] Request marked as processed:`, requestId);
    if (!Deno.env.get("BREVO_API_KEY")) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY manquante dans les secrets des fonctions Supabase." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log(`[${Date.now()}] Processing reservation of type: ${requestData.reservationType}`);
    if (requestData.reservationType === "holiday" || requestData.reservationType === "wednesday" || requestData.reservationType === "teen-holiday") {
      return await processHolidayReservation(requestData, requestId);
    } else if (requestData.rdvId) {
      return await processRdvReservation(requestData, requestId);
    } else {
      console.error(`[${Date.now()}] Invalid request data, missing or invalid reservationType or rdvId:`, requestData);
      throw new Error("Invalid request: Either a valid reservationType (holiday, wednesday, teen-holiday) or rdvId is required");
    }
  } catch (error) {
    console.error(`[${Date.now()}] Error in send-reservation-email function:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};
serve(handler);
