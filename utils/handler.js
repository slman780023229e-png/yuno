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

// ═══════════════════════════════════════════════════════
// ⚡ PERFORMANCE CONFIG
// ═══════════════════════════════════════════════════════

const GROUP_CACHE_TIME = 30_000;
const FILE_CHECK_TIME = 30_000;

const MESSAGE_CACHE_TIME = 30_000;
const MAX_PROCESSED_MESSAGES = 5000;

const MAX_GROUP_CACHE = 500;

// ═══════════════════════════════════════════════════════
// 🎨 COLORS
// ═══════════════════════════════════════════════════════

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    blue: "\x1b[38;5;39m",
    magenta: "\x1b[38;5;201m"
};

// ═══════════════════════════════════════════════════════
// 📝 LOGGER
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
// 🔢 NUMBER
// ═══════════════════════════════════════════════════════

export function extractPureNumber(value) {
    try {
        if (value === undefined || value === null) {
            return "";
        }

        let v = String(value).trim();

        if (!v) return "";

        const colon = v.indexOf(":");

        if (colon !== -1) {
            v = v.slice(0, colon);
        }

        const at = v.indexOf("@");

        if (at !== -1) {
            v = v.slice(0, at);
        }

        return v.replace(/\D/g, "");
    } catch {
        return "";
    }
}

function normalizeStoredNumber(value) {
    const number = extractPureNumber(value);

    if (!number) return "";

    return number.replace(/^0+(?=\d)/, "");
}

function cleanRawId(value) {
    try {
        if (value === undefined || value === null) {
            return "";
        }

        return String(value).trim().toLowerCase();
    } catch {
        return "";
    }
}

function isSameNumber(a, b) {
    const x = normalizeStoredNumber(a);
    const y = normalizeStoredNumber(b);

    return !!x && !!y && x === y;
}

// ═══════════════════════════════════════════════════════
// 🤖 BOT IDENTITIES
// ═══════════════════════════════════════════════════════

