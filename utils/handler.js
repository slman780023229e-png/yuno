import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════
// 📁 FILES
// ═══════════════════════════════════════

const modeFile = path.join(__dirname, "../data/مود.json");
const eliteFile = path.join(__dirname, "../data/النخبة.json");
const ownerFile = path.join(__dirname, "../data/owner.json");

// ═══════════════════════════════════════
// ⚙️ SETTINGS
// ═══════════════════════════════════════

const MODE_CACHE_TIME = 5000;
const ELITE_CACHE_TIME = 10000;

const MESSAGE_CACHE_TIME = 30000;
const MAX_PROCESSED_MESSAGES = 5000;

const DEFAULT_COUNTRY_CODE = "967";

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
// 🔢 NUMBER NORMALIZATION
// ═══════════════════════════════════════

/*
 * مهم جدًا:
 *
 * Baileys قد يعيد:
 *
 * 967xxxxxxxxx@s.whatsapp.net
 *
 * أو:
 *
 * 967xxxxxxxxx:12@s.whatsapp.net
 *
 * أو صيغ أخرى تحتوي على device.
 *
 * هنا نستخرج الرقم الحقيقي فقط.
 *
 * ❗ لا نضيف 967 تلقائيًا للأرقام.
 * لأن الرقم يجب أن يبقى كما جاء من WhatsApp.
 */

export function extractPureNumber(jid) {

    try {

        if (
            jid === undefined ||
            jid === null
        ) {
            return "";
        }

        let value = String(jid).trim();

        if (!value) {
            return "";
        }

        // إزالة @lid / @s.whatsapp.net / @g.us وغيرها
        value = value.split("@")[0];

        // إزالة device id
        // مثال:
        // 967777777777:12
        value = value.split(":")[0];

        // إزالة أي رموز غير رقمية
        value = value.replace(/\D/g, "");

        return value;

    } catch {

        return "";
    }
}

// ═══════════════════════════════════════
// 🔢 SESSION NUMBER
// ═══════════════════════════════════════

function extractSessionNumber(sock) {

    try {

        const id =
            sock?.user?.id ||
            sock?.user?.jid ||
            "";

        if (!id) {
            return "";
        }

        const number =
            extractPureNumber(id);

        if (!number) {
            return "";
        }

        return number;

    } catch {

        return "";
    }
}

// ═══════════════════════════════════════
// 🔢 COMPARE NUMBERS
// ═══════════════════════════════════════

