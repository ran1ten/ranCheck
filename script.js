// ========================
// ranCheck – полная версия
// ========================

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportDiv = document.getElementById('report');

// ---------- 1. ЧЁРНЫЙ СПИСОК ЗАПРЕЩЁННЫХ МОДОВ (из вашей таблицы + аналоги) ----------
const bannedModPatterns = [
    /chestesp/i, /freecam/i, /autofish/i,
    /autoclicker/i, /clicker/i, /macro/i,
    /tracers/i, /topka\s*size/i, /topkasize/i,
    /topka\s*autocommand/i, /topkaautocommand/i,
    /x-ray\s*entity/i, /xrayentity/i,
    /invmove/i,
    /nearplayerwidget/i, /near\s*player/i,
    /nameprotect/i, /nametag/i,
    /elytra\s*swap/i, /elytraswap/i,
    /minimap/i, /radar/i, /playerradar/i, /entityradar/i,
    /collision\s*fix/i, /collisionfix/i,
    // Популярные клиент-читы
    /wurst/i, /impact/i, /aristois/i, /future/i, /vape/i,
    /sigma/i, /liquidbounce/i, /kristall/i, /salhack/i,
    /killaura/i, /scaffold/i, /fly/i, /speed/i, /nuker/i,
    /cheat/i, /hack/i, /inject/i, /bypass/i, /exploit/i,
    /auto(click|mine|fish|totem)/i
];

// ---------- 2. БАЗА ОФИЦИАЛЬНЫХ МОДОВ (имя, шаблон имени, размер, известные хеши) ----------
const officialModsDB = [
    {
        name: "Just Enough Items (JEI)",
        namePattern: /^jei-[\d\w\.\-]+\.jar$/i,
        sizeMin: 1.0 * 1024 * 1024,   // 1 MB
        sizeMax: 2.0 * 1024 * 1024,   // 2 MB
        knownHashes: [
            // Реальные хеши можно добавить сюда (SHA-256)
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // демо-хеш
        ]
    },
    {
        name: "OptiFine",
        namePattern: /^OptiFine_[\d\w\.\_]+\.jar$/i,
        sizeMin: 5.5 * 1024 * 1024,
        sizeMax: 8.5 * 1024 * 1024,
        knownHashes: []
    },
    {
        name: "Sodium",
        namePattern: /^sodium-fabric-[\d\w\.\-]+\.jar$/i,
        sizeMin: 0.8 * 1024 * 1024,
        sizeMax: 1.5 * 1024 * 1024,
        knownHashes: []
    },
    {
        name: "Lithium",
        namePattern: /^lithium-fabric-[\d\w\.\-]+\.jar$/i,
        sizeMin: 0.5 * 1024 * 1024,
        sizeMax: 1.0 * 1024 * 1024,
        knownHashes: []
    },
    {
        name: "Fabric API",
        namePattern: /^fabric-api-[\d\w\.\-]+\.jar$/i,
        sizeMin: 0.6 * 1024 * 1024,
        sizeMax: 1.2 * 1024 * 1024,
        knownHashes: []
    }
];

// ---------- 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
// Вычисление SHA-256
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Проверка против официальной базы
function checkAgainstOfficialDB(fileName, fileSize, hash) {
    for (const mod of officialModsDB) {
        const nameMatches = mod.namePattern.test(fileName);
        const sizeMatches = (fileSize >= mod.sizeMin && fileSize <= mod.sizeMax);
        const hashMatches = mod.knownHashes.includes(hash);
        
        if (hashMatches) {
            return { match: true, modName: mod.name, reason: "hash", sizeMatches: true, nameMatches: true };
        }
        if (nameMatches && sizeMatches) {
            return { match: true, modName: mod.name, reason: "name+size", sizeMatches: true, nameMatches: true };
        }
        if (sizeMatches && !nameMatches) {
            return { match: false, renamed: true, expectedPattern: mod.namePattern.toString(), modName: mod.name, sizeMatches: true, nameMatches: false };
        }
        if (nameMatches && !sizeMatches) {
            return { match: false, sizeMismatch: true, expectedSize: `${(mod.sizeMin/1024/1024).toFixed(1)}-${(mod.sizeMax/1024/1024).toFixed(1)} MB`, modName: mod.name, sizeMatches: false, nameMatches: true };
        }
    }
    return { match: false, renamed: false, sizeMismatch: false };
}

