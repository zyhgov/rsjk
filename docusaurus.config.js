// docusaurus.config.js
import {themes as prismThemes} from 'prism-react-renderer';
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '若善文档',
  tagline: '若善云系统平台运维工作人员操作手册与一般性笔记文档网站。',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // ✅ 修复：去掉 URL 和 baseUrl 末尾的多余空格
  url: 'https://rsjk.zyhgov.cn', // 去掉前后空格
  baseUrl: '/',

  organizationName: '联合库UNHub',
  projectName: 'zhangyonghao',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

i18n: {
  defaultLocale: 'zh-Hans',
  locales: ['zh-Hans','zh-Hant', 'en',  'ja', 'ko' ,'ru'], 
},

  // ✅ 1. 启用 Mermaid 解析支持
  markdown: {
    mermaid: true, // ✅ 关键：允许 mermaid 语法解析
  },

  // ✅ 2. 在根级别添加 themes（不是放在 preset 里面）
  themes: [
    '@docusaurus/theme-mermaid',       // ✅ 必须在这里注册
    '@docusaurus/theme-live-codeblock' // ✅ 只有你安装了才保留
  ],

presets: [
  [
    'classic',
    /** @type {import('@docusaurus/preset-classic').Options} */
    ({
      docs: false,
      blog: {
        showReadingTime: true,
        feedOptions: {
          type: ['rss', 'atom'],
          xslt: true,
        },
        editUrl: 'https://github.com/zyhgov/rsjk/edit/main/', // ✅ 已修正
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
      },
      theme: {
        customCss: './src/css/custom.css',
      },
    }),
  ],
],

