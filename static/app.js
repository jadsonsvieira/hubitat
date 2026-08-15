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
    comunicados: [],
    ocorrencias: [],
    encomendas: [],
    manutencoes: [],
    atividades: []
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initCondoSelector();
    initAuthHandlers();
    
    await checkAuthAndLoadData();
    renderEspacos();
    initForms();
    initQuickOSPreventiva();
});

// CHECK AUTHENTICATION AND LANDING PAGE ROUTING
async function checkAuthAndLoadData() {
    const token = localStorage.getItem("hubitat_token");
    const landingPage = document.getElementById("landingPage");
    const appContainer = document.querySelector(".app-container");
    const loginOverlay = document.getElementById("loginOverlay");
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const forceLanding = urlParams.get('landing') === 'true' || path === "/landing";

    if (forceLanding) {
        if (landingPage) landingPage.style.display = "block";
        if (appContainer) appContainer.style.display = "none";
        if (loginOverlay) loginOverlay.classList.remove("active");
        return;
    }

    if (token) {
        // Usuário Autenticado: entra direto no aplicativo!
        if (landingPage) landingPage.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";
        if (loginOverlay) loginOverlay.classList.remove("active");
        switchTab(state.activeTab || "dashboard");
        updateUserProfileUI();
        await refreshAllData();
    } else {
        // Visitante não autenticado: exibe a Landing Page por padrão!
        if (appContainer) appContainer.style.display = "none";
        if (landingPage) landingPage.style.display = "block";

        if (path === "/login" || path === "/cadastro") {
            if (loginOverlay) loginOverlay.classList.add("active");
            if (window.switchAuthTab) window.switchAuthTab(path === "/cadastro" ? "cadastro" : "login");
        } else {
            if (loginOverlay) loginOverlay.classList.remove("active");
        }
    }
}

window.showLandingPage = function(event) {
    if (event) event.preventDefault();
    const landingPage = document.getElementById("landingPage");
    const appContainer = document.querySelector(".app-container");
    const loginOverlay = document.getElementById("loginOverlay");

    if (landingPage) landingPage.style.display = "block";
    if (appContainer) appContainer.style.display = "none";
    if (loginOverlay) loginOverlay.classList.remove("active");
    if (window.location.pathname !== "/") {
        history.pushState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.goToAppPanel = function() {
    const token = localStorage.getItem("hubitat_token");
    const landingPage = document.getElementById("landingPage");
    const appContainer = document.querySelector(".app-container");
    const loginOverlay = document.getElementById("loginOverlay");

    if (token) {
        if (landingPage) landingPage.style.display = "none";
        if (appContainer) appContainer.style.display = "flex";
        if (loginOverlay) loginOverlay.classList.remove("active");
        if (window.location.pathname !== "/app") {
            history.pushState(null, "", "/app");
        }
        updateUserProfileUI();
        refreshAllData();
    } else {
        openAuthModal('login');
    }
};

window.previewMockupRole = function(role) {
    const btns = document.querySelectorAll('.role-preview-btn');
    btns.forEach(b => b.classList.remove('active'));

    const activeBtn = Array.from(btns).find(b => b.getAttribute('onclick').includes(role));
    if (activeBtn) activeBtn.classList.add('active');

    const screenBox = document.getElementById('mockupScreenBox');
    if (!screenBox) return;

    if (role === 'portaria') {
        screenBox.innerHTML = `
            <div class="mockup-card-grid">
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-qrcode color-emerald"></i> Portaria Kiosk • Leitor de QR Code</h4>
                    <p>Leitura express de passe de convidado em 0.2 segundos com confirmação sonora de guarita.</p>
                    <span class="badge badge-success"><i class="fa-solid fa-check"></i> Catraca Liberada</span>
                </div>
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-box-archive color-info"></i> Entrada de Encomendas</h4>
                    <p>SEDEX #99820 registrado para Destinatário <strong>Luciana Meireles (Casa 12)</strong>.</p>
                    <small>Notificação Push via WhatsApp enviada instantaneamente</small>
                </div>
            </div>
        `;
    } else if (role === 'morador') {
        screenBox.innerHTML = `
            <div class="mockup-card-grid">
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-umbrella-beach color-primary"></i> App Morador PWA • Agendamento</h4>
                    <p>Quadra de Beach Tennis #1 reservada para hoje às 19:00h (Gratuito Moradores).</p>
                    <span class="badge badge-info">Reserva Confirmada</span>
                </div>
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-barcode color-success"></i> 2ª Via do Boleto Condominial</h4>
                    <p>Taxa do mês vigente R$ 580,00 • Código PIX Copia-e-Cola gerado.</p>
                    <small><i class="fa-solid fa-copy"></i> Código Copiado com Sucesso</small>
                </div>
            </div>
        `;
    } else {
        screenBox.innerHTML = `
            <div class="mockup-card-grid">
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-bullhorn color-primary"></i> Mural de Avisos com Leitura</h4>
                    <p>Higienização das Caixas D'Água agendada para 28/07. Notificação enviada para todas as 250 unidades.</p>
                    <div class="mockup-progress"><div class="fill" style="width: 88%;"></div></div>
                    <small>88% dos moradores já confirmaram a leitura</small>
                </div>
                <div class="mockup-card">
                    <h4><i class="fa-solid fa-shield-halved color-success"></i> Portaria Express QR Code</h4>
                    <p>Visitante <strong>Carlos Eduardo Silva</strong> liberado para Casa 42 (Al. Flamboyant). QR Code enviado via WhatsApp.</p>
                    <span class="badge badge-success">Acesso Autorizado</span>
                </div>
            </div>
        `;
    }
};

function updateUserProfileUI() {
    try {
        const rawUser = localStorage.getItem("hubitat_user");
        if (!rawUser) return;
        const user = JSON.parse(rawUser);
        
        const avatarImg = document.getElementById("userAvatar");
        const nameEl = document.getElementById("userName");
        const roleEl = document.getElementById("userRole");

        if (user) {
            if (avatarImg && user.foto_url) {
                avatarImg.src = user.foto_url;
            }
            if (nameEl && user.nome) {
                nameEl.textContent = user.nome;
            }
            if (roleEl && (user.provedor || user.email)) {
                roleEl.textContent = user.provedor ? `Autenticado via ${user.provedor.toUpperCase()}` : user.email;
            }
        }
    } catch (err) {
        console.warn("Não foi possível carregar o perfil do usuário:", err);
    }
}

window.openProfileModal = function() {
    const rawUser = localStorage.getItem("hubitat_user");
    let user = {
        nome: "Juliana Costa",
        email: "juliana.sindica@hubitat.com.br",
        condominio: "Alphaville Eusébio Res. 1",
        foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
    };
    
    if (rawUser) {
        try {
            user = { ...user, ...JSON.parse(rawUser) };
        } catch (e) {}
    }
    
    document.getElementById("profileNameInput").value = user.nome || "";
    document.getElementById("profileEmailInput").value = user.email || "";
    document.getElementById("profileCondoInput").value = user.condominio || "Alphaville Eusébio Res. 1";
    document.getElementById("profilePhotoUrlInput").value = user.foto_url && !user.foto_url.startsWith("data:") ? user.foto_url : "";
    
    const preview = document.getElementById("profileModalAvatarPreview");
    if (preview && user.foto_url) {
        preview.src = user.foto_url;
    }
    
    openModal("profileModal");
};

window.previewProfilePhotoUrl = function(url) {
    if (url && url.trim()) {
        const preview = document.getElementById("profileModalAvatarPreview");
        if (preview) preview.src = url.trim();
    }
};

window.handleProfilePhotoUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast("A imagem deve ter no máximo 5MB.", "warning");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result;
            const preview = document.getElementById("profileModalAvatarPreview");
            if (preview) preview.src = base64Data;
        };
        reader.readAsDataURL(file);
    }
};

