// .github/scripts/generate-blog.js
const fs = require('fs');
const path = require('path');
const marked = require('marked');

// ========== 配置 ==========
const GITHUB_OWNER = 'etippei';
const GITHUB_REPO = 'pdf-tools';
const LABEL = 'blog-post';
const OUTPUT_DIR = 'posts';

// ========== 主函数 ==========
async function main() {
    console.log('📚 Fetching blog posts from GitHub Issues...');
    
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?labels=${LABEL}&state=all&per_page=50`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'PDFHub-Blog-Generator',
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const issues = await response.json();
    const publishedIssues = issues.filter(issue => issue.state === 'open');
    console.log(`📝 Found ${publishedIssues.length} published articles`);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const posts = [];
    for (const issue of publishedIssues) {
        const { number, title, body, created_at, labels } = issue;
        
        // 解析元数据
        const meta = parseMetadata(body);
        const content = stripMetadata(body);
        const category = meta.category || labels.find(l => l.name !== LABEL)?.name || 'Tips';
        const slug = generateSlug(title);
        const fileName = `${String(number).padStart(3, '0')}-${slug}.html`;
        
        // 渲染 Markdown 内容
        const htmlContent = renderMarkdown(content);
        const date = new Date(created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        // 生成完整的文章 HTML
        const fullHtml = generatePostHtml({
            id: number,
            title: title,
            slug: slug,
            content: htmlContent,
            date: formattedDate,
            category: category,
            excerpt: meta.excerpt || content.slice(0, 160) + (content.length > 160 ? '...' : '')
        });
        
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), fullHtml);
        console.log(`✅ Generated: ${fileName}`);
        
        posts.push({
            id: number,
            title: title,
            slug: slug,
            date: formattedDate,
            category: category,
            excerpt: meta.excerpt || content.slice(0, 160) + (content.length > 160 ? '...' : ''),
            file: fileName,
            created_at: created_at
        });
    }
    
    // 按日期排序
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 生成 blog.html
    generateBlogList(posts);
    
    // 生成文章索引 JSON
    const indexData = {
        posts: posts.map(post => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            date: post.date,
            category: post.category,
            excerpt: post.excerpt,
            file: post.file,
            url: `/posts/${post.file}`,
            created_at: post.created_at
        })),
        categories: [...new Set(posts.map(p => p.category))]
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2));
    console.log('📄 Generated: posts/index.json');
    
    console.log(`🎉 Done! Generated ${posts.length} articles.`);
}

// ========== 解析元数据 ==========
function parseMetadata(body) {
    const meta = {};
    if (!body) return meta;
    const lines = body.split('\n');
    let inMeta = false, metaEnd = false;
    for (const line of lines) {
        if (line.trim() === '---') {
            if (!inMeta) { inMeta = true; continue; }
            else { metaEnd = true; break; }
        }
        if (inMeta && !metaEnd) {
            const match = line.match(/^(\w+):\s*(.*)$/);
            if (match) meta[match[1].toLowerCase()] = match[2].trim();
        }
    }
    return meta;
}

function stripMetadata(body) {
    if (!body) return '';
    const lines = body.split('\n');
    let start = 0, end = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            if (start === 0) start = i + 1;
            else { end = true; start = i + 1; break; }
        }
    }
    return end ? lines.slice(start).join('\n') : body;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);
}

function renderMarkdown(markdown) {
    if (!markdown) return '';
    return marked.parse(markdown);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ========== 生成文章 HTML ==========
function generatePostHtml(post) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(post.title)} | AIPDFLY Blog</title>
    <meta name="description" content="${escapeHtml(post.excerpt)}">
    <meta name="keywords" content="${escapeHtml(post.category)}, pdf tips, pdf tutorial">
    <link rel="canonical" href="https://aipdfly.com/posts/${escapeHtml(post.file)}">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/dark-mode.css">
    <script src="/darkmode.js"></script>
    
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif; -webkit-font-smoothing: antialiased; }
        .markdown-body { line-height: 1.8; font-size: 16px; }
        .markdown-body h1 { font-size: 2em; margin: 1em 0 0.5em; font-weight: bold; }
        .markdown-body h2 { font-size: 1.5em; margin: 1em 0 0.5em; font-weight: bold; }
        .markdown-body h3 { font-size: 1.25em; margin: 0.8em 0 0.4em; font-weight: bold; }
        .markdown-body p { margin: 1em 0; }
        .markdown-body pre { background: #f4f4f4; padding: 1em; border-radius: 8px; overflow-x: auto; }
        .markdown-body code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; }
        .markdown-body img { max-width: 100%; height: auto; border-radius: 8px; }
        .markdown-body ul, .markdown-body ol { margin: 0.5em 0 0.5em 1.5em; }
        .markdown-body blockquote { border-left: 4px solid #8b5cf6; margin: 1em 0; padding-left: 1em; color: #666; }
        .markdown-body a { color: #8b5cf6; text-decoration: underline; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .markdown-body th, .markdown-body td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .markdown-body th { background: #f3f4f6; }
        .dark-mode .markdown-body th { background: #374151; }
        .dark-mode .markdown-body pre { background: #1e293b; }
        .dark-mode .markdown-body code { background: #1e293b; color: #e2e8f0; }
        .dark-mode .markdown-body blockquote { color: #9ca3af; }
        .dark-mode .markdown-body td { border-color: #374151; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
        .dark-mode ::-webkit-scrollbar-track { background: #1f2937; }
        #darkModeToggle { transition: all 0.2s ease; }
        #darkModeToggle:hover { transform: scale(1.05); }
    </style>
</head>
<body class="bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-10">
        <div class="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
            <a href="/" class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">AIPDFLY</a>
            <div class="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <a href="/" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all text-gray-700 hover:text-purple-600 hover:bg-gray-200"><i class="fas fa-wrench mr-2"></i> Tools</a>
                <a href="/blog.html" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all bg-purple-600 text-white shadow-sm"><i class="fas fa-newspaper mr-2"></i> Blog</a>
                <a href="/pricing.html" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all text-gray-700 hover:text-purple-600 hover:bg-gray-200"><i class="fas fa-tag mr-2"></i> Pricing</a>
            </div>
            <div class="flex items-center gap-4">
                <a href="/contact.html" class="text-gray-600 hover:text-purple-600 transition flex items-center gap-1"><i class="fas fa-envelope"></i> Contact</a>
                <a href="/help.html" class="text-gray-600 hover:text-purple-600 transition flex items-center gap-1"><i class="fas fa-question-circle"></i> Help</a>
                <button id="darkModeToggle" class="text-gray-600 hover:text-purple-600 transition text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><i class="fas fa-moon"></i></button>
                <div id="userSection"><a href="/login.html" class="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user"></i> Login</a></div>
            </div>
        </div>
    </header>

    <div class="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <article class="bg-white rounded-2xl shadow-lg p-6 md:p-10">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">${escapeHtml(post.title)}</h1>
            <div class="flex items-center gap-4 text-gray-500 mb-8 pb-4 border-b">
                <span><i class="far fa-calendar-alt mr-2"></i>${escapeHtml(post.date)}</span>
                <span><i class="fas fa-tag mr-2"></i>${escapeHtml(post.category)}</span>
            </div>
            <div class="markdown-body prose max-w-none">
                ${post.content}
            </div>
            <div class="mt-8 pt-6 border-t text-center">
                <a href="/blog.html" class="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700">
                    <i class="fas fa-arrow-left"></i> Back to Blog
                </a>
            </div>
        </article>
    </div>

    <footer class="bg-gray-800 text-gray-300 py-10 mt-12">
        <div class="container mx-auto px-4 lg:px-8 text-center text-sm">
            <p>&copy; 2026 AIPDFLY. All rights reserved.</p>
            <p class="mt-2">
                <a href="/privacy-policy.html" class="hover:text-white mx-2 transition">Privacy Policy</a> |
                <a href="/terms-of-service.html" class="hover:text-white mx-2 transition">Terms of Service</a> |
                <a href="/cookie-policy.html" class="hover:text-white mx-2 transition">Cookie Policy</a>
            </p>
        </div>
    </footer>
    <script>
        // 用户菜单
        const userEmail = localStorage.getItem('userEmail');
        const authToken = localStorage.getItem('authToken');
        const isPro = localStorage.getItem('isPro') === 'true';
        const userSection = document.getElementById('userSection');
        function initUserMenu() {
            if (!userSection) return;
            if (userEmail && authToken) {
                userSection.innerHTML = \`<div class="relative" id="userMenuContainer"><button id="userMenuBtn" class="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user-circle"></i><span>\${userEmail.split('@')[0]}</span><i class="fas fa-chevron-down text-xs ml-1"></i></button><div id="userDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 hidden">\${isPro ? '<p class="px-4 py-2 text-green-600 text-sm border-b"><i class="fas fa-crown mr-1"></i> Pro Member</p>' : ''}<a href="/account.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">My Account</a><a href="#" id="logoutBtn" class="block px-4 py-2 text-red-600 hover:bg-gray-100">Logout</a></div></div>\`;
                setTimeout(() => {
                    const container = document.getElementById('userMenuContainer');
                    const btn = document.getElementById('userMenuBtn');
                    const dropdown = document.getElementById('userDropdown');
                    if (btn && dropdown) {
                        btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
                        document.addEventListener('click', (e) => { if (container && !container.contains(e.target)) dropdown.classList.add('hidden'); });
                    }
                    const logout = document.getElementById('logoutBtn');
                    if (logout) logout.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('userEmail'); localStorage.removeItem('authToken'); localStorage.removeItem('isPro'); window.location.reload(); });
                }, 100);
            } else {
                userSection.innerHTML = \`<a href="/login.html" class="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user"></i> Login</a>\`;
            }
        }
        initUserMenu();
        // 暗黑模式
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.documentElement.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
        // 高亮当前标签
        const currentPage = window.location.pathname.split('/').pop() || 'blog.html';
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const href = btn.getAttribute('href').replace('/', '');
            if (href === currentPage || (currentPage.startsWith('posts/') && href === 'blog.html')) {
                btn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.remove('text-gray-700');
            } else {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-700');
            }
        });
    </script>
</body>
</html>`;
}

