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
        const meta = parseMetadata(body);
        const content = stripMetadata(body);
        const category = meta.category || labels.find(l => l.name !== LABEL)?.name || 'Tips';
        const slug = generateSlug(title);
        const fileName = `${String(number).padStart(3, '0')}-${slug}.html`;
        
        const htmlContent = renderMarkdown(content);
        const date = new Date(created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        const fullHtml = generatePostHtml({
            id: number, title, slug, content: htmlContent,
            date: formattedDate, category,
            excerpt: meta.excerpt || content.slice(0, 160) + (content.length > 160 ? '...' : '')
        });
        
        fs.writeFileSync(path.join(OUTPUT_DIR, fileName), fullHtml);
        console.log(`✅ Generated: ${fileName}`);
        
        posts.push({
            id: number, title, slug, date: formattedDate, category,
            excerpt: meta.excerpt || content.slice(0, 160) + (content.length > 160 ? '...' : ''),
            file: fileName, created_at: created_at
        });
    }
    
    // 按日期排序
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 生成 blog.html
    generateBlogList(posts);
    
    // ===== 新增：生成文章索引 JSON =====
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

// ========== 辅助函数（同前） ==========
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

function generatePostHtml(post) {
    // ... 同前，生成文章 HTML ...
    return `<!DOCTYPE html>...`;
}

function generateBlogList(posts) {
    // ... 同前，生成 blog.html ...
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
