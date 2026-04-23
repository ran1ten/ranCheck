// ========================
// ranCheck – вход по коду из Telegram-бота (исправленная версия)
// ========================

// ⚠️ ЗАМЕНИТЕ НА АДРЕС ВАШЕГО СЕРВЕРА НА RENDER
const API_BASE_URL = "https://rancheck-bot.onrender.com"; // например, https://rancheck-bot.onrender.com

const loginPanel = document.getElementById('loginPanel');
const mainPanel = document.getElementById('mainPanel');
const codeInput = document.getElementById('codeInput');
const submitBtn = document.getElementById('submitBtn');
const loginMessage = document.getElementById('loginMessage');

// Проверяем сохранённый токен
if (sessionStorage.getItem('ranCheckToken')) {
    // Сразу показываем главную панель
    loginPanel.style.display = 'none';
    mainPanel.style.display = 'block';
    initMainApp();
} else {
    // Показываем форму входа
    loginPanel.style.display = 'block';
    mainPanel.style.display = 'none';
    
    submitBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) {
            loginMessage.innerText = "Введите код";
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            loginMessage.innerText = "Код должен быть 6 цифр";
            return;
        }
        loginMessage.innerText = "⏳ Отправка запроса...";
        
        try {
            console.log(`Отправка кода ${code} на ${API_BASE_URL}/verify`);
            const response = await fetch(`${API_BASE_URL}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            console.log("Статус ответа:", response.status);
            const data = await response.json();
            console.log("Ответ сервера:", data);
            
            if (response.ok && data.success) {
                sessionStorage.setItem('ranCheckToken', data.token);
                loginMessage.innerText = "✅ Доступ разрешён! Загрузка...";
                // Переключаем панели
                loginPanel.style.display = 'none';
                mainPanel.style.display = 'block';
                initMainApp();
            } else {
                const errorMsg = data.detail || data.error || "Неверный код";
                loginMessage.innerText = `❌ ${errorMsg}`;
            }
        } catch (err) {
            console.error("Ошибка соединения:", err);
            loginMessage.innerText = "❌ Ошибка соединения с сервером. Проверьте консоль.";
        }
    });
}

// ---------- Функция инициализации основной логики ----------
function initMainApp() {
    console.log("Инициализация основного интерфейса проверки модов");
    // СЮДА ВСТАВЬТЕ ВЕСЬ ВАШ РАБОЧИЙ КОД (анализ модов, загрузка файлов и т.д.)
    // Если у вас уже был рабочий script.js, просто скопируйте его сюда, обернув в эту функцию.
    // Ниже – заглушка, чтобы вы понимали структуру:
    
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    if (dropArea) {
        dropArea.addEventListener('click', () => fileInput.click());
        // ... остальные обработчики
    }
    alert("Теперь сюда нужно вставить ваш код проверки модов. Временно работает заглушка.");
}
