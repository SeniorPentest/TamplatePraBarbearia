const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2kZ2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const PIX_KEY = '5511915723418';
const WHATSAPP_NUMBER = '5511915723418';
const MERCHANT_NAME = 'Barbearia Premium';
const MERCHANT_CITY = 'Sao Paulo';

const state = {
    selectedServices: [],
    totalPrice: 0,
    paymentMethod: 'pix',
    selectedDate: '',
    selectedSlot: null,
    availabilityStatus: 'idle',
    availabilityMessage: 'Selecione uma data para ver horários',
    availabilitySlots: []
};

function emvField(id, value) {
    const length = String(value.length).padStart(2, '0');
    return `${id}${length}${value}`;
}

function calculateCRC16(payload) {
    let crc = 0xffff;

    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            const flag = crc & 0x8000;
            crc = (crc << 1) & 0xffff;
            if (flag) crc ^= 0x1021;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(amount) {
    const amountFormatted = Number(amount).toFixed(2);
    const txid = `BARB${Date.now().toString().slice(-6)}`;

    const merchantAccountInfo = emvField(
        '26',
        emvField('00', 'BR.GOV.BCB.PIX') +
        emvField('01', PIX_KEY)
    );

    const additionalData = emvField('62', emvField('05', txid));

    let payload = '';
    payload += emvField('00', '01');
    payload += emvField('01', '12');
    payload += merchantAccountInfo;
    payload += emvField('52', '0000');
    payload += emvField('53', '986');
    payload += emvField('54', amountFormatted);
    payload += emvField('58', 'BR');
    payload += emvField('59', MERCHANT_NAME);
    payload += emvField('60', MERCHANT_CITY);
    payload += additionalData;
    payload += '6304';

    const crc = calculateCRC16(payload);
    return `${payload}${crc}`;
}

function normalizeDateTimeWithOffset(value) {
    if (!value || typeof value !== 'string') return value;

    if (/T\d{2}:\d{2}:\d{2}[+-]\d{2}$/.test(value)) {
        return `${value}:00`;
    }

    return value;
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';

    const [year, month, day] = dateStr.split('-');

    if (!year || !month || !day) return dateStr;

    return `${day}/${month}/${year}`;
}

function formatSlotForDisplay(slot) {
    if (!slot) return '';

    return `${formatDateForDisplay(state.selectedDate)} às ${slot.time}`;
}

function setAvailability(status, message) {
    state.availabilityStatus = status;
    state.availabilityMessage = message;
    renderAvailabilityStatus();
}

function renderAvailabilityStatus() {
    const statusEl = document.getElementById('shop-status');

    if (!statusEl) return;

    statusEl.textContent = state.availabilityMessage;
    statusEl.className = 'shop-status';

    if (state.availabilityStatus === 'open') {
        statusEl.classList.add('status-open');
    } else if (state.availabilityStatus === 'closed') {
        statusEl.classList.add('status-closed');
    } else if (state.availabilityStatus === 'error') {
        statusEl.classList.add('status-error');
    } else {
        statusEl.classList.add('status-neutral');
    }
}

function renderSlots() {
    const slotsGrid = document.getElementById('slots-grid');

    if (!slotsGrid) return;

    slotsGrid.innerHTML = '';

    if (state.availabilityStatus === 'loading') {
        slotsGrid.innerHTML = '<p class="slots-message">Carregando horários...</p>';
        return;
    }

    if (state.availabilityStatus === 'error') {
        slotsGrid.innerHTML = '<p class="slots-message">Erro ao consultar disponibilidade.</p>';
        return;
    }

    if (state.availabilityStatus === 'closed') {
        slotsGrid.innerHTML = '<p class="slots-message">Barbearia fechada para a data selecionada.</p>';
        return;
    }

    if (!state.availabilitySlots.length) {
        slotsGrid.innerHTML = '<p class="slots-message">Sem horários disponíveis para esta data.</p>';
        return;
    }

    state.availabilitySlots.forEach((slot) => {
        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'slot-button';
        btn.textContent = slot.time;
        btn.classList.toggle('selected', state.selectedSlot?.start === slot.start);

        btn.addEventListener('click', () => {
            state.selectedSlot = {
                ...slot,
                start: normalizeDateTimeWithOffset(slot.start),
                end: normalizeDateTimeWithOffset(slot.end)
            };

            renderSlots();
            updateUI();
        });

        slotsGrid.appendChild(btn);
    });
}

async function loadAvailabilityByDate(date) {
    if (!date) {
        state.availabilitySlots = [];
        state.selectedSlot = null;
        setAvailability('idle', 'Selecione uma data para ver horários');
        renderSlots();
        updateUI();
        return;
    }

    state.selectedSlot = null;
    state.availabilitySlots = [];
    setAvailability('loading', 'Carregando horários...');
    renderSlots();
    updateUI();

    try {
        const response = await fetch(
            `${supabaseUrl}/functions/v1/disponibilidade?date=${encodeURIComponent(date)}`
        );

        if (!response.ok) {
            throw new Error('Falha na consulta de disponibilidade');
        }

        const data = await response.json();
        const slots = Array.isArray(data?.slots) ? data.slots : [];

        state.availabilitySlots = slots.map((slot) => ({
            ...slot,
            start: normalizeDateTimeWithOffset(slot.start),
            end: normalizeDateTimeWithOffset(slot.end)
        }));

        if (data?.status === 'closed') {
            setAvailability('closed', 'Barbearia fechada');
        } else if (!state.availabilitySlots.length) {
            setAvailability('open', 'Sem horários disponíveis');
        } else {
            setAvailability('open', 'Barbearia aberta • Escolha um horário');
        }

        renderSlots();
    } catch (error) {
        console.error(error);

        state.availabilitySlots = [];
        state.selectedSlot = null;

        setAvailability('error', 'Erro ao consultar disponibilidade');
        renderSlots();
    } finally {
        updateUI();
    }
}

document.querySelectorAll('.service-card').forEach((card) => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service;
        const price = Number(card.dataset.price);

        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            state.selectedServices = state.selectedServices.filter((s) => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }

        updateUI();
    });
});

