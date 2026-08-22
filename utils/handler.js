import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════
// 📁 الملفات
// ═══════════════════════════════════════

const modeFile = path.join(__dirname, "../data/مود.json");
const eliteFile = path.join(__dirname, "../data/النخبة.json");
const ownerFile = path.join(__dirname, "../data/owner.json");

// ═══════════════════════════════════════
// 🎨 COLORS
// ═══════════════════════════════════════

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    purple: "\x1b[38;5;141m",
    yellow: "\x1b[38;5;226m",
    blue: "\x1b[38;5;45m",
    white: "\x1b[38;5;255m",
    gray: "\x1b[38;5;245m"
};

// ═══════════════════════════════════════
// 📝 LOG
// ═══════════════════════════════════════

function log(type, text) {
    try {
        const icons = {
            ok: "✅",
            cmd: "⚡",
            err: "❌",
            elite: "👑"
        };

        const colors = {
            ok: COLORS.green,
            cmd: COLORS.cyan,
            err: COLORS.red,
            elite: COLORS.gold
        };

        console.log(
            `${colors[type] || COLORS.cyan}` +
            `\n╭────────────────────────────────────────╮` +
            `\n│ 🛡️ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 🛡️` +
            `\n├────────────────────────────────────────┤` +
            `\n│ ${icons[type] || "•"} ${text}` +
            `\n╰────────────────────────────────────────╯` +
            `\n${COLORS.reset}`
        );
    } catch {}
}

// ═══════════════════════════════════════
// 🔍 استخراج الرقم
// ═══════════════════════════════════════

export function extractPureNumber(jid) {
    try {
        if (!jid) return "";

        return String(jid)
            .replace(/[@:].*/g, "")
            .replace(/\D/g, "");
    } catch {
        return "";
    }
}

// ═══════════════════════════════════════
// ⚙️ MODE CACHE
// ═══════════════════════════════════════

let cachedMode = {
    elite: false
};

let lastModeCheck = 0;
let modeLoading = null;

const MODE_CACHE_TIME = 5000;

async function refreshMode() {
    if (modeLoading) {
        return modeLoading;
    }

    modeLoading = (async () => {
        try {
            if (!fs.existsSync(modeFile)) {
                await fs.promises.mkdir(
                    path.dirname(modeFile),
                    { recursive: true }
                );

                await fs.promises.writeFile(
                    modeFile,
                    JSON.stringify(
                        { elite: false },
                        null,
                        2
                    ),
                    "utf8"
                );

                cachedMode = {
                    elite: false
                };

                return cachedMode;
            }

            const content =
                await fs.promises.readFile(
                    modeFile,
                    "utf8"
                );

            const parsed =
                JSON.parse(content || "{}");

            cachedMode =
                parsed &&
                typeof parsed === "object"
                    ? parsed
                    : { elite: false };

            lastModeCheck = Date.now();

            return cachedMode;

        } catch {
            return cachedMode;
        } finally {
            modeLoading = null;
        }
    })();

    return modeLoading;
}

async function getMode() {
    const now = Date.now();

    if (
        now - lastModeCheck >=
        MODE_CACHE_TIME
    ) {
        // لا نوقف الرسالة الحالية بسبب القراءة
        refreshMode().catch(() => {});
    }

    return cachedMode;
}

// ═══════════════════════════════════════
// 👑 ELITE CACHE
// ═══════════════════════════════════════

let eliteCache = [];
let lastEliteCheck = 0;
let eliteLoading = null;

const ELITE_CACHE_TIME = 10000;

