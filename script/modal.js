class ModalManager {
    constructor() {
        this.modal = null;
        this.successModal = null;
        this.onRestartCallback = null;
        this.notification = null;
        this.isAnimating = false; 
    }

    init() {
        this.createModals();
        this.createNotification();
        this.setupEventListeners();
    }

    createModals() {
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

    createNotification() {
        this.notification = document.createElement('div');
        this.notification.className = 'copy-notification';
        this.notification.innerHTML = 'Промокод скопирован!';
        document.body.appendChild(this.notification);
    }

    showNotification() {
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.hideNotification();
        }, 2000);
    }

    hideNotification() {
        this.notification.classList.remove('show');
    }

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
            
            if (e.target && (e.target.id === 'promoCode' || e.target.classList.contains('code'))) {
                this.copyPromoCode();
            }
        });
    }

    copyPromoCode() {
        const promoText = 'BURGER50';
        
        navigator.clipboard.writeText(promoText).then(() => {
            this.showNotification();
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            const textArea = document.createElement('textarea');
            textArea.value = promoText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showNotification();
        });
    }

    showGameOver(finalScore) {
        if (this.isAnimating) return;
        if (!this.modal) return;
        
        this.isAnimating = true;
        
        const finalScoreElement = this.modal.querySelector('#finalScore');
        if (finalScoreElement) {
            finalScoreElement.textContent = finalScore;
        }
        
        if (this.successModal.classList.contains('show')) {
            this.successModal.classList.remove('show');
            setTimeout(() => {
                this.successModal.style.display = 'none';
            }, 400);
        }
        
        this.modal.style.display = 'flex';
        
        setTimeout(() => {
            this.modal.classList.add('show');
            this.isAnimating = false;
        }, 10);
    }

    showSuccess() {
        if (this.isAnimating) return;
        if (!this.successModal) return;
        
        this.isAnimating = true;
        
        if (this.modal.classList.contains('show')) {
            this.modal.classList.remove('show');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 400);
        }
        
        this.successModal.style.display = 'flex';
        
        setTimeout(() => {
            this.successModal.classList.add('show');
            this.isAnimating = false;
        }, 10);
    }

    hideAll() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        if (this.modal.classList.contains('show')) {
            this.modal.classList.remove('show');
        }
        
        if (this.successModal.classList.contains('show')) {
            this.successModal.classList.remove('show');
        }
        
        setTimeout(() => {
            if (this.modal.style.display === 'flex') {
                this.modal.style.display = 'none';
            }
            if (this.successModal.style.display === 'flex') {
                this.successModal.style.display = 'none';
            }
            this.isAnimating = false;
        }, 400);
    }

    isAnyModalVisible() {
        return this.modal.classList.contains('show') || 
               this.successModal.classList.contains('show');
    }

    setOnRestart(callback) {
        this.onRestartCallback = callback;
    }
}

const modalManager = new ModalManager();

document.addEventListener('DOMContentLoaded', () => {
    modalManager.init();
});