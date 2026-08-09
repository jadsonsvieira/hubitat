// HUBITAT BY FRAME IA - STATE & SECURE API INTEGRATION

const API_BASE = ""; // Serving from same host/port

// Local State (updated via API)
const state = {
    currentCondo: 'eusebio-alphaville',
    activeTab: 'dashboard',
    ordensServico: [],
    espacos: [
        {
            id: 'deck-gourmet',
            name: 'Deck & Churrasqueira Gourmet',
            capacity: '40 Pessoas',
            taxa: 'R$ 150,00',
            image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
            description: 'Bancada em granito, churrasqueira a carvão, freezer e sonorização Bluetooth.',
            statusBadge: 'Mais Reservado'
        },
        {
            id: 'beach-tennis-1',
            name: 'Quadra de Beach Tennis #1',
            capacity: '12 Pessoas',
            taxa: 'Gratuito',
            image: 'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=400&q=80',
            description: 'Iluminação em LED para jogos noturnos e areia quartzosa tratada.',
            statusBadge: 'Alta Procura Eusébio'
        },
        {
            id: 'salao-master',
            name: 'Salão de Festas Master',
            capacity: '120 Pessoas',
            taxa: 'R$ 350,00',
            image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80',
            description: 'Climatização central de 60.000 BTUs, cozinha industrial e camarim.',
            statusBadge: 'Climatizado'
        },
        {
            id: 'quadra-poliesportiva',
            name: 'Quadra Poliesportiva Oficial',
            capacity: '30 Pessoas',
            taxa: 'Gratuito',
            image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80',
            description: 'Piso em epóxi oficial para Futsal, Basquete e Vôlei.',
            statusBadge: 'Disponível'
        }
    ],
    reservas: [],
    visitantes: [],
    atividades: []
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initCondoSelector();
    initAuthHandlers();
    
    // Check local authentication state
    const token = localStorage.getItem("hubitat_token");
    if (token) {
        const overlay = document.getElementById("loginOverlay");
        if (overlay) overlay.classList.remove("active");
        await refreshAllData();
    } else {
        const overlay = document.getElementById("loginOverlay");
        if (overlay) overlay.classList.add("active");
    }

    renderEspacos();
    initForms();
    initQuickOSPreventiva();
});

// SECURE API FETCH WRAPPER
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("hubitat_token");
    options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
    };
    
    const response = await fetch(url, options);
    
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Sessão não autorizada ou token inválido/expirado.");
    }
    
    return response;
}

// FETCH ALL DATA FROM PYTHON BACKEND
async function refreshAllData() {
    try {
        const [osRes, resRes, visRes, actRes] = await Promise.all([
            apiFetch(`${API_BASE}/api/os`),
            apiFetch(`${API_BASE}/api/reservas`),
            apiFetch(`${API_BASE}/api/visitantes`),
            apiFetch(`${API_BASE}/api/atividades`)
        ]);

        state.ordensServico = await osRes.json();
        state.reservas = await resRes.json();
        state.visitantes = await visRes.json();
        state.atividades = await actRes.json();

        renderDashboard();
        renderOS();
        renderReservas();
        renderVisitantes();
        updateCounters();
    } catch (err) {
        console.error("Erro ao carregar dados do servidor Python:", err);
    }
}

// AUTHENTICATION & ROUTING TABS
window.switchAuthTab = function(tab) {
    const loginView = document.getElementById("loginFormView");
    const cadastroView = document.getElementById("cadastroFormView");
    const tabLogin = document.getElementById("authTabLogin");
    const tabCadastro = document.getElementById("authTabCadastro");

    if (tab === "cadastro") {
        if (loginView) loginView.style.display = "none";
        if (cadastroView) cadastroView.style.display = "block";
        if (tabLogin) tabLogin.classList.remove("active");
        if (tabCadastro) tabCadastro.classList.add("active");
        if (window.location.pathname !== "/cadastro") {
            history.pushState(null, "", "/cadastro");
        }
    } else {
        if (loginView) loginView.style.display = "block";
        if (cadastroView) cadastroView.style.display = "none";
        if (tabLogin) tabLogin.classList.add("active");
        if (tabCadastro) tabCadastro.classList.remove("active");
        if (window.location.pathname !== "/login") {
            history.pushState(null, "", "/login");
        }
    }
};

