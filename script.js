// ========================
// ranCheck – полная версия с поддержкой версий
// ========================

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportDiv = document.getElementById('report');
const mcVersionInput = document.getElementById('mcVersion');
const modVersionInput = document.getElementById('modVersion');
const autoDetectBtn = document.getElementById('autoDetectBtn');

// ---------- 1. ЧЁРНЫЙ СПИСОК ЗАПРЕЩЁННЫХ МОДОВ ----------
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
    /wurst/i, /impact/i, /aristois/i, /future/i, /vape/i,
    /sigma/i, /liquidbounce/i, /kristall/i, /salhack/i,
    /killaura/i, /scaffold/i, /fly/i, /speed/i, /nuker/i,
    /cheat/i, /hack/i, /inject/i, /bypass/i, /exploit/i,
    /auto(click|mine|fish|totem)/i
];

// ---------- 2. БАЗА ОФИЦИАЛЬНЫХ МОДОВ (с поддержкой версий) ----------
const officialModsDB = [
    {
        name: "Just Enough Items (JEI)",
        namePattern: /^jei-([\d\.]+)-([\d\.]+)\.jar$/i,  // группы: версия MC, версия мода
        sizeMin: 1.0 * 1024 * 1024,
        sizeMax: 2.0 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.20.1", "1.19.2", "1.18.2", "1.16.5"],
        latestModVersion: "15.8.5.12"
    },
    {
        name: "OptiFine",
        namePattern: /^OptiFine_([\d\.]+)_(HD_U_[\w]+)\.jar$/i,
        sizeMin: 5.5 * 1024 * 1024,
        sizeMax: 8.5 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.15.2", "1.14.4", "1.12.2"],
        latestModVersion: "HD_U_I6"
    },
    {
        name: "Sodium",
        namePattern: /^sodium-fabric-([\d\.]+)-([\d\.\+]+)\.jar$/i,
        sizeMin: 0.8 * 1024 * 1024,
        sizeMax: 1.5 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
        latestModVersion: "0.5.3"
    },
    {
        name: "Lithium",
        namePattern: /^lithium-fabric-([\d\.]+)-([\d\.\+]+)\.jar$/i,
        sizeMin: 0.5 * 1024 * 1024,
        sizeMax: 1.0 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
        latestModVersion: "0.11.2"
    },
    {
        name: "Fabric API",
        namePattern: /^fabric-api-([\d\.]+)-([\d\.\+]+)\.jar$/i,
        sizeMin: 0.6 * 1024 * 1024,
        sizeMax: 1.2 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
        latestModVersion: "0.88.1"
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

// Извлечение версий из имени файла (автоматически)
function extractVersionsFromFilename(filename) {
    for (const mod of officialModsDB) {
        const match = filename.match(mod.namePattern);
        if (match) {
            // Первая группа - версия Minecraft, вторая - версия мода
            let mcVersion = match[1] || null;
            let modVersion = match[2] || null;
            return { modName: mod.name, mcVersion, modVersion, pattern: mod.namePattern };
        }
    }
    return null;
}

// Проверка версии на совместимость и актуальность
function checkVersionCompatibility(mod, mcVersion, modVersion) {
    const issues = [];
    if (mcVersion && mod.supportedMCVersions && !mod.supportedMCVersions.includes(mcVersion)) {
        issues.push(`⚠️ Версия Minecraft ${mcVersion} не указана в официально поддерживаемых для ${mod.name} (поддерживаются: ${mod.supportedMCVersions.join(', ')})`);
    }
    if (modVersion && mod.latestModVersion && modVersion !== mod.latestModVersion) {
        issues.push(`📢 Версия мода ${modVersion} устарела. Актуальная версия: ${mod.latestModVersion}`);
    }
    return issues;
}

// Проверка против официальной базы (с учётом версий)
function checkAgainstOfficialDB(fileName, fileSize, hash, mcVersion, modVersion) {
    for (const mod of officialModsDB) {
        const nameMatches = mod.namePattern.test(fileName);
        const sizeMatches = (fileSize >= mod.sizeMin && fileSize <= mod.sizeMax);
        const hashMatches = mod.knownHashes.includes(hash);
        
        // Если есть точное совпадение по шаблону имени, извлекаем версии из имени
        let extracted = null;
        if (nameMatches) {
            extracted = extractVersionsFromFilename(fileName);
        }
        
        const finalMcVersion = mcVersion || (extracted ? extracted.mcVersion : null);
        const finalModVersion = modVersion || (extracted ? extracted.modVersion : null);
        
        if (hashMatches || (nameMatches && sizeMatches)) {
            const versionIssues = checkVersionCompatibility(mod, finalMcVersion, finalModVersion);
            return {
                match: true,
                modName: mod.name,
                reason: hashMatches ? "hash" : "name+size",
                sizeMatches: true,
                nameMatches: true,
                versionIssues: versionIssues,
                extractedMcVersion: extracted?.mcVersion,
                extractedModVersion: extracted?.modVersion
            };
        }
        
        if (sizeMatches && !nameMatches) {
            return {
                match: false,
                renamed: true,
                expectedPattern: mod.namePattern.toString(),
                modName: mod.name,
                sizeMatches: true,
                nameMatches: false
            };
        }
        
        if (nameMatches && !sizeMatches) {
            return {
                match: false,
                sizeMismatch: true,
                expectedSize: `${(mod.sizeMin/1024/1024).toFixed(1)}-${(mod.sizeMax/1024/1024).toFixed(1)} MB`,
                modName: mod.name,
                sizeMatches: false,
                nameMatches: true,
                extractedMcVersion: extracted?.mcVersion,
                extractedModVersion: extracted?.modVersion
            };
        }
    }
    return { match: false, renamed: false, sizeMismatch: false };
}

// Автоматическое заполнение версий при клике на кнопку
autoDetectBtn.addEventListener('click', () => {
    const fileName = fileInput.files[0]?.name;
    if (!fileName) {
        alert("Сначала загрузите файл");
        return;
    }
    const extracted = extractVersionsFromFilename(fileName);
    if (extracted) {
        if (extracted.mcVersion) mcVersionInput.value = extracted.mcVersion;
        if (extracted.modVersion) modVersionInput.value = extracted.modVersion;
        reportDiv.innerHTML = `🔍 Извлечено: версия Minecraft = ${extracted.mcVersion || 'не определена'}, версия мода = ${extracted.modVersion || 'не определена'}`;
        resultDiv.classList.remove('hidden');
    } else {
        reportDiv.innerHTML = "❌ Не удалось извлечь версии из имени файла. Укажите их вручную.";
        resultDiv.classList.remove('hidden');
    }
});

// ---------- 4. ГЛАВНАЯ ФУНКЦИЯ АНАЛИЗА ----------
async function analyzeMod(file, mcVersion, modVersion) {
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

    report.sha256 = await sha256(file);
    
    const officialCheck = checkAgainstOfficialDB(file.name, file.size, report.sha256, mcVersion, modVersion);
    
    if (officialCheck.match) {
        report.verdict = "✅ Официальный мод (подлинник)";
        report.verdictClass = "verdict-clean";
        report.issues.push(`🔹 Мод опознан как ${officialCheck.modName} (совпадение по ${officialCheck.reason === 'hash' ? 'хешу' : 'имени+размеру'})`);
        if (officialCheck.extractedMcVersion) report.issues.push(`📌 Обнаружена версия Minecraft: ${officialCheck.extractedMcVersion}`);
        if (officialCheck.extractedModVersion) report.issues.push(`📌 Обнаружена версия мода: ${officialCheck.extractedModVersion}`);
        if (officialCheck.versionIssues && officialCheck.versionIssues.length) {
            report.issues.push(...officialCheck.versionIssues);
            if (officialCheck.versionIssues.some(i => i.includes('не указана в официально поддерживаемых'))) {
                report.verdict = "⚠️ Совместимость под вопросом (версия Minecraft не поддерживается)";
                report.verdictClass = "verdict-warning";
            }
        }
    } else {
        if (officialCheck.renamed) {
            report.issues.push(`⚠️ ФАЙЛ ПЕРЕИМЕНОВАН! Ожидалось имя, похожее на: ${officialCheck.expectedPattern} (мод ${officialCheck.modName})`);
            report.verdict = "⚠️ ПЕРЕИМЕНОВАННЫЙ ФАЙЛ";
            report.verdictClass = "verdict-warning";
        } else if (officialCheck.sizeMismatch) {
            report.issues.push(`⚠️ РАЗМЕР НЕ СООТВЕТСТВУЕТ официальному диапазону для ${officialCheck.modName} (ожидается ${officialCheck.expectedSize})`);
            report.verdict = "⚠️ ИЗМЕНЁННЫЙ / НЕОФИЦИАЛЬНЫЙ ФАЙЛ";
            report.verdictClass = "verdict-warning";
            if (officialCheck.extractedMcVersion) report.issues.push(`📌 Извлечена версия Minecraft: ${officialCheck.extractedMcVersion}`);
            if (officialCheck.extractedModVersion) report.issues.push(`📌 Извлечена версия мода: ${officialCheck.extractedModVersion}`);
        } else {
            report.issues.push(`🔍 Неизвестный файл – не найден в базе официальных модов`);
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (требуется ручная проверка)";
            report.verdictClass = "verdict-warning";
        }
    }
    
    // Чёрный список
    if (bannedModPatterns.some(p => p.test(file.name))) {
        report.issues.push("🔴 ИМЯ ФАЙЛА СОДЕРЖИТ ЗАПРЕЩЁННЫЙ МОД/ЧИТ!");
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ МОД / ЧИТ";
        report.verdictClass = "verdict-banned";
    }
    
    // Анализ JAR
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
                    if (bannedClasses <= 5) foundBannedNames.push(name);
                }
            }
            if (bannedClasses > 0) {
                report.issues.push(`🔴 ВНУТРИ JAR обнаружено ${bannedClasses} классов, связанных с запрещёнными модами: ${foundBannedNames.slice(0,3).join(', ')}${bannedClasses > 3 ? '...' : ''}`);
                if (report.verdictClass !== "verdict-banned") {
                    report.verdict = "🔴 ОБНАРУЖЕН ЗАПРЕЩЁННЫЙ КОД";
                    report.verdictClass = "verdict-banned";
                }
            }
            const manifestFile = zip.files["META-INF/MANIFEST.MF"];
            if (manifestFile) {
                const manifestContent = await manifestFile.async("string");
                const mainClassMatch = manifestContent.match(/Main-Class:\s*(.+)/);
                if (mainClassMatch && bannedModPatterns.some(p => p.test(mainClassMatch[1]))) {
                    report.issues.push(`🎯 Main-Class указывает на запрещённый мод: ${mainClassMatch[1]}`);
                }
            }
        } catch (e) {
            report.issues.push("⚠️ Не удалось прочитать архив (возможно, повреждён или не ZIP/JAR)");
        }
    } else {
        report.issues.push("📦 Файл не является JAR/ZIP – моды Minecraft обычно имеют расширение .jar");
    }
    
    if (report.verdict === "") {
        report.verdict = report.issues.length === 0 ? "✅ Чисто – подозрительных паттернов не найдено" : "⚠️ Требуется дополнительная проверка";
        report.verdictClass = report.issues.length === 0 ? "verdict-clean" : "verdict-warning";
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

// ---------- 5. ОБРАБОТЧИК ЗАГРУЗКИ ----------
async function handleFile(file) {
    if (!file) return;
    const mcVersion = mcVersionInput.value.trim();
    const modVersion = modVersionInput.value.trim();
    reportDiv.innerHTML = "⏳ Анализируем мод Minecraft... (распаковка и проверка могут занять несколько секунд)";
    resultDiv.classList.remove('hidden');
    try {
        const result = await analyzeMod(file, mcVersion, modVersion);
        reportDiv.innerHTML = `
            <div class="${result.verdictClass}" style="font-size:1.2rem; margin-bottom:1rem;">${result.verdict}</div>
            ${result.details}
        `;
    } catch (err) {
        console.error(err);
        reportDiv.innerHTML = "❌ Ошибка при анализе файла. Попробуйте другой файл или обновите страницу.";
    }
}

// ---------- 6. НАСТРОЙКА СОБЫТИЙ ----------
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
