// ========================
// ranCheck – улучшенное определение имени мода (сохраняет несколько сегментов)
// ========================

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultsContainer = document.getElementById('resultsContainer');
const mcVersionInput = document.getElementById('mcVersion');
const modVersionInput = document.getElementById('modVersion');
const autoDetectBtn = document.getElementById('autoDetectBtn');
const progressArea = document.getElementById('progressArea');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

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

// ---------- 2. ЛЕГИТИМНЫЕ МОДЫ ----------
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

// ---------- 3. ФУНКЦИИ ОПРЕДЕЛЕНИЯ ВЕРСИЙ ----------
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
    const dotPattern = /\d+(?:\.\d+)+/g;
    const alnumPattern = /[A-Za-z]+[_\d]+[A-Za-z\d]*/g;
    let match;
    while ((match = dotPattern.exec(filename)) !== null) {
        if (!candidates.includes(match[0])) candidates.push(match[0]);
    }
    while ((match = alnumPattern.exec(filename)) !== null) {
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

// НОВАЯ УЛУЧШЕННАЯ ФУНКЦИЯ ОПРЕДЕЛЕНИЯ ИМЕНИ МОДА
function identifyModName(filename) {
    // 1. Приоритет: поиск по trustedMods
    const lowerName = filename.toLowerCase();
    for (const mod of trustedMods) {
        for (const kw of mod.keywords) {
            if (lowerName.includes(kw)) return mod.name;
        }
    }
    
    // 2. Определяем версии
    const { mcVersion, modVersion } = identifyVersions(filename);
    let versionStr = mcVersion || modVersion;
    if (versionStr) {
        const versionIndex = filename.indexOf(versionStr);
        if (versionIndex > 0) {
            const beforeVersion = filename.substring(0, versionIndex);
            // Ищем последний разделитель (- или _) перед версией
            const lastSepMatch = beforeVersion.match(/[-_][^_-]*$/);
            if (lastSepMatch) {
                const sepIndex = beforeVersion.lastIndexOf(lastSepMatch[0][0]);
                if (sepIndex !== -1) {
                    const modName = filename.substring(0, sepIndex);
                    if (modName.length > 1) return modName;
                }
            }
            // Если разделитель не найден, возвращаем всё до версии (обрезая возможный разделитель)
            let candidate = beforeVersion.replace(/[-_]$/, '');
            if (candidate.length > 1) return candidate;
        }
    }
    
    // 3. Если версий нет, ищем последний разделитель, после которого идёт цифра
    const match = filename.match(/^(.*)[-_](\d)/);
    if (match && match[1].length > 1) {
        return match[1];
    }
    
    // 4. Fallback: первое слово
    const fallback = filename.match(/^([^_-]+)/);
    if (fallback && fallback[1].length > 1) return fallback[1];
    return null;
}

function autoDetectVersions() {
    if (fileInput.files.length === 0) {
        alert("Сначала загрузите хотя бы один файл");
        return false;
    }
    const fileName = fileInput.files[0].name;
    const { mcVersion, modVersion } = identifyVersions(fileName);
    if (mcVersion) mcVersionInput.value = mcVersion;
    if (modVersion) modVersionInput.value = modVersion;
    let msg = `🔍 Извлечено из "${fileName}":`;
    if (mcVersion) msg += ` версия Minecraft = ${mcVersion}`;
    if (modVersion) msg += `, версия мода = ${modVersion}`;
    if (!mcVersion && !modVersion) msg = "❌ Не удалось извлечь версии. Укажите вручную.";
    console.log(msg);
    return true;
}
autoDetectBtn.addEventListener('click', autoDetectVersions);

// ---------- 4. API MODRINTH ----------
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function searchModByHash(fileHash) {
    try {
        const response = await fetch(`https://api.modrinth.com/v2/version_file/${fileHash}`);
        if (response.ok) return await response.json();
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
                    if (mcVersion) found = versions.find(v => v.game_versions.includes(mcVersion));
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

function getTrustedModName(filename) {
    const lowerName = filename.toLowerCase();
    for (const mod of trustedMods) {
        for (const kw of mod.keywords) {
            if (lowerName.includes(kw)) return mod.name;
        }
    }
    return null;
}

// ---------- 5. АНАЛИЗ ОДНОГО ФАЙЛА ----------
async function analyzeOneMod(file, manualMcVersion, manualModVersion) {
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
        if (mcVersion) report.issues.push(`🔍 Авто: версия Minecraft = ${mcVersion}`);
        if (modVersion) report.issues.push(`🔍 Авто: версия мода = ${modVersion}`);
    } else {
        if (mcVersion) report.issues.push(`📌 Версия Minecraft (вручную): ${mcVersion}`);
        if (modVersion) report.issues.push(`📌 Версия мода (вручную): ${modVersion}`);
    }
    
    const detectedModName = identifyModName(file.name);
    if (detectedModName && !getTrustedModName(file.name)) {
        report.issues.push(`🔍 Определено название мода: ${detectedModName}`);
    }
    
    const isTrusted = isTrustedMod(file.name);
    const trustedName = getTrustedModName(file.name);
    
    // Проверка внутренностей на читы (только для недоверенных)
    let bannedInside = false;
    let bannedClassesList = [];
    if (!isTrusted && (file.name.endsWith('.jar') || file.name.endsWith('.zip'))) {
        try {
            const zip = await JSZip.loadAsync(file);
            const fileNames = Object.keys(zip.files);
            for (const name of fileNames) {
                if (name.endsWith('.class')) {
                    const lowerName = name.toLowerCase();
                    if (bannedModPatterns.some(p => p.test(lowerName))) {
                        bannedInside = true;
                        if (bannedClassesList.length < 10) bannedClassesList.push(name);
                    }
                }
            }
            if (bannedInside) {
                report.issues.push(`🔴 ВНУТРИ JAR обнаружены читы: ${bannedClassesList.slice(0,5).join(', ')}${bannedClassesList.length > 5 ? '...' : ''}`);
            }
        } catch (e) {
            report.issues.push("⚠️ Не удалось прочитать архив");
        }
    }
    
    if (bannedInside) {
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ КОД (чит-клиент)";
        report.verdictClass = "verdict-banned";
        report.details = report.issues.map(i => `• ${i}`).join('<br>');
        return report;
    }
    
    // Легитимный мод
    if (isTrusted) {
        report.verdict = `✅ Легитимный мод (${trustedName})`;
        report.verdictClass = "verdict-clean";
        let expectedSize = null;
        let apiSource = null;
        let modrinthData = await searchModByHash(report.sha256);
        if (modrinthData) {
            expectedSize = modrinthData.size;
            apiSource = "хешу";
        } else if (mcVersion && trustedName) {
            const apiData = await searchModByName(trustedName, mcVersion);
            if (apiData) {
                expectedSize = apiData.size;
                apiSource = `названию "${trustedName}" и версии ${mcVersion}`;
            }
        }
        if (expectedSize !== null) {
            if (Math.abs(expectedSize - file.size) > 1024) {
                report.issues.push(`ℹ️ Вес отличается от официального (${(expectedSize/1024).toFixed(2)} KB) по ${apiSource}. Это нормально для разных версий.`);
            } else {
                report.issues.push(`✅ Вес совпадает с официальным (${(expectedSize/1024).toFixed(2)} KB) по ${apiSource}.`);
            }
        } else {
            report.issues.push(`ℹ️ Не удалось проверить вес через API.`);
        }
        report.details = report.issues.map(i => `• ${i}`).join('<br>');
        return report;
    }
    
    // Неизвестный мод
    let modrinthData = await searchModByHash(report.sha256);
    if (modrinthData) {
        const officialSize = modrinthData.size;
        if (officialSize !== file.size) {
            report.issues.push(`⚠️ Размер не совпадает с официальным (ожидалось ${(officialSize/1024).toFixed(2)} KB)`);
            report.verdict = "⚠️ ФАЙЛ ПОВРЕЖДЁН ИЛИ ИЗМЕНЁН";
            report.verdictClass = "verdict-warning";
        } else {
            report.verdict = "✅ Официальный мод (подлинник)";
            report.verdictClass = "verdict-clean";
        }
    } else {
        if (detectedModName && mcVersion) {
            const apiData = await searchModByName(detectedModName, mcVersion);
            if (apiData) {
                const officialSize = apiData.size;
                if (Math.abs(officialSize - file.size) > 1024) {
                    report.issues.push(`⚠️ Вес не совпадает с официальным для "${detectedModName}" (${mcVersion}) – ожидается ~${(officialSize/1024).toFixed(2)} KB`);
                    report.verdict = "⚠️ ПОДОЗРИТЕЛЬНЫЙ ВЕС";
                    report.verdictClass = "verdict-warning";
                } else {
                    report.issues.push(`✅ Вес совпадает с официальным для "${detectedModName}"`);
                    report.verdict = "✅ Вес соответствует официальному";
                    report.verdictClass = "verdict-clean";
                }
            } else {
                report.issues.push(`❌ Мод не найден в API.`);
                report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД";
                report.verdictClass = "verdict-warning";
            }
        } else {
            report.issues.push(`❌ Мод не опознан.`);
            report.verdict = "⚠️ НЕИЗВЕСТНЫЙ МОД";
            report.verdictClass = "verdict-warning";
        }
    }
    
    report.details = report.issues.map(i => `• ${i}`).join('<br>');
    return report;
}

// ---------- 6. ОБРАБОТКА НЕСКОЛЬКИХ ФАЙЛОВ ----------
async function processMultipleFiles(files, manualMc, manualMod) {
    if (files.length > 100) {
        alert("Максимум 100 файлов за раз. Выберите меньше.");
        return;
    }
    resultsContainer.innerHTML = "";
    progressArea.classList.remove('hidden');
    progressFill.style.width = "0%";
    progressText.innerText = `Готово 0 / ${files.length}`;
    
    let processed = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const card = document.createElement('div');
        card.className = 'result-card';
        card.id = `result-${Date.now()}-${i}`;
        card.innerHTML = `
            <div class="verdict">⏳ Проверка: ${escapeHtml(file.name)}</div>
            <div class="details">Анализируем...</div>
        `;
        resultsContainer.appendChild(card);
        
        try {
            const report = await analyzeOneMod(file, manualMc, manualMod);
            card.innerHTML = `
                <div class="verdict ${report.verdictClass}">${escapeHtml(report.verdict)}</div>
                <div class="details">
                    📄 Имя: ${escapeHtml(report.fileName)}<br>
                    📦 Размер: ${report.fileSizeStr}<br>
                    🔑 SHA-256: ${report.sha256.substring(0, 32)}…<br>
                    <br>
                    ${report.details}
                </div>
            `;
        } catch (err) {
            card.innerHTML = `
                <div class="verdict verdict-warning">❌ Ошибка при проверке</div>
                <div class="details">${escapeHtml(file.name)}: ${err.message}</div>
            `;
        }
        processed++;
        const percent = (processed / files.length) * 100;
        progressFill.style.width = `${percent}%`;
        progressText.innerText = `Готово ${processed} / ${files.length}`;
        await new Promise(r => setTimeout(r, 50));
    }
    progressText.innerText = `Готово ${files.length} / ${files.length} ✅`;
    setTimeout(() => {
        progressArea.classList.add('hidden');
    }, 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(f => f.name.endsWith('.jar') || f.name.endsWith('.zip'));
    if (files.length === 0) {
        alert("Пожалуйста, выберите файлы с расширением .jar или .zip");
        return;
    }
    const manualMc = mcVersionInput.value.trim();
    const manualMod = modVersionInput.value.trim();
    processMultipleFiles(files, manualMc, manualMod);
}

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
dropArea.addEventListener('click', () => fileInput.click());
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
    handleFiles(e.dataTransfer.files);
});
