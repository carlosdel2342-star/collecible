// app.js - Collecible SPA Logic (Versión Blindada Anti-Bloqueos)

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 🚨 TUS CREDENCIALES REALES AQUÍ 🚨 ---
    // Búscalas en Supabase: Settings (Rueda de engranaje) -> API
    const SUPABASE_URL = 'https://fgqyicidzwmwbnutlmnz.supabase.co'; // Debe empezar con https://
    const SUPABASE_KEY = 'sb_publishable_6sIJpxdXdg93ntQXD29cnA_nigxf_Kn'; // Es un texto larguísimo que empieza con eyJ...
    
    let supabase = null;
    let currentUser = null; 

    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.error("Error al inicializar Supabase:", e);
    }

    // --- LÓGICA DE AUTENTICACIÓN ---
    const viewAuth = document.getElementById('view-auth');
    const appContent = document.getElementById('app-content');
    const bottomNav = document.getElementById('bottom-nav');
    const authLogin = document.getElementById('auth-login');
    const authRegister = document.getElementById('auth-register');
    const authSuccess = document.getElementById('auth-success');

    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const btnGotoRegister = document.getElementById('btn-goto-register');

    const registerName = document.getElementById('register-name');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerPasswordConfirm = document.getElementById('register-password-confirm');
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    const btnGotoLogin = document.getElementById('btn-goto-login');

    const btnSuccessLogin = document.getElementById('btn-success-login');
    const btnLogout = document.getElementById('btn-logout');

    const viewOnboarding = document.getElementById('view-onboarding');
    const onboardingUsername = document.getElementById('onboarding-username');
    const onboardingBio = document.getElementById('onboarding-bio');
    const onboardingAvatarFile = document.getElementById('onboarding-avatar-file');
    const onboardingAvatarPreview = document.getElementById('onboarding-avatar-preview');
    const btnOnboardingSubmit = document.getElementById('btn-onboarding-submit');

    function handleSession(session) {
        if (session) {
            currentUser = session.user;
            if (!currentUser.user_metadata || !currentUser.user_metadata.username) {
                // Faltan datos de Onboarding
                if(viewAuth) viewAuth.style.display = 'none';
                if(appContent) appContent.style.display = 'none';
                if(bottomNav) bottomNav.style.display = 'none';
                if(viewOnboarding) viewOnboarding.style.display = 'flex';
            } else {
                // Perfil completo
                if(viewAuth) viewAuth.style.display = 'none';
                if(viewOnboarding) viewOnboarding.style.display = 'none';
                if(appContent) appContent.style.display = 'block';
                if(bottomNav) bottomNav.style.display = 'flex';
                loadData();
            }
        } else {
            currentUser = null;
            if(viewAuth) viewAuth.style.display = 'flex';
            if(viewOnboarding) viewOnboarding.style.display = 'none';
            if(appContent) appContent.style.display = 'none';
            if(bottomNav) bottomNav.style.display = 'none';
            
            if(authLogin && authRegister && authSuccess) {
                authLogin.style.display = 'block';
                authRegister.style.display = 'none';
                authSuccess.style.display = 'none';
            }
        }
    }

    if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        supabase.auth.onAuthStateChange((event, session) => {
            handleSession(session);
        });
    }

    // --- NAVEGACIÓN DE VISTAS AUTH ---
    if (btnGotoRegister) {
        handleTap(btnGotoRegister, () => {
            authLogin.style.display = 'none';
            authRegister.style.display = 'block';
        });
    }
    if (btnGotoLogin) {
        handleTap(btnGotoLogin, () => {
            authRegister.style.display = 'none';
            authLogin.style.display = 'block';
        });
    }
    if (btnSuccessLogin) {
        handleTap(btnSuccessLogin, () => {
            authSuccess.style.display = 'none';
            authLogin.style.display = 'block';
        });
    }

    let onboardingBase64 = "";

    if (onboardingAvatarFile && onboardingAvatarPreview) {
        onboardingAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                onboardingBase64 = event.target.result;
                onboardingAvatarPreview.src = onboardingBase64;
                onboardingAvatarPreview.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnOnboardingSubmit) {
        handleTap(btnOnboardingSubmit, async (e) => {
            e.preventDefault();
            if (!onboardingUsername.value) return alert("El Username es obligatorio.");
            
            const originalText = btnOnboardingSubmit.innerText;
            btnOnboardingSubmit.innerText = "Preparando perfil...";
            btnOnboardingSubmit.disabled = true;

            let finalAvatarUrl = "https://i.pravatar.cc/150?img=11";
            
            if (onboardingBase64) {
                try {
                    btnOnboardingSubmit.innerText = "Subiendo foto...";
                    finalAvatarUrl = await uploadImageToSupabase(onboardingBase64);
                } catch (err) {
                    console.warn("Fallo al subir avatar a Supabase, usando default.", err);
                }
            }

            const { data, error } = await supabase.auth.updateUser({
                data: {
                    username: onboardingUsername.value,
                    bio: onboardingBio.value || "",
                    avatar_url: finalAvatarUrl
                }
            });
            if (error) {
                alert(error.message);
                btnOnboardingSubmit.innerText = originalText;
                btnOnboardingSubmit.disabled = false;
            } else {
                currentUser = data.user;
                btnOnboardingSubmit.innerText = originalText;
                btnOnboardingSubmit.disabled = false;
                handleSession({ user: currentUser });
            }
        });
    }

    // --- ACCIONES DE AUTH ---
    if (btnLoginSubmit) {
        handleTap(btnLoginSubmit, async (e) => {
            e.preventDefault();
            if (!loginEmail.value || !loginPassword.value) return alert("Por favor, llena los campos.");
            
            const { error } = await supabase.auth.signInWithPassword({
                email: loginEmail.value,
                password: loginPassword.value,
            });
            if (error) alert(error.message);
        });
    }

    if (btnRegisterSubmit) {
        handleTap(btnRegisterSubmit, async (e) => {
            e.preventDefault();
            if (!registerName.value || !registerEmail.value || !registerPassword.value || !registerPasswordConfirm.value) {
                return alert("Por favor, llena todos los campos.");
            }
            if (registerPassword.value !== registerPasswordConfirm.value) {
                return alert("Las contraseñas no coinciden.");
            }
            
            const { error } = await supabase.auth.signUp({
                email: registerEmail.value,
                password: registerPassword.value,
                options: {
                    data: { display_name: registerName.value }
                }
            });
            if (error) {
                alert(error.message);
            } else {
                authRegister.style.display = 'none';
                authSuccess.style.display = 'block';
            }
        });
    }

    if (btnLogout) {
        handleTap(btnLogout, async () => {
            if (supabase) await supabase.auth.signOut();
        });
    }

    // --- NAVEGACIÓN ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    function switchView(targetViewId) {
        views.forEach(view => view.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.classList.add('active');
        
        const activeButton = document.querySelector(`.nav-btn[data-target="${targetViewId}"]`);
        if (activeButton) activeButton.classList.add('active');
    }

    function handleTap(element, callback) {
        if(!element) return;
        const handler = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            callback(e);
        };
        element.addEventListener('click', handler);
        element.addEventListener('touchstart', handler, { passive: false });
    }

    navButtons.forEach(btn => {
        handleTap(btn, () => {
            const targetViewId = btn.getAttribute('data-target');
            if (targetViewId) switchView(targetViewId);
        });
    });

    // --- GESTIÓN DE DATOS ---
    let homeFeed = [];
    let marketList = [];
    let profileCollection = [];

    async function loadData() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: true });
            if (error) throw error;

            homeFeed = (data || []).filter(card => card.category === 'home');
            marketList = (data || []).filter(card => card.category === 'market');
            profileCollection = (data || []).filter(card => card.category === 'profile');
            renderAll();
        } catch (err) {
            console.error("Error de red al cargar Supabase:", err);
        }
    }

    function renderAll() {
        renderFeed();
        renderMarket();
        renderProfile();
    }

    function renderFeed() {
        const container = document.getElementById('feed-container');
        if(!container) return;
        container.innerHTML = '';
        
        if(homeFeed.length === 0) {
            container.innerHTML = '<p class="placeholder-text" style="text-align:center; margin-top:50px;">No hay publicaciones recientes. ¡Ve a la cámara y publica la primera!</p>';
            return;
        }

        homeFeed.slice().reverse().forEach(post => {
            const avatar = post.avatar || "https://i.pravatar.cc/150?img=11";
            const username = post.username || "@Coleccionista";

            container.innerHTML += `
                <article class="post">
                    <div class="post-header">
                        <img src="${avatar}" alt="Avatar" class="avatar">
                        <div class="post-meta">
                            <span class="username">${username}</span>
                            <span class="time">Justo ahora</span>
                        </div>
                    </div>
                    <div class="post-image-container">
                        <img src="${post.image}" alt="Carta" class="post-image">
                    </div>
                    <div class="post-actions">
                        <button class="action-btn"><i class="fa-regular fa-heart"></i></button>
                        <button class="action-btn"><i class="fa-regular fa-comment"></i></button>
                        <div class="spacer"></div>
                        <button class="action-btn btn-trade"><i class="fa-solid fa-handshake"></i> Trade</button>
                    </div>
                    <div class="post-caption">
                        <span class="username">${username}</span> ¡Acabo de escanear esta carta: ${post.name || 'Coleccionable'} [${post.rarity || 'Normal'}]!
                    </div>
                </article>
            `;
        });
    }

    function renderMarket() {
        const container = document.getElementById('market-container');
        if(!container) return;
        container.innerHTML = '';

        if(marketList.length === 0) {
            container.innerHTML = '<p class="placeholder-text" style="grid-column: span 2; text-align:center; margin-top:50px;">El mercado está vacío. ¡Pon una carta en venta!</p>';
            return;
        }

        marketList.slice().reverse().forEach(item => {
            const rarityText = item.rarity || 'Normal';
            let badgeClass = rarityText.toLowerCase().includes('foil') || rarityText.toLowerCase().includes('holo') ? 'badge-foil' : 'badge-mint';
            
            container.innerHTML += `
                <div class="trade-card">
                    <div class="trade-img-wrapper">
                        <span class="badge ${badgeClass}">${rarityText.substring(0, 8)}</span>
                        <img src="${item.image}" alt="Carta">
                    </div>
                    <div class="trade-info">
                        <h4>${item.name || 'Objeto'}</h4>
                        <span class="price">Est. $${item.price || '0'}</span>
                    </div>
                    <button class="btn-offer">Ofertar</button>
                </div>
            `;
        });
    }

    function renderProfile() {
        const container = document.getElementById('profile-gallery-container');
        
        const profileNameText = document.getElementById('profile-name-text');
        const profileBioText = document.getElementById('profile-bio-text');
        const profileAvatarImg = document.getElementById('profile-avatar-img');

        if(profileNameText && currentUser && currentUser.user_metadata) {
            profileNameText.innerText = currentUser.user_metadata.username ? `@${currentUser.user_metadata.username}` : currentUser.email;
        }
        if(profileBioText && currentUser && currentUser.user_metadata) {
            profileBioText.innerText = currentUser.user_metadata.bio || "Coleccionista de TCG";
        }
        if(profileAvatarImg && currentUser && currentUser.user_metadata) {
            profileAvatarImg.src = currentUser.user_metadata.avatar_url || "https://i.pravatar.cc/150?img=11";
        }

        if(!container) return;
        container.innerHTML = '';
        
        let totalValue = 0;
        
        profileCollection.slice().reverse().forEach(card => {
            container.innerHTML += `
                <div class="gallery-item"><img src="${card.image}" alt="${card.name || 'Carta'}"></div>
            `;
            totalValue += 25; 
        });

        const statCards = document.getElementById('stat-cards');
        const statValue = document.getElementById('stat-value');
        if(statCards) statCards.innerText = profileCollection.length;
        if(statValue) statValue.innerText = `$${totalValue}`;
    }

    // --- CÁMARA E INTELIGENCIA ARTIFICIAL SEGURA ---
    const btnScanTrigger = document.getElementById('btn-scan-trigger');
    const ocrUpload = document.getElementById('ocr-upload');
    const cameraInitial = document.getElementById('camera-initial');
    const cameraLoading = document.getElementById('camera-loading');
    const cameraForm = document.getElementById('camera-form');
    const scannedThumb = document.getElementById('scanned-thumb');
    const scannedName = document.getElementById('scanned-name');
    const scannedRarity = document.getElementById('scanned-rarity');
    const btnCancelScan = document.getElementById('btn-cancel-scan');
    
    let currentBase64 = "";
    let currentEstimatedPrice = "50"; 

    // 🚨 PON TU CLAVE DE GEMINI AQUÍ ABAJO 🚨
    const GEMINI_API_KEY = 'AQ.Ab8RN6Lb0bdZsydMaS3j8zkWxyfWDDFBvyPyHn9X8ngWIJHepw';

    if (btnScanTrigger && ocrUpload) {
        btnScanTrigger.addEventListener('click', () => {
            ocrUpload.click();
        });

        ocrUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if(cameraInitial) cameraInitial.style.display = 'none';
            if(cameraLoading) cameraLoading.style.display = 'flex';
            const loadingText = document.querySelector('#camera-loading .loading-text');
            if(loadingText) loadingText.innerText = "Procesando imagen con IA...";

            const reader = new FileReader();
            reader.onload = async function(event) {
                currentBase64 = event.target.result;
                if(scannedThumb) scannedThumb.src = currentBase64;

                try {
                    const base64Data = currentBase64.split(',')[1];
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: 'Eres un tasador experto de Trading Card Games (TCG). Analiza esta imagen y devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta: { "nombre": "Nombre de la carta", "rareza": "Rareza", "precioEstimado": "numero en dolares", "autenticidad": "porcentaje% - estado", "resumen": "Breve historia o descripción de la carta (max 2 lineas)" }' },
                                    { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
                                ]
                            }]
                        })
                    });
                    
                    if (!response.ok) throw new Error('Error en API Gemini');
                    const data = await response.json();
                    
                    let jsonText = data.candidates[0].content.parts[0].text;
                    console.log("Respuesta cruda de Gemini:", jsonText);
                    
                    jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    
                    let aiData = {};
                    try {
                        aiData = JSON.parse(jsonText);
                    } catch(e) {
                        console.warn("Fallo al parsear JSON, usando valores por defecto. Error:", e);
                    }

                    if(scannedName) scannedName.value = aiData.nombre || "Desconocido";
                    if(scannedRarity) scannedRarity.value = aiData.rareza || "Normal";
                    
                    const scannedAuth = document.getElementById('scanned-auth');
                    if(scannedAuth) scannedAuth.value = aiData.autenticidad || "Sin verificar";
                    
                    const scannedSummary = document.getElementById('scanned-summary');
                    if(scannedSummary) scannedSummary.value = aiData.resumen || "Sin resumen disponible.";

                    currentEstimatedPrice = aiData.precioEstimado || "0";

                    if(cameraLoading) cameraLoading.style.display = 'none';
                    if(cameraForm) cameraForm.style.display = 'block';
                } catch (error) {
                    console.error("Gemini Error:", error);
                    alert("Error al analizar la carta. Intenta de nuevo.");
                    resetCamera();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function resetCamera() {
        if(cameraForm) cameraForm.style.display = 'none';
        if(cameraLoading) cameraLoading.style.display = 'none';
        if(cameraInitial) cameraInitial.style.display = 'flex';
        if(ocrUpload) ocrUpload.value = "";
        if(scannedName) scannedName.value = "";
        if(scannedRarity) scannedRarity.value = "";
        const scannedAuth = document.getElementById('scanned-auth');
        if(scannedAuth) scannedAuth.value = "";
        const scannedSummary = document.getElementById('scanned-summary');
        if(scannedSummary) scannedSummary.value = "";
        currentBase64 = "";
    }

    handleTap(btnCancelScan, resetCamera);

    async function uploadImageToSupabase(base64Str) {
        if (!supabase) throw new Error("Supabase no disponible");
        const res = await fetch(base64Str);
        const blob = await res.blob();
        const fileName = `card_${Date.now()}.jpg`;
        
        const { error } = await supabase.storage.from('card-images').upload(fileName, blob);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(fileName);
        return publicUrl;
    }
    
    async function saveCardToCloud(category, extraData = {}) {
        try {
            if(cameraForm) cameraForm.style.display = 'none';
            if(cameraLoading) cameraLoading.style.display = 'flex';
            const loadingText = document.querySelector('#camera-loading .loading-text');
            if(loadingText) loadingText.innerText = "Subiendo carta a la nube...";

            let publicUrl = currentBase64; 
            try {
                publicUrl = await uploadImageToSupabase(currentBase64);
            } catch (err) {
                console.warn("Usando imagen local por restricción de Storage:", err);
            }

            const scannedSummary = document.getElementById('scanned-summary');
            const summaryText = scannedSummary ? scannedSummary.value : "";

            const newRecord = {
                category: category,
                name: scannedName ? scannedName.value : "Carta",
                rarity: scannedRarity ? scannedRarity.value : "Normal",
                summary: summaryText,
                image: publicUrl,
                ...extraData
            };

            if (supabase) {
                await supabase.from('cards').insert([newRecord]);
                await loadData();
            } else {
                throw new Error("Supabase no está inicializado.");
            }

            resetCamera();
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("Hubo un error al subir la carta. Comprueba tu conexión.");
            resetCamera();
        }
    }

    handleTap(document.getElementById('btn-save-profile'), async () => {
        await saveCardToCloud('profile');
        switchView('view-profile');
    });

    handleTap(document.getElementById('btn-save-home'), async () => {
        let username = "@Anonymous";
        let avatar = "https://i.pravatar.cc/150?img=11";
        if(currentUser && currentUser.user_metadata) {
            username = currentUser.user_metadata.username || currentUser.email;
            if(currentUser.user_metadata.avatar_url) {
                avatar = currentUser.user_metadata.avatar_url;
            }
        }
        await saveCardToCloud('home', {
            username: username,
            avatar: avatar
        });
        switchView('view-home');
    });

    handleTap(document.getElementById('btn-save-l4t'), async () => {
        let price = prompt("¿Qué precio estimado tiene esta carta ($)?", currentEstimatedPrice);
        if(price === null) return;

        await saveCardToCloud('market', {
            price: price || "0"
        });
        switchView('view-l4t');
    });

    const feedContainer = document.getElementById('feed-container');
    if(feedContainer) {
        handleTap(feedContainer, (e) => {
            const btn = e.target.closest('.btn-trade');
            if(btn) alert("¡Has solicitado iniciar un Trade por esta carta!");
        });
    }

    const marketContainer = document.getElementById('market-container');
    if(marketContainer) {
        handleTap(marketContainer, (e) => {
            const btn = e.target.closest('.btn-offer');
            if(btn) alert("¡Oferta enviada al vendedor!");
        });
    }
});