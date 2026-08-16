// pet-test-harness.js — 用最小 DOM 桩在 Node 中执行 snoopy-pet 客户端 bundle，
// 复现浏览器挂载路径（load -> materialize -> apply），输出任何运行时错误。
const fs = require("fs");
const vm = require("vm");
const path = require("path");

function makeElement(tag) {
	const el = {
		tagName: tag,
		children: [],
		style: {},
		dataset: {},
		className: "",
		id: "",
		textContent: "",
		innerHTML: "",
		title: "",
		parentNode: null,
		offsetWidth: 0,
		classList: { _add: [], add(c) { this._add.push(c); }, remove(c) { this._add = this._add.filter((x) => x !== c); }, contains(c) { return this._add.includes(c); } },
		setPointerCapture() {},
		releasePointerCapture() {},
		addEventListener() {},
		removeEventListener() {},
		appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
		removeChild(child) { el.children = el.children.filter((c) => c !== child); },
		remove() { if (el.parentNode) el.parentNode.removeChild(el); },
		setAttribute(k, v) { el[k] = v; },
		getAttribute(k) { return el[k]; },
		querySelector() { return makeElement("div"); },
		querySelectorAll() { return []; }
	};
	return el;
}

const store = {};
const documentStub = {
	body: makeElement("body"),
	head: makeElement("head"),
	documentElement: makeElement("html"),
	getElementById() { return null; },
	createElement(tag) { return makeElement(tag); },
	addEventListener() {},
	removeEventListener() {}
};

// sandbox === globalThis === window
const sandbox = {
	innerWidth: 1280,
	innerHeight: 800,
	addEventListener() {},
	removeEventListener() {},
	setInterval() { return 1; },
	clearInterval() {},
	setTimeout() { return 2; },
	clearTimeout() {},
	localStorage: {
		getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
		setItem(k, v) { store[k] = String(v); },
		removeItem(k) { delete store[k]; }
	},
	console,
	Symbol
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = documentStub;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, "..", "lib", "client.js"), "utf8");

// shell 先安装 __ModuleLoader__，bundle 只调用 load
let factory = null;
sandbox.__ModuleLoader__ = { load(handoff) { factory = handoff.factory; } };
vm.runInContext(src, sandbox, { filename: "client.js" });
if (typeof factory !== "function") {
	console.error("FAIL: factory not captured via __ModuleLoader__.load");
	process.exit(1);
}

const requireFn = (spec) => { throw new Error("unexpected require: " + spec); };
try {
	const exportsObj = factory(requireFn);
	console.log("factory returned:", typeof exportsObj, "| has apply:", typeof exportsObj.apply === "function");
	const disposers = [];
	const ctx = { effect(cb) { disposers.push(cb); console.log("ctx.effect registered"); } };
	exportsObj.apply(ctx, {});
	console.log("apply() completed without throwing");
	const bodyChildren = documentStub.body.children.map((c) => c.id || c.tagName);
	console.log("body children after apply:", JSON.stringify(bodyChildren));
	const styleTags = documentStub.head.children.filter((c) => c.tagName === "style");
	console.log("style tags injected:", styleTags.length);
	if (bodyChildren.includes("sp-root")) {
		console.log("RESULT: pet mounted OK; dispose() = " + disposers.length + " disposer(s)");
		process.exit(0);
	}
	console.error("RESULT: pet NOT mounted (sp-root missing in body)");
	process.exit(1);
} catch (e) {
	console.error("RUNTIME ERROR:", e && e.stack ? e.stack : e);
	process.exit(1);
}
