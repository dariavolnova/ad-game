// Ждем загрузки DOM и модальных окон
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализируем модальные окна
    await modalManager.init();
    
    // Создаем и запускаем игру после инициализации модальных окон
    const game = new Game('game', 'score', modalManager);
    
    // Делаем глобально доступным для отладки
    window.game = game;
    window.modalManager = modalManager;
});