// Firebase 配置（需要替换为你自己的配置）
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase（如果配置了的话）
let firebaseInitialized = false;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        firebaseInitialized = true;
    }
} catch (e) {
    console.log("Firebase not configured, using local mode only");
}

// 游戏状态
let storageMode = null; // 'local' 或 'cloud'
let currentUser = null;
let cats = [];
let currentCatId = null;
let nextCatId = 1;
let creatures = [];
let particles = [];
let creatureType = 'tadpole';
let backgroundColor = '#ffffff';
let uiLocked = true;
let lastLockTap = 0;
const lockDoubleTapMs = 350;

function launchFullScreen() {
    const element = document.documentElement;
    const request = element.requestFullscreen
        || element.mozRequestFullScreen
        || element.webkitRequestFullscreen
        || element.msRequestFullscreen;
    if (request) {
        request.call(element).catch(() => {});
    }
}

const difficultyLevels = [
    { id: 1, label: '新手', score: 10, hitRadius: 2.0 },
    { id: 2, label: '轻松', score: 20, hitRadius: 1.6 },
    { id: 3, label: '标准', score: 25, hitRadius: 1.3 },
    { id: 4, label: '困难', score: 35, hitRadius: 1.1 },
    { id: 5, label: '极限', score: 50, hitRadius: 1.0 }
];
let difficultyIndex = 2; // 默认标准档（索引2，对应 id 3）

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const uiElements = [
    document.getElementById('userInfo'),
    document.getElementById('catSelector'),
    document.getElementById('currentScore'),
    document.getElementById('statsPanel'),
    document.getElementById('controls')
];

const quickDock = document.getElementById('quickDock');
const panelRefs = {
    stats: document.getElementById('statsPanel'),
    controls: document.getElementById('controls'),
    settings: document.getElementById('settingsPanel')
};

function hideAllPanels() {
    Object.values(panelRefs).forEach(panel => {
        if (panel) {
            panel.classList.remove('panel-open');
            panel.classList.add('ui-hidden');
        }
    });
}

function togglePanel(key) {
    const panel = panelRefs[key];
    if (!panel) return;
    const willOpen = !panel.classList.contains('panel-open');
    hideAllPanels();
    if (willOpen) {
        panel.classList.remove('ui-hidden');
        panel.classList.add('panel-open');
    }
}

// ============ 欢迎屏幕逻辑 ============
document.getElementById('btnTrial').addEventListener('click', () => {
    storageMode = 'local';
    launchFullScreen();
    startGame();
});

document.getElementById('btnLogin').addEventListener('click', () => {
    if (!firebaseInitialized) {
        showAuthMessage('请先配置 Firebase，或使用体验模式', 'error');
        return;
    }
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.add('show');
});

// ============ 认证屏幕逻辑 ============
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
        hideAuthMessage();
    });
});

document.getElementById('authBack').addEventListener('click', () => {
    document.getElementById('authScreen').classList.remove('show');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    hideAuthMessage();
});

// 登录
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        storageMode = 'cloud';
        showAuthMessage('登录成功！', 'success');
        launchFullScreen();
        setTimeout(() => {
            document.getElementById('authScreen').classList.remove('show');
            startGame();
        }, 1000);
    } catch (error) {
        showAuthMessage('登录失败:  ' + error.message, 'error');
    }
});

// 注册
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
        showAuthMessage('两次密码输入不一致', 'error');
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        storageMode = 'cloud';
        showAuthMessage('注册成功！正在进入游戏... ', 'success');
        launchFullScreen();
        setTimeout(() => {
            document.getElementById('authScreen').classList.remove('show');
            startGame();
        }, 1000);
    } catch (error) {
        showAuthMessage('注册失败: ' + error.message, 'error');
    }
});

function showAuthMessage(message, type) {
    const msgEl = document.getElementById('authMessage');
    msgEl.textContent = message;
    msgEl.className = 'auth-message ' + type;
}

function hideAuthMessage() {
    document.getElementById('authMessage').className = 'auth-message';
}

