// ==========================================
// CONFIGURAÇÃO DO SUPABASE (Backend da Barbearia)
// ==========================================
const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = (typeof window.supabase !== 'undefined') 
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) 
    : null;

// ==========================================
// LÓGICA DO FRONT-END (Barbearia)
// ==========================================
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const state = {
    service: null,
    price: 0,
    datetime: '',
    professional: '',
    paymentMethod: null
};

const els = {
    summaryService: document.getElementById('summary-service'),
    summarySchedule: document.getElementById('summary-schedule'),
    summaryProfessional: document.getElementById('summary-professional'),
    totalValue: document.getElementById('total-value'),
    feedback: document.getElementById('booking-feedback'),
    summaryText: document.getElementById('summary-text'),
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot'),
    confirmBtn: document.getElementById('confirm-btn'),
    floatingConfirm: document.getElementById('floating-confirm')
};

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return 'Escolha data e hora';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Escolha data e hora';
    return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function setStatus(message, type = 'pending') {
    if (els.statusText) els.statusText.textContent = message;
    if (!els.statusDot) return;
    const colors = {
        pending: '#e53935',
        waiting: '#f1c232',
        success: '#34c759'
    };
    const bg = colors[type] || colors.pending;
    els.statusDot.style.background = bg;
    els.statusDot.style.boxShadow = `0 0 0 4px ${bg}33`;
}

function updateSummary() {
    const serviceLabel = state.service ? `${state.service}` : 'Nenhum selecionado';
    const priceLabel = state.service ? formatCurrency(state.price) : 'R$ 0,00';
    if (els.summaryService) els.summaryService.textContent = `${serviceLabel} • ${priceLabel}`;
    if (els.summarySchedule) els.summarySchedule.textContent = formatDate(state.datetime);
    if (els.summaryProfessional) els.summaryProfessional.textContent = state.professional || 'Primeiro disponível';
    if (els.totalValue) els.totalValue.textContent = state.service ? formatCurrency(state.price) : 'R$ 0,00';

    const detail = state.service
        ? `${state.service} em ${formatDate(state.datetime)}`
        : 'Selecione um serviço para seguir aos próximos passos.';
    if (els.summaryText) els.summaryText.textContent = detail;

    const ready = isReadyToConfirm();
    if (els.confirmBtn) els.confirmBtn.disabled = !ready;
    if (els.floatingConfirm) els.floatingConfirm.disabled = !ready;
}

// BOTÃO DESBLOQUEADO: Só precisa de Serviço, Data e Pagamento selecionados
function isReadyToConfirm() {
    if (!state.service || !state.datetime || !state.paymentMethod) return false;
    return true;
}

function clearActiveCards() {
    document.querySelectorAll('.service-card').forEach(card => card.classList.remove('selected'));
}

function selectPayment(method) {
    state.paymentMethod = method;
    document.querySelectorAll('.payment-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    document.querySelectorAll('.payment-form').forEach(form => {
        form.classList.toggle('active', form.dataset.method === method);
    });
    const label = method === 'pix' ? 'Pagamento via Mercado Pago'
        : method === 'card' ? 'Pagamento via Mercado Pago'
        : 'Pagamento presencial';
    setStatus(label, method === 'card' || method === 'pix' ? 'waiting' : 'pending');
    updateSummary();
}

function handleServiceSelection(card) {
    const name = card.dataset.service;
    const price = Number(card.dataset.price) || 0;
    clearActiveCards();
    card.classList.add('selected');
    state.service = name;
    state.price = price;
    updateSummary();
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function attachServiceHandlers() {
    document.querySelectorAll('.service-card').forEach(card => {
        const button = card.querySelector('.service-select');
        button?.addEventListener('click', () => handleServiceSelection(card));
    });
}

function attachPaymentHandlers() {
    document.querySelectorAll('.payment-button').forEach(btn => {
        btn.addEventListener('click', () => selectPayment(btn.dataset.method));
    });
}

function attachFormHandlers() {
    const appointment = document.getElementById('appointment');
    const professional = document.getElementById('professional');

    appointment?.addEventListener('change', (e) => {
        state.datetime = e.target.value;
        updateSummary();
    });
    professional?.addEventListener('change', (e) => {
        state.professional = e.target.value;
        updateSummary();
    });

    // Formatações estéticas do cartão falso continuam a funcionar visualmente
    ['card-number', 'card-expiry'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', () => {
            if (id === 'card-number') {
                input.value = input.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
            } else {
                input.value = input.value.replace(/\D/g, '').replace(/(\d{2})(\d{0,2})/, (_, m1, m2) => m2 ? `${m1}/${m2}` : m1);
            }
            updateSummary();
        });
    });

    ['card-name', 'card-cvv'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', updateSummary);
    });
}

