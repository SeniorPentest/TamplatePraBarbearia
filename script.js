const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2kZ2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    selectedServices: [],
    totalPrice: 0,
    paymentMethod: 'pix'
};

// Seleção de Serviços
document.querySelectorAll('.service-card').forEach(card => {
    card.querySelector('.service-select').addEventListener('click', () => {
        const name = card.dataset.service;
        const price = Number(card.dataset.price);

        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            state.selectedServices = state.selectedServices.filter(s => s.name !== name);
            state.totalPrice -= price;
        } else {
            card.classList.add('selected');
            state.selectedServices.push({ name, price });
            state.totalPrice += price;
        }
        updateUI();
    });
});

// Seleção de Pagamento
document.querySelectorAll('.payment-button').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('.payment-button').forEach(b => b.classList.toggle('active', b === btn));
    });
});

function updateUI() {
    document.getElementById('total-value').textContent = `R$ ${state.totalPrice.toFixed(2)}`;
    const ready = state.selectedServices.length > 0 && document.getElementById('appointment').value && document.getElementById('client-name').value;
    document.getElementById('confirm-btn').disabled = !ready;
}

document.getElementById('appointment').addEventListener('change', updateUI);
document.getElementById('client-name').addEventListener('input', updateUI);

function extractFunctionError(error, data) {
    if (error?.context?.response) {
        try {
            const parsed = typeof error.context.response === 'string' ? JSON.parse(error.context.response) : error.context.response;
            if (parsed?.error) return parsed.error;
            if (parsed?.message) return parsed.message;
        } catch (_) {
            return error.context.response;
        }
    }
    if (data?.error) return data.error;
    return error?.message || null;
}

async function confirmBooking() {
    const btn = document.getElementById('confirm-btn');
    btn.textContent = 'A processar...';
    btn.disabled = true;

    const name = document.getElementById('client-name').value;
    const services = state.selectedServices.map(s => s.name).join(', ');

    try {
        const baseBody = { items: state.selectedServices, customerName: name };

        if (state.paymentMethod === 'pix') {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { ...baseBody, total: state.totalPrice, method: 'pix' }
            });

            const detailedError = extractFunctionError(error, data);
            if (detailedError) throw new Error(detailedError);

            const qrImg = document.getElementById('qr-code-img');
            const pixInput = document.getElementById('pix-copy-paste');
            const pixModal = document.getElementById('pix-modal');
            const btnCheckPayment = document.getElementById('btn-check-payment');

            if (qrImg && pixInput && pixModal && btnCheckPayment) {
                qrImg.src = `data:image/png;base64,${data.qr_code_base64}`;
                pixInput.value = data.qr_code;
                pixModal.style.display = 'flex';

                btnCheckPayment.onclick = () => {
                    const msg = `Olá! Fiz o Pix de R$ ${state.totalPrice.toFixed(2)} para os serviços: ${services}. Cliente: ${name}`;
                    window.open(`https://wa.me/5511915723418?text=${encodeURIComponent(msg)}`, '_blank');
                    location.reload();
                };
            } else {
                console.warn('Elementos do modal de Pix ausentes. Exibindo fallback.');
                alert(`Pix gerado. Copie o código abaixo:\n\n${data.qr_code}`);
            }

        } else {
            const { data, error } = await supabaseClient.functions.invoke('criar-pagamento', {
                body: { ...baseBody, method: 'card' }
            });

            const detailedError = extractFunctionError(error, data);
            if (detailedError) throw new Error(detailedError);
            window.location.href = data.init_point;
        }
    } catch (err) {
        console.error('Erro ao confirmar pagamento', err);
        alert("Erro: " + err.message);
        btn.textContent = 'Confirmar e Pagar';
        btn.disabled = false;
    }
}

function copyPixCode() {
    const input = document.getElementById('pix-copy-paste');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Código copiado!');
}

document.getElementById('confirm-btn').addEventListener('click', confirmBooking);
