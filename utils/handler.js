import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════
// 📁 FILES
// ═══════════════════════════════════════════════════════

const dataDir = path.join(__dirname, "../data");

const modeFile = path.join(dataDir, "مود.json");
const eliteFile = path.join(dataDir, "النخبة.json");

// الملف الثالث الذي سننشئه لاحقًا
// لن يكون إجباريًا حاليًا
const identityResolverFile = path.join(
    __dirname,
    "identityResolver.js"
);

// ═══════════════════════════════════════════════════════
// ⚡ PERFORMANCE
// ═══════════════════════════════════════════════════════

const MODE_CACHE_TIME = 3000;
const ELITE_CACHE_TIME = 3000;

// المجموعة تتغير أقل من الرسائل
const GROUP_CACHE_TIME = 15000;

// منع التكرار
const MESSAGE_CACHE_TIME = 30000;

// حدود الذاكرة
const MAX_PROCESSED_MESSAGES = 5000;
const MAX_GROUP_CACHE = 500;

// أقل رقم مقبول
const MIN_NUMBER_LENGTH = 5;

// ═══════════════════════════════════════════════════════
// 🎨 COLORS
// ═══════════════════════════════════════════════════════

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    yellow: "\x1b[38;5;226m",
    blue: "\x1b[38;5;39m",
    magenta: "\x1b[38;5;201m"
};

// ═══════════════════════════════════════════════════════
// 📝 LOG
// ═══════════════════════════════════════════════════════

function log(type, text) {
    try {
        const colors = {
            ok: COLORS.green,
            cmd: COLORS.cyan,
            err: COLORS.red,
            elite: COLORS.gold,
            admin: COLORS.blue,
            bot: COLORS.magenta
        };

        const icons = {
            ok: "✅",
            cmd: "⚡",
            err: "❌",
            elite: "👑",
            admin: "🛡️",
            bot: "🤖"
        };

        console.log(
            `${colors[type] || COLORS.cyan}` +
            `[${icons[type] || "•"}] ${text}` +
            COLORS.reset
        );
    } catch {}
}

// ═══════════════════════════════════════════════════════
// 🔢 EXTRACT PURE NUMBER
// ═══════════════════════════════════════════════════════

export function extractPureNumber(value) {
    try {
        if (
            value === undefined ||
            value === null
        ) {
            return "";
        }

        let v = String(value).trim();

        if (!v) return "";

        // 12345:12
        if (v.includes(":")) {
            v = v.split(":")[0];
        }

        // 12345@s.whatsapp.net
        // 12345@lid
        if (v.includes("@")) {
            v = v.split("@")[0];
        }

        // أرقام فقط
        v = v.replace(/\D/g, "");

        return v;
    } catch {
        return "";
    }
}

// ═══════════════════════════════════════════════════════
// 🔢 NORMALIZE NUMBER
// ═══════════════════════════════════════════════════════

function normalizeStoredNumber(value) {
    const number = extractPureNumber(value);

    if (!number) {
        return "";
    }

    // لا نضيف كود دولة
    // لا نغير الرقم
    // فقط نحذف أصفار البداية
    return number.replace(/^0+(?=\d)/, "");
}

// ═══════════════════════════════════════════════════════
// 🆔 RAW ID NORMALIZER
// ═══════════════════════════════════════════════════════

function cleanRawId(value) {
    try {
        if (
            value === undefined ||
            value === null
        ) {
            return "";
        }

        return String(value)
            .trim()
            .toLowerCase();
    } catch {
        return "";
    }
}

// ═══════════════════════════════════════════════════════
// 🔎 SAME NUMBER
// ═══════════════════════════════════════════════════════

function isSameNumber(a, b) {
    const x = normalizeStoredNumber(a);
    const y = normalizeStoredNumber(b);

    if (!x || !y) {
        return false;
    }

    return x === y;
}

// ═══════════════════════════════════════════════════════
// 🤖 BOT IDENTITIES
// ═══════════════════════════════════════════════════════

