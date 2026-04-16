// ranCheck – античит-анализ модов Minecraft (расширенный список запрещённых модов)
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportSpan = document.getElementById('report');

// === РАСШИРЕННЫЙ ЧЁРНЫЙ СПИСОК (из таблицы + аналоги) ===
const bannedModPatterns = [
    /chestesp/i, /freecam/i, /autofish/i,
    /autoclicker/i, /clicker/i, /macro/i,
    /tracers/i, /topka\s*size/i, /topkasize/i,
    /topka\s*autocommand/i, /topkaautocommand/i,
    /x-ray\s*entity/i, /xrayentity/i,
    /invmove/i, /invmove/i,
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

// Известные хеши читов (пример)
const knownCheatHashes = {
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": "Тестовый пустой файл"
};

// Mixin-индикаторы
const mixinIndicators = [/mixin/i, /accessor/i, /@mixin/i, /MixinConfig/i];

// SHA-256
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Главная функция проверки
async function analyzeMod(file) {
    const report = {
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(2) + " KB",
        fileType: file.type,
        sha256: "",
        issues: [],
        verdict: "✅ Чисто",
        details: ""
    };

    // 1. Проверка имени файла по чёрному списку
    if (bannedModPatterns.some(p => p.test(file.name))) {
        report.issues.push("🔴 Имя файла соответствует запрещённому моду/читу!");
    }

    // 2. Вычисление хеша
    report.sha256 = await sha256(file);
    if (knownCheatHashes[report.sha256]) {
        report.issues.push(`❌ Точное совпадение с известным читом: ${knownCheatHashes[report.sha256]}`);
    }

    // 3. Анализ JAR/ZIP
    if (file.name.endsWith('.jar') || file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            const fileNames = Object.keys(zip.files);
            let bannedClasses = 0;
            let mixinCount = 0;
            let foundBannedNames = [];

            for (const name of fileNames) {
                const lowerName = name.toLowerCase();
                // Проверка каждого класса на бан-паттерны
                if (bannedModPatterns.some(p => p.test(lowerName))) {
                    bannedClasses++;
                    if (bannedClasses <= 5) {
                        foundBannedNames.push(name);
                    }
                }
                if (mixinIndicators.some(p => p.test(lowerName))) {
                    mixinCount++;
                }
            }

            if (bannedClasses > 0) {
                report.issues.push(`🔴 Обнаружено ${bannedClasses} классов, связанных с запрещёнными модами: ${foundBannedNames.slice(0,3).join(', ')}${bannedClasses > 3 ? '...' : ''}`);
            }
            if (mixinCount > 5) {
                report.issues.push(`🔄 Аномально много Mixin-классов (${mixinCount}) – возможно, вмешательство в логику игры`);
            }

            // Проверка манифеста
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

    // 4. Эвристика по размеру
    if (file.size > 15 * 1024 * 1024 && file.name.endsWith('.jar')) {
        report.issues.push("📈 Размер >15 МБ – возможно, встроенные библиотеки (не опасно, но стоит проверить)");
    }

    // 5. Итоговый вердикт
    const hasBan = report.issues.some(i => i.includes("запрещённому моду") || i.includes("совпадение с известным читом") || i.includes("Main-Class указывает"));
    if (hasBan) {
        report.verdict = "🔴 ЗАПРЕЩЁННЫЙ МОД / ЧИТ – использование даёт нечестное преимущество!";
    } else if (report.issues.length > 0) {
        report.verdict = "⚠️ Требуется дополнительная проверка – обнаружены подозрительные признаки";
    } else {
        report.verdict = "✅ Чисто – запрещённых паттернов не найдено";
    }

    report.details = `
        Имя: ${report.fileName}<br>
        Размер: ${report.fileSize}<br>
        SHA-256: ${report.sha256.substring(0, 32)}…<br>
        ${report.issues.map(i => `• ${i}`).join('<br>')}
    `;
    return report;
}

// Обработчик загрузки (без изменений)
async function handleFile(file) {
    if (!file) return;
    reportSpan.innerHTML = "⏳ Анализируем мод Minecraft... (это может занять несколько секунд)";
    resultDiv.classList.remove('hidden');
    try {
        const result = await analyzeMod(file);
        reportSpan.innerHTML = `<strong style="font-size:1.2rem">${result.verdict}</strong><br><br>${result.details}`;
    } catch (err) {
        console.error(err);
        reportSpan.innerHTML = "❌ Ошибка при анализе файла. Попробуйте другой файл или обновите страницу.";
    }
}

// Drag & Drop
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.background = 'rgba(76,154,255,0.2)'; });
dropArea.addEventListener('dragleave', () => { dropArea.style.background = ''; });
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '';
    handleFile(e.dataTransfer.files[0]);
});
