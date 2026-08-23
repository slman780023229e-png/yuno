import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════
// 📁 FILES
// ═══════════════════════════════════════

const modeFile =
    path.join(__dirname, "../data/مود.json");

const eliteFile =
    path.join(__dirname, "../data/النخبة.json");

// ═══════════════════════════════════════
// ⚙️ SETTINGS
// ═══════════════════════════════════════

const MODE_CACHE_TIME = 5000;
const ELITE_CACHE_TIME = 10000;

const MESSAGE_CACHE_TIME = 30000;
const MAX_PROCESSED_MESSAGES = 5000;

// ═══════════════════════════════════════
// 🎨 COLORS
// ═══════════════════════════════════════

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    yellow: "\x1b[38;5;226m",
    gray: "\x1b[38;5;245m"
};

// ═══════════════════════════════════════
// 📝 LOG
// ═══════════════════════════════════════

function log(type, text) {

    try {

        const colors = {
            ok: COLORS.green,
            cmd: COLORS.cyan,
            err: COLORS.red,
            elite: COLORS.gold
        };

        const icons = {
            ok: "✅",
            cmd: "⚡",
            err: "❌",
            elite: "👑"
        };

        console.log(
            `${colors[type] || COLORS.cyan}` +
            `[${icons[type] || "•"}] ${text}` +
            COLORS.reset
        );

    } catch {}
}

// ═══════════════════════════════════════
// 🔍 NUMBER
// ═══════════════════════════════════════

export function extractPureNumber(jid) {

    try {

        if (!jid) {
            return "";
        }

        return String(jid)
            .replace(/[@:].*/g, "")
            .replace(/\D/g, "");

    } catch {

        return "";
    }
}

// ═══════════════════════════════════════
// 🔢 SAME NUMBER
// ═══════════════════════════════════════

function isSameNumber(a, b) {

    if (!a || !b) {
        return false;
    }

    const x =
        extractPureNumber(a);

    const y =
        extractPureNumber(b);

    if (!x || !y) {
        return false;
    }

    return (
        x === y ||
        x.endsWith(y) ||
        y.endsWith(x)
    );
}

// ═══════════════════════════════════════
// 👑 MAIN BOT
// ═══════════════════════════════════════

let cachedMainBotNumber = "";

function getMainBotNumber(sock) {

    try {

        if (cachedMainBotNumber) {
            return cachedMainBotNumber;
        }

        const possibleNumber =
            sock?.mainBotNumber ||
            sock?.__mainBotNumber ||
            process.env.MAIN_BOT_NUMBER ||
            "";

        const clean =
            extractPureNumber(
                possibleNumber
            );

        if (
            clean &&
            clean.length >= 5
        ) {

            cachedMainBotNumber =
                clean;

            log(
                "elite",
                `👑 Main Bot: ${clean}`
            );

            return clean;
        }

    } catch {}

    return "";
}

// ═══════════════════════════════════════
// ⚙️ MODE CACHE
// ═══════════════════════════════════════

let modeCache = {
    elite: false
};

let lastModeCheck = 0;
let modeLoading = null;

async function refreshMode() {

    if (modeLoading) {
        return modeLoading;
    }

    modeLoading =
        (async () => {

            try {

                if (
                    !fs.existsSync(modeFile)
                ) {

                    await fs.promises.mkdir(
                        path.dirname(modeFile),
                        {
                            recursive: true
                        }
                    );

                    await fs.promises.writeFile(
                        modeFile,
                        JSON.stringify(
                            {
                                elite: false
                            }
                        ),
                        "utf8"
                    );

                } else {

                    const content =
                        await fs.promises.readFile(
                            modeFile,
                            "utf8"
                        );

                    const parsed =
                        JSON.parse(
                            content || "{}"
                        );

                    if (
                        parsed &&
                        typeof parsed === "object"
                    ) {

                        modeCache = {
                            ...modeCache,
                            ...parsed
                        };
                    }
                }

                lastModeCheck =
                    Date.now();

                return modeCache;

            } catch {

                return modeCache;

            } finally {

                modeLoading = null;
            }

        })();

    return modeLoading;
}