function getBotIdentities(sock) {
    const result = [];
    const seen = new Set();

    function add(value) {
        if (
            value === undefined ||
            value === null
        ) {
            return;
        }

        const raw = String(value).trim();

        if (!raw) return;

        const key = raw.toLowerCase();

        if (!seen.has(key)) {
            seen.add(key);
            result.push(raw);
        }
    }

    const candidates = [

        // Baileys
        sock?.user?.id,
        sock?.user?.jid,
        sock?.user?.lid,
        sock?.user?.phone,

        // credentials
        sock?.authState?.creds?.me?.id,
        sock?.authState?.creds?.me?.jid,
        sock?.authState?.creds?.me?.lid,
        sock?.authState?.creds?.me?.phone,

        // custom
        sock?.botJid,
        sock?.botLid,
        sock?.botPhone,

        sock?.__botJid,
        sock?.__botLid,
        sock?.__botPhone
    ];

    for (const value of candidates) {
        add(value);

        const number =
            extractPureNumber(value);

        if (
            number &&
            number.length >= MIN_NUMBER_LENGTH
        ) {
            add(number);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════
// 🔎 PARTICIPANT FINDER
// ═══════════════════════════════════════════════════════

function findParticipant(
    participants,
    identities
) {
    if (
        !Array.isArray(participants) ||
        participants.length === 0
    ) {
        return null;
    }

    const ids =
        Array.isArray(identities)
            ? identities
            : [identities];

    // ═══════════════════════════════════════════════
    // 1️⃣ EXACT RAW ID
    // ═══════════════════════════════════════════════

    for (const identity of ids) {
        if (!identity) continue;

        const raw =
            cleanRawId(identity);

        if (!raw) continue;

        for (const p of participants) {
            if (!p) continue;

            if (
                cleanRawId(p.id) === raw ||
                cleanRawId(p.jid) === raw ||
                cleanRawId(p.lid) === raw ||
                cleanRawId(p.phoneNumber) === raw ||
                cleanRawId(p.phone) === raw
            ) {
                return p;
            }
        }
    }

    // ═══════════════════════════════════════════════
    // 2️⃣ NUMBER
    // ═══════════════════════════════════════════════

    for (const identity of ids) {
        const number =
            normalizeStoredNumber(identity);

        if (!number) continue;

        for (const p of participants) {
            if (!p) continue;

            const candidates = [
                p.phoneNumber,
                p.phone,
                p.id,
                p.jid
            ];

            for (const candidate of candidates) {
                if (
                    isSameNumber(
                        number,
                        candidate
                    )
                ) {
                    return p;
                }
            }
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════
// 🤖 RESOLVE BOT PARTICIPANT
// ═══════════════════════════════════════════════════════

function resolveBotParticipant(
    sock,
    metadata
) {
    if (
        !metadata?.participants
    ) {
        return null;
    }

    const identities =
        getBotIdentities(sock);

    if (!identities.length) {
        return null;
    }

    return findParticipant(
        metadata.participants,
        identities
    );
}

// ═══════════════════════════════════════════════════════
// 📱 GET PHONE FROM PARTICIPANT
// ═══════════════════════════════════════════════════════

function getParticipantPhone(participant) {
    if (!participant) {
        return "";
    }

    const candidates = [

        // أهم شيء
        participant.phoneNumber,
        participant.phone,

        // احتياط
        participant.jid,
        participant.id
    ];

    for (const value of candidates) {
        const number =
            normalizeStoredNumber(value);

        if (
            number &&
            number.length >= MIN_NUMBER_LENGTH
        ) {
            return number;
        }
    }

    return "";
}

// ═══════════════════════════════════════════════════════
// 🤖 GET BOT NUMBER
// ═══════════════════════════════════════════════════════

function getBotNumber(
    sock,
    metadata = null
) {
    // أولاً نحاول من participant
    if (metadata) {
        const participant =
            resolveBotParticipant(
                sock,
                metadata
            );

        const phone =
            getParticipantPhone(
                participant
            );

        if (phone) {
            return phone;
        }
    }

    // ثم هويات البوت
    const identities =
        getBotIdentities(sock);

    for (const identity of identities) {
        const number =
            normalizeStoredNumber(
                identity
            );

        if (
            number &&
            number.length >= MIN_NUMBER_LENGTH
        ) {
            return number;
        }
    }

    return "";
}

// ═══════════════════════════════════════════════════════
// 👑 MAIN BOT
// ═══════════════════════════════════════════════════════

let cachedMainBotNumber = "";

function getMainBotNumber(sock) {
    try {
        if (cachedMainBotNumber) {
            return cachedMainBotNumber;
        }

        const candidates = [
            sock?.mainBotNumber,
            sock?.__mainBotNumber,
            process.env.MAIN_BOT_NUMBER,
            sock?.user?.mainBotNumber
        ];

        for (const candidate of candidates) {
            const number =
                normalizeStoredNumber(
                    candidate
                );

            if (
                number &&
                number.length >= MIN_NUMBER_LENGTH
            ) {
                cachedMainBotNumber = number;

                log(
                    "elite",
                    `Main Bot: ${number}`
                );

                return number;
            }
        }
    } catch {}

    return "";
}

// ═══════════════════════════════════════════════════════
// ⚙️ MODE CACHE
// ═══════════════════════════════════════════════════════

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
                await fs.promises.mkdir(
                    dataDir,
                    {
                        recursive: true
                    }
                );

                if (!fs.existsSync(modeFile)) {
                    await fs.promises.writeFile(
                        modeFile,
                        JSON.stringify(
                            {
                                elite: false
                            },
                            null,
                            2
                        ),
                        "utf8"
                    );
                } else {
                    const content =
                        await fs.promises.readFile(
                            modeFile,
                            "utf8"
                        );

                    try {
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
                    } catch {}
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
    const now = Date.now();

    if (
        now - lastModeCheck >=
        MODE_CACHE_TIME
    ) {
        refreshMode().catch(() => {});
    }

    return modeCache;
}

// ═══════════════════════════════════════════════════════
// 👑 ELITE CACHE
// ═══════════════════════════════════════════════════════

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
                await fs.promises.mkdir(
                    dataDir,
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

                    lastEliteCheck =
                        Date.now();

                    return eliteCache;
                }

                const content =
                    await fs.promises.readFile(
                        eliteFile,
                        "utf8"
                    );

                let data;

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
                    for (const item of data) {
                        let values = [];

                        // ═══════════════════════════
                        // نص
                        // ═══════════════════════════

                        if (
                            typeof item ===
                            "string" ||
                            typeof item ===
                            "number"
                        ) {
                            values.push(item);
                        }

                        // ═══════════════════════════
                        // Object
                        // ═══════════════════════════

                        else if (
                            item &&
                            typeof item ===
                            "object"
                        ) {
                            values.push(
                                item.number,
                                item.phone,
                                item.phoneNumber,
                                item.id,
                                item.jid,
                                item.lid
                            );

                            // احتياط لأي مفتاح آخر
                            values.push(
                                ...Object.values(
                                    item
                                )
                            );
                        }

                        for (
                            const value
                            of values
                        ) {
                            const number =
                                normalizeStoredNumber(
                                    value
                                );

                            if (
                                number &&
                                number.length >=
                                MIN_NUMBER_LENGTH &&
                                !set.has(number)
                            ) {
                                set.add(number);
                                result.push(number);
                            }
                        }
                    }
                }

                eliteCache = result;
                eliteSet = set;

                lastEliteCheck =
                    Date.now();

                log(
                    "elite",
                    `Elite Loaded: ${result.length}`
                );

                return eliteCache;
            } catch (error) {
                console.error(
                    "Elite Error:",
                    error?.message ||
                    error
                );

                return eliteCache;
            } finally {
                eliteLoading = null;
            }
        })();

    return eliteLoading;
}

function getEliteFast() {
    const now = Date.now();

    if (
        !lastEliteCheck ||
        now - lastEliteCheck >=
        ELITE_CACHE_TIME
    ) {
        refreshElite().catch(() => {});
    }

    return eliteCache;
}

// ═══════════════════════════════════════════════════════
// 👑 ELITE CHECK
// ═══════════════════════════════════════════════════════

function checkElite(value) {
    const number =
        normalizeStoredNumber(value);

    if (!number) {
        return false;
    }

    return eliteSet.has(number);
}

function checkEliteIdentities(values) {
    if (!Array.isArray(values)) {
        values = [values];
    }

    for (const value of values) {
        if (checkElite(value)) {
            return true;
        }
    }

    return false;
}

// ═══════════════════════════════════════════════════════
// 🛡️ GROUP CACHE
// ═══════════════════════════════════════════════════════

const groupCache = new Map();
const groupLoading = new Map();

async function getGroupMetadata(
    sock,
    jid,
    force = false
) {
    if (
        !jid ||
        !jid.endsWith("@g.us")
    ) {
        return null;
    }

    const now = Date.now();

    const cached =
        groupCache.get(jid);

    if (
        !force &&
        cached &&
        now - cached.time <
        GROUP_CACHE_TIME
    ) {
        return cached.data;
    }

    const pending =
        groupLoading.get(jid);

    if (pending) {
        return pending;
    }

    const promise =
        (async () => {
            try {
                const metadata =
                    await sock.groupMetadata(
                        jid
                    );

                if (metadata) {
                    groupCache.set(
                        jid,
                        {
                            data: metadata,
                            time: Date.now()
                        }
                    );

                    if (
                        groupCache.size >
                        MAX_GROUP_CACHE
                    ) {
                        const first =
                            groupCache
                                .keys()
                                .next()
                                .value;

                        if (first) {
                            groupCache.delete(
                                first
                            );
                        }
                    }
                }

                return metadata || null;
            } catch {
                return cached?.data || null;
            } finally {
                groupLoading.delete(jid);
            }
        })();

    groupLoading.set(
        jid,
        promise
    );

    return promise;
}

// ═══════════════════════════════════════════════════════
// 👤 RESOLVE SENDER
// ═══════════════════════════════════════════════════════

function resolveSender(
    sock,
    msg,
    isGroup,
    metadata
) {
    let rawSender = "";

    if (msg?.key?.fromMe) {
        rawSender =
            sock?.user?.id ||
            sock?.user?.jid ||
            sock?.user?.lid ||
            "";
    } else if (isGroup) {
        rawSender =
            msg?.key?.participant ||
            msg?.participant ||
            "";
    } else {
        rawSender =
            msg?.key?.remoteJid ||
            "";
    }

    let number =
        normalizeStoredNumber(
            rawSender
        );

    // ═══════════════════════════════════
    // LID → PARTICIPANT → PHONE
    // ═══════════════════════════════════

    if (
        isGroup &&
        metadata?.participants &&
        rawSender
    ) {
        const participant =
            findParticipant(
                metadata.participants,
                [rawSender]
            );

        if (participant) {
            const resolved =
                getParticipantPhone(
                    participant
                );

            if (resolved) {
                number = resolved;
            }
        }
    }

    return {
        sender: rawSender,
        number
    };
}

// ═══════════════════════════════════════════════════════
// 🧹 CLEAR GROUP CACHE
// ═══════════════════════════════════════════════════════

export function clearGroupMetadataCache(
    jid = null
) {
    try {
        if (jid) {
            groupCache.delete(jid);
            groupLoading.delete(jid);
        } else {
            groupCache.clear();
            groupLoading.clear();
        }
    } catch {}
}

// ═══════════════════════════════════════════════════════
// 🚀 PLUGINS
// ═══════════════════════════════════════════════════════

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

                commandIndex = new Map();
                onMessagePlugins = [];

                for (
                    const plugin
                    of loadedPluginsCache
                ) {
                    if (
                        typeof plugin?.onMessage ===
                        "function"
                    ) {
                        onMessagePlugins.push(
                            plugin
                        );
                    }

                    if (!plugin?.command) {
                        continue;
                    }

                    const commands =
                        Array.isArray(
                            plugin.command
                        )
                            ? plugin.command
                            : [plugin.command];

                    for (
                        const command
                        of commands
                    ) {
                        if (
                            command ===
                            undefined ||
                            command === null
                        ) {
                            continue;
                        }

                        const key =
                            String(command)
                                .trim()
                                .toLowerCase();

                        if (!key) continue;

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

// ═══════════════════════════════════════════════════════
// 🧹 CLEAR PLUGINS
// ═══════════════════════════════════════════════════════

export function clearPluginsCache() {
    loadedPluginsCache = null;
    commandIndex = new Map();
    onMessagePlugins = [];

    console.log(
        `${COLORS.yellow}` +
        `⚡ Plugin Cache Cleared` +
        `${COLORS.reset}`
    );
}

// ═══════════════════════════════════════════════════════
// 🛡️ MESSAGE CACHE
// ═══════════════════════════════════════════════════════

const processedMessages = new Map();

function wasProcessed(
    id,
    sock
) {
    if (!id) {
        return false;
    }

    const now = Date.now();

    const session =
        String(
            sock?.user?.id ||
            sock?.user?.lid ||
            "unknown"
        );

    const key =
        `${session}:${id}`;

    const old =
        processedMessages.get(key);

    if (
        old &&
        now - old <
        MESSAGE_CACHE_TIME
    ) {
        return true;
    }

    processedMessages.set(
        key,
        now
    );

    if (
        processedMessages.size >
        MAX_PROCESSED_MESSAGES
    ) {
        for (
            const [
                cacheKey,
                time
            ]
            of processedMessages
        ) {
            if (
                now - time >
                MESSAGE_CACHE_TIME
            ) {
                processedMessages.delete(
                    cacheKey
                );
            }
        }
    }

    return false;
}

// ═══════════════════════════════════════════════════════
// 📋 INTERACTIVE
// ═══════════════════════════════════════════════════════

function extractInteractiveResponseId(msg) {
    try {
        const message =
            msg?.message;

        if (!message) {
            return "";
        }

        const listId =
            message
                ?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId;

        if (listId) {
            return String(
                listId
            ).trim();
        }

        const buttonId =
            message
                ?.buttonsResponseMessage
                ?.selectedButtonId;

        if (buttonId) {
            return String(
                buttonId
            ).trim();
        }

        const templateId =
            message
                ?.templateButtonReplyMessage
                ?.selectedId;

        if (templateId) {
            return String(
                templateId
            ).trim();
        }

        const interactive =
            message
                ?.interactiveResponseMessage;

        const native =
            interactive
                ?.nativeFlowResponseMessage;

        const direct =
            message
                ?.nativeFlowResponseMessage;

        const flow =
            native || direct;

        if (flow?.paramsJson) {
            const params =
                flow.paramsJson;

            try {
                const parsed =
                    typeof params ===
                    "string"
                        ? JSON.parse(
                            params
                        )
                        : params;

                if (parsed?.id) {
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

                if (
                    parsed?.command
                ) {
                    return String(
                        parsed.command
                    ).trim();
                }
            } catch {
                const match =
                    String(
                        params
                    ).match(
                        /"(?:id|selectedRowId|selectedId|command)"\s*:\s*"([^"]+)"/
                    );

                if (match?.[1]) {
                    return match[1].trim();
                }
            }
        }
    } catch {}

    return "";
}

// ═══════════════════════════════════════════════════════
// 🧹 MENU NORMALIZER
// ═══════════════════════════════════════════════════════

function normalizeMenuCommand(id) {
    if (!id) {
        return "";
    }

    let value =
        String(id).trim();

    if (!value) {
        return "";
    }

    const lower =
        value.toLowerCase();

    if (
        lower.startsWith(
            "cmd:"
        )
    ) {
        value =
            value.slice(4).trim();
    } else if (
        lower.startsWith(
            "command:"
        )
    ) {
        value =
            value.slice(8).trim();
    }

    return value
        .replace(
            /^[./\\#,!^&+=]+/,
            ""
        )
        .trim();
}

// ═══════════════════════════════════════════════════════
// 🚀 ENTRY
// ═══════════════════════════════════════════════════════

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

        const id =
            msg.key?.id;

        if (
            id &&
            wasProcessed(
                id,
                sock
            )
        ) {
            return;
        }

        await executeHandlerLogic(
            sock,
            msg
        );
    } catch (error) {
        console.error(
            "handleMessages Error:",
            error?.message ||
            error
        );
    }
}

// ═══════════════════════════════════════════════════════
// ⚡ MAIN HANDLER
// ═══════════════════════════════════════════════════════

async function executeHandlerLogic(
    sock,
    msg
) {
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

    // ═══════════════════════════════════
    // GROUP METADATA
    // ═══════════════════════════════════

    let metadata = null;

    if (isGroup) {
        metadata =
            await getGroupMetadata(
                sock,
                jid
            );
    }

    // ═══════════════════════════════════
    // BOT IDENTITIES
    // ═══════════════════════════════════

    const botIdentities =
        getBotIdentities(sock);

    const botNumber =
        getBotNumber(
            sock,
            metadata
        );

    // ═══════════════════════════════════
    // BOT PARTICIPANT
    // ═══════════════════════════════════

    const botParticipant =
        isGroup
            ? resolveBotParticipant(
                sock,
                metadata
            )
            : null;

    const participantPhone =
        getParticipantPhone(
            botParticipant
        );

    // ═══════════════════════════════════
    // MAIN BOT
    // ═══════════════════════════════════

    const mainNumber =
        getMainBotNumber(sock);

    const isMainBot =
        !!(
            mainNumber &&
            (
                isSameNumber(
                    botNumber,
                    mainNumber
                ) ||

                isSameNumber(
                    participantPhone,
                    mainNumber
                ) ||

                botIdentities.some(
                    identity =>
                        isSameNumber(
                            identity,
                            mainNumber
                        )
                )
            )
        );

    // ═══════════════════════════════════
    // SENDER
    // ═══════════════════════════════════

    const resolvedSender =
        resolveSender(
            sock,
            msg,
            isGroup,
            metadata
        );

    const sender =
        resolvedSender.sender;

    const number =
        resolvedSender.number;

    // ═══════════════════════════════════
    // 👑 ELITE
    // ═══════════════════════════════════

    let isEliteUser =
        checkEliteIdentities([
            number,
            sender
        ]);

    // ═══════════════════════════════════
    // BOT IS ELITE
    // ═══════════════════════════════════

    if (!isEliteUser) {
        isEliteUser =
            checkEliteIdentities([
                botNumber,
                participantPhone,
                ...botIdentities
            ]);
    }

    // ═══════════════════════════════════
    // MAIN BOT ALWAYS ELITE
    // ═══════════════════════════════════

    if (
        !isEliteUser &&
        isMainBot
    ) {
        isEliteUser = true;
    }

    // ═══════════════════════════════════
    // DEBUG
    // ═══════════════════════════════════

    if (
        isGroup &&
        botParticipant
    ) {
        log(
            "bot",
            `BOT → ${
                botNumber ||
                "UNKNOWN"
            } | PARTICIPANT → ${
                participantPhone ||
                botParticipant.id ||
                "UNKNOWN"
            } | ELITE → ${
                isEliteUser
                    ? "YES"
                    : "NO"
            }`
        );
    }

    // ═══════════════════════════════════
    // BOT ADMIN
    // ═══════════════════════════════════

    let botAdminData = {
        isAdmin: false,
        isSuperAdmin: false,
        participant:
            botParticipant,
        metadata
    };

    if (isGroup) {
        // نبحث مرة ثانية باستخدام كل الهويات
        const adminParticipant =
            resolveBotParticipant(
                sock,
                metadata
            );

        if (adminParticipant) {
            botAdminData.participant =
                adminParticipant;

            const admin =
                adminParticipant.admin;

            botAdminData.isSuperAdmin =
                admin ===
                "superadmin";

            botAdminData.isAdmin =
                admin === "admin" ||
                botAdminData.isSuperAdmin;
        }
    }

    const botIsAdmin =
        botAdminData.isAdmin === true;

    const botIsSuperAdmin =
        botAdminData.isSuperAdmin === true;

    // ═══════════════════════════════════
    // PLUGINS
    // ═══════════════════════════════════

    const plugins =
        await getLoadedPlugins(sock);

    if (!plugins.length) {
        return;
    }

    // ═══════════════════════════════════
    // TEXT
    // ═══════════════════════════════════

    const normalText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "";

    const interactiveId =
        extractInteractiveResponseId(
            msg
        );

    const fromInteractive =
        !!interactiveId;

    const text =
        String(
            interactiveId ||
            normalText ||
            ""
        ).trim();

    // ═══════════════════════════════════
    // ON MESSAGE
    // ═══════════════════════════════════

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
                interactiveId ||
                null,

            isListResponse:
                fromInteractive,

            // ADMIN
            isAdmin:
                botIsAdmin,

            isSuperAdmin:
                botIsSuperAdmin,

            adminMode:
                botIsAdmin,

            botIsAdmin,

            botIsSuperAdmin,

            botParticipant:
                botAdminData.participant ||
                null,

            groupMetadata:
                metadata ||
                null
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
                ).catch(
                    error => {
                        console.error(
                            "onMessage Error:",
                            error?.message ||
                            error
                        );
                    }
                );
            } catch {}
        }
    }

    // ═══════════════════════════════════
    // ELITE MODE
    // ═══════════════════════════════════

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

    // ═══════════════════════════════════
    // PREFIX
    // ═══════════════════════════════════

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

    if (fromInteractive) {
        noPrefixText =
            normalizeMenuCommand(
                noPrefixText
            );
    }

    if (!noPrefixText) {
        return;
    }

    // ═══════════════════════════════════
    // COMMAND
    // ═══════════════════════════════════

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
        ).toLowerCase();

    if (!commandName) {
        return;
    }

    const cmd =
        commandIndex.get(
            commandName
        );

    if (!cmd) {
        return;
    }

    // ═══════════════════════════════════
    // NO PREFIX
    // ═══════════════════════════════════

    if (
        !hasPrefix &&
        !isEliteUser &&
        !fromInteractive
    ) {
        return;
    }

    // ═══════════════════════════════════
    // EXECUTE
    // ═══════════════════════════════════

    log(
        "cmd",
        `${commandName} ← ${
            number ||
            sender ||
            "UNKNOWN"
        } ← ${
            isEliteUser
                ? "ELITE"
                : botIsAdmin
                    ? "BOT ADMIN"
                    : "USER"
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

                // Interactive
                isInteractive:
                    fromInteractive,

                interactiveId:
                    interactiveId ||
                    null,

                isListResponse:
                    fromInteractive,

                // Admin
                isAdmin:
                    botIsAdmin,

                isSuperAdmin:
                    botIsSuperAdmin,

                adminMode:
                    botIsAdmin,

                botIsAdmin,

                botIsSuperAdmin,

                botParticipant:
                    botAdminData.participant ||
                    null,

                groupMetadata:
                    metadata ||
                    null
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

// ═══════════════════════════════════════════════════════
// 🚀 WARMUP
// ═══════════════════════════════════════════════════════

export async function warmupHandler(sock) {
    try {

        // تحميل الأشياء الثقيلة مرة واحدة
        await Promise.all([
            refreshMode(),
            refreshElite(),
            getLoadedPlugins(sock)
        ]);

        const botNumber =
            getBotNumber(sock);

        const identities =
            getBotIdentities(sock);

        log(
            "ok",
            `Handler Ready | Bot: ${
                botNumber ||
                "UNKNOWN"
            }`
        );

        log(
            "bot",
            `Identities: ${
                identities.join(
                    " | "
                ) ||
                "NONE"
            }`
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