function applyUILockState() {
    const lockBtn = document.getElementById('uiLock');
    if (uiLocked) {
        uiElements.forEach(el => el && el.classList.add('ui-hidden'));
        hideAllPanels();
        const quickDockEl = document.getElementById('quickDock');
        if (quickDockEl) quickDockEl.classList.add('ui-hidden');
        lockBtn.textContent = '🔒';
        lockBtn.classList.remove('unlocked');
        document.getElementById('manageCatsModal').classList.remove('show');
    } else {
        const quickDockEl = document.getElementById('quickDock');
        if (quickDockEl) quickDockEl.classList.remove('ui-hidden');
        uiElements.forEach(el => el && el.classList.add('ui-hidden'));
        ['userInfo', 'currentScore'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('ui-hidden');
        });
        // 解锁时只展示入口，不自动展开面板
        lockBtn.textContent = '🔓';
        lockBtn.classList.add('unlocked');
    }
}

function lockUI() {
    uiLocked = true;
    applyUILockState();
}

function unlockUI() {
    uiLocked = false;
    applyUILockState();
}

function handleLockTap() {
    const now = Date.now();
    if (now - lastLockTap <= lockDoubleTapMs) {
        uiLocked = !uiLocked;
        applyUILockState();
        lastLockTap = 0;
        return;
    }
    lastLockTap = now;
    setTimeout(() => {
        if (Date.now() - lastLockTap > lockDoubleTapMs) {
            lastLockTap = 0;
        }
    }, lockDoubleTapMs + 60);
}

// ============ 游戏启动 ============
function startGame() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('show');
    launchFullScreen();

    const userModeEl = document.getElementById('userMode');
    const userEmailEl = document.getElementById('userEmail');

    if (storageMode === 'local') {
        userModeEl.textContent = '📱 体验模式';
        userModeEl.className = 'user-mode';
        userEmailEl.textContent = '本地存储';
    } else {
        userModeEl.textContent = '☁️ 云端同步';
        userModeEl.className = 'user-mode cloud';
        userEmailEl.textContent = currentUser.email;
    }

    loadData();
    updateAllUI();
    updateDifficultyUI();
    initGame();
    uiLocked = true;
    applyUILockState();
    // 确保首屏弹出猫咪选择
    setTimeout(() => {
        if (!document.getElementById('manageCatsModal').classList.contains('show')) {
            openCatManager(true);
        }
    }, 60);
}

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('确定要退出吗？未保存的数据将会丢失。')) {
        if (storageMode === 'cloud' && firebaseInitialized) {
            await firebase.auth().signOut();
        }
        location.reload();
    }
});

// ============ 数据管理 ============
function initDefaultCats() {
    cats = [
        {
            id: 1,
            name: 'teo',
            totalScore: 0,
            sessionScore: 0,
            startTime: Date.now(),
            playTimeSeconds: 0,
            catchCount: 0
        },
        {
            id: 2,
            name: '汤圆',
            totalScore: 0,
            sessionScore: 0,
            startTime: Date.now(),
            playTimeSeconds: 0,
            catchCount: 0
        }
    ];
    currentCatId = 1;
    nextCatId = 3;
}

async function loadData() {
    if (storageMode === 'cloud' && firebaseInitialized && currentUser) {
        try {
            const snapshot = await firebase.database()
                .ref('users/' + currentUser.uid + '/gameData')
                .once('value');

            const data = snapshot.val();
            if (data) {
                cats = data.cats || [];
                currentCatId = data.currentCatId || (cats.length > 0 ? cats[0].id : null);
                nextCatId = data.nextCatId || 1;
                creatureType = data.creatureType || creatureType;
                if (typeof data.difficultyIndex === 'number') {
                    difficultyIndex = Math.min(Math.max(data.difficultyIndex, 0), difficultyLevels.length - 1);
                }
            } else {
                initDefaultCats();
            }
        } catch (error) {
            console.error('Load from cloud failed:', error);
            initDefaultCats();
        }
    } else {
        const saved = localStorage.getItem('catGameDataMulti');
        if (saved) {
            const data = JSON.parse(saved);
            cats = data.cats || [];
            currentCatId = data.currentCatId || (cats.length > 0 ? cats[0].id : null);
            nextCatId = data.nextCatId || 1;
            creatureType = data.creatureType || creatureType;
            if (typeof data.difficultyIndex === 'number') {
                difficultyIndex = Math.min(Math.max(data.difficultyIndex, 0), difficultyLevels.length - 1);
            }
        } else {
            initDefaultCats();
        }
    }

    if (cats.length === 0) {
        initDefaultCats();
    }
}

