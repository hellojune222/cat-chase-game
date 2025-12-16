<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>猫咪追逐游戏 🐱</title>
    <link rel="stylesheet" href="cat.css">
</head>
<body>
    <!-- 欢迎屏幕 -->
    <div id="welcomeScreen">
        <div class="welcome-logo">🐱</div>
        <h1 class="welcome-title">猫咪追逐游戏</h1>
        <p class="welcome-subtitle">让你的猫咪享受追逐的乐趣</p>
        <div class="welcome-buttons">
            <button class="welcome-button btn-trial" id="btnTrial">
                <span class="icon">🎮</span>
                <span>体验一下</span>
            </button>
            <button class="welcome-button btn-login" id="btnLogin">
                <span class="icon">☁️</span>
                <span>登录/创建账户</span>
            </button>
        </div>
    </div>

    <!-- 登录/注册屏幕 -->
    <div id="authScreen">
        <div class="auth-container">
            <h2 class="auth-title">🐱 猫咪账户</h2>
            
            <div class="auth-message" id="authMessage"></div>

            <div class="auth-tabs">
                <button class="auth-tab active" data-tab="login">登录</button>
                <button class="auth-tab" data-tab="register">注册</button>
            </div>

            <!-- 登录表单 -->
            <form class="auth-form active" id="loginForm">
                <div class="form-group">
                    <label>邮箱</label>
                    <input type="email" id="loginEmail" placeholder="输入你的邮箱" required>
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="loginPassword" placeholder="输入密码" required>
                </div>
                <button type="submit" class="form-submit">登录</button>
            </form>

            <!-- 注册表单 -->
            <form class="auth-form" id="registerForm">
                <div class="form-group">
                    <label>邮箱</label>
                    <input type="email" id="registerEmail" placeholder="输入你的邮箱" required>
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" id="registerPassword" placeholder="至少6位" required minlength="6">
                </div>
                <div class="form-group">
                    <label>确认密码</label>
                    <input type="password" id="registerPasswordConfirm" placeholder="再次输入密码" required minlength="6">
                </div>
                <button type="submit" class="form-submit">创建账户</button>
            </form>

            <div class="auth-back" id="authBack">← 返回</div>
        </div>
    </div>

    <!-- 游戏容器 -->
    <div id="gameContainer">
        <!-- 用户信息 -->
        <div id="userInfo">
            <span class="user-mode" id="userMode">体验模式</span>
            <span id="userEmail"></span>
            <button class="logout-btn" id="logoutBtn">退出</button>
        </div>

        <!-- 猫咪选择器 -->
        <div id="catSelector"></div>

        <!-- 当前分数 -->
        <div id="currentScore">
            <div class="score-label">本局得分</div>
            <div class="score-number">0</div>
        </div>

        <!-- 统计面板 -->
        <div id="statsPanel">
            <h3>📊 当前猫咪统计</h3>
            <div class="stat-row">
                <span class="stat-label">总得分: </span>
                <span class="stat-value" id="totalScore">0</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">游戏时长:</span>
                <span class="stat-value" id="playTime">0分0秒</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">平均分/10分钟:</span>
                <span class="stat-value" id="avgScore">0.0</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">捕获次数:</span>
                <span class="stat-value" id="catchCount">0</span>
            </div>

            <div id="leaderboard">
                <h4>🏆 猫咪排行榜</h4>
                <div id="leaderboardList"></div>
            </div>
        </div>

        <!-- 控制按钮 -->
        <div id="controls">
            <button class="control-button" id="manageCatsBtn">👥 管理猫咪</button>
            <button class="control-button" id="resetStatsBtn">🔄 重置统计</button>
            <button class="control-button" id="switchCreatureBtn">🔀 切换动物</button>
            <div class="difficulty-control">
                <label for="difficultyRange">难度</label>
                <input type="range" id="difficultyRange" min="1" max="5" step="1" value="3">
                <div class="difficulty-hint" id="difficultyHint">标准 · 25分/击</div>
            </div>
        </div>

        <!-- 管理猫咪模态框 -->
        <div id="manageCatsModal" class="modal">
            <div class="modal-content">
                <h2>👥 管理猫咪</h2>
                <div class="cat-edit-list" id="catEditList"></div>
                <button class="add-cat-input-btn" id="addCatInputBtn">➕ 添加新猫咪</button>
                <div class="modal-buttons">
                    <button class="modal-button cancel" id="cancelManageBtn">取消</button>
                    <button class="modal-button save" id="saveManageBtn">保存</button>
                </div>
            </div>
        </div>

        <canvas id="gameCanvas"></canvas>
    </div>

    <button id="uiLock" aria-label="长按解锁功能区域" title="长按解锁显示功能 UI">🔒</button>

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

    <script src="cat.js" defer></script>
</body>
</html>