async function refreshElite() {
    if (eliteLoading) {
        return eliteLoading;
    }

    eliteLoading = (async () => {
        try {
            if (!fs.existsSync(eliteFile)) {
                await fs.promises.mkdir(
                    path.dirname(eliteFile),
                    { recursive: true }
                );

                await fs.promises.writeFile(
                    eliteFile,
                    "[]",
                    "utf8"
                );

                eliteCache = [];
                lastEliteCheck = Date.now();

                return eliteCache;
            }

            const content =
                await fs.promises.readFile(
                    eliteFile,
                    "utf8"
                );

            if (!content.trim()) {
                eliteCache = [];
                lastEliteCheck = Date.now();

                return eliteCache;
            }

            const data =
                JSON.parse(content);

            const list =
                Array.isArray(data)
                    ? data
                    : [];

            const result = [];

            for (const item of list) {

                let value = item;

                if (
                    typeof item === "object" &&
                    item !== null
                ) {
                    value =
                        item.number ||
                        item.id ||
                        Object.values(item)[0];
                }

                const number =
                    extractPureNumber(value);

                if (
                    number &&
                    number.length >= 5
                ) {
                    result.push(number);
                }
            }

            eliteCache =
                [...new Set(result)];

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

async function getElite() {
    const now = Date.now();

    if (
        now - lastEliteCheck >=
        ELITE_CACHE_TIME
    ) {
        refreshElite().catch(() => {});
    }

    return eliteCache;
}

// ═══════════════════════════════════════
// 👑 إضافة رقم الجلسة للنخبة
// ═══════════════════════════════════════

let eliteWritePromise = Promise.resolve();
let sessionEliteNumber = null;

function addEliteAutomatically(number) {

    const cleanNum =
        extractPureNumber(number);

    if (
        !cleanNum ||
        cleanNum.length < 5
    ) {
        return;
    }

    if (
        sessionEliteNumber === cleanNum
    ) {
        return;
    }

    sessionEliteNumber = cleanNum;

    eliteWritePromise =
        eliteWritePromise.then(
            async () => {

                try {

                    const list =
                        await refreshElite();

                    if (
                        list.includes(cleanNum)
                    ) {
                        return;
                    }

                    const newList =
                        [
                            ...new Set([
                                ...list,
                                cleanNum
                            ])
                        ];

                    const tempFile =
                        `${eliteFile}.tmp`;

                    await fs.promises.mkdir(
                        path.dirname(eliteFile),
                        { recursive: true }
                    );

                    await fs.promises.writeFile(
                        tempFile,
                        JSON.stringify(
                            newList,
                            null,
                            2
                        ),
                        "utf8"
                    );

                    await fs.promises.rename(
                        tempFile,
                        eliteFile
                    );

                    eliteCache =
                        newList;

                    lastEliteCheck =
                        Date.now();

                    log(
                        "elite",
                        `تم حفظ رقم الجلسة ${cleanNum} في النخبة 👑`
                    );

                } catch (error) {

                    console.error(
                        "Elite Write Error:",
                        error?.message ||
                        error
                    );
                }
            }
        ).catch(() => {});
}

// ═══════════════════════════════════════
// 🛡️ OWNER
// ═══════════════════════════════════════

let cachedOwner = null;

function getOwner() {

    if (cachedOwner) {
        return cachedOwner;
    }

    try {

        if (
            process.env.OWNER_NUMBER
        ) {
            cachedOwner =
                extractPureNumber(
                    process.env.OWNER_NUMBER
                );

            if (cachedOwner) {
                return cachedOwner;
            }
        }

        if (
            fs.existsSync(ownerFile)
        ) {

            try {

                const data =
                    JSON.parse(
                        fs.readFileSync(
                            ownerFile,
                            "utf8"
                        )
                    );

                if (data?.owner) {

                    cachedOwner =
                        extractPureNumber(
                            data.owner
                        );

                    if (cachedOwner) {
                        return cachedOwner;
                    }
                }

            } catch {}
        }

    } catch {}

    return "967000000000";
}

// ═══════════════════════════════════════
// 🔍 مطابقة الأرقام
// ═══════════════════════════════════════

function isSameNumber(num1, num2) {

    if (!num1 || !num2) {
        return false;
    }

    const clean1 =
        extractPureNumber(num1);

    const clean2 =
        extractPureNumber(num2);

    if (!clean1 || !clean2) {
        return false;
    }

    return (
        clean1 === clean2 ||
        clean1.endsWith(clean2) ||
        clean2.endsWith(clean1)
    );
}

// ═══════════════════════════════════════
// 🚀 PLUGIN SYSTEM
// ═══════════════════════════════════════

let loadedPluginsCache = null;
let pluginsLoadingPromise = null;

// فهرس سريع للأوامر
let commandIndex = new Map();

const onMessagePlugins = [];

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

                // ═══════════════════════
                // ⚡ بناء فهرس الأوامر
                // ═══════════════════════

                commandIndex =
                    new Map();

                onMessagePlugins.length = 0;

                for (
                    const plugin
                    of loadedPluginsCache
                ) {

                    // onMessage
                    if (
                        typeof plugin?.onMessage ===
                        "function"
                    ) {
                        onMessagePlugins.push(
                            plugin
                        );
                    }

                    // command
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

                        if (!command) {
                            continue;
                        }

                        const key =
                            String(command)
                                .trim()
                                .toLowerCase();

                        if (!key) {
                            continue;
                        }

                        // أول بلجن له الأولوية
                        if (
                            !commandIndex.has(key)
                        ) {
                            commandIndex.set(
                                key,
                                plugin
                            );
                        }
                    }
                }

                return loadedPluginsCache;

            } catch (error) {

                console.error(
                    "Plugin Loader Error:",
                    error?.message ||
                    error
                );

                loadedPluginsCache = [];
                commandIndex = new Map();
                onMessagePlugins.length = 0;

                return [];

            } finally {

                pluginsLoadingPromise =
                    null;
            }

        })();

    return pluginsLoadingPromise;
}

