// Operating Model Design Activity
let currentPhase = 1;

let opsData = {};
let drawnCards = [];

// Failure scenario cards based on the image
const failureCards = [
    {
        id: 'A',
        title: 'Drift',
        description: 'Users are asking the same question; satisfaction drops; answers feel outdated.',
        category: 'Quality Degradation'
    },
    {
        id: 'B', 
        title: 'Tool Failure',
        description: 'The agent says it completed an action, but the backend didn\'t change.',
        category: 'Integration Issue'
    },
    {
        id: 'C',
        title: 'RAI Block / Refusal Spike',
        description: 'Answers are increasingly blocked; users complain it "won\'t help".',
        category: 'Policy Issue'
    },
    {
        id: 'D',
        title: 'Performance Degradation',
        description: 'Response times are increasing; users are abandoning conversations.',
        category: 'System Health'
    },
    {
        id: 'E',
        title: 'Hallucination Spike',
        description: 'Agent is providing confident but incorrect information; trust eroding.',
        category: 'Quality Issue'
    },
    {
        id: 'F',
        title: 'Context Loss',
        description: 'Agent loses conversation thread; users have to repeat themselves.',
        category: 'Technical Issue'
    },
    {
        id: 'G',
        title: 'Escalation Loop',
        description: 'Users keep getting transferred between agent and humans without resolution.',
        category: 'Process Issue'
    },
    {
        id: 'H',
        title: 'Training Data Drift',
        description: 'Agent knowledge becomes stale; can\'t answer current business questions.',
        category: 'Knowledge Issue'
    }
];

// Initialize the page
function initializePage() {
    // Add event listeners for inputs to enable/disable button
    const requiredInputs = ['northStarOutcome', 'intent1', 'intent2', 'intent3', 'quality1', 'quality2', 'health1', 'health2', 'risk1'];
    requiredInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', checkOpsCardInputs);
        }
    });

    // Load theme
    loadTheme();
}

// Check if ops card inputs are complete
function checkOpsCardInputs() {
    const requiredInputs = ['northStarOutcome', 'intent1', 'intent2', 'intent3', 'quality1', 'quality2', 'health1', 'health2', 'risk1'];
    const createBtn = document.getElementById('createOpsCardBtn');
    
    const allFilled = requiredInputs.every(id => {
        const element = document.getElementById(id);
        return element && element.value.trim().length > 0;
    });
    
    if (createBtn) {
        createBtn.disabled = !allFilled;
        createBtn.textContent = allFilled ? 'Create Ops Card →' : 'Complete all fields to continue →';
    }
}

// Create ops card and move to phase 2
function createOpsCard() {
    // Collect all the ops card data
    opsData = {
        northStarOutcome: document.getElementById('northStarOutcome').value,
        intents: [
            document.getElementById('intent1').value,
            document.getElementById('intent2').value,
            document.getElementById('intent3').value
        ],
        signals: {
            quality: [
                document.getElementById('quality1').value,
                document.getElementById('quality2').value
            ],
            health: [
                document.getElementById('health1').value,
                document.getElementById('health2').value
            ],
            risk: [
                document.getElementById('risk1').value
            ]
        }
    };
    
    moveToPhase(2);
}