plugins: [
    // ✅ 新增：全局注入脚本，强制弹窗警告
    () => ({
  name: 'docusaurus-plugin-alert-private-access',
  injectHtmlTags() {
    return {
      headTags: [
        {
          tagName: 'script',
          innerHTML: `
            (function() {
              // 监听所有点击事件
              document.addEventListener('click', function(e) {
                let target = e.target;
                // 向上查找 <a> 标签
                while (target && target !== document) {
                  if (target.tagName === 'A' && target.getAttribute('href')) {
                    const href = target.getAttribute('href');
                    
                    // 判断是否是站内链接且以 /private/ 开头
                    if (href.startsWith('/private/') && !href.startsWith('http')) {
                      // 阻止默认跳转
                      e.preventDefault();
                      
                      // 弹出确认框
                      const confirmed = confirm(
                        '⚠️ 请注意，您正在访问受保护的内参文档。\\n\\n' +
                        '您的所有访问行为将被记录并审计。\\n\\n' +
                        '点击继续完成身份验证，已验证身份当天即可忽略警告。\\n' +
                        '在内参板块点击每个文档均会弹出此警告以提示数据安全。\\n\\n' +
                        '是否继续？\\n' +
                        '点击继续则表明您将接受我们的安全条款。'
                      );
                      
                      if (confirmed) {
                        // 直接跳转到目标页面（强制走服务端）
                        window.location.href = href;
                      }
                      return false;
                    }
                    break;
                  }
                  target = target.parentNode;
                }
              }, true);

              // SPA 路由变化时也检查（可选）
              const originalPushState = history.pushState;
              history.pushState = function(...args) {
                originalPushState.apply(this, args);
                // 可在此处添加日志或监控
              };
            })();
          `,
        },
      ],
    };
  },
}),

  [
    '@docusaurus/plugin-content-docs',
    {
      id: 'docs',
      path: 'docs',
      routeBasePath: 'docs',
      sidebarPath: './sidebars.js',
      editUrl: 'https://github.com/zyhgov/rsjk/edit/main/', // ✅ 已修正
    },
  ],
  [
    '@docusaurus/plugin-content-docs',
    {
      id: 'private',
      path: 'docs-private',
      routeBasePath: 'private',
      sidebarPath: './sidebars-private.js',
      editUrl: 'https://github.com/zyhgov/rsjk/edit/main/', // ✅ 已修正
    },
  ],
],
  themeConfig: {
  image: 'img/bg.jpg',
  metadata: [
    // 🔍 页面关键词（SEO）
    { name: 'keywords', content: '若善云, 若善文档, 云系统, 运维手册, 操作教程, 企业内参, 技术文档' },
    // 🐦 Twitter 卡片
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '若善文档 - 若善云系统平台运维操作手册' },
    { name: 'twitter:description', content: '若善云系统平台官方教程网站，提供全面的系统使用指南、操作教程和最佳实践。' },
    { name: 'twitter:image', content: 'https://rsjk.zyhgov.cn/img/bg.jpg' },
    // 🌐 Open Graph（用于微信、Facebook 等社交分享）
    { name: 'og:title', content: '若善文档 - 若善云系统平台运维操作手册' },
    { name: 'og:description', content: '若善云系统平台官方教程网站，提供全面的系统使用指南、操作教程和最佳实践。' },
    { name: 'og:image', content: 'https://rsjk.zyhgov.cn/img/bg.jpg' },
    { name: 'og:url', content: 'https://rsjk.zyhgov.cn' },
    { name: 'og:type', content: 'website' },
  ],
  headTags: [
    // 🔗 预连接到关键域名（提升加载速度）
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://rsjk.zyhgov.cn',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://rsc.rsjk.org.cn',
      },
    },
    // 🧩 结构化数据：Organization（帮助搜索引擎理解你的网站）
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '若善健康',
        url: 'https://rsjk.zyhgov.cn',
        logo: 'https://rsjk.zyhgov.cn/img/logo.svg',
        description: '若善云系统平台运维工作人员操作手册与一般性笔记文档网站。',
        sameAs: [
          'https://github.com/zyhgov',
          'https://govhub.zyhgov.cn'
        ]
      }),
    },
    // 📚 可选：为首页添加 WebSite 结构化数据
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '若善文档',
        url: 'https://rsjk.zyhgov.cn',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://rsjk.zyhgov.cn/search?q={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }),
    },
  ],
    navbar: {
      title: '若善文档',
      logo: {
        alt: '若善 Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          docsPluginId: 'docs',
          position: 'left',
          label: '文档教程',
        },
        {
          type: 'docSidebar',
          sidebarId: 'private',
          docsPluginId: 'private',
          position: 'left',
          label: '内部参考',
        },
        { to: '/blog', label: '日志更新', position: 'left' },
        
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/zyhgov', // ✅ 去掉空格
          label: 'GitHub',
          position: 'right',
        },
        
      ],
    },
    footer: {
      style: 'dark',
        logo: {
          alt: '若善健康 Footer Logo',
          src: 'img/logo-footer.png', // 支持 SVG、PNG 等格式
          width: 333,  // 可选：设置宽度（像素）
          // height: 40,  // 可选：设置高度
          // url: 'https://rsjk.zyhgov.cn' // 可选：点击 logo 跳转链接
        },
      links: [
        {
          title: '快速导航',
          items: [
            {
              label: '文档教程',
              to: '/docs/intro',
            },
            {
              label: '内部参考',
              to: '/private/internal-guide',
            },
            
          ],
        },
        {
          title: '系统链接',
          items: [
            {
              label: '若善云',
              href: 'https://rsc.rsjk.org.cn/', // ✅ 去掉空格
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '日志更新',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/zyhgov', // ✅ 去掉空格
            },
            // {
            //   label: 'zyhorg',
            //   href: 'https://zyhorg.cn', // ✅ 去掉空格
            // },
            {
              label: 'GovHub',
              href: 'https://govhub.zyhgov.cn', // ✅ 去掉空格
            },
          ],
        },
      ],
      copyright: `Copyright &copy; ${new Date().getFullYear()} RuoShan Health, Group. All rights reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'rust', 'go', 'java', 'bash', 'docker'],
    },

    // ✅ 3. 可选：设置 Mermaid 主题（推荐加上）
    mermaid: {
      theme: { light: 'default', dark: 'dark' },
    },
    algolia: {
      // Algolia 提供的应用 ID
      appId: 'SPM1VVUQFU',

      //  公开 API 密钥：提交它没有危险
      apiKey: 'bc9ffcc14c05413ef7f532053a48d66a',
      indexName: 'rsjk_docsruoshan-docs',
      // indexName: 'rsjk_zyhgov_cn_spm1vvuqfu_pages',

      // 可选：见下文
      contextualSearch: true,

      // 可选：声明哪些域名需要用 window.location 型的导航而不是 history.push。 适用于 Algolia 配置会爬取多个文档站点，而我们想要用 window.location.href 在它们之间跳转时。
      // externalUrlRegex: 'external\\.com|domain\\.com',

      // 可选：替换 Algolia 的部分网址。 在使用相同搜索索引支持多个不同 baseUrl 的部署时非常有用。 你可以在 “from” 中使用正则表达式或字符串。 比方说，localhost:3000 和 myCompany.com/docs
      replaceSearchResultPathname: {
        // 匹配所有不在 /docs/ 下但应该是的路径
        from: '^/(?!(docs|private|blog|search)/)([^/]+)$',
        to: '/docs/$2',
      },

      // 可选：Algolia 搜索参数
      searchParameters: {},
      placeholder: '搜索若善文档',

      // 可选：默认启用的搜索页路径（传递 `false` 以禁用它）
      searchPagePath: 'search',

      // 可选：Docsearch 的 insights 功能是否启用（默认为 `false`）
      insights: false,

      //... 其他 Algolia 参数
    },
  },
};

export default config;
