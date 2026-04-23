// ========================
// ranCheck – с авторизацией по коду из Telegram
// ========================

// ---------- КОНФИГУРАЦИЯ ----------
const API_URL = "https://rancheck-bot.onrender.com/verify"; // ЗАМЕНИТЕ на URL вашего сервера на Render

// ---------- УПРАВЛЕНИЕ ПАНЕЛЯМИ ----------
const loginPanel = document.getElementById('loginPanel');
const mainPanel = document.getElementById('mainPanel');
const codeInput = document.getElementById('codeInput');
const submitBtn = document.getElementById('submitCode');
const loginMessage = document.getElementById('loginMessage');

// Проверяем, есть ли уже токен в sessionStorage
const accessToken = sessionStorage.getItem('ranCheckToken');
if (accessToken) {
    // Токен есть – сразу показываем основной интерфейс
    loginPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
    initMainApp(); // запускаем основной функционал
} else {
    // Нет токена – показываем форму входа
    loginPanel.classList.remove('hidden');
    mainPanel.classList.add('hidden');
    
    submitBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) {
            loginMessage.innerText = "❌ Введите код";
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            loginMessage.innerText = "❌ Код должен состоять из 6 цифр";
            return;
        }
        loginMessage.innerText = "⏳ Проверка...";
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Сохраняем токен (можно просто true, но сохраним для истории)
                sessionStorage.setItem('ranCheckToken', data.token);
                loginMessage.innerText = "✅ Доступ разрешён! Загрузка...";
                // Переключаем интерфейс
                loginPanel.classList.add('hidden');
                mainPanel.classList.remove('hidden');
                initMainApp();
            } else {
                loginMessage.innerText = "❌ " + (data.detail || "Неверный код");
            }
        } catch (err) {
            console.error(err);
            loginMessage.innerText = "❌ Ошибка соединения с сервером. Попробуйте позже.";
        }
    });
}

