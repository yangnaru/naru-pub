import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { less } from "@codemirror/lang-less";
import { markdown } from "@codemirror/lang-markdown";

export const LOGIN_NAME_REGEX = /^(?!.*--.{0,2}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export const EDITABLE_FILE_EXTENSIONS = Object.keys(
  EDITABLE_FILE_EXTENSION_MAP
);

export const ALLOWED_FILE_EXTENSIONS = [
  ...EDITABLE_FILE_EXTENSIONS,
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
];

export const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>나루</title>
  </head>
  <body>
    <h1>안녕, 세상?</h1>
  </body>
</html>
`;
