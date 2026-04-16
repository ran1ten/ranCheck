// ========================
// ranCheck – лояльная проверка для популярных легитимных модов
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

// ---------- 2. СПИСОК ЛЕГИТИМНЫХ ПОПУЛЯРНЫХ МОДОВ (для лояльной проверки) ----------
const trustedMods = [
    { name: "Fabric API", keywords: ["fabric-api", "fabricapi", "fabric"] },
    { name: "Just Enough Items (JEI)", keywords: ["jei", "justenoughitems"] },
    { name: "OptiFine", keywords: ["optifine"] },
    { name: "Sodium", nameKeywords: ["sodium", "sodium-fabric"]},
    { name: "Lithium", keywords: ["lithium"] },
    { name: "Phosphor", keywords: ["phosphor"] },
    { name: "Iris Shaders", keywords: ["iris", "irisshaders"] },
    { name: "Sodium Extra", keywords: ["sodiumextra"] },
    { name: "Replay Mod", keywords: ["replaymod", "replay"] },
    { name: "Litematica", keywords: ["litematica"] },
    { name: "Malilib", keywords: ["malilib"] }
];

// ---------- 3. ФУНКЦИИ ВЕРСИЙ ----------
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
        if (otherVersions.length > 0) modVersion = otherVersions[0];
    } else {
        if (candidates.length > 0) modVersion = candidates.join(', ');
    }
    return { mcVersion, modVersion };
}

function autoDetectVersions() {
    const fileName = fileInput.files[0]?.name;
    if (!fileName) { alert("Сначала загрузите файл"); return false; }
    const { mcVersion, modVersion } = identifyVersions(fileName);
    if (mcVersion) mcVersionInput.value = mcVersion;
    if (modVersion) modVersionInput.value = modVersion;
    let msg = `🔍 Извлечено:`;
    if (mcVersion) msg += ` версия Minecraft = ${mcVersion}`;
    if (modVersion) msg += `, версия мода = ${modVersion}`;
    if (!mcVersion && !modVersion) msg = "❌ Не удалось извлечь версии. Укажите вручную.";
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

// ---------- 5. ОПРЕДЕЛЕНИЕ ЛЕГИТИМНОГО МОДА ПО ИМЕНИ ----------
function identifyTrustedMod(filename) {
    const lowerName = filename.toLowerCase();
    for (const mod of trustedMods) {
        for (const kw of mod.keywords) {
            if (lowerName.includes(kw)) {
                return mod;
            }
        }
    }
    return null;
}

// ---------- 6. ГЛАВНАЯ ФУНКЦИЯ АНАЛИЗА ----------
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
    
    // Определяем версии
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
    
    // Проверка по чёрному списку (имеет наивысший приоритет)
    const isBannedByName = bannedModPatterns.some(p => p.test(file.name));
    if (isBannedByName) {
        report.issues.push("🔴 ИМЯ ФАЙЛА СОДЕРЖИТ ЗАПРЕЩЁННЫЙ МОД/ЧИТ!");
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ МОД / ЧИТ";
        report.verdictClass = "verdict-banned";
        // Всё равно продолжаем анализ, но вердикт уже выставлен
    }
    
    // Поиск по хешу (самый точный)
    let modrinthData = await searchModByHash(report.sha256);
    if (modrinthData) {
        // Точное совпадение по хешу
        const officialSize = modrinthData.size;
        report.issues.push(`✅ Найден в официальном репозитории Modrinth: ${modrinthData.name}`);
        if (officialSize !== file.size) {
            report.issues.push(`⚠️ Размер файла не совпадает с официальным! Ожидалось: ${(officialSize/1024).toFixed(2)} KB, получено: ${report.fileSizeStr}`);
            if (!isBannedByName) {
                report.verdict = "⚠️ ФАЙЛ ПОВРЕЖДЁН ИЛИ ИЗМЕНЁН";
                report.verdictClass = "verdict-warning";
            }
        } else {
            if (!isBannedByName) {
                report.verdict = "✅ Официальный мод (подлинник, проверено через Modrinth)";
                report.verdictClass = "verdict-clean";
            }
        }
    } else {
        // Не найдено по хешу – пробуем опознать как легитимный мод
        const trustedMod = identifyTrustedMod(file.name);
        if (trustedMod && mcVersion) {
            report.issues.push(`🔍 Ищем актуальные данные для ${trustedMod.name} на Modrinth...`);
            const apiData = await searchModByName(trustedMod.name, mcVersion);
            if (apiData) {
                const officialSize = apiData.size;
                report.issues.push(`📦 Найдена версия для ${mcVersion}: ${apiData.version}`);
                if (officialSize !== file.size) {
                    report.issues.push(`⚠️ Размер не совпадает с официальным (официальный: ${(officialSize/1024).toFixed(2)} KB, ваш: ${report.fileSizeStr}). Это может быть другая версия или сборка.`);
                    // Для легитимных модов не делаем критическую ошибку, только предупреждение
                    if (!isBannedByName) {
                        report.verdict = "⚠️ Размер отличается от официального (возможно, другая версия), но мод легитимный";
                        report.verdictClass = "verdict-warning";
                    }
                } else {
                    if (!isBannedByName) {
                        report.verdict = "✅ Легитимный мод (размер совпадает с официальным)";
                        report.verdictClass = "verdict-clean";
                    }
                }
            } else {
                report.issues.push(`❌ Не удалось получить данные с Modrinth для ${trustedMod.name}. Возможно, мод не опубликован там.`);
                if (!isBannedByName) {
                    report.verdict = "⚠️ Легитимный мод, но данные не найдены в API (проверьте вручную)";
                    report.verdictClass = "verdict-warning";
                }
            }
        } else {
            if (!isBannedByName) {
                report.issues.push(`❌ Мод не опознан как легитимный и не найден по хешу.`);
                report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД (требуется ручная проверка)";
                report.verdictClass = "verdict-warning";
            }
        }
    }
    
    // Анализ JAR на наличие запрещённых классов (дополнительная проверка)
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

// ---------- 7. ОБРАБОТЧИК ЗАГРУЗКИ ----------
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

// ---------- 8. СОБЫТИЯ ----------
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.background = 'rgba(76,154,255,0.2)'; });
dropArea.addEventListener('dragleave', () => { dropArea.style.background = ''; });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '';
    handleFile(e.dataTransfer.files[0]);
});
