import { createClient } from "npm:@supabase/supabase-js@2";

type PaymentMethod = "pix" | "card" | "pay_at_shop";

type CreateReservationPayload = {
  client_name: string;
  client_phone?: string | null;
  selected_services: Array<{ name?: string; price?: number }>;
  total_price: number;
  payment_method: PaymentMethod;
  appointment_start: string;
  appointment_end: string;
  professional_id?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseMinutes(timeText: string): number {
  const [h, m] = timeText.split(":").map(Number);
  return (h * 60) + m;
}

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}:${map.second}`,
    minuteOfDay: (Number(map.hour) * 60) + Number(map.minute),
  };
}

function validatePayload(
  body: unknown,
): { ok: true; data: CreateReservationPayload } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload inválido." };
  }

  const payload = body as CreateReservationPayload;
  const validMethods: PaymentMethod[] = ["pix", "card", "pay_at_shop"];

  if (!payload.client_name?.trim()) {
    return { ok: false, message: "client_name é obrigatório." };
  }

  if (!Array.isArray(payload.selected_services) || payload.selected_services.length === 0) {
    return { ok: false, message: "selected_services deve conter ao menos 1 serviço." };
  }

  if (!Number.isFinite(payload.total_price) || payload.total_price <= 0) {
    return { ok: false, message: "total_price inválido." };
  }

  if (!validMethods.includes(payload.payment_method)) {
    return { ok: false, message: "payment_method inválido." };
  }

  const start = new Date(payload.appointment_start);
  const end = new Date(payload.appointment_end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "appointment_start/appointment_end inválidos." };
  }

  if (end.getTime() <= start.getTime()) {
    return { ok: false, message: "appointment_end deve ser maior que appointment_start." };
  }

  return { ok: true, data: payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias");
    }

    const body = await req.json().catch(() => null);
    const validation = validatePayload(body);

    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = validation.data;
    const startDate = new Date(payload.appointment_start);
    const endDate = new Date(payload.appointment_end);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: expireError } = await supabase.rpc("expire_pending_appointments");

    if (expireError) {
      throw new Error(expireError.message || "Falha ao expirar reservas pendentes");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("business_settings")
      .select("mode, opening_time, closing_time, lunch_start, lunch_end, slot_duration_minutes, timezone")
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error(settingsError?.message || "business_settings não encontrado");
    }

    if (settings.mode === "closed") {
      return new Response(JSON.stringify({ error: "Barbearia fechada no momento." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    if (durationMinutes !== settings.slot_duration_minutes) {
      return new Response(JSON.stringify({ error: "Duração do horário inválida." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tzStart = getSaoPauloDateParts(startDate);
    const tzEnd = getSaoPauloDateParts(endDate);

    if (tzStart.date !== tzEnd.date) {
      return new Response(JSON.stringify({ error: "Horário deve iniciar e terminar no mesmo dia." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openingMinutes = parseMinutes(settings.opening_time);
    const closingMinutes = parseMinutes(settings.closing_time);
    const lunchStartMinutes = parseMinutes(settings.lunch_start);
    const lunchEndMinutes = parseMinutes(settings.lunch_end);

    if (tzStart.minuteOfDay < openingMinutes || tzEnd.minuteOfDay > closingMinutes) {
      return new Response(JSON.stringify({ error: "Horário fora do funcionamento." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const overlapsLunch = tzStart.minuteOfDay < lunchEndMinutes && tzEnd.minuteOfDay > lunchStartMinutes;

    if (overlapsLunch) {
      return new Response(JSON.stringify({ error: "Horário inválido: pausa de almoço (12h às 13h)." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const nowIso = new Date().toISOString();

    const { data: blockedConflict, error: blockedError } = await supabase
      .from("blocked_slots")
      .select("id")
      .lt("slot_start", endIso)
      .gt("slot_end", startIso)
      .limit(1);

    if (blockedError) {
      throw new Error(blockedError.message || "Falha ao validar bloqueios");
    }

    if (blockedConflict && blockedConflict.length > 0) {
      return new Response(JSON.stringify({ error: "Horário bloqueado pela barbearia." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apptConflict, error: apptError } = await supabase
      .from("appointments")
      .select("id")
      .lt("appointment_start", endIso)
      .gt("appointment_end", startIso)
      .or(`booking_status.eq.confirmed,and(booking_status.eq.pending_payment,expires_at.gt.${nowIso})`)
      .limit(1);

    if (apptError) {
      throw new Error(apptError.message || "Falha ao validar conflitos");
    }

    if (apptConflict && apptConflict.length > 0) {
      return new Response(JSON.stringify({ error: "Horário já está ocupado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedProfessionalId = payload.professional_id || null;

    if (!resolvedProfessionalId) {
      const { data: defaultProfessional, error: defaultProfessionalError } = await supabase
        .from("professionals")
        .select("id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultProfessionalError) {
        throw new Error(defaultProfessionalError.message || "Falha ao buscar profissional padrão");
      }

      resolvedProfessionalId = defaultProfessional?.id || null;
    }

    const isPayAtShop = payload.payment_method === "pay_at_shop";
    const expiresAt = isPayAtShop
      ? null
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const insertPayload = {
      user_id: null,
      client_name: payload.client_name.trim(),
      client_phone: payload.client_phone?.trim() || null,
      selected_services: payload.selected_services,
      total_price: payload.total_price,
      appointment_start: startIso,
      appointment_end: endIso,
      payment_method: payload.payment_method,
      professional_id: resolvedProfessionalId,
      payment_status: "pending",
      booking_status: isPayAtShop ? "confirmed" : "pending_payment",
      expires_at: expiresAt,
    };

    const { data: created, error: createError } = await supabase
      .from("appointments")
      .insert(insertPayload)
      .select("id, professional_id, booking_status, payment_status, payment_method, expires_at, appointment_start, appointment_end")
      .single();

    if (createError) {
      const msg = createError.message || "Erro ao criar reserva";
      const isConflict =
        msg.includes("overlap") ||
        msg.includes("conflict") ||
        msg.includes("appointments_no_overlap_active_excl");

      return new Response(JSON.stringify({ error: isConflict ? "Horário já está ocupado." : msg }), {
        status: isConflict ? 409 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      appointment_id: created.id,
      professional_id: created.professional_id,
      booking_status: created.booking_status,
      payment_status: created.payment_status,
      payment_method: created.payment_method,
      expires_at: created.expires_at,
      appointment_start: created.appointment_start,
      appointment_end: created.appointment_end,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});