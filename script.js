// ========================
// ranCheck – финальная версия с поддержкой 1.21.4
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

// ---------- 2. БАЗА ОФИЦИАЛЬНЫХ МОДОВ (с поддержкой 1.21.4) ----------
const officialModsDB = [
    {
        name: "Just Enough Items (JEI)",
        nameKeywords: ["jei", "justenoughitems"],
        sizeMin: 1.0 * 1024 * 1024,
        sizeMax: 3.0 * 1024 * 1024,   // увеличен для новых версий
        knownHashes: [],
        supportedMCVersions: ["1.21.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5"],
        latestModVersion: "17.0.0"
    },
    {
        name: "OptiFine",
        nameKeywords: ["optifine"],
        sizeMin: 5.5 * 1024 * 1024,
        sizeMax: 9.0 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.21.4", "1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.15.2", "1.14.4", "1.12.2"],
        latestModVersion: "HD_U_I6"
    },
    {
        name: "Sodium",
        nameKeywords: ["sodium"],
        sizeMin: 0.8 * 1024 * 1024,
        sizeMax: 1.8 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.21.4", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
        latestModVersion: "0.5.3"
    },
    {
        name: "Lithium",
        nameKeywords: ["lithium"],
        sizeMin: 0.5 * 1024 * 1024,
        sizeMax: 1.2 * 1024 * 1024,
        knownHashes: [],
        supportedMCVersions: ["1.21.4", "1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5"],
        latestModVersion: "0.11.2"
    },
    {
        name: "Fabric API",
        nameKeywords: ["fabric-api", "fabricapi", "fabric", "fabric-api-"],
        sizeMin: 0.4 * 1024 * 1024,
        sizeMax: 2.5 * 1024 * 1024,   // широкий диапазон для всех версий
        knownHashes: [],
        supportedMCVersions: ["1.21.4", "1.20.1", "1.19.2", "1.18.2", "1.17.1", "1.16.5", "1.15.2", "1.14.4"],
        latestModVersion: "0.92.0"
    }
];

// ---------- 3. ФУНКЦИИ ДЛЯ РАБОТЫ С ВЕРСИЯМИ ----------
function isMinecraftVersion(versionStr) {
    if (!versionStr) return false;
    const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return false;
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    if (major === 1) {
        if (minor === 16 && patch >= 5) return true;
        if (minor >= 17 && minor <= 20) return true;
        if (minor === 21 && patch <= 11) return true;
    }
    return false;
}

function extractAllVersionCandidates(filename) {
    const candidates = [];
    const patterns = [
        /\b(\d+\.\d+\.\d+)\b/g,
        /\b(\d+\.\d+)\b/g,
        /\b([A-Za-z]+_\d+[A-Za-z\d]*)\b/g,
        /\b([A-Za-z]+\d+)\b/g
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(filename)) !== null) {
            if (!candidates.includes(match[1])) candidates.push(match[1]);
        }
    });
    return candidates;
}

function identifyVersions(filename) {
    const candidates = extractAllVersionCandidates(filename);
    let mcVersion = null;
    let modVersion = null;
    for (const cand of candidates) {
        if (isMinecraftVersion(cand)) {
            mcVersion = cand;
            break;
        }
    }
    if (mcVersion) {
        const otherVersions = candidates.filter(c => c !== mcVersion);
        if (otherVersions.length > 0) {
            modVersion = otherVersions[0];
        }
    } else {
        if (candidates.length > 0) modVersion = candidates.join(', ');
    }
    return { mcVersion, modVersion };
}

function autoDetectVersions() {
    const fileName = fileInput.files[0]?.name;
    if (!fileName) {
        alert("Сначала загрузите файл");
        return false;
    }
    const { mcVersion, modVersion } = identifyVersions(fileName);
    if (mcVersion) mcVersionInput.value = mcVersion;
    if (modVersion) modVersionInput.value = modVersion;
    let msg = `🔍 Извлечено:`;
    if (mcVersion) msg += ` версия Minecraft = ${mcVersion}`;
    if (modVersion) msg += `, версия мода = ${modVersion}`;
    if (!mcVersion && !modVersion) msg = "❌ Не удалось извлечь версии из имени файла. Укажите их вручную.";
    reportDiv.innerHTML = msg;
    resultDiv.classList.remove('hidden');
    return true;
}

autoDetectBtn.addEventListener('click', autoDetectVersions);

// ---------- 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function identifyModByName(filename) {
    const lowerName = filename.toLowerCase();
    for (const mod of officialModsDB) {
        for (const kw of mod.nameKeywords) {
            if (lowerName.includes(kw)) {
                return mod;
            }
        }
    }
    return null;
}

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

