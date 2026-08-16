/**
 * DeepSeek Harness 桌面小宠 — host (Node) half.
 *
 * 服务端半体职责：
 * 1. 作为合法的 cordis Loader 条目（bundle patch 注入）。
 * 2. 可选：把使用者配置的外部资源作为静态文件 serve 给浏览器半体：
 *    - config.spritesDir    → /snoopy-pet/sprites/{name}.png（4 姿态精灵图）
 *    - config.messagesFile  → /snoopy-pet/messages（分时段语录，JSON 或纯文本）
 *    未配置时浏览器半体自动回退内置资源。
 *
 * 浏览器半体：exports["./client"] -> lib/client.js（dsh.client 声明发现）。
 */
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const SPRITES_PREFIX = "/snoopy-pet/sprites/";
const MESSAGES_PATH = "/snoopy-pet/messages";

/** 语录文件 MIME：JSON 用 application/json，其余按纯文本。 */
function messagesContentType(filePath) {
	return extname(filePath).toLowerCase() === ".json"
		? "application/json; charset=utf-8"
		: "text/plain; charset=utf-8";
}

/**
 * 注册精灵图静态路由。
 * @param ctx - cordis 上下文（webServer 服务）
 * @param spritesDir - 使用者精灵图目录（绝对路径）
 */
function registerSpritesRoute(ctx, spritesDir) {
	ctx.inject(["webServer"], (httpCtx) => {
		httpCtx.effect(() => httpCtx.webServer.register({
			kind: "prefix",
			path: SPRITES_PREFIX,
			handler: async (req, res) => {
				if (req.method !== "GET" && req.method !== "HEAD") {
					res.writeHead(405);
					res.end();
					return;
				}
				const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
				if (!pathname.startsWith(SPRITES_PREFIX)) {
					res.writeHead(404);
					res.end();
					return;
				}
				const name = pathname.slice(SPRITES_PREFIX.length);
				// 安全校验：只允许 .png、不含路径分隔符/上级目录
				if (!name || !name.endsWith(".png") || name.includes("/") || name.includes("\\") || name.includes("..")) {
					res.writeHead(404);
					res.end();
					return;
				}
				try {
					const body = await readFile(join(spritesDir, name));
					res.writeHead(200, {
						"content-type": "image/png",
						"cache-control": "no-cache"
					});
					res.end(body);
				} catch {
					res.writeHead(404);
					res.end();
				}
			}
		}), "snoopy-pet: sprites route");
	});
}

/**
 * 注册单个外部文件的静态路由（语录）。
 * @param ctx - cordis 上下文
 * @param routePath - 对外路径（如 /snoopy-pet/messages）
 * @param filePath - 使用者文件绝对路径
 * @param contentTypeFor - 由文件路径得出 content-type 的函数
 */
function registerFileRoute(ctx, routePath, filePath, contentTypeFor) {
	ctx.inject(["webServer"], (httpCtx) => {
		httpCtx.effect(() => httpCtx.webServer.register({
			kind: "prefix",
			path: routePath,
			handler: async (req, res) => {
				if (req.method !== "GET" && req.method !== "HEAD") {
					res.writeHead(405);
					res.end();
					return;
				}
				const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
				if (pathname !== routePath) {
					res.writeHead(404);
					res.end();
					return;
				}
				if (!filePath) {
					// 未配置：返回 404（而非落入 SPA fallback 的 index.html），
					// 浏览器半体据此回退内置资源。
					res.writeHead(404);
					res.end();
					return;
				}
				try {
					const body = await readFile(filePath);
					res.writeHead(200, {
						"content-type": contentTypeFor(filePath),
						"cache-control": "no-cache"
					});
					res.end(body);
				} catch {
					res.writeHead(404);
					res.end();
				}
			}
		}), "snoopy-pet: " + routePath);
	});
}

/**
 * 插件入口：可选地暴露使用者配置的外部资源（精灵图目录 / 语录文件）。
 * @param ctx - cordis 上下文
 * @param config - Loader 条目配置（cordis.patch.yml 的 config）
 */
export function apply(ctx, config) {
	const spritesDir = config?.spritesDir;
	if (spritesDir && typeof spritesDir === "string" && spritesDir.trim()) {
		registerSpritesRoute(ctx, spritesDir.trim());
	}

	const messagesFile = config?.messagesFile && typeof config.messagesFile === "string" && config.messagesFile.trim()
		? config.messagesFile.trim()
		: null;
	registerFileRoute(ctx, MESSAGES_PATH, messagesFile, messagesContentType);
}
