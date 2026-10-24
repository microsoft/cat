// Theme functionality for landing page
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the saved theme
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
    }
    
    // Toggle theme function
    function toggleTheme() {
        const currentTheme = body.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
            // Switch to light mode
            body.removeAttribute('data-theme');
            themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            // Switch to dark mode
            body.setAttribute('data-theme', 'dark');
            themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    }
    
    // Add click handler for theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Add keyboard shortcut for theme toggle (Ctrl/Cmd + Shift + T)
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyT') {
            event.preventDefault();
            toggleTheme();
        }
    });
}

// Add smooth scroll behavior for better UX
function addSmoothScrolling() {
    // Add smooth scrolling to activity buttons (if they were internal links)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add hover effects and animations
function enhanceInteractivity() {
    const activityCards = document.querySelectorAll('.activity-card:not(.coming-soon)');
    
    activityCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    addSmoothScrolling();
    enhanceInteractivity();
});