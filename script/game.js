// game.js - Основная игровая логика с правильным счетчиком этажей

class Game {
    constructor(canvasId, scoreElementId, modalManager) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById(scoreElementId);
        this.modalManager = modalManager;
        
        this.blocks = [];
        this.currentBlock = null;
        this.blockCounter = 0; // Счетчик успешно приземленных блоков
        this.gameOver = false;
        this.baseBlockWidth = 200;
        this.baseBlockHeight = 30;
        this.baseSpeed = 3;
        this.maxBlocks = 15;
        
        // Анимационные переменные
        this.fallingBlock = null;
        this.fallAngle = 0;
        this.fallSpeed = 0;
        this.fallRotationCenter = { x: 0, y: 0 };
        this.fallDirection = 'right';
        
        // Для загрузки картинок
        this.blockImages = {};
        this.blockSizes = {};
        this.imagesLoaded = false;
        this.imagesToLoad = 8;
        this.imagesLoadedCount = 0;
        
        // Адаптивные размеры
        this.blockWidth = 0;
        this.blockHeight = 0;
        this.blockSpeed = 0;
        
        this.gameLoopRunning = false;
        
        this.init();
    }

    init() {
        this.initCanvas();
        this.preloadBlockImages();
        this.setupEventListeners();
        
        // Начальное значение счетчика
        this.blockCounter = 0;
        this.scoreElement.textContent = this.blockCounter;
        
        // Настройка колбэка для рестарта
        this.modalManager.setOnRestart(() => this.restart());
        
        // Ждем загрузки картинок перед стартом игры
        const checkImagesLoaded = () => {
            if (this.imagesLoaded) {
                // Картинки загружены, начинаем игру
                this.currentBlock = this.createNewBlock();
                this.startGameLoop();
            } else {
                // Ждем еще
                setTimeout(checkImagesLoaded, 100);
            }
        };
        
        // Начинаем проверку
        setTimeout(checkImagesLoaded, 100);
    }

    // Предзагрузка картинок блоков
    preloadBlockImages() {
        this.blockImages = {};
        this.blockSizes = {};
        this.imagesLoaded = false;
        this.imagesLoadedCount = 0;
        
        for (let i = 1; i <= this.imagesToLoad; i++) {
            const img = new Image();
            const imageName = `assets/block${i}.png`;
            img.src = imageName;
            
            img.onload = () => {
                this.blockImages[imageName] = img;
                this.blockSizes[imageName] = {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    ratio: img.naturalWidth / img.naturalHeight
                };
                
                this.imagesLoadedCount++;
                
                // Проверяем, все ли картинки загружены
                if (this.imagesLoadedCount === this.imagesToLoad) {
                    this.imagesLoaded = true;
                    this.updateAllBlockSizes();
                }
            };
            
            img.onerror = () => {
                console.error(`Ошибка загрузки: ${imageName}`);
                this.imagesLoadedCount++;
                
                // Создаем fallback цветной блок
                this.blockImages[imageName] = null;
                this.blockSizes[imageName] = {
                    width: this.baseBlockWidth,
                    height: this.baseBlockHeight,
                    ratio: this.baseBlockWidth / this.baseBlockHeight
                };
                
                if (this.imagesLoadedCount === this.imagesToLoad) {
                    this.imagesLoaded = true;
                    this.updateAllBlockSizes();
                }
            };
        }
    }
    
    // Обновить размеры ВСЕХ блоков после загрузки картинок
    updateAllBlockSizes() {
        // Обновить приземленные блоки
        this.blocks.forEach(block => {
            if (block.image && this.blockSizes[block.image]) {
                this.updateBlockSize(block);
            }
        });
        
        // Обновить текущий блок
        if (this.currentBlock && this.currentBlock.image) {
            this.updateBlockSize(this.currentBlock);
        }
        
        // Обновить падающий блок если есть
        if (this.fallingBlock && this.fallingBlock.image) {
            this.updateBlockSize(this.fallingBlock);
        }
    }
    
    // Обновить размеры конкретного блока на основе его картинки
    updateBlockSize(block) {
        if (block.image && this.blockSizes[block.image]) {
            const size = this.blockSizes[block.image];
            
            // Сохраняем оригинальные размеры
            block.originalWidth = size.width;
            block.originalHeight = size.height;
            block.aspectRatio = size.ratio;
            
            // Рассчитываем реальные размеры для коллайдера
            if (!block.width) block.width = this.baseBlockWidth;
            
            // Высота рассчитывается из ширины и соотношения сторон
            block.height = block.width / block.aspectRatio;
            
            // Если высота слишком маленькая, увеличиваем пропорционально
            const minHeight = this.baseBlockHeight;
            if (block.height < minHeight) {
                block.height = minHeight;
                block.width = block.height * block.aspectRatio;
            }
            
            // Также обновляем реальную высоту (используется для коллайдеров)
            block.realHeight = block.height;
        }
    }

    initCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        const maxCanvasWidth = Math.min(800, screenWidth * 0.95);
        const maxCanvasHeight = Math.min(600, screenHeight * 0.7);
        
        this.canvas.width = maxCanvasWidth;
        this.canvas.height = maxCanvasHeight;
        
        // Базовые размеры для расчета
        this.blockWidth = Math.min(this.baseBlockWidth, this.canvas.width * 0.3);
        this.blockHeight = this.baseBlockHeight * (this.canvas.height / 700);
        this.blockSpeed = this.baseSpeed * (this.canvas.width / 600);
        
        // Обновляем размеры всех существующих блоков
        this.blocks.forEach(block => {
            this.updateBlockSizeForResize(block);
        });
        
        // Обновляем текущий блок
        if (this.currentBlock) {
            this.updateBlockSizeForResize(this.currentBlock);
        }
    }
    
    // Обновить размер блока при ресайзе
    updateBlockSizeForResize(block) {
        if (!block.image || !this.blockSizes[block.image]) return;
        
        const size = this.blockSizes[block.image];
        const scaleX = this.canvas.width / 800; // Базовый масштаб
        
        // Обновляем ширину пропорционально ресайзу
        block.width = this.blockWidth * scaleX;
        
        // Рассчитываем высоту на основе соотношения сторон
        block.height = block.width / size.ratio;
        
        // Корректируем позицию X
        block.x = block.x * scaleX;
        
        // Обновляем реальную высоту
        block.realHeight = block.height;
        
        // Ограничиваем позицию
        if (block.x < 0) block.x = 0;
        if (block.x + block.width > this.canvas.width) {
            block.x = this.canvas.width - block.width;
        }
    }

    setupEventListeners() {
        // Ресайз окна
        window.addEventListener('resize', () => {
            this.initCanvas();
        });

        // Управление клавиатурой
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || !this.currentBlock || 
                this.currentBlock.hasLanded || this.fallingBlock) return;
            
            if (e.code === 'Space' && !this.currentBlock.isFalling) {
                this.currentBlock.isFalling = true;
                this.currentBlock.isMoving = false;
                this.currentBlock.speedY = 3;
            }
        });

        // Клик для падения
        this.canvas.addEventListener('click', () => {
            if (this.gameOver || this.fallingBlock) return;
            
            if (this.currentBlock && !this.currentBlock.isFalling && 
                !this.currentBlock.hasLanded) {
                this.currentBlock.isFalling = true;
                this.currentBlock.isMoving = false;
                this.currentBlock.speedY = 3;
            }
        });

        // Сенсорное управление
        this.setupTouchControls();
    }

    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameOver || !this.currentBlock || 
                this.currentBlock.hasLanded || 
                this.currentBlock.isFalling || this.fallingBlock) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            if (touch.clientY < this.canvas.height * 0.2) {
                this.currentBlock.isFalling = true;
                this.currentBlock.isMoving = false;
                this.currentBlock.speedY = 3;
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.gameOver || !this.currentBlock || 
                this.currentBlock.hasLanded || 
                this.currentBlock.isFalling || this.fallingBlock) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            
            if (Math.abs(deltaX) > 10) {
                this.currentBlock.x += deltaX * 0.5;
                
                if (this.currentBlock.x < 0) this.currentBlock.x = 0;
                if (this.currentBlock.x + this.currentBlock.width > this.canvas.width) {
                    this.currentBlock.x = this.canvas.width - this.currentBlock.width;
                }
                
                touchStartX = touch.clientX;
            }
        });
    }

    // Игровые методы
    createNewBlock() {        
        // НЕ увеличиваем счетчик здесь! Счетчик увеличивается только при успешном приземлении
        
        // Отображаем текущий количество успешно установленных блоков
        this.scoreElement.textContent = this.blockCounter;
        
        // Случайное направление движения
        const startDirection = Math.random() > 0.5 ? 1 : -1;
        
        // Определяем номер картинки в зависимости от позиции блока
        let blockNumber;
        
        // Следующий блок, который будет установлен
        const nextBlockNumber = this.blockCounter + 1;
        
        // ПЕРВЫЙ блок (block1) - будет когда blockCounter = 0
        if (nextBlockNumber === 1) {
            blockNumber = 1;
        }
        // ПОСЛЕДНИЙ блок (15-й) (block8) - ВЫИГРЫШ
        else if (nextBlockNumber === this.maxBlocks) {
            blockNumber = 8;
        }
        // Блоки между первым и последним (2-14) - случайные block2-7
        else {
            // Генерируем случайное число от 2 до 7 (block2.png до block7.png)
            blockNumber = Math.floor(Math.random() * 6) + 2; // 2, 3, 4, 5, 6, 7
        }
        
        const block = {
            x: this.canvas.width / 2 - this.baseBlockWidth / 2,
            y: 50,
            width: this.baseBlockWidth,
            height: this.baseBlockHeight,
            originalWidth: null,
            originalHeight: null,
            aspectRatio: null,
            realHeight: this.baseBlockHeight,
            speedX: this.blockSpeed * startDirection,
            speedY: 0,
            color: this.getRandomColor(),
            image: `assets/block${blockNumber}.png`,
            imageName: `block${blockNumber}.png`,
            blockNumber: blockNumber,
            isMoving: true,
            isFalling: false,
            hasLanded: false,
            willBeNumber: nextBlockNumber // Номер, который получит блок при успешном приземлении
        };
        
        // Обновляем размеры блока на основе его картинки
        this.updateBlockSize(block);
        
        return block;
    }

    getRandomColor() {
        const colors = ['#D62300', '#502314', '#8B4513', '#FFC72C', 
                       '#F5EBDC', '#FF5733', '#C70039', '#900C3F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    isBlockOnPrevious(block, previousBlock) {
        // Используем реальные размеры блоков для проверки столкновений
        const blockRealHeight = block.realHeight || block.height;
        const prevRealHeight = previousBlock.realHeight || previousBlock.height;
        
        // Минимальное перекрытие - 50% от ширины предыдущего блока
        const minOverlap = previousBlock.width * 0.5;
        
        const overlapLeft = Math.max(block.x, previousBlock.x);
        const overlapRight = Math.min(block.x + block.width, 
                                    previousBlock.x + previousBlock.width);
        const overlapWidth = overlapRight - overlapLeft;
        
        const blockCenter = block.x + block.width / 2;
        const prevCenter = previousBlock.x + previousBlock.width / 2;
        const centerOffset = Math.abs(blockCenter - prevCenter);
        const direction = blockCenter < prevCenter ? 'left' : 'right';
        
        return {
            isValid: overlapWidth >= minOverlap,
            overlap: overlapWidth,
            minOverlap: minOverlap,
            centerOffset: centerOffset,
            direction: direction
        };
    }

    startFallAnimation(block, previousBlock, overlapInfo) {
        this.fallingBlock = { ...block };
        this.fallDirection = overlapInfo.direction;
        
        if (this.fallDirection === 'left') {
            this.fallRotationCenter.x = previousBlock.x + overlapInfo.overlap;
            this.fallRotationCenter.y = previousBlock.y;
            this.fallAngle = 0;
            this.fallSpeed = -0.08;
        } else {
            this.fallRotationCenter.x = previousBlock.x + previousBlock.width - overlapInfo.overlap;
            this.fallRotationCenter.y = previousBlock.y;
            this.fallAngle = 0;
            this.fallSpeed = 0.08;
        }
        
        const instability = 1 - (overlapInfo.overlap / overlapInfo.minOverlap);
        this.fallSpeed *= (1 + instability);
        
        this.blocks.pop();
    }

    updateFallAnimation() {
        if (!this.fallingBlock) return false;
        
        this.fallAngle += this.fallSpeed * 10;
        
        if (this.fallDirection === 'left') {
            this.fallSpeed -= 0.003;
        } else {
            this.fallSpeed += 0.003;
        }
        
        this.fallRotationCenter.y += Math.abs(this.fallSpeed) * 5;
        
        const isFallen = (this.fallDirection === 'left' && this.fallAngle <= -90) || 
                         (this.fallDirection === 'right' && this.fallAngle >= 90) ||
                         this.fallRotationCenter.y > this.canvas.height + 100;
        
        if (isFallen) {
            this.fallingBlock = null;
            return true;
        }
        
        return false;
    }

    update() {
        if (this.gameOver) return;
        
        // Анимация падения
        if (this.fallingBlock) {
            if (this.updateFallAnimation()) {
                // ПРОИГРЫШ: показываем окно с задержкой
                setTimeout(() => {
                    this.modalManager.showGameOver(this.blocks.length);
                    this.gameOver = true;
                }, 100); // Задержка 0.8 секунды перед показом
            }
            return;
        }
        
        if (!this.currentBlock) {
            this.currentBlock = this.createNewBlock();
            return;
        }
        
        if (this.currentBlock.hasLanded) {
            return;
        }
        
        // Движение влево-вправо
        if (this.currentBlock.isMoving && !this.currentBlock.isFalling) {
            this.currentBlock.x += this.currentBlock.speedX;
            
            if (this.currentBlock.x <= 0) {
                this.currentBlock.x = 0;
                this.currentBlock.speedX *= -1;
            }
            if (this.currentBlock.x + this.currentBlock.width >= this.canvas.width) {
                this.currentBlock.x = this.canvas.width - this.currentBlock.width;
                this.currentBlock.speedX *= -1;
            }
        }
        
        // Падение
        if (this.currentBlock.isFalling) {
            this.currentBlock.y += this.currentBlock.speedY;
            this.currentBlock.speedY += 0.5;
            
            let collision = false;
            let collidedBlock = null;
            
            // Получаем реальную высоту текущего блока
            const currentBlockRealHeight = this.currentBlock.realHeight || this.currentBlock.height;
            
            for (let otherBlock of this.blocks) {
                // Получаем реальную высоту другого блока
                const otherBlockRealHeight = otherBlock.realHeight || otherBlock.height;
                
                // ИСПРАВЛЕННАЯ ПРОВЕРКА СТОЛКНОВЕНИЙ с учетом реальных высот:
                if (this.currentBlock.y + currentBlockRealHeight >= otherBlock.y &&
                    this.currentBlock.y <= otherBlock.y + otherBlockRealHeight &&
                    this.currentBlock.x + this.currentBlock.width >= otherBlock.x &&
                    this.currentBlock.x <= otherBlock.x + otherBlock.width) {
                    
                    collision = true;
                    collidedBlock = otherBlock;
                    
                    // Позиционируем блок с учетом его реальной высоты
                    this.currentBlock.y = otherBlock.y - currentBlockRealHeight;
                    break;
                }
            }
            
            // Столкновение с блоками
            if (collision && collidedBlock) {
                const previousBlock = this.blocks[this.blocks.length - 1];
                
                if (collidedBlock === previousBlock) {
                    const overlapInfo = this.isBlockOnPrevious(this.currentBlock, previousBlock);
                    
                    if (overlapInfo.isValid) {
                        // УСТОЙЧИВО - блок успешно приземлился!
                        this.currentBlock.hasLanded = true;
                        this.currentBlock.isFalling = false;
                        this.currentBlock.isMoving = false;
                        this.blocks.push({...this.currentBlock});
                        
                        // УВЕЛИЧИВАЕМ СЧЕТЧИК ТОЛЬКО ЗДЕСЬ - когда блок успешно приземлился
                        this.blockCounter++;
                        this.scoreElement.textContent = this.blockCounter; // Обновляем отображение
                        
                        // Проверяем, не выиграли ли мы (достигли 15 блоков)
                        if (this.blockCounter >= this.maxBlocks) {
                            this.gameOver = true;
                            // ВЫИГРЫШ: показываем окно с задержкой
                            setTimeout(() => {
                                this.modalManager.showSuccess();
                            }, 200); // Задержка 0.8 секунды перед показом
                            return;
                        }
                        
                        setTimeout(() => {
                            this.currentBlock = this.createNewBlock();
                        }, 100);
                        return;
                    } else {
                        // НЕУСТОЙЧИВО - блок упадет
                        this.currentBlock.hasLanded = true;
                        this.currentBlock.isFalling = false;
                        this.currentBlock.isMoving = false;
                        this.blocks.push({...this.currentBlock});
                        
                        setTimeout(() => {
                            this.startFallAnimation(this.currentBlock, previousBlock, overlapInfo);
                        }, 10);
                        return;
                    }
                } else {
                    // Не на предыдущий блок - сразу проигрыш
                    this.currentBlock.y = collidedBlock.y - currentBlockRealHeight;
                    this.currentBlock.hasLanded = true;
                    this.currentBlock.isFalling = false;
                    this.currentBlock.isMoving = false;
                    this.blocks.push({...this.currentBlock});
                    
                    // ПРОИГРЫШ: показываем окно с задержкой
                    setTimeout(() => {
                        this.modalManager.showGameOver(this.blocks.length);
                        this.gameOver = true;
                    }, 800); // Задержка 0.8 секунды перед показом
                    return;
                }
            }
            
            // Падение на пол
            if (this.currentBlock.y + currentBlockRealHeight >= this.canvas.height) {
                this.currentBlock.y = this.canvas.height - currentBlockRealHeight;
                this.currentBlock.hasLanded = true;
                this.currentBlock.isFalling = false;
                this.currentBlock.isMoving = false;
                
                if (this.blocks.length > 0) {
                    this.blocks.push({...this.currentBlock});
                    // ПРОИГРЫШ: показываем окно с задержкой
                    setTimeout(() => {
                        this.modalManager.showGameOver(this.blocks.length);
                        this.gameOver = true;
                    }, 800); // Задержка 0.8 секунды перед показом
                } else {
                    // Первый блок на полу - считается успешным приземлением
                    this.blocks.push({...this.currentBlock});
                    
                    // УВЕЛИЧИВАЕМ СЧЕТЧИК для первого блока
                    this.blockCounter++;
                    this.scoreElement.textContent = this.blockCounter;
                    
                    setTimeout(() => {
                        this.currentBlock = this.createNewBlock();
                    }, 100);
                }
                return;
            }
        }
    }

    // Метод для отрисовки PNG блока с сохранением пропорций
    drawBlockImage(block) {
        // Если картинки не загружены - рисуем цветной блок
        if (!this.imagesLoaded || !this.blockImages || !this.blockImages[block.image]) {
            this.ctx.fillStyle = block.color || '#D62300';
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
            return { x: block.x, y: block.y, width: block.width, height: block.height };
        }
        
        const img = this.blockImages[block.image];
        if (!img) {
            this.ctx.fillStyle = block.color || '#D62300';
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
            return { x: block.x, y: block.y, width: block.width, height: block.height };
        }
        
        // Используем уже рассчитанные размеры блока
        const targetWidth = block.width;
        const targetHeight = block.height;
        
        // Рисуем картинку
        this.ctx.drawImage(
            img, 
            block.x, 
            block.y,
            targetWidth, 
            targetHeight
        );
        
        // Возвращаем реальные координаты и размеры отрисованной картинки
        return { 
            x: block.x, 
            y: block.y, 
            width: targetWidth, 
            height: targetHeight 
        };
    }
    
    draw() {
        // Очистка
        this.ctx.fillStyle = '#FCF6EC';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Приземленные блоки
        this.blocks.forEach(block => {
            let renderInfo;
            
            if (block.image) {
                renderInfo = this.drawBlockImage(block);
            } else {
                this.ctx.fillStyle = block.color;
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
                renderInfo = { x: block.x, y: block.y, width: block.width, height: block.height };
            }
        });
        
        // Текущий падающий блок
        if (this.currentBlock && !this.currentBlock.hasLanded) {
            let renderInfo;
            
            if (this.currentBlock.image) {
                renderInfo = this.drawBlockImage(this.currentBlock);
            } else {
                this.ctx.fillStyle = this.currentBlock.color;
                this.ctx.fillRect(this.currentBlock.x, this.currentBlock.y, 
                                this.currentBlock.width, this.currentBlock.height);
                renderInfo = { 
                    x: this.currentBlock.x, 
                    y: this.currentBlock.y, 
                    width: this.currentBlock.width, 
                    height: this.currentBlock.height 
                };
            }
        }
        
        // Анимированное падение
        this.drawFallingBlock();
    }

    drawFallingBlock() {
        if (!this.fallingBlock) return;
        
        this.ctx.save();
        this.ctx.translate(this.fallRotationCenter.x, this.fallRotationCenter.y);
        this.ctx.rotate(this.fallAngle * (Math.PI / 180));
        
        const blockX = this.fallingBlock.x - this.fallRotationCenter.x;
        const blockY = this.fallingBlock.y - this.fallRotationCenter.y;
        
        let renderX = blockX;
        let renderY = blockY;
        let renderWidth = this.fallingBlock.width;
        let renderHeight = this.fallingBlock.height;
        
        // Если есть картинка
        if (this.fallingBlock.image && this.imagesLoaded && 
            this.blockImages && this.blockImages[this.fallingBlock.image]) {
            
            const img = this.blockImages[this.fallingBlock.image];
            
            this.ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
        } else {
            // Fallback на цветной блок
            this.ctx.fillStyle = this.fallingBlock.color;
            this.ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
        }
        
        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        
        if (!this.gameOver) {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            this.gameLoopRunning = false;
        }
    }

    startGameLoop() {
        this.gameLoopRunning = true;
        this.gameLoop();
    }

    restart() {
        this.gameOver = false;
        this.blocks = [];
        this.blockCounter = 0; // Сбрасываем счетчик
        this.currentBlock = null;
        this.fallingBlock = null;
        this.scoreElement.textContent = '0'; // Обнуляем отображение
        
        // Картинки уже загружены, не нужно загружать заново
        this.initCanvas();
        
        // Создаем первый блок
        this.currentBlock = this.createNewBlock();
        
        if (!this.gameLoopRunning) {
            this.startGameLoop();
        }
    }
}