function getModeFast() {

    const now =
        Date.now();

    if (
        now - lastModeCheck >=
        MODE_CACHE_TIME
    ) {

        refreshMode().catch(() => {});
    }

    return modeCache;
}

// ═══════════════════════════════════════
// 👑 ELITE
// ═══════════════════════════════════════

let eliteCache = [];
let eliteSet = new Set();

let lastEliteCheck = 0;
let eliteLoading = null;

async function refreshElite() {

    if (eliteLoading) {
        return eliteLoading;
    }

    eliteLoading =
        (async () => {

            try {

                if (
                    !fs.existsSync(
                        eliteFile
                    )
                ) {

                    await fs.promises.mkdir(
                        path.dirname(
                            eliteFile
                        ),
                        {
                            recursive: true
                        }
                    );

                    await fs.promises.writeFile(
                        eliteFile,
                        "[]",
                        "utf8"
                    );

                    eliteCache = [];
                    eliteSet.clear();

                } else {

                    const content =
                        await fs.promises.readFile(
                            eliteFile,
                            "utf8"
                        );

                    const data =
                        JSON.parse(
                            content || "[]"
                        );

                    const result = [];
                    const set = new Set();

                    if (
                        Array.isArray(data)
                    ) {

                        for (
                            const item
                            of data
                        ) {

                            let value =
                                item;

                            if (
                                typeof item ===
                                    "object" &&
                                item !== null
                            ) {

                                value =
                                    item.number ||
                                    item.id ||
                                    Object.values(
                                        item
                                    )[0];
                            }

                            const number =
                                extractPureNumber(
                                    value
                                );

                            if (
                                number &&
                                number.length >= 5 &&
                                !set.has(number)
                            ) {

                                set.add(number);

                                result.push(
                                    number
                                );
                            }
                        }
                    }

                    eliteCache =
                        result;

                    eliteSet =
                        set;
                }

                lastEliteCheck =
                    Date.now();

                return eliteCache;

            } catch {

                return eliteCache;

            } finally {

                eliteLoading = null;
            }

        })();

    return eliteLoading;
}

function getEliteFast() {

    const now =
        Date.now();

    if (
        now - lastEliteCheck >=
        ELITE_CACHE_TIME
    ) {

        refreshElite().catch(() => {});
    }

    return eliteCache;
}

// ═══════════════════════════════════════
// 🚀 PLUGINS
// ═══════════════════════════════════════

let loadedPluginsCache = null;
let pluginsLoadingPromise = null;

let commandIndex = new Map();
let onMessagePlugins = [];

async function getLoadedPlugins(sock) {

    if (
        Array.isArray(
            loadedPluginsCache
        )
    ) {

        return loadedPluginsCache;
    }

    if (pluginsLoadingPromise) {
        return pluginsLoadingPromise;
    }

    pluginsLoadingPromise =
        (async () => {

            try {

                const plugins =
                    await loadPlugins(sock);

                loadedPluginsCache =
                    Array.isArray(plugins)
                        ? plugins.filter(Boolean)
                        : [];

                commandIndex =
                    new Map();

                const listeners = [];

                for (
                    const plugin
                    of loadedPluginsCache
                ) {

                    if (
                        typeof plugin?.onMessage ===
                        "function"
                    ) {

                        listeners.push(
                            plugin
                        );
                    }

                    if (
                        !plugin?.command
                    ) {

                        continue;
                    }

                    const commands =
                        Array.isArray(
                            plugin.command
                        )
                            ? plugin.command
                            : [
                                plugin.command
                            ];

                    for (
                        const command
                        of commands
                    ) {

                        if (
                            command ===
                                undefined ||
                            command ===
                                null
                        ) {

                            continue;
                        }

                        const key =
                            String(
                                command
                            )
                                .trim()
                                .toLowerCase();

                        if (!key) {
                            continue;
                        }

                        if (
                            !commandIndex.has(
                                key
                            )
                        ) {

                            commandIndex.set(
                                key,
                                plugin
                            );
                        }
                    }
                }

                onMessagePlugins =
                    listeners;

                log(
                    "ok",
                    `Loaded ${loadedPluginsCache.length} plugins | ${commandIndex.size} commands`
                );

                return loadedPluginsCache;

            } catch (error) {

                console.error(
                    "Plugin Loader Error:",
                    error?.message ||
                    error
                );

                loadedPluginsCache = [];
                commandIndex = new Map();
                onMessagePlugins = [];

                return [];

            } finally {

                pluginsLoadingPromise = null;
            }

        })();

    return pluginsLoadingPromise;
}