document.querySelectorAll('.payment-button').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;

        document.querySelectorAll('.payment-button').forEach((b) => {
            b.classList.toggle('active', b === btn);
        });

        updatePaymentMessage();
        updateUI();
    });
});

function updatePaymentMessage() {
    const paymentMessage = document.getElementById('payment-message');

    if (!paymentMessage) return;

    if (state.paymentMethod === 'onsite') {
        paymentMessage.textContent = 'Pague presencialmente no dia do atendimento.';
    } else if (state.paymentMethod === 'pix') {
        paymentMessage.textContent = 'Pagamento via Pix.';
    } else if (state.paymentMethod === 'card') {
        paymentMessage.textContent = 'Pagamento seguro com cartão.';
    } else {
        paymentMessage.textContent = '';
    }
}

function updateUI() {
    document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;

    const hasServices = state.selectedServices.length > 0;
    const hasName = Boolean(document.getElementById('client-name').value.trim());
    const hasDate = Boolean(state.selectedDate);
    const hasSlot = Boolean(state.selectedSlot?.start && state.selectedSlot?.end);
    const hasPaymentMethod = Boolean(state.paymentMethod);

    const ready = hasServices && hasName && hasDate && hasSlot && hasPaymentMethod;

    document.getElementById('confirm-btn').disabled = !ready;
}

document.getElementById('appointment-date').addEventListener('change', async (event) => {
    state.selectedDate = event.target.value;
    await loadAvailabilityByDate(state.selectedDate);
});

document.getElementById('client-name').addEventListener('input', updateUI);

