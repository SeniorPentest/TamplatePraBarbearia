const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    user: null,
    selectedDate: '',
    appointments: [],
    services: [],
    isActionLoading: false,
    isServiceSaving: false
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

const serviceForm = document.getElementById('service-form');
const serviceFormTitle = document.getElementById('service-form-title');
const serviceIdInput = document.getElementById('service-id');
const serviceNameInput = document.getElementById('service-name');
const servicePriceInput = document.getElementById('service-price');
const serviceDurationInput = document.getElementById('service-duration');
const serviceIconUrlInput = document.getElementById('service-icon-url');
const serviceDescriptionInput = document.getElementById('service-description');
const serviceSortInput = document.getElementById('service-sort');
const serviceActiveInput = document.getElementById('service-active');
const serviceSubmitBtn = document.getElementById('service-submit-btn');
const serviceCancelEditBtn = document.getElementById('service-cancel-edit-btn');
const servicesStatus = document.getElementById('services-status');
const refreshServicesBtn = document.getElementById('refresh-services-btn');
const servicesAdminList = document.getElementById('services-admin-list');

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

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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

function setServicesStatus(message, isError = false) {
    if (!servicesStatus) return;

    servicesStatus.textContent = message || '';
    servicesStatus.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
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

        const canMarkPaid = appointment.payment_status !== 'approved';
        const canCancel = !['cancelled', 'completed', 'no_show', 'expired'].includes(appointment.booking_status);
        const canComplete = appointment.booking_status !== 'completed';
        const canNoShow = !['cancelled', 'completed', 'no_show'].includes(appointment.booking_status);

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

                <div class="appointment-actions">
                    <button class="action-btn action-paid" type="button" data-action="mark_paid" data-id="${escapeHtml(appointment.id)}" ${canMarkPaid ? '' : 'disabled'}>
                        Marcar pago
                    </button>

                    <button class="action-btn action-complete" type="button" data-action="complete" data-id="${escapeHtml(appointment.id)}" ${canComplete ? '' : 'disabled'}>
                        Concluir
                    </button>

                    <button class="action-btn action-noshow" type="button" data-action="no_show" data-id="${escapeHtml(appointment.id)}" ${canNoShow ? '' : 'disabled'}>
                        Não compareceu
                    </button>

                    <button class="action-btn action-cancel" type="button" data-action="cancel" data-id="${escapeHtml(appointment.id)}" ${canCancel ? '' : 'disabled'}>
                        Cancelar
                    </button>
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

function getActionLabel(action) {
    const labels = {
        mark_paid: 'marcar como pago',
        cancel: 'cancelar',
        complete: 'concluir',
        no_show: 'marcar como não compareceu'
    };

    return labels[action] || action;
}

async function runAdminAction(appointmentId, action) {
    if (state.isActionLoading) return;

    const actionLabel = getActionLabel(action);
    const confirmed = window.confirm(`Tem certeza que deseja ${actionLabel} esta reserva?`);

    if (!confirmed) return;

    state.isActionLoading = true;
    setLoadStatus('Atualizando reserva...');

    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-reserva', {
            body: {
                appointment_id: appointmentId,
                action
            }
        });

        if (error) {
            throw new Error(error.message || 'Erro ao atualizar reserva.');
        }

        if (!data?.ok) {
            throw new Error(data?.error || 'Erro ao atualizar reserva.');
        }

        await loadAppointments();
    } catch (error) {
        console.error(error);
        alert(error.message || 'Erro ao atualizar reserva.');
        setLoadStatus('Erro ao atualizar reserva.');
    } finally {
        state.isActionLoading = false;
    }
}

async function loadAdminServices() {
    if (!servicesAdminList) return;

    servicesAdminList.innerHTML = '<div class="empty-state">Carregando serviços...</div>';
    setServicesStatus('');

    const { data, error } = await supabaseClient
        .from('services')
        .select('id, name, price, duration_minutes, icon_url, description, is_active, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error(error);
        servicesAdminList.innerHTML = `<div class="empty-state">Erro ao carregar serviços: ${escapeHtml(error.message)}</div>`;
        return;
    }

    state.services = Array.isArray(data) ? data : [];
    renderAdminServices();
}