// ---------- 4. ГЛАВНАЯ ФУНКЦИЯ АНАЛИЗА ----------
async function analyzeMod(file) {
    const report = {
        fileName: file.name,
        fileSize: file.size,
        fileSizeStr: (file.size / 1024).toFixed(2) + " KB",
        sha256: "",
        issues: [],
        verdict: "",
        verdictClass: "",
        details: ""
    };

    // Шаг 1: вычисляем хеш
    report.sha256 = await sha256(file);
    
    // Шаг 2: проверка по официальной базе
    const officialCheck = checkAgainstOfficialDB(file.name, file.size, report.sha256);
    
    if (officialCheck.match) {
        report.verdict = "✅ Официальный мод (подлинник)";
        report.verdictClass = "verdict-clean";
        report.issues.push(`🔹 Мод опознан как ${officialCheck.modName} (совпадение по ${officialCheck.reason === 'hash' ? 'хешу' : 'имени+размеру'})`);
    } else {
        if (officialCheck.renamed) {
            report.issues.push(`⚠️ ФАЙЛ ПЕРЕИМЕНОВАН! Ожидалось имя, похожее на: ${officialCheck.expectedPattern} (мод ${officialCheck.modName})`);
            report.verdict = "⚠️ ПЕРЕИМЕНОВАННЫЙ ФАЙЛ";
            report.verdictClass = "verdict-warning";
        } else if (officialCheck.sizeMismatch) {
            report.issues.push(`⚠️ РАЗМЕР НЕ СООТВЕТСТВУЕТ официальному диапазону для ${officialCheck.modName} (ожидается ${officialCheck.expectedSize})`);
            report.verdict = "⚠️ ИЗМЕНЁННЫЙ / НЕОФИЦИАЛЬНЫЙ ФАЙЛ";
            report.verdictClass = "verdict-warning";
        } else {
            report.issues.push(`🔍 Неизвестный файл – не найден в базе официальных модов`);
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (требуется ручная проверка)";
            report.verdictClass = "verdict-warning";
        }
    }
    
    // Шаг 3: проверка по чёрному списку запрещённых модов (имя файла)
    if (bannedModPatterns.some(p => p.test(file.name))) {
        report.issues.push("🔴 ИМЯ ФАЙЛА СОДЕРЖИТ ЗАПРЕЩЁННЫЙ МОД/ЧИТ!");
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ МОД / ЧИТ";
        report.verdictClass = "verdict-banned";
    }
    
    // Шаг 4: если это JAR/ZIP – анализ внутренностей
    if (file.name.endsWith('.jar') || file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            const fileNames = Object.keys(zip.files);
            let bannedClasses = 0;
            let foundBannedNames = [];
            
            for (const name of fileNames) {
                const lowerName = name.toLowerCase();
                if (bannedModPatterns.some(p => p.test(lowerName))) {
                    bannedClasses++;
                    if (bannedClasses <= 5) {
                        foundBannedNames.push(name);
                    }
                }
            }
            
            if (bannedClasses > 0) {
                report.issues.push(`🔴 ВНУТРИ JAR обнаружено ${bannedClasses} классов, связанных с запрещёнными модами: ${foundBannedNames.slice(0,3).join(', ')}${bannedClasses > 3 ? '...' : ''}`);
                if (report.verdictClass !== "verdict-banned") {
                    report.verdict = "🔴 ОБНАРУЖЕН ЗАПРЕЩЁННЫЙ КОД";
                    report.verdictClass = "verdict-banned";
                }
            }
            
            // Проверка манифеста (опционально)
            const manifestFile = zip.files["META-INF/MANIFEST.MF"];
            if (manifestFile) {
                const manifestContent = await manifestFile.async("string");
                const mainClassMatch = manifestContent.match(/Main-Class:\s*(.+)/);
                if (mainClassMatch) {
                    const mainClass = mainClassMatch[1];
                    if (bannedModPatterns.some(p => p.test(mainClass))) {
                        report.issues.push(`🎯 Main-Class указывает на запрещённый мод: ${mainClass}`);
                    }
                }
            }
        } catch (e) {
            report.issues.push("⚠️ Не удалось прочитать архив (возможно, повреждён или не ZIP/JAR)");
        }
    } else {
        report.issues.push("📦 Файл не является JAR/ZIP – моды Minecraft обычно имеют расширение .jar");
    }
    
    // Шаг 5: итоговое форматирование
    if (report.verdict === "") {
        if (report.issues.length === 0) {
            report.verdict = "✅ Чисто – подозрительных паттернов не найдено";
            report.verdictClass = "verdict-clean";
        } else {
            report.verdict = "⚠️ Требуется дополнительная проверка";
            report.verdictClass = "verdict-warning";
        }
    }
    
    report.details = `
        📄 Имя: ${report.fileName}<br>
        📦 Размер: ${report.fileSizeStr}<br>
        🔑 SHA-256: ${report.sha256.substring(0, 32)}…<br>
        <br>
        ${report.issues.map(i => `• ${i}`).join('<br>')}
    `;
    
    return report;
}

// ---------- 5. ОБРАБОТЧИК ЗАГРУЗКИ ФАЙЛА ----------
async function handleFile(file) {
    if (!file) return;
    
    reportDiv.innerHTML = "⏳ Анализируем мод Minecraft... (распаковка и проверка могут занять несколько секунд)";
    resultDiv.classList.remove('hidden');
    
    try {
        const result = await analyzeMod(file);
        reportDiv.innerHTML = `
            <div class="${result.verdictClass}" style="font-size:1.2rem; margin-bottom:1rem;">${result.verdict}</div>
            ${result.details}
        `;
    } catch (err) {
        console.error(err);
        reportDiv.innerHTML = "❌ Ошибка при анализе файла. Попробуйте другой файл или обновите страницу.";
    }
}

// ---------- 6. НАСТРОЙКА DRAG & DROP ----------
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.background = 'rgba(76,154,255,0.2)';
});
dropArea.addEventListener('dragleave', () => {
    dropArea.style.background = '';
});
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '';
    handleFile(e.dataTransfer.files[0]);
});
