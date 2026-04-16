// CONFIGURAÇÃO DO SUPABASE
const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const state = {
    service: null,
    price: 0,
    datetime: '',
    professional: '',
    paymentMethod: null
};

// DETECTOR DE PAGAMENTO APROVADO
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

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return 'Escolha data e hora';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Escolha data e hora';
    return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function updateSummary() {
    const ready = state.service && state.datetime && state.paymentMethod;
    const btn = document.getElementById('confirm-btn');
    if (btn) btn.disabled = !ready;

    const totalEl = document.getElementById('total-value');
    if (totalEl) totalEl.textContent = formatCurrency(state.price);
}

// Seleção de Serviços
document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        state.service = card.dataset.service;
        state.price = Number(card.dataset.price);
        updateSummary();
        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// Seleção de Pagamento
document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.payment-form').forEach(f => {
            f.style.display = f.dataset.method === state.paymentMethod ? 'block' : 'none';
        });
        updateSummary();
    });
});

document.getElementById('appointment')?.addEventListener('change', (e) => {
    state.datetime = e.target.value;
    updateSummary();
});

document.getElementById('professional')?.addEventListener('change', (e) => {
    state.professional = e.target.value;
    updateSummary();
});

// INTEGRAÇÃO MP + WHATSAPP
async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'Processando...';
    btn.disabled = true;

    const clientName = document.getElementById('client-name')?.value.trim() || 'Cliente';
    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix' : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';

    const message = `Olá! Sou ${clientName}. Acabei de confirmar e pagar meu agendamento:\n\n*Serviço:* ${state.service}\n*Data:* ${dateLabel}\n*Profissional:* ${professional}\n*Pagamento:* ${paymentLabel}`;
    const whatsappUrl = `https://wa.me/5511915723418?text=${encodeURIComponent(message)}`;

    if (state.paymentMethod === 'pix' || state.paymentMethod === 'card') {
        try {
            localStorage.setItem('zapAgendamento', whatsappUrl);

            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { 
                    items: [{ title: `${state.service} com ${professional}`, quantity: 1, unit_price: state.price }],
                    email: 'cliente@barbearia.com',
                    method: state.paymentMethod 
                }
            });

            if (error) throw error;

            if (data?.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('Link não gerado.');
            }
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao gerar pagamento no Mercado Pago. Tente novamente.');
            btn.textContent = 'Confirmar agendamento';
            btn.disabled = false;
        }
    } else {
        window.open(whatsappUrl, '_blank');
        alert('Agendado com sucesso! Te aguardamos na barbearia.');
        btn.textContent = 'Confirmar agendamento';
        btn.disabled = false;
    }
}

document.getElementById('confirm-btn')?.addEventListener('click', confirmBooking);

const pixBtn = document.querySelector('.payment-button[data-method="pix"]');
if (pixBtn) pixBtn.click();
