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
          editUrl: 'https://github.com/zyhgov/rsjk/edit/main/blog/', // ✅ 去掉空格
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        // ❌ 删除这里错误的 themes 配置
        theme: {
          customCss: './src/css/custom.css',
          // themes: [...] ❌ 不要放在这里！
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'docs',
        path: 'docs',
        routeBasePath: 'docs',
        sidebarPath: './sidebars.js',
        editUrl: 'https://github.com/zyhgov/rsjk/edit/main/docs/', // ✅ 去掉空格
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'private',
        path: 'docs-private',
        routeBasePath: 'private',
        sidebarPath: './sidebars-private.js',
        editUrl: 'https://github.com/zyhgov/rsjk/edit/main/docs-private/', // ✅ 去掉空格
      },
    ],
  ],

  themeConfig: {
    image: 'img/bg.jpg',
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
              to: '/docs-private/internal-guide',
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
  },
};

export default config;