// ═══════════════════════════════════════
// 🧹 CLEAR PLUGINS
// ═══════════════════════════════════════

export function clearPluginsCache() {

    loadedPluginsCache = null;

    commandIndex =
        new Map();

    onMessagePlugins = [];

    console.log(
        `${COLORS.yellow}⚡ Plugin Cache Cleared${COLORS.reset}`
    );
}

// ═══════════════════════════════════════
// 🛡️ MESSAGE CACHE — PER SESSION
// ═══════════════════════════════════════

const processedMessages =
    new Map();

function wasProcessed(
    id,
    sock
) {

    if (!id) {
        return false;
    }

    const now =
        Date.now();

    const botNumber =
        extractPureNumber(
            sock?.user?.id
        );

    const sessionKey =
        botNumber ||
        sock?.user?.id ||
        "unknown-session";

    const cacheKey =
        `${sessionKey}:${id}`;

    const old =
        processedMessages.get(
            cacheKey
        );

    if (
        old &&
        now - old <
        MESSAGE_CACHE_TIME
    ) {

        return true;
    }

    processedMessages.set(
        cacheKey,
        now
    );

    if (
        processedMessages.size >
        MAX_PROCESSED_MESSAGES * 10
    ) {

        let removed = 0;

        for (
            const [
                key,
                time
            ]
            of processedMessages
        ) {

            if (
                now - time >
                MESSAGE_CACHE_TIME
            ) {

                processedMessages.delete(
                    key
                );

                removed++;
            }

            if (
                removed >= 500
            ) {

                break;
            }
        }
    }

    return false;
}

// ═══════════════════════════════════════
// 🧹 CACHE CLEANER
// ═══════════════════════════════════════

const cleaner =
    setInterval(
        () => {

            try {

                const now =
                    Date.now();

                for (
                    const [
                        key,
                        time
                    ]
                    of processedMessages
                ) {

                    if (
                        now - time >
                        MESSAGE_CACHE_TIME
                    ) {

                        processedMessages.delete(
                            key
                        );
                    }
                }

            } catch {}

        },
        30000
    );

if (
    typeof cleaner.unref ===
    "function"
) {

    cleaner.unref();
}

// ═══════════════════════════════════════
// 📋 INTERACTIVE / DROPDOWN RESPONSE
// ═══════════════════════════════════════
//
// يدعم:
// • listResponseMessage
// • buttonsResponseMessage
// • templateButtonReplyMessage
// • interactiveResponseMessage
// • nativeFlowResponseMessage
// • single_select
// • quick_reply
//
// ═══════════════════════════════════════