// ═══════════════════════════════════════
// 🧹 إعادة تحميل البلجنات
// ═══════════════════════════════════════

export function clearPluginsCache() {

    loadedPluginsCache = null;
    commandIndex = new Map();
    onMessagePlugins.length = 0;

    console.log(
        `${COLORS.yellow}⚡ تم مسح Cache البلجنات${COLORS.reset}`
    );
}

// ═══════════════════════════════════════
// 🛡️ MESSAGE CACHE
// ═══════════════════════════════════════

const processedMessages =
    new Map();

const MESSAGE_CACHE_TIME =
    30 * 1000;

const MAX_PROCESSED_MESSAGES =
    5000;

function wasProcessed(id) {

    if (!id) {
        return false;
    }

    const now =
        Date.now();

    const old =
        processedMessages.get(id);

    if (
        old &&
        now - old <
        MESSAGE_CACHE_TIME
    ) {
        return true;
    }

    processedMessages.set(
        id,
        now
    );

    if (
        processedMessages.size >
        MAX_PROCESSED_MESSAGES
    ) {

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

            if (
                processedMessages.size <=
                MAX_PROCESSED_MESSAGES * 0.8
            ) {
                break;
            }
        }
    }

    return false;
}

// ═══════════════════════════════════════
// 🚀 HANDLE MESSAGES
// ═══════════════════════════════════════

