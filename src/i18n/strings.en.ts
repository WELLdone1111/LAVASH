export const STRINGS_EN: Record<string, string> = {
  "store.aria": "Store",

  "store.title": "Store",

  "store.inDevelopment": "In development",

  "settings.aria": "Settings",

  "settings.title": "Settings",

  "settings.webview2.title": "WebView2 runtime",

  "settings.webview2.lead": "LAVASH needs Microsoft Edge WebView2 to show the interface (usually already on Windows 11).",

  "settings.webview2.checking": "Checking…",

  "settings.webview2.installed": "Installed",

  "settings.webview2.missing": "Not found — install WebView2, then restart LAVASH.",

  "settings.webview2.refresh": "Check again",

  "settings.webview2.installing": "Installing WebView2 in the background…",

  "settings.webview2.installAuto": "Install automatically",

  "settings.webview2.install": "Open in browser",

  "settings.window.title": "Window",

  "settings.window.lead": "Main LAVASH window behavior.",

  "settings.window.alwaysOnTop": "Always on top",

  "settings.window.autostart": "Start with Windows",

  "settings.language.title": "Language",

  "settings.language.lead": "Interface language for the whole app.",

  "settings.language.en": "English",

  "settings.language.uk": "Ukrainian",

  "settings.language.ru": "Russian",

  "settings.basics.theme": "Theme",

  "settings.basics.themeDesc": "Select a theme color",

  "settings.basics.language": "Language",

  "settings.basics.languageDesc": "Select display language",

  "settings.basics.artboardDesc": "Grid dots, magnetic snap, and panel alignment threshold",

  "settings.theme.title": "Theme",

  "settings.theme.lead": "Only one palette for now; more options later.",

  "settings.theme.option.daronge": "Daronge",

  "settings.appearanceHint": "Wallpapers and color themes are in Styles → Themes or Wallpapers.",

  "appearance.aria": "Themes and wallpapers",

  "appearance.title": "Themes & wallpapers",

  "appearance.lead": "Pick a background and accent palette — like chat themes in Instagram.",

  "appearance.wallpapers.title": "Wallpapers",

  "appearance.wallpapers.lead": "“Desktop” shows your Windows wallpaper through the transparent window.",

  "appearance.themes.title": "Color themes",

  "appearance.themes.lead": "Changes accents and panel colors across LAVASH.",

  "appearance.tabsAria": "Themes or wallpapers",

  "appearance.tab.themes": "Themes",

  "appearance.tab.wallpapers": "Wallpapers",

  "appearance.themes.appLead": "Palette for the whole LAVASH UI (dock, panels).",

  "appearance.wallpapers.appLead": "Semi-transparent tint on the main panel only (dock stays clear).",

  "appearance.intensity.theme": "Theme intensity",

  "appearance.intensity.wallpaper": "Wallpaper intensity",

  "appearance.intensity.themeAria": "How strong the color theme appears",

  "appearance.intensity.wallpaperAria": "How visible the wallpaper layer is",

  "appearance.wallpaper.system": "Desktop",

  "appearance.wallpaper.charcoal": "Charcoal",

  "appearance.wallpaper.warm-amber": "Warm amber",

  "appearance.wallpaper.blue-hour": "Blue hour",

  "appearance.wallpaper.rose-dusk": "Rose dusk",

  "appearance.wallpaper.forest-mist": "Forest mist",

  "appearance.wallpaper.lavender-haze": "Lavender haze",

  "appearance.wallpaper.sunset": "Sunset",

  "appearance.wallpaper.ocean": "Ocean",

  "appearance.wallpaper.midnight-grid": "Midnight grid",

  "appearance.wallpaper.cream-paper": "Cream paper",

  "appearance.wallpaper.mono-fade": "Mono fade",

  "appearance.wallpaper.neon-arcade": "Neon arcade",

  "appearance.wallpaper.aurora-sky": "Aurora sky",

  "appearance.wallpaper.candy-pop": "Candy pop",

  "appearance.wallpaper.vinyl-groove": "Vinyl groove",

  "appearance.wallpaper.cosmic-dust": "Cosmic dust",

  "appearance.wallpaper.retro-wave": "Retro wave",

  "appearance.theme.daronge": "Midnight amber",

  "appearance.theme.midnight": "Midnight blue",

  "appearance.theme.rose": "Rose",

  "appearance.theme.forest": "Forest",

  "appearance.theme.lavender": "Lavender",

  "appearance.theme.mono": "Mono",

  "settings.factory.title": "Factory reset",

  "settings.factory.lead":
    "Clears all local app data and reloads. Does not uninstall the app from disk.",

  "settings.factory.button": "Reset app to factory defaults",

  "settings.presets.title": "Preset data",

  "settings.presets.lead": "Remove saved presets.",

  "settings.presets.button": "Delete all presets",

  "settings.confirm.factoryTitle": "Reset LAVASH to factory defaults?",

  "settings.confirm.factoryBody": `The following will be removed: LavashConstruct settings, chat (models and API keys), code scratchpad, saved LavashConstruct panel sizes.

The app will reload. This cannot be undone.`,

  "settings.confirm.presetsTitle": "Delete all presets?",

  "settings.confirm.presetsBody":
    "Saved presets (main and mini) will be removed, the active LavashConstruct preset and floating mini windows will reset. This cannot be undone.",

  "settings.confirm.cancel": "Cancel",

  "settings.confirm.confirm": "Confirm",

  "settings.ollama.title": "Local Ollama models",

  "settings.ollama.lead":
    "Download via the Ollama CLI in the background. Use the same model tag in the LavashConstruct chat.",

  "settings.ollama.browserOnly": "Available only in the desktop app.",

  "settings.ollama.chipsAria": "Popular models",

  "settings.ollama.modelTag": "Model tag",

  "settings.ollama.placeholder": "e.g. codellama:7b",

  "settings.ollama.pull": "Download",

  "settings.ollama.desktopRequired": "Desktop LAVASH (Tauri) is required.",

  "settings.ollama.pulling": "Downloading: {{model}}…",

  "settings.ollama.done": "Done: {{model}}",

  "settings.ollama.error": "Error: {{model}}",

  "settings.ollama.chipHintTier0":
    "{{name}} ({{weight}}) — for your system (~{{ramGb}} GB RAM, {{cpu}} threads) this should run comfortably locally.",

  "settings.ollama.chipHintTier1":
    "{{name}} ({{weight}}) — should work on your hardware; close heavy apps if responses feel slow.",

  "settings.ollama.chipHintTier2":
    "{{name}} ({{weight}}) — moderate load; short answers are fine, long runs may feel sluggish.",

  "settings.ollama.chipHintTier3":
    "{{name}} ({{weight}}) — heavy for your system; expect noticeable RAM and CPU use.",

  "settings.ollama.chipHintTier4":
    "{{name}} ({{weight}}) — very heavy here; consider a smaller model or more RAM for smoother use.",

  "settings.ollama.chipHintRamUnknown":
    "RAM was not reported by the browser; the dot uses ~{{assumeGb}} GB only to estimate load.",

  "settings.ollama.dotAriaTier0": "Estimated load on your PC: light",

  "settings.ollama.dotAriaTier1": "Estimated load on your PC: moderate-light",

  "settings.ollama.dotAriaTier2": "Estimated load on your PC: moderate",

  "settings.ollama.dotAriaTier3": "Estimated load on your PC: heavy",

  "settings.ollama.dotAriaTier4": "Estimated load on your PC: very heavy",

  "settings.ollama.installed": "Installed",

  "settings.ollama.diskGb": "{{gb}} GB",

  "settings.ollama.approxDiskGb": "~{{gb}} GB",

  "settings.ollama.approxDiskHint": "Typical size before install; exact download may vary by Ollama version.",

  "settings.ollama.chipHintApproxDownload": "Typical download size: {{size}}",

  "settings.ollama.chipHintDisk": "On disk: {{size}}",

  "settings.ollama.localModelsError": "Could not read the model list from Ollama: {{detail}}",

  "settings.ollama.installedListTitle": "On disk",

  "settings.ollama.deleteModelAria": "Delete model {{model}}",

  "settings.ollama.deleteConfirm": "Delete model “{{model}}” from disk? This cannot be undone.",

  "settings.ollama.deleted": "Deleted: {{model}}",

  "settings.ollama.deleteError": "Could not delete: {{model}}",

  "app.dock.presets": "Styles",

  "app.dock.lavashConstruct": "LavashConstruct",

  "app.dock.store": "Store",

  "app.dock.settings": "Settings",

  "window.toolbarAria": "Window",

  "window.minimize": "Minimize",

  "window.maximize": "Maximize",

  "window.restore": "Restore down",

  "window.close": "Close",

  "window.minimizeToTray": "Minimize to tray",

  "window.dock.primaryAria": "Primary dock",

  "window.dock.collapse": "Collapse dock",

  "window.dock.expand": "Expand dock",

  "ideBrowser.openButton": "Web browser (Google)",

  "ideBrowser.openShortcut": "Ctrl+⇧L",

  "ideBrowser.panelAria": "Embedded browser",

  "ideBrowser.tabDefault": "Google",

  "ideBrowser.newTab": "New tab",

  "ideBrowser.closeTab": "Close tab",

  "ideBrowser.back": "Back",

  "ideBrowser.forward": "Forward",

  "ideBrowser.history": "History",

  "ideBrowser.historyCurrent": "current",

  "ideBrowser.home": "Start page",

  "ideBrowser.addressAria": "Page address",

  "ideBrowser.reload": "Reload",

  "ideBrowser.openExternal": "Open in browser",

  "ideBrowser.close": "Close panel",

  "ideBrowser.blockedHint": "This site cannot be embedded. Open it in your system browser.",

  "ideBrowser.retryNative": "Retry embedded WebView",

  "ideBrowser.resizeSplit": "Resize browser split",

  "file.menu.label": "File",

  "file.menu.newTextFile": "New Text File",

  "file.menu.newLavashDocument": "New LAVASH Document…",

  "file.menu.openLavashDocument": "Open LAVASH Document…",

  "file.menu.openLavashOnly": "Choose a .lavash.json or .lavash file",

  "file.menu.newWindow": "New Window",

  "file.menu.newAgentsWindow": "New Agents Window",

  "file.menu.openFile": "Open File…",

  "file.menu.openFolder": "Open Folder…",

  "file.menu.import": "Import…",

  "file.menu.export": "Export…",

  "file.menu.exportEmpty": "Nothing on the artboard to export.",

  "file.menu.save": "Save",

  "file.menu.saveAs": "Save As…",

  "file.menu.saveAll": "Save All",

  "file.menu.saveAsPrompt": "Preset name",

  "file.menu.openFolderDone": "Selected folder:\n{{path}}",

  "edit.menu.label": "Edit",

  "edit.menu.undo": "Undo",

  "edit.menu.redo": "Redo",

  "edit.menu.cut": "Cut",

  "edit.menu.copy": "Copy",

  "edit.menu.paste": "Paste",

  "construct.tabsAria": "Design, themes, or wallpapers",

  "construct.tabs.design": "Design",

  "construct.tabs.themes": "Themes",

  "construct.tabs.wallpapers": "Wallpapers",

  "construct.wallpapers.letterTitle": "Your wallpapers",

  "construct.wallpapers.letter":
    "Upload an image or paste your CSS. Lavash here is a strict assistant: it tells you where to put code and whether it is safe for stable wallpapers.",

  "construct.wallpapers.letterSign": "— LavashConstruct",

  "construct.wallpapers.lavashTitle": "Lavash — wallpaper assistant",

  "construct.wallpapers.lavashLead": "Does not generate wallpapers — reviews CSS and explains what is safe for the app background layer.",

  "construct.wallpapers.step2": "Paste CSS (JSON or background properties) below.",

  "construct.wallpapers.step3": "Click “Ask Lavash” for a verdict and tips.",

  "construct.wallpapers.cssLabel": "Your wallpaper CSS",

  "construct.wallpapers.askLavash": "Ask Lavash",

  "construct.wallpapers.lavashChecking": "Lavash is reviewing…",

  "construct.wallpapers.applyCss": "Apply to {{target}}",

  "construct.wallpapers.cssPreview": "CSS preview",

  "construct.wallpapers.cssWallpaperName": "CSS wallpaper",

  "construct.wallpapers.orUploadImage": "Or upload an image",

  "construct.wallpapers.uploadHint": "PNG, JPG, WebP — up to 4 MB",

  "construct.wallpapers.uploadCta": "Choose image",

  "construct.wallpapers.delete": "Remove",

  "construct.wallpapers.copyCss": "Paste CSS into editor",

  "construct.wallpapers.empty": "No custom wallpapers yet.",

  "construct.wallpapers.defaultName": "My wallpaper",

  "construct.wallpapers.errorNotImage": "Please choose an image file.",

  "construct.wallpapers.errorTooLarge": "Image is too large (max {{mb}} MB).",

  "construct.wallpapers.errorRead": "Could not read the file.",

  "construct.wallpapers.lavashDesktopHint": "Lavash review needs LAVASH desktop (chat provider settings).",

  "construct.wallpapers.lavashReviewFailed": "Lavash could not finish the review.",

  "construct.wallpapers.verdict.ok": "Looks good",

  "construct.wallpapers.verdict.warn": "Use with care",

  "construct.wallpapers.verdict.block": "Do not apply",

  "construct.wallpapers.validate.empty": "Paste CSS or upload an image.",

  "construct.wallpapers.validate.noBackground": "Need background / backgroundImage / backgroundColor.",

  "construct.wallpapers.validate.blockedProp": "Remove {{prop}} — wallpapers only allow background-*.",

  "construct.wallpapers.validate.hugeDataUrl": "Very large data: URL — may hurt performance.",

  "construct.wallpapers.validate.ok": "Looks acceptable locally; Lavash can double-check.",

  "construct.wallpapers.validate.warnOnlyGradients": "Solid color is fine; gradients or images usually look better.",

  "construct.headers.userLib": "User Lib",

  "construct.headers.workspace": "Workspace",

  "construct.headers.lavash": "LAVASH",

  "construct.headers.code": "Code",

  "construct.sections.railAria": "Workspace sections",

  "construct.sections.artboard": "Artboard",

  "construct.sections.model": "Models",

  "construct.sections.userLib": "User library",

  "construct.sections.layers": "Layers",

  "construct.sections.code": "Code",

  "construct.sections.project": "Project",

  "construct.rail.search": "Search",

  "construct.rail.layers": "Layers",

  "construct.rail.mark": "Mark",

  "construct.rail.markHint": "Pick an artboard panel to pin in chat",

  "construct.rail.markModeHint": "Click a panel on the artboard to pin it in chat",

  "construct.rail.regenerate": "Refresh",

  "construct.rail.searchPlaceholder": "Search panels…",

  "construct.rail.searchEmpty": "No matches",

  "construct.rail.searchResultsAria": "Search results",

  "construct.rail.searchTitle": "Search",

  "construct.rail.regenerateHint": "Regenerate the selected panel via LAVASH (screenshot + prompt)",

  "construct.project.title": "Project files",

  "construct.project.openFolder": "Open folder…",

  "construct.project.refresh": "Refresh tree",

  "construct.project.emptyHint": "Open a folder — LSP and the editor use that folder as the workspace root.",

  "construct.project.treeAria": "File tree",

  "construct.project.codeAria": "Project file editor",

  "construct.project.unsaved": "unsaved",

  "construct.project.closeFile": "Close file",

  "construct.project.desktopOnly": "Opening a project folder only works in the LAVASH desktop app (Tauri). In the browser, use File → Open Folder (imports files into the artboard).",

  "construct.project.viewModesAria": "View mode",

  "construct.project.viewDesign": "Artboard only",

  "construct.project.viewSplit": "Artboard and code",

  "construct.project.viewCode": "Code only",

  "construct.unsaved.discardConfirm": "You have unsaved changes. Discard them and continue?",

  "construct.lavashDoc.new": "New",

  "construct.lavashDoc.open": "Open",

  "construct.lavashDoc.close": "Close document",

  "construct.lavashDoc.unsavedNew": "New document (not saved to disk yet)",

  "construct.project.closeFolder": "Close project folder",

  "construct.lavashDoc.active": "Document",

  "construct.lavashDoc.saved": "saved",

  "construct.lavashDoc.saving": "saving…",

  "construct.externalChange.lavashDoc": "File changed on disk: {{name}}",

  "construct.externalChange.projectFile": "Newer version on disk: {{name}}",

  "construct.externalChange.reload": "Reload",

  "construct.externalChange.dismiss": "Dismiss",

  "construct.split.userLibWidth": "User Lib width",

  "construct.split.bottomRowHeight": "Code and Layers row height",

  "construct.split.chatWidth": "LAVASH chat width",

  "construct.split.layersCodeWidth": "Layers and Code width",

  "construct.smartPaste.detected": "Detected:",

  "construct.smartPaste.addCssOptional": "Add CSS? (optional)",

  "construct.smartPaste.addHtmlOptional": "Add HTML markup? (optional)",

  "construct.smartPaste.phCss": "CSS",

  "construct.smartPaste.phHtml": "HTML",

  "construct.smartPaste.skip": "Skip",

  "construct.smartPaste.add": "Add to Artboard",

  "construct.smartPaste.kind.plain-text": "Plain text",

  "construct.smartPaste.kind.html": "HTML",

  "construct.smartPaste.kind.css": "CSS component",

  "construct.smartPaste.kind.jsx": "JSX component",

  "construct.preset.selectCardsAlert":
    "Select one or more cards on the artboard (click or Ctrl / Shift + click). Only selected cards and their nested content are saved into a preset.",

  "construct.preset.namePrompt": "Name this preset",

  "construct.preset.suggestedCopy": "{{name}} (copy)",

  "construct.preset.defaultName": "LavashConstruct preset {{time}}",

  "construct.userLib.title": "User Lib",

  "construct.model.title": "Models",

  "construct.model.panelAria": "Model and provider settings",

  "construct.model.section.chat": "Chat (active tab)",

  "construct.model.lead": "Applies to the active chat tab. Changes take effect immediately.",

  "construct.model.ollamaLead": "Download and remove local Ollama models.",

  "construct.model.ollamaChatHint": "Runs locally via Ollama — no cloud key. Download models below.",

  "construct.model.refreshOllama": "Refresh Ollama list",

  "construct.model.getApiKey": "Get API key",

  "construct.model.tier.premium": "Premium · best UI quality",

  "construct.model.tier.freemium": "Freemium",

  "construct.model.tier.free": "Free",

  "construct.model.section.chatPicker": "Models in chat menu",

  "construct.model.chatPickerLead": "Choose which models appear in the quick picker next to the chat input.",

  "construct.model.chatPicker.groupAria": "Models for quick chat selection",

  "construct.model.chatPicker.empty": "No models available.",

  "construct.model.manager.title": "Model management",

  "construct.model.manager.lead": "Add models and choose which appear in the chat menu. Cloud providers need an API key.",

  "construct.model.manager.addModel": "Add model",

  "construct.model.manager.colChat": "Chat",

  "construct.model.manager.colModel": "Model",

  "construct.model.manager.colProvider": "Provider",

  "construct.model.manager.colActions": "Actions",

  "construct.model.manager.chatToggleAria": "Show {model} in chat menu",

  "construct.model.manager.emptyGroup": "No models in this group.",

  "construct.model.manager.useModel": "Use",

  "construct.model.manager.activeBadge": "Active",

  "construct.model.manager.needsApiKeyHint": "API key required for {provider}",

  "construct.model.manager.apiKeyBtnAria": "{provider} API key",

  "construct.model.manager.apiKeyBtnTitleSet": "Change {provider} API key",

  "construct.model.manager.apiKeyBtnTitleMissing": "Add {provider} API key",

  "construct.model.manager.apiKeySave": "Save",

  "construct.model.manager.removeCustom": "Remove {model}",

  "construct.model.manager.groupBuiltin": "Built-in",

  "construct.model.manager.groupLocal": "Local (Ollama)",

  "construct.model.manager.groupCustom": "Custom",

  "construct.model.manager.customProvider": "Provider",

  "construct.model.manager.customModelId": "Model ID",

  "construct.model.manager.customLabel": "Label (optional)",

  "construct.model.manager.customLabelPh": "My model",

  "construct.model.manager.cancel": "Cancel",

  "construct.model.manager.saveCustom": "Save",

  "construct.model.manager.customEmpty": "No custom models yet.",

  "construct.model.manager.customEmptyLink": "Add a custom model",

  "construct.model.section.providerSettings": "Provider API keys",

  "construct.model.providerSettingsLead": "Keys for cloud models. Ollama runs locally without a key.",

  "construct.model.freeApi.title": "How to get a free API key",

  "construct.model.freeApi.lead":
    "Cloud models require an API key from the provider. The services below offer a free plan — enough to try LAVASH chat without paying.",

  "construct.model.freeApi.step1": "Pick a provider below, open the link, and sign up (or sign in if you already have an account).",

  "construct.model.freeApi.step2": "In the provider dashboard, create an API key and copy it to the clipboard.",

  "construct.model.freeApi.step3": "In the table above, click the key icon next to the model you want and paste the key.",

  "construct.model.freeApi.linksAria": "Providers with a free plan",

  "construct.model.freeApi.ollamaNote":
    "Want to skip keys entirely? Use Ollama locally — models run on your computer, no cloud account needed.",

  "construct.model.freeApi.disclaimer":
    "Free plans have usage limits (requests, tokens, or daily quota). Limits and terms are set by each provider and may change.",

  "construct.model.agent.importHeading": "Import",

  "construct.model.agent.importSkillsDir": "Load skills from .agents/skills",

  "construct.model.agent.importSkillsDirDesc": "Automatically pick up SKILL.md files from the project's .agents/skills folder.",

  "construct.model.agent.importAgentsMd": "Include AGENTS.md in context",

  "construct.model.agent.importAgentsMdDesc": "Read AGENTS.md from the project root during chat.",

  "construct.model.agent.importClaudeMd": "Include CLAUDE.md in context",

  "construct.model.agent.importClaudeMdDesc": "Read CLAUDE.md and CLAUDE.local.md from the project root.",

  "construct.model.agent.skillsHeading": "Skills",

  "construct.model.agent.skillsLead": "Instruction sets for common agent tasks.",

  "construct.model.agent.commandsHeading": "Commands",

  "construct.model.agent.commandsLead": "Saved instructions — invoke in chat with /trigger.",

  "construct.model.agent.rulesHeading": "Rules",

  "construct.model.agent.rulesLead": "Rules the agent follows during chat.",

  "construct.model.agent.memoriesHeading": "Memories",

  "construct.model.agent.memoriesLead": "Long-term notes for the agent.",

  "construct.model.agent.memoriesFeature": "Enable memories",

  "construct.model.agent.memoriesFeatureDesc": "The agent uses saved memories in context.",

  "construct.model.agent.beta": "Beta",

  "construct.model.agent.create": "Create",

  "construct.model.agent.refresh": "Refresh",

  "construct.model.agent.scopeGlobal": "Global",

  "construct.model.agent.scopeProject": "Project",

  "construct.model.agent.scopeTabsAria": "Scope: global or project",

  "construct.model.agent.scopeProjectDisabled": "Open a project folder first",

  "construct.model.agent.skillsEmpty": "No skills yet",

  "construct.model.agent.skillsEmptyHint": "Click Create or add SKILL.md under .agents/skills",

  "construct.model.agent.commandsEmpty": "No commands yet",

  "construct.model.agent.commandsEmptyHint": "Click Create to add your first command",

  "construct.model.agent.rulesEmpty": "No rules yet",

  "construct.model.agent.rulesEmptyHint": "Click Create to add your first rule",

  "construct.model.agent.memoriesEmpty": "No memories yet",

  "construct.model.agent.memoriesEmptyHint": "Add a memory manually or while using the agent",

  "construct.model.agent.skillName": "Name",

  "construct.model.agent.skillDesc": "Description",

  "construct.model.agent.skillContent": "Instructions (markdown)",

  "construct.model.agent.commandName": "Name",

  "construct.model.agent.commandTrigger": "Trigger (without /)",

  "construct.model.agent.commandDesc": "Description",

  "construct.model.agent.commandContent": "Command text",

  "construct.model.agent.ruleName": "Name",

  "construct.model.agent.ruleContent": "Rule text",

  "construct.model.agent.memoryContent": "Memory",

  "construct.model.agent.discoveredSkill": "From .agents/skills",

  "construct.model.agent.toggleSkill": "Enable skill {name}",

  "construct.model.agent.toggleCommand": "Enable command {name}",

  "construct.model.agent.toggleRule": "Enable rule {name}",

  "construct.model.agent.toggleMemory": "Enable memory",

  "construct.userLib.searchPh": "Search…",

  "construct.userLib.empty": "Empty.",

  "construct.userLib.noMatches": "No matches.",

  "construct.userLib.remove": "Remove {{title}}",

  "construct.userLib.metaElement": " · element",

  "construct.layers.title": "Layers",

  "construct.layers.items": "{{count}} items",

  "construct.layers.onParent": "On “{{name}}”",

  "construct.layers.metaLocked": "locked",

  "construct.layers.metaHidden": "hidden",

  "construct.layers.hide": "Hide panel",

  "construct.layers.show": "Show panel",

  "construct.layers.lock": "Lock panel",

  "construct.layers.unlock": "Unlock panel",

  "construct.layers.back": "Back",

  "construct.layers.down": "Down",

  "construct.layers.up": "Up",

  "construct.layers.front": "Front",

  "construct.layers.sendBack": "Send to back",

  "construct.layers.layerDown": "Layer down",

  "construct.layers.layerUp": "Layer up",

  "construct.layers.bringFront": "Bring to front",

  "construct.layers.remove": "Remove panel",

  "construct.layers.unlockToRemove": "Unlock panel to remove",

  "construct.code.aria": "Code editor",

  "construct.code.closeTab": "Close tab {{label}}",

  "construct.code.copy": "Copy code",

  "construct.code.toArtboard": "Send to artboard",

  "construct.code.newTab": "New tab",

  "construct.artboard.zoomOut": "Zoom out",

  "construct.artboard.zoomIn": "Zoom in",

  "construct.artboard.zoomPct": "Zoom: {{pct}}%",

  "construct.artboard.export": "Export",

  "construct.artboard.formatsGroup": "Formats",

  "construct.artboard.advancedGroup": "Advanced Export",

  "construct.artboard.fmtLavash": ".lavash-theme",

  "construct.artboard.fmtJson": ".json",

  "construct.artboard.fmtChrome": "Chrome Extension (.zip)",

  "construct.artboard.advObs": "OBS Studio Plugin",

  "construct.artboard.advWallpaper": "Wallpaper Engine",

  "construct.artboard.advRainmeter": "Rainmeter",

  "construct.artboard.advShare": "Share Layout",

  "construct.artboard.import": "Import",

  "construct.artboard.importAria": "Import UI/UX elements",

  "construct.artboard.undo": "Undo",

  "construct.artboard.redo": "Redo",

  "construct.artboard.history": "History",

  "construct.artboard.historyTitle": "History ({{count}} actions)",

  "construct.artboard.noHistory": "No actions yet.",

  "construct.artboard.settings": "Artboard Settings",

  "construct.artboard.settingsAria": "Artboard settings",

  "construct.settings.title": "Settings",

  "construct.settings.back": "Back",

  "construct.settings.aria": "Settings",

  "construct.settings.sectionsAria": "Settings sections",

  "construct.settings.section.basics": "Basics",

  "construct.settings.section.themes": "Themes",

  "construct.settings.section.wallpapers": "Wallpapers",

  "construct.settings.section.languages": "Languages",

  "construct.settings.section.account": "Account",

  "construct.settings.section.artboard": "Artboard",

  "construct.settings.account.empty": "Account sign-in and sync will appear here later.",

  "construct.artboard.close": "Close",

  "construct.artboard.presetGroupAria": "Name and save",

  "construct.artboard.presetNamePh": "Save in lib",

  "construct.artboard.presetNameAria": "Save in lib",

  "construct.artboard.save": "Save",

  "construct.artboard.aria": "Artboard",

  "construct.artboard.toolbarAria": "Artboard tools",

  "construct.artboard.preview": "{{title}} preview",

  "construct.artboard.filePlain": "File.",

  "construct.artboard.fileMime": "File ({{mime}}).",

  "construct.artboard.locked": "Locked",

  "construct.artboard.resize": "Resize {{title}}",

  "construct.artboard.holdAltMove": "Alt + LMB — drag {{title}}",

  "construct.artboard.holdAltResize": "Alt + RMB — resize {{title}}",

  "construct.artboard.holdAltEditor": "Alt + MMB — code editor {{title}}",

  "construct.artboard.altEditHint":
    "Alt + LMB — move · Alt + RMB — resize · Alt + wheel — panel scale · Alt + MMB — code. Ctrl + RMB — artboard menu · Ctrl + MMB click — zoom 100%. RMB — element menu.",

  "construct.artboard.dropCodeHint": "Drop code, a file (.tsx, .css, .html), or a User Lib item here",

  "construct.edit.title": "Edit: {{name}}",

  "construct.edit.defaultName": "Component",

  "construct.edit.cssVars": "CSS Variables",

  "construct.edit.sliders": "Sliders (live on artboard)",

  "construct.edit.opacity": "Opacity",

  "construct.edit.blur": "Blur",

  "construct.edit.radius": "Radius",

  "construct.edit.hoverScale": "Hover Scale",

  "construct.edit.source": "Source Code",

  "construct.edit.apply": "Apply",

  "construct.edit.cancel": "Cancel",

  "construct.contextMenu.editCode": "Edit code",

  "construct.contextMenu.askLavash": "Ask LAVASH",

  "construct.contextMenu.duplicate": "Duplicate",

  "construct.contextMenu.lock": "Lock",

  "construct.contextMenu.unlock": "Unlock",

  "construct.contextMenu.delete": "Delete",

  "construct.contextMenu.undo": "Undo",

  "construct.contextMenu.redo": "Redo",

  "construct.contextMenu.paste": "Paste",

  "construct.contextMenu.format": "Format",

  "construct.contextMenu.add": "Add",

  "construct.contextMenu.addCodePanel": "Code panel",

  "construct.contextMenu.addFromUserLib": "From User Lib…",

  "construct.contextMenu.copy": "Copy",

  "construct.contextMenu.copyAs": "Copy as",

  "construct.contextMenu.copyAsHtml": "HTML",

  "construct.contextMenu.copyAsCode": "Code",

  "construct.contextMenu.copyAsImage": "PNG",

  "construct.contextMenu.cut": "Cut",

  "construct.contextMenu.focus": "Focus",

  "construct.contextMenu.favourite": "Favourite",

  "construct.contextMenu.unmark": "Remove mark",

  "construct.contextMenu.sectionGenerate": "GENERATE",

  "construct.contextMenu.generate": "Generate",

  "construct.contextMenu.markForChat": "Add annotation",

  "construct.contextMenu.viewDetails": "View Details",

  "construct.contextMenu.viewCode": "View code",

  "construct.contextMenu.export": "Export",

  "construct.contextMenu.download": "Download",

  "construct.contextMenu.refresh": "Refresh",

  "construct.floatingEditor.aria": "Code editor: {{name}}",

  "construct.floatingEditor.close": "Close",

  "construct.floatingEditor.toggleHeight": "Toggle height",

  "construct.floatingEditor.apply": "Apply",

  "construct.floatingEditor.applyHint": "⌘S",

  "construct.floatingEditor.sync.idle": "Ready",

  "construct.floatingEditor.sync.syncing": "Syncing…",

  "construct.floatingEditor.sync.synced": "Live sync",

  "construct.chat.desktopOnly":
    "Chat is available only in the **desktop LAVASH** app (Tauri + IPC).\n\nIf you opened Vite in the browser alone, `invoke` is unavailable — run **`npm run tauri dev`** or use a desktop build.",

  "construct.chat.groqKeyHint":
    "For **Groq**, enter an API key in the **Model** field above (console.groq.com → API keys).",

  "construct.chat.geminiKeyHint": "For **Gemini**, enter an API key (Google AI Studio → Get API key).",

  "construct.chat.apiKeyHint":
    "For **{{provider}}**, paste an API key in chat settings. Free tiers usually need a free account (limits apply).",

  "construct.chat.apiKeyLabel": "{{provider}} API key",

  "construct.chat.getApiKey": "Get {{provider}} API key →",

  "construct.chat.provider.noKeyBadge": "No API key",

  "construct.chat.provider.freeTierBadge": "Free tier",

  "construct.chat.provider.freeTierHint":
    "Free tier after signup (limits apply). Keys are stored in LAVASH's encrypted vault on your PC.",

  "construct.chat.provider.ollamaHint":
    "Runs locally via Ollama — download models in the Models section on the left rail.",

  "construct.chat.applyNote.code":
    "↳ Code is in the **CODE** tab (bottom left). Edit there or tell me what to change.",

  "construct.chat.applyNote.artboard": "↳ Artboard updated — check the artboard.",

  "construct.chat.applyNote.panel": "↳ Panel on the artboard (linked to CODE).",

  "construct.chat.applyNote.onlyApply":
    "Updated **CODE** and the artboard. Check the artboard and CODE tab, then tell me what to tweak.",

  "construct.chat.emptyReply": "_(empty response)_",

  "construct.chat.errorReply": "**{{provider}}** · {{model}}\n\n{{detail}}",

  "construct.chat.error.ollamaMemory":
    "Not enough RAM for this model. It needs {{required}}, but only {{available}} is available. Try a smaller model (e.g. llama3.2:1b) or close other apps.",

  "construct.chat.error.ollamaModelNotFound":
    "Model “{{model}}” is not installed in Ollama. Download it in Settings → Models → Ollama.",

  "construct.chat.error.ollamaUnreachable":
    "Could not connect to Ollama. Make sure Ollama is running on your computer.",

  "construct.chat.error.ollamaPullRequired":
    "The model is not downloaded yet. Open Models and pull it via Ollama.",

  "construct.chat.error.desktopRequired": "Chat streaming is only available in the LAVASH desktop app.",

  "construct.chat.error.unknown": "An unknown error occurred. Please try again.",

  "construct.chat.providerModelAria": "Provider and model",

  "construct.chat.settingsAria": "Chat settings",

  "construct.chat.provider": "Provider",

  "construct.chat.providerGroupAria": "Provider",

  "construct.chat.ollamaModel": "Ollama model",

  "construct.chat.ollamaModelSavedSuffix": "(saved)",

  "construct.chat.ollamaNoModelsInstalled": "No models — download in Models section",

  "construct.chat.openModelsSection": "Open model settings",

  "construct.chat.openModelsSectionHint": "Provider, model, API keys, and Ollama",

  "construct.chat.model": "Model",

  "construct.chat.groqKey": "Groq API key",

  "construct.chat.geminiKey": "Gemini API key",

  "construct.chat.newChat": "New chat",

  "construct.chat.newChatHint": "New chat tab",

  "construct.chat.history": "Chat history",

  "construct.chat.historyHint": "Clear saved chat history",

  "construct.chat.export": "Export chat to file",

  "construct.chat.exportHint": "Export current chat to file",

  "construct.chat.exportDialogTitle": "Export chat",

  "construct.chat.export.heading": "LAVASH chat export",

  "construct.chat.export.tab": "Tab",

  "construct.chat.export.provider": "Provider",

  "construct.chat.export.model": "Model",

  "construct.chat.export.exportedAt": "Exported",

  "construct.chat.export.attachments": "Attachments",

  "construct.chat.export.roleUser": "User",

  "construct.chat.export.roleAssistant": "LAVASH",

  "construct.chat.tabsAria": "Chat tabs",

  "construct.chat.tabUntitled": "Chat {{n}}",

  "construct.chat.closeTab": "Close tab",

  "construct.chat.copyMsg": "Copy message",

  "construct.chat.revertMsg": "Revert changes",

  "construct.chat.revertMsgHint":
    "Restore the artboard and CODE to before this reply; remove this message and everything after it",

  "construct.chat.editMsg": "Edit message",

  "construct.chat.editMsgHint": "Change the text and resend (following messages will be removed)",

  "construct.chat.editCancel": "Cancel",

  "construct.chat.editResend": "Resend",

  "construct.chat.placeholderEditing": "Finish editing the message above…",

  "construct.chat.copyCodeMd": "Copy code",

  "construct.widget.unavailable": "Unavailable",

  "app.floating.trayAria": "Collapsed mini presets",

  "app.floating.minimizeToTray": "Minimize to tray",

  "app.floating.presetDeleted": "Preset removed",

  "app.floating.noLayout": "No layout",

  "app.floating.presetFallback": "Preset",

  "app.floating.miniPreset": "Mini preset",

  "app.floating.restore": "Restore {{name}}",

  "app.floating.remove": "Dismiss {{name}}",

  "construct.chat.removeImage": "Remove image",

  "construct.chat.addImage": "Add image",

  "construct.chat.removeAttachment": "Remove attachment",

  "construct.chat.markPinLabel": "Mark: {title}",

  "construct.chat.markPinAria": "Pinned artboard panel",

  "construct.chat.removeMark": "Remove mark",

  "construct.chat.addFile": "Add file",

  "construct.chat.attachedFile": "Attached file",

  "construct.chat.thinking": "Thinking",

  "construct.chat.streaming": "Writing… CODE and artboard update live.",

  "construct.chat.placeholder": "context",

  "construct.chat.placeholderFollowUp": "context",

  "construct.chat.improvePrompt": "Improve prompt",

  "construct.chat.improvePromptHint": "Improve prompt (Ctrl+Shift+I). Requires a Gemini API key.",

  "construct.chat.modelPickerHint": "Quick model switch",

  "construct.chat.modelPickerPlaceholder": "Select model",

  "construct.chat.modelPickerAria": "Chat model: {model}",

  "construct.chat.modelPickerAriaNone": "No chat model selected",

  "construct.chat.modelPickerMenuAria": "Select chat model",

  "construct.chat.modelPickerEmpty": "Enable models in the Models panel.",

  "construct.chat.noModelSelected": "Select a model in the picker above the input — chat cannot send without one.",

  "construct.chat.agentModeAria": "Agent mode",

  "construct.chat.agentMode.agent": "Agent",

  "construct.chat.agentMode.plan": "Plan",

  "construct.chat.agentMode.ask": "Ask",

  "construct.chat.agentMode.debug": "Debug",

  "construct.chat.regeneratePrompt": "Regenerate this panel \"{title}\". Keep the overall style, improve layout and UI. Add a brief summary of changes.",

  "construct.chat.imageGenDone": "Image generated and added to the artboard: \"{title}\".",

  "construct.chat.imageGenError": "Could not generate image: {detail}",

  "construct.chat.enhancePrompt": "Improve prompt",

  "construct.chat.enhancePromptHint": "Improve prompt (coming soon)",

  "construct.chat.send": "Send",

  "construct.chat.pauseEdit": "Pause and edit message",

  "construct.chat.stopGeneration": "Stop response",

  "construct.chat.clearHistory": "Clear chat history",

  "construct.chat.clearHistoryHint": "Delete all tabs and saved messages",

  "construct.chat.clearHistoryConfirm": "Clear all chat history? All tabs and messages will be deleted.",

  "construct.chat.provider.ollamaSettings": "Ollama (local)",

  "construct.chat.provider.groqSettings": "Groq",

  "construct.chat.provider.geminiSettings": "Google Gemini",

  "construct.chat.provider.openaiSettings": "OpenAI",

  "construct.chat.provider.openrouterSettings": "OpenRouter",

  "construct.chat.provider.mistralSettings": "Mistral",

  "construct.chat.provider.deepseekSettings": "DeepSeek",

  "construct.chat.provider.togetherSettings": "Together AI",

  "construct.chat.provider.cerebrasSettings": "Cerebras",

  "construct.chat.provider.anthropicSettings": "Anthropic (Claude)",

  "construct.chat.provider.xaiSettings": "xAI (Grok)",

  "construct.chat.provider.moonshotSettings": "Moonshot (Kimi)",

  "construct.preview.babelWord": "Babel",

  "construct.preview.exportTitle": "Export",

  "construct.preview.renderError": "Render error",

  "construct.preview.emptyHint":
    "Empty snippet — add code in the CODE tab or a chat reply with a code block.",

  "construct.preview.loading": "Loading preview…",

  "construct.preview.babelNoCode": "No compiled output (check TSX syntax).",

  "construct.preview.exportMissing":
    "Add a default export component: export default function … () { … }",

  "construct.preview.previewError": "Preview error",

  "status.presets.idle": "Presets: ready",

  "status.presets.writing": "Presets: writing to disk…",

  "status.presets.synced": "Presets: saved",

  "status.presets.errorPrefix": "Presets: error",

  "status.chat.busy": "Chat: model responding{{hint}}…",

  "status.chat.busyHint": " ({{hint}})",

  "status.chat.idle": "Chat: ready",

  "status.construct.history": "Lab: edit history available (Undo / Redo)",

  "status.construct.noHistory": "Lab: no active edit history",

  "status.unknownError": "Unknown error",

  "status.ideExpandedShort": "IDE",

  "status.ideExpandedHint": "Time in expanded mode: {{time}}",

  "status.ideExpandedAria": "IDE expanded for {{time}}",

  "devTools.open": "Terminal and Git",
  "devTools.openHint": "Open PowerShell terminal and Git panel (desktop only)",
  "devTools.title": "Developer tools",
  "devTools.tabsAria": "Terminal or Git",
  "devTools.tab.terminal": "Terminal",
  "devTools.tab.git": "Git",
  "devTools.close": "Close developer tools",
  "devTools.desktopOnly": "Terminal and Git are available only in the LAVASH desktop app (Tauri).",
  "devTools.terminal.ready": "PowerShell ready.",
  "devTools.terminal.exited": "Terminal session ended.",
  "devTools.terminal.startFailed": "Could not start the terminal.",
  "devTools.terminal.writeFailed": "Could not send input to the terminal.",
  "devTools.terminal.unavailable": "{{shell}} is not installed or not on PATH.",
  "devTools.git.loading": "Loading Git status…",
  "devTools.git.refresh": "Refresh Git status",
  "devTools.git.unavailable": "Git is not installed or not on PATH.",
  "devTools.git.notRepo": "Open a project folder that contains a Git repository.",
  "devTools.git.clean": "Working tree clean — no changes.",
  "devTools.git.loadFailed": "Could not load Git status.",
  "devTools.git.diffFailed": "Could not load diff.",
  "devTools.git.noDiff": "No diff for this file.",

  "resources.open": "LAVASH resource monitor",

  "resources.openHint": "Open CPU, memory, disk, and network monitor",

  "resources.windowTitle": "LAVASH · Resources",

  "resources.tab.overview": "Overview",

  "resources.tab.cpu": "CPU & Memory",

  "resources.tab.disk": "Disk",

  "resources.tab.network": "Network",

  "resources.card.cpu": "CPU (System)",

  "resources.card.memory": "Memory (System)",

  "resources.card.disk": "Disk (System)",

  "resources.diskAvailable": "Available {{free}} GB / {{total}} GB",

  "resources.cpuTitle": "CPU Processor",

  "resources.memoryTitle": "Physical Memory",

  "resources.diskLavash": "LAVASH data",

  "resources.diskRoot": "Disk / LAVASH",

  "resources.process.core": "IDE Core",

  "resources.process.lsp": "LSP",

  "resources.process.other": "Others",

  "resources.process.all": "All",

  "resources.highOnly": "Show only high occupancy",

  "resources.processEmpty": "It's empty here",

  "resources.col.process": "Process Name",

  "resources.col.cpu": "% CPU",

  "resources.col.memory": "Physical Memory",

  "resources.col.pid": "PID",

  "resources.col.name": "Folder Name",

  "resources.col.size": "Physical Usage",

  "resources.openFolder": "Open folder",

  "resources.close": "Close",

  "resources.loading": "Collecting metrics…",

  "resources.diagnoseNetwork": "Diagnose Network",

  "resources.diagnosing": "Diagnosing…",

  "resources.lastDiagnosed": "Last diagnosed {{time}}",

  "resources.networkHint": "Click Diagnose Network to run connectivity checks.",};
