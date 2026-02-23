# KMI Paste — Obsidian Plugin

Obsidian plugin that handles `obsidian://kmi` URI links to fetch content from [kmi.aeza.net](https://kmi.aeza.net) and write it into a note.

## URI Format

```
obsidian://kmi?file=<filename>&path=<folder>&append=<true|false>&url=<kmi_url>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `file` | yes | Note filename (`.md` added automatically) |
| `url` | yes | kmi.aeza.net URL to fetch content from |
| `path` | no | Folder path inside vault (e.g. `Notes/Work`) |
| `append` | no | `true` = append to existing note, `false` (default) = overwrite |

## Examples

```bash
# Create or overwrite a note
open "obsidian://kmi?file=mynote&url=https://kmi.aeza.net/dJdFRy"

# Append to a note inside a folder
open "obsidian://kmi?file=log&path=Work/Logs&append=true&url=https://kmi.aeza.net/dJdFRy"
```

## Installation

1. Download `main.js` and `manifest.json` from the [latest release](../../releases/latest)
2. Copy both files to `<vault>/.obsidian/plugins/kmi-paste/`
3. In Obsidian: **Settings → Community plugins** → enable **KMI Paste**

## Manual Build

```bash
npm install
npm run build
```