function extractInteractiveResponseId(msg) {

    try {

        const message =
            msg?.message;

        if (!message) {
            return "";
        }

        // ═══════════════════════════════
        // 📋 النظام القديم للقائمة
        // ═══════════════════════════════

        const oldListId =
            message
                ?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId;

        if (oldListId) {
            return String(oldListId).trim();
        }

        // ═══════════════════════════════
        // 🔘 الأزرار القديمة
        // ═══════════════════════════════

        const buttonId =
            message
                ?.buttonsResponseMessage
                ?.selectedButtonId;

        if (buttonId) {
            return String(buttonId).trim();
        }

        // ═══════════════════════════════
        // 🔘 TEMPLATE BUTTON
        // ═══════════════════════════════

        const templateId =
            message
                ?.templateButtonReplyMessage
                ?.selectedId;

        if (templateId) {
            return String(templateId).trim();
        }

        // ═══════════════════════════════
        // ⚡ INTERACTIVE RESPONSE
        // ═══════════════════════════════

        const interactive =
            message
                ?.interactiveResponseMessage;

        if (interactive) {

            const nativeFlow =
                interactive
                    ?.nativeFlowResponseMessage;

            if (nativeFlow) {

                const params =
                    nativeFlow?.paramsJson;

                if (params) {

                    try {

                        const parsed =
                            typeof params === "string"
                                ? JSON.parse(params)
                                : params;

                        if (
                            parsed &&
                            typeof parsed === "object"
                        ) {

                            // single_select
                            if (
                                parsed.id
                            ) {

                                return String(
                                    parsed.id
                                ).trim();
                            }

                            // selected row
                            if (
                                parsed.selectedRowId
                            ) {

                                return String(
                                    parsed.selectedRowId
                                ).trim();
                            }

                            // selected id
                            if (
                                parsed.selectedId
                            ) {

                                return String(
                                    parsed.selectedId
                                ).trim();
                            }

                            // command
                            if (
                                parsed.command
                            ) {

                                return String(
                                    parsed.command
                                ).trim();
                            }
                        }

                    } catch {

                        // أحيانًا تصل البيانات
                        // كسلسلة غير قابلة للتحليل.
                    }

                    // محاولة استخراج id مباشرة
                    const match =
                        String(params).match(
                            /"(?:id|selectedRowId|selectedId|command)"\s*:\s*"([^"]+)"/
                        );

                    if (match?.[1]) {

                        return String(
                            match[1]
                        ).trim();
                    }
                }
            }
        }

        // ═══════════════════════════════
        // 🧩 دعم nativeFlow مباشرة
        // ═══════════════════════════════

        const nativeFlowDirect =
            message
                ?.nativeFlowResponseMessage;

        if (nativeFlowDirect) {

            const params =
                nativeFlowDirect?.paramsJson;

            if (params) {

                try {

                    const parsed =
                        typeof params === "string"
                            ? JSON.parse(params)
                            : params;

                    if (
                        parsed?.id
                    ) {

                        return String(
                            parsed.id
                        ).trim();
                    }

                    if (
                        parsed?.selectedRowId
                    ) {

                        return String(
                            parsed.selectedRowId
                        ).trim();
                    }

                    if (
                        parsed?.selectedId
                    ) {

                        return String(
                            parsed.selectedId
                        ).trim();
                    }

                } catch {

                    const match =
                        String(params).match(
                            /"(?:id|selectedRowId|selectedId)"\s*:\s*"([^"]+)"/
                        );

                    if (match?.[1]) {

                        return String(
                            match[1]
                        ).trim();
                    }
                }
            }
        }

    } catch (error) {

        console.error(
            "Interactive Response Parse Error:",
            error?.message ||
            error
        );
    }

    return "";
}

// ═══════════════════════════════════════
// 🧹 NORMALIZE MENU ID
// ═══════════════════════════════════════
//
// يسمح لك باستخدام:
//
// id: "اوامر"
// id: "cmd:اوامر"
// id: "command:اوامر"
// id: ".اوامر"
// id: "/اوامر"
//
// بدون تغيير البلجنات.
// ═══════════════════════════════════════

