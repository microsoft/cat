/**
 * Activity Timer - 20-minute auto-start timer for Agent Excellence Workshop
 */

class ActivityTimer {
    constructor() {
        this.duration = 20 * 60; // 20 minutes in seconds
        this.timeLeft = this.duration;
        this.interval = null;
        this.isRunning = false;
        this.isPaused = false;
        this.hasNotifiedHalfway = false;
        this.hasNotifiedFinal = false;
        
        this.init();
    }
    
    init() {
        this.createTimerElement();
        this.bindEvents();
        this.autoStart();
    }
    
    createTimerElement() {
        // Create timer container
        const timerContainer = document.createElement('div');
        timerContainer.className = 'activity-timer';
        timerContainer.id = 'activityTimer';
        
        timerContainer.innerHTML = `
            <div class="timer-header">
                <span class="timer-title">Activity Time</span>
                <div class="timer-controls">
                    <button class="timer-control-btn" id="timerPlayPause" title="Pause/Resume">⏸️</button>
                    <button class="timer-control-btn" id="timerReset" title="Reset Timer">🔄</button>
                </div>
            </div>
            <div class="timer-display" id="timerDisplay">20:00</div>
            <div class="timer-progress">
                <div class="timer-progress-bar" id="timerProgressBar" style="width: 100%"></div>
            </div>
            <div class="timer-status" id="timerStatus">Timer starting...</div>
        `;
        
        document.body.appendChild(timerContainer);
        
        // Store references to key elements
        this.timerElement = timerContainer;
        this.displayElement = document.getElementById('timerDisplay');
        this.statusElement = document.getElementById('timerStatus');
        this.progressBar = document.getElementById('timerProgressBar');
        this.playPauseBtn = document.getElementById('timerPlayPause');
        this.resetBtn = document.getElementById('timerReset');
    }
    
    bindEvents() {
        // Control buttons
        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePause();
        });
        
        this.resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.reset();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.togglePause();
            }
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                this.reset();
            }
        });
    }
    
    autoStart() {
        // Start timer automatically after a short delay to allow page to load
        setTimeout(() => {
            this.start();
        }, 2000); // 2 second delay to ensure page is fully loaded
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.statusElement.textContent = 'Timer running...';
        this.playPauseBtn.textContent = '⏸️';
        
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
        
        this.updateDisplay();
    }
    
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        clearInterval(this.interval);
        this.isPaused = true;
        this.statusElement.textContent = 'Timer paused - click ⏯️ to resume';
        this.playPauseBtn.textContent = '▶️';
    }
    
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        this.statusElement.textContent = 'Timer running...';
        this.playPauseBtn.textContent = '⏸️';
        
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
    }
    
    togglePause() {
        if (!this.isRunning) {
            this.start();
        } else if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    reset() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = this.duration;
        this.hasNotifiedHalfway = false;
        this.hasNotifiedFinal = false;
        
        this.statusElement.textContent = 'Timer reset - will auto-start';
        this.playPauseBtn.textContent = '⏸️';
        this.updateDisplay();
        this.updateStyle();
        
        // Hide any notifications
        const existingNotification = document.querySelector('.timer-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Auto-start again after reset
        setTimeout(() => {
            this.start();
        }, 1000);
    }
    
    tick() {
        if (this.isPaused) return;
        
        this.timeLeft--;
        this.updateDisplay();
        this.updateStyle();
        this.checkNotifications();
        
        if (this.timeLeft <= 0) {
            this.finish();
        }
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.displayElement.textContent = timeString;
        
        // Update progress bar
        const progress = (this.timeLeft / this.duration) * 100;
        this.progressBar.style.width = `${Math.max(0, progress)}%`;
    }
    
    updateStyle() {
        // Clear existing style classes
        this.timerElement.classList.remove('warning', 'urgent', 'finished');
        this.displayElement.classList.remove('warning', 'urgent', 'finished');
        this.progressBar.classList.remove('warning', 'urgent');
        
        if (this.timeLeft <= 0) {
            // Finished
            this.timerElement.classList.add('finished');
            this.displayElement.classList.add('finished');
            this.statusElement.textContent = 'Time\'s up! 🎉';
        } else if (this.timeLeft <= 60) {
            // Last minute - urgent
            this.timerElement.classList.add('urgent');
            this.displayElement.classList.add('urgent');
            this.progressBar.classList.add('urgent');
            this.statusElement.textContent = 'Less than 1 minute remaining!';
        } else if (this.timeLeft <= 300) {
            // Last 5 minutes - warning
            this.timerElement.classList.add('warning');
            this.displayElement.classList.add('warning');
            this.progressBar.classList.add('warning');
            this.statusElement.textContent = `${Math.ceil(this.timeLeft / 60)} minutes remaining`;
        } else {
            this.statusElement.textContent = 'Timer running...';
        }
    }
    
    checkNotifications() {
        // Notify at halfway point (10 minutes)
        if (!this.hasNotifiedHalfway && this.timeLeft <= 600) {
            this.hasNotifiedHalfway = true;
            this.showNotification('Halfway Point!', 'You have 10 minutes remaining for this activity.', false);
            this.playSound('notification');
        }
        
        // Notify at 5 minutes remaining
        if (!this.hasNotifiedFinal && this.timeLeft <= 300) {
            this.hasNotifiedFinal = true;
            this.showNotification('5 Minutes Remaining', 'Start wrapping up your current activity.', false);
            this.playSound('warning');
        }
    }
    
    finish() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.timeLeft = 0;
        this.updateDisplay();
        this.updateStyle();
        
        this.showNotification('Time\'s Up! 🎉', 'Great job! You\'ve completed the 20-minute activity session.', true);
        this.playSound('completion');
    }
    
    showNotification(title, message, isFinished = false) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.timer-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `timer-notification${isFinished ? ' finished' : ''}`;
        
        notification.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="timer-notification-close">Got it!</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds or when clicked
        const closeBtn = notification.querySelector('.timer-notification-close');
        const autoRemove = setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            notification.remove();
        });
    }
    
    playSound(type) {
        // Create audio context for sound notifications
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioCtx();
                
                const frequencies = {
                    'notification': [800, 1000],
                    'warning': [600, 800, 600],
                    'completion': [523, 659, 784, 1047] // C, E, G, C major chord
                };
                
                const freqs = frequencies[type] || [800];
                
                freqs.forEach((freq, index) => {
                    setTimeout(() => {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.value = freq;
                        oscillator.type = 'sine';
                        
                        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.3);
                    }, index * 150);
                });
            } catch (e) {
                console.log('Audio not supported');
            }
        }
    }
}

// Auto-initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if this is an activity page (not the main index)
    if (!window.location.pathname.endsWith('index.html') && 
        !window.location.pathname.endsWith('/') &&
        window.location.pathname.includes('agent-excellence')) {
        new ActivityTimer();
    }
});

// Export for manual initialization if needed
window.ActivityTimer = ActivityTimer;