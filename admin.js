const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    user: null,
    selectedDate: '',
    appointments: []
};

const loginScreen = document.getElementById('login-screen');
const adminScreen = document.getElementById('admin-screen');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const adminUserEmail = document.getElementById('admin-user-email');
const logoutBtn = document.getElementById('logout-btn');
const filterDate = document.getElementById('filter-date');
const refreshBtn = document.getElementById('refresh-btn');
const loadStatus = document.getElementById('load-status');
const appointmentsList = document.getElementById('appointments-list');

const statTotal = document.getElementById('stat-total');
const statConfirmed = document.getElementById('stat-confirmed');
const statPending = document.getElementById('stat-pending');
const statRevenue = document.getElementById('stat-revenue');

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatTime(value) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

function formatDate(value) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });
}

function formatServices(services) {
    if (!Array.isArray(services) || services.length === 0) return '-';

    return services
        .map((service) => service?.name || 'Serviço')
        .join(', ');
}

function formatPaymentMethod(method) {
    const labels = {
        pix: 'Pix',
        card: 'Cartão',
        pay_at_shop: 'Pagar na barbearia'
    };

    return labels[method] || method || '-';
}

function formatBookingStatus(status) {
    const labels = {
        confirmed: 'Confirmado',
        pending_payment: 'Aguardando pagamento',
        expired: 'Expirado',
        cancelled: 'Cancelado',
        completed: 'Concluído',
        no_show: 'Não compareceu'
    };

    return labels[status] || status || '-';
}

function formatPaymentStatus(status) {
    const labels = {
        pending: 'Pagamento pendente',
        approved: 'Pago',
        rejected: 'Recusado',
        refunded: 'Reembolsado'
    };

    return labels[status] || status || '-';
}

function getStatusClass(status) {
    if (!status) return 'status-default';

    return `status-${String(status)}`;
}

function setTodayOnFilter() {
    const now = new Date();
    const saoPauloDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

    filterDate.value = saoPauloDate;
    state.selectedDate = saoPauloDate;
}

function getDayRange(dateText) {
    const start = new Date(`${dateText}T00:00:00-03:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return {
        startIso: start.toISOString(),
        endIso: end.toISOString()
    };
}

function showLogin() {
    loginScreen.classList.remove('hidden');
    adminScreen.classList.add('hidden');
}

function showAdmin() {
    loginScreen.classList.add('hidden');
    adminScreen.classList.remove('hidden');
}

function setLoginError(message) {
    loginError.textContent = message || '';
}

function setLoadStatus(message) {
    loadStatus.textContent = message || '';
}

async function checkIsAdmin(userId) {
    const { data, error } = await supabaseClient
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message || 'Falha ao verificar permissão de admin.');
    }

    return Boolean(data?.user_id);
}

async function loadAppointments() {
    if (!state.selectedDate) {
        appointmentsList.innerHTML = '<div class="empty-state">Selecione uma data para carregar os agendamentos.</div>';
        return;
    }

    setLoadStatus('Carregando reservas...');

    const { startIso, endIso } = getDayRange(state.selectedDate);

    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            id,
            client_name,
            client_phone,
            selected_services,
            total_price,
            appointment_start,
            appointment_end,
            payment_method,
            payment_status,
            booking_status,
            expires_at,
            created_at
        `)
        .gte('appointment_start', startIso)
        .lt('appointment_start', endIso)
        .order('appointment_start', { ascending: true });

    if (error) {
        console.error(error);
        appointmentsList.innerHTML = `<div class="empty-state">Erro ao carregar reservas: ${error.message}</div>`;
        setLoadStatus('Erro ao carregar reservas.');
        updateStats([]);
        return;
    }

    state.appointments = Array.isArray(data) ? data : [];

    renderAppointments();
    updateStats(state.appointments);
    setLoadStatus(`${state.appointments.length} reserva(s) encontrada(s).`);
}

