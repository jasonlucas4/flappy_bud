const canvas = document.getElementById('gameCanvas');
// NEW: Use alpha: false for better performance with non-transparent background
const ctx = canvas.getContext('2d', { alpha: false });

// NEW: Enable high-quality image scaling
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Screen dimensions
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 600;

// NEW: Scale for high DPI displays (Retina support)
const dpr = window.devicePixelRatio || 1;
canvas.width = SCREEN_WIDTH * dpr;
canvas.height = SCREEN_HEIGHT * dpr;
ctx.scale(dpr, dpr);

// NEW: Make sure the canvas CSS size matches our desired display size
canvas.style.width = SCREEN_WIDTH + 'px';
canvas.style.height = SCREEN_HEIGHT + 'px';

// Game constants
const FPS = 60;
const FRAME_TIME = 1000 / FPS;

// Colors
const SKY_BLUE = 'rgb(135, 206, 235)';
const WHITE = 'rgb(255, 255, 255)';
const BLACK = 'rgb(0, 0, 0)';
const GREEN = 'rgb(0, 200, 0)';
const RED = 'rgb(255, 0, 0)';

// Bird properties
const BIRD_X = 50;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -10;

// Pipe properties
const PIPE_WIDTH = 80;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;

// NEW: Preload images function for better loading handling
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

class Bird {
    constructor() {
        this.x = BIRD_X;
        this.y = SCREEN_HEIGHT / 2;
        this.vel = 0;
        this.width = BIRD_WIDTH;
        this.height = BIRD_HEIGHT;
        // NEW: Add rotation property for smooth bird tilting
        this.rotation = 0;
        
        // Load high-res image if available
        this.image = new Image();
        this.image.src = 'bird.png';
    }

    update() {
        this.vel += GRAVITY;
        this.y += this.vel;
        
        // NEW: Update rotation based on velocity for smooth tilting
        this.rotation = Math.min(Math.max(-30, (-this.vel * 4)), 90) * Math.PI / 180;
    }

    jump() {
        this.vel = JUMP_STRENGTH;
    }

    draw() {
        // NEW: Save context state for rotation
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        if (this.image.complete) {
            ctx.drawImage(
                this.image, 
                -this.width/2, 
                -this.height/2, 
                this.width, 
                this.height
            );
        } else {
            ctx.fillStyle = RED;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        
        // NEW: Restore context state after rotation
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

class Pipe {
    constructor() {
        this.x = SCREEN_WIDTH;
        this.width = PIPE_WIDTH;
        this.gap = PIPE_GAP;
        this.topHeight = Math.random() * (SCREEN_HEIGHT - this.gap - 100) + 50;
        this.bottomY = this.topHeight + this.gap;
        this.passed = false;

        this.image = new Image();
        this.image.src = 'pipe.png';
    }

    update() {
        this.x -= PIPE_SPEED;
    }

    draw() {
        if (this.image.complete) {
            // NEW: Add shadows to pipes for depth
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            
            // Draw top pipe
            ctx.translate(this.x + this.width / 2, this.topHeight / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(this.image, -this.width / 2, -this.topHeight / 2, this.width, this.topHeight);
            ctx.restore();

            // Draw bottom pipe with shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            ctx.drawImage(
                this.image,
                this.x,
                this.bottomY,
                this.width,
                SCREEN_HEIGHT - this.bottomY
            );
            ctx.restore();
        } else {
            ctx.fillStyle = GREEN;
            ctx.fillRect(this.x, 0, this.width, this.topHeight);
            ctx.fillRect(this.x, this.bottomY, this.width, SCREEN_HEIGHT - this.bottomY);
        }
    }

    checkCollision(bird) {
        const birdBounds = bird.getBounds();
        
        if (birdBounds.right > this.x && birdBounds.left < this.x + this.width) {
            if (birdBounds.top < this.topHeight || birdBounds.bottom > this.bottomY) {
                return true;
            }
        }
        
        return false;
    }

    isOffscreen() {
        return this.x + this.width < 0;
    }
}

class Game {
    constructor() {
        this.reset();
        this.setupEventListeners();
        this.loadFont();
    }

    async loadFont() {
        const font = new FontFace('MaximaNouva', 'url(MaximaNouva-Regular.otf)');
        await font.load();
        document.fonts.add(font);
    }

    reset() {
        this.bird = new Bird();
        this.pipes = [];
        this.score = 0;
        this.gameOver = false;
        this.lastPipeSpawn = 0;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                if (!this.gameOver) {
                    this.bird.jump();
                }
            } else if (event.code === 'KeyR' && this.gameOver) {
                this.reset();
            }
        });

        canvas.addEventListener('click', (event) => {
            event.preventDefault();
            if (!this.gameOver) {
                this.bird.jump();
            } else {
                this.reset();
            }
        });

        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            if (!this.gameOver) {
                this.bird.jump();
            } else {
                this.reset();
            }
        });

        document.addEventListener('touchmove', (event) => {
            event.preventDefault();
        }, { passive: false });
    }

    update() {
        if (this.gameOver) return;

        this.bird.update();

        if (this.lastPipeSpawn === 0 || performance.now() - this.lastPipeSpawn >= 1500) {
            this.pipes.push(new Pipe());
            this.lastPipeSpawn = performance.now();
        }

        this.pipes.forEach(pipe => {
            pipe.update();

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
            }

            if (pipe.checkCollision(this.bird)) {
                this.gameOver = true;
            }
        });

        this.pipes = this.pipes.filter(pipe => !pipe.isOffscreen());

        if (this.bird.y < 0 || this.bird.y + this.bird.height > SCREEN_HEIGHT) {
            this.gameOver = true;
        }
    }

    draw() {
        // NEW: Create gradient background for better visuals
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');  // Sky blue at top
        gradient.addColorStop(1, '#E0F6FF');  // Lighter blue at bottom
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        this.pipes.forEach(pipe => pipe.draw());
        this.bird.draw();

        // NEW: Add shadow to score text
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = WHITE;
        ctx.font = 'bold 24px MaximaNouva';
        ctx.fillText(`Score: ${this.score}`, 10, 30);
        ctx.restore();

        if (this.gameOver) {
            ctx.save();
            // NEW: Add semi-transparent overlay for game over screen
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            
            // NEW: Add shadow to game over text
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = WHITE;
            ctx.font = 'bold 32px MaximaNouva';
            ctx.fillText('Game Over!', SCREEN_WIDTH/2 - 80, SCREEN_HEIGHT/3);
            ctx.font = 'bold 24px MaximaNouva';
            ctx.fillText(`Score: ${this.score}`, SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/3 + 50);
            ctx.fillText('Tap to Restart', SCREEN_WIDTH/2 - 60, SCREEN_HEIGHT/3 + 100);
            ctx.restore();
        }
    }
}

const game = new Game();
let lastTime = 0;

function gameLoop(currentTime) {
    if (lastTime === 0) {
        lastTime = currentTime;
    }

    const deltaTime = currentTime - lastTime;

    if (deltaTime >= FRAME_TIME) {
        game.update();
        game.draw();
        lastTime = currentTime - (deltaTime % FRAME_TIME);
    }

    requestAnimationFrame(gameLoop);
}

gameLoop(0);