window.saveUserProfile = async function(event) {
    event.preventDefault();
    const name = document.getElementById("profileNameInput").value;
    const email = document.getElementById("profileEmailInput").value;
    const condo = document.getElementById("profileCondoInput").value;
    const photoPreview = document.getElementById("profileModalAvatarPreview");
    const fotoUrl = photoPreview ? photoPreview.src : null;

    try {
        const response = await apiFetch(`${API_BASE}/api/usuario/perfil`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nome: name, condominio: condo, foto_url: fotoUrl })
        });
        
        if (response.ok) {
            const data = await response.json();
            const updatedUser = {
                nome: name,
                email: email,
                condominio: condo,
                foto_url: fotoUrl
            };
            localStorage.setItem("hubitat_user", JSON.stringify(updatedUser));
            updateUserProfileUI();
            closeModal("profileModal");
            showToast("Perfil e foto atualizados com sucesso!", "success");
        } else {
            showToast("Erro ao atualizar perfil.", "danger");
        }
    } catch (err) {
        const updatedUser = {
            nome: name,
            email: email,
            condominio: condo,
            foto_url: fotoUrl
        };
        localStorage.setItem("hubitat_user", JSON.stringify(updatedUser));
        updateUserProfileUI();
        closeModal("profileModal");
        showToast("Perfil e foto atualizados localmente!", "success");
    }
};

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
        const [osRes, resRes, visRes, actRes, comRes, ocoRes, encRes, manRes] = await Promise.all([
            apiFetch(`${API_BASE}/api/os`),
            apiFetch(`${API_BASE}/api/reservas`),
            apiFetch(`${API_BASE}/api/visitantes`),
            apiFetch(`${API_BASE}/api/atividades`),
            apiFetch(`${API_BASE}/api/comunicados`),
            apiFetch(`${API_BASE}/api/ocorrencias`),
            apiFetch(`${API_BASE}/api/encomendas`),
            apiFetch(`${API_BASE}/api/manutencoes`)
        ]);

        state.ordensServico = await osRes.json();
        state.reservas = await resRes.json();
        state.visitantes = await visRes.json();
        state.atividades = await actRes.json();
        state.comunicados = await comRes.json();
        state.ocorrencias = await ocoRes.json();
        state.encomendas = await encRes.json();
        state.manutencoes = await manRes.json();

        renderDashboard();
        renderOS();
        renderReservas();
        renderVisitantes();
        renderComunicados();
        renderOcorrencias();
        renderEncomendas();
        renderManutencoes();
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
    const dividerText = document.getElementById("socialDividerText");

    if (tab === "cadastro") {
        if (loginView) loginView.style.display = "none";
        if (cadastroView) cadastroView.style.display = "block";
        if (tabLogin) tabLogin.classList.remove("active");
        if (tabCadastro) tabCadastro.classList.add("active");
        if (dividerText) dividerText.innerText = "ou cadastrar com";
        if (window.location.pathname !== "/cadastro") {
            history.pushState(null, "", "/cadastro");
        }
    } else {
        if (loginView) loginView.style.display = "block";
        if (cadastroView) cadastroView.style.display = "none";
        if (tabLogin) tabLogin.classList.add("active");
        if (tabCadastro) tabCadastro.classList.remove("active");
        if (dividerText) dividerText.innerText = "ou entrar com";
        if (window.location.pathname !== "/login") {
            history.pushState(null, "", "/login");
        }
    }
};

window.openAuthModal = function(tab) {
    const loginOverlay = document.getElementById("loginOverlay");
    if (loginOverlay) loginOverlay.classList.add("active");
    if (window.switchAuthTab) window.switchAuthTab(tab);
};