function isSameNumber(a, b) {

    const x =
        extractPureNumber(a);

    const y =
        extractPureNumber(b);

    if (!x || !y) {
        return false;
    }

    return x === y;
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

    modeLoading = (async () => {

        try {

            await fs.promises.mkdir(
                path.dirname(modeFile),
                {
                    recursive: true
                }
            );

            if (!fs.existsSync(modeFile)) {

                const initial = {
                    elite: false
                };

                await fs.promises.writeFile(
                    modeFile,
                    JSON.stringify(
                        initial,
                        null,
                        2
                    ),
                    "utf8"
                );

                modeCache = initial;

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

            lastModeCheck = Date.now();

            return modeCache;

        } catch (error) {

            console.error(
                "Mode Load Error:",
                error?.message || error
            );

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
// 👑 ELITE CACHE
// ═══════════════════════════════════════

let eliteCache = [];
let eliteSet = new Set();

let lastEliteCheck = 0;
let eliteLoading = null;

async function refreshElite() {

    if (eliteLoading) {
        return eliteLoading;
    }

    eliteLoading = (async () => {

        try {

            await fs.promises.mkdir(
                path.dirname(eliteFile),
                {
                    recursive: true
                }
            );

            if (!fs.existsSync(eliteFile)) {

                await fs.promises.writeFile(
                    eliteFile,
                    "[]",
                    "utf8"
                );

                eliteCache = [];
                eliteSet = new Set();

            } else {

                const content =
                    await fs.promises.readFile(
                        eliteFile,
                        "utf8"
                    );

                let data = [];

                try {

                    data =
                        JSON.parse(
                            content || "[]"
                        );

                } catch {

                    data = [];
                }

                const result = [];
                const set = new Set();

                if (Array.isArray(data)) {

                    for (
                        const item
                        of data
                    ) {

                        let value = item;

                        if (
                            typeof item === "object" &&
                            item !== null
                        ) {

                            value =
                                item.number ??
                                item.id ??
                                Object.values(item)[0];
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
                            result.push(number);
                        }
                    }
                }

                eliteCache = result;
                eliteSet = set;
            }

            lastEliteCheck =
                Date.now();

            return eliteCache;

        } catch (error) {

            console.error(
                "Elite Load Error:",
                error?.message || error
            );

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
// 👑 SESSION ELITE
// ═══════════════════════════════════════

let sessionEliteNumber = "";

let eliteWritePromise =
    Promise.resolve();

async function addEliteAutomatically(
    sock
) {

    try {

        const clean =
            extractSessionNumber(sock);

        if (
            !clean ||
            clean.length < 5
        ) {
            return false;
        }

        /*
         * إذا كان نفس رقم الجلسة
         * فلا نعيد العملية.
         */
        if (
            sessionEliteNumber === clean &&
            eliteSet.has(clean)
        ) {
            return true;
        }

        sessionEliteNumber =
            clean;

        eliteWritePromise =
            eliteWritePromise.then(
                async () => {

                    try {

                        /*
                         * تأكد أن آخر نسخة
                         * من النخبة موجودة.
                         */
                        if (
                            Date.now() -
                            lastEliteCheck >=
                            ELITE_CACHE_TIME
                        ) {

                            await refreshElite();
                        }

                        /*
                         * الرقم موجود بالفعل.
                         */
                        if (
                            eliteSet.has(clean)
                        ) {

                            log(
                                "elite",
                                `رقم الجلسة موجود في النخبة: ${clean}`
                            );

                            return;
                        }

                        const unique =
                            Array.from(
                                new Set([
                                    ...eliteCache,
                                    clean
                                ])
                            );

                        const tempFile =
                            `${eliteFile}.tmp`;

                        await fs.promises.mkdir(
                            path.dirname(eliteFile),
                            {
                                recursive: true
                            }
                        );

                        await fs.promises.writeFile(
                            tempFile,
                            JSON.stringify(
                                unique,
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
                            unique;

                        eliteSet =
                            new Set(unique);

                        lastEliteCheck =
                            Date.now();

                        log(
                            "elite",
                            `تمت إضافة رقم الجلسة إلى النخبة: ${clean}`
                        );

                    } catch (error) {

                        console.error(
                            "Elite Write Error:",
                            error?.message ||
                            error
                        );
                    }
                }
            );

        await eliteWritePromise;

        return true;

    } catch (error) {

        console.error(
            "Session Elite Error:",
            error?.message ||
            error
        );

        return false;
    }
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

            const owner =
                extractPureNumber(
                    process.env.OWNER_NUMBER
                );

            if (owner) {

                cachedOwner =
                    owner;

                return cachedOwner;
            }
        }

        if (
            fs.existsSync(ownerFile)
        ) {

            const data =
                JSON.parse(
                    fs.readFileSync(
                        ownerFile,
                        "utf8"
                    )
                );

            if (data?.owner) {

                const owner =
                    extractPureNumber(
                        data.owner
                    );

                if (owner) {

                    cachedOwner =
                        owner;

                    return cachedOwner;
                }
            }
        }

    } catch {}

    /*
     * احتياط فقط.
     * الأفضل وضع OWNER_NUMBER
     * في environment.
     */
    return "967000000000";
}

// ═══════════════════════════════════════
// 🚀 PLUGINS
// ═══════════════════════════════════════

let loadedPluginsCache = null;
let pluginsLoadingPromise = null;

let commandIndex =
    new Map();

let onMessagePlugins = [];

// ═══════════════════════════════════════
// 📦 LOAD PLUGINS
// ═══════════════════════════════════════

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

                        /*
                         * أول Plugin يأخذ الأمر.
                         */
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
                    `Loaded ${loadedPluginsCache.length} plugins | ${commandIndex.size} commands | ${onMessagePlugins.length} listeners`
                );

                return loadedPluginsCache;

            } catch (error) {

                console.error(
                    "Plugin Loader Error:",
                    error?.message ||
                    error
                );

                loadedPluginsCache =
                    [];

                commandIndex =
                    new Map();

                onMessagePlugins =
                    [];

                return [];

            } finally {

                pluginsLoadingPromise =
                    null;
            }

        })();

    return pluginsLoadingPromise;
}

// ═══════════════════════════════════════
// 🧹 CLEAR PLUGINS CACHE
// ═══════════════════════════════════════

export function clearPluginsCache() {

    loadedPluginsCache =
        null;

    commandIndex =
        new Map();

    onMessagePlugins =
        [];

    console.log(
        `${COLORS.yellow}⚡ Plugin Cache Cleared${COLORS.reset}`
    );
}

// ═══════════════════════════════════════
// 🛡️ MESSAGE CACHE
// ═══════════════════════════════════════

const processedMessages =
    new Map();

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
                messageId
            )
        ) {

            return;
        }

        /*
         * لا Queue.
         * لا await.
         *
         * كل رسالة تبدأ فورًا.
         */
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
    // 🤖 BOT NUMBER
    // ═══════════════════════════════

    const botNumber =
        extractSessionNumber(
            sock
        );

    /*
     * إضافة رقم الجلسة للنخبة.
     *
     * لا نضيف 967 من عندنا.
     * نأخذ الرقم الحقيقي من sock.user.id.
     */
    if (
        botNumber &&
        botNumber.length >= 5
    ) {

        /*
         * لا تنتظر الكتابة.
         * حتى لا تؤثر على سرعة الرسالة.
         */
        if (
            sessionEliteNumber !==
            botNumber ||
            !eliteSet.has(botNumber)
        ) {

            addEliteAutomatically(
                sock
            ).catch(() => {});
        }
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

    /*
     * رقم البوت دائمًا Elite.
     */
    let isEliteUser =
        isOwner ||
        isSameNumber(
            number,
            botNumber
        );

    /*
     * Set = O(1)
     */
    if (
        !isEliteUser &&
        number
    ) {

        isEliteUser =
            eliteSet.has(
                number
            );
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

    const rawText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message.templateButtonReplyMessage?.selectedId ||
        "";

    const text =
        String(
            rawText || ""
        ).trim();

    // ═══════════════════════════════
    // 🧠 CONTEXT
    // ═══════════════════════════════

    const context = {
        jid,
        sender,
        number,
        isOwner,
        ownerNumber,
        isGroup,
        isPrivate,
        message: msg,
        isElite: isEliteUser,
        botNumber
    };

    // ═══════════════════════════════
    // 🔔 TURBO LISTENERS
    // ═══════════════════════════════

    if (
        onMessagePlugins.length
    ) {

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
        !isOwner &&
        !isSameNumber(
            number,
            botNumber
        ) &&
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

    const hasPrefix =
        /^[./\\#,!^&+=]/.test(
            text
        );

    const noPrefixText =
        hasPrefix
            ? text.slice(1).trim()
            : text;

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
        return;
    }

    // ═══════════════════════════════
    // 🔐 PREFIX CHECK
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
                    isEliteUser,
                botNumber
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
// 🚀 OPTIONAL WARMUP
// ═══════════════════════════════════════

/*
 * هذه الدالة تستطيع استدعاءها بعد
 * إنشاء sock مباشرة.
 *
 * مثال:
 *
 * await warmupHandler(sock);
 *
 * فائدتها:
 * - تحميل Plugins قبل أول رسالة
 * - تحميل المود
 * - تحميل النخبة
 * - إضافة رقم الجلسة للنخبة
 *
 * وبالتالي أول رسالة لا تتحمل
 * تكلفة التحميل.
 */

export async function warmupHandler(
    sock
) {

    try {

        await Promise.all([
            refreshMode(),
            refreshElite(),
            getLoadedPlugins(sock)
        ]);

        /*
         * رقم الجلسة يُضاف للنخبة
         * بعد معرفة sock.user.id.
         */
        if (
            sock?.user?.id
        ) {

            await addEliteAutomatically(
                sock
            );
        }

        log(
            "ok",
            "Handler Warmup Completed"
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