function getBotIdentities(sock) {
    const result = [];
    const seen = new Set();

    const add = value => {
        if (
            value === undefined ||
            value === null
        ) {
            return;
        }

        const raw = String(value).trim();

        if (!raw) return;

        const key = raw.toLowerCase();

        if (seen.has(key)) return;

        seen.add(key);
        result.push(raw);
    };

    const candidates = [
        sock?.user?.id,
        sock?.user?.jid,
        sock?.user?.lid,
        sock?.user?.phone,

        sock?.authState?.creds?.me?.id,
        sock?.authState?.creds?.me?.jid,
        sock?.authState?.creds?.me?.lid,
        sock?.authState?.creds?.me?.phone,

        sock?.botJid,
        sock?.botLid,
        sock?.botPhone,

        sock?.__botJid,
        sock?.__botLid,
        sock?.__botPhone
    ];

    for (const candidate of candidates) {
        add(candidate);

        const number = extractPureNumber(candidate);

        if (number) {
            add(number);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════
// 👤 PARTICIPANT
// ═══════════════════════════════════════════════════════

function findParticipant(participants, identities) {
    if (
        !Array.isArray(participants) ||
        !participants.length
    ) {
        return null;
    }

    const ids = Array.isArray(identities)
        ? identities
        : [identities];

    for (const identity of ids) {
        if (!identity) continue;

        const raw = cleanRawId(identity);

        if (!raw) continue;

        for (const p of participants) {
            if (!p) continue;

            if (
                cleanRawId(p.id) === raw ||
                cleanRawId(p.jid) === raw ||
                cleanRawId(p.lid) === raw ||
                cleanRawId(p.phone) === raw ||
                cleanRawId(p.phoneNumber) === raw
            ) {
                return p;
            }
        }
    }

    for (const identity of ids) {
        const number =
            normalizeStoredNumber(identity);

        if (!number) continue;

        for (const p of participants) {
            if (!p) continue;

            if (
                isSameNumber(number, p.phoneNumber) ||
                isSameNumber(number, p.phone) ||
                isSameNumber(number, p.id) ||
                isSameNumber(number, p.jid) ||
                isSameNumber(number, p.lid)
            ) {
                return p;
            }
        }
    }

    return null;
}

function resolveBotParticipant(sock, metadata) {
    if (!metadata?.participants) {
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

function getParticipantPhone(participant) {
    if (!participant) return "";

    const candidates = [
        participant.phoneNumber,
        participant.phone,
        participant.jid,
        participant.id,
        participant.lid
    ];

    for (const candidate of candidates) {
        const number =
            normalizeStoredNumber(candidate);

        if (number) {
            return number;
        }
    }

    return "";
}

function getBotNumber(sock, metadata = null) {
    if (metadata) {
        const participant =
            resolveBotParticipant(
                sock,
                metadata
            );

        const number =
            getParticipantPhone(
                participant
            );

        if (number) {
            return number;
        }
    }

    const identities =
        getBotIdentities(sock);

    for (const identity of identities) {
        const number =
            normalizeStoredNumber(identity);

        if (number) {
            return number;
        }
    }

    return "";
}

// ═══════════════════════════════════════════════════════
// 👑 MAIN BOT
// ═══════════════════════════════════════════════════════

const mainBotCache = new WeakMap();

function getMainBotNumber(sock) {
    if (!sock) return "";

    try {
        const cached =
            mainBotCache.get(sock);

        if (cached) {
            return cached;
        }

        const candidates = [
            sock?.mainBotNumber,
            sock?.__mainBotNumber,
            process.env.MAIN_BOT_NUMBER,
            sock?.user?.mainBotNumber
        ];

        for (const candidate of candidates) {
            const number =
                normalizeStoredNumber(candidate);

            if (number) {
                mainBotCache.set(
                    sock,
                    number
                );

                return number;
            }
        }
    } catch {}

    return "";
}

// ═══════════════════════════════════════════════════════
// 📦 MODE / ELITE CACHE
// ═══════════════════════════════════════════════════════

let modeCache = {
    elite: false
};

let eliteCache = [];
let eliteSet = new Set();

let modeReady = false;
let eliteReady = false;

let modeMtime = 0;
let eliteMtime = 0;

let modeLoading = null;
let eliteLoading = null;

let dataDirReady = false;
let dataDirPromise = null;

let lastFileCheck = 0;

// ═══════════════════════════════════════════════════════
// 📁 DATA DIRECTORY
// ═══════════════════════════════════════════════════════

async function ensureDataDir() {
    if (dataDirReady) {
        return;
    }

    if (!dataDirPromise) {
        dataDirPromise =
            fs.promises
                .mkdir(dataDir, {
                    recursive: true
                })
                .then(() => {
                    dataDirReady = true;
                })
                .catch(() => {})
                .finally(() => {
                    dataDirPromise = null;
                });
    }

    await dataDirPromise;
}

// ═══════════════════════════════════════════════════════
// ⚙️ MODE
// ═══════════════════════════════════════════════════════

async function refreshMode(force = false) {
    if (
        modeLoading &&
        !force
    ) {
        return modeLoading;
    }

    modeLoading =
        (async () => {
            try {
                await ensureDataDir();

                let stat;

                try {
                    stat =
                        await fs.promises.stat(
                            modeFile
                        );
                } catch {
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

                    stat =
                        await fs.promises.stat(
                            modeFile
                        );
                }

                const mtime =
                    stat.mtimeMs;

                if (
                    !force &&
                    modeReady &&
                    mtime === modeMtime
                ) {
                    return;
                }

                const content =
                    await fs.promises.readFile(
                        modeFile,
                        "utf8"
                    );

                let parsed = {};

                try {
                    parsed =
                        JSON.parse(
                            content || "{}"
                        );
                } catch {
                    parsed = {};
                }

                if (
                    parsed &&
                    typeof parsed ===
                        "object"
                ) {
                    modeCache = {
                        ...modeCache,
                        ...parsed
                    };
                }

                modeMtime = mtime;
                modeReady = true;

            } catch {}
        })();

    try {
        await modeLoading;
    } finally {
        modeLoading = null;
    }
}

// ═══════════════════════════════════════════════════════
// 👑 ELITE
// ═══════════════════════════════════════════════════════

async function refreshElite(force = false) {
    if (
        eliteLoading &&
        !force
    ) {
        return eliteLoading;
    }

    eliteLoading =
        (async () => {
            try {
                await ensureDataDir();

                let stat;

                try {
                    stat =
                        await fs.promises.stat(
                            eliteFile
                        );
                } catch {
                    await fs.promises.writeFile(
                        eliteFile,
                        "[]",
                        "utf8"
                    );

                    stat =
                        await fs.promises.stat(
                            eliteFile
                        );
                }

                const mtime =
                    stat.mtimeMs;

                if (
                    !force &&
                    eliteReady &&
                    mtime === eliteMtime
                ) {
                    return;
                }

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

                if (
                    Array.isArray(data)
                ) {
                    for (
                        const item of data
                    ) {
                        let values = [];

                        if (
                            typeof item ===
                                "string" ||
                            typeof item ===
                                "number"
                        ) {
                            values.push(item);

                        } else if (
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
                        }

                        for (
                            const value of values
                        ) {
                            const number =
                                normalizeStoredNumber(
                                    value
                                );

                            if (
                                number &&
                                !set.has(number)
                            ) {
                                set.add(number);
                                result.push(
                                    number
                                );
                            }
                        }
                    }
                }

                eliteCache = result;
                eliteSet = set;

                eliteMtime = mtime;
                eliteReady = true;

            } catch {}
        })();

    try {
        await eliteLoading;
    } finally {
        eliteLoading = null;
    }
}

// ═══════════════════════════════════════════════════════
// ⚡ BACKGROUND REFRESH
// ═══════════════════════════════════════════════════════

function scheduleFileRefresh() {
    const now = Date.now();

    if (
        now - lastFileCheck <
        FILE_CHECK_TIME
    ) {
        return;
    }

    lastFileCheck = now;

    void refreshMode().catch(() => {});
    void refreshElite().catch(() => {});
}

function getModeFast() {
    scheduleFileRefresh();
    return modeCache;
}

function getEliteFast() {
    scheduleFileRefresh();
    return eliteCache;
}

function checkElite(value) {
    const number =
        normalizeStoredNumber(value);

    return (
        !!number &&
        eliteSet.has(number)
    );
}

function checkEliteIdentities(values) {
    if (!Array.isArray(values)) {
        values = [values];
    }

    for (
        const value of values
    ) {
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

    const existing =
        groupLoading.get(jid);

    if (existing) {
        return existing;
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
                            groupCache.keys()
                                .next()
                                .value;

                        if (first) {
                            groupCache.delete(
                                first
                            );
                        }
                    }
                }

                return (
                    metadata ||
                    cached?.data ||
                    null
                );

            } catch {
                return (
                    cached?.data ||
                    null
                );

            } finally {
                groupLoading.delete(
                    jid
                );
            }
        })();

    groupLoading.set(
        jid,
        promise
    );

    return promise;
}

export function clearGroupMetadataCache(
    jid = null
) {
    try {
        if (jid) {
            groupCache.delete(jid);
            groupLoading.delete(jid);
            return;
        }

        groupCache.clear();
        groupLoading.clear();

    } catch {}
}

// ═══════════════════════════════════════════════════════
// 🚀 LIVE PLUGIN LOADER (متوافق مع main.js تماماً)
// ═══════════════════════════════════════════════════════

export async function getLoadedPlugins(sock) {
    if (!sock) {
        return [];
    }

    try {
        const plugins = await loadPlugins(sock);
        const loaded = Array.isArray(plugins) ? plugins.filter(Boolean) : [];
        return loaded;
    } catch (error) {
        console.error(
            "Plugin Loader Error:",
            error?.message || error
        );
        return [];
    }
}

export function clearPluginsCache(sock = null) {
    // دالة توافقية فارغة
}

// ═══════════════════════════════════════════════════════
// 🛡️ MESSAGE DEDUPLICATION
// ═══════════════════════════════════════════════════════

const processedMessages =
    new Map();

let cleanupRunning = false;

function getSocketSessionId(sock) {
    return (
        sock?.user?.id ||
        sock?.user?.jid ||
        sock?.user?.lid ||
        "unknown"
    );
}

function wasProcessed(id, sock) {
    if (!id) {
        return false;
    }

    const session =
        String(
            getSocketSessionId(sock)
        );

    const key =
        `${session}:${id}`;

    const now =
        Date.now();

    const previous =
        processedMessages.get(
            key
        );

    if (
        previous &&
        now - previous <
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
            MAX_PROCESSED_MESSAGES &&
        !cleanupRunning
    ) {
        cleanupRunning = true;

        queueMicrotask(() => {
            try {
                const cutoff =
                    Date.now() -
                    MESSAGE_CACHE_TIME;

                let count = 0;

                for (
                    const [
                        cacheKey,
                        time
                    ]
                    of processedMessages
                ) {
                    if (
                        time <
                        cutoff
                    ) {
                        processedMessages.delete(
                            cacheKey
                        );

                        count++;

                        if (
                            count >=
                            1000
                        ) {
                            break;
                        }
                    }
                }

                if (
                    processedMessages.size >
                    MAX_PROCESSED_MESSAGES *
                        1.25
                ) {
                    const removeCount =
                        processedMessages.size -
                        MAX_PROCESSED_MESSAGES;

                    let removed = 0;

                    for (
                        const key
                        of processedMessages.keys()
                    ) {
                        processedMessages.delete(
                            key
                        );

                        removed++;

                        if (
                            removed >=
                            removeCount
                        ) {
                            break;
                        }
                    }
                }

            } finally {
                cleanupRunning = false;
            }
        });
    }

    return false;
}

// ═══════════════════════════════════════════════════════
// 👤 SENDER
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

        const flow =
            message
                ?.interactiveResponseMessage
                ?.nativeFlowResponseMessage ||
            message?.nativeFlowResponseMessage;

        if (flow?.paramsJson) {
            let parsed;

            try {
                parsed =
                    typeof flow.paramsJson ===
                        "string"
                        ? JSON.parse(
                              flow.paramsJson
                          )
                        : flow.paramsJson;
            } catch {
                parsed = null;
            }

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
        }

    } catch {}

    return "";
}