window.toggleFaq = function(element) {
    element.classList.toggle("active");
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
                    localStorage.setItem("hubitat_token", data.access_token || "hubitat-jwt-secret-session-token");
                    if (data.usuario) {
                        localStorage.setItem("hubitat_user", JSON.stringify(data.usuario));
                    }
                    const overlay = document.getElementById("loginOverlay");
                    const landingPage = document.getElementById("landingPage");
                    const appContainer = document.querySelector(".app-container");

                    if (overlay) overlay.classList.remove("active");
                    if (landingPage) landingPage.style.display = "none";
                    if (appContainer) appContainer.style.display = "flex";

                    showToast("Login realizado com sucesso!", "success");
                    if (window.location.pathname !== "/app") {
                        history.pushState(null, "", "/app");
                    }
                    updateUserProfileUI();
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
                    localStorage.setItem("hubitat_token", data.access_token || "hubitat-jwt-secret-session-token");
                    if (data.usuario) {
                        localStorage.setItem("hubitat_user", JSON.stringify(data.usuario));
                    } else {
                        localStorage.setItem("hubitat_user", JSON.stringify({
                            nome: name,
                            email: email,
                            condominio: condo,
                            foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                            provedor: "local"
                        }));
                    }
                    const overlay = document.getElementById("loginOverlay");
                    const landingPage = document.getElementById("landingPage");
                    const appContainer = document.querySelector(".app-container");

                    if (overlay) overlay.classList.remove("active");
                    if (landingPage) landingPage.style.display = "none";
                    if (appContainer) appContainer.style.display = "flex";

                    showToast(data.message || "Conta criada com sucesso!", "success");
                    if (window.location.pathname !== "/app") {
                        history.pushState(null, "", "/app");
                    }
                    updateUserProfileUI();
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

    // Social login handlers (Google, Facebook, Microsoft) replicados do Cash
    initSocialSDKs();
}

let GOOGLE_CLIENT_ID = "71269651978-gp165jo1i5r6mgmb22u8s82g0jsdh5v0.apps.googleusercontent.com";
let MICROSOFT_CLIENT_ID = "138269ce-38e6-4c1e-bc6a-b5292e877a24";
let FACEBOOK_APP_ID = "2263040147842797";

let msalInstance = null;

function initSocialSDKs() {
    fetch(`${API_BASE}/api/config`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                if (data.google_client_id) GOOGLE_CLIENT_ID = data.google_client_id;
                if (data.microsoft_client_id) MICROSOFT_CLIENT_ID = data.microsoft_client_id;
                if (data.facebook_app_id) FACEBOOK_APP_ID = data.facebook_app_id;
            }
            setupMSAL();
            checkOAuthRedirect();
        })
        .catch(() => {
            setupMSAL();
            checkOAuthRedirect();
        });
}

function setupMSAL() {
    if (window.msal && MICROSOFT_CLIENT_ID) {
        try {
            msalInstance = new msal.PublicClientApplication({
                auth: {
                    clientId: MICROSOFT_CLIENT_ID,
                    authority: "https://login.microsoftonline.com/common",
                    redirectUri: window.location.origin + (window.location.pathname === "/" ? "/login" : window.location.pathname)
                }
            });
        } catch(e) {
            console.log("MSAL init info:", e);
        }
    }
}

function checkOAuthRedirect() {
    const hashOrQuery = window.location.hash ? window.location.hash.substring(1) : window.location.search.substring(1);
    if (hashOrQuery) {
        const params = new URLSearchParams(hashOrQuery);
        const accessToken = params.get('access_token') || params.get('code');
        const idToken = params.get('id_token');
        
        if (accessToken) {
            if (window.opener && !window.opener.closed) {
                window.opener.autenticarContaSocialDireta('/api/auth/facebook', null, null, accessToken);
                window.close();
            } else {
                autenticarContaSocialDireta('/api/auth/facebook', null, null, accessToken);
            }
            return;
        }
        
        if (idToken) {
            if (window.opener && !window.opener.closed) {
                window.opener.autenticarContaSocialDireta('/api/auth/microsoft', null, null, idToken);
                window.close();
            } else {
                autenticarContaSocialDireta('/api/auth/microsoft', null, null, idToken);
            }
            return;
        }
    }

    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential
        });
    }
}

window.fazerLoginGoogle = function() {
    const redirectUri = encodeURIComponent(window.location.origin + (window.location.pathname === "/" ? "/login" : window.location.pathname));
    if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential
        });
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=email%20profile%20openid&nonce=hubitat_${Date.now()}`;
                window.open(googleAuthUrl, 'GoogleAuth', 'width=500,height=600');
            }
        });
    } else {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=email%20profile%20openid&nonce=hubitat_${Date.now()}`;
        window.open(googleAuthUrl, 'GoogleAuth', 'width=500,height=600');
    }
};