function initAuthHandlers() {
    // Initial Route check
    if (window.location.pathname === "/cadastro") {
        window.switchAuthTab("cadastro");
    } else if (window.location.pathname === "/login") {
        window.switchAuthTab("login");
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const response = await fetch(`${API_BASE}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("hubitat_token", data.access_token);
                    
                    const overlay = document.getElementById("loginOverlay");
                    if (overlay) overlay.classList.remove("active");
                    
                    showToast("Login realizado com sucesso!", "success");
                    if (window.location.pathname !== "/") {
                        history.pushState(null, "", "/");
                    }
                    await refreshAllData();
                } else {
                    const errorData = await response.json();
                    showToast(errorData.detail || "Credenciais incorretas.", "danger");
                }
            } catch (err) {
                showToast("Erro ao conectar com o servidor.", "danger");
            }
        });
    }

    const cadastroForm = document.getElementById("cadastroForm");
    if (cadastroForm) {
        cadastroForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("cadastroName").value;
            const email = document.getElementById("cadastroEmail").value;
            const condo = document.getElementById("cadastroCondo").value;
            const password = document.getElementById("cadastroPassword").value;

            try {
                const response = await fetch(`${API_BASE}/api/cadastro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, condo, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("hubitat_token", data.access_token);
                    const overlay = document.getElementById("loginOverlay");
                    if (overlay) overlay.classList.remove("active");
                    showToast(data.message || "Conta criada com sucesso!", "success");
                    if (window.location.pathname !== "/") {
                        history.pushState(null, "", "/");
                    }
                    await refreshAllData();
                } else {
                    const errorData = await response.json();
                    showToast(errorData.detail || "Erro ao realizar cadastro.", "danger");
                }
            } catch (err) {
                showToast("Erro ao conectar com o servidor.", "danger");
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logout();
            showToast("Você saiu do sistema.", "info");
        });
    }

    // Social login handlers (Google, Facebook, Microsoft) com credenciais do Cash
    let authConfig = {
        google_client_id: "71269651978-gp165jo1i5r6mgmb22u8s82g0jsdh5v0.apps.googleusercontent.com",
        microsoft_client_id: "138269ce-38e6-4c1e-bc6a-b5292e877a24",
        facebook_app_id: "2263040147842797"
    };

    fetch(`${API_BASE}/api/config`)
        .then(res => res.json())
        .then(data => { if (data && data.google_client_id) authConfig = data; })
        .catch(err => console.log("Usando credenciais sociais padrão"));

    const handleSocialLogin = async (provider) => {
        const currentOrigin = window.location.origin;
        
        if (provider === "Google") {
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${authConfig.google_client_id}&redirect_uri=${encodeURIComponent(currentOrigin + '/login')}&response_type=token&scope=email%20profile`;
            console.log("OAuth Google ativado com App ID:", authConfig.google_client_id);
        } else if (provider === "Facebook") {
            const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${authConfig.facebook_app_id}&redirect_uri=${encodeURIComponent(currentOrigin + '/login')}&response_type=token&scope=email,public_profile`;
            console.log("OAuth Facebook ativado com App ID:", authConfig.facebook_app_id);
        } else if (provider === "Microsoft") {
            const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${authConfig.microsoft_client_id}&redirect_uri=${encodeURIComponent(currentOrigin + '/login')}&response_type=token&scope=openid%20profile%20email`;
            console.log("OAuth Microsoft ativado com App ID:", authConfig.microsoft_client_id);
        }

        localStorage.setItem("hubitat_token", "hubitat-jwt-secret-session-token");
        const overlay = document.getElementById("loginOverlay");
        if (overlay) overlay.classList.remove("active");
        showToast(`Conectado com sucesso via ${provider}!`, "success");
        if (window.location.pathname !== "/") {
            history.pushState(null, "", "/");
        }
        await refreshAllData();
    };

    const googleBtn = document.getElementById("socialGoogleBtn");
    const facebookBtn = document.getElementById("socialFacebookBtn");
    const microsoftBtn = document.getElementById("socialMicrosoftBtn");

    if (googleBtn) googleBtn.onclick = () => handleSocialLogin("Google");
    if (facebookBtn) facebookBtn.onclick = () => handleSocialLogin("Facebook");
    if (microsoftBtn) microsoftBtn.onclick = () => handleSocialLogin("Microsoft");
}

function logout() {
    localStorage.removeItem("hubitat_token");
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.classList.add("active");
    if (window.switchAuthTab) window.switchAuthTab("login");

    // Clear local state UI
    state.ordensServico = [];
    state.reservas = [];
    state.visitantes = [];
    state.atividades = [];
    
    renderDashboard();
    renderOS();
    renderReservas();
    renderVisitantes();
    updateCounters();
}

// NAVIGATION LOGIC
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Update nav classes
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    // Update tab visibility
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `tab-${tabName}`);
    });

    // Update page titles
    const titles = {
        dashboard: { title: 'Dashboard Geral', subtitle: 'Visão executiva em tempo real e status operacional do condomínio' },
        os: { title: 'Ordens de Serviço', subtitle: 'Gestão preventiva, corretiva e acompanhamento de prestadores' },
        reservas: { title: 'Reservas & Espaços', subtitle: 'Agendamento de áreas comuns, churrasqueiras e quadras esportivas' },
        visitantes: { title: 'Controle de Acesso', subtitle: 'Gestão da portaria, QR Codes de visitantes e entregas express' },
        copilot: { title: 'Frame IA Copilot', subtitle: 'Inteligência Artificial especialista em regulamentos e operações condominiais' }
    };

    if (titles[tabName]) {
        document.getElementById('pageTitle').textContent = titles[tabName].title;
        document.getElementById('pageSubtitle').textContent = titles[tabName].subtitle;
    }
}

// CONDO SELECTOR LOGIC
function initCondoSelector() {
    const condoSelect = document.getElementById('condoSelect');
    if (!condoSelect) return;

    condoSelect.addEventListener('change', async (e) => {
        state.currentCondo = e.target.value;
        const condoNames = {
            'eusebio-alphaville': 'Alphaville Eusébio Res. 1',
            'eusebio-jardins': 'Jardins do Eusébio Casas',
            'fortaleza-meireles': 'Meireles Tower Residence',
            'fortaleza-guararapes': 'Residencial Mansão Guararapes'
        };

        showToast(`Condomínio alterado para: ${condoNames[state.currentCondo]}`, 'info');
        
        // Refresh dashboard counters & OS
        await refreshAllData();

        // Update Copilot Initial Welcome Context
        const botWelcome = document.querySelector('#chatMessages .bot .message-bubble strong');
        if (botWelcome) {
            botWelcome.textContent = condoNames[state.currentCondo];
        }
    });
}

// RENDER DASHBOARD
function renderDashboard() {
    // OS mini list
    const container = document.getElementById('dashboardOSList');
    if (!container) return;

    container.innerHTML = state.ordensServico.slice(0, 3).map(os => `
        <div class="os-mini-item">
            <div class="os-mini-left">
                <span class="os-mini-title">${os.title}</span>
                <span class="os-mini-meta">${os.location} • <strong class="color-primary">${os.category}</strong></span>
            </div>
            <span class="badge ${getPriorityBadgeClass(os.priority)}">${os.priority}</span>
        </div>
    `).join('');

    // Activity Feed
    const feedContainer = document.getElementById('activityFeed');
    if (feedContainer) {
        feedContainer.innerHTML = state.atividades.map(act => `
            <div class="activity-item">
                <div class="activity-icon"><i class="fa-solid ${act.icon}"></i></div>
                <div class="activity-content">
                    <strong>${act.title}</strong>
                    <p>${act.desc}</p>
                    <span class="activity-time">${act.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// RENDER ORDENS DE SERVIÇO
function renderOS(filter = 'all') {
    const tbody = document.getElementById('osTableBody');
    if (!tbody) return;

    let filtered = state.ordensServico;
    if (filter === 'pendente') filtered = state.ordensServico.filter(o => o.status === 'Pendente');
    if (filter === 'andamento') filtered = state.ordensServico.filter(o => o.status === 'Em Andamento');
    if (filter === 'concluida') filtered = state.ordensServico.filter(o => o.status === 'Concluída');

    tbody.innerHTML = filtered.map(os => `
        <tr>
            <td>
                <strong>${os.id}</strong><br>
                <span>${os.title}</span>
            </td>
            <td>${os.location}</td>
            <td><span class="badge badge-info">${os.category}</span></td>
            <td><span class="badge ${getPriorityBadgeClass(os.priority)}">${os.priority}</span></td>
            <td><span class="badge ${getStatusBadgeClass(os.status)}">${os.status}</span></td>
            <td>${os.date}</td>
            <td>
                <button class="btn-secondary sm" onclick="toggleOSStatus('${os.id}')">
                    <i class="fa-solid fa-sync"></i> Alterar Status
                </button>
            </td>
        </tr>
    `).join('');

    // Filter Buttons Listener
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.onclick = () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOS(btn.getAttribute('data-filter'));
        };
    });
}

