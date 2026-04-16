// ranCheck – античит-анализ модов Minecraft
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportSpan = document.getElementById('report');

// Известные хеши читов (SHA-256) – пример, можно пополнять
const knownCheatHashes = {
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": "Тестовый пустой файл (не мод)",
    "5d41402abc4b2a76b9719d911017c592": "MD5 тест – не настоящий хеш, демо"
    // В реальности сюда добавляются реальные хеши известных читов
};

// Чёрный список классов/пакетов (фрагменты)
const suspiciousPatterns = [
    /cheat/i, /hack/i, /inject/i, /bypass/i, /exploit/i,
    /wurst/i, /impact/i, /aristois/i, /future/i, /vape/i,
    /sigma/i, /liquidbounce/i, /kristall/i, /salhack/i,
    /auto(click|mine|fish|totem)/i,
    /killaura/i, /scaffold/i, /fly/i, /speed/i, /nuker/i
];

// Подозрительные mixin/accessor классы
const mixinIndicators = [/mixin/i, /accessor/i, /@mixin/i, /MixinConfig/i];

// Функция для вычисления SHA-256 (современный стандарт)
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

    // 1. Базовые проверки имени
    if (suspiciousPatterns.some(p => p.test(file.name))) {
        report.issues.push("⚠️ Имя файла содержит подозрительное слово");
    }

    // 2. Вычисляем хеш
    report.sha256 = await sha256(file);
    if (knownCheatHashes[report.sha256]) {
        report.issues.push(`❌ Файл опознан как чит: ${knownCheatHashes[report.sha256]}`);
    }

    // 3. Если это JAR/ZIP – анализируем содержимое
    if (file.name.endsWith('.jar') || file.name.endsWith('.zip')) {
        try {
            const zip = await JSZip.loadAsync(file);
            const fileNames = Object.keys(zip.files);
            
            let suspiciousClasses = 0;
            let mixinCount = 0;
            
            for (const name of fileNames) {
                // Проверяем классы .class
                if (name.endsWith('.class')) {
                    const lowerName = name.toLowerCase();
                    if (suspiciousPatterns.some(p => p.test(lowerName))) {
                        suspiciousClasses++;
                        if (suspiciousClasses <= 5) {
                            report.issues.push(`🔍 Подозрительный класс: ${name}`);
                        }
                    }
                    if (mixinIndicators.some(p => p.test(lowerName))) {
                        mixinCount++;
                    }
                }
            }
            
            if (suspiciousClasses > 5) {
                report.issues.push(`⚠️ Обнаружено ${suspiciousClasses} подозрительных классов (возможная обфускация или чит)`);
            }
            if (mixinCount > 3) {
                report.issues.push(`🔄 Очень много Mixin-классов (${mixinCount}) – возможно, вмешательство в игровую логику`);
            }
            
            // Проверяем манифест
            const manifestFile = zip.files["META-INF/MANIFEST.MF"];
            if (manifestFile) {
                const manifestContent = await manifestFile.async("string");
                if (manifestContent.includes("Main-Class")) {
                    const mainClassMatch = manifestContent.match(/Main-Class:\s*(.+)/);
                    if (mainClassMatch) {
                        const mainClass = mainClassMatch[1];
                        if (suspiciousPatterns.some(p => p.test(mainClass))) {
                            report.issues.push(`🎯 Main-Class подозрительна: ${mainClass}`);
                        }
                    }
                }
            }
        } catch (e) {
            report.issues.push("⚠️ Не удалось прочитать архив (возможно, повреждён или не ZIP/JAR)");
        }
    } else {
        report.issues.push("📦 Файл не является JAR/ZIP – моды Minecraft обычно имеют расширение .jar");
    }

    // 4. Эвристика: слишком большой размер для простого мода
    if (file.size > 10 * 1024 * 1024 && file.name.endsWith('.jar')) {
        report.issues.push("📈 Размер >10 МБ – возможно, встроенные библиотеки (не опасно, но стоит проверить)");
    }

    // 5. Формируем итоговый вердикт
    if (report.issues.length === 0) {
        report.verdict = "✅ Чисто – подозрительных паттернов не найдено";
    } else if (report.issues.some(i => i.includes("опознан как чит") || i.includes("обфускация"))) {
        report.verdict = "🔴 ВРЕДОНОСНЫЙ / ЧИТ – настоятельно не рекомендуется использовать!";
    } else {
        report.verdict = "⚠️ Требуется дополнительная проверка – обнаружены подозрительные признаки";
    }
    
    report.details = `
        Имя: ${report.fileName}<br>
        Размер: ${report.fileSize}<br>
        SHA-256: ${report.sha256.substring(0, 32)}…<br>
        ${report.issues.map(i => `• ${i}`).join('<br>')}
    `;
    
    return report;
}

// Обработчик загрузки файла
async function handleFile(file) {
    if (!file) return;
    
    // Показываем процесс
    reportSpan.innerHTML = "⏳ Анализируем мод Minecraft... (это может занять несколько секунд)";
    resultDiv.classList.remove('hidden');
    
    try {
        const result = await analyzeMod(file);
        reportSpan.innerHTML = `
            <strong style="font-size:1.2rem">${result.verdict}</strong><br><br>
            ${result.details}
        `;
    } catch (err) {
        console.error(err);
        reportSpan.innerHTML = "❌ Ошибка при анализе файла. Попробуйте другой файл или обновите страницу.";
    }
}

// Drag & Drop и клик
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