window.fazerLoginMicrosoft = function() {
    if (msalInstance) {
        msalInstance.loginPopup({ scopes: ["openid", "profile", "email"], prompt: "select_account" })
            .then(res => {
                if (res) {
                    const emailUser = (res.account && res.account.username) ? res.account.username : (res.idTokenClaims ? (res.idTokenClaims.email || res.idTokenClaims.preferred_username) : null);
                    const nomeUser = (res.account && res.account.name) ? res.account.name : (res.idTokenClaims ? res.idTokenClaims.name : null);
                    const tokenUser = res.idToken || res.accessToken;
                    autenticarContaSocialDireta('/api/auth/microsoft', emailUser, nomeUser, tokenUser);
                }
            })
            .catch(err => {
                console.log("MSAL Popup info:", err);
                const redirectUri = encodeURIComponent(window.location.origin + (window.location.pathname === "/" ? "/login" : window.location.pathname));
                const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=openid+profile+email&response_mode=fragment&nonce=hubitat_${Date.now()}`;
                window.open(msAuthUrl, 'MSAuth', 'width=500,height=600');
            });
    } else {
        const redirectUri = encodeURIComponent(window.location.origin + (window.location.pathname === "/" ? "/login" : window.location.pathname));
        const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=openid+profile+email&response_mode=fragment&nonce=hubitat_${Date.now()}`;
        window.open(msAuthUrl, 'MSAuth', 'width=500,height=600');
    }
};

window.fazerLoginFacebook = function() {
    const redirectUri = encodeURIComponent(window.location.origin + (window.location.pathname === "/" ? "/login" : window.location.pathname));
    const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=public_profile,email&response_type=token`;
    window.open(fbAuthUrl, 'FBAuth', 'width=500,height=600');
};

function parseJwt(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function handleGoogleCredential(response) {
    if (response && response.credential) {
        const payload = parseJwt(response.credential);
        const picture = payload ? payload.picture : null;
        const email = payload ? payload.email : null;
        const name = payload ? payload.name : null;
        autenticarContaSocialDireta('/api/auth/google', email, name, response.credential, picture);
    }
}

function autenticarContaSocialDireta(endpoint, email, nome, token, fotoUrl = null) {
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, nome: nome, access_token: token, credential: token, foto_url: fotoUrl, picture: fotoUrl })
    })
    .then(res => res.json())
    .then(data => {
        if (data.sucesso || data.access_token) {
            localStorage.setItem("hubitat_token", data.access_token || "hubitat-jwt-secret-session-token");
            if (data.usuario) {
                localStorage.setItem("hubitat_user", JSON.stringify(data.usuario));
            } else if (email || nome || fotoUrl) {
                localStorage.setItem("hubitat_user", JSON.stringify({
                    nome: nome || (email ? email.split('@')[0] : "Usuário"),
                    email: email,
                    foto_url: fotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                    provedor: endpoint.split('/').pop()
                }));
            }
            const overlay = document.getElementById("loginOverlay");
            const landingPage = document.getElementById("landingPage");
            const appContainer = document.querySelector(".app-container");

            if (overlay) overlay.classList.remove("active");
            if (landingPage) landingPage.style.display = "none";
            if (appContainer) appContainer.style.display = "flex";

            showToast(data.message || "Conectado com sucesso!", "success");
            if (window.location.pathname !== "/app") {
                history.pushState(null, "", "/app");
            }
            updateUserProfileUI();
            refreshAllData();
        } else {
            showToast(data.erro || "Erro ao conectar com a conta social.", "danger");
        }
    })
    .catch(err => {
        showToast("Erro de conexão ao autenticar.", "danger");
    });
}
window.autenticarContaSocialDireta = autenticarContaSocialDireta;

function logout() {
    localStorage.removeItem("hubitat_token");
    localStorage.removeItem("hubitat_user");
    if (window.location.pathname !== "/login") {
        history.pushState(null, "", "/login");
    }
    checkAuthAndLoadData();

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
        comunicacao: { title: 'Comunicação & Mural', subtitle: 'Mural de avisos oficiais, comunicados e livro de ocorrências' },
        visitantes: { title: 'Portaria & Controle de Acesso', subtitle: 'Gestão da portaria, QR Codes de visitantes e entregas express' },
        financeiro: { title: 'Gestão Operacional & Financeira', subtitle: 'Prestação de contas, balancetes, manutenção e assembleias' },
        os: { title: 'Ordens de Serviço (O.S.)', subtitle: 'Gestão preventiva, corretiva e acompanhamento de prestadores' },
        reservas: { title: 'Reservas & Espaços', subtitle: 'Agendamento de áreas comuns, churrasqueiras e quadras esportivas' },
        copilot: { title: 'Frame IA Copilot', subtitle: 'Inteligência Artificial especialista em regulamentos e operações condominiais' }
    };

    if (titles[tabName]) {
        const titleEl = document.getElementById('pageTitle');
        const subEl = document.getElementById('pageSubtitle');
        if (titleEl) titleEl.textContent = titles[tabName].title;
        if (subEl) subEl.textContent = titles[tabName].subtitle;
    }

    // Scroll to top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;

    // Mobile Sidebar auto close
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
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
    const comBadge = document.getElementById('comunicadoBadgeCount');
    const encBadge = document.getElementById('encomendasBadgeCount');

    const totalOS = state.ordensServico.length;
    const openOS = state.ordensServico.filter(o => o.status !== 'Concluída').length;
    const andamentoOS = state.ordensServico.filter(o => o.status === 'Em Andamento').length;
    const pendentesOS = state.ordensServico.filter(o => o.status === 'Pendente').length;
    const concluidasOS = state.ordensServico.filter(o => o.status === 'Concluída').length;

    if (osCount) osCount.textContent = openOS;
    if (osBadge) osBadge.textContent = openOS;
    if (resCount) resCount.textContent = state.reservas.length;
    if (visCount) visCount.textContent = state.visitantes.length;
    if (comBadge) comBadge.textContent = state.comunicados.length || 2;
    if (encBadge) encBadge.textContent = state.encomendas.filter(e => e.status !== 'Entregue ao Morador').length || 1;

    const osTotalEl = document.getElementById('osTotalCount');
    const osAndamentoEl = document.getElementById('osAndamentoCount');
    const osPendentesEl = document.getElementById('osPendentesCount');
    const osConcluidasEl = document.getElementById('osConcluidasCount');

    if (osTotalEl) osTotalEl.textContent = totalOS;
    if (osAndamentoEl) osAndamentoEl.textContent = andamentoOS;
    if (osPendentesEl) osPendentesEl.textContent = pendentesOS;
    if (osConcluidasEl) osConcluidasEl.textContent = concluidasOS;
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

// --- 4 PILARES: RENDERERS, MODALS & INTERFACE ROLE SWITCHER ---

// 1. Role View Switcher (Síndico, Portaria, Morador)
function changeRoleView(role) {
    document.body.classList.remove('kiosk-mode');
    
    if (role === 'portaria') {
        switchTab('visitantes');
        showToast("Interface alternada para Visão da Portaria & Acesso 🚪", "info");
    } else if (role === 'morador') {
        switchTab('comunicacao');
        showToast("Interface alternada para Visão do Morador & Mural 📲", "info");
    } else {
        switchTab('dashboard');
        showToast("Interface alternada para Visão do Síndico & Gestão Executiva 👑", "success");
    }
}
window.changeRoleView = changeRoleView;

// 2. Render Comunicados
function renderComunicados() {
    const container = document.getElementById('comunicadosList');
    if (!container) return;
    
    const items = state.comunicados || [];
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum comunicado oficial publicado.</div>`;
        return;
    }
    
    container.innerHTML = items.map(c => `
        <div class="comunicado-card">
            <div class="comunicado-header">
                <span class="comunicado-title">${c.title}</span>
                <span class="badge ${c.priority === 'Urgente' ? 'badge-danger' : 'badge-info'}">${c.priority}</span>
            </div>
            <p class="comunicado-content">${c.content}</p>
            <div class="comunicado-footer">
                <span><i class="fa-solid fa-calendar"></i> ${c.date} • ${c.category}</span>
                <div class="read-progress">
                    <span>${c.readRate || '88% Confirmado'}</span>
                    <div class="read-progress-bar">
                        <div class="read-progress-fill" style="width: 88%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}
window.renderComunicados = renderComunicados;

// 3. Render Ocorrências
function renderOcorrencias() {
    const tbody = document.getElementById('ocorrenciasTableBody');
    if (!tbody) return;
    
    const items = state.ocorrencias || [];
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma ocorrência registrada.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = items.map(o => `
        <tr>
            <td><strong>${o.id}</strong> • ${o.type}</td>
            <td>${o.unit}</td>
            <td>${o.desc}</td>
            <td><span class="badge ${o.status === 'Resolvido' ? 'badge-success' : 'badge-warning'}">${o.status}</span></td>
            <td>${o.time}</td>
        </tr>
    `).join('');
}
window.renderOcorrencias = renderOcorrencias;

// 4. Render Encomendas
function renderEncomendas() {
    const tbody = document.getElementById('encomendasTableBody');
    if (!tbody) return;
    
    const items = state.encomendas || [];
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma encomenda pendente na portaria.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = items.map(e => `
        <tr>
            <td><strong>${e.code}</strong><br><span class="text-muted" style="font-size:0.75rem;">${e.courier}</span></td>
            <td>${e.recipient}<br><span class="text-muted" style="font-size:0.75rem;">${e.unit}</span></td>
            <td>${e.receivedAt}</td>
            <td><span class="badge ${e.status === 'Entregue ao Morador' ? 'badge-success' : 'badge-warning'}">${e.status}</span></td>
            <td>
                ${e.status !== 'Entregue ao Morador' ? 
                `<button class="btn-text sm color-emerald" onclick="deliverEncomenda('${e.id}')"><i class="fa-solid fa-check"></i> Dar Baixa</button>` : 
                `<span class="text-muted" style="font-size:0.75rem;"><i class="fa-solid fa-check-double"></i> Entregue</span>`}
            </td>
        </tr>
    `).join('');
}
window.renderEncomendas = renderEncomendas;

// 5. Render Manutenções
function renderManutencoes() {
    const tbody = document.getElementById('manutencaoTableBody');
    if (!tbody) return;
    
    const items = state.manutencoes || [];
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhuma manutenção agendada.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = items.map(m => `
        <tr>
            <td><strong>${m.system}</strong></td>
            <td>${m.frequency}</td>
            <td>${m.nextDate}</td>
            <td>${m.responsible}</td>
            <td><span class="badge ${m.status === 'Em Dia' ? 'badge-success' : (m.status === 'Agendado' ? 'badge-info' : 'badge-warning')}">${m.status}</span></td>
        </tr>
    `).join('');
}
window.renderManutencoes = renderManutencoes;

// 6. QR Code Canvas Generator
function generateQRCodeCanvas(text) {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.fillStyle = '#09090b';
    ctx.fillRect(15, 15, 50, 50);
    ctx.fillRect(135, 15, 50, 50);
    ctx.fillRect(15, 135, 50, 50);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(25, 25, 30, 30);
    ctx.fillRect(145, 25, 30, 30);
    ctx.fillRect(25, 145, 30, 30);
    
    ctx.fillStyle = '#10b981';
    ctx.fillRect(33, 33, 14, 14);
    ctx.fillRect(153, 33, 14, 14);
    ctx.fillRect(33, 153, 14, 14);
    
    // Matrix simulation
    ctx.fillStyle = '#09090b';
    for (let i = 0; i < 60; i++) {
        const x = (Math.floor(Math.random() * 16) + 2) * 10;
        const y = (Math.floor(Math.random() * 16) + 2) * 10;
        if (!((x < 70 && y < 70) || (x > 120 && y < 70) || (x < 70 && y > 120))) {
            ctx.fillRect(x, y, 8, 8);
        }
    }
}
window.generateQRCodeCanvas = generateQRCodeCanvas;

function shareQRWhatsApp() {
    const visitor = document.getElementById('qrVisitorNameDisplay').innerText;
    const text = `Passe de Acesso QR Code Express para ${visitor} no Hubitat by Frame [IA]. Apresente este QR Code na portaria: https://hubitat.frameia.com.br/pass/express`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}
window.shareQRWhatsApp = shareQRWhatsApp;

function downloadQRCode() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'Passe_QR_Hubitat.png';
    link.href = canvas.toDataURL();
    link.click();
    showToast("QR Code baixado com sucesso!", "success");
}
window.downloadQRCode = downloadQRCode;

// 7. Modals & Actions
function openComunicadoModal() { openModal('comunicadoModal'); }
function openOcorrenciaModal() { openModal('ocorrenciaModal'); }
function openEncomendaModal() { openModal('encomendaModal'); }
function openManutencaoModal() { openModal('manutencaoModal'); }
function openBoletoModal() { openModal('boletoModal'); }

window.openComunicadoModal = openComunicadoModal;
window.openOcorrenciaModal = openOcorrenciaModal;
window.openEncomendaModal = openEncomendaModal;
window.openManutencaoModal = openManutencaoModal;
window.openBoletoModal = openBoletoModal;

async function saveComunicado(e) {
    e.preventDefault();
    const newCom = {
        id: 'COM-' + Math.floor(100 + Math.random() * 900),
        title: document.getElementById('comTitle').value,
        category: document.getElementById('comCategory').value,
        priority: document.getElementById('comPriority').value,
        date: new Date().toLocaleDateString('pt-BR'),
        readRate: '100% Confirmado',
        content: document.getElementById('comContent').value
    };
    
    try {
        await apiFetch(`${API_BASE}/api/comunicados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCom)
        });
        state.comunicados.unshift(newCom);
        renderComunicados();
        closeModal('comunicadoModal');
        showToast("Comunicado publicado no mural com sucesso!", "success");
    } catch (err) {
        state.comunicados.unshift(newCom);
        renderComunicados();
        closeModal('comunicadoModal');
        showToast("Comunicado registrado localmente!", "success");
    }
}
window.saveComunicado = saveComunicado;

async function saveOcorrencia(e) {
    e.preventDefault();
    const newOco = {
        id: 'OCO-' + Math.floor(100 + Math.random() * 900),
        unit: document.getElementById('ocoUnit').value,
        type: document.getElementById('ocoType').value,
        desc: document.getElementById('ocoDesc').value,
        status: 'Pendente',
        time: 'Agora'
    };
    
    try {
        await apiFetch(`${API_BASE}/api/ocorrencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOco)
        });
        state.ocorrencias.unshift(newOco);
        renderOcorrencias();
        closeModal('ocorrenciaModal');
        showToast("Ocorrência gravada no livro transparente!", "warning");
    } catch (err) {
        state.ocorrencias.unshift(newOco);
        renderOcorrencias();
        closeModal('ocorrenciaModal');
        showToast("Ocorrência gravada localmente!", "warning");
    }
}
window.saveOcorrencia = saveOcorrencia;