async function createReservation() {
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone')?.value?.trim() || null;

    const paymentMethodMap = {
        pix: 'pix',
        card: 'card',
        onsite: 'pay_at_shop'
    };

    const paymentMethod = paymentMethodMap[state.paymentMethod];

    if (!paymentMethod) {
        throw new Error('Método de pagamento inválido.');
    }

    if (!state.selectedSlot?.start || !state.selectedSlot?.end) {
        throw new Error('Selecione um horário válido.');
    }

    const appointmentStart = normalizeDateTimeWithOffset(state.selectedSlot.start);
    const appointmentEnd = normalizeDateTimeWithOffset(state.selectedSlot.end);

    const response = await fetch(`${supabaseUrl}/functions/v1/criar-reserva`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_name: name,
            client_phone: phone,
            selected_services: state.selectedServices,
            total_price: state.totalPrice,
            payment_method: paymentMethod,
            appointment_start: appointmentStart,
            appointment_end: appointmentEnd
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.error || 'Falha ao criar reserva.');
    }

    return data;
}

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');

    btn.textContent = 'Processando...';
    btn.disabled = true;

    const name = document.getElementById('client-name').value.trim();
    const services = state.selectedServices.map((s) => s.name).join(', ');
    const slotText = formatSlotForDisplay(state.selectedSlot);

    try {
        const reservation = await createReservation();

        if (state.paymentMethod === 'pix') {
            const payload = generatePixPayload(state.totalPrice);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;

            document.getElementById('qr-code-img').src = qrUrl;
            document.getElementById('pix-copy-paste').value = payload;
            document.getElementById('pix-modal').classList.add('open');

            document.getElementById('btn-check-payment').onclick = () => {
                const msg = `Olá! Já paguei via Pix.\nCliente: ${name}\nServiços: ${services}\nTotal: R$ ${state.totalPrice.toFixed(2)}${slotText ? `\nHorário: ${slotText}` : ''}\nReserva: ${reservation.appointment_id}\nEnvio o comprovante para confirmar?`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            };
        } else if (state.paymentMethod === 'card') {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: {
                    items: state.selectedServices,
                    method: 'card',
                    total: state.totalPrice
                }
            });

            if (error) throw error;

            window.location.href = data.init_point;
        } else if (state.paymentMethod === 'onsite') {
            showSuccessModal({
                reservationId: reservation.appointment_id,
                clientName: name,
                services,
                slotText,
                paymentText: 'Pagar na barbearia'
            });

            await loadAvailabilityByDate(state.selectedDate);
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    } finally {
        btn.textContent = 'Confirmar Agendamento';
        btn.disabled = false;
        updateUI();
    }
}

function showSuccessModal({ reservationId, clientName, services, slotText, paymentText }) {
    const modal = document.getElementById('success-modal');

    if (!modal) return;

    document.getElementById('success-client').textContent = clientName || '-';
    document.getElementById('success-services').textContent = services || '-';
    document.getElementById('success-date-time').textContent = slotText || '-';
    document.getElementById('success-payment').textContent = paymentText || '-';
    document.getElementById('success-reservation-id').textContent = reservationId || '-';

    const whatsappBtn = document.getElementById('success-whatsapp-btn');

    if (whatsappBtn) {
        whatsappBtn.onclick = () => {
            const msg = `Olá! Acabei de fazer um agendamento.\nCliente: ${clientName}\nServiços: ${services}\nHorário: ${slotText}\nPagamento: ${paymentText}\nReserva: ${reservationId}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
        };
    }

    modal.classList.add('open');
}

function closeSuccessModal() {
    document.getElementById('success-modal')?.classList.remove('open');
}

function resetBookingForm() {
    state.selectedServices = [];
    state.totalPrice = 0;
    state.selectedSlot = null;
    state.availabilitySlots = [];
    state.selectedDate = '';

    document.querySelectorAll('.service-card').forEach((card) => {
        card.classList.remove('selected');
    });

    document.getElementById('client-name').value = '';
    document.getElementById('appointment-date').value = '';

    setAvailability('idle', 'Selecione uma data para ver horários');
    renderSlots();
    updateUI();
}

function copyPixCode() {
    const input = document.getElementById('pix-copy-paste');

    input.select();
    navigator.clipboard.writeText(input.value);

    alert('Código copiado!');
}

function closePixModal() {
    document.getElementById('pix-modal').classList.remove('open');
}

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
document.getElementById('copy-pix-btn')?.addEventListener('click', copyPixCode);
document.getElementById('close-pix-modal')?.addEventListener('click', closePixModal);

document.getElementById('pix-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'pix-modal') closePixModal();
});

document.getElementById('close-success-modal')?.addEventListener('click', closeSuccessModal);

document.getElementById('success-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'success-modal') closeSuccessModal();
});

document.getElementById('success-new-booking-btn')?.addEventListener('click', () => {
    closeSuccessModal();
    resetBookingForm();
});

renderAvailabilityStatus();
renderSlots();
updatePaymentMessage();
updateUI();