function normalizeMenuCommand(id) {

    if (!id) {
        return "";
    }

    let value =
        String(id).trim();

    if (!value) {
        return "";
    }

    // cmd:اوامر
    if (
        value
            .toLowerCase()
            .startsWith("cmd:")
    ) {

        value =
            value.slice(4).trim();
    }

    // command:اوامر
    else if (
        value
            .toLowerCase()
            .startsWith("command:")
    ) {

        value =
            value.slice(8).trim();
    }

    // إزالة البادئة إذا كانت موجودة
    value =
        value.replace(
            /^[./\\#,!^&+=]+/,
            ""
        ).trim();

    return value;
}

// ═══════════════════════════════════════
// 🚀 MESSAGE ENTRY
// ═══════════════════════════════════════

export async function handleMessages(
    sock,
    m
) {

    try {

        const msg =
            m?.messages?.[0];

        if (
            !msg ||
            !msg.message
        ) {

            return;
        }

        const messageId =
            msg.key?.id;

        if (
            messageId &&
            wasProcessed(
                messageId,
                sock
            )
        ) {

            return;
        }

        executeHandlerLogic(
            sock,
            msg
        ).catch(error => {

            console.error(
                "Handler Error:",
                error?.message ||
                error
            );

        });

    } catch (error) {

        console.error(
            "handleMessages Error:",
            error?.message ||
            error
        );
    }
}

// ═══════════════════════════════════════
// ⚡ MAIN HANDLER
// ═══════════════════════════════════════

async function executeHandlerLogic(
    sock,
    msg
) {

    // ═══════════════════════════════
    // 🤖 BOT
    // ═══════════════════════════════

    const botNumber =
        extractPureNumber(
            sock?.user?.id
        );

    // ═══════════════════════════════
    // 👑 MAIN BOT
    // ═══════════════════════════════

    const mainNumber =
        getMainBotNumber(sock);

    const isMainBot =
        !!(
            mainNumber &&
            isSameNumber(
                botNumber,
                mainNumber
            )
        );

    // ═══════════════════════════════
    // 📍 CHAT
    // ═══════════════════════════════

    const jid =
        msg.key?.remoteJid;

    if (!jid) {
        return;
    }

    const isGroup =
        jid.endsWith("@g.us");

    const isPrivate =
        jid.endsWith("@s.whatsapp.net");

    // ═══════════════════════════════
    // 👤 SENDER
    // ═══════════════════════════════

    const sender =
        msg.key?.fromMe
            ? (
                botNumber
                    ? `${botNumber}@s.whatsapp.net`
                    : (
                        msg.key?.participant ||
                        jid
                    )
            )
            : (
                isGroup
                    ? (
                        msg.key?.participant ||
                        jid
                    )
                    : jid
            );

    const number =
        extractPureNumber(
            sender
        );

    // ═══════════════════════════════
    // 👑 ELITE
    // ═══════════════════════════════

    const eliteList =
        getEliteFast();

    let isEliteUser =
        false;

    if (isMainBot) {

        isEliteUser = true;

    } else if (number) {

        if (
            eliteSet.has(number)
        ) {

            isEliteUser = true;

        } else {

            for (
                const elite
                of eliteList
            ) {

                if (
                    isSameNumber(
                        number,
                        elite
                    )
                ) {

                    isEliteUser = true;

                    break;
                }
            }
        }
    }

    // ═══════════════════════════════
    // 📦 PLUGINS
    // ═══════════════════════════════

    const plugins =
        await getLoadedPlugins(
            sock
        );

    if (!plugins.length) {
        return;
    }

    // ═══════════════════════════════
    // 📝 TEXT
    // ═══════════════════════════════

    const normalText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

    // ═══════════════════════════════
    // 📋 INTERACTIVE ID
    // ═══════════════════════════════

    const interactiveId =
        extractInteractiveResponseId(
            msg
        );

    // ═══════════════════════════════
    // 🧠 TEXT SOURCE
    // ═══════════════════════════════
    //
    // الأولوية:
    //
    // 1. القائمة المنسدلة
    // 2. الأزرار
    // 3. الرسالة العادية
    //
    // ═══════════════════════════════

    let rawText =
        interactiveId ||
        normalText ||
        "";

    let fromInteractive =
        !!interactiveId;

    const text =
        String(
            rawText || ""
        ).trim();

    // ═══════════════════════════════
    // 🔔 TURBO LISTENERS
    // ═══════════════════════════════

    if (
        onMessagePlugins.length
    ) {

        const context = {

            jid,

            sender,

            number,

            isGroup,

            isPrivate,

            message: msg,

            isElite:
                isEliteUser,

            botNumber,

            mainBotNumber:
                mainNumber,

            isMainBot,

            isInteractive:
                fromInteractive,

            interactiveId:
                interactiveId || null,

            isListResponse:
                !!interactiveId,

            isAdmin: false,

            isSuperAdmin: false,

            adminMode: false
        };

        for (
            const plugin
            of onMessagePlugins
        ) {

            try {

                Promise.resolve(
                    plugin.onMessage(
                        sock,
                        msg,
                        context
                    )
                ).catch(error => {

                    console.error(
                        "onMessage Error:",
                        error?.message ||
                        error
                    );

                });

            } catch (error) {

                console.error(
                    "onMessage Sync Error:",
                    error?.message ||
                    error
                );
            }
        }
    }

    // ═══════════════════════════════
    // 🔐 ELITE MODE
    // ═══════════════════════════════

    const mode =
        getModeFast();

    if (
        mode?.elite === true &&
        !isMainBot &&
        !isEliteUser
    ) {

        return;
    }

    if (!text) {
        return;
    }

    // ═══════════════════════════════
    // ⚡ PREFIX
    // ═══════════════════════════════

    /*
     * القائمة لا تحتاج Prefix.
     *
     * مثال:
     *
     * id: "اوامر"
     *
     * سيعامل كأنه:
     *
     * اوامر
     *
     * أما الرسائل العادية فتبقى
     * على نظام Prefix القديم.
     */

    const hasPrefix =
        fromInteractive
            ? false
            : /^[./\\#,!^&+=]/.test(
                text
            );

    let noPrefixText =
        hasPrefix
            ? text.slice(1).trim()
            : text;

    // ═══════════════════════════════
    // 📋 MENU COMMAND NORMALIZATION
    // ═══════════════════════════════

    if (fromInteractive) {

        noPrefixText =
            normalizeMenuCommand(
                noPrefixText
            );
    }

    if (!noPrefixText) {
        return;
    }

    // ═══════════════════════════════
    // 📝 COMMAND
    // ═══════════════════════════════

    const space =
        noPrefixText.search(
            /\s/
        );

    const commandName =
        (
            space === -1
                ? noPrefixText
                : noPrefixText.slice(
                    0,
                    space
                )
        )
            .toLowerCase();

    if (!commandName) {
        return;
    }

    // ═══════════════════════════════
    // ⚡ O(1) COMMAND
    // ═══════════════════════════════

    const cmd =
        commandIndex.get(
            commandName
        );

    if (!cmd) {

        /*
         * القائمة قد تحتوي ID
         * لا يمثل أمرًا.
         *
         * لا نرسل أي رد تلقائي
         * حتى لا نخرب البلجنات.
         */

        return;
    }

    // ═══════════════════════════════
    // 🔐 NO PREFIX
    // ═══════════════════════════════

    /*
     * اختيار القائمة يعتبر تفاعلًا
     * مقصودًا من المستخدم.
     *
     * لذلك لا يحتاج Prefix.
     *
     * الأوامر المكتوبة يدويًا
     * تبقى على النظام القديم.
     */

    if (
        !hasPrefix &&
        !isEliteUser &&
        !fromInteractive
    ) {

        return;
    }

    // ═══════════════════════════════
    // ⚡ EXECUTE
    // ═══════════════════════════════

    log(
        "cmd",
        `${commandName} ← ${jid} ← ${
            fromInteractive
                ? "MENU"
                : (
                    isMainBot
                        ? "MAIN"
                        : botNumber || "UNKNOWN"
                )
        }`
    );

    try {

        await cmd.execute(
            sock,
            msg,
            {

                text,

                noPrefixText,

                commandName,

                jid,

                sender,

                number,

                isGroup,

                isPrivate,

                hasPrefix,

                isElite:
                    isEliteUser,

                botNumber,

                mainBotNumber:
                    mainNumber,

                isMainBot,

                // ═══════════════════════
                // 📋 MENU DATA
                // ═══════════════════════

                isInteractive:
                    fromInteractive,

                interactiveId:
                    interactiveId || null,

                isListResponse:
                    !!interactiveId,

                // ═══════════════════════
                // 🛡️ ADMIN READY
                // ═══════════════════════

                isAdmin: false,

                isSuperAdmin: false,

                adminMode: false
            }
        );

    } catch (error) {

        console.error(
            `Command Error [${commandName}]:`,
            error?.message ||
            error
        );
    }
}

// ═══════════════════════════════════════
// 🚀 WARMUP
// ═══════════════════════════════════════

export async function warmupHandler(
    sock
) {

    try {

        await Promise.all([
            refreshMode(),
            refreshElite(),
            getLoadedPlugins(sock)
        ]);

        getMainBotNumber(sock);

        log(
            "ok",
            "⚡ Handler Warmup Completed"
        );

        return true;

    } catch (error) {

        console.error(
            "Handler Warmup Error:",
            error?.message ||
            error
        );

        return false;
    }
}
