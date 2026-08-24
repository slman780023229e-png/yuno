import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsPath = path.join(__dirname, "../plugins");

// ═══════════════════════════════════════════════════════
// 🎨 COLORS
// ═══════════════════════════════════════════════════════

const COLORS = {
    reset: "\x1b[0m",
    red: "\x1b[38;5;196m",
    orange: "\x1b[38;5;208m",
    gold: "\x1b[38;5;220m",
    yellow: "\x1b[38;5;226m",
    green: "\x1b[38;5;46m",
    cyan: "\x1b[38;5;51m",
    blue: "\x1b[38;5;39m",
    purple: "\x1b[38;5;93m",
    pink: "\x1b[38;5;213m",
    white: "\x1b[97m",
    gray: "\x1b[38;5;245m"
};

// ═══════════════════════════════════════════════════════
// ⚙️ CONFIG
// ═══════════════════════════════════════════════════════

const WATCH_DEBOUNCE = 700;
const MAX_FILENAME_LOG = 28;

// ═══════════════════════════════════════════════════════
// 🧠 CACHE
// ═══════════════════════════════════════════════════════

let pluginsCache = null;
let loadingPromise = null;

let watcher = null;
let watchTimer = null;
let watchCallback = null;

let lastWatchEvent = 0;
let watcherStarted = false;

// ═══════════════════════════════════════════════════════
// 📁 ENSURE PLUGINS DIRECTORY
// ═══════════════════════════════════════════════════════

function ensurePluginsDirectory() {
    try {
        if (!fs.existsSync(pluginsPath)) {
            fs.mkdirSync(pluginsPath, {
                recursive: true
            });
        }

        return true;
    } catch (error) {
        console.error(
            `${COLORS.red}❌ Plugins Directory Error:${COLORS.reset}`,
            error?.message || error
        );

        return false;
    }
}

// ═══════════════════════════════════════════════════════
// 📦 GET PLUGIN FILES
// ═══════════════════════════════════════════════════════

function getPluginFiles() {
    try {
        if (!ensurePluginsDirectory()) {
            return [];
        }

        return fs
            .readdirSync(pluginsPath, {
                withFileTypes: true
            })
            .filter(entry =>
                entry.isFile() &&
                entry.name.endsWith(".js") &&
                !entry.name.startsWith(".")
            )
            .map(entry => entry.name)
            .sort();
    } catch (error) {
        console.error(
            `${COLORS.red}❌ Plugin Scan Error:${COLORS.reset}`,
            error?.message || error
        );

        return [];
    }
}

// ═══════════════════════════════════════════════════════
// 🧩 IMPORT ONE PLUGIN
// ═══════════════════════════════════════════════════════

async function importPlugin(file) {
    const filePath = path.join(
        pluginsPath,
        file
    );

    try {
        /*
         * مهم:
         * لا نستخدم ?update=Date.now()
         * في التحميل العادي.
         *
         * هذا يسمح لـ Node.js باستخدام
         * module cache بأفضل شكل.
         */
        const fileUrl =
            pathToFileURL(filePath).href;

        const module =
            await import(fileUrl);

        const plugin =
            module?.default;

        if (
            !plugin ||
            typeof plugin !== "object"
        ) {
            console.log(
                `${COLORS.yellow}⚠️ INVALID PLUGIN:${COLORS.reset} ${file}`
            );

            return null;
        }

        return plugin;

    } catch (error) {
        console.log(
            `${COLORS.red}❌ ERROR IN PLUGIN:${COLORS.reset} ${file}`
        );

        console.log(
            `${COLORS.gray}   ${String(
                error?.message || error
            ).slice(0, 180)}${COLORS.reset}`
        );

        return null;
    }
}

// ═══════════════════════════════════════════════════════
// 🚀 LOAD PLUGINS
// ═══════════════════════════════════════════════════════

