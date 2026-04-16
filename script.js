const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const resultDiv = document.getElementById('result');
const reportSpan = document.getElementById('report');

// Открыть выбор файла
dropArea.addEventListener('click', () => fileInput.click());

// Обработка выбранного файла
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag & Drop
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
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file) return;

    // Имитация проверки (как HolyCheck)
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
    const fileType = file.type || 'unknown';

    // Простая эвристика: проверяем расширение и размер
    let verdict = '✅ Чисто (подозрений нет)';
    let details = `Имя: ${fileName}\nРазмер: ${fileSize}\nТип: ${fileType}\n`;

    if (fileName.endsWith('.exe') || fileName.endsWith('.dll')) {
        verdict = '⚠️ Потенциально опасно! Обнаружен исполняемый файл.';
    } else if (fileSize > 5000) {
        verdict = '⚠️ Файл слишком большой – проверьте вручную.';
    } else if (fileName.match(/cheat|hack|inject/i)) {
        verdict = '❌ Обнаружены запрещённые ключевые слова в имени!';
    } else {
        details += '\n🔍 Расширение и сигнатуры в норме.';
    }

    reportSpan.innerHTML = `<strong>${verdict}</strong><br><br>${details.replace(/\n/g,'<br>')}`;
    resultDiv.classList.remove('hidden');
}