// ========== 生成博客列表页 ==========
function generateBlogList(posts) {
    let postsHtml = '';
    for (const post of posts) {
        postsHtml += `
            <div class="blog-card bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition">
                <div class="p-5">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-600 rounded-full">${escapeHtml(post.category)}</span>
                        <span class="text-xs text-gray-400"><i class="far fa-calendar-alt mr-1"></i>${escapeHtml(post.date)}</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(post.title)}</h3>
                    <p class="text-gray-500 mb-4">${escapeHtml(post.excerpt)}</p>
                    <a href="/posts/${escapeHtml(post.file)}" class="text-purple-600 font-medium hover:text-purple-700 cursor-pointer">Read More <i class="fas fa-arrow-right text-sm"></i></a>
                </div>
            </div>
        `;
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<script>if(localStorage.getItem('darkMode')==='enabled'){document.documentElement.classList.add('dark-mode');}</script>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Tips & Tutorials - AIPDFLY Blog</title>
    <meta name="description" content="Learn how to work with PDF files efficiently. Tips, tutorials, and guides about PDF editing, conversion, and optimization.">
    <meta name="keywords" content="pdf blog, pdf tips, pdf tutorial, how to edit pdf, pdf guide, document tips">
    <link rel="canonical" href="https://aipdfly.com/blog.html">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/dark-mode.css">
    <script src="/darkmode.js"></script>
    
    <style>
        .blog-card { transition: transform 0.2s, box-shadow 0.2s; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
        #darkModeToggle { transition: all 0.2s ease; }
        #darkModeToggle:hover { transform: scale(1.05); }
        
        .category-btn { transition: all 0.2s ease; }
        .category-btn.active { background-color: #7c3aed; color: white; }
        .category-btn:not(.active):hover { background-color: #e5e7eb; }
        .dark-mode .category-btn:not(.active) { color: #e5e7eb; }
        .dark-mode .category-btn:not(.active):hover { background-color: #374151; }
        
        .blog-card.hidden-card { display: none; }
    </style>
</head>
<body class="bg-gray-50">

    <header class="bg-white shadow-sm sticky top-0 z-10">
        <div class="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
            <a href="/" class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">AIPDFLY</a>
            <div class="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <a href="/" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all text-gray-700 hover:text-purple-600 hover:bg-gray-200"><i class="fas fa-wrench mr-2"></i> Tools</a>
                <a href="/blog.html" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all bg-purple-600 text-white shadow-sm"><i class="fas fa-newspaper mr-2"></i> Blog</a>
                <a href="/pricing.html" class="tab-btn px-6 py-2.5 rounded-full text-base font-semibold transition-all text-gray-700 hover:text-purple-600 hover:bg-gray-200"><i class="fas fa-tag mr-2"></i> Pricing</a>
            </div>
            <div class="flex items-center gap-4">
                <a href="/contact.html" class="text-gray-600 hover:text-purple-600 transition flex items-center gap-1"><i class="fas fa-envelope"></i> Contact</a>
                <a href="/help.html" class="text-gray-600 hover:text-purple-600 transition flex items-center gap-1"><i class="fas fa-question-circle"></i> Help</a>
                <button id="darkModeToggle" class="text-gray-600 hover:text-purple-600 transition text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><i class="fas fa-moon"></i></button>
                <div id="userSection"><a href="/login.html" class="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user"></i> Login</a></div>
            </div>
        </div>
    </header>

    <div class="container mx-auto px-4 lg:px-8 py-8 max-w-6xl">
        <div class="text-center mb-12">
            <h1 class="text-4xl md:text-5xl font-bold text-gray-800 mb-4">PDF Tips & Tutorials</h1>
            <p class="text-xl text-gray-600">Learn how to work with PDF files like a pro.</p>
        </div>

        <!-- 搜索框 -->
        <div class="max-w-xl mx-auto mb-8">
            <div class="relative">
                <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="searchInput" placeholder="Search articles..." class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" style="background-color: #ffffff; color: #1f2937;">
            </div>
        </div>

        <!-- 分类标签 -->
        <div id="categoryFilters" class="flex flex-wrap justify-center gap-2 mb-8">
            <button data-category="all" class="category-btn active px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white">All</button>
        </div>

        <!-- 文章列表 -->
        <div id="postsGrid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${postsHtml}
        </div>

        <!-- 无结果提示 -->
        <div id="noResults" class="text-center py-12 hidden">
            <i class="fas fa-newspaper text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">No articles found.</p>
        </div>
    </div>

    <footer class="bg-gray-800 text-gray-300 py-10 mt-12">
        <div class="container mx-auto px-4 lg:px-8 text-center text-sm">
            <p>&copy; 2026 AIPDFLY. All rights reserved.</p>
            <p class="mt-2">
                <a href="/privacy-policy.html" class="hover:text-white mx-2 transition">Privacy Policy</a> |
                <a href="/terms-of-service.html" class="hover:text-white mx-2 transition">Terms of Service</a> |
                <a href="/cookie-policy.html" class="hover:text-white mx-2 transition">Cookie Policy</a>
            </p>
        </div>
    </footer>

    <script>
        // 用户菜单
        const userEmail = localStorage.getItem('userEmail');
        const authToken = localStorage.getItem('authToken');
        const isPro = localStorage.getItem('isPro') === 'true';
        const userSection = document.getElementById('userSection');
        function initUserMenu() {
            if (!userSection) return;
            if (userEmail && authToken) {
                userSection.innerHTML = \`<div class="relative" id="userMenuContainer"><button id="userMenuBtn" class="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user-circle"></i><span>\${userEmail.split('@')[0]}</span><i class="fas fa-chevron-down text-xs ml-1"></i></button><div id="userDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 hidden">\${isPro ? '<p class="px-4 py-2 text-green-600 text-sm border-b"><i class="fas fa-crown mr-1"></i> Pro Member</p>' : ''}<a href="/account.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">My Account</a><a href="#" id="logoutBtn" class="block px-4 py-2 text-red-600 hover:bg-gray-100">Logout</a></div></div>\`;
                setTimeout(() => {
                    const container = document.getElementById('userMenuContainer');
                    const btn = document.getElementById('userMenuBtn');
                    const dropdown = document.getElementById('userDropdown');
                    if (btn && dropdown) {
                        btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
                        document.addEventListener('click', (e) => { if (container && !container.contains(e.target)) dropdown.classList.add('hidden'); });
                    }
                    const logout = document.getElementById('logoutBtn');
                    if (logout) logout.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('userEmail'); localStorage.removeItem('authToken'); localStorage.removeItem('isPro'); window.location.reload(); });
                }, 100);
            } else {
                userSection.innerHTML = \`<a href="/login.html" class="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"><i class="fas fa-user"></i> Login</a>\`;
            }
        }
        initUserMenu();

        // 暗黑模式
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.documentElement.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });

        // 高亮当前标签
        const currentPage = window.location.pathname.split('/').pop() || 'blog.html';
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const href = btn.getAttribute('href').replace('/', '');
            if (href === currentPage || (currentPage.startsWith('posts/') && href === 'blog.html')) {
                btn.classList.add('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.remove('text-gray-700');
            } else {
                btn.classList.remove('bg-purple-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-700');
            }
        });

        // ========== 分类功能 ==========
        const postsData = ${JSON.stringify(posts)};
        let allCategories = [];

        function renderPosts(category = 'all', search = '') {
            const grid = document.getElementById('postsGrid');
            const noResults = document.getElementById('noResults');
            
            const categories = new Set();
            postsData.forEach(p => { if (p.category) categories.add(p.category); });
            allCategories = Array.from(categories);
            
            renderCategoryButtons(allCategories, category);
            
            let filtered = postsData;
            if (category !== 'all') {
                filtered = filtered.filter(p => p.category === category);
            }
            if (search.trim()) {
                const s = search.toLowerCase().trim();
                filtered = filtered.filter(p => 
                    p.title.toLowerCase().includes(s) || 
                    p.excerpt.toLowerCase().includes(s)
                );
            }
            
            if (filtered.length === 0) {
                grid.innerHTML = '';
                noResults.classList.remove('hidden');
                return;
            }
            noResults.classList.add('hidden');
            
            grid.innerHTML = filtered.map(post => \`
                <div class="blog-card bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition">
                    <div class="p-5">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-600 rounded-full">\${escapeHtml(post.category || 'Tips')}</span>
                            <span class="text-xs text-gray-400"><i class="far fa-calendar-alt mr-1"></i>\${post.date || 'Recent'}</span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">\${escapeHtml(post.title)}</h3>
                        <p class="text-gray-500 mb-4">\${escapeHtml(post.excerpt || post.title)}</p>
                        <a href="/posts/\${post.file}" class="text-purple-600 font-medium hover:text-purple-700 cursor-pointer">Read More <i class="fas fa-arrow-right text-sm"></i></a>
                    </div>
                </div>
            \`).join('');
        }

        function renderCategoryButtons(categories, activeCategory) {
            const container = document.getElementById('categoryFilters');
            let html = \`<button data-category="all" class="category-btn \${activeCategory === 'all' ? 'active' : ''} px-4 py-2 rounded-full text-sm font-medium \${activeCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition">All</button>\`;
            categories.forEach(cat => {
                const isActive = activeCategory === cat;
                html += \`<button data-category="\${escapeHtml(cat)}" class="category-btn \${isActive ? 'active' : ''} px-4 py-2 rounded-full text-sm font-medium \${isActive ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition">\${escapeHtml(cat)}</button>\`;
            });
            container.innerHTML = html;
            
            container.querySelectorAll('.category-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cat = btn.dataset.category;
                    const search = document.getElementById('searchInput').value;
                    container.querySelectorAll('.category-btn').forEach(b => {
                        b.classList.remove('active', 'bg-purple-600', 'text-white');
                        b.classList.add('bg-gray-200', 'text-gray-700');
                    });
                    btn.classList.add('active', 'bg-purple-600', 'text-white');
                    btn.classList.remove('bg-gray-200', 'text-gray-700');
                    renderPosts(cat, search);
                });
            });
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 搜索框事件
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const search = e.target.value;
            const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
            renderPosts(activeCategory, search);
        });

        // 初始化
        renderPosts('all', '');
    </script>
</body>
</html>`;
    
    fs.writeFileSync('blog.html', html);
    console.log('📄 Generated: blog.html');
}

// ========== 运行主函数 ==========
main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