// Phase management
function moveToPhase(phaseNumber) {
    // Hide all phase content
    document.querySelectorAll('.phase-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all phase items
    document.querySelectorAll('.phase-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show target phase
    document.getElementById(`phase${phaseNumber}-content`).classList.remove('hidden');
    document.getElementById(`phase${phaseNumber}`).classList.add('active');
    
    currentPhase = phaseNumber;
    
    if (phaseNumber === 3) {
        generateFinalSummary();
    }
}



// Draw random failure cards
function drawFailureCards() {
    // Shuffle and pick 2-3 cards
    const shuffled = [...failureCards].sort(() => 0.5 - Math.random());
    const numCards = Math.floor(Math.random() * 2) + 2; // 2 or 3 cards
    drawnCards = shuffled.slice(0, numCards);
    
    // Display the cards
    const cardsContainer = document.getElementById('failureCards');
    cardsContainer.innerHTML = drawnCards.map(card => `
        <div class="failure-card">
            <div class="card-header">
                <span class="card-id">Card ${card.id}</span>
                <span class="card-category">${card.category}</span>
            </div>
            <h4>${card.title}</h4>
            <p>${card.description}</p>
        </div>
    `).join('');
    
    // Generate questions for each card
    generateIncidentQuestions();
}

// Generate incident response questions
function generateIncidentQuestions() {
    const questionsContainer = document.getElementById('incidentQuestions');
    
    questionsContainer.innerHTML = drawnCards.map((card, index) => `
        <div class="incident-card-questions">
            <h4>Card ${card.id}: ${card.title}</h4>
            <div class="question-group">
                <label>1. Which signal would tell you this is happening?</label>
                <select id="signal_${index}">
                    <option value="">Select a signal...</option>
                    <optgroup label="Quality Signals">
                        <option value="quality1">${opsData.signals.quality[0]}</option>
                        <option value="quality2">${opsData.signals.quality[1]}</option>
                    </optgroup>
                    <optgroup label="Health Signals">
                        <option value="health1">${opsData.signals.health[0]}</option>
                        <option value="health2">${opsData.signals.health[1]}</option>
                    </optgroup>
                    <optgroup label="Risk/Compliance Signals">
                        <option value="risk1">${opsData.signals.risk[0]}</option>
                    </optgroup>
                </select>
            </div>
            <div class="question-group">
                <label>2. Where would you look first?</label>
                <input type="text" id="lookFirst_${index}" placeholder="e.g., Application logs, user feedback, system metrics...">
            </div>
            <div class="question-group">
                <label>3. What is the likely fix category?</label>
                <select id="fixCategory_${index}">
                    <option value="">Select category...</option>
                    <option value="instruction-update">Instruction Update</option>
                    <option value="training-data">Training Data</option>
                    <option value="system-config">System Configuration</option>
                    <option value="integration-fix">Integration Fix</option>
                    <option value="policy-adjustment">Policy Adjustment</option>
                    <option value="escalation-process">Escalation Process</option>
                    <option value="monitoring-alert">Monitoring Alert</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Generate final summary
function generateFinalSummary() {
    const summaryContainer = document.getElementById('finalSummary');
    
    // Collect incident responses
    const incidentResponses = drawnCards.map((card, index) => ({
        card: card,
        signal: document.getElementById(`signal_${index}`)?.value || 'Not specified',
        lookFirst: document.getElementById(`lookFirst_${index}`)?.value || 'Not specified',
        fixCategory: document.getElementById(`fixCategory_${index}`)?.value || 'Not specified'
    }));
    
    summaryContainer.innerHTML = `
        <div class="summary-panel">
            <h3>📋 Your Operating Model Summary</h3>
            
            <div class="summary-section">
                <h4>🌟 North Star</h4>
                <p>${opsData.northStarOutcome}</p>
            </div>
            
            <div class="summary-section">
                <h4>🎯 User Intents</h4>
                <ul>
                    ${opsData.intents.map(intent => `<li>${intent}</li>`).join('')}
                </ul>
            </div>
            
            <div class="summary-section">
                <h4>📊 Monitoring Signals</h4>
                <div class="signals-summary">
                    <div><strong>Quality:</strong> ${opsData.signals.quality.join(', ')}</div>
                    <div><strong>Health:</strong> ${opsData.signals.health.join(', ')}</div>
                    <div><strong>Risk:</strong> ${opsData.signals.risk[0]}</div>
                </div>
            </div>
            
            <div class="summary-section">
                <h4>🚨 Incident Response Mapping</h4>
                ${incidentResponses.map(response => `
                    <div class="incident-summary">
                        <strong>${response.card.title}:</strong>
                        Signal: ${getSignalName(response.signal)} | 
                        Look: ${response.lookFirst} | 
                        Fix: ${response.fixCategory}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Helper function to get signal name
function getSignalName(signalId) {
    const signalMap = {
        'quality1': opsData.signals.quality[0],
        'quality2': opsData.signals.quality[1],
        'health1': opsData.signals.health[0],
        'health2': opsData.signals.health[1],
        'risk1': opsData.signals.risk[0]
    };
    return signalMap[signalId] || 'Not specified';
}

// Print operating model
function printOperatingModel() {
    if (currentPhase !== 3) {
        alert('Please complete all phases before printing.');
        return;
    }
    
    generateFinalSummary();
    window.print();
}

// Complete operating model design
function completeOperatingModel() {
    const finalData = {
        opsData: opsData,
        drawnCards: drawnCards,
        incidentResponses: drawnCards.map((card, index) => ({
            cardId: card.id,
            signal: document.getElementById(`signal_${index}`)?.value,
            lookFirst: document.getElementById(`lookFirst_${index}`)?.value,
            fixCategory: document.getElementById(`fixCategory_${index}`)?.value
        })),
        refinements: {
            instructionChange: document.getElementById('instructionChange')?.value,
            evaluationUpdate: document.getElementById('evaluationUpdate')?.value,
            telemetryEvents: document.getElementById('telemetryEvents')?.value
        }
    };
    
    localStorage.setItem('operatingModelResults', JSON.stringify(finalData));
    
    alert(`Operating Model Completed! 🎉\n\nYou've designed a comprehensive operational monitoring system for your agent. Great work!`);
}

// Theme functionality (shared with other pages)
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});