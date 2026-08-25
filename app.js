// app.js - Collecible SPA Logic

document.addEventListener("DOMContentLoaded", () => {
    
    // --- CREDENCIALES SUPABASE ---
    const SUPABASE_URL = 'sb_publishable_6sIJpxdXdg93ntQXD29cnA_nigxf_Kn';
    const SUPABASE_KEY = 'sb_secret_udO1YjJ4gbmHSywPWP_wSg_--OOwlb3';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

    // Función auxiliar para eventos táctiles (elimina ghost-clicks y retardos)
    const handleTap = (element, callback) => {
        if(!element) return;
        const handler = (e) => {
            // Prevenir doble ejecución si es touchstart (opcional, pero útil para botones puros)
            if (e.type === 'touchstart') e.preventDefault();
            callback(e);
        };
        element.addEventListener('click', handler);
        element.addEventListener('touchstart', handler, { passive: false });
    };

    navButtons.forEach(btn => {
        handleTap(btn, () => {
            const targetViewId = btn.getAttribute('data-target');
            if (targetViewId) switchView(targetViewId);
        });
    });

    // --- FASE 8: GESTIÓN DE DATOS (SUPABASE) ---
    
    let homeFeed = [];
    let marketList = [];
    let profileCollection = [];

    // Cargar datos asíncronamente desde la nube
    async function loadData() {
        try {
            const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: true });
            
            if (error) {
                throw error;
            }

            // Clasificar los datos según su categoría
            homeFeed = data.filter(card => card.category === 'home');
            marketList = data.filter(card => card.category === 'market');
            profileCollection = data.filter(card => card.category === 'profile');

            renderAll();
        } catch (err) {
            console.error("Error cargando datos de Supabase:", err);
            // Fallback elegante
            alert("Modo Offline: No se pudieron cargar los datos de la nube. Intenta recargar.");
        }
    }

    // Renderizadores
    function renderAll() {
        renderFeed();
        renderMarket();
        renderProfile();
    }

    function renderFeed() {
        const container = document.getElementById('feed-container');
        container.innerHTML = '';
        
        if(homeFeed.length === 0) {
            container.innerHTML = '<p class="placeholder-text" style="text-align:center; margin-top:50px;">No hay publicaciones recientes. ¡Ve a la cámara y publica la primera!</p>';
            return;
        }

        homeFeed.slice().reverse().forEach(post => {
            const avatar = post.avatar || "https://i.pravatar.cc/150?img=11";
            const username = post.username || "@CJMonii";

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
                        <span class="username">${username}</span> ¡Acabo de escanear esta carta: ${post.name} [${post.rarity}]!
                    </div>
                </article>
            `;
        });
    }

    function renderMarket() {
        const container = document.getElementById('market-container');
        container.innerHTML = '';

        if(marketList.length === 0) {
            container.innerHTML = '<p class="placeholder-text" style="grid-column: span 2; text-align:center; margin-top:50px;">El mercado está vacío. ¡Pon una carta en venta!</p>';
            return;
        }

        marketList.slice().reverse().forEach(item => {
            let badgeClass = item.rarity.toLowerCase().includes('foil') || item.rarity.toLowerCase().includes('holo') ? 'badge-foil' : 'badge-mint';
            
            container.innerHTML += `
                <div class="trade-card">
                    <div class="trade-img-wrapper">
                        <span class="badge ${badgeClass}">${item.rarity.substring(0, 8)}</span>
                        <img src="${item.image}" alt="Carta">
                    </div>
                    <div class="trade-info">
                        <h4>${item.name}</h4>
                        <span class="price">Est. $${item.price}</span>
                    </div>
                    <button class="btn-offer">Ofertar</button>
                </div>
            `;
        });
    }

    function renderProfile() {
        const container = document.getElementById('profile-gallery-container');
        container.innerHTML = '';
        
        let totalValue = 0;
        
        profileCollection.slice().reverse().forEach(card => {
            container.innerHTML += `
                <div class="gallery-item"><img src="${card.image}" alt="${card.name}"></div>
            `;
            totalValue += 25; // Valor estimado genérico
        });

        document.getElementById('stat-cards').innerText = profileCollection.length;
        document.getElementById('stat-value').innerText = `$${totalValue}`;
    }

    // --- LÓGICA DE CÁMARA E IA DE VISIÓN (GEMINI) ---
    
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
    let currentEstimatedPrice = "50"; // Valor por defecto

    // LLAVE DE API DE GEMINI (Reemplaza con tu llave real)
    const GEMINI_API_KEY = 'TU_API_KEY_AQUI';

    btnScanTrigger.addEventListener('click', () => {
        ocrUpload.click();
    });

    ocrUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        cameraInitial.style.display = 'none';
        cameraLoading.style.display = 'flex';
        document.querySelector('#camera-loading .loading-text').innerText = "Analizando legitimidad y metadatos con IA...";

        const reader = new FileReader();
        reader.onload = function(event) {
            currentBase64 = event.target.result;
            scannedThumb.src = currentBase64;

            // Integración Real: Google Gemini API (Visión)
            const analyzeImageWithAI = async (base64Full) => {
                const base64Data = base64Full.split(',')[1];
                const mimeType = base64Full.split(';')[0].split(':')[1] || "image/jpeg";

                const prompt = `Actúa como un tasador y experto en autenticación de cartas TCG (Trading Card Games).
Analiza esta imagen y retorna OBLIGATORIAMENTE un JSON válido con la siguiente estructura y sin código markdown extra:
{
  "nombre": "Nombre del personaje/carta exacto",
  "rareza": "Rareza o edición detectada (ej. Foil, Holo, Base)",
  "autenticidad": "Porcentaje y veredicto (ej. '99% - Legítimo')",
  "precioEstimado": "Valor sugerido en dólares (solo el número)"
}`;

                const requestBody = {
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                };

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    const jsonText = data.candidates[0].content.parts[0].text;
                    const result = JSON.parse(jsonText);
                    
                    return result;

                } catch (error) {
                    console.error("Error en Gemini API:", error);
                    throw error;
                }
            };

            analyzeImageWithAI(currentBase64)
                .then(aiResult => {
                    scannedName.value = aiResult.nombre || "Desconocido";
                    scannedRarity.value = aiResult.rareza || "Normal";
                    
                    const scannedAuth = document.getElementById('scanned-auth');
                    if(scannedAuth) {
                        scannedAuth.value = aiResult.autenticidad || "Pendiente";
                    }

                    if(aiResult.precioEstimado) {
                        currentEstimatedPrice = aiResult.precioEstimado;
                    }

                    cameraLoading.style.display = 'none';
                    cameraForm.style.display = 'block';
                })
                .catch(err => {
                    console.error("Error de IA:", err);
                    alert("Hubo un error al analizar la imagen con Gemini. ¿Configuraste tu API KEY?");
                    resetCamera();
                });
        };
        reader.readAsDataURL(file);
    });

    function resetCamera() {
        cameraForm.style.display = 'none';
        cameraLoading.style.display = 'none';
        cameraInitial.style.display = 'flex';
        ocrUpload.value = "";
        scannedName.value = "";
        scannedRarity.value = "";
        const scannedAuth = document.getElementById('scanned-auth');
        if(scannedAuth) scannedAuth.value = "";
        currentBase64 = "";
    }

    handleTap(btnCancelScan, resetCamera);

    // --- ACCIONES DE FORMULARIO CON SUPABASE STORAGE Y DB ---

    // Función auxiliar para subir imagen a Supabase
    async function uploadImageToSupabase(base64Str) {
        // Convertir base64 a un Blob
        const res = await fetch(base64Str);
        const blob = await res.blob();
        
        // Generar un nombre único
        const fileName = `card_${Date.now()}.jpg`;
        
        // Subir a Storage
        const { data, error } = await supabase.storage.from('card-images').upload(fileName, blob);
        
        if (error) {
            console.error("Error subiendo imagen:", error);
            throw error;
        }
        
        // Obtener URL Pública
        const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(fileName);
        return publicUrl;
    }
    
    // Función genérica para guardar la carta
    async function saveCardToCloud(category, extraData = {}) {
        try {
            // UI: Mostrar loader mientras sube
            cameraForm.style.display = 'none';
            cameraLoading.style.display = 'flex';
            document.querySelector('#camera-loading .loading-text').innerText = "Subiendo carta a la nube...";

            // 1. Subir imagen
            const publicUrl = await uploadImageToSupabase(currentBase64);

            // 2. Preparar el registro para la DB
            const newRecord = {
                category: category,
                name: scannedName.value,
                rarity: scannedRarity.value,
                image: publicUrl,
                ...extraData
            };

            // 3. Insertar en Supabase Database
            const { error } = await supabase.from('cards').insert([newRecord]);
            
            if (error) throw error;

            // 4. Recargar datos frescos y actualizar UI
            await loadData();
            resetCamera();

        } catch (err) {
            console.error("Fallo al guardar en Supabase:", err);
            alert("Error al guardar en la nube. Revisa tu conexión a internet.");
            resetCamera();
        }
    }

    handleTap(document.getElementById('btn-save-profile'), async () => {
        await saveCardToCloud('profile');
        switchView('view-profile');
    });

    handleTap(document.getElementById('btn-save-home'), async () => {
        await saveCardToCloud('home', {
            username: "@CJMonii",
            avatar: "https://i.pravatar.cc/150?img=11"
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

    // --- DELEGACIÓN DE EVENTOS (EVENT DELEGATION) PARA FEED Y MARKET ---
    // Atamos los eventos a los contenedores principales para botones generados dinámicamente.
    
    const feedContainer = document.getElementById('feed-container');
    if(feedContainer) {
        handleTap(feedContainer, (e) => {
            const btn = e.target.closest('.btn-trade');
            if(btn) {
                alert("¡Has solicitado iniciar un Trade por esta carta!");
            }
        });
    }

    const marketContainer = document.getElementById('market-container');
    if(marketContainer) {
        handleTap(marketContainer, (e) => {
            const btn = e.target.closest('.btn-offer');
            if(btn) {
                alert("¡Oferta enviada al vendedor!");
            }
        });
    }

    // Iniciar aplicación cargando datos
    loadData();
});