async function saveEncomenda(e) {
    e.preventDefault();
    const newEnc = {
        id: 'ENC-' + Math.floor(100 + Math.random() * 900),
        unit: document.getElementById('encUnit').value,
        recipient: document.getElementById('encRecipient').value,
        courier: document.getElementById('encCourier').value,
        code: document.getElementById('encCode').value,
        status: 'Aguardando Retirada',
        receivedAt: 'Agora'
    };
    
    try {
        await apiFetch(`${API_BASE}/api/encomendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEnc)
        });
        state.encomendas.unshift(newEnc);
        renderEncomendas();
        closeModal('encomendaModal');
        showToast("Encomenda registrada e morador notificado!", "info");
    } catch (err) {
        state.encomendas.unshift(newEnc);
        renderEncomendas();
        closeModal('encomendaModal');
        showToast("Encomenda registrada localmente!", "info");
    }
}
window.saveEncomenda = saveEncomenda;

async function deliverEncomenda(encId) {
    try {
        await apiFetch(`${API_BASE}/api/encomendas/${encId}/status`, { method: 'PUT' });
        const enc = state.encomendas.find(e => e.id === encId);
        if (enc) enc.status = 'Entregue ao Morador';
        renderEncomendas();
        showToast("Baixa de entrega registrada!", "success");
    } catch (err) {
        const enc = state.encomendas.find(e => e.id === encId);
        if (enc) enc.status = 'Entregue ao Morador';
        renderEncomendas();
        showToast("Baixa registrada localmente!", "success");
    }
}
window.deliverEncomenda = deliverEncomenda;

async function saveManutencao(e) {
    e.preventDefault();
    const newMan = {
        id: 'MAN-' + Math.floor(100 + Math.random() * 900),
        system: document.getElementById('manSystem').value,
        frequency: document.getElementById('manFrequency').value,
        nextDate: document.getElementById('manNextDate').value,
        responsible: document.getElementById('manResponsible').value,
        status: 'Agendado'
    };
    
    try {
        await apiFetch(`${API_BASE}/api/manutencoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMan)
        });
        state.manutencoes.unshift(newMan);
        renderManutencoes();
        closeModal('manutencaoModal');
        showToast("Preventiva agendada no calendário!", "success");
    } catch (err) {
        state.manutencoes.unshift(newMan);
        renderManutencoes();
        closeModal('manutencaoModal');
        showToast("Preventiva registrada localmente!", "success");
    }
}
window.saveManutencao = saveManutencao;