// ---------- ОСНОВНАЯ ЛОГИКА ПРОВЕРКИ МОДОВ (ваш существующий код) ----------
function initMainApp() {
    // (Ниже скопирован ваш рабочий код из предыдущих версий)
    // Я привожу его сокращённо, но вы должны вставить сюда весь свой функционал.
    // Для краткости я вставлю полную версию из предыдущего сообщения (с поддержкой множественной загрузки и анализа).
    // Если у вас была своя доработанная версия – замените эту функцию на неё.
    
    // ---------- Элементы ----------
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const mcVersionInput = document.getElementById('mcVersion');
    const modVersionInput = document.getElementById('modVersion');
    const autoDetectBtn = document.getElementById('autoDetectBtn');
    const progressArea = document.getElementById('progressArea');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // ---------- Чёрный список ----------
    const bannedModPatterns = [
        /chestesp/i, /freecam/i, /autofish/i, /autoclicker/i, /clicker/i, /macro/i,
        /tracers/i, /topka\s*size/i, /topkasize/i, /topka\s*autocommand/i, /topkaautocommand/i,
        /x-ray\s*entity/i, /xrayentity/i, /invmove/i, /nearplayerwidget/i, /near\s*player/i,
        /nameprotect/i, /nametag/i, /elytra\s*swap/i, /elytraswap/i,
        /minimap/i, /radar/i, /playerradar/i, /entityradar/i, /collision\s*fix/i, /collisionfix/i,
        /wurst/i, /impact/i, /aristois/i, /future/i, /vape/i, /sigma/i, /liquidbounce/i,
        /kristall/i, /salhack/i, /killaura/i, /scaffold/i, /fly/i, /speed/i, /nuker/i,
        /cheat/i, /hack/i, /inject/i, /bypass/i, /exploit/i, /auto(click|mine|fish|totem)/i
    ];
    
    const trustedMods = [
        { name: "Fabric API", keywords: ["fabric-api", "fabricapi"] },
        { name: "Sodium", keywords: ["sodium", "sodium-fabric"] },
        { name: "Lithium", keywords: ["lithium"] },
        { name: "Just Enough Items (JEI)", keywords: ["jei", "justenoughitems"] },
        { name: "OptiFine", keywords: ["optifine"] },
        { name: "Iris Shaders", keywords: ["iris"] },
        { name: "Phosphor", keywords: ["phosphor"] },
        { name: "Starlight", keywords: ["starlight"] },
        { name: "Continuity", keywords: ["continuity"] },
        { name: "Indium", keywords: ["indium"] }
    ];
    
    // ---------- Функции определения версий (упрощённо, можно расширить) ----------
    function isMinecraftVersion(v) {
        return /^1\.(16\.[5-9]|1[7-9]\.\d+|20\.\d+|21\.[0-9])(\.\d+)?$/.test(v);
    }
    function extractVersions(filename) {
        const parts = filename.match(/\d+(?:\.\d+)+/g) || [];
        let mc = null, mod = null;
        for (let p of parts) {
            if (isMinecraftVersion(p)) mc = p;
            else mod = p;
        }
        return { mc, mod };
    }
    function identifyModName(filename) {
        const lower = filename.toLowerCase();
        for (let mod of trustedMods) {
            for (let kw of mod.keywords) {
                if (lower.includes(kw)) return mod.name;
            }
        }
        const match = filename.match(/^([a-z0-9]+(?:[-_][a-z0-9]+)*)/i);
        return match ? match[1] : null;
    }
    
    async function sha256(file) {
        const buffer = await file.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    
    async function analyzeOne(file, mcVer, modVer) {
        const report = { fileName: file.name, fileSize: file.size, fileSizeStr: (file.size/1024).toFixed(2)+' KB', sha256: '', issues: [], verdict: '', verdictClass: '' };
        report.sha256 = await sha256(file);
        const detectedName = identifyModName(file.name);
        const isTrusted = trustedMods.some(m => m.keywords.some(kw => file.name.toLowerCase().includes(kw)));
        if (isTrusted) {
            report.verdict = `✅ Легитимный мод (${detectedName || '?'})`;
            report.verdictClass = "verdict-clean";
            report.issues.push("Мод из списка доверенных.");
        } else {
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (нет в доверенных)";
            report.verdictClass = "verdict-warning";
            report.issues.push("Мод не опознан. Проверьте вручную.");
        }
        report.details = `📄 ${report.fileName}<br>📦 ${report.fileSizeStr}<br>🔑 ${report.sha256.substring(0,32)}…<br><br>${report.issues.map(i=>'• '+i).join('<br>')}`;
        return report;
    }
    
    async function processFiles(files, manualMc, manualMod) {
        resultsContainer.innerHTML = '';
        progressArea.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.innerText = `0 / ${files.length}`;
        for (let i = 0; i < files.length; i++) {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `<div class="verdict">⏳ Проверка: ${escapeHtml(files[i].name)}</div><div class="details">Анализируем...</div>`;
            resultsContainer.appendChild(card);
            try {
                const report = await analyzeOne(files[i], manualMc, manualMod);
                card.innerHTML = `<div class="verdict ${report.verdictClass}">${escapeHtml(report.verdict)}</div><div class="details">${report.details}</div>`;
            } catch(e) {
                card.innerHTML = `<div class="verdict verdict-warning">❌ Ошибка</div><div class="details">${escapeHtml(files[i].name)}: ${e.message}</div>`;
            }
            const percent = ((i+1)/files.length)*100;
            progressFill.style.width = `${percent}%`;
            progressText.innerText = `${i+1} / ${files.length}`;
            await new Promise(r => setTimeout(r, 50));
        }
        setTimeout(() => progressArea.classList.add('hidden'), 2000);
    }
    
    function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]); }
    
    function handleFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const files = Array.from(fileList).filter(f => f.name.endsWith('.jar') || f.name.endsWith('.zip'));
        if (!files.length) { alert("Выберите файлы .jar или .zip"); return; }
        const manualMc = mcVersionInput.value.trim();
        const manualMod = modVersionInput.value.trim();
        processFiles(files, manualMc, manualMod);
    }
    
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleFiles(e.target.files));
    dropArea.addEventListener('dragover', e => e.preventDefault());
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });
    autoDetectBtn.addEventListener('click', () => {
        if (fileInput.files.length) {
            const { mc, mod } = extractVersions(fileInput.files[0].name);
            if (mc) mcVersionInput.value = mc;
            if (mod) modVersionInput.value = mod;
        } else alert("Сначала загрузите файл");
    });
}
