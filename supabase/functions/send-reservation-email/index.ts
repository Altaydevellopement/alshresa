
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { ReservationEmailRequest } from "./types.ts";
import { corsHeaders, initSupabase, isRequestProcessed, markRequestAsProcessed, setupCacheCleanup } from "./utils.ts";
import { processHolidayReservation } from "./holiday.ts";
import { processRdvReservation } from "./rdv.ts";


// Setup cache cleanup interval
setupCacheCleanup();

const handler = async (req: Request): Promise<Response> => {
  console.log(`[${Date.now()}] New send-reservation-email request received`);
  
  // Gérer les requêtes CORS OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Seuls les utilisateurs connectés peuvent déclencher l'envoi d'un email
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: authData } = await initSupabase().auth.getUser(token);
  if (!authData?.user) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Extraire les données de la requête
    const requestData: ReservationEmailRequest = await req.json();
    console.log(`[${Date.now()}] Received request data:`, JSON.stringify(requestData));

    // Générer un ID de requête unique s'il n'est pas fourni
    const requestId = requestData.requestId || 
      `${requestData.childName || ''}-${requestData.reservationType || ''}-${requestData.period || ''}-${Date.now()}`;

    console.log(`[${Date.now()}] Request ID:`, requestId);

    // Vérifier si cette requête a déjà été traitée (éviter les doublons)
    if (isRequestProcessed(requestId)) {
      console.log(`[${Date.now()}] Duplicate request detected. Skipping email send:`, requestId);
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate request, email not sent" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Marquer la requête comme traitée
    markRequestAsProcessed(requestId);
    console.log(`[${Date.now()}] Request marked as processed:`, requestId);

    // Vérifier la configuration Brevo
    if (!Deno.env.get("BREVO_API_KEY")) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY manquante dans les secrets des fonctions Supabase." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[${Date.now()}] Processing reservation of type: ${requestData.reservationType}`);
    
    // Traiter la demande selon le type de réservation
    if (requestData.reservationType === "holiday" || 
        requestData.reservationType === "wednesday" || 
        requestData.reservationType === "teen-holiday") {
      return await processHolidayReservation(requestData, requestId);
    } 
    else if (requestData.rdvId) {
      return await processRdvReservation(requestData, requestId);
    } 
    else {
      console.error(`[${Date.now()}] Invalid request data, missing or invalid reservationType or rdvId:`, requestData);
      throw new Error("Invalid request: Either a valid reservationType (holiday, wednesday, teen-holiday) or rdvId is required");
    }

  } catch (error: any) {
    console.error(`[${Date.now()}] Error in send-reservation-email function:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Démarrer le serveur
serve(handler);
