# 山间来信

一个记录日常、城市、记忆与植物的生活随笔博客。纯静态 HTML/CSS/JS，零构建、零外部依赖，直接由 GitHub Pages 托管。

**在线访问**：<https://949487.github.io/shan-jian-lai-xin/>

## 特点

- Material Design 3 + 玻璃质感：半透明毛玻璃卡片、流动色斑背景、纸纹颗粒
- 浅色 / 深色主题切换，带圆形扩散过渡动画（记忆用户选择）
- 顶部胶囊导航随滚动收缩，浮动按钮按滚动方向自动收放
- 首页两列文章卡片，支持标签筛选（带计数）与关键词搜索（`/` 快捷聚焦、`Esc` 清空）
- 文章页：滚动进度条、桌面侧边目录 / 移动端横向目录、滚动高亮、首字下沉、玻璃引用块、上一篇 / 下一篇、复制链接与分享
- 滚动揭示动画、涟漪反馈、Toast 提示，并支持 `prefers-reduced-motion`
- 移动端适配，封面图与图标本地存储
- 不依赖任何框架或第三方 CDN

## 目录结构

```text
index.html          首页
post.html           文章页（通过 ?slug= 读取）
about.html          关于页
404.html            404 页
data/posts.js       全部文章数据（标题、日期、标签、封面、正文）
assets/css/style.css  样式（MD3 设计令牌 + 玻璃组件）
assets/js/main.js     列表渲染、筛选、搜索、主题、文章渲染与目录
assets/img/          文章封面与 favicon.svg
```

## 新增文章

1. 在 `data/posts.js` 顶部的数组里新增一个对象：

```js
{
  slug: "my-post",              // URL 标识，唯一
  title: "文章标题",
  date: "2026-10-23",
  tags: ["生活"],
  excerpt: "首页摘要",
  cover: "assets/img/my-post.jpg",
  content: `<p>正文 HTML</p>`
}
```

2. 把封面图放进 `assets/img/`
3. 提交并推送，Pages 会自动重新构建

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 部署

仓库 Settings → Pages 已配置为 `main` 分支根目录，推送后约 1 分钟生效。
