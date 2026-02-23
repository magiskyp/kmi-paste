"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => KmiPastePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var KmiPastePlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerObsidianProtocolHandler("kmi", async (params) => {
      await this.handleKmiUri(params);
    });
  }
  onunload() {
  }
  parseParams(raw) {
    var _a;
    const url = raw["url"];
    if (!url) {
      new import_obsidian.Notice("KMI: missing required parameter 'url'");
      return null;
    }
    const file = raw["file"];
    if (!file) {
      new import_obsidian.Notice("KMI: missing required parameter 'file'");
      return null;
    }
    const path = (_a = raw["path"]) != null ? _a : "";
    const append = raw["append"] === "true";
    return { file, path, append, url };
  }
  buildFilePath(params) {
    let filename = params.file;
    if (!filename.endsWith(".md")) {
      filename += ".md";
    }
    if (params.path && params.path.trim() !== "") {
      return (0, import_obsidian.normalizePath)(`${params.path}/${filename}`);
    }
    return (0, import_obsidian.normalizePath)(filename);
  }
  async fetchContent(url) {
    let fetchUrl = url;
    try {
      const parsed = new URL(url);
      parsed.search = "";
      fetchUrl = parsed.toString();
    } catch (e) {
    }
    const response = await (0, import_obsidian.requestUrl)({ url: fetchUrl, method: "GET" });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text;
  }
  async ensureFolderExists(folderPath) {
    if (!folderPath || folderPath === ".")
      return;
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.app.vault.createFolder(folderPath);
    }
  }
  async handleKmiUri(raw) {
    const params = this.parseParams(raw);
    if (!params)
      return;
    let content;
    try {
      content = await this.fetchContent(params.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      new import_obsidian.Notice(`KMI: failed to fetch content \u2014 ${msg}`);
      return;
    }
    const filePath = this.buildFilePath(params);
    const folderPath = filePath.includes("/") ? filePath.substring(0, filePath.lastIndexOf("/")) : "";
    try {
      await this.ensureFolderExists(folderPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      new import_obsidian.Notice(`KMI: failed to create folder \u2014 ${msg}`);
      return;
    }
    const existingFile = this.app.vault.getAbstractFileByPath(filePath);
    try {
      if (existingFile instanceof import_obsidian.TFile) {
        if (params.append) {
          const existing = await this.app.vault.read(existingFile);
          await this.app.vault.modify(existingFile, existing + "\n" + content);
          new import_obsidian.Notice(`KMI: appended to "${filePath}"`);
        } else {
          await this.app.vault.modify(existingFile, content);
          new import_obsidian.Notice(`KMI: overwrote "${filePath}"`);
        }
      } else {
        await this.app.vault.create(filePath, content);
        new import_obsidian.Notice(`KMI: created "${filePath}"`);
      }
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof import_obsidian.TFile) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      new import_obsidian.Notice(`KMI: failed to write file \u2014 ${msg}`);
    }
  }
};
