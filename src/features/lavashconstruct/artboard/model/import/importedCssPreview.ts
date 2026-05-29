import * as csstree from "css-tree";
import { CSS_SANDBOX_SCOPE_CLASS } from "./clipboardTypes";
import { parseCssStylesheet } from "./clipboardVisualKind";

/** мінімальна розмітка з CSS-селекторів — щоб превʼю відрізнялось між сніпетами */
export function inferCssPreviewBodyMarkup(css: string): string {
  const ast = parseCssStylesheet(css);
  const hasClass = (name: string): boolean => {
    if (!ast) return false;
    let match = false;
    csstree.walk(ast, {
      visit: "ClassSelector",
    enter(node: any) {
        if (match) return;
        if (node.type === "ClassSelector" && node.name.toLowerCase() === name.toLowerCase()) {
          match = true;
        }
      },
    });
    return match;
  };
  const hasTypeSelector = (name: string): boolean => {
    if (!ast) return false;
    let match = false;
    csstree.walk(ast, {
      visit: "TypeSelector",
    enter(node: any) {
        if (match) return;
        if (node.type === "TypeSelector" && node.name.toLowerCase() === name.toLowerCase()) {
          match = true;
        }
      },
    });
    return match;
  };
  const hasAttributeTypeSelector = (values: string[]): boolean => {
    if (!ast) return false;
    let match = false;
    csstree.walk(ast, {
      visit: "AttributeSelector",
    enter(node: any) {
        if (match) return;
        if (node.type !== "AttributeSelector") return;
        const attr = node.name?.type === "Identifier" ? node.name.name.toLowerCase() : "";
        if (attr !== "type") return;
        if (!node.value || node.value.type !== "String") return;
        const raw = node.value.value.toLowerCase();
        if (values.includes(raw)) match = true;
      },
    });
    return match;
  };
  const hasRoleDialog = (): boolean => {
    if (!ast) return false;
    let match = false;
    csstree.walk(ast, {
      visit: "AttributeSelector",
    enter(node: any) {
        if (match) return;
        if (node.type !== "AttributeSelector") return;
        const attr = node.name?.type === "Identifier" ? node.name.name.toLowerCase() : "";
        if (attr !== "role") return;
        if (!node.value || node.value.type !== "String") return;
        if (node.value.value.toLowerCase() === "dialog") match = true;
      },
    });
    return match;
  };

  const hasSearchClasses = hasClass("group") && hasClass("input") && hasClass("icon");
  if (hasSearchClasses) {
    return `<div class="group">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 3a7.5 7.5 0 1 0 4.73 13.32l4.22 4.22 1.06-1.06-4.22-4.22A7.5 7.5 0 0 0 10.5 3Zm0 1.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/>
            </svg>
            <input class="input" type="search" placeholder="Search" />
          </div>`;
  }

  const chunks: string[] = [];
  const wantsButton = hasTypeSelector("button") || hasClass("button");
  const wantsInput =
    hasTypeSelector("input") ||
    hasClass("input") ||
    hasAttributeTypeSelector(["text", "search", "email", "password"]);
  const wantsTextarea = hasTypeSelector("textarea") || hasClass("textarea");
  const wantsSelect = hasTypeSelector("select") || hasClass("select");
  const wantsLabel = hasTypeSelector("label") || hasClass("label");
  const wantsAnchor = hasTypeSelector("a") || hasClass("link") || hasClass("anchor");
  const wantsTable =
    hasTypeSelector("table") ||
    hasClass("table") ||
    hasTypeSelector("thead") ||
    hasTypeSelector("tbody") ||
    hasTypeSelector("tr") ||
    hasTypeSelector("td") ||
    hasTypeSelector("th");
  const wantsUl = hasTypeSelector("ul") || hasTypeSelector("ol") || hasClass("list");
  const wantsNav = hasTypeSelector("nav") || hasClass("nav") || hasClass("navbar");
  const wantsDialog =
    hasTypeSelector("dialog") || hasClass("modal") || hasClass("dialog") || hasRoleDialog();
  const wantsSvg = hasTypeSelector("svg") || hasClass("svg");
  const wantsHeader = hasTypeSelector("header") || hasClass("header");
  const wantsFooter = hasTypeSelector("footer") || hasClass("footer");

  if (wantsTable) {
    chunks.push(
      '<table class="table"><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>',
    );
  }
  if (wantsUl) chunks.push('<ul class="list"><li>One</li><li>Two</li></ul>');
  if (wantsNav) chunks.push('<nav class="nav"><a href="#">Home</a><a href="#">About</a></nav>');
  if (wantsDialog) {
    chunks.push('<div role="dialog" class="dialog modal"><p>Modal</p></div>');
  }
  if (wantsSvg) {
    chunks.push(
      '<svg class="svg" width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>',
    );
  }
  if (wantsHeader) chunks.push('<header class="header"><span>Header</span></header>');
  if (wantsFooter) chunks.push('<footer class="footer"><span>Footer</span></footer>');

  if (wantsButton) chunks.push('<button type="button" class="button">Button</button>');
  if (wantsInput) chunks.push('<input class="input" type="search" placeholder="Search" />');
  if (wantsTextarea) chunks.push('<textarea class="textarea" rows="3" placeholder="Message"></textarea>');
  if (wantsSelect) chunks.push('<select class="select"><option>One</option><option>Two</option></select>');
  if (wantsLabel) chunks.push('<label class="label"><input type="checkbox" /> Option</label>');
  if (wantsAnchor) chunks.push('<a class="link" href="#">Link</a>');

  if (chunks.length === 0) {
    const custom = collectCustomPreviewClasses(css);
    if (custom.length > 0) {
      return custom
        .map((className) => {
          const tag = cssRuleLooksInteractive(css, className) ? "button" : "div";
          const typeAttr = tag === "button" ? ' type="button"' : "";
          return `<${tag}${typeAttr} class="${className}"></${tag}>`;
        })
        .join("");
    }
    return '<div class="lc-css-generic"><span class="lc-css-generic-label">Preview</span></div>';
  }
  return `<div class="lc-css-preview-stack">${chunks.join("")}</div>`;
}