export async function loadPlugins(sock) {
    /*
     * sock محفوظ في التوقيع
     * حتى لا تتغير طريقة استخدام الـHandler.
     */

    if (pluginsCache) {
        return pluginsCache;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            ensurePluginsDirectory();

            const files =
                getPluginFiles();

            if (!files.length) {
                pluginsCache = [];

                console.log(
                    `${COLORS.yellow}⚠️ لا توجد بلجنات داخل plugins/${COLORS.reset}`
                );

                return pluginsCache;
            }

            console.log(
                `\n${COLORS.purple}` +
                `╔═══════════════════════════════════════════════╗\n` +
                `${COLORS.gold}║        👑 ARTHUR PLUGIN ENGINE 👑            ║\n` +
                `${COLORS.purple}╠═══════════════════════════════════════════════╣\n` +
                `${COLORS.cyan}║ ⚡ ENGINE  : FAST CACHE                       ║\n` +
                `${COLORS.green}║ 📦 FILES   : ${String(files.length).padEnd(35)}║\n` +
                `${COLORS.blue}║ 🚀 MODE    : PARALLEL                         ║\n` +
                `${COLORS.purple}╚═══════════════════════════════════════════════╝` +
                `${COLORS.reset}\n`
            );

            /*
             * تحميل جميع الملفات بالتوازي.
             *
             * هذا أسرع بكثير من:
             *
             * for (...) {
             *     await import(...)
             * }
             */
            const results =
                await Promise.all(
                    files.map(
                        file =>
                            importPlugin(file)
                                .then(plugin => ({
                                    file,
                                    plugin
                                }))
                    )
                );

            const plugins = [];

            for (const result of results) {
                if (!result?.plugin) {
                    continue;
                }

                plugins.push(
                    result.plugin
                );

                const fileName =
                    result.file.length >
                    MAX_FILENAME_LOG
                        ? result.file.slice(
                              0,
                              MAX_FILENAME_LOG
                          )
                        : result.file;

                console.log(
                    `${COLORS.green}✅${COLORS.reset} ${fileName}`
                );
            }

            pluginsCache = plugins;

            console.log(
                `\n${COLORS.green}` +
                `╔═══════════════════════════════════════════════╗\n` +
                `║             ✅ ARTHUR ONLINE                 ║\n` +
                `╠═══════════════════════════════════════════════╣\n` +
                `${COLORS.gold}║ 📦 LOADED  : ${String(
                    plugins.length
                ).padEnd(35)}║\n` +
                `${COLORS.cyan}║ ⚡ CACHE   : ACTIVE                            ║\n` +
                `${COLORS.blue}║ 🚀 ENGINE  : FAST                              ║\n` +
                `${COLORS.green}║ 🛡️ STATUS  : READY                             ║\n` +
                `${COLORS.green}╚═══════════════════════════════════════════════╝` +
                `${COLORS.reset}\n`
            );

            return plugins;

        } catch (error) {
            console.error(
                `${COLORS.red}❌ Plugin Loader Fatal Error:${COLORS.reset}`,
                error?.message || error
            );

            /*
             * لا نترك Promise عالقًا.
             */
            pluginsCache = [];

            return pluginsCache;

        } finally {
            loadingPromise = null;
        }
    })();

    return loadingPromise;
}

// ═══════════════════════════════════════════════════════
// 🧹 CLEAR CACHE
// ═══════════════════════════════════════════════════════

export function clearPluginsCache() {
    /*
     * مسح cache فقط.
     *
     * عند استدعاء loadPlugins مرة أخرى
     * سيتم تحميل القائمة من جديد.
     */
    pluginsCache = null;
}

// ═══════════════════════════════════════════════════════
// 🔄 FORCE RELOAD
// ═══════════════════════════════════════════════════════

export async function reloadPlugins(sock) {
    try {
        clearPluginsCache();

        return await loadPlugins(sock);

    } catch (error) {
        console.error(
            `${COLORS.red}❌ Plugin Reload Error:${COLORS.reset}`,
            error?.message || error
        );

        return [];
    }
}

