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

    // --- ASISTENTE IA (CHAT MULTI-TURNO) ---
    const ocrUpload = document.getElementById('ocr-upload');
    const btnAttachImage = document.getElementById('btn-attach-image');
    const chatInputText = document.getElementById('chat-input-text');
    const btnChatSend = document.getElementById('btn-chat-send');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const chatUploadProgress = document.getElementById('chat-upload-progress');

    let aiChatHistory = [];
    let currentBase64 = "";
    
    try {
        const savedHistory = localStorage.getItem('aiChatHistory');
        if (savedHistory) {
            aiChatHistory = JSON.parse(savedHistory);
        }
    } catch (e) { console.warn("Error cargando historial de chat", e); }
    
    // 🚨 PON TU CLAVE DE GEMINI AQUÍ ABAJO 🚨
    const GEMINI_API_KEY = 'AQ.Ab8RN6Lb0bdZsydMaS3j8zkWxyfWDDFBvyPyHn9X8ngWIJHepw';

    const SYSTEM_PROMPT = `Eres Collecible AI, el experto tasador oficial de una app de TCG (Trading Card Games).
Tu trabajo es responder amigablemente, ayudar a los usuarios a identificar sus cartas cuando envíen imágenes, y estimar sus precios de mercado.
Responde de manera concisa y usa formato markdown si es necesario.`;

    function appendMessage(role, text, imageSrc = null) {
        if (!chatMessagesContainer) return;
        
        let msgHtml = '';
        if (role === 'user') {
            msgHtml = `<div class="message-user">`;
            if (imageSrc) msgHtml += `<img src="${imageSrc}" alt="Imagen subida">`;
            if (text) msgHtml += `<p>${text}</p>`;
            msgHtml += `</div>`;
        } else {
            msgHtml = `
            <div class="message-bot">
                <h3>Collecible AI 🤖</h3>
                <p>${text}</p>
            </div>`;
        }
        
        chatMessagesContainer.innerHTML += msgHtml;
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    function saveChatHistory() {
        try {
            localStorage.setItem('aiChatHistory', JSON.stringify(aiChatHistory));
        } catch(e) {
            console.warn("Límite de memoria local alcanzado para el chat.", e);
        }
    }

    function renderChatHistory() {
        if (!chatMessagesContainer) return;
        if (aiChatHistory.length > 0) {
            chatMessagesContainer.innerHTML = '';
            aiChatHistory.forEach(msg => {
                if (msg.role === 'user') {
                    let text = "";
                    let img = null;
                    msg.parts.forEach(p => {
                        if (p.text) text = p.text;
                        if (p.inline_data) img = `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`;
                    });
                    appendMessage('user', text, img);
                } else if (msg.role === 'model') {
                    let text = msg.parts[0]?.text || "✅ Ejecutado";
                    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    appendMessage('model', formattedText);
                }
            });
        }
    }

    // Renderizar historial al cargar
    renderChatHistory();

    async function sendToGemini(text, base64Str = null) {
        if (!text && !base64Str) return;

        let userParts = [];
        if (text) userParts.push({ text: text });
        
        let dynamicMimeType = 'image/jpeg';
        let rawBase64 = null;

        if (base64Str) {
            const mimeTypeMatch = base64Str.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
            if (mimeTypeMatch) dynamicMimeType = mimeTypeMatch[1];
            rawBase64 = base64Str.split(',')[1];
            userParts.push({
                inline_data: { mime_type: dynamicMimeType, data: rawBase64 }
            });
        }
        
        appendMessage('user', text, base64Str);
        aiChatHistory.push({ role: 'user', parts: userParts });

        if (chatUploadProgress) {
            chatUploadProgress.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> IA Pensando... 🧠';
            chatUploadProgress.style.display = 'block';
        }
        if (chatInputText) chatInputText.disabled = true;
        if (btnChatSend) btnChatSend.disabled = true;

        try {
            const payload = {
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: aiChatHistory,
                tools: [{
                    function_declarations: [{
                        name: "guardar_en_portfolio",
                        description: "Guarda la última carta de la que estamos hablando en el portafolio del usuario. Úsalo SOLO si el usuario te pide explícitamente guardar la carta, foto o añadirla a su colección.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                nombre: { type: "STRING", description: "El nombre de la carta identificada" },
                                precioEstimado: { type: "STRING", description: "Precio estimado en dólares" }
                            },
                            required: ["nombre"]
                        }
                    }]
                }]
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) throw new Error('Error en API Gemini');
            const data = await response.json();
            
            const parts = data.candidates[0].content.parts;
            let modelText = "";
            let functionCall = null;
            
            parts.forEach(part => {
                if (part.text) modelText += part.text;
                if (part.functionCall) functionCall = part.functionCall;
            });
            
            if (functionCall && functionCall.name === 'guardar_en_portfolio') {
                if (chatUploadProgress) {
                    chatUploadProgress.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardando carta en el servidor...';
                    chatUploadProgress.style.display = 'block';
                }
                
                let lastImageBase64 = null;
                for (let i = aiChatHistory.length - 1; i >= 0; i--) {
                    if (aiChatHistory[i].role === 'user') {
                        const inlineData = aiChatHistory[i].parts.find(p => p.inline_data);
                        if (inlineData) {
                            lastImageBase64 = `data:${inlineData.inline_data.mime_type};base64,${inlineData.inline_data.data}`;
                            break;
                        }
                    }
                }

                if (lastImageBase64 && supabase) {
                    let publicUrl = lastImageBase64;
                    try { publicUrl = await uploadImageToSupabase(lastImageBase64); } catch(e) {}
                    
                    await supabase.from('cards').insert([{
                        category: 'profile',
                        name: functionCall.args.nombre || 'Desconocido',
                        rarity: 'Normal',
                        summary: 'Guardado desde Asistente IA',
                        image: publicUrl
                    }]);
                    
                    const successMsg = `¡Listo! He guardado **${functionCall.args.nombre || 'tu carta'}** en tu portafolio exitosamente. ✅`;
                    appendMessage('model', successMsg);
                    aiChatHistory.push({ role: 'model', parts: [{ text: successMsg }] });
                    await loadData();
                } else {
                    const failMsg = "No encuentro ninguna foto reciente en el chat para guardar, o no estoy conectado.";
                    appendMessage('model', failMsg);
                    aiChatHistory.push({ role: 'model', parts: [{ text: failMsg }] });
                }
            } else if (modelText) {
                const formattedText = modelText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                appendMessage('model', formattedText);
                aiChatHistory.push({ role: 'model', parts: [{ text: modelText }] });
            }
            
            saveChatHistory();

        } catch (error) {
            console.error("Gemini Error:", error);
            appendMessage('model', 'Lo siento, hubo un problema al procesar tu solicitud. ¿Puedes intentarlo de nuevo?');
        } finally {
            if (chatUploadProgress) chatUploadProgress.style.display = 'none';
            if (chatInputText) chatInputText.disabled = false;
            if (btnChatSend) btnChatSend.disabled = false;
            if (chatInputText) chatInputText.focus();
        }
    }

    if (btnAttachImage && ocrUpload) {
        handleTap(btnAttachImage, () => ocrUpload.click());
        
        ocrUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (chatUploadProgress) {
                chatUploadProgress.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando imagen...';
                chatUploadProgress.style.display = 'block';
            }
            
            const reader = new FileReader();
            reader.onload = async function(event) {
                const optimizedBase64 = await resizeImage(event.target.result, 512);
                
                const textToSend = chatInputText.value.trim();
                chatInputText.value = '';
                
                await sendToGemini(textToSend || "¿Me puedes ayudar con esta carta?", optimizedBase64);
                ocrUpload.value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnChatSend && chatInputText) {
        const handleSend = async () => {
            const text = chatInputText.value.trim();
            if (!text) return;
            chatInputText.value = '';
            await sendToGemini(text, null);
        };
        handleTap(btnChatSend, handleSend);
        chatInputText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    const btnClearChat = document.getElementById('btn-clear-chat');
    if (btnClearChat) {
        handleTap(btnClearChat, () => {
            if(confirm("¿Seguro que quieres limpiar todo el historial del chat?")) {
                aiChatHistory = [];
                localStorage.removeItem('aiChatHistory');
                if (chatMessagesContainer) {
                    chatMessagesContainer.innerHTML = `
                        <div class="message-bot">
                            <h3>Collecible AI 🤖</h3>
                            <p>¡Hola! Soy tu tasador experto. Escríbeme o envíame la foto de una carta para que te ayude a identificarla y valorarla.</p>
                        </div>
                    `;
                }
            }
        });
    }

    function resizeImage(base64Str, maxWidth = 800) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = height * ratio;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
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
    
    if(btnEditAvatar && profileAvatarUpload) {
        btnEditAvatar.addEventListener('click', () => {
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