function renderAppointments() {
    if (!state.appointments.length) {
        appointmentsList.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado para esta data.</div>';
        return;
    }

    appointmentsList.innerHTML = state.appointments.map((appointment) => {
        const services = formatServices(appointment.selected_services);
        const time = formatTime(appointment.appointment_start);
        const date = formatDate(appointment.appointment_start);
        const paymentMethod = formatPaymentMethod(appointment.payment_method);
        const bookingStatus = formatBookingStatus(appointment.booking_status);
        const paymentStatus = formatPaymentStatus(appointment.payment_status);
        const bookingStatusClass = getStatusClass(appointment.booking_status);
        const paymentStatusClass = getStatusClass(appointment.payment_status);

        return `
            <article class="appointment-row">
                <div class="appointment-time" data-label="Horário">
                    ${time}
                </div>

                <div class="appointment-client" data-label="Cliente">
                    <strong>${escapeHtml(appointment.client_name || '-')}</strong>
                    <span>${date}</span>
                </div>

                <div class="appointment-service" data-label="Serviço">
                    <strong>${escapeHtml(services)}</strong>
                    <span>ID: ${escapeHtml(appointment.id)}</span>
                </div>

                <div class="appointment-value" data-label="Valor">
                    <strong>${formatCurrency(appointment.total_price)}</strong>
                    <span>${appointment.client_phone ? escapeHtml(appointment.client_phone) : 'Sem telefone'}</span>
                </div>

                <div data-label="Pagamento">
                    <span class="status-pill ${paymentStatusClass}">${escapeHtml(paymentStatus)}</span>
                    <br>
                    <span class="mini-text">${escapeHtml(paymentMethod)}</span>
                </div>

                <div data-label="Status">
                    <span class="status-pill ${bookingStatusClass}">${escapeHtml(bookingStatus)}</span>
                </div>
            </article>
        `;
    }).join('');
}

function updateStats(appointments) {
    const total = appointments.length;
    const confirmed = appointments.filter((item) => item.booking_status === 'confirmed').length;
    const pending = appointments.filter((item) => item.booking_status === 'pending_payment').length;
    const revenue = appointments.reduce((sum, item) => {
        if (item.booking_status === 'expired' || item.booking_status === 'cancelled') return sum;
        return sum + Number(item.total_price || 0);
    }, 0);

    statTotal.textContent = String(total);
    statConfirmed.textContent = String(confirmed);
    statPending.textContent = String(pending);
    statRevenue.textContent = formatCurrency(revenue);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function initializeAdmin() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        showLogin();
        return;
    }

    const session = data?.session;

    if (!session?.user) {
        showLogin();
        return;
    }

    try {
        const isAdmin = await checkIsAdmin(session.user.id);

        if (!isAdmin) {
            await supabaseClient.auth.signOut();
            showLogin();
            setLoginError('Este usuário não tem permissão de admin.');
            return;
        }

        state.user = session.user;
        adminUserEmail.textContent = session.user.email || '-';

        showAdmin();

        if (!filterDate.value) {
            setTodayOnFilter();
        }

        await loadAppointments();
    } catch (error) {
        console.error(error);
        showLogin();
        setLoginError(error.message || 'Erro ao iniciar painel admin.');
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    setLoginError('');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message || 'Erro ao fazer login.');
        }

        const user = data?.user;

        if (!user) {
            throw new Error('Login inválido.');
        }

        const isAdmin = await checkIsAdmin(user.id);

        if (!isAdmin) {
            await supabaseClient.auth.signOut();
            throw new Error('Este usuário não tem permissão de admin.');
        }

        state.user = user;
        adminUserEmail.textContent = user.email || '-';

        showAdmin();

        if (!filterDate.value) {
            setTodayOnFilter();
        }

        await loadAppointments();
    } catch (error) {
        console.error(error);
        setLoginError(error.message || 'Erro ao fazer login.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar no painel';
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();

    state.user = null;
    state.appointments = [];

    showLogin();
});

filterDate.addEventListener('change', async (event) => {
    state.selectedDate = event.target.value;
    await loadAppointments();
});

refreshBtn.addEventListener('click', loadAppointments);

initializeAdmin();