const supabaseUrl = 'https://kifhzxrvkfvmjlrtdeif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmh6eHJ2a2Z2bWpscnRkZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM5MTcsImV4cCI6MjA5MTc1OTkxN30.z5oZ1KrN7cVkDWdQoL8M5yE8vLPm5h6x5pbvQOcmjaY';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
    profile: null,
    user: null,
    selectedDate: '',
    appointments: [],
    services: [],
    businessHours: [],
    professionals: [],
    professionalsById: {},
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

const cashTotal = document.getElementById('cash-total');
const cashCash = document.getElementById('cash-cash');
const cashPix = document.getElementById('cash-pix');
const cashDebit = document.getElementById('cash-debit');
const cashCredit = document.getElementById('cash-credit');
const cashCourtesy = document.getElementById('cash-courtesy');
const cashCompletedCount = document.getElementById('cash-completed-count');

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

const refreshBusinessHoursBtn = document.getElementById('refresh-business-hours-btn');
const businessHoursList = document.getElementById('business-hours-list');
const businessHoursStatus = document.getElementById('business-hours-status');

const refreshProfileBtn = document.getElementById('refresh-profile-btn');
const profileForm = document.getElementById('profile-form');
const profileIdInput = document.getElementById('profile-id');
const profileNameInput = document.getElementById('profile-name');
const profileSubtitleInput = document.getElementById('profile-subtitle');
const profileLogoUrlInput = document.getElementById('profile-logo-url');
const profileInstagramUrlInput = document.getElementById('profile-instagram-url');
const profileWhatsappNumberInput = document.getElementById('profile-whatsapp-number');
const profilePixKeyInput = document.getElementById('profile-pix-key');
const profileAddressInput = document.getElementById('profile-address');
const profileCityInput = document.getElementById('profile-city');
const profileHeroTitleInput = document.getElementById('profile-hero-title');
const profileHeroDescriptionInput = document.getElementById('profile-hero-description');
const profilePaymentPixInput = document.getElementById('profile-payment-pix');
const profilePaymentCardInput = document.getElementById('profile-payment-card');
const profilePaymentOnsiteInput = document.getElementById('profile-payment-onsite');
const profileSubmitBtn = document.getElementById('profile-submit-btn');
const profileStatus = document.getElementById('profile-status');

const refreshProfessionalsBtn = document.getElementById('refresh-professionals-btn');
const professionalForm = document.getElementById('professional-form');
const professionalFormTitle = document.getElementById('professional-form-title');
const professionalIdInput = document.getElementById('professional-id');
const professionalNameInput = document.getElementById('professional-name');
const professionalPhoneInput = document.getElementById('professional-phone');
const professionalEmailInput = document.getElementById('professional-email');
const professionalCommissionInput = document.getElementById('professional-commission');
const professionalSortInput = document.getElementById('professional-sort');
const professionalNotesInput = document.getElementById('professional-notes');
const professionalActiveInput = document.getElementById('professional-active');
const professionalSubmitBtn = document.getElementById('professional-submit-btn');
const professionalCancelEditBtn = document.getElementById('professional-cancel-edit-btn');
const professionalsStatus = document.getElementById('professionals-status');
const professionalsAdminList = document.getElementById('professionals-admin-list');

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


function getProfessionalById(professionalId) {
    if (!professionalId) return null;

    return state.professionalsById?.[professionalId]
        || state.professionals.find((professional) => professional.id === professionalId)
        || null;
}


function calculateCommission(appointment) {
    const professional = getProfessionalById(appointment.professional_id);
    const percent = Number(professional?.commission_percent || 0);
    const baseValue = Number(appointment.final_total ?? appointment.total_price ?? 0);
    const commissionValue = baseValue * (percent / 100);
    const shopValue = baseValue - commissionValue;

    return {
        percent,
        commissionValue,
        shopValue
    };
}

function formatProfessionalName(professionalId) {
    if (!professionalId) return 'Não definido';

    const professional = getProfessionalById(professionalId);

    if (professional?.name) return professional.name;

    return `Não encontrado (${String(professionalId).slice(0, 8)}...)`;
}

function formatServices(services) {
    if (!Array.isArray(services) || services.length === 0) return '-';

    return services
        .map((service) => service?.name || 'Serviço')
        .join(', ');
}

