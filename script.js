// ========================
// ranCheck – улучшенное распознавание версий
// ========================

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportDiv = document.getElementById('report');
const mcVersionInput = document.getElementById('mcVersion');
const modVersionInput = document.getElementById('modVersion');
const autoDetectBtn = document.getElementById('autoDetectBtn');

// ---------- 1. ЧЁРНЫЙ СПИСОК ----------
const bannedModPatterns = [
    /chestesp/i, /freecam/i, /autofish/i,
    /autoclicker/i, /clicker/i, /macro/i,
    /tracers/i, /topka\s*size/i, /topkasize/i,
    /topka\s*autocommand/i, /topkaautocommand/i,
    /x-ray\s*entity/i, /xrayentity/i,
    /invmove/i, /nearplayerwidget/i, /near\s*player/i,
    /nameprotect/i, /nametag/i, /elytra\s*swap/i, /elytraswap/i,
    /minimap/i, /radar/i, /playerradar/i, /entityradar/i,
    /collision\s*fix/i, /collisionfix/i,
    /wurst/i, /impact/i, /aristois/i, /future/i, /vape/i,
    /sigma/i, /liquidbounce/i, /kristall/i, /salhack/i,
    /killaura/i, /scaffold/i, /fly/i, /speed/i, /nuker/i,
    /cheat/i, /hack/i, /inject/i, /bypass/i, /exploit/i,
    /auto(click|mine|fish|totem)/i
];

// ---------- 2. ЛЕГИТИМНЫЕ МОДЫ (для лояльной проверки) ----------
const trustedMods = [
    { name: "Fabric API", keywords: ["fabric-api", "fabricapi", "fabric"] },
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

// ---------- 3. УЛУЧШЕННОЕ РАСПОЗНАВАНИЕ ВЕРСИЙ ----------
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
    // Паттерны:
    // 1. Версии с точками: цифры.цифры.цифры (и более) – захватывает 1.20.1, 15.8.5.12, 0.5.3
    const dotPattern = /\d+(?:\.\d+)+/g;
    // 2. Буквенно-цифровые версии: буквы+цифры+подчёркивания (например, HD_U_I6, U5, I6)
    const alnumPattern = /[A-Za-z]+[_\d]+[A-Za-z\d]*/g;
    
    let match;
    while ((match = dotPattern.exec(filename)) !== null) {
        if (!candidates.includes(match[0])) candidates.push(match[0]);
    }
    while ((match = alnumPattern.exec(filename)) !== null) {
        // Исключаем слишком длинные (>20 символов) или состоящие только из цифр (уже пойманы dotPattern)
        if (match[0].length < 20 && !/^\d+$/.test(match[0])) {
            if (!candidates.includes(match[0])) candidates.push(match[0]);
        }
    }
    return candidates;
}