function checkAgainstOfficialDB(fileName, fileSize, hash, mcVersion, modVersion) {
    const identifiedMod = identifyModByName(fileName);
    if (!identifiedMod) {
        return { match: false, renamed: false, sizeMismatch: false, modName: null };
    }
    const sizeMatches = (fileSize >= identifiedMod.sizeMin && fileSize <= identifiedMod.sizeMax);
    const hashMatches = identifiedMod.knownHashes.includes(hash);
    if (hashMatches || sizeMatches) {
        const versionIssues = checkVersionCompatibility(identifiedMod, mcVersion, modVersion);
        return {
            match: true,
            modName: identifiedMod.name,
            reason: hashMatches ? "hash" : "size",
            sizeMatches: sizeMatches,
            hashMatches: hashMatches,
            versionIssues: versionIssues
        };
    } else {
        return {
            match: false,
            modName: identifiedMod.name,
            sizeMismatch: true,
            expectedSize: `${(identifiedMod.sizeMin/1024/1024).toFixed(1)}-${(identifiedMod.sizeMax/1024/1024).toFixed(1)} MB`
        };
    }
}

// ---------- 5. ГЛАВНАЯ ФУНКЦИЯ АНАЛИЗА ----------
async function analyzeMod(file, manualMcVersion, manualModVersion) {
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
    
    let mcVersion = manualMcVersion;
    let modVersion = manualModVersion;
    if (!mcVersion && !modVersion) {
        const auto = identifyVersions(file.name);
        mcVersion = auto.mcVersion;
        modVersion = auto.modVersion;
        if (mcVersion) report.issues.push(`🔍 Автоопределение: версия Minecraft = ${mcVersion}`);
        if (modVersion) report.issues.push(`🔍 Автоопределение: версия мода = ${modVersion}`);
    } else {
        if (mcVersion) report.issues.push(`📌 Версия Minecraft указана вручную: ${mcVersion}`);
        if (modVersion) report.issues.push(`📌 Версия мода указана вручную: ${modVersion}`);
    }
    
    const officialCheck = checkAgainstOfficialDB(file.name, file.size, report.sha256, mcVersion, modVersion);
    
    if (officialCheck.match) {
        report.verdict = "✅ Официальный мод (подлинник)";
        report.verdictClass = "verdict-clean";
        report.issues.push(`🔹 Мод опознан как ${officialCheck.modName} (совпадение по ${officialCheck.reason === 'hash' ? 'хешу' : 'размеру'})`);
        if (officialCheck.versionIssues && officialCheck.versionIssues.length) {
            report.issues.push(...officialCheck.versionIssues);
            if (officialCheck.versionIssues.some(i => i.includes('не указана в официально поддерживаемых'))) {
                report.verdict = "⚠️ Совместимость под вопросом (версия Minecraft не поддерживается)";
                report.verdictClass = "verdict-warning";
            }
        }
    } else {
        if (officialCheck.modName) {
            if (officialCheck.sizeMismatch) {
                report.issues.push(`⚠️ РАЗМЕР НЕ СООТВЕТСТВУЕТ официальному диапазону для ${officialCheck.modName} (ожидается ${officialCheck.expectedSize})`);
                report.verdict = "⚠️ ИЗМЕНЁННЫЙ / НЕОФИЦИАЛЬНЫЙ ФАЙЛ";
                report.verdictClass = "verdict-warning";
            } else {
                report.issues.push(`🔍 Мод похож на ${officialCheck.modName}, но не прошёл проверку.`);
                report.verdict = "⚠️ НЕОФИЦИАЛЬНАЯ ВЕРСИЯ МОДА";
                report.verdictClass = "verdict-warning";
            }
        } else {
            report.issues.push(`🔍 Неизвестный файл – не найден в базе официальных модов`);
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (требуется ручная проверка)";
            report.verdictClass = "verdict-warning";
        }
    }
    
    // Чёрный список по имени
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

// ---------- 6. ОБРАБОТЧИК ЗАГРУЗКИ ----------
async function handleFile(file) {
    if (!file) return;
    const manualMc = mcVersionInput.value.trim();
    const manualMod = modVersionInput.value.trim();
    reportDiv.innerHTML = "⏳ Анализируем мод Minecraft... (распаковка и проверка могут занять несколько секунд)";
    resultDiv.classList.remove('hidden');
    try {
        const result = await analyzeMod(file, manualMc, manualMod);
        reportDiv.innerHTML = `
            <div class="${result.verdictClass}" style="font-size:1.2rem; margin-bottom:1rem;">${result.verdict}</div>
            ${result.details}
        `;
    } catch (err) {
        console.error(err);
        reportDiv.innerHTML = "❌ Ошибка при анализе файла. Попробуйте другой файл или обновите страницу.";
    }
}

// ---------- 7. СОБЫТИЯ ----------
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