function formatFinalPaymentMethod(method) {
    const labels = {
        cash: 'Dinheiro',
        pix: 'Pix',
        debit: 'Débito',
        credit: 'Crédito',
        courtesy: 'Cortesia',
        other: 'Outro'
    };

    return labels[method] || method || '-';
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
            final_payment_method,
            final_total,
            paid_at,
            completed_at,
            admin_notes,
            professional_id,
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

    if (!state.professionals.length) {
        await loadProfessionals();
    }

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
                    <span>Profissional: ${escapeHtml(formatProfessionalName(appointment.professional_id))}</span>
                    ${appointment.professional_id ? (() => {
                        const commission = calculateCommission(appointment);
                        return `<span>Comissão: ${commission.percent.toFixed(2).replace('.', ',')}% • ${formatCurrency(commission.commissionValue)} | Barbearia: ${formatCurrency(commission.shopValue)}</span>`;
                    })() : ''}

                </div>

                <div class="appointment-value" data-label="Valor">
                    <strong>${formatCurrency(appointment.total_price)}</strong>
                    <span>${appointment.client_phone ? escapeHtml(appointment.client_phone) : 'Sem telefone'}</span>
                </div>

                <div data-label="Pagamento">
                    <span class="status-pill ${paymentStatusClass}">${escapeHtml(paymentStatus)}</span>
                    <br>
                    <span class="mini-text">${escapeHtml(paymentMethod)}</span>
                    ${appointment.final_payment_method ? `<br><span class="mini-text">Final: ${escapeHtml(formatFinalPaymentMethod(appointment.final_payment_method))} • ${formatCurrency(appointment.final_total || appointment.total_price)}</span>` : ''}
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

    const completedAppointments = appointments.filter((item) => item.booking_status === 'completed');

    const cashSummary = completedAppointments.reduce((summary, item) => {
        const method = item.final_payment_method || 'other';
        const value = Number(item.final_total ?? item.total_price ?? 0);

        summary.total += value;

        if (method === 'cash') summary.cash += value;
        else if (method === 'pix') summary.pix += value;
        else if (method === 'debit') summary.debit += value;
        else if (method === 'credit') summary.credit += value;
        else if (method === 'courtesy') summary.courtesy += value;

        return summary;
    }, {
        total: 0,
        cash: 0,
        pix: 0,
        debit: 0,
        credit: 0,
        courtesy: 0
    });

    statTotal.textContent = String(total);
    statConfirmed.textContent = String(confirmed);
    statPending.textContent = String(pending);
    statRevenue.textContent = formatCurrency(revenue);

    if (cashTotal) cashTotal.textContent = formatCurrency(cashSummary.total);
    if (cashCash) cashCash.textContent = formatCurrency(cashSummary.cash);
    if (cashPix) cashPix.textContent = formatCurrency(cashSummary.pix);
    if (cashDebit) cashDebit.textContent = formatCurrency(cashSummary.debit);
    if (cashCredit) cashCredit.textContent = formatCurrency(cashSummary.credit);
    if (cashCourtesy) cashCourtesy.textContent = formatCurrency(cashSummary.courtesy);
    if (cashCompletedCount) cashCompletedCount.textContent = String(completedAppointments.length);
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


function normalizeMoneyInput(value) {
    return String(value || '')
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(',', '.');
}

function getCompletionPayload() {
    const paymentMap = {
        '1': 'cash',
        '2': 'pix',
        '3': 'debit',
        '4': 'credit',
        '5': 'courtesy',
        '6': 'other'
    };

    const paymentChoice = window.prompt(
        'Forma de pagamento real:\n\n1 - Dinheiro\n2 - Pix\n3 - Débito\n4 - Crédito\n5 - Cortesia\n6 - Outro\n\nDigite o número:',
        '2'
    );

    if (paymentChoice === null) return null;

    const finalPaymentMethod = paymentMap[String(paymentChoice).trim()];

    if (!finalPaymentMethod) {
        alert('Forma de pagamento inválida.');
        return null;
    }

    const finalTotalText = window.prompt(
        'Valor final recebido:\n\nExemplo: 45,00',
        ''
    );

    if (finalTotalText === null) return null;

    const finalTotal = Number(normalizeMoneyInput(finalTotalText));

    if (!Number.isFinite(finalTotal) || finalTotal < 0) {
        alert('Valor final inválido.');
        return null;
    }

    const adminNotes = window.prompt(
        'Observação interna, se tiver:',
        ''
    );

    if (adminNotes === null) return null;

    return {
        final_payment_method: finalPaymentMethod,
        final_total: finalTotal,
        admin_notes: adminNotes.trim()
    };
}

async function runAdminAction(appointmentId, action) {
    if (state.isActionLoading) return;

    const actionLabel = getActionLabel(action);
    let extraPayload = {};

    if (action === 'complete') {
        const completionPayload = getCompletionPayload();

        if (!completionPayload) return;

        extraPayload = completionPayload;
    } else {
        const confirmed = window.confirm(`Tem certeza que deseja ${actionLabel} esta reserva?`);

        if (!confirmed) return;
    }

    state.isActionLoading = true;
    setLoadStatus('Atualizando reserva...');

    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-reserva', {
            body: {
                appointment_id: appointmentId,
                action,
                ...extraPayload
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


function setBusinessHoursStatus(message, isError = false) {
    if (!businessHoursStatus) return;

    businessHoursStatus.textContent = message || '';
    businessHoursStatus.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
}

function formatTimeInputValue(value) {
    if (!value) return '';
    return String(value).slice(0, 5);
}

async function loadBusinessHours() {
    if (!businessHoursList) return;

    businessHoursList.innerHTML = '<div class="empty-state">Carregando horários...</div>';
    setBusinessHoursStatus('');

    const { data, error } = await supabaseClient
        .from('business_hours')
        .select('weekday, weekday_name, is_open, opening_time, closing_time, has_lunch_break, lunch_start, lunch_end, slot_duration_minutes')
        .order('weekday', { ascending: true });

    if (error) {
        console.error(error);
        businessHoursList.innerHTML = `<div class="empty-state">Erro ao carregar horários: ${escapeHtml(error.message)}</div>`;
        return;
    }

    state.businessHours = Array.isArray(data) ? data : [];
    renderBusinessHours();
}

function renderBusinessHours() {
    if (!businessHoursList) return;

    if (!state.businessHours.length) {
        businessHoursList.innerHTML = '<div class="empty-state">Nenhum horário cadastrado.</div>';
        return;
    }

    businessHoursList.innerHTML = state.businessHours.map((item) => {
        const closedClass = item.is_open ? '' : 'closed-day';

        return `
            <article class="business-hour-item ${closedClass}" data-weekday="${Number(item.weekday)}">
                <div class="business-hour-day">
                    <strong>${escapeHtml(item.weekday_name)}</strong>

                    <label class="business-hour-open">
                        <input type="checkbox" data-hour-field="is_open" ${item.is_open ? 'checked' : ''}>
                        <span>Aberto neste dia</span>
                    </label>
                </div>

                <div class="business-hour-field">
                    <label>Abertura</label>
                    <input type="time" data-hour-field="opening_time" value="${escapeHtml(formatTimeInputValue(item.opening_time))}">
                </div>

                <div class="business-hour-field">
                    <label>Fechamento</label>
                    <input type="time" data-hour-field="closing_time" value="${escapeHtml(formatTimeInputValue(item.closing_time))}">
                </div>

                <label class="business-hour-lunch">
                    <input type="checkbox" data-hour-field="has_lunch_break" ${item.has_lunch_break ? 'checked' : ''}>
                    <span>Pausa</span>
                </label>

                <div class="business-hour-field">
                    <label>Início pausa</label>
                    <input type="time" data-hour-field="lunch_start" value="${escapeHtml(formatTimeInputValue(item.lunch_start))}">
                </div>

                <div class="business-hour-field">
                    <label>Fim pausa</label>
                    <input type="time" data-hour-field="lunch_end" value="${escapeHtml(formatTimeInputValue(item.lunch_end))}">
                </div>

                <div class="business-hour-field">
                    <label>Duração</label>
                    <input type="number" min="1" step="1" data-hour-field="slot_duration_minutes" value="${Number(item.slot_duration_minutes || 45)}">
                </div>

                <button class="business-hour-save" type="button" data-hour-action="save">
                    Salvar
                </button>
            </article>
        `;
    }).join('');
}

function getBusinessHourPayload(row) {
    const isOpenInput = row.querySelector('[data-hour-field="is_open"]');
    const openingInput = row.querySelector('[data-hour-field="opening_time"]');
    const closingInput = row.querySelector('[data-hour-field="closing_time"]');
    const hasLunchInput = row.querySelector('[data-hour-field="has_lunch_break"]');
    const lunchStartInput = row.querySelector('[data-hour-field="lunch_start"]');
    const lunchEndInput = row.querySelector('[data-hour-field="lunch_end"]');
    const durationInput = row.querySelector('[data-hour-field="slot_duration_minutes"]');

    const openingTime = openingInput.value;
    const closingTime = closingInput.value;
    const lunchStart = lunchStartInput.value;
    const lunchEnd = lunchEndInput.value;
    const duration = Number(durationInput.value);

    if (!openingTime || !closingTime) {
        throw new Error('Informe abertura e fechamento.');
    }

    if (openingTime >= closingTime) {
        throw new Error('A abertura precisa ser antes do fechamento.');
    }

    if (hasLunchInput.checked) {
        if (!lunchStart || !lunchEnd) {
            throw new Error('Informe início e fim da pausa.');
        }

        if (lunchStart >= lunchEnd) {
            throw new Error('O início da pausa precisa ser antes do fim.');
        }
    }

    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Informe uma duração válida.');
    }

    return {
        is_open: isOpenInput.checked,
        opening_time: openingTime,
        closing_time: closingTime,
        has_lunch_break: hasLunchInput.checked,
        lunch_start: lunchStart || '12:00',
        lunch_end: lunchEnd || '13:00',
        slot_duration_minutes: Math.round(duration)
    };
}

async function saveBusinessHour(row) {
    const weekday = Number(row.dataset.weekday);

    if (!Number.isInteger(weekday)) return;

    setBusinessHoursStatus('Salvando horário...');

    try {
        const payload = getBusinessHourPayload(row);

        const { error } = await supabaseClient
            .from('business_hours')
            .update(payload)
            .eq('weekday', weekday);

        if (error) throw error;

        setBusinessHoursStatus('Horário atualizado com sucesso.');
        await loadBusinessHours();
    } catch (error) {
        console.error(error);
        setBusinessHoursStatus(error.message || 'Erro ao salvar horário.', true);
    }
}


function setProfileStatus(message, isError = false) {
    if (!profileStatus) return;

    profileStatus.textContent = message || '';
    profileStatus.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
}

async function loadBarbershopProfileAdmin() {
    if (!profileForm) return;

    setProfileStatus('Carregando dados...');

    const { data, error } = await supabaseClient
        .from('barbershop_profile')
        .select(`
            id,
            name,
            subtitle,
            hero_title,
            hero_description,
            logo_url,
            instagram_url,
            whatsapp_number,
            pix_key,
            address,
            city,
            payment_pix_enabled,
            payment_card_enabled,
            payment_onsite_enabled,
            is_active
        `)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        setProfileStatus(error.message || 'Erro ao carregar dados.', true);
        return;
    }

    if (!data) {
        setProfileStatus('Nenhum perfil ativo encontrado.', true);
        return;
    }

    state.profile = data;
    fillProfileForm(data);
    setProfileStatus('');
}

function fillProfileForm(profile) {
    profileIdInput.value = profile.id || '';
    profileNameInput.value = profile.name || '';
    profileSubtitleInput.value = profile.subtitle || '';
    profileLogoUrlInput.value = profile.logo_url || '';
    profileInstagramUrlInput.value = profile.instagram_url || '';
    profileWhatsappNumberInput.value = profile.whatsapp_number || '';
    profilePixKeyInput.value = profile.pix_key || '';
    profileAddressInput.value = profile.address || '';
    profileCityInput.value = profile.city || '';
    profileHeroTitleInput.value = profile.hero_title || '';
    profileHeroDescriptionInput.value = profile.hero_description || '';
    profilePaymentPixInput.checked = profile.payment_pix_enabled !== false;
    profilePaymentCardInput.checked = profile.payment_card_enabled !== false;
    profilePaymentOnsiteInput.checked = profile.payment_onsite_enabled !== false;
}

function getProfilePayloadFromForm() {
    const name = profileNameInput.value.trim();

    if (!name) {
        throw new Error('Informe o nome da barbearia.');
    }

    return {
        name,
        subtitle: profileSubtitleInput.value.trim() || null,
        logo_url: profileLogoUrlInput.value.trim() || null,
        instagram_url: profileInstagramUrlInput.value.trim() || null,
        whatsapp_number: profileWhatsappNumberInput.value.trim() || null,
        pix_key: profilePixKeyInput.value.trim() || null,
        address: profileAddressInput.value.trim() || null,
        city: profileCityInput.value.trim() || null,
        hero_title: profileHeroTitleInput.value.trim() || null,
        hero_description: profileHeroDescriptionInput.value.trim() || null,
        payment_pix_enabled: profilePaymentPixInput.checked,
        payment_card_enabled: profilePaymentCardInput.checked,
        payment_onsite_enabled: profilePaymentOnsiteInput.checked
    };
}

async function saveBarbershopProfile(event) {
    event.preventDefault();

    if (!profileForm) return;

    const profileId = profileIdInput.value.trim();

    if (!profileId) {
        setProfileStatus('Perfil não carregado. Clique em Atualizar dados.', true);
        return;
    }

    profileSubmitBtn.disabled = true;
    profileSubmitBtn.textContent = 'Salvando...';
    setProfileStatus('');

    try {
        const payload = getProfilePayloadFromForm();

        const { error } = await supabaseClient
            .from('barbershop_profile')
            .update(payload)
            .eq('id', profileId);

        if (error) throw error;

        setProfileStatus('Dados da barbearia atualizados com sucesso.');
        await loadBarbershopProfileAdmin(),
            loadProfessionals();
    } catch (error) {
        console.error(error);
        setProfileStatus(error.message || 'Erro ao salvar dados.', true);
    } finally {
        profileSubmitBtn.disabled = false;
        profileSubmitBtn.textContent = 'Salvar dados';
    }
}


function setProfessionalsStatus(message, isError = false) {
    if (!professionalsStatus) return;

    professionalsStatus.textContent = message || '';
    professionalsStatus.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
}

async function loadProfessionals() {
    if (!professionalsAdminList) return;

    professionalsAdminList.innerHTML = '<div class="empty-state">Carregando profissionais...</div>';
    setProfessionalsStatus('');

    const { data, error } = await supabaseClient
        .from('professionals')
        .select('id, name, phone, email, commission_percent, is_active, sort_order, notes, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error(error);
        professionalsAdminList.innerHTML = `<div class="empty-state">Erro ao carregar profissionais: ${escapeHtml(error.message)}</div>`;
        return;
    }

    state.professionals = Array.isArray(data) ? data : [];
    state.professionalsById = Object.fromEntries(
        state.professionals.map((professional) => [professional.id, professional])
    );
    renderProfessionals();
}

function renderProfessionals() {
    if (!professionalsAdminList) return;

    if (!state.professionals.length) {
        professionalsAdminList.innerHTML = '<div class="empty-state">Nenhum profissional cadastrado.</div>';
        return;
    }

    professionalsAdminList.innerHTML = state.professionals.map((professional) => {
        const statusClass = professional.is_active ? 'professional-status-active' : 'professional-status-inactive';
        const statusText = professional.is_active ? 'Ativo' : 'Inativo';
        const commission = Number(professional.commission_percent || 0).toFixed(2).replace('.', ',');

        return `
            <article class="admin-professional-item">
                <div class="admin-professional-info">
                    <strong>${escapeHtml(professional.name)}</strong>
                    <span>Comissão: ${commission}% • Ordem ${Number(professional.sort_order || 0)}</span>
                    ${professional.phone ? `<span>WhatsApp: ${escapeHtml(professional.phone)}</span>` : ''}
                    ${professional.email ? `<span>Email: ${escapeHtml(professional.email)}</span>` : ''}
                    <span class="${statusClass}">${statusText}</span>
                    ${professional.notes ? `<span>${escapeHtml(professional.notes)}</span>` : ''}
                </div>

                <div class="admin-professional-actions">
                    <button type="button" data-professional-action="edit" data-id="${escapeHtml(professional.id)}">Editar</button>
                    <button type="button" data-professional-action="toggle" data-id="${escapeHtml(professional.id)}">
                        ${professional.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

function resetProfessionalForm() {
    if (!professionalForm) return;

    professionalForm.reset();

    professionalIdInput.value = '';
    professionalCommissionInput.value = '0';
    professionalSortInput.value = '0';
    professionalActiveInput.checked = true;
    professionalFormTitle.textContent = 'Novo profissional';
    professionalSubmitBtn.textContent = 'Salvar profissional';
    setProfessionalsStatus('');
}

function fillProfessionalForm(professional) {
    professionalIdInput.value = professional.id || '';
    professionalNameInput.value = professional.name || '';
    professionalPhoneInput.value = professional.phone || '';
    professionalEmailInput.value = professional.email || '';
    professionalCommissionInput.value = Number(professional.commission_percent || 0);
    professionalSortInput.value = Number(professional.sort_order || 0);
    professionalNotesInput.value = professional.notes || '';
    professionalActiveInput.checked = Boolean(professional.is_active);

    professionalFormTitle.textContent = 'Editar profissional';
    professionalSubmitBtn.textContent = 'Salvar alterações';
    setProfessionalsStatus('Editando profissional selecionado.');

    professionalForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getProfessionalPayloadFromForm() {
    const name = professionalNameInput.value.trim();
    const commission = Number(professionalCommissionInput.value);
    const sortOrder = Number(professionalSortInput.value || 0);

    if (!name) {
        throw new Error('Informe o nome do profissional.');
    }

    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
        throw new Error('Informe uma comissão entre 0 e 100.');
    }

    return {
        name,
        phone: professionalPhoneInput.value.trim() || null,
        email: professionalEmailInput.value.trim() || null,
        commission_percent: commission,
        sort_order: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
        notes: professionalNotesInput.value.trim() || null,
        is_active: professionalActiveInput.checked
    };
}

async function saveProfessional(event) {
    event.preventDefault();

    if (!professionalForm) return;

    professionalSubmitBtn.disabled = true;
    professionalSubmitBtn.textContent = 'Salvando...';
    setProfessionalsStatus('');

    try {
        const professionalId = professionalIdInput.value.trim();
        const payload = getProfessionalPayloadFromForm();

        if (professionalId) {
            const { error } = await supabaseClient
                .from('professionals')
                .update(payload)
                .eq('id', professionalId);

            if (error) throw error;

            setProfessionalsStatus('Profissional atualizado com sucesso.');
        } else {
            const { error } = await supabaseClient
                .from('professionals')
                .insert(payload);

            if (error) throw error;

            setProfessionalsStatus('Profissional criado com sucesso.');
        }

        resetProfessionalForm();
        await loadProfessionals();
    } catch (error) {
        console.error(error);
        setProfessionalsStatus(error.message || 'Erro ao salvar profissional.', true);
    } finally {
        professionalSubmitBtn.disabled = false;
        professionalSubmitBtn.textContent = professionalIdInput.value ? 'Salvar alterações' : 'Salvar profissional';
    }
}

async function toggleProfessionalActive(professionalId) {
    const professional = state.professionals.find((item) => item.id === professionalId);

    if (!professional) return;

    const nextActive = !professional.is_active;
    const actionText = nextActive ? 'ativar' : 'desativar';

    const confirmed = window.confirm(`Tem certeza que deseja ${actionText} este profissional?`);

    if (!confirmed) return;

    setProfessionalsStatus('Atualizando profissional...');

    const { error } = await supabaseClient
        .from('professionals')
        .update({ is_active: nextActive })
        .eq('id', professionalId);

    if (error) {
        console.error(error);
        setProfessionalsStatus(error.message || 'Erro ao atualizar profissional.', true);
        return;
    }

    setProfessionalsStatus(nextActive ? 'Profissional ativado.' : 'Profissional desativado.');
    await loadProfessionals();
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

        await loadProfessionals();

        await loadProfessionals();

        await Promise.all([
            loadAppointments(),
            loadAdminServices(),
            loadBusinessHours(),
            loadBarbershopProfileAdmin()
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

        await loadProfessionals();

        await loadProfessionals();

        await Promise.all([
            loadAppointments(),
            loadAdminServices(),
            loadBusinessHours(),
            loadBarbershopProfileAdmin()
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
    state.businessHours = [];
    state.profile = null;
    state.professionals = [];
    state.professionalsById = {};

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

refreshBusinessHoursBtn?.addEventListener('click', loadBusinessHours);

refreshProfileBtn?.addEventListener('click', loadBarbershopProfileAdmin);

profileForm?.addEventListener('submit', saveBarbershopProfile);

refreshProfessionalsBtn?.addEventListener('click', loadProfessionals);

professionalForm?.addEventListener('submit', saveProfessional);

professionalCancelEditBtn?.addEventListener('click', resetProfessionalForm);

professionalsAdminList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-professional-action][data-id]');

    if (!button) return;

    const professionalId = button.dataset.id;
    const action = button.dataset.professionalAction;

    if (action === 'edit') {
        const professional = state.professionals.find((item) => item.id === professionalId);
        if (professional) fillProfessionalForm(professional);
        return;
    }

    if (action === 'toggle') {
        await toggleProfessionalActive(professionalId);
    }
});

businessHoursList?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-hour-action="save"]');

    if (!button) return;

    const row = button.closest('.business-hour-item');

    if (!row) return;

    await saveBusinessHour(row);
});

businessHoursList?.addEventListener('change', (event) => {
    const row = event.target.closest('.business-hour-item');

    if (!row) return;

    const isOpenInput = row.querySelector('[data-hour-field="is_open"]');

    row.classList.toggle('closed-day', !isOpenInput.checked);
});

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