function renderAdminServices() {
    if (!servicesAdminList) return;

    if (!state.services.length) {
        servicesAdminList.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado.</div>';
        return;
    }

    servicesAdminList.innerHTML = state.services.map((service) => {
        const icon = service.icon_url
            ? `<img src="${escapeHtml(service.icon_url)}" alt="">`
            : '✂️';

        const statusClass = service.is_active ? 'service-status-active' : 'service-status-inactive';
        const statusText = service.is_active ? 'Ativo no site' : 'Inativo no site';

        return `
            <article class="admin-service-item">
                <div class="admin-service-icon">
                    ${icon}
                </div>

                <div class="admin-service-info">
                    <strong>${escapeHtml(service.name)}</strong>
                    <span>${formatCurrency(service.price)} • ${Number(service.duration_minutes || 45)} min • Ordem ${Number(service.sort_order || 0)}</span>
                    <span class="${statusClass}">${statusText}</span>
                    ${service.description ? `<span>${escapeHtml(service.description)}</span>` : ''}
                </div>

                <div class="admin-service-actions">
                    <button type="button" data-service-action="edit" data-id="${escapeHtml(service.id)}">Editar</button>
                    <button type="button" data-service-action="toggle" data-id="${escapeHtml(service.id)}">
                        ${service.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function resetServiceForm() {
    if (!serviceForm) return;

    serviceForm.reset();

    serviceIdInput.value = '';
    serviceDurationInput.value = '45';
    serviceSortInput.value = '0';
    serviceActiveInput.checked = true;
    serviceFormTitle.textContent = 'Novo serviço';
    serviceSubmitBtn.textContent = 'Salvar serviço';
    setServicesStatus('');
}

function fillServiceForm(service) {
    serviceIdInput.value = service.id;
    serviceNameInput.value = service.name || '';
    servicePriceInput.value = Number(service.price || 0).toFixed(2);
    serviceDurationInput.value = Number(service.duration_minutes || 45);
    serviceIconUrlInput.value = service.icon_url || '';
    serviceDescriptionInput.value = service.description || '';
    serviceSortInput.value = Number(service.sort_order || 0);
    serviceActiveInput.checked = Boolean(service.is_active);

    serviceFormTitle.textContent = 'Editar serviço';
    serviceSubmitBtn.textContent = 'Salvar alterações';
    setServicesStatus('Editando serviço selecionado.');

    serviceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getServicePayloadFromForm() {
    const name = serviceNameInput.value.trim();
    const price = Number(servicePriceInput.value);
    const duration = Number(serviceDurationInput.value);
    const sortOrder = Number(serviceSortInput.value || 0);
    const iconUrl = serviceIconUrlInput.value.trim();
    const description = serviceDescriptionInput.value.trim();

    if (!name) {
        throw new Error('Informe o nome do serviço.');
    }

    if (!Number.isFinite(price) || price < 0) {
        throw new Error('Informe um preço válido.');
    }

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Informe uma duração válida.');
    }

    return {
        name,
        price,
        duration_minutes: Math.round(duration),
        icon_url: iconUrl || null,
        description: description || null,
        is_active: serviceActiveInput.checked,
        sort_order: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0
    };
}

async function saveService(event) {
    event.preventDefault();

    if (state.isServiceSaving) return;

    state.isServiceSaving = true;
    serviceSubmitBtn.disabled = true;
    serviceSubmitBtn.textContent = 'Salvando...';
    setServicesStatus('');

    try {
        const serviceId = serviceIdInput.value.trim();
        const payload = getServicePayloadFromForm();

        if (serviceId) {
            const { error } = await supabaseClient
                .from('services')
                .update(payload)
                .eq('id', serviceId);

            if (error) throw error;

            setServicesStatus('Serviço atualizado com sucesso.');
        } else {
            const { error } = await supabaseClient
                .from('services')
                .insert(payload);

            if (error) throw error;

            setServicesStatus('Serviço criado com sucesso.');
        }

        resetServiceForm();
        await loadAdminServices();
    } catch (error) {
        console.error(error);
        setServicesStatus(error.message || 'Erro ao salvar serviço.', true);
    } finally {
        state.isServiceSaving = false;
        serviceSubmitBtn.disabled = false;
        serviceSubmitBtn.textContent = serviceIdInput.value ? 'Salvar alterações' : 'Salvar serviço';
    }
}

async function toggleServiceActive(serviceId) {
    const service = state.services.find((item) => item.id === serviceId);

    if (!service) return;

    const nextActive = !service.is_active;
    const actionText = nextActive ? 'ativar' : 'desativar';

    const confirmed = window.confirm(`Tem certeza que deseja ${actionText} este serviço?`);

    if (!confirmed) return;

    setServicesStatus('Atualizando serviço...');

    const { error } = await supabaseClient
        .from('services')
        .update({ is_active: nextActive })
        .eq('id', serviceId);

    if (error) {
        console.error(error);
        setServicesStatus(error.message || 'Erro ao atualizar serviço.', true);
        return;
    }

    setServicesStatus(nextActive ? 'Serviço ativado.' : 'Serviço desativado.');
    await loadAdminServices();
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

        await Promise.all([
            loadAppointments(),
            loadAdminServices()
        ]);
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

        await Promise.all([
            loadAppointments(),
            loadAdminServices()
        ]);
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
    state.services = [];

    showLogin();
});

filterDate.addEventListener('change', async (event) => {
    state.selectedDate = event.target.value;
    await loadAppointments();
});

refreshBtn.addEventListener('click', loadAppointments);

appointmentsList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action][data-id]');

    if (!button) return;

    const appointmentId = button.dataset.id;
    const action = button.dataset.action;

    await runAdminAction(appointmentId, action);
});

serviceForm?.addEventListener('submit', saveService);

serviceCancelEditBtn?.addEventListener('click', resetServiceForm);

refreshServicesBtn?.addEventListener('click', loadAdminServices);

servicesAdminList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-service-action][data-id]');

    if (!button) return;

    const serviceId = button.dataset.id;
    const action = button.dataset.serviceAction;

    if (action === 'edit') {
        const service = state.services.find((item) => item.id === serviceId);
        if (service) fillServiceForm(service);
        return;
    }

    if (action === 'toggle') {
        await toggleServiceActive(serviceId);
    }
});

initializeAdmin();