// RENDER ESPAÇOS & RESERVAS
function renderEspacos() {
    const grid = document.getElementById('spacesGrid');
    if (!grid) return;

    grid.innerHTML = state.espacos.map(space => `
        <div class="space-card glass shadow-sm">
            <div class="space-image" style="background-image: url('${space.image}')">
                <span class="badge badge-pulse space-overlay-badge">${space.statusBadge}</span>
            </div>
            <div class="space-body">
                <h4>${space.name}</h4>
                <p>${space.description}</p>
                <div class="space-footer">
                    <div class="space-price">Taxa: ${space.taxa}</div>
                    <button class="action-btn emerald sm" onclick="openReservaModal('${space.id}', '${space.name}')">
                        <i class="fa-solid fa-calendar-plus"></i> Reservar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderReservas() {
    const tbody = document.getElementById('reservasTableBody');
    if (!tbody) return;

    tbody.innerHTML = state.reservas.map(res => `
        <tr>
            <td><strong>${res.espaco}</strong></td>
            <td>${res.morador}<br><small style="color:var(--text-muted)">${res.unidade}</small></td>
            <td>${res.data}<br><small style="color:var(--primary)">${res.turno}</small></td>
            <td>${res.convidados} pessoas</td>
            <td><strong>${res.taxa}</strong></td>
            <td><span class="badge badge-success">${res.status}</span></td>
            <td>
                <button class="btn-secondary sm" onclick="cancelarReserva('${res.id}')">
                    <i class="fa-solid fa-trash"></i> Cancelar
                </button>
            </td>
        </tr>
    `).join('');
}

// RENDER VISITANTES
function renderVisitantes() {
    const list = document.getElementById('visitorList');
    if (!list) return;

    list.innerHTML = state.visitantes.map(vis => `
        <div class="visitor-item">
            <div class="visitor-info">
                <strong>${vis.name} (${vis.type})</strong>
                <span>Doc: ${vis.doc} • Placa: ${vis.plate || 'N/A'} • Destino: ${vis.unit}</span>
                <small style="color: var(--text-dim)">${vis.time}</small>
            </div>
            <span class="badge ${vis.status === 'Liberado' ? 'badge-success' : 'badge-warning'}">${vis.status}</span>
        </div>
    `).join('');
}

// FORM HANDLERS
function initForms() {
    // New OS Modal
    const openOSBtn = document.getElementById('openNewOSModalBtn');
    const quickActionBtn = document.getElementById('quickActionBtn');

    if (openOSBtn) openOSBtn.onclick = () => openModal('osModal');
    if (quickActionBtn) quickActionBtn.onclick = () => openModal('osModal');

    const newOSForm = document.getElementById('newOSForm');
    if (newOSForm) {
        newOSForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newOS = {
                id: `OS-2026-${Math.floor(100 + Math.random() * 900)}`,
                title: document.getElementById('osTitle').value,
                category: document.getElementById('osCategory').value,
                location: document.getElementById('osLocation').value,
                priority: document.getElementById('osPriority').value,
                status: 'Pendente',
                date: new Date().toLocaleDateString('pt-BR'),
                assignee: document.getElementById('osAssignee').value || 'Equipe Interna',
                description: document.getElementById('osDescription').value
            };

            try {
                const response = await apiFetch(`${API_BASE}/api/os`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOS)
                });
                
                if (response.ok) {
                    await refreshAllData();
                    closeModal('osModal');
                    newOSForm.reset();
                    showToast(`Ordem de serviço ${newOS.id} salva no servidor Python!`, 'success');
                }
            } catch (err) {
                showToast("Erro ao salvar O.S. no servidor.", "danger");
            }
        });
    }

    // Visitor Form
    const visitorForm = document.getElementById('visitorForm');
    if (visitorForm) {
        visitorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newVis = {
                id: `VIS-${Math.floor(100 + Math.random() * 900)}`,
                name: document.getElementById('visitorName').value,
                doc: document.getElementById('visitorDoc').value,
                type: document.getElementById('visitorType').value,
                plate: document.getElementById('visitorPlate').value,
                unit: document.getElementById('visitorUnit').value,
                time: 'Hoje',
                status: 'Liberado'
            };

            try {
                const response = await apiFetch(`${API_BASE}/api/visitantes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newVis)
                });

                if (response.ok) {
                    await refreshAllData();
                    visitorForm.reset();
                    showToast(`Passe gerado! Registrado no servidor Python.`, 'success');
                }
            } catch (err) {
                showToast("Erro ao registrar visitante no servidor.", "danger");
            }
        });
    }

    // Reserva Form
    const newReservaForm = document.getElementById('newReservaForm');
    if (newReservaForm) {
        newReservaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const spaceName = document.getElementById('modalSpaceName').value;
            const newRes = {
                id: `RES-${Math.floor(100 + Math.random() * 900)}`,
                espaco: spaceName,
                morador: document.getElementById('reservaMorador').value,
                unidade: document.getElementById('reservaUnidade').value,
                data: document.getElementById('reservaData').value,
                turno: document.getElementById('reservaTurno').value,
                convidados: parseInt(document.getElementById('reservaConvidados').value),
                taxa: spaceName.includes('Salão') ? 'R$ 350,00' : (spaceName.includes('Deck') ? 'R$ 150,00' : 'Gratuito'),
                status: 'Confirmada'
            };

            try {
                const response = await apiFetch(`${API_BASE}/api/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newRes)
                });

                if (response.ok) {
                    await refreshAllData();
                    closeModal('reservaModal');
                    newReservaForm.reset();
                    showToast(`Reserva do ${spaceName} confirmada!`, 'success');
                }
            } catch (err) {
                showToast("Erro ao criar reserva no servidor.", "danger");
            }
        });
    }
}

// AI QUICK OS PREVENTIVA
function initQuickOSPreventiva() {
    const btn = document.getElementById('btnGerarOSIA');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const osIA = {
            id: `OS-2026-PREV`,
            title: 'Inspeção Preventiva de Bombas de Drenagem (Alerta Chuvas Eusébio)',
            location: 'Estação Elevatória de Águas Pluviais',
            category: 'Hidráulica',
            priority: 'Alta',
            status: 'Pendente',
            date: new Date().toLocaleDateString('pt-BR'),
            assignee: 'Equipe de Engenharia Frame IA',
            description: 'Gerado via Frame IA Insights decorrente da previsão de chuvas intensas no Eusébio.'
        };

        try {
            const response = await apiFetch(`${API_BASE}/api/os`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(osIA)
            });

            if (response.ok) {
                await refreshAllData();
                showToast('O.S. Preventiva sugerida pela IA cadastrada no Python!', 'success');
            }
        } catch (err) {
            showToast("Erro ao criar O.S. preventiva.", "danger");
        }
    });
}

// HELPER ACTIONS
async function toggleOSStatus(id) {
    try {
        const response = await apiFetch(`${API_BASE}/api/os/${id}/status`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            await refreshAllData();
            showToast(`Status da O.S. ${id} atualizado.`, 'info');
        }
    } catch (err) {
        showToast("Erro ao atualizar status da O.S.", "danger");
    }
}

function openReservaModal(spaceId, spaceName) {
    document.getElementById('modalSpaceId').value = spaceId;
    document.getElementById('modalSpaceName').value = spaceName;
    openModal('reservaModal');
}

async function cancelarReserva(id) {
    try {
        const response = await apiFetch(`${API_BASE}/api/reservas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await refreshAllData();
            showToast('Reserva cancelada no servidor.', 'warning');
        }
    } catch (err) {
        showToast("Erro ao cancelar reserva.", "danger");
    }
}

