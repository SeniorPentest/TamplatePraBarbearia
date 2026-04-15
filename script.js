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

function isReadyToConfirm() {
    if (!state.service || !state.datetime || !state.paymentMethod) return false;
    if (state.paymentMethod === 'card') {
        const name = document.getElementById('card-name')?.value.trim();
        const number = document.getElementById('card-number')?.value.replace(/\s+/g, '');
        const expiry = document.getElementById('card-expiry')?.value.trim();
        const cvv = document.getElementById('card-cvv')?.value.trim();
        return Boolean(name && number && number.length >= 15 && expiry && cvv && cvv.length >= 3);
    }
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
    const label = method === 'pix' ? 'Pagamento aguardando chave Pix'
        : method === 'card' ? 'Validação do cartão para garantir o horário'
        : 'Pagamento presencial';
    setStatus(label, method === 'card' ? 'waiting' : 'pending');
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

function confirmBooking() {
    if (!isReadyToConfirm()) return;
    const dateLabel = formatDate(state.datetime);
    const professional = state.professional || 'primeiro disponível';
    const paymentLabel = state.paymentMethod === 'pix' ? 'Pix'
        : state.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro na barbearia';
    const message = `Agendamento confirmado: ${state.service} para ${dateLabel} com ${professional}. Forma de pagamento: ${paymentLabel}.`;

    if (els.feedback) {
        els.feedback.textContent = message + ' Você receberá confirmação em instantes.';
        els.feedback.style.color = '#c6a15b';
    }
    if (els.summaryText) els.summaryText.textContent = message;
    setStatus('Agendamento confirmado', 'success');
}

function attachConfirmHandlers() {
    const confirm = () => confirmBooking();
    els.confirmBtn?.addEventListener('click', confirm);
    els.floatingConfirm?.addEventListener('click', confirm);
}

document.addEventListener('DOMContentLoaded', () => {
    attachServiceHandlers();
    attachPaymentHandlers();
    attachFormHandlers();
    attachConfirmHandlers();

    document.getElementById('copy-pix')?.addEventListener('click', copyPixKey);

    selectPayment('pix');
    updateSummary();
});
