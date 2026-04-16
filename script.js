// ==========================================
// 1. CONFIGURAÇÕES DA SUA BARBEARIA
// ==========================================
const MINHA_CHAVE_PIX = "vitorpereiras373@gmail.com"; // Sua chave Pix real
const NOME_RECEBEDOR = "Barbearia Premium"; // Nome da barbearia
const CIDADE_RECEBEDOR = "Catanduva"; // Cidade

const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY'; 
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    selectedServices: [],
    totalPrice: 0,
    paymentMethod: 'pix'
};

// ==========================================
// 2. DETECTOR DE RETORNO DO CARTÃO (MERCADO PAGO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('collection_status');

    if (paymentStatus === 'approved') {
        const zapUrl = localStorage.getItem('zapAgendamento');
        if (zapUrl) {
            alert("Pagamento confirmado pelo Mercado Pago! Vamos avisar a barbearia agora.");
            window.open(zapUrl, '_blank');
            localStorage.removeItem('zapAgendamento');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } else if (paymentStatus === 'rejected' || paymentStatus === 'null') {
        alert("O pagamento não foi concluído. Tente novamente.");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// ==========================================
// 3. GERADOR DE PIX BACEN (OFFLINE)
// ==========================================
function gerarPayloadPix(chave, nome, cidade, valor) {
    const f = (id, value) => {
        const v = String(value);
        return id + String(v.length).padStart(2, '0') + v;
    };
    const payloadFormat = "000201";
    const merchantAccount = f("26", "0014br.gov.bcb.pix" + f("01", chave));
    const merchantCategory = "52040000";
    const currency = "5303986";
    const txAmount = valor > 0 ? f("54", valor.toFixed(2)) : "";
    const country = "5802BR";
    const merchantName = f("59", nome.substring(0, 25));
    const merchantCity = f("60", cidade.substring(0, 15));
    const txId = f("62", f("05", "***")); 
    
    let payload = payloadFormat + merchantAccount + merchantCategory + currency + txAmount + country + merchantName + merchantCity + txId + "6304";
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// ==========================================
// 4. LÓGICA DE INTERFACE
// ==========================================
function formatDate(value) {
    if (!value) return 'Escolha data e hora';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Escolha data e hora';
    return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service;
        const price = Number(card.dataset.price);

        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            card.querySelector('.service-select').textContent = "Selecionar";
            state.selectedServices = state.selectedServices.filter(s => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            card.querySelector('.service-select').textContent = "Adicionado ✓";
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }
        updateUI();
    });
});

document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
        updateUI();
    });
});

function updateUI() {
    document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;
    const hasServices = state.selectedServices.length > 0;
    const hasDate = document.getElementById('appointment').value;
    const hasName = document.getElementById('client-name').value;
    document.getElementById('confirm-btn').disabled = !(hasServices && hasDate && hasName);
}

document.getElementById('appointment').addEventListener('change', updateUI);
document.getElementById('client-name').addEventListener('keyup', updateUI);

// ==========================================
// 5. FUNÇÃO PRINCIPAL DE AGENDAMENTO
// ==========================================
async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const servicosNomes = state.selectedServices.map(s => s.name).join(', ');
    const dateLabel = formatDate(document.getElementById('appointment').value);
    const professional = document.getElementById('professional').value || 'qualquer profissional';
    const clientName = document.getElementById('client-name').value || 'Cliente';
    const observations = document.getElementById('observations').value || 'Nenhuma';

    try {
        // FLUXO PIX (OFFLINE NO SITE)
        if (state.paymentMethod === 'pix') {
            const pixCode = gerarPayloadPix(MINHA_CHAVE_PIX, NOME_RECEBEDOR, CIDADE_RECEBEDOR, state.totalPrice);
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
            
            document.getElementById('qr-code-img').src = qrCodeUrl;
            document.getElementById('pix-copy-paste').value = pixCode;
            document.getElementById('pix-modal').style.display = 'flex';

            document.getElementById('btn-check-payment').onclick = () => {
                const msg = `Olá! Fiz o Pix de R$ ${state.totalPrice.toFixed(2)} referente ao agendamento:\n\n*Cliente:* ${clientName}\n*Serviços:* ${servicosNomes}\n*Data:* ${dateLabel}\n*Profissional:* ${professional}\n*Observações:* ${observations}\n\n*Segue o comprovante em anexo!* ✅`;
                window.open(`https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`, '_blank');
                location.reload();
            };
        } 
        // FLUXO CARTÃO (VIA MERCADO PAGO)
        else if (state.paymentMethod === 'card') {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: state.selectedServices.map(s => ({ title: s.name, quantity: 1, unit_price: s.price })),
                    method: 'card' 
                }
            });

            if (error) throw error;
            if (data.init_point) {
                const msg = `Olá! Paguei via Cartão de Crédito:\n\n*Cliente:* ${clientName}\n*Serviços:* ${servicosNomes}\n*Data:* ${dateLabel}`;
                localStorage.setItem('zapAgendamento', `https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`);
                window.location.href = data.init_point;
            }
        }
    } catch (err) {
        alert('Erro ao processar o agendamento: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function copyPixCode() {
    const input = document.getElementById('pix-copy-paste');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Código Pix copiado! Cole no app do seu banco.');
}

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