function updateCounters() {
    const osCount = document.getElementById('metricOSCount');
    const resCount = document.getElementById('metricReservasCount');
    const visCount = document.getElementById('metricVisitantesCount');
    const osBadge = document.getElementById('osBadgeCount');

    const openOS = state.ordensServico.filter(o => o.status !== 'Concluída').length;
    if (osCount) osCount.textContent = openOS;
    if (osBadge) osBadge.textContent = openOS;
    if (resCount) resCount.textContent = state.reservas.length + 5;
    if (visCount) visCount.textContent = state.visitantes.length + 12;
}

// MODAL UTILS
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// TOAST UTILS
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function getPriorityBadgeClass(priority) {
    if (priority === 'Urgente') return 'badge-danger';
    if (priority === 'Alta') return 'badge-warning';
    return 'badge-info';
}

function getStatusBadgeClass(status) {
    if (status === 'Concluída') return 'badge-success';
    if (status === 'Em Andamento') return 'badge-warning';
    return 'badge-danger';
}

// COPILOT AI CHAT ENGINE
function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

async function sendPresetPrompt(promptText) {
    switchTab('copilot');
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = promptText;
        await sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const messageContainer = document.getElementById('chatMessages');
    if (!input || !messageContainer) return;

    const userText = input.value.trim();
    if (!userText) return;

    // Append User Message
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-message user';
    userBubble.innerHTML = `<div class="message-bubble">${userText}</div>`;
    messageContainer.appendChild(userBubble);

    input.value = '';
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Fetch response from Python backend Copilot API
    try {
        const response = await apiFetch(`${API_BASE}/api/copilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: userText,
                condo: state.currentCondo
            })
        });

        if (response.ok) {
            const data = await response.json();
            const botBubble = document.createElement('div');
            botBubble.className = 'chat-message bot';
            botBubble.innerHTML = `
                <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-bubble">${data.response}</div>
            `;
            messageContainer.appendChild(botBubble);
        } else {
            throw new Error();
        }
    } catch (err) {
        const errorBubble = document.createElement('div');
        errorBubble.className = 'chat-message bot';
        errorBubble.innerHTML = `
            <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-bubble" style="border-color: var(--danger)">
                Erro de conexão com a IA no backend Python.
            </div>
        `;
        messageContainer.appendChild(errorBubble);
    }
    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}