function normalizeMenuCommand(id) {
    if (!id) {
        return "";
    }

    let value =
        String(id).trim();

    const lower =
        value.toLowerCase();

    if (
        lower.startsWith("cmd:")
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

export function handleMessages(
    sock,
    m
) {
    try {
        const msg =
            m?.messages?.[0];

        if (!msg?.message) {
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

        void executeHandlerLogic(
            sock,
            msg
        ).catch(error => {
            console.error(
                "Handler Execution Error:",
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

// ═══════════════════════════════════════════════════════
// ⚡ MAIN EXECUTION (محمي بالكامل لمنع فصل البوت)
// ═══════════════════════════════════════════════════════

async function executeHandlerLogic(
    sock,
    msg
) {
    try {
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

        const metadataPromise =
            isGroup
                ? getGroupMetadata(
                      sock,
                      jid
                  )
                : Promise.resolve(null);

        let rawPlugins = [];
        try {
            rawPlugins = await loadPlugins(sock);
        } catch (err) {
            console.error("Plugin Load Error:", err);
        }

        const plugins = Array.isArray(rawPlugins) ? rawPlugins.filter(Boolean) : [];
        if (!plugins.length) {
            return;
        }

        getModeFast();
        getEliteFast();

        const metadata =
            await metadataPromise;

        const commandIndex = new Map();
        const onMessagePlugins = [];

        for (const plugin of plugins) {
            if (typeof plugin?.onMessage === "function") {
                onMessagePlugins.push(plugin);
            }

            if (!plugin?.command) {
                continue;
            }

            const commands = Array.isArray(plugin.command)
                ? plugin.command
                : [plugin.command];

            for (const command of commands) {
                if (command === undefined || command === null) {
                    continue;
                }

                const key = String(command).trim().toLowerCase();

                if (key && !commandIndex.has(key)) {
                    commandIndex.set(key, plugin);
                }
            }
        }

        const botIdentities =
            getBotIdentities(sock);

        const botNumber =
            getBotNumber(
                sock,
                metadata
            );

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

        const resolved =
            resolveSender(
                sock,
                msg,
                isGroup,
                metadata
            );

        const sender =
            resolved.sender;

        const number =
            resolved.number;

        let isEliteUser =
            checkEliteIdentities([
                number,
                sender
            ]);

        if (!isEliteUser) {
            for (
                const candidate
                of [
                    botNumber,
                    participantPhone,
                    ...botIdentities
                ]
            ) {
                if (
                    checkElite(candidate)
                ) {
                    isEliteUser = true;
                    break;
                }
            }
        }

        if (
            !isEliteUser &&
            isMainBot
        ) {
            isEliteUser = true;
        }

        let botAdminData = {
            isAdmin: false,
            isSuperAdmin: false,
            participant:
                botParticipant,
            metadata
        };

        if (
            isGroup &&
            botParticipant
        ) {
            const admin =
                botParticipant.admin;

            botAdminData.isSuperAdmin =
                admin ===
                "superadmin";

            botAdminData.isAdmin =
                admin === "admin" ||
                botAdminData.isSuperAdmin;
        }

        const botIsAdmin =
            botAdminData.isAdmin;

        const botIsSuperAdmin =
            botAdminData.isSuperAdmin;

        const message =
            msg.message;

        const normalText =
            message.conversation ||
            message.extendedTextMessage?.text ||
            message.imageMessage?.caption ||
            message.videoMessage?.caption ||
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

                isAdmin:
                    botIsAdmin,

                isSuperAdmin:
                    botIsSuperAdmin,

                adminMode:
                    botIsAdmin,

                botIsAdmin,
                botIsSuperAdmin,

                botParticipant:
                    botParticipant ||
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
                    void Promise.resolve(
                        plugin.onMessage(
                            sock,
                            msg,
                            context
                        )
                    ).catch(() => {});
                } catch {}
            }
        }

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

        const hasPrefix = fromInteractive ? false : text.startsWith(".");

        if (!hasPrefix && !fromInteractive) {
            return;
        }

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

        // 🛡️ حماية صارمة لتنفيذ الأمر بحيث لا يؤدي أي خطأ فيه إلى فصل جلسة البوت نهائياً
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

                    isInteractive:
                        fromInteractive,

                    interactiveId:
                        interactiveId ||
                        null,

                    isListResponse:
                        fromInteractive,

                    isAdmin:
                        botIsAdmin,

                    isSuperAdmin:
                        botIsSuperAdmin,

                    adminMode:
                        botIsAdmin,

                    botIsAdmin,
                    botIsSuperAdmin,

                    botParticipant:
                        botParticipant ||
                        null,

                    groupMetadata:
                        metadata ||
                        null
                }
            );

        } catch (error) {
            console.error(
                `❌ Command Execution Failed [${commandName}]:`,
                error?.message ||
                    error
            );
        }

    } catch (error) {
        console.error(
            "Critical Execute Handler Error:",
            error?.message ||
                error
        );
    }
}

// ═══════════════════════════════════════════════════════
// 🔥 WARMUP
// ═══════════════════════════════════════════════════════

export async function warmupHandler(
    sock
) {
    try {
        await Promise.all([
            refreshMode(true),
            refreshElite(true),
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

        log(
            "elite",
            `Elite: ${
                eliteCache.length
            }`
        );

        log(
            "ok",
            `Mode: ${
                modeCache.elite
                    ? "ELITE"
                    : "NORMAL"
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

// ═══════════════════════════════════════════════════════
// 🧹 CLEAN SHUTDOWN
// ═══════════════════════════════════════════════════════

export function clearHandlerCaches() {
    try {
        groupCache.clear();
        groupLoading.clear();

        processedMessages.clear();

        modeReady = false;
        eliteReady = false;

        modeMtime = 0;
        eliteMtime = 0;

        modeCache = {
            elite: false
        };

        eliteCache = [];
        eliteSet = new Set();

        lastFileCheck = 0;

    } catch {}
}