async function saveData() {
    const data = {
        cats,
        currentCatId,
        nextCatId,
        creatureType,
        difficultyIndex,
        lastUpdate: Date.now()
    };

    if (storageMode === 'cloud' && firebaseInitialized && currentUser) {
        try {
            await firebase.database()
                .ref('users/' + currentUser.uid + '/gameData')
                .set(data);
        } catch (error) {
            console.error('Save to cloud failed:', error);
        }
    } else {
        localStorage.setItem('catGameDataMulti', JSON.stringify(data));
    }
}

function getCurrentCat() {
    return cats.find(cat => cat.id === currentCatId);
}

function addCat(name) {
    const newCat = {
        id: nextCatId++,
        name: name || `猫咪${nextCatId}`,
        totalScore: 0,
        sessionScore: 0,
        startTime: Date.now(),
        playTimeSeconds: 0,
        catchCount: 0
    };
    cats.push(newCat);
    if (!currentCatId) {
        currentCatId = newCat.id;
    }
    return newCat;
}

function switchCat(catId) {
    currentCatId = catId;
    const cat = getCurrentCat();
    if (cat) {
        cat.startTime = Date.now();
        cat.sessionScore = 0;
    }
    renderCatSelector();
    updateAllUI();
    saveData();
}

// ============ UI 渲染 ============
function renderCatSelector() {
    const selector = document.getElementById('catSelector');
    selector.innerHTML = '';

    cats.forEach(cat => {
        const button = document.createElement('button');
        button.className = 'cat-button';
        if (cat.id === currentCatId) {
            button.classList.add('active');
        }
        button.innerHTML = `
            <span class="cat-name">🐱 ${cat.name}</span>
            <span class="cat-score">总分:  ${cat.totalScore}</span>
        `;
        button.addEventListener('click', () => {
            switchCat(cat.id);
        });
        selector.appendChild(button);
    });

    const addButton = document.createElement('button');
    addButton.className = 'add-cat-button';
    addButton.innerHTML = '➕';
    addButton.addEventListener('click', () => {
        const name = prompt('请输入新猫咪的名字: ');
        if (name && name.trim()) {
            addCat(name.trim());
            renderCatSelector();
            updateAllUI();
            saveData();
        }
    });
    selector.appendChild(addButton);
}

