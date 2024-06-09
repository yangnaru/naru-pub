import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { less } from "@codemirror/lang-less";
import { markdown } from "@codemirror/lang-markdown";

export const LOGIN_NAME_REGEX =
  /^(?!.*--.{0,2}$)[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;

export const EDITABLE_FILE_EXTENSION_MAP: Record<string, any> = {
  html: html,
  htm: html,
  xml: html,
  xhtml: html,
  svg: html,
  md: markdown,
  markdown: markdown,
  mdx: markdown,
  css: less,
  txt: null,
  js: javascript,
};

export const EDITABLE_FILE_EXTENSIONS = [
  "html",
  "htm",
  "xml",
  "xhtml",
  "svg",
  "md",
  "markdown",
  "mdx",
  "css",
  "txt",
  "js",
];