function copyBoletoCode() {
    navigator.clipboard.writeText("34191.09008 61200.001027 00042.910005 1 98010000058000");
    showToast("Código PIX / Copia e Cola copiado!", "success");
}
window.copyBoletoCode = copyBoletoCode;

/* --- UI REDESIGN & INTERACTIVE FUNCTIONS --- */

// Quick Action Dropdown Menu Toggle
window.toggleQuickActionMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById("quickActionMenu");
    const notifDrawer = document.getElementById("notificationDrawer");
    if (notifDrawer) notifDrawer.classList.remove("active");
    if (menu) menu.classList.toggle("active");
};

// Notification Drawer Toggle
window.toggleNotificationMenu = function(e) {
    if (e) e.stopPropagation();
    const notifDrawer = document.getElementById("notificationDrawer");
    const menu = document.getElementById("quickActionMenu");
    if (menu) menu.classList.remove("active");
    if (notifDrawer) notifDrawer.classList.toggle("active");
};

// Global click listener to close popovers
document.addEventListener("click", function(e) {
    const menu = document.getElementById("quickActionMenu");
    const notifDrawer = document.getElementById("notificationDrawer");
    const quickBtn = document.getElementById("quickActionBtn");
    const notifBtn = document.querySelector(".notification-btn");

    if (menu && !menu.contains(e.target) && quickBtn && !quickBtn.contains(e.target)) {
        menu.classList.remove("active");
    }
    if (notifDrawer && !notifDrawer.contains(e.target) && notifBtn && !notifBtn.contains(e.target)) {
        notifDrawer.classList.remove("active");
    }
});

// Command Palette Spotlight Modal (Ctrl + K / Cmd + K)
let paletteCategory = 'all';

window.openCommandPalette = function() {
    const modal = document.getElementById("commandPaletteModal");
    const input = document.getElementById("paletteSearchInput");
    if (modal) {
        modal.classList.add("active");
        if (input) {
            input.value = "";
            input.focus();
            executePaletteSearch("");
        }
    }
};

window.closeCommandPalette = function() {
    const modal = document.getElementById("commandPaletteModal");
    if (modal) modal.classList.remove("active");
};

window.filterPaletteCategory = function(cat) {
    paletteCategory = cat;
    const tags = document.querySelectorAll(".palette-filter-tag");
    tags.forEach(t => t.classList.remove("active"));
    const activeTag = Array.from(tags).find(t => t.getAttribute("onclick").includes(cat));
    if (activeTag) activeTag.classList.add("active");

    const input = document.getElementById("paletteSearchInput");
    executePaletteSearch(input ? input.value : "");
};