// ═══════════════════════════════════════════════════════
// 🔥 LIVE WATCHER
// ═══════════════════════════════════════════════════════

export function watchPlugins(onChangeCallback) {
    /*
     * إذا تم تشغيل watcher سابقًا
     * لا ننشئ واحدًا ثانيًا.
     */
    if (watcherStarted && watcher) {
        watchCallback =
            typeof onChangeCallback === "function"
                ? onChangeCallback
                : watchCallback;

        return watcher;
    }

    if (!ensurePluginsDirectory()) {
        return null;
    }

    watchCallback =
        typeof onChangeCallback === "function"
            ? onChangeCallback
            : null;

    try {
        watcher =
            fs.watch(
                pluginsPath,
                {
                    persistent: false
                },
                (eventType, filename) => {

                    if (
                        !filename ||
                        !String(
                            filename
                        ).endsWith(".js")
                    ) {
                        return;
                    }

                    const now =
                        Date.now();

                    /*
                     * حماية من الأحداث المكررة
                     * التي قد يرسلها fs.watch.
                     */
                    if (
                        now - lastWatchEvent <
                        100
                    ) {
                        return;
                    }

                    lastWatchEvent = now;

                    /*
                     * Debounce:
                     * لو وصل أكثر من event
                     * ننتظر حتى يستقر التعديل.
                     */
                    if (watchTimer) {
                        clearTimeout(
                            watchTimer
                        );
                    }

                    watchTimer =
                        setTimeout(
                            async () => {
                                watchTimer =
                                    null;

                                try {
                                    const shortName =
                                        String(
                                            filename
                                        ).slice(
                                            0,
                                            MAX_FILENAME_LOG
                                        );

                                    console.log(
                                        `${COLORS.gold}🔄 Plugin Changed:${COLORS.reset} ${shortName}`
                                    );

                                    clearPluginsCache();

                                    if (
                                        typeof watchCallback ===
                                        "function"
                                    ) {
                                        await Promise.resolve(
                                            watchCallback()
                                        );
                                    }

                                } catch (error) {
                                    console.error(
                                        `${COLORS.red}❌ Watch Reload Error:${COLORS.reset}`,
                                        error?.message ||
                                            error
                                    );
                                }
                            },
                            WATCH_DEBOUNCE
                        );

                    /*
                     * لا نخلي timer يمنع
                     * Node.js من الإغلاق.
                     */
                    if (
                        watchTimer?.unref
                    ) {
                        watchTimer.unref();
                    }
                }
            );

        watcherStarted = true;

        /*
         * منع watcher من إبقاء السيرفر
         * حيًا وحده.
         */
        if (
            watcher?.unref
        ) {
            watcher.unref();
        }

        console.log(
            `${COLORS.green}👁️ Plugin Watcher: ACTIVE${COLORS.reset}`
        );

        return watcher;

    } catch (error) {
        watcher = null;
        watcherStarted = false;

        console.error(
            `${COLORS.red}❌ Plugin Watcher Error:${COLORS.reset}`,
            error?.message || error
        );

        return null;
    }
}

// ═══════════════════════════════════════════════════════
// 🛑 STOP WATCHER
// ═══════════════════════════════════════════════════════

export function stopPluginWatcher() {
    try {
        if (watchTimer) {
            clearTimeout(
                watchTimer
            );

            watchTimer = null;
        }

        if (watcher) {
            watcher.close();
        }

    } catch {}

    watcher = null;
    watcherStarted = false;
    watchCallback = null;
}

// ═══════════════════════════════════════════════════════
// 📊 STATUS
// ═══════════════════════════════════════════════════════

export function getPluginLoaderStatus() {
    return {
        cached:
            Array.isArray(
                pluginsCache
            ),

        loading:
            !!loadingPromise,

        count:
            Array.isArray(
                pluginsCache
            )
                ? pluginsCache.length
                : 0,

        watcher:
            watcherStarted
    };
}
