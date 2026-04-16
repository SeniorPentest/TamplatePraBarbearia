import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const { items = [], method, total, customerName, customerEmail, customerDocument } = payload
    const token = Deno.env.get('MP_ACCESS_TOKEN')

    if (!token) throw new Error("Token do MP ausente no Supabase")

    // ==========================================
    // FLUXO PIX (Pagamento Direto)
    // ==========================================
    if (method === 'pix') {
      const normalizedTotal = Number(
        total ?? items.reduce((acc: number, i: any) => acc + Number(i.price || i.unit_price || 0), 0)
      )
      if (!normalizedTotal || Number.isNaN(normalizedTotal) || normalizedTotal <= 0) {
        throw new Error("Valor do Pix inválido. Informe um total maior que zero.")
      }

      const safeName = (customerName || "Cliente Premium").trim()
      const [firstName, ...restName] = safeName.split(" ")
      const lastName = restName.join(" ") || "Premium"
      const documentNumber = (customerDocument || "19119119100").replace(/\D/g, "")

      const mpPayload = {
        transaction_amount: normalizedTotal,
        description: "Agendamento Barbearia",
        payment_method_id: "pix",
        payer: {
          email: customerEmail || "cliente.pix@barbeariapremium.com", // MP exige e-mails com formatos válidos/comuns
          first_name: firstName || "Cliente",
          last_name: lastName,
          identification: {
            type: "CPF",
            number: documentNumber || "19119119100"
          }
        }
      };

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `pix_${Date.now()}` // Evita pagamentos duplicados
        },
        body: JSON.stringify(mpPayload)
      });

      const data = await response.json();

      // TELEMETRIA: Se o MP der erro 400, pegamos o motivo exato
      if (!response.ok) {
          const mpErrorMsg = data.message || data.cause?.[0]?.description || data.error?.message || JSON.stringify(data);
          console.error("Erro Mercado Pago PIX", { status: response.status, mpError: data });
          return new Response(JSON.stringify({ error: mpErrorMsg, mp_response: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status });
      }

      return new Response(JSON.stringify({
        qr_code: data.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } 
    
    // ==========================================
    // FLUXO CARTÃO (Checkout Pro)
    // ==========================================
    else {
      const prefPayload = {
        items: items.map((i: any) => ({
            title: i.title || i.name, 
            quantity: 1,
            unit_price: Number(i.price || i.unit_price),
            currency_id: "BRL"
        })),
        payment_methods: {
            excluded_payment_methods: [{ id: "pix" }],
            excluded_payment_types: [{ id: "ticket" }]
        },
        back_urls: {
            success: "https://seniorpentest.github.io",
            failure: "https://seniorpentest.github.io",
            pending: "https://seniorpentest.github.io"
        },
        auto_return: "approved"
      };

      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(prefPayload)
      });

      const pref = await res.json();
      
      if (!res.ok) {
          const prefError = pref.message || JSON.stringify(pref);
          throw new Error(`Erro Pref MP: ${prefError}`);
      }

      return new Response(JSON.stringify({ init_point: pref.init_point }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    // Retorna o erro exato para o Frontend
    console.error("Falha na Edge Function criar-pagamento", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
  }
})