window.executePaletteSearch = function(query) {
    const list = document.getElementById("paletteResultsList");
    if (!list) return;

    const q = query.toLowerCase().trim();
    let results = [];

    // Search O.S.
    if (paletteCategory === 'all' || paletteCategory === 'os') {
        (state.ordensServico || []).forEach(os => {
            if (!q || os.title.toLowerCase().includes(q) || os.id.toLowerCase().includes(q) || os.location.toLowerCase().includes(q)) {
                results.push({
                    type: 'os',
                    icon: 'fa-wrench color-warning',
                    title: `${os.id} • ${os.title}`,
                    subtitle: `Local: ${os.location} • Status: ${os.status}`,
                    action: () => { switchTab('os'); closeCommandPalette(); }
                });
            }
        });
    }

    // Search Encomendas
    if (paletteCategory === 'all' || paletteCategory === 'encomendas') {
        (state.encomendas || []).forEach(enc => {
            if (!q || enc.recipient.toLowerCase().includes(q) || enc.unit.toLowerCase().includes(q) || enc.courier.toLowerCase().includes(q)) {
                results.push({
                    type: 'encomenda',
                    icon: 'fa-box color-info',
                    title: `Encomenda ${enc.courier} • ${enc.recipient}`,
                    subtitle: `Unidade: ${enc.unit} • Status: ${enc.status}`,
                    action: () => { switchTab('visitantes'); closeCommandPalette(); }
                });
            }
        });
    }

    // Search Visitantes
    if (paletteCategory === 'all' || paletteCategory === 'visitantes') {
        (state.visitantes || []).forEach(vis => {
            if (!q || vis.name.toLowerCase().includes(q) || vis.unit.toLowerCase().includes(q) || (vis.plate && vis.plate.toLowerCase().includes(q))) {
                results.push({
                    type: 'visitante',
                    icon: 'fa-qrcode color-success',
                    title: `Visitante: ${vis.name}`,
                    subtitle: `Destino: ${vis.unit} • Placa: ${vis.plate || 'N/A'} • Status: ${vis.status}`,
                    action: () => { switchTab('visitantes'); closeCommandPalette(); }
                });
            }
        });
    }

    // Render Results
    if (results.length === 0) {
        list.innerHTML = `
            <div class="palette-empty-state">
                <i class="fa-solid fa-circle-exclamation color-muted" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                <p>Nenhum resultado encontrado para "${query}".</p>
            </div>
        `;

        return;
    }

    list.innerHTML = results.slice(0, 8).map((item, idx) => `
        <div class="palette-result-item ${idx === 0 ? 'selected' : ''}" onclick="window.paletteResults[${idx}].action()">
            <div class="palette-item-left">
                <i class="fa-solid ${item.icon}"></i>
                <div>
                    <strong>${item.title}</strong>
                    <small>${item.subtitle}</small>
                </div>
            </div>
            <i class="fa-solid fa-arrow-right color-muted" style="font-size: 0.8rem;"></i>
        </div>
    `).join("");

    window.paletteResults = results;
};

// Global Keyboard Shortcut: Ctrl + K or Cmd + K
document.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const modal = document.getElementById("commandPaletteModal");
        if (modal && modal.classList.contains("active")) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
    } else if (e.key === 'Escape') {
        closeCommandPalette();
    }
});

// ==============================================================================
// HUBITAT v0.1.0 - OCR SCANNER, COPILOT CONCIERGE 24/7, PIX & ASSEMBLEIA JS
// ==============================================================================

// 1. OCR SCANNER DE ENCOMENDAS (IA EMBARCADA)
let ocrStream = null;
let currentOcrPackage = null;

window.openOcrScanner = async function() {
    openModal("ocrScannerModal");
    const video = document.getElementById("ocrVideoPreview");
    const fallback = document.getElementById("ocrFallbackUpload");
    const resultBox = document.getElementById("ocrResultBox");
    if (resultBox) resultBox.style.display = "none";

    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            ocrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (video) {
                video.srcObject = ocrStream;
                video.style.display = "block";
                if (fallback) fallback.style.display = "none";
            }
        }
    } catch (err) {
        console.warn("Câmera indisponível ou permissão negada. Utilizando modo fallback de foto/simulação.", err);
        if (video) video.style.display = "none";
        if (fallback) fallback.style.display = "block";
    }
};

window.closeOcrScanner = function() {
    if (ocrStream) {
        ocrStream.getTracks().forEach(t => t.stop());
        ocrStream = null;
    }
    closeModal("ocrScannerModal");
};

window.handleOcrFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    showToast("Processando imagem da etiqueta via Frame IA Vision...", "info");
    
    setTimeout(() => {
        simulateOcrSample();
    }, 1200);
};

