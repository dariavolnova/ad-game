document.addEventListener('DOMContentLoaded', async () => {
    await modalManager.init();
    
    const game = new Game('game', 'score', modalManager);
    
    window.game = game;
    window.modalManager = modalManager;
});