export async function handleMessages(
    sock,
    m
) {

    try {

        const message =
            m?.messages?.[0];

        if (
            !message
        ) {
            return;
        }

        const messageId =
            message.key?.id;

        if (
            messageId &&
            wasProcessed(messageId)
        ) {
            return;
        }

        // تنفيذ مستقل تمامًا
        executeHandlerLogic(
            sock,
            m
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
    m
) {

    const msg =
        m?.messages?.[0];

    if (
        !msg ||
        !msg.message
    ) {
        return;
    }

    // ═══════════════════════════════
    // 🤖 BOT NUMBER
    // ═══════════════════════════════

    const botJid =
        sock.user?.id;

    const currentBotNumber =
        extractPureNumber(
            botJid
        );

    if (
        currentBotNumber
    ) {
        addEliteAutomatically(
            currentBotNumber
        );
    }

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
        jid.endsWith(
            "@s.whatsapp.net"
        );

    // ═══════════════════════════════
    // 👤 SENDER
    // ═══════════════════════════════

    const sender =
        msg.key?.fromMe
            ? (
                currentBotNumber
                    ? `${currentBotNumber}@s.whatsapp.net`
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
    // 👑 OWNER
    // ═══════════════════════════════

    const ownerNumber =
        getOwner();

    const isOwner =
        isSameNumber(
            number,
            ownerNumber
        );

    // ═══════════════════════════════
    // 👑 ELITE
    // ═══════════════════════════════

    const eliteList =
        await getElite();

    const isEliteUser =
        isOwner ||
        isSameNumber(
            number,
            currentBotNumber
        ) ||
        eliteList.some(
            elite =>
                isSameNumber(
                    number,
                    elite
                )
        );

    // ═══════════════════════════════
    // 📦 PLUGINS
    // ═══════════════════════════════

    const plugins =
        await getLoadedPlugins(
            sock
        );

    if (
        !plugins.length
    ) {
        return;
    }

    // ═══════════════════════════════
    // 📝 TEXT
    // ═══════════════════════════════

    const rawText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message.templateButtonReplyMessage?.selectedId ||
        "";

    const text =
        String(rawText || "").trim();

    // ═══════════════════════════════
    // 🔔 onMessage
    // ═══════════════════════════════

    if (
        onMessagePlugins.length
    ) {

        const messageContext = {
            jid,
            sender,
            number,
            isOwner,
            ownerNumber,
            isGroup,
            isPrivate,
            message: msg,
            isElite: isEliteUser
        };

        // تشغيل مراقبات الرسائل
        // بشكل مستقل بدون انتظارها
        for (
            const plugin
            of onMessagePlugins
        ) {

            try {

                Promise.resolve()
                    .then(() =>
                        plugin.onMessage(
                            sock,
                            msg,
                            messageContext
                        )
                    )
                    .catch(error => {

                        console.error(
                            "Plugin onMessage Error:",
                            error?.message ||
                            error
                        );

                    });

            } catch {}
        }
    }

    // ═══════════════════════════════
    // 🔐 ELITE MODE
    // ═══════════════════════════════

    const mode =
        await getMode();

    if (
        mode?.elite === true &&
        !isOwner &&
        !isSameNumber(
            number,
            currentBotNumber
        ) &&
        !isEliteUser
    ) {
        return;
    }

    // ═══════════════════════════════
    // ❌ لا يوجد نص
    // ═══════════════════════════════

    if (!text) {
        return;
    }

    // ═══════════════════════════════
    // ⚡ PREFIX
    // ═══════════════════════════════

    const hasPrefix =
        /^[./\\#,!^&+=]/.test(
            text
        );

    const noPrefixText =
        text
            .replace(
                /^[./\\#,!^&+=]/,
                ""
            )
            .trim();

    if (!noPrefixText) {
        return;
    }

    // ═══════════════════════════════
    // 📝 COMMAND NAME
    // ═══════════════════════════════

    const commandName =
        noPrefixText
            .split(/\s+/)[0]
            .toLowerCase();

    // ═══════════════════════════════
    // ⚡ O(1) COMMAND SEARCH
    // ═══════════════════════════════

    const cmd =
        commandIndex.get(
            commandName
        );

    if (!cmd) {
        return;
    }

    // ═══════════════════════════════
    // 🔐 NO PREFIX
    // ═══════════════════════════════

    if (
        !hasPrefix &&
        !isEliteUser
    ) {
        return;
    }

    // ═══════════════════════════════
    // ⚡ EXECUTE
    // ═══════════════════════════════

    log(
        "cmd",
        `${commandName} ← ${jid}`
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
                isOwner,
                ownerNumber,
                isGroup,
                isPrivate,
                hasPrefix,
                isElite:
                    isEliteUser
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
