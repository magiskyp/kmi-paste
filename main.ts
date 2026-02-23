import { Plugin, TFile, Notice, normalizePath, requestUrl } from "obsidian";

interface KmiParams {
	file: string;
	path?: string;
	append: boolean;
	url: string;
	key?: string;
}

async function decryptAesGcm(ciphertext: string, password: string): Promise<string> {
	const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

	const salt = raw.slice(0, 16);
	const iv = raw.slice(16, 28);
	const data = raw.slice(28);

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"]
	);

	const aesKey = await crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["decrypt"]
	);

	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		data
	);

	return new TextDecoder().decode(decrypted);
}

export default class KmiPastePlugin extends Plugin {
	async onload() {
		this.registerObsidianProtocolHandler("kmi", async (params) => {
			await this.handleKmiUri(params as Record<string, string>);
		});
	}

	onunload() {}

	private parseParams(raw: Record<string, string>): KmiParams | null {
		const url = raw["url"];
		if (!url) {
			new Notice("KMI: missing required parameter 'url'");
			return null;
		}

		const file = raw["file"];
		if (!file) {
			new Notice("KMI: missing required parameter 'file'");
			return null;
		}

		const path = raw["path"] ?? "";
		const append = raw["append"] === "true";
		const key = raw["key"];

		return { file, path, append, url, key };
	}

	private buildFilePath(params: KmiParams): string {
		let filename = params.file;
		if (!filename.endsWith(".md")) {
			filename += ".md";
		}

		if (params.path && params.path.trim() !== "") {
			return normalizePath(`${params.path}/${filename}`);
		}

		return normalizePath(filename);
	}

	private async fetchContent(url: string): Promise<string> {
		let fetchUrl = url;
		try {
			const parsed = new URL(url);
			parsed.search = "";
			fetchUrl = parsed.toString();
		} catch {}

		const response = await requestUrl({ url: fetchUrl, method: "GET" });
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`HTTP ${response.status}`);
		}
		return response.text;
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!folderPath || folderPath === ".") return;

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async handleKmiUri(raw: Record<string, string>): Promise<void> {
		const params = this.parseParams(raw);
		if (!params) return;

		let content: string;
		try {
			content = await this.fetchContent(params.url);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(`KMI: failed to fetch content — ${msg}`);
			return;
		}

		if (params.key) {
			try {
				content = await decryptAesGcm(content.trim(), params.key);
			} catch (err) {
				new Notice("KMI: decryption failed — wrong key or corrupted data");
				return;
			}
		}

		const filePath = this.buildFilePath(params);

		const folderPath = filePath.includes("/")
			? filePath.substring(0, filePath.lastIndexOf("/"))
			: "";

		try {
			await this.ensureFolderExists(folderPath);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(`KMI: failed to create folder — ${msg}`);
			return;
		}

		const existingFile = this.app.vault.getAbstractFileByPath(filePath);

		try {
			if (existingFile instanceof TFile) {
				if (params.append) {
					const existing = await this.app.vault.read(existingFile);
					await this.app.vault.modify(existingFile, existing + "\n" + content);
					new Notice(`KMI: appended to "${filePath}"`);
				} else {
					await this.app.vault.modify(existingFile, content);
					new Notice(`KMI: overwrote "${filePath}"`);
				}
			} else {
				await this.app.vault.create(filePath, content);
				new Notice(`KMI: created "${filePath}"`);
			}

			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(`KMI: failed to write file — ${msg}`);
		}
	}
}