function identifyVersions(filename) {
    const candidates = extractAllVersionCandidates(filename);
    let mcVersion = null;
    let modVersion = null;
    
    // Сначала ищем версию Minecraft среди кандидатов
    for (const cand of candidates) {
        if (isMinecraftVersion(cand)) {
            mcVersion = cand;
            break;
        }
    }
    
    // Если нашли версию Minecraft, то остальные кандидаты (кроме неё) считаем версией мода
    if (mcVersion) {
        const otherVersions = candidates.filter(c => c !== mcVersion);
        if (otherVersions.length > 0) {
            // Берём первый подходящий (или объединяем)
            modVersion = otherVersions[0];
        }
    } else {
        // Если нет версии Minecraft, то всё, что есть – версия мода
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

// ---------- 4. ВЗАИМОДЕЙСТВИЕ С MODRINTH API ----------
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function searchModByHash(fileHash) {
    try {
        const response = await fetch(`https://api.modrinth.com/v2/version_file/${fileHash}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) { console.warn("Modrinth hash lookup failed", e); }
    return null;
}

async function searchModByName(modName, mcVersion) {
    try {
        const searchQuery = encodeURIComponent(modName);
        const response = await fetch(`https://api.modrinth.com/v2/search?query=${searchQuery}&limit=1`);
        if (response.ok) {
            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
                const projectId = data.hits[0].project_id;
                const versionsResp = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`);
                if (versionsResp.ok) {
                    const versions = await versionsResp.json();
                    let found = null;
                    if (mcVersion) {
                        found = versions.find(v => v.game_versions.includes(mcVersion));
                    }
                    if (!found && versions.length) found = versions[0];
                    if (found && found.files.length) {
                        const fileObj = found.files[0];
                        return {
                            fileName: fileObj.filename,
                            size: fileObj.size,
                            version: found.version_number,
                            mcVersions: found.game_versions
                        };
                    }
                }
            }
        }
    } catch (e) { console.warn("Modrinth search failed", e); }
    return null;
}

function isTrustedMod(filename) {
    const lowerName = filename.toLowerCase();
    for (const mod of trustedMods) {
        for (const kw of mod.keywords) {
            if (lowerName.includes(kw)) return true;
        }
    }
    return false;
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
    
    const isTrusted = isTrustedMod(file.name);
    let modrinthData = await searchModByHash(report.sha256);
    
    if (modrinthData) {
        // Точное совпадение по хешу
        const officialSize = modrinthData.size;
        if (officialSize !== file.size) {
            report.issues.push(`⚠️ Размер файла не совпадает с официальным (Modrinth). Ожидалось: ${(officialSize/1024).toFixed(2)} KB, получено: ${report.fileSizeStr}`);
            report.verdict = isTrusted ? "⚠️ Размер отличается от официального (возможно, другая версия), но мод легитимный" : "⚠️ ФАЙЛ ПОВРЕЖДЁН ИЛИ ИЗМЕНЁН";
            report.verdictClass = "verdict-warning";
        } else {
            report.verdict = "✅ Официальный мод (подлинник, проверено через Modrinth)";
            report.verdictClass = "verdict-clean";
        }
    } else {
        // Не нашли по хешу, пробуем поиск по имени
        let identifiedMod = null;
        for (const mod of trustedMods) {
            for (const kw of mod.keywords) {
                if (file.name.toLowerCase().includes(kw)) {
                    identifiedMod = mod;
                    break;
                }
            }
            if (identifiedMod) break;
        }
        
        if (identifiedMod && mcVersion) {
            report.issues.push(`🔍 Ищем данные для ${identifiedMod.name} на Modrinth...`);
            const apiData = await searchModByName(identifiedMod.name, mcVersion);
            if (apiData) {
                const officialSize = apiData.size;
                if (officialSize !== file.size) {
                    report.issues.push(`⚠️ Размер не совпадает! Официальный размер: ${(officialSize/1024).toFixed(2)} KB, ваш: ${report.fileSizeStr}`);
                    report.verdict = isTrusted ? "⚠️ Размер отличается от официального (возможно, другая версия), но мод легитимный" : "⚠️ РАЗМЕР НЕ СООТВЕТСТВУЕТ ОФИЦИАЛЬНОМУ";
                    report.verdictClass = "verdict-warning";
                } else {
                    report.verdict = "✅ Размер совпадает с официальным (Modrinth)";
                    report.verdictClass = "verdict-clean";
                }
            } else {
                report.issues.push(`❌ Не удалось получить данные с Modrinth для ${identifiedMod.name}`);
                report.verdict = isTrusted ? "⚠️ Легитимный мод, но нет данных в API (возможно, не опубликован)" : "⚠️ НЕИЗВЕСТНЫЙ МОД (нет данных в API)";
                report.verdictClass = "verdict-warning";
            }
        } else {
            report.issues.push(`❌ Мод не опознан и не найден по хешу.`);
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (требуется ручная проверка)";
            report.verdictClass = "verdict-warning";
        }
    }
    
    // Чёрный список (приоритет)
    if (bannedModPatterns.some(p => p.test(file.name))) {
        report.issues.push("🔴 ИМЯ ФАЙЛА СОДЕРЖИТ ЗАПРЕЩЁННЫЙ МОД/ЧИТ!");
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ МОД / ЧИТ";
        report.verdictClass = "verdict-banned";
    }
    
    // Анализ JAR (внутренние классы)
    if (file.name.endsWith('.jar') || file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            const fileNames = Object.keys(zip.files);
            let bannedClasses = 0;
            let foundBannedNames = [];
            for (const name of fileNames) {
                if (bannedModPatterns.some(p => p.test(name.toLowerCase()))) {
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
    reportDiv.innerHTML = "⏳ Анализируем мод Minecraft (запрос к Modrinth API)...";
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
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.background = 'rgba(76,154,255,0.2)'; });
dropArea.addEventListener('dragleave', () => { dropArea.style.background = ''; });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '';
    handleFile(e.dataTransfer.files[0]);
});
