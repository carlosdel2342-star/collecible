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
            
            try {
                const { data: existingUsers, error: queryError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', onboardingUsername.value);
                
                if (existingUsers && existingUsers.length > 0) {
                    return alert("Este nombre de usuario ya está en uso, elige otro.");
                }
            } catch (profileErr) {
                console.warn("Aviso: Validación de unicidad de username omitida (tabla profiles no encontrada).");
            }
            
            const originalText = btnOnboardingSubmit.innerText;
            btnOnboardingSubmit.innerText = "Preparando perfil...";
            btnOnboardingSubmit.disabled = true;

            let finalAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(onboardingUsername.value)}&backgroundColor=000000,1a1a1a&textColor=ffffff`;
            
            if (onboardingBase64) {
                try {
                    btnOnboardingSubmit.innerText = "Optimizando foto...";
                    const resizedBase64 = await resizeImage(onboardingBase64, 200);
                    finalAvatarUrl = resizedBase64; // fallback
                    try {
                        btnOnboardingSubmit.innerText = "Subiendo foto...";
                        finalAvatarUrl = await uploadImageToSupabase(resizedBase64);
                    } catch (err) {
                        console.warn("Fallo al subir avatar al bucket, usando base64 directo.", err);
                    }
                } catch (err) {
                    console.warn("Fallo general al procesar avatar.", err);
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
            
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
            if (!passwordRegex.test(registerPassword.value)) {
                return alert("La contraseña debe tener al menos 8 caracteres, incluir letras y números.");
            }
            
            const { error } = await supabase.auth.signUp({
                email: registerEmail.value,
                password: registerPassword.value,
                options: {
                    data: { display_name: registerName.value }
                }
            });
            if (error) {
                if (error.message.includes("already registered") || error.message.includes("already exists")) {
                    alert("Este correo electrónico ya está registrado. Por favor, inicia sesión.");
                } else {
                    alert("Error en el registro: " + error.message);
                }
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

        // Render "Mis Posts"
        const postsContainer = document.getElementById('profile-posts-container');
        if(postsContainer && currentUser && currentUser.user_metadata) {
            postsContainer.innerHTML = '';
            const myUsername = currentUser.user_metadata.username || currentUser.email;
            const myPosts = homeFeed.filter(post => post.username === `@${myUsername}` || post.username === myUsername);
            
            if(myPosts.length === 0) {
                postsContainer.innerHTML = '<p class="placeholder-text" style="text-align:center; margin-top:50px;">Aún no has publicado nada.</p>';
            } else {
                myPosts.slice().reverse().forEach(post => {
                    const hasImage = post.image && post.image.trim() !== "";
                    postsContainer.innerHTML += `
                        <div class="card">
                            <div class="card-header">
                                <img src="${post.avatar || 'https://i.pravatar.cc/150?img=11'}" alt="User Avatar" class="user-avatar">
                                <div class="user-info">
                                    <h3>${post.username || '@Usuario'}</h3>
                                    <p>Hace un momento</p>
                                </div>
                            </div>
                            <div class="card-body">
                                <p style="margin-bottom: ${hasImage ? '10px' : '0'};">${post.summary || ''}</p>
                                ${hasImage ? `<img src="${post.image}" alt="Post Image">` : ''}
                            </div>
                            <div class="card-actions">
                                <button class="btn-icon"><i class="fa-regular fa-heart"></i></button>
                                <button class="btn-icon"><i class="fa-regular fa-comment"></i></button>
                                <button class="btn-icon"><i class="fa-solid fa-share-nodes"></i></button>
                            </div>
                        </div>
                    `;
                });
            }
        }
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

                    // --- NEW CHAT LOGIC ---
                    const chatMessagesContainer = document.getElementById('chat-messages-container');
                    
                    if(chatMessagesContainer) {
                        chatMessagesContainer.innerHTML = `
                            <div class="message-bot">
                                <h3>Análisis Completado 🤖</h3>
                                <p><strong>Nombre:</strong> ${aiData.nombre || 'Desconocido'}</p>
                                <p><strong>Rareza:</strong> ${aiData.rareza || 'Normal'}</p>
                                <p><strong>Autenticidad:</strong> ${aiData.autenticidad || 'Sin verificar'}</p>
                                <p><strong>Precio Estimado:</strong> $${aiData.precioEstimado || '0'}</p>
                                <p><em>${aiData.resumen || 'Sin resumen disponible.'}</em></p>
                                <div class="chat-actions">
                                    <button class="btn-chat-action" id="chat-btn-save">➕ Guardar en mi Portafolio</button>
                                    <button class="btn-chat-action" id="chat-btn-sell">🏷️ Publicar en L4T (Mercado)</button>
                                </div>
                            </div>
                        `;
                        
                        setTimeout(() => {
                            const btnSave = document.getElementById('chat-btn-save');
                            const btnSell = document.getElementById('chat-btn-sell');
                            
                            function addBotReply(text) {
                                chatMessagesContainer.innerHTML += `
                                    <div class="message-bot" style="margin-top:10px;">
                                        <p>${text}</p>
                                    </div>
                                `;
                                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                            }
                            
                            if (btnSave) {
                                handleTap(btnSave, async () => {
                                    btnSave.disabled = true;
                                    btnSell.style.display = 'none';
                                    await saveCardToCloud('profile', {
                                        name: aiData.nombre || 'Desconocido',
                                        rarity: aiData.rareza || 'Normal',
                                        summary: aiData.resumen || ''
                                    }, true);
                                    addBotReply("¡Listo! La carta ha sido agregada a tu portafolio. 🚀");
                                });
                            }
                            
                            if (btnSell) {
                                handleTap(btnSell, async () => {
                                    btnSell.disabled = true;
                                    btnSave.style.display = 'none';
                                    let price = prompt("¿A qué precio deseas venderla ($)?", aiData.precioEstimado || "0");
                                    if(price !== null) {
                                        await saveCardToCloud('market', {
                                            name: aiData.nombre || 'Desconocido',
                                            rarity: aiData.rareza || 'Normal',
                                            summary: aiData.resumen || '',
                                            price: price
                                        }, true);
                                        addBotReply("¡Publicada con éxito en el Marketplace! 💸");
                                    } else {
                                        btnSell.disabled = false;
                                        btnSave.style.display = 'flex';
                                    }
                                });
                            }
                        }, 50);
                    }
                    // --- END CHAT LOGIC ---

                    currentEstimatedPrice = aiData.precioEstimado || "0";

                    if(cameraLoading) cameraLoading.style.display = 'none';
                    if(cameraForm) cameraForm.style.display = 'flex';
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
        const chatContainer = document.getElementById('chat-messages-container');
        if(chatContainer) chatContainer.innerHTML = "";
        currentBase64 = "";
    }

    handleTap(btnCancelScan, resetCamera);

    function resizeImage(base64Str, maxWidth = 200) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(base64Str);
        });
    }

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
    
    async function saveCardToCloud(category, extraData = {}, keepChatOpen = false) {
        try {
            if(!keepChatOpen) {
                if(cameraForm) cameraForm.style.display = 'none';
                if(cameraLoading) cameraLoading.style.display = 'flex';
                const loadingText = document.querySelector('#camera-loading .loading-text');
                if(loadingText) loadingText.innerText = "Subiendo carta a la nube...";
            }

            let publicUrl = currentBase64; 
            try {
                publicUrl = await uploadImageToSupabase(currentBase64);
            } catch (err) {
                console.warn("Usando imagen local por restricción de Storage:", err);
            }

            const newRecord = {
                category: category,
                name: "Carta",
                rarity: "Normal",
                summary: "",
                image: publicUrl,
                ...extraData
            };

            if (supabase) {
                await supabase.from('cards').insert([newRecord]);
                await loadData();
            } else {
                throw new Error("Supabase no está inicializado.");
            }

            if(!keepChatOpen) resetCamera();
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("Hubo un error al subir la carta. Comprueba tu conexión.");
            if(!keepChatOpen) resetCamera();
        }
    }

    // --- TABS DEL PERFIL ---
    const tabPortfolio = document.getElementById('tab-portfolio');
    const tabPosts = document.getElementById('tab-posts');
    const containerPortfolio = document.getElementById('profile-gallery-container');
    const containerPosts = document.getElementById('profile-posts-container');

    if(tabPortfolio && tabPosts) {
        handleTap(tabPortfolio, () => {
            tabPortfolio.classList.add('active');
            tabPosts.classList.remove('active');
            containerPortfolio.style.display = 'grid';
            containerPosts.style.display = 'none';
        });
        handleTap(tabPosts, () => {
            tabPosts.classList.add('active');
            tabPortfolio.classList.remove('active');
            containerPortfolio.style.display = 'none';
            containerPosts.style.display = 'block';
        });
    }

    // --- LÓGICA DE PUBLICACIÓN MANUAL (MODALES) ---
    const btnFabPost = document.getElementById('btn-fab-post');
    const modalNewPost = document.getElementById('modal-new-post');
    const btnClosePostModal = document.getElementById('btn-close-post-modal');
    const btnSubmitPost = document.getElementById('btn-submit-post');
    const modalPostImage = document.getElementById('modal-post-image');
    const modalPostPreview = document.getElementById('modal-post-preview');

    let postImageBase64 = "";

    if(btnFabPost) handleTap(btnFabPost, () => modalNewPost.style.display = 'flex');
    if(btnClosePostModal) handleTap(btnClosePostModal, () => modalNewPost.style.display = 'none');

    if(modalPostImage) {
        modalPostImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                postImageBase64 = event.target.result;
                modalPostPreview.src = postImageBase64;
                modalPostPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    if(btnSubmitPost) {
        handleTap(btnSubmitPost, async () => {
            const text = document.getElementById('modal-post-text').value;
            if(!text && !postImageBase64) return alert("Escribe un texto o sube una imagen.");
            
            btnSubmitPost.innerText = "Publicando...";
            btnSubmitPost.disabled = true;

            let finalImgUrl = "";
            if(postImageBase64) {
                const resized = await resizeImage(postImageBase64, 800);
                try { finalImgUrl = await uploadImageToSupabase(resized); } 
                catch(e) { finalImgUrl = resized; }
            }

            let username = "@Anonymous";
            let avatar = "https://i.pravatar.cc/150?img=11";
            if(currentUser && currentUser.user_metadata) {
                username = currentUser.user_metadata.username ? `@${currentUser.user_metadata.username}` : currentUser.email;
                if(currentUser.user_metadata.avatar_url) avatar = currentUser.user_metadata.avatar_url;
            }

            try {
                await supabase.from('cards').insert([{
                    category: 'home',
                    name: 'Post',
                    rarity: 'Normal',
                    summary: text,
                    image: finalImgUrl,
                    username: username,
                    avatar: avatar
                }]);
                await loadData();
                modalNewPost.style.display = 'none';
                document.getElementById('modal-post-text').value = "";
                postImageBase64 = "";
                modalPostPreview.style.display = 'none';
            } catch(e) {
                alert("Error al publicar.");
            } finally {
                btnSubmitPost.innerText = "Publicar";
                btnSubmitPost.disabled = false;
            }
        });
    }

    const btnFabTrade = document.getElementById('btn-fab-trade');
    const modalNewTrade = document.getElementById('modal-new-trade');
    const btnCloseTradeModal = document.getElementById('btn-close-trade-modal');
    const btnSubmitTrade = document.getElementById('btn-submit-trade');
    const modalTradeImage = document.getElementById('modal-trade-image');
    const modalTradePreview = document.getElementById('modal-trade-preview');

    let tradeImageBase64 = "";

    if(btnFabTrade) handleTap(btnFabTrade, () => modalNewTrade.style.display = 'flex');
    if(btnCloseTradeModal) handleTap(btnCloseTradeModal, () => modalNewTrade.style.display = 'none');

    if(modalTradeImage) {
        modalTradeImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                tradeImageBase64 = event.target.result;
                modalTradePreview.src = tradeImageBase64;
                modalTradePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    if(btnSubmitTrade) {
        handleTap(btnSubmitTrade, async () => {
            const name = document.getElementById('modal-trade-name').value;
            const price = document.getElementById('modal-trade-price').value;
            
            if(!name || !price || !tradeImageBase64) return alert("Nombre, precio y foto son requeridos.");
            
            btnSubmitTrade.innerText = "Publicando...";
            btnSubmitTrade.disabled = true;

            let finalImgUrl = "";
            const resized = await resizeImage(tradeImageBase64, 800);
            try { finalImgUrl = await uploadImageToSupabase(resized); } 
            catch(e) { finalImgUrl = resized; }

            try {
                await supabase.from('cards').insert([{
                    category: 'market',
                    name: name,
                    rarity: document.getElementById('modal-trade-rarity').value || 'Normal',
                    summary: document.getElementById('modal-trade-condition').value || '',
                    image: finalImgUrl,
                    price: price
                }]);
                await loadData();
                modalNewTrade.style.display = 'none';
            } catch(e) {
                alert("Error al publicar.");
            } finally {
                btnSubmitTrade.innerText = "Publicar Anuncio";
                btnSubmitTrade.disabled = false;
            }
        });
    }

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

    // --- EDICIÓN DINÁMICA DE AVATAR EN PERFIL ---
    const btnEditAvatar = document.getElementById('btn-edit-avatar');
    const profileAvatarUpload = document.getElementById('profile-avatar-upload');

    if (btnEditAvatar && profileAvatarUpload) {
        handleTap(btnEditAvatar, () => {
            profileAvatarUpload.click();
        });

        profileAvatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function(event) {
                const base64Data = event.target.result;
                const resizedBase64 = await resizeImage(base64Data, 200);
                
                const profileAvatarImg = document.getElementById('profile-avatar-img');
                if(profileAvatarImg) {
                    profileAvatarImg.src = resizedBase64;
                    profileAvatarImg.style.opacity = '0.5';
                }

                try {
                    let finalAvatarUrl = resizedBase64;
                    try {
                        finalAvatarUrl = await uploadImageToSupabase(resizedBase64);
                    } catch (uploadErr) {
                        console.warn("Fallo al subir al bucket, usando base64 directo:", uploadErr);
                    }
                    
                    const { data, error } = await supabase.auth.updateUser({
                        data: {
                            avatar_url: finalAvatarUrl
                        }
                    });
                    
                    if (error) {
                        alert(error.message);
                    } else {
                        currentUser = data.user;
                        renderProfile(); 
                    }
                } catch (err) {
                    console.error("Error al actualizar avatar:", err);
                    alert("No se pudo actualizar tu foto de perfil.");
                } finally {
                    if(profileAvatarImg) profileAvatarImg.style.opacity = '1';
                }
            };
            reader.readAsDataURL(file);
        });
    }

});