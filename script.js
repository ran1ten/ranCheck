// ========================
// ranCheck – вход по коду из Telegram-бота
// ========================

// Конфигурация – УКАЖИТЕ ВАШ РЕАЛЬНЫЙ АДРЕС СЕРВЕРА НА RENDER
const API_BASE_URL = "https://ВАШ_СЕРВИС.onrender.com"; // замените на свой

// Элементы DOM
const loginPanel = document.getElementById('loginPanel');
const mainPanel = document.getElementById('mainPanel');
const codeInput = document.getElementById('codeInput');
const submitBtn = document.getElementById('submitBtn');
const loginMessage = document.getElementById('loginMessage');

// Проверяем, есть ли уже сохранённый токен в sessionStorage
const savedToken = sessionStorage.getItem('ranCheckToken');
if (savedToken) {
    // Если токен есть, сразу показываем главную панель
    loginPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
    initMainApp();
} else {
    // Показываем форму входа и вешаем обработчик
    submitBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) {
            loginMessage.innerText = "Введите код";
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            loginMessage.innerText = "Код должен состоять из 6 цифр";
            return;
        }
        loginMessage.innerText = "⏳ Проверка кода...";
        try {
            const response = await fetch(`${API_BASE_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Сохраняем токен (можно использовать для последующих запросов)
                sessionStorage.setItem('ranCheckToken', data.token);
                loginMessage.innerText = "✅ Доступ разрешён! Загрузка...";
                setTimeout(() => {
                    loginPanel.classList.add('hidden');
                    mainPanel.classList.remove('hidden');
                    initMainApp();
                }, 500);
            } else {
                loginMessage.innerText = data.detail || data.error || "Неверный или просроченный код";
            }
        } catch (err) {
            console.error("Ошибка соединения:", err);
            loginMessage.innerText = "❌ Ошибка соединения с сервером. Попробуйте позже.";
        }
    });
}

// ---------- Функция инициализации основной логики (ваш существующий код проверки модов) ----------
function initMainApp() {
    // Здесь должен быть весь ваш код для проверки модов, который был ранее.
    // Я приведу его кратко, но вы можете вставить сюда свой старый рабочий script.js,
    // обернув в эту функцию, либо скопировать содержимое вашего прежнего скрипта сюда.
    
    // Для краткости я вставлю упрощённый вариант, но вы замените на свой полноценный код.
    console.log("Основной интерфейс загружен");
    
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const mcVersionInput = document.getElementById('mcVersion');
    const modVersionInput = document.getElementById('modVersion');
    const autoDetectBtn = document.getElementById('autoDetectBtn');
    const progressArea = document.getElementById('progressArea');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Дальше идёт ваш предыдущий код (анализ модов, чёрный список, проверка размера, SHA-256 и т.д.)
    // Чтобы не терять функционал, вы можете просто скопировать сюда весь код из вашего рабочего script.js
    // (кроме части с авторизацией, которая теперь вынесена отдельно).
    
    // Ниже – заглушка, замените на свой код:
    async function handleFiles(files) {
        alert("Ваш код проверки модов должен быть здесь. Скопируйте его из предыдущей версии script.js");
    }
    
    // Инициализация обработчиков
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.background = 'rgba(76,154,255,0.2)'; });
    dropArea.addEventListener('dragleave', () => { dropArea.style.background = ''; });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.background = '';
        handleFiles(e.dataTransfer.files);
    });
}
