const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen dimensions
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 600;

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

class Bird {
    constructor() {
        this.x = BIRD_X;
        this.y = SCREEN_HEIGHT / 2;
        this.vel = 0;
        this.width = BIRD_WIDTH;
        this.height = BIRD_HEIGHT;
        
        this.image = new Image();
        this.image.src = 'bird.png';
    }

    update() {
        this.vel += GRAVITY;
        this.y += this.vel;
    }

    jump() {
        this.vel = JUMP_STRENGTH;
    }

    draw() {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = RED;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
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
            // Draw top pipe
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.topHeight / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(this.image, -this.width / 2, -this.topHeight / 2, this.width, this.topHeight);
            ctx.restore();

            // Draw bottom pipe
            ctx.drawImage(
                this.image,
                this.x,
                this.bottomY,
                this.width,
                SCREEN_HEIGHT - this.bottomY
            );
        } else {
            ctx.fillStyle = GREEN;
            ctx.fillRect(this.x, 0, this.width, this.topHeight);
            ctx.fillRect(this.x, this.bottomY, this.width, SCREEN_HEIGHT - this.bottomY);
        }
    }

    checkCollision(bird) {
        const birdBounds = bird.getBounds();
        
        // Check collision with top pipe
        if (birdBounds.right > this.x && birdBounds.left < this.x + this.width &&
            birdBounds.top < this.topHeight) {
            return true;
        }
        
        // Check collision with bottom pipe
        if (birdBounds.right > this.x && birdBounds.left < this.x + this.width &&
            birdBounds.bottom > this.bottomY) {
            return true;
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
        // Keyboard controls (for desktop)
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                if (!this.gameOver) {
                    this.bird.jump();
                }
            } else if (event.code === 'KeyR' && this.gameOver) {
                this.reset();
            } else if (event.code === 'KeyQ' && this.gameOver) {
                // Handle quit if needed
            }
        });

        // Mouse and touch controls
        canvas.addEventListener('click', (event) => {
            event.preventDefault();
            if (!this.gameOver) {
                this.bird.jump();
            } else {
                this.reset();
            }
        });

        // Add touch event listeners
        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            if (!this.gameOver) {
                this.bird.jump();
            } else {
                this.reset();
            }
        });

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (event) => {
            event.preventDefault();
        }, { passive: false });
    }

    update() {
        if (this.gameOver) return;

        this.bird.update();

        // Spawn new pipes
        if (this.lastPipeSpawn === 0 || performance.now() - this.lastPipeSpawn >= 1500) {
            this.pipes.push(new Pipe());
            this.lastPipeSpawn = performance.now();
        }

        // Update and check pipes
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

        // Remove offscreen pipes
        this.pipes = this.pipes.filter(pipe => !pipe.isOffscreen());

        // Check for ceiling/floor collisions
        if (this.bird.y < 0 || this.bird.y + this.bird.height > SCREEN_HEIGHT) {
            this.gameOver = true;
        }
    }

    draw() {
        // Clear canvas
        ctx.fillStyle = SKY_BLUE;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Draw game elements
        this.pipes.forEach(pipe => pipe.draw());
        this.bird.draw();

        // Draw score
        ctx.fillStyle = BLACK;
        ctx.font = '18px MaximaNouva';
        ctx.fillText(`Score: ${this.score}`, 10, 30);

        if (this.gameOver) {
            ctx.fillStyle = BLACK;
            ctx.font = '18px MaximaNouva';
            ctx.fillText('Game Over!', SCREEN_WIDTH/2 - 40, SCREEN_HEIGHT/3);
            ctx.fillText(`Score: ${this.score}`, SCREEN_WIDTH/2 - 30, SCREEN_HEIGHT/3 + 50);
            ctx.fillText('Press R to Restart or Q to Quit', SCREEN_WIDTH/2 - 100, SCREEN_HEIGHT/3 + 100);
        }
    }
}

// Start the game
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
