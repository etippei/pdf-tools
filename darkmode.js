// darkmode.js - 安全版
(function() {
    try {
        var savedMode = 'disabled';
        try {
            savedMode = localStorage.getItem('darkMode') || 'disabled';
        } catch(e) {}
        
        if (savedMode === 'enabled') {
            document.documentElement.classList.add('dark-mode');
            if (document.body) document.body.classList.add('dark-mode');
        }
        
        function init() {
            try {
                var toggleBtn = document.getElementById('darkModeToggle');
                if (!toggleBtn) return;
                
                function updateIcon() {
                    var isDark = document.body && document.body.classList.contains('dark-mode');
                    toggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                }
                
                toggleBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    try {
                        if (document.body.classList.contains('dark-mode')) {
                            document.body.classList.remove('dark-mode');
                            document.documentElement.classList.remove('dark-mode');
                            localStorage.setItem('darkMode', 'disabled');
                        } else {
                            document.body.classList.add('dark-mode');
                            document.documentElement.classList.add('dark-mode');
                            localStorage.setItem('darkMode', 'enabled');
                        }
                        updateIcon();
                    } catch(err) {}
                });
                
                updateIcon();
            } catch(err) {}
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } catch(err) {}
})();