async function copyPixKey() {
    const pixKey = document.getElementById('pix-key')?.textContent?.trim();
    if (!pixKey) return;
    try {
        await navigator.clipboard.writeText(pixKey);
        if (els.feedback) els.feedback.textContent = 'Chave Pix copiada. Finalize para registrar o pagamento.';
    } catch {
        if (els.feedback) els.feedback.textContent = 'Não foi possível copiar automaticamente. Use a chave exibida.';
    }
}

// ==========================================
// O GRANDE FINAL: INTEGRAÇÃO MP + WHATSAPP
// ==========================================
async function confirmBooking() {
    if (!isReadyToConfirm()) return;

    const confirmBtn = els.confirmBtn;
    const floatingConfirm = els.floatingConfirm;
    const originalText = confirmBtn ? confirmBtn.textContent : 'Confirmar agendamento';

    // Função auxiliar para gerir estado dos dois botões de confirmação
    const setButtonsState = (text, disabled) => {
        if (confirmBtn) { confirmBtn.textContent = text; confirmBtn.disabled = disabled; }
        if (floatingConfirm) { floatingConfirm.textContent = text; floatingConfirm.disabled = disabled; }
    };

    setButtonsState('Gerando pagamento seguro...', true);

    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix'
        : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';

    // 1. Mensagem do WhatsApp (já com o teu número)
    const clientName = document.getElementById('client-name')?.value.trim() || 'Cliente';
    const messageText = `Olá! Sou ${clientName} e gostaria de confirmar meu agendamento:\n\n*Serviço:* ${state.service}\n*Data:* ${dateLabel}\n*Profissional:* ${professional}\n*Pagamento:* ${paymentLabel}\n*Total:* ${formatCurrency(state.price)}`;
    const whatsappUrl = `https://wa.me/5511915723418?text=${encodeURIComponent(messageText)}`;

    // 2. Se for Cartão ou Pix, chama a Edge Function na Nuvem (Mercado Pago)
    if (state.paymentMethod === 'card' || state.paymentMethod === 'pix') {
        try {
            if (!supabaseClient) throw new Error('Supabase não inicializado. Verifique a importação.');

            const items = [{
                title: `Agendamento: ${state.service} com ${professional}`,
                quantity: 1,
                unit_price: state.price
            }];

            let email = 'cliente@visitante.com'; // Fallback se não houver login

            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { items, email }
            });

            if (error) throw error;

            if (data?.init_point) {
                // Abre o WhatsApp numa nova aba
                window.open(whatsappUrl, '_blank');
                // Redireciona a tela atual para o checkout do Mercado Pago
                window.location.href = data.init_point;
            } else {
                throw new Error('Link de pagamento não gerado.');
            }
        } catch (err) {
            console.error('Erro no pagamento:', err);
            alert('Erro ao conectar com o Mercado Pago. Tente novamente.');
            setButtonsState(originalText, false);
        }
    } else {
        // Se a pessoa escolheu "Dinheiro", apenas abre o WhatsApp
        window.open(whatsappUrl, '_blank');
        setStatus('Agendamento confirmado', 'success');
        if (els.feedback) els.feedback.textContent = 'Redirecionando para o WhatsApp...';
        setButtonsState(originalText, false);
    }
}

function attachConfirmHandlers() {
    const confirm = () => confirmBooking();
    els.confirmBtn?.addEventListener('click', confirm);
    els.floatingConfirm?.addEventListener('click', confirm);
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    attachServiceHandlers();
    attachPaymentHandlers();
    attachFormHandlers();
    attachConfirmHandlers();

    document.getElementById('copy-pix')?.addEventListener('click', copyPixKey);

    selectPayment('pix');
    updateSummary();
});