const CSS_PREVIEW_BUILTIN_CLASSES = new Set([
  "button",
  "input",
  "textarea",
  "select",
  "label",
  "link",
  "table",
  "list",
  "nav",
  "dialog",
  "modal",
  "svg",
  "header",
  "footer",
  "group",
  "icon",
  "anchor",
  "navbar",
  CSS_SANDBOX_SCOPE_CLASS,
  "lc-css-preview-stack",
  "lc-css-generic",
  "lc-css-generic-label",
]);

/** Класи з CSS (напр. `.pp`), для яких немає готового шаблону кнопки/input. */
function collectCustomPreviewClasses(css: string): string[] {
  const ast = parseCssStylesheet(css);
  if (!ast) return [];
  const found: string[] = [];
  csstree.walk(ast, {
    visit: "ClassSelector",
    enter(node: any) {
      if (node.type !== "ClassSelector") return;
      const name = String(node.name ?? "").trim();
      if (!name || CSS_PREVIEW_BUILTIN_CLASSES.has(name.toLowerCase())) return;
      if (!found.includes(name)) found.push(name);
    },
  });
  return found.slice(0, 6);
}

function cssRuleLooksInteractive(css: string, className: string): boolean {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${escaped}\\s*\\{[^}]*cursor\\s*:\\s*pointer`, "i").test(css);
}

/** Розмір панелі з width/height у CSS (напр. кругла кнопка 120×120). */
export function inferCssPreviewPanelSize(css: string): { width: number; height: number } | null {
  const w = css.match(/\bwidth\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
  const h = css.match(/\bheight\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
  if (!w || !h) return null;
  const width = Math.ceil(Number(w[1]));
  const height = Math.ceil(Number(h[1]));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 8 || height < 8) return null;
  return {
    width: Math.min(640, width + 16),
    height: Math.min(640, height + 16),
  };
}

function isSelectorAlreadyScoped(selector: csstree.CssNode): boolean {
  let scoped = false;
  csstree.walk(selector, {
    visit: "ClassSelector",
    enter(node: any) {
      if (node.type === "ClassSelector" && node.name === CSS_SANDBOX_SCOPE_CLASS) {
        scoped = true;
      }
    },
  });
  return scoped;
}

function shouldReplaceSelectorWithHost(selector: csstree.CssNode): boolean {
  let replace = false;
  csstree.walk(selector, {
    visit: "PseudoClassSelector",
    enter(node: any) {
      if (node.type === "PseudoClassSelector" && node.name === "root") {
        replace = true;
      }
    },
  });
  if (replace) return true;
  let hasHtmlOrBodyType = false;
  csstree.walk(selector, {
    visit: "TypeSelector",
    enter(node: any) {
      if (node.type !== "TypeSelector") return;
      const name = node.name.toLowerCase();
      if (name === "html" || name === "body") {
        hasHtmlOrBodyType = true;
      }
    },
  });
  return hasHtmlOrBodyType;
}

export function scopeCssForSandbox(css: string): string {
  const ast = parseCssStylesheet(css);
  if (!ast) return css;
  csstree.walk(ast, {
    visit: "Rule",
    enter(node: any) {
      if (node.type !== "Rule" || !node.prelude || node.prelude.type !== "SelectorList") return;
      const nextSelectors: string[] = [];
      node.prelude.children.forEach((sel: any) => {
        const selectorText = csstree.generate(sel).trim();
        if (!selectorText) return;
        if (isSelectorAlreadyScoped(sel)) {
          nextSelectors.push(selectorText);
          return;
        }
        if (shouldReplaceSelectorWithHost(sel)) {
          nextSelectors.push(`.${CSS_SANDBOX_SCOPE_CLASS}`);
          return;
        }
        nextSelectors.push(`.${CSS_SANDBOX_SCOPE_CLASS} ${selectorText}`);
      });
      if (nextSelectors.length > 0) {
        node.prelude = csstree.parse(nextSelectors.join(", "), { context: "selectorList" }) as csstree.CssNode;
      }
    },
  });
  return csstree.generate(ast);
}

export function buildCssSandboxHtmlDoc(css: string, customBodyMarkup?: string | null): string {
  const scopedCss = scopeCssForSandbox(css);
  const trimmedCustom = customBodyMarkup?.trim();
  const bodyMarkup =
    trimmedCustom && trimmedCustom.length > 0 ? trimmedCustom : inferCssPreviewBodyMarkup(scopedCss);
  const hasSearchClasses = scopedCss.includes(".group") && scopedCss.includes(".input") && scopedCss.includes(".icon");
  const stackGap = hasSearchClasses ? "0" : "10px";
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${scopedCss}
      html,body{margin:0;padding:0;background:transparent}
      body{font-family:Inter,system-ui,sans-serif}
      .lc-css-preview-host{padding:0;display:flex;align-items:center;justify-content:center;min-height:100%;box-sizing:border-box;overflow:visible}
      svg{display:block}
      .lc-css-preview-stack{width:min(320px,100%);display:flex;flex-direction:column;gap:${stackGap};align-items:stretch}
      .lc-css-generic{padding:14px;border-radius:12px;border:1px dashed rgba(120,160,180,.45);background:rgba(255,255,255,.06)}
      .lc-css-generic-label{font-size:13px;opacity:.75}
      button,input,select,textarea{font:inherit}
      </style></head><body><div class="lc-css-preview-host">${bodyMarkup}</div></body></html>`;
}
