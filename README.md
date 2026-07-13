# MetaLab - Meta 分析软件

纯前端 Meta 分析工具，无需安装，浏览器直接打开即可使用。

## 功能

- 数据类型：二分类(OR/RR/RD)、连续型(MD/SMD)、直接效应量、相关系数(Fisher z)、比例、HR、诊断试验(TP/FP/FN/TN)
- 统计模型：固定效应 / 随机效应，DL/REML/HE/SJ 四种 tau^2 估计
- 异质性：Cochran's Q、I^2、tau^2、H 统计量、Galbraith 图、Baujat 图
- 发表偏倚：Egger 回归检验、Begg 秩相关检验、Trim and Fill
- 敏感性分析：留一法(Leave-one-out)、累积 Meta 分析
- Meta 回归：单变量加权回归、R^2 计算、气泡图
- 亚组分析：组间/组内 Q 检验
- 诊断试验：SROC 曲线、Se/Sp/PLR/NLR/DOR 汇总、Moses-Littenberg 模型
- 可视化：森林图、漏斗图、Galbraith 图、L'Abbe 图、Baujat 图、SROC 曲线、气泡图等
- 报告导出：完整分析报告、HTML 导出、打印

## 部署

### Vercel
1. 推送代码到 GitHub
2. Vercel Dashboard -> New Project -> Import Git Repository
3. Framework Preset 选 "Other"，直接 Deploy

### Cloudflare Pages
1. 推送代码到 GitHub
2. Cloudflare Dashboard -> Pages -> Create project -> Connect to Git
3. Framework preset 选 "None"，Build output directory 填 "."
4. Deploy

### 本地运行
python -m http.server 8090
然后访问 http://localhost:8090

## 技术栈
- 纯 HTML/CSS/JavaScript（无框架依赖）
- SVG 绘图（原生实现）
- PWA 支持（可安装到桌面、离线可用）

## 文件结构
- index.html - 主界面
- css/style.css - 样式
- js/stats.js - 统计计算引擎
- js/plots.js - 可视化模块
- js/app.js - 应用逻辑
- manifest.json - PWA 配置
- sw.js - Service Worker（离线缓存）
- vercel.json - Vercel 部署配置
- _headers - Cloudflare Pages 安全头配置
