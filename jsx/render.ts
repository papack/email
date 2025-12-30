// jsx/render.ts
import type { VNode, Child, VNodeLike } from "./jsx";

export type RenderResult = {
  html: string;
  text: string;
};

export async function render(node: VNodeLike): Promise<RenderResult> {
  return renderNode(await node);
}

/* =======================
 * internals
 * ======================= */

async function renderNode(node: VNode): Promise<RenderResult> {
  // Fragment
  if (node.type === "__fragment__") {
    return renderChildren(node.props.children ?? []);
  }

  // Component
  if (typeof node.type === "function") {
    const out = await node.type(node.props);
    return renderNode(out);
  }

  const { children = [], ...attrs } = node.props;

  let html = `<${node.type}`;
  let text = "";

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    html += v === true ? ` ${k}` : ` ${k}="${String(v)}"`;
  }

  html += ">";

  const rendered = await renderChildren(children);

  html += rendered.html;
  text += rendered.text;

  html += `</${node.type}>`;

  // <a> ist inline → href im Text anhängen
  if (node.type === "a") {
    const href = typeof attrs.href === "string" ? attrs.href : null;
    if (href) {
      text += ` (${href})`;
    }
  }

  // Block-Tags erzeugen Zeilenumbruch im Text
  if (isBlockTag(node.type)) {
    text += "\n";
  }

  return { html, text };
}

async function renderChildren(children: Child[]): Promise<RenderResult> {
  let html = "";
  let text = "";

  for (const c of children) {
    const r = await renderChild(c);
    html += r.html;
    text += r.text;
  }

  return { html, text };
}

async function renderChild(child: Child): Promise<RenderResult> {
  if (child == null || child === false || child === true) {
    return { html: "", text: "" };
  }

  if (child instanceof Promise) {
    return renderChild(await child);
  }

  if (Array.isArray(child)) {
    const parts = await Promise.all(child.map(renderChild));
    return {
      html: parts.map((p) => p.html).join(""),
      text: parts.map((p) => p.text).join(""),
    };
  }

  if (typeof child === "object") {
    return renderNode(child);
  }

  return {
    html: String(child),
    text: String(child),
  };
}

/* =======================
 * helpers
 * ======================= */

const BLOCK_TAGS = new Set([
  "div",
  "p",
  "section",
  "article",
  "br",
  "header",
  "footer",
  "main",
  "li",
]);

function isBlockTag(tag: string): boolean {
  return BLOCK_TAGS.has(tag);
}