function updateStats() {
    const cat = getCurrentCat();
    if (!cat) return;

    cat.playTimeSeconds += 1;

    const minutes = Math.floor(cat.playTimeSeconds / 60);
    const seconds = cat.playTimeSeconds % 60;

    const avgPer10Min = cat.playTimeSeconds > 0
        ? (cat.totalScore / cat.playTimeSeconds * 600).toFixed(1)
        : '0.0';

    document.getElementById('totalScore').textContent = cat.totalScore;
    document.getElementById('playTime').textContent = `${minutes}分${seconds}秒`;
    document.getElementById('avgScore').textContent = avgPer10Min;
    document.getElementById('catchCount').textContent = cat.catchCount;

    updateLeaderboard();
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';

    const sortedCats = [...cats].sort((a, b) => {
        const avgA = a.playTimeSeconds > 0 ? (a.totalScore / a.playTimeSeconds * 600) : 0;
        const avgB = b.playTimeSeconds > 0 ? (b.totalScore / b.playTimeSeconds * 600) : 0;
        return avgB - avgA;
    });

    const medals = ['🥇', '🥈', '🥉'];

    sortedCats.forEach((cat, index) => {
        const avgScore = cat.playTimeSeconds > 0
            ? (cat.totalScore / cat.playTimeSeconds * 600).toFixed(1)
            : '0.0';

        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="leaderboard-rank">${medals[index] || (index + 1) + '.'}</span>
            <span class="leaderboard-name">${cat.name}</span>
            <span class="leaderboard-score">${avgScore}/10分</span>
        `;
        leaderboardList.appendChild(item);
    });
}

function updateAllUI() {
    renderCatSelector();
    const cat = getCurrentCat();
    if (cat) {
        document.querySelector('#currentScore .score-number').textContent = cat.sessionScore;
    }
    applyBackground();
    syncSettingsUI();
    updateStats();
}

function updateDifficultyUI() {
    const slider = document.getElementById('difficultyRange');
    const hint = document.getElementById('difficultyHint');
    const level = difficultyLevels[difficultyIndex];
    if (slider) {
        slider.value = String(level.id);
    }
    if (hint) {
        hint.textContent = `${level.label} · ${level.score}分/击`;
    }
}

function syncSettingsUI() {
    document.querySelectorAll('.creature-chip').forEach(btn => {
        if (btn.dataset.creature === creatureType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function applyBackground() {
    if (canvas) {
        canvas.style.background = backgroundColor;
    }
}

function setCreatureType(type) {
    creatureType = type;
    // 重置当前生物以应用新外观
    creatures = [];
    spawnCreature();
    saveData();
}

// ============ 游戏逻辑 ============
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {}
}

function playPeekSound() {
    playSound(520, 0.12);
    setTimeout(() => playSound(620, 0.12), 120);
}

function startDashSound() {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(260, audioContext.currentTime + 0.6);
        gainNode.gain.setValueAtTime(0.26, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.6);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        return { oscillator, gainNode };
    } catch (e) {
        return null;
    }
}

function stopDashSound(sound) {
    if (!sound) return;
    try {
        sound.gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
        sound.oscillator.stop(audioContext.currentTime + 0.08);
    } catch (e) {}
}

class Creature {
    constructor() {
        this.headRadius = Math.random() * 6 + 28;
        this.tailLength = this.headRadius * 4.8;
        this.tailThickness = this.headRadius * 0.18;
        this.color = creatureType === 'cockroach' ? '#5a3a1a' : creatureType === 'mouse' ? '#555' : '#000';
        this.wavePhase = Math.random() * Math.PI * 2;
        this.state = 'hidden';
        this.peekProgress = 0;
        this.pauseTimer = 0;
        this.hiddenTimer = 120; // ~2s before first peek
        this.dashSpeed = Math.random() * 3 + 13;
        this.dashSound = null;
        this.finished = false;
        this.peekSoundPlayed = false;

        const edges = ['left', 'right', 'top', 'bottom'];
        this.spawnEdge = edges[Math.floor(Math.random() * edges.length)];
        const margin = this.headRadius * 2;
        const pickY = Math.random() * (canvas.height - margin * 2) + margin;
        const pickX = Math.random() * (canvas.width - margin * 2) + margin;

        const diagonalChance = 0.35;
        let targetX = pickX;
        let targetY = pickY;

        switch (this.spawnEdge) {
            case 'left':
                this.x = -this.headRadius * 1.8;
                this.y = pickY;
                if (Math.random() < diagonalChance) {
                    targetX = canvas.width + this.headRadius * 2;
                    targetY = Math.random() < 0.5 ? -this.headRadius * 2 : canvas.height + this.headRadius * 2;
                } else {
                    targetX = canvas.width + this.headRadius * 2;
                }
                break;
            case 'right':
                this.x = canvas.width + this.headRadius * 1.8;
                this.y = pickY;
                if (Math.random() < diagonalChance) {
                    targetX = -this.headRadius * 2;
                    targetY = Math.random() < 0.5 ? -this.headRadius * 2 : canvas.height + this.headRadius * 2;
                } else {
                    targetX = -this.headRadius * 2;
                }
                break;
            case 'top':
                this.x = pickX;
                this.y = -this.headRadius * 1.8;
                if (Math.random() < diagonalChance) {
                    targetY = canvas.height + this.headRadius * 2;
                    targetX = Math.random() < 0.5 ? -this.headRadius * 2 : canvas.width + this.headRadius * 2;
                } else {
                    targetY = canvas.height + this.headRadius * 2;
                }
                break;
            default:
                this.x = pickX;
                this.y = canvas.height + this.headRadius * 1.8;
                if (Math.random() < diagonalChance) {
                    targetY = -this.headRadius * 2;
                    targetX = Math.random() < 0.5 ? -this.headRadius * 2 : canvas.width + this.headRadius * 2;
                } else {
                    targetY = -this.headRadius * 2;
                }
                break;
        }

        const dirVecX = targetX - this.x;
        const dirVecY = targetY - this.y;
        const len = Math.max(1e-3, Math.hypot(dirVecX, dirVecY));
        this.dir = { x: dirVecX / len, y: dirVecY / len };

        this.peekDistance = this.headRadius * 2.4;
        this.basePos = { x: this.x, y: this.y };
    }

    update() {
        if (this.finished) return;

        switch (this.state) {
            case 'hidden':
                this.hiddenTimer--;
                if (this.hiddenTimer <= 0) {
                    this.x = this.basePos.x;
                    this.y = this.basePos.y;
                    this.state = 'peeking';
                }
                break;
            case 'peeking':
                if (!this.peekSoundPlayed) {
                    playPeekSound();
                    this.peekSoundPlayed = true;
                }
                this.peekProgress = Math.min(1, this.peekProgress + 0.07);
                this.updatePeekPosition(this.peekProgress);
                if (this.peekProgress >= 1) {
                    this.state = 'pause';
                    this.pauseTimer = 60;
                }
                break;
            case 'pause':
                this.pauseTimer--;
                this.updatePeekPosition(1);
                if (this.pauseTimer <= 0) {
                    this.state = 'dash';
                    this.dashSound = startDashSound();
                }
                break;
            case 'dash':
                this.x += this.dir.x * this.dashSpeed;
                this.y += this.dir.y * this.dashSpeed;
                this.wavePhase += 0.48;
                if (this.isOffscreen(140)) {
                    stopDashSound(this.dashSound);
                    this.finished = true;
                }
                break;
            default:
                break;
        }
    }

    draw() {
        if (this.finished) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const angle = Math.atan2(this.dir.y, this.dir.x);
        ctx.rotate(angle);
        if (creatureType === 'cockroach') {
            this.drawRoach();
        } else if (creatureType === 'mouse') {
            this.drawMouse();
        } else {
            this.drawTadpole();
        }
        ctx.restore();
    }

    drawTadpole() {
        const tailWave = Math.sin(this.wavePhase) * this.tailLength * 0.09;
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = this.tailThickness;
        ctx.beginPath();
        ctx.moveTo(-this.headRadius * 0.2, 0);
        ctx.quadraticCurveTo(-this.tailLength * 0.35, tailWave, -this.tailLength, tailWave * 0.6);
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.headRadius, 0, Math.PI * 2);
        ctx.fill();

        const eyeRadius = this.headRadius * 0.28;
        const pupil = eyeRadius * 0.45;
        const eyeOffsetX = this.headRadius * -0.22;
        const eyeOffsetY = this.headRadius * -0.18;

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX + eyeRadius * 1.15, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeOffsetX, eyeOffsetY, pupil, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX + eyeRadius * 1.15, eyeOffsetY, pupil, 0, Math.PI * 2);
        ctx.fill();
    }

    drawRoach() {
        // body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.headRadius * 0.9, this.headRadius * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // head
        ctx.beginPath();
        ctx.ellipse(this.headRadius * 0.9, 0, this.headRadius * 0.45, this.headRadius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // legs
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-this.headRadius * 0.5, this.headRadius * 0.6 * i);
            ctx.lineTo(-this.headRadius * 1.2, this.headRadius * 1.1 * i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.headRadius * 0.2, this.headRadius * 0.6 * i);
            ctx.lineTo(this.headRadius * 0.9, this.headRadius * 1.1 * i);
            ctx.stroke();
        }
        // antennae
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.headRadius * 1.1, -this.headRadius * 0.3);
        ctx.lineTo(this.headRadius * 1.6, -this.headRadius * 0.9);
        ctx.moveTo(this.headRadius * 1.1, this.headRadius * 0.3);
        ctx.lineTo(this.headRadius * 1.6, this.headRadius * 0.9);
        ctx.stroke();
    }

    drawMouse() {
        ctx.fillStyle = this.color;
        // body
        ctx.beginPath();
        ctx.ellipse(0, 0, this.headRadius * 1.1, this.headRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // head
        ctx.beginPath();
        ctx.ellipse(this.headRadius * 0.9, 0, this.headRadius * 0.55, this.headRadius * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        // ears
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.arc(this.headRadius * 1.2, -this.headRadius * 0.3, this.headRadius * 0.25, 0, Math.PI * 2);
        ctx.arc(this.headRadius * 1.2, this.headRadius * 0.3, this.headRadius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // tail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.headRadius * 1.1, 0);
        ctx.quadraticCurveTo(-this.headRadius * 2.5, this.headRadius * 0.6, -this.headRadius * 3.4, 0);
        ctx.stroke();
        // eye
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(this.headRadius * 1.35, 0, this.headRadius * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    isClicked(x, y, hitRadiusMultiplier = 1.1) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.headRadius * hitRadiusMultiplier;
    }

    runAway(fromX, fromY) {
        // Movement is scripted; ignore runAway to keep path consistent.
    }

    updatePeekPosition(progress) {
        this.x = this.basePos.x + this.dir.x * this.peekDistance * progress;
        this.y = this.basePos.y + this.dir.y * this.peekDistance * progress;
        this.wavePhase += 0.22;
    }

    isOffscreen(buffer) {
        return this.x < -buffer || this.x > canvas.width + buffer || this.y < -buffer || this.y > canvas.height + buffer;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.color = color;
        this.life = 30;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.3;
        this.life--;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function spawnCreature() {
    if (creatures.length === 0) {
        creatures.push(new Creature());
    }
}

function handleTouch(x, y) {
    const cat = getCurrentCat();
    if (!cat) return;

    const difficulty = difficultyLevels[difficultyIndex];

    let caught = false;

    creatures.forEach((creature, index) => {
        if (creature.isClicked(x, y, difficulty.hitRadius)) {
            cat.sessionScore += difficulty.score;
            cat.totalScore += difficulty.score;
            cat.catchCount += 1;

            playSound(800, 0.1);
            stopDashSound(creature.dashSound);

            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(
                    creature.x,
                    creature.y,
                    creature.color
                ));
            }

            creatures.splice(index, 1);
            spawnCreature();
            caught = true;

            updateAllUI();
            saveData();
        }
    });

    if (!caught) {
        playSound(200, 0.05);
    }
}

function gameLoop() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    creatures.forEach(creature => {
        creature.update();
        creature.draw();
    });

    creatures = creatures.filter(creature => !creature.finished);

    particles = particles.filter(particle => {
        particle.update();
        particle.draw();
        return particle.life > 0;
    });

    requestAnimationFrame(gameLoop);
}

function initGame() {
    creatures = [];
    spawnCreature();

    canvas.addEventListener('click', (e) => {
        handleTouch(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleTouch(touch.clientX, touch.clientY);
    });

    setInterval(() => {
        if (creatures.length < 1) {
            spawnCreature();
        }
    }, 3000);

    setInterval(() => {
        if (getCurrentCat()) {
            updateStats();
            saveData();
        }
    }, 1000);

    gameLoop();
}

// ============ UI 锁定按钮逻辑 ============
const uiLockBtn = document.getElementById('uiLock');
uiLockBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleLockTap();
});

// ============ 控制按钮 ============
const difficultyRange = document.getElementById('difficultyRange');
if (difficultyRange) {
    difficultyRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const idx = Math.min(Math.max(val - 1, 0), difficultyLevels.length - 1);
        difficultyIndex = idx;
        updateDifficultyUI();
        saveData();
    });
}
document.getElementById('manageCatsBtn').addEventListener('click', () => {
    openCatManager(false);
});

function openCatManager(forceOpen = false) {
    const modal = document.getElementById('manageCatsModal');
    const editList = document.getElementById('catEditList');
    let selectedId = currentCatId || (cats[0] && cats[0].id);

    const rebuildList = () => {
        editList.innerHTML = '';
        cats.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'cat-edit-item';
            item.dataset.catId = cat.id;
            item.innerHTML = `
                <label class="cat-row">
                    <input type="radio" name="catSelect" value="${cat.id}" ${cat.id === selectedId ? 'checked' : ''}>
                    <input type="text" name="catName" value="${cat.name}" data-cat-id="${cat.id}" maxlength="15">
                    <button class="remove-btn" data-cat-id="${cat.id}">🗑️</button>
                </label>
            `;
            editList.appendChild(item);
        });

        editList.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedId = e.target.value;
            });
        });

        editList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (editList.children.length <= 1) {
                    alert('至少需要保留一只猫咪！');
                    return;
                }
                btn.closest('.cat-edit-item').remove();
                if (btn.dataset.catId === String(selectedId)) {
                    const firstRow = editList.querySelector('input[type="radio"]');
                    if (firstRow) {
                        firstRow.checked = true;
                        selectedId = firstRow.value;
                    }
                }
            });
        });
    };

    rebuildList();

    document.getElementById('addCatInputBtn').onclick = () => {
        const newId = `new-${Date.now()}`;
        const item = document.createElement('div');
        item.className = 'cat-edit-item';
        item.dataset.catId = newId;
        item.innerHTML = `
            <label class="cat-row">
                <input type="radio" name="catSelect" value="${newId}" checked>
                <input type="text" name="catName" value="新猫咪" data-cat-id="${newId}" maxlength="15">
                <button class="remove-btn" data-cat-id="${newId}">🗑️</button>
            </label>
        `;
        editList.appendChild(item);
        editList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = () => {
                if (editList.children.length <= 1) {
                    alert('至少需要保留一只猫咪！');
                    return;
                }
                btn.closest('.cat-edit-item').remove();
            };
        });
        editList.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        item.querySelector('input[type="radio"]').checked = true;
        selectedId = newId;
    };

    document.getElementById('saveManageBtn').onclick = () => {
        const rows = Array.from(editList.querySelectorAll('.cat-edit-item'));
        if (rows.length === 0) {
            alert('至少需要保留一只猫咪！');
            return;
        }
        const oldMap = new Map(cats.map(c => [String(c.id), c]));
        const newCats = [];
        rows.forEach(row => {
            const id = row.dataset.catId;
            const nameInput = row.querySelector('input[name="catName"]');
            const radio = row.querySelector('input[type="radio"]');
            const name = (nameInput.value || '').trim() || '未命名猫咪';
            if (id.startsWith('new-')) {
                const newCat = {
                    id: nextCatId++,
                    name,
                    totalScore: 0,
                    sessionScore: 0,
                    startTime: Date.now(),
                    playTimeSeconds: 0,
                    catchCount: 0
                };
                newCats.push(newCat);
                if (radio.checked) {
                    selectedId = newCat.id;
                }
            } else {
                const existing = oldMap.get(id);
                if (existing) {
                    existing.name = name;
                    newCats.push(existing);
                    if (radio.checked) {
                        selectedId = existing.id;
                    }
                }
            }
        });
        cats = newCats;
        if (!cats.find(c => c.id === selectedId)) {
            selectedId = cats[0].id;
        }
        currentCatId = typeof selectedId === 'string' ? parseInt(selectedId, 10) : selectedId;
        renderCatSelector();
        updateAllUI();
        saveData();
        modal.classList.remove('show');
    };

    document.getElementById('cancelManageBtn').onclick = () => {
        if (forceOpen) return; // 首次进入要求选择，禁用取消
        modal.classList.remove('show');
    };

    modal.classList.add('show');
}

document.getElementById('resetStatsBtn').addEventListener('click', () => {
    if (confirm('确定要重置所有猫咪的统计数据吗？此操作不可恢复！')) {
        cats.forEach(cat => {
            cat.totalScore = 0;
            cat.sessionScore = 0;
            cat.playTimeSeconds = 0;
            cat.catchCount = 0;
            cat.startTime = Date.now();
        });
        updateAllUI();
        saveData();
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// 快捷入口按钮
document.querySelectorAll('.quick-dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target === 'cats') {
            openCatManager(false);
        } else if (target === 'stats') {
            togglePanel('stats');
        } else if (target === 'settings') {
            togglePanel('settings');
        } else if (target === 'controls') {
            togglePanel('controls');
        }
    });
});

// 背景颜色选择
// 生物类型选择
document.querySelectorAll('.creature-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.creature;
        setCreatureType(type);
        document.querySelectorAll('.creature-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
