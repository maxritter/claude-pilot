/**
 * Vite plugin that generates sitemap.xml at build time.
 *
 * Scans blog article .md files for slug and date in YAML frontmatter,
 * then writes a complete sitemap to the build output directory.
 * Runs automatically during `vite build` — no manual updates needed.
 */

import { type Plugin } from "vite";
import fs from "fs";
import path from "path";

const SITE_URL = "https://pilot-shell.com";

interface ArticleMeta {
  slug: string;
  date: string;
}

function extractArticleMeta(filePath: string): ArticleMeta | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const slugMatch = fmMatch[1].match(/^slug:\s*"([^"]+)"/m);
  const dateMatch = fmMatch[1].match(/^date:\s*"([^"]+)"/m);

  if (!slugMatch || !dateMatch) return null;

  return { slug: slugMatch[1], date: dateMatch[1] };
}

function scanArticles(blogDir: string): ArticleMeta[] {
  if (!fs.existsSync(blogDir)) return [];

  return fs
    .readdirSync(blogDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => extractArticleMeta(path.join(blogDir, f)))
    .filter((a): a is ArticleMeta => a !== null);
}

function buildSitemap(articles: ArticleMeta[]): {
  xml: string;
  totalUrls: number;
} {
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { loc: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: "/docs", lastmod: today, changefreq: "weekly", priority: "0.9" },
    { loc: "/blog", lastmod: today, changefreq: "weekly", priority: "0.8" },
  ];

  const articlePages = articles.map((a) => ({
    loc: `/blog/${a.slug}`,
    lastmod: a.date,
    changefreq: "monthly" as const,
    priority: "0.7",
  }));

  const allPages = [...staticPages, ...articlePages];

  const urls = allPages
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    )
    .join("\n");

  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    totalUrls: allPages.length,
  };
}

export default function sitemapPlugin(): Plugin {
  let outDir: string;

  return {
    name: "generate-sitemap",
    apply: "build",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    closeBundle() {
      const blogDir = path.resolve(__dirname, "src/content/blog");
      const articles = scanArticles(blogDir);
      const { xml, totalUrls } = buildSitemap(articles);
      const dest = path.resolve(outDir, "sitemap.xml");

      fs.writeFileSync(dest, xml);
      console.log(
        `\x1b[32m✓\x1b[0m sitemap.xml generated (${articles.length} articles, ${totalUrls} URLs total)`,
      );
    },
  };
}
