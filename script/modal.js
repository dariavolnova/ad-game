class ModalManager {
    constructor() {
        this.modal = null;
        this.successModal = null;
        this.onRestartCallback = null;
        this.notification = null;
        this.isAnimating = false; // Флаг для предотвращения двойных анимаций
    }

    // Инициализация модальных окон
    init() {
        this.createModals();
        this.createNotification();
        this.setupEventListeners();
    }

    // Создание модальных окон
    createModals() {
        // Создаем основное модальное окно (проигрыш)
        this.modal = document.createElement('div');
        this.modal.id = 'gameOverModal';
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <h2>Упс!</h2>
                <div class="result-block">
                    <img src="image/sad.png" alt="Грустный смайл" class="sad-image">
                    <p>Вы собрали: <span id="finalScore">0</span> этажей</p>
                </div>
                <button id="restartButton" class="modal-button">Собрать новый Воппер</button>
            </div>
        `;  

        // Создаем модальное окно успеха
        this.successModal = document.createElement('div');
        this.successModal.id = 'successModal';
        this.successModal.className = 'modal';
        this.successModal.innerHTML = `
            <div class="modal-content success">
                <div class="success-header">
                    <h2>Поздравляем!</h2>
                    <div class="whopper-image-container">
                        <img src="image/whopper.png" alt="Воппер" class="whopper-image">
                    </div>
                </div>
                <div class="promo-code">
                    <p>Ваш промокод:</p>
                    <div class="code" id="promoCode" title="Нажмите чтобы скопировать">BURGER50</div>
                </div>
                <button id="successRestartButton" class="modal-button success-button">Собрать ещё раз</button>
            </div>
        `;

        document.body.appendChild(this.modal);
        document.body.appendChild(this.successModal);
    }

    // Создание уведомления
    createNotification() {
        this.notification = document.createElement('div');
        this.notification.className = 'copy-notification';
        this.notification.innerHTML = 'Промокод скопирован!';
        document.body.appendChild(this.notification);
    }

    // Показать уведомление
    showNotification() {
        this.notification.classList.add('show');
        
        // Автоматически скрыть через 2 секунды
        setTimeout(() => {
            this.hideNotification();
        }, 2000);
    }

    // Скрыть уведомление
    hideNotification() {
        this.notification.classList.remove('show');
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'restartButton') {
                this.hideAll();
                if (this.onRestartCallback) {
                    this.onRestartCallback();
                }
            }
            
            if (e.target && e.target.id === 'successRestartButton') {
                this.hideAll();
                if (this.onRestartCallback) {
                    this.onRestartCallback();
                }
            }
            
            // Копирование промокода
            if (e.target && (e.target.id === 'promoCode' || e.target.classList.contains('code'))) {
                this.copyPromoCode();
            }
        });
    }

    // Функция копирования промокода
    copyPromoCode() {
        const promoText = 'BURGER50';
        
        navigator.clipboard.writeText(promoText).then(() => {
            this.showNotification();
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = promoText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showNotification();
        });
    }

    // Показ модального окна проигрыша с анимацией
    showGameOver(finalScore) {
        if (this.isAnimating) return;
        if (!this.modal) return;
        
        this.isAnimating = true;
        
        // Устанавливаем финальный счет
        const finalScoreElement = this.modal.querySelector('#finalScore');
        if (finalScoreElement) {
            finalScoreElement.textContent = finalScore;
        }
        
        // Скрываем success modal если он открыт
        if (this.successModal.classList.contains('show')) {
            this.successModal.classList.remove('show');
            setTimeout(() => {
                this.successModal.style.display = 'none';
            }, 400);
        }
        
        // Показываем модалку проигрыша
        this.modal.style.display = 'flex';
        
        // Запускаем анимацию появления
        setTimeout(() => {
            this.modal.classList.add('show');
            this.isAnimating = false;
        }, 10);
    }

    // Показ модального окна успеха с анимацией
    showSuccess() {
        if (this.isAnimating) return;
        if (!this.successModal) return;
        
        this.isAnimating = true;
        
        // Скрываем game over modal если он открыт
        if (this.modal.classList.contains('show')) {
            this.modal.classList.remove('show');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 400);
        }
        
        // Показываем модалку успеха
        this.successModal.style.display = 'flex';
        
        // Запускаем анимацию появления
        setTimeout(() => {
            this.successModal.classList.add('show');
            this.isAnimating = false;
        }, 10);
    }

    // Скрытие всех модальных окон с анимацией
    hideAll() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Убираем класс show для запуска анимации исчезновения
        if (this.modal.classList.contains('show')) {
            this.modal.classList.remove('show');
        }
        
        if (this.successModal.classList.contains('show')) {
            this.successModal.classList.remove('show');
        }
        
        // Ждем завершения анимации перед скрытием display
        setTimeout(() => {
            if (this.modal.style.display === 'flex') {
                this.modal.style.display = 'none';
            }
            if (this.successModal.style.display === 'flex') {
                this.successModal.style.display = 'none';
            }
            this.isAnimating = false;
        }, 400); // 400ms = длительность анимации
    }

    // Проверка, видно ли любое модальное окно
    isAnyModalVisible() {
        return this.modal.classList.contains('show') || 
               this.successModal.classList.contains('show');
    }

    // Установка callback для перезапуска игры
    setOnRestart(callback) {
        this.onRestartCallback = callback;
    }
}

// Экспортируем экземпляр модального менеджера
const modalManager = new ModalManager();

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    modalManager.init();
});