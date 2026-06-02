// darkmode.js - 统一的深色模式切换逻辑（修复版）
(function() {
    // 获取当前深色模式状态
    function isDarkModeEnabled() {
        return (document.body && document.body.classList && document.body.classList.contains('dark-mode')) || 
               (document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('dark-mode'));
    }
    
    // 更新所有按钮的图标
    function updateAllButtons() {
        const isDark = isDarkModeEnabled();
        const buttons = document.querySelectorAll('#darkModeToggle');
        buttons.forEach(btn => {
            if (btn) {
                btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            }
        });
    }
    
    // 应用深色模式到整个页面
    function applyDarkMode(enabled) {
        if (enabled) {
            if (document.documentElement) document.documentElement.classList.add('dark-mode');
            if (document.body) document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            if (document.documentElement) document.documentElement.classList.remove('dark-mode');
            if (document.body) document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
        updateAllButtons();
    }
    
    // 切换深色模式
    function toggleDarkMode() {
        const isCurrentlyDark = isDarkModeEnabled();
        applyDarkMode(!isCurrentlyDark);
    }
    
    // 初始化：读取 localStorage 并应用
    function initDarkMode() {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'enabled') {
            applyDarkMode(true);
        } else {
            applyDarkMode(false);
        }
    }
    
    // 绑定所有切换按钮的事件
    function bindToggleButtons() {
        const buttons = document.querySelectorAll('#darkModeToggle');
        buttons.forEach(btn => {
            if (!btn) return;
            try {
                // 移除旧的事件监听器（避免重复绑定）
                const newBtn = btn.cloneNode(true);
                if (btn.parentNode) {
                    btn.parentNode.replaceChild(newBtn, btn);
                    newBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        toggleDarkMode();
                    });
                }
            } catch(e) {
                console.warn('Failed to bind dark mode button:', e);
            }
        });
    }
    
    // 监听 DOM 变化，确保动态添加的按钮也能绑定事件
    function observeDOMChanges() {
        if (!document.body) return;
        const observer = new MutationObserver(function(mutations) {
            let shouldBind = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.id === 'darkModeToggle') {
                            shouldBind = true;
                        }
                        if (node.nodeType === 1 && node.querySelectorAll && node.querySelectorAll('#darkModeToggle').length > 0) {
                            shouldBind = true;
                        }
                    });
                }
            });
            if (shouldBind) bindToggleButtons();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initDarkMode();
            bindToggleButtons();
            observeDOMChanges();
        });
    } else {
        // DOM 已经加载完成
        setTimeout(function() {
            initDarkMode();
            bindToggleButtons();
            observeDOMChanges();
        }, 0);
    }
    
    // 立即执行一次，防止页面闪烁（在 DOMContentLoaded 之前就设置好类）
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        if (document.documentElement) document.documentElement.classList.add('dark-mode');
        if (document.body) document.body.classList.add('dark-mode');
    }
})();