class Game {
    constructor(canvasId, scoreElementId, modalManager) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById(scoreElementId);
        this.modalManager = modalManager;
        
        this.blocks = [];
        this.currentBlock = null;
        this.blockCounter = 0;
        this.gameOver = false;
        this.baseBlockWidth = 200;
        this.baseBlockHeight = 30;
        this.baseSpeed = 6;
        this.maxBlocks = 15;
        
        // анимационные переменные
        this.fallingBlock = null;
        this.fallAngle = 0;
        this.fallSpeed = 0;
        this.fallRotationCenter = { x: 0, y: 0 };
        this.fallDirection = 'right';
        
        this.fallingBlocks = [];
        
        // для загрузки картинок
        this.blockImages = {};
        this.blockSizes = {};
        this.imagesLoaded = false;
        this.imagesToLoad = 8;
        this.imagesLoadedCount = 0;
        
        this.blockWidth = 0;
        this.blockHeight = 0;
        
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameLoopRunning = false;
        
        // минимальные размеры блоков
        this.minBlockWidth = 100;
        this.minBlockHeight = 20;
        
        this.init();
    }

    init() {
        this.initCanvas();
        this.preloadBlockImages();
        this.setupEventListeners();
        
        this.blockCounter = 0;
        this.scoreElement.textContent = this.blockCounter;
        
        this.modalManager.setOnRestart(() => this.restart());
        
        const checkImagesLoaded = () => {
            if (this.imagesLoaded) {
                this.currentBlock = this.createNewBlock();
                this.startGameLoop();
            } else {
                setTimeout(checkImagesLoaded, 100);
            }
        };
        
        checkImagesLoaded();
    }

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
                
                if (this.imagesLoadedCount === this.imagesToLoad) {
                    this.imagesLoaded = true;
                    this.updateAllBlockSizes();
                }
            };
            
            img.onerror = () => {
                console.error(`Ошибка загрузки: ${imageName}`);
                this.imagesLoadedCount++;
                
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
    
    updateAllBlockSizes() {
        this.blocks.forEach(block => {
            if (block.image && this.blockSizes[block.image]) {
                this.updateBlockSize(block);
            }
        });
        
        if (this.currentBlock && this.currentBlock.image) {
            this.updateBlockSize(this.currentBlock);
        }
        
        if (this.fallingBlock && this.fallingBlock.image) {
            this.updateBlockSize(this.fallingBlock);
        }
        
        this.fallingBlocks.forEach(block => {
            if (block.image && this.blockSizes[block.image]) {
                this.updateBlockSize(block);
            }
        });
    }
    
    updateBlockSize(block) {
        if (block.image && this.blockSizes[block.image]) {
            const size = this.blockSizes[block.image];
            
            block.originalWidth = size.width;
            block.originalHeight = size.height;
            block.aspectRatio = size.ratio;
            
            if (!block.width) {
                if (window.innerWidth <= 480) {
                    block.width = Math.max(this.minBlockWidth, this.canvas.width * 0.35);
                } else if (window.innerWidth <= 768) {
                    block.width = Math.max(this.minBlockWidth, this.canvas.width * 0.3);
                } else {
                    block.width = Math.min(this.baseBlockWidth, this.canvas.width * 0.25);
                }
            }
            
            block.height = block.width / block.aspectRatio;
            
            const minHeight = window.innerWidth <= 480 ? this.minBlockHeight : this.baseBlockHeight;
            if (block.height < minHeight) {
                block.height = minHeight;
                block.width = block.height * block.aspectRatio;
            }
            
            block.realHeight = block.height;
        } else {
            if (!block.width) {
                if (window.innerWidth <= 480) {
                    block.width = Math.max(this.minBlockWidth, this.canvas.width * 0.35);
                } else if (window.innerWidth <= 768) {
                    block.width = Math.max(this.minBlockWidth, this.canvas.width * 0.3);
                } else {
                    block.width = Math.min(this.baseBlockWidth, this.canvas.width * 0.25);
                }
            }
            
            block.height = window.innerWidth <= 480 ? this.minBlockHeight : this.baseBlockHeight;
            block.realHeight = block.height;
        }
    }

    initCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let maxCanvasWidth, maxCanvasHeight;
        
        if (screenWidth <= 480) {
            maxCanvasWidth = Math.min(400, screenWidth * 0.95);
            maxCanvasHeight = Math.min(500, screenHeight * 0.65);
        } else if (screenWidth <= 768) {
            maxCanvasWidth = Math.min(600, screenWidth * 0.95);
            maxCanvasHeight = Math.min(550, screenHeight * 0.7);
        } else {
            maxCanvasWidth = Math.min(800, screenWidth * 0.95);
            maxCanvasHeight = Math.min(600, screenHeight * 0.7);
        }
        
        this.canvas.width = maxCanvasWidth;
        this.canvas.height = maxCanvasHeight;
        
        // адаптивные размеры блоков
        if (screenWidth <= 480) {
            this.blockWidth = Math.max(this.minBlockWidth, this.canvas.width * 0.35);
            this.blockHeight = this.minBlockHeight;
        } else if (screenWidth <= 768) {
            this.blockWidth = Math.max(this.minBlockWidth, this.canvas.width * 0.3);
            this.blockHeight = this.baseBlockHeight * (this.canvas.height / 700);
        } else {
            this.blockWidth = Math.min(this.baseBlockWidth, this.canvas.width * 0.25);
            this.blockHeight = this.baseBlockHeight * (this.canvas.height / 700);
        }
        
        // обновляем размеры существующих блоков
        this.blocks.forEach(block => {
            this.updateBlockSizeForResize(block);
        });
        
        if (this.currentBlock) {
            this.updateBlockSizeForResize(this.currentBlock);
        }
        
        this.fallingBlocks.forEach(block => {
            this.updateBlockSizeForResize(block);
        });
    }
    
    updateBlockSizeForResize(block) {
        if (!block.image) return;
        
        const screenWidth = window.innerWidth;
        let targetWidth;
        
        if (screenWidth <= 480) {
            targetWidth = Math.max(this.minBlockWidth, this.canvas.width * 0.35);
        } else if (screenWidth <= 768) {
            targetWidth = Math.max(this.minBlockWidth, this.canvas.width * 0.3);
        } else {
            targetWidth = Math.min(this.baseBlockWidth, this.canvas.width * 0.25);
        }
        
        const scaleFactor = targetWidth / (block.width || targetWidth);
        block.width = targetWidth;
        
        if (block.aspectRatio) {
            block.height = block.width / block.aspectRatio;
        } else {
            block.height = screenWidth <= 480 ? this.minBlockHeight : this.baseBlockHeight;
        }
        
        if (block.x < 0) block.x = 0;
        if (block.x + block.width > this.canvas.width) {
            block.x = this.canvas.width - block.width;
        }
        
        block.realHeight = block.height;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.initCanvas();
        });

        document.addEventListener('keydown', (e) => {
            if (this.gameOver || !this.currentBlock || 
                this.currentBlock.hasLanded || this.fallingBlock) return;
            
            if (e.code === 'Space' && !this.currentBlock.isFalling) {
                this.dropCurrentBlock();
            }
        });

        this.canvas.addEventListener('click', () => {
            this.handleTap();
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTap();
        });
    }

    handleTap() {
        if (this.gameOver || this.fallingBlock) return;
        
        if (this.currentBlock && !this.currentBlock.isFalling && 
            !this.currentBlock.hasLanded) {
            this.dropCurrentBlock();
        }
    }

    dropCurrentBlock() {
        if (this.currentBlock && !this.currentBlock.isFalling && 
            !this.currentBlock.hasLanded) {
            this.currentBlock.isFalling = true;
            this.currentBlock.isMoving = false;
            this.currentBlock.speedY = 6;
        }
    }

    createNewBlock() {        
        this.scoreElement.textContent = this.blockCounter;
        
        const startDirection = Math.random() > 0.5 ? 1 : -1;
        
        let blockNumber;
        const nextBlockNumber = this.blockCounter + 1;
        
        if (nextBlockNumber === 1) {
            blockNumber = 1;
        }
        else if (nextBlockNumber === this.maxBlocks) {
            blockNumber = 8;
        }
        else {
            blockNumber = Math.floor(Math.random() * 6) + 2;
        }
        
        let speedMultiplier = 1;
        if (window.innerWidth <= 480) {
            speedMultiplier = 0.8; 
        }
        
        const block = {
            x: this.canvas.width / 2 - this.baseBlockWidth / 2,
            y: 50,
            width: 0,
            height: 0, 
            originalWidth: null,
            originalHeight: null,
            aspectRatio: null,
            realHeight: 0,
            speedX: this.baseSpeed * startDirection * speedMultiplier,
            speedY: 0,
            color: this.getRandomColor(),
            image: `assets/block${blockNumber}.png`,
            imageName: `block${blockNumber}.png`,
            blockNumber: blockNumber,
            isMoving: true,
            isFalling: false,
            hasLanded: false,
            willBeNumber: nextBlockNumber
        };
        
        this.updateBlockSize(block);
        
        block.x = this.canvas.width / 2 - block.width / 2;
        
        return block;
    }

    getRandomColor() {
        const colors = ['#D62300', '#502314', '#8B4513', '#FFC72C', 
                       '#F5EBDC', '#FF5733', '#C70039', '#900C3F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    isBlockOnPrevious(block, previousBlock) {
        const blockRealHeight = block.realHeight || block.height;
        const prevRealHeight = previousBlock.realHeight || previousBlock.height;
        
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
            this.fallSpeed = -0.16;
        } else {
            this.fallRotationCenter.x = previousBlock.x + previousBlock.width - overlapInfo.overlap;
            this.fallRotationCenter.y = previousBlock.y;
            this.fallAngle = 0;
            this.fallSpeed = 0.16;
        }
        
        const instability = 1 - (overlapInfo.overlap / overlapInfo.minOverlap);
        this.fallSpeed *= (1 + instability);
        
        this.blocks.pop();
    }

    updateFallAnimation() {
        if (!this.fallingBlock) return false;
        
        this.fallAngle += this.fallSpeed * 10 * this.deltaTime;
        
        if (this.fallDirection === 'left') {
            this.fallSpeed -= 0.006 * this.deltaTime;
        } else {
            this.fallSpeed += 0.006 * this.deltaTime;
        }
        
        this.fallRotationCenter.y += Math.abs(this.fallSpeed) * 10 * this.deltaTime;
        
        const isFallen = (this.fallDirection === 'left' && this.fallAngle <= -90) || 
                         (this.fallDirection === 'right' && this.fallAngle >= 90) ||
                         this.fallRotationCenter.y > this.canvas.height + 100;
        
        if (isFallen) {
            this.fallingBlock = null;
            return true;
        }
        
        return false;
    }
    
    addFallingBlock(block) {
        const fallingBlock = {
            ...block,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height,
            realHeight: block.realHeight || block.height,
            speedY: 8,
            isFallingDown: true
        };
        
        this.fallingBlocks.push(fallingBlock);
    }
    
    updateFallingBlocks() {
        for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
            const block = this.fallingBlocks[i];
            
            block.speedY += 0.8 * this.deltaTime;
            block.y += block.speedY * this.deltaTime;
            
            if (block.y > this.canvas.height + 200) {
                this.fallingBlocks.splice(i, 1);
            }
        }
    }

    update() {
        if (this.gameOver) return;
        
        this.updateFallingBlocks();
        
        if (this.fallingBlock) {
            if (this.updateFallAnimation()) {
                setTimeout(() => {
                    this.modalManager.showGameOver(this.blockCounter);
                    this.gameOver = true;
                }, 100);
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
        
        // движение
        if (this.currentBlock.isMoving && !this.currentBlock.isFalling) {
            this.currentBlock.x += this.currentBlock.speedX * this.deltaTime;
            
            if (this.currentBlock.x <= 0) {
                this.currentBlock.x = 0;
                this.currentBlock.speedX *= -1;
            }
            if (this.currentBlock.x + this.currentBlock.width >= this.canvas.width) {
                this.currentBlock.x = this.canvas.width - this.currentBlock.width;
                this.currentBlock.speedX *= -1;
            }
        }
        
        if (this.currentBlock.isFalling) {
            this.currentBlock.y += this.currentBlock.speedY * this.deltaTime;
            this.currentBlock.speedY += 1.0 * this.deltaTime;
            
            let collision = false;
            let collidedBlock = null;
            
            const currentBlockRealHeight = this.currentBlock.realHeight || this.currentBlock.height;
            
            for (let otherBlock of this.blocks) {
                const otherBlockRealHeight = otherBlock.realHeight || otherBlock.height;
                
                if (this.currentBlock.y + currentBlockRealHeight >= otherBlock.y &&
                    this.currentBlock.y <= otherBlock.y + otherBlockRealHeight &&
                    this.currentBlock.x + this.currentBlock.width >= otherBlock.x &&
                    this.currentBlock.x <= otherBlock.x + otherBlock.width) {
                    
                    collision = true;
                    collidedBlock = otherBlock;
                    
                    this.currentBlock.y = otherBlock.y - currentBlockRealHeight;
                    break;
                }
            }
            
            if (collision && collidedBlock) {
                const previousBlock = this.blocks[this.blocks.length - 1];
                
                if (collidedBlock === previousBlock) {
                    const overlapInfo = this.isBlockOnPrevious(this.currentBlock, previousBlock);
                    
                    if (overlapInfo.isValid) {
                        // успешное падение
                        this.currentBlock.hasLanded = true;
                        this.currentBlock.isFalling = false;
                        this.currentBlock.isMoving = false;
                        this.blocks.push({...this.currentBlock});
                        
                        this.blockCounter++;
                        this.scoreElement.textContent = this.blockCounter;
                        
                        if (this.blockCounter >= this.maxBlocks) {
                            this.gameOver = true;
                            setTimeout(() => {
                                this.modalManager.showSuccess();
                            }, 200);
                            return;
                        }
                        
                        setTimeout(() => {
                            this.currentBlock = this.createNewBlock();
                        }, 100);
                        return;
                    } else {
                        // неудачное падение
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
                    // падение на не предыдущий блок
                    this.currentBlock.y = collidedBlock.y - currentBlockRealHeight;
                    this.currentBlock.hasLanded = true;
                    this.currentBlock.isFalling = false;
                    this.currentBlock.isMoving = false;
                    
                    this.addFallingBlock({...this.currentBlock});
                    
                    setTimeout(() => {
                        this.modalManager.showGameOver(this.blockCounter);
                        this.gameOver = true;
                    }, 800);
                    return;
                }
            }
            
            // падение на пол
            if (this.currentBlock.y + currentBlockRealHeight >= this.canvas.height) {
                this.currentBlock.y = this.canvas.height - currentBlockRealHeight;
                this.currentBlock.hasLanded = true;
                this.currentBlock.isFalling = false;
                this.currentBlock.isMoving = false;
                
                if (this.blocks.length > 0) {
                    this.addFallingBlock({...this.currentBlock});
                    
                    setTimeout(() => {
                        this.modalManager.showGameOver(this.blockCounter);
                        this.gameOver = true;
                    }, 800);
                } else {
                    // первый блок на полу
                    this.blocks.push({...this.currentBlock});
                    
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

    drawBlockImage(block) {
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
        
        const targetWidth = block.width;
        const targetHeight = block.height;
        
        this.ctx.drawImage(
            img, 
            block.x, 
            block.y,
            targetWidth, 
            targetHeight
        );
        
        return { 
            x: block.x, 
            y: block.y, 
            width: targetWidth, 
            height: targetHeight 
        };
    }
    
    draw() {
        this.ctx.fillStyle = '#FCF6EC';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.blocks.forEach(block => {
            if (block.image) {
                this.drawBlockImage(block);
            } else {
                this.ctx.fillStyle = block.color;
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
        
        this.fallingBlocks.forEach(block => {
            if (block.image) {
                this.drawBlockImage(block);
            } else {
                this.ctx.fillStyle = block.color;
                this.ctx.fillRect(block.x, block.y, block.width, block.height);
            }
        });
        
        if (this.currentBlock && !this.currentBlock.hasLanded) {
            if (this.currentBlock.image) {
                this.drawBlockImage(this.currentBlock);
            } else {
                this.ctx.fillStyle = this.currentBlock.color;
                this.ctx.fillRect(this.currentBlock.x, this.currentBlock.y, 
                                this.currentBlock.width, this.currentBlock.height);
            }
        }
        
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
        
        if (this.fallingBlock.image && this.imagesLoaded && 
            this.blockImages && this.blockImages[this.fallingBlock.image]) {
            
            const img = this.blockImages[this.fallingBlock.image];
            
            this.ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
        } else {
            this.ctx.fillStyle = this.fallingBlock.color;
            this.ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
        }
        
        this.ctx.restore();
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        this.deltaTime = (timestamp - this.lastTime) / 16.67;
        this.lastTime = timestamp;
        
        if (this.deltaTime > 2) this.deltaTime = 1;
        
        this.update();
        this.draw();
        
        if (!this.gameOver) {
            requestAnimationFrame((ts) => this.gameLoop(ts));
        } else {
            this.gameLoopRunning = false;
            this.lastTime = 0;
        }
    }

    startGameLoop() {
        this.gameLoopRunning = true;
        this.lastTime = 0;
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    restart() {
        this.gameOver = false;
        this.blocks = [];
        this.fallingBlocks = [];
        this.blockCounter = 0;
        this.currentBlock = null;
        this.fallingBlock = null;
        this.scoreElement.textContent = '0';
        this.lastTime = 0;
        
        this.initCanvas();
        
        this.currentBlock = this.createNewBlock();
        
        if (!this.gameLoopRunning) {
            this.startGameLoop();
        }
    }
}