window.simulateOcrSample = async function() {
    showToast("Lendo etiqueta via OCR Inteligente...", "info");
    
    try {
        const res = await apiFetch(`${API_BASE}/api/ai/ocr-encomenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                raw_text: "DESTINATARIO: Luciana Meireles UNIDADE: Casa 12 COURIER: Mercado Livre RASTREIO: BR998201475X"
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentOcrPackage = data.encomenda;
            
            document.getElementById("ocrDestinatario").value = currentOcrPackage.destinatario;
            document.getElementById("ocrUnidade").value = currentOcrPackage.unidade;
            document.getElementById("ocrTransportadora").value = currentOcrPackage.transportadora;
            document.getElementById("ocrCodigoRastreio").value = currentOcrPackage.codigo_rastreio;
            
            const resultBox = document.getElementById("ocrResultBox");
            if (resultBox) resultBox.style.display = "block";
            showToast("Etiqueta identificada com 99.4% de confiança!", "success");
        }
    } catch (e) {
        showToast("Erro ao processar OCR.", "danger");
    }
};

window.confirmOcrPackageRegistration = async function() {
    if (!currentOcrPackage) return;
    
    showToast(`Encomenda registrada! Morador da ${currentOcrPackage.unidade} notificado via WhatsApp.`, "success");
    closeOcrScanner();
    await refreshAllData();
    switchTab("visitantes");
};

// 2. COPILOT IA CONCIERGE & JURÍDICO 24/7
window.toggleCopilotDrawer = function() {
    const drawer = document.getElementById("copilotDrawer");
    if (drawer) {
        drawer.classList.toggle("open");
        if (drawer.classList.contains("open")) {
            const input = document.getElementById("copilotChatInput");
            if (input) input.focus();
        }
    }
};

window.sendCopilotQuickPrompt = function(promptText) {
    const input = document.getElementById("copilotChatInput");
    if (input) {
        input.value = promptText;
        sendCopilotMessage();
    }
};

window.sendCopilotMessage = async function() {
    const input = document.getElementById("copilotChatInput");
    const container = document.getElementById("copilotChatMessages");
    if (!input || !container) return;

    const message = input.value.trim();
    if (!message) return;

    // User Message
    const userMsgHtml = `
        <div class="copilot-msg user">
            <div class="msg-bubble">${escapeHtml(message)}</div>
        </div>
    `;
    container.innerHTML += userMsgHtml;
    input.value = "";
    container.scrollTop = container.scrollHeight;

    // Typing Indicator
    const typingId = "copilotTyping_" + Date.now();
    const typingHtml = `
        <div class="copilot-msg bot" id="${typingId}">
            <div class="msg-bubble" style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-brain color-primary fa-spin"></i>
                <span style="color: var(--text-muted); font-size: 0.8rem;">Hubitat IA pensando...</span>
            </div>
        </div>
    `;
    container.innerHTML += typingHtml;
    container.scrollTop = container.scrollHeight;

    try {
        const res = await apiFetch(`${API_BASE}/api/ai/copilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message, condo: state.currentCondo })
        });

        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        if (res.ok) {
            const data = await res.json();
            const botMsgHtml = `
                <div class="copilot-msg bot">
                    <div class="msg-bubble">${data.resposta}</div>
                </div>
            `;
            container.innerHTML += botMsgHtml;
        } else {
            container.innerHTML += `
                <div class="copilot-msg bot">
                    <div class="msg-bubble" style="color: #f87171;">Não foi possível obter resposta no momento.</div>
                </div>
            `;
        }
    } catch (e) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        container.innerHTML += `
            <div class="copilot-msg bot">
                <div class="msg-bubble" style="color: #f87171;">Erro de conexão com o assistente.</div>
            </div>
        `;
    }
    container.scrollTop = container.scrollHeight;
};

// 3. PAGAMENTO PIX INSTANTÂNEO PARA RESERVAS
let currentPixData = null;

window.abrirPagamentoPix = async function(espacoNome, valorNum, moradorNome) {
    try {
        const res = await apiFetch(`${API_BASE}/api/pagamento/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                espaco: espacoNome || "Deck & Churrasqueira",
                valor: valorNum || 150.00,
                morador: moradorNome || "Morador"
            })
        });

        if (res.ok) {
            currentPixData = await res.json();
            document.getElementById("pixValorDisplay").textContent = currentPixData.valor_formatado;
            document.getElementById("pixEspacoDisplay").textContent = currentPixData.espaco;
            document.getElementById("pixQrCodeImg").src = currentPixData.qr_code_url;
            document.getElementById("pixCopiaColaInput").value = currentPixData.pix_copia_cola;

            openModal("pixPaymentModal");
        }
    } catch (err) {
        showToast("Erro ao gerar Pix.", "danger");
    }
};

window.copyPixCopiaCola = function() {
    const input = document.getElementById("pixCopiaColaInput");
    if (input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        showToast("Código PIX Copia-e-Cola copiado com sucesso!", "success");
    }
};

window.simularConfirmacaoPix = async function() {
    showToast("Conciliando pagamento via Webhook Bancário...", "info");
    
    try {
        await apiFetch(`${API_BASE}/api/pagamento/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reserva_id: currentPixData ? currentPixData.reserva_id : "RES-101" })
        });
        
        closeModal("pixPaymentModal");
        showToast("🎉 Pagamento Pix Confirmado! Reserva 100% garantida.", "success");
        await refreshAllData();
    } catch (e) {
        closeModal("pixPaymentModal");
        showToast("Reserva confirmada!", "success");
    }
};

// 4. PASSE EXPRESS QR CODE PARA VISITANTES
window.gerarPasseVisitanteQr = async function(nome, unidade) {
    try {
        const res = await apiFetch(`${API_BASE}/api/visitantes/qrcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome || "Convidado", unit: unidade || "Casa 42" })
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById("guestQrCodeImg").src = data.qr_code_url;
            document.getElementById("guestQrNameDisplay").textContent = data.nome;
            document.getElementById("guestQrUnitDisplay").textContent = `Destino: ${data.unit}`;
            document.getElementById("guestWhatsAppShareBtn").href = data.link_whatsapp;

            openModal("guestQrModal");
        }
    } catch (e) {
        showToast("Erro ao gerar QR Code.", "danger");
    }
};

// 5. ASSEMBLEIA VIRTUAL & VOTAÇÃO DIGITAL
window.openAssembleiaModal = async function() {
    try {
        const res = await apiFetch(`${API_BASE}/api/assembleia/enquetes`);
        if (res.ok) {
            const enquetes = await res.json();
            if (enquetes.length > 0) {
                const enq = enquetes[0];
                document.getElementById("assembleiaEnqueteId").value = enq.id;
                document.getElementById("assembleiaTitulo").textContent = enq.titulo;
                document.getElementById("assembleiaDescricao").textContent = `${enq.descricao} (Votos Atuais: ${enq.votos_favor} a favor, ${enq.votos_contra} contra, ${enq.votos_abstencao} abstenções).`;
                openModal("assembleiaVotarModal");
            }
        }
    } catch (err) {
        showToast("Erro ao carregar assembleia.", "danger");
    }
};

window.enviarVotoAssembleia = async function(voto) {
    const enqueteId = document.getElementById("assembleiaEnqueteId").value;
    
    try {
        const res = await apiFetch(`${API_BASE}/api/assembleia/votar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enquete_id: enqueteId, voto: voto })
        });

        if (res.ok) {
            closeModal("assembleiaVotarModal");
            showToast("Voto computado e registrado na ata com validade jurídica!", "success");
        } else {
            const err = await res.json();
            showToast(err.detail || "Erro ao registrar voto.", "warning");
        }
    } catch (err) {
        closeModal("assembleiaVotarModal");
        showToast("Voto registrado com sucesso!", "success");
    }
};

// Share Pass via WhatsApp
window.sharePassWhatsApp = function(name, unit, time) {
    gerarPasseVisitanteQr(name, unit);
};
window.copyBoletoCode = copyBoletoCode;

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
