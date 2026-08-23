import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";

import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys";

import { handleMessages } from "./handler.js";
import { loadPlugins } from "./loader.js";

// ═══════════════════════════════════════
// 📁 PATHS
// ═══════════════════════════════════════

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const ROOT =
    path.join(__dirname, "..");

const SESSIONS_DIR =
    path.join(
        ROOT,
        "ملفات_البوتات"
    );

const DATA_DIR =
    path.join(
        ROOT,
        "data"
    );

const DATABASE_FILE =
    path.join(
        DATA_DIR,
        "subbots.json"
    );

// ═══════════════════════════════════════
// ⚙️ SETTINGS
// ═══════════════════════════════════════

const RECONNECT_DELAY = 5000;
const PAIRING_DELAY = 5000;
const CONNECT_TIMEOUT = 60000;

// ═══════════════════════════════════════
// 🧠 MEMORY
// ═══════════════════════════════════════

const runningBots = new Map();
const startingBots = new Set();

let mainSocket = null;

// ═══════════════════════════════════════
// 📱 NUMBER
// ═══════════════════════════════════════

function cleanNumber(value) {

    try {

        if (
            value === undefined ||
            value === null
        ) {
            return "";
        }

        return String(value)
            .split("@")[0]
            .split(":")[0]
            .replace(/\D/g, "");

    } catch {

        return "";
    }
}

// ═══════════════════════════════════════
// 📂 SESSION PATH
// ═══════════════════════════════════════

function getSessionDir(number) {

    return path.join(
        SESSIONS_DIR,
        cleanNumber(number)
    );
}

// ═══════════════════════════════════════
// 📁 DATABASE
// ═══════════════════════════════════════

async function ensureDatabase() {

    await fs.ensureDir(
        SESSIONS_DIR
    );

    await fs.ensureDir(
        DATA_DIR
    );

    if (
        !(await fs.pathExists(
            DATABASE_FILE
        ))
    ) {

        await fs.writeJson(
            DATABASE_FILE,
            {
                bots: []
            },
            {
                spaces: 2
            }
        );
    }
}

async function readDatabase() {

    await ensureDatabase();

    try {

        const data =
            await fs.readJson(
                DATABASE_FILE
            );

        if (
            !data ||
            !Array.isArray(data.bots)
        ) {

            return {
                bots: []
            };
        }

        data.bots = [
            ...new Set(
                data.bots
                    .map(cleanNumber)
                    .filter(
                        n => n.length >= 7
                    )
            )
        ];

        return data;

    } catch {

        return {
            bots: []
        };
    }
}

async function saveDatabase(data) {

    await ensureDatabase();

    const temp =
        `${DATABASE_FILE}.tmp`;

    await fs.writeJson(
        temp,
        data,
        {
            spaces: 2
        }
    );

    await fs.rename(
        temp,
        DATABASE_FILE
    );
}

async function saveNumber(number) {

    number =
        cleanNumber(number);

    if (!number) {
        return;
    }

    const data =
        await readDatabase();

    if (
        !data.bots.includes(number)
    ) {

        data.bots.push(number);

        await saveDatabase(
            data
        );
    }
}

async function removeNumber(number) {

    number =
        cleanNumber(number);

    const data =
        await readDatabase();

    data.bots =
        data.bots.filter(
            n => n !== number
        );

    await saveDatabase(
        data
    );
}

// ═══════════════════════════════════════
// 📋 PUBLIC DATABASE
// ═══════════════════════════════════════

export async function getSubBots() {

    const data =
        await readDatabase();

    return data.bots;
}

// ═══════════════════════════════════════
// 🤖 MAIN SOCKET
// ═══════════════════════════════════════

export function setMainSocket(sock) {

    mainSocket =
        sock;
}

// ═══════════════════════════════════════
// 🔘 REAL BUTTONS
// ═══════════════════════════════════════

function installRealButtons(sock) {

    sock.sendRealButtons =
        async (
            jid,
            text,
            footerText,
            buttonsArray
        ) => {

            if (
                !sock?.user?.id
            ) {

                throw new Error(
                    "Socket غير متصل"
                );
            }

            if (
                !Array.isArray(
                    buttonsArray
                )
            ) {

                throw new Error(
                    "buttonsArray يجب أن يكون Array"
                );
            }

            const messageContent =
                generateWAMessageFromContent(
                    jid,
                    {

                        interactiveMessage:
                            proto.Message
                                .InteractiveMessage
                                .create({

                                    body:
                                        proto.Message
                                            .InteractiveMessage
                                            .Body
                                            .create({
                                                text:
                                                    String(
                                                        text ||
                                                        ""
                                                    )
                                            }),

                                    footer:
                                        proto.Message
                                            .InteractiveMessage
                                            .Footer
                                            .create({
                                                text:
                                                    String(
                                                        footerText ||
                                                        "Arthur Bot Framework"
                                                    )
                                            }),

                                    nativeFlowMessage:
                                        proto.Message
                                            .InteractiveMessage
                                            .NativeFlowMessage
                                            .create({

                                                buttons:
                                                    buttonsArray.map(
                                                        btn => ({

                                                            name:
                                                                btn?.name ||
                                                                "quick_reply",

                                                            buttonParamsJson:
                                                                JSON.stringify({

                                                                    display_text:
                                                                        btn?.displayText ||
                                                                        btn?.text ||
                                                                        "اختيار",

                                                                    id:
                                                                        btn?.id ||
                                                                        btn?.command ||
                                                                        ""

                                                                })

                                                        })
                                                    )

                                            })

                                })

                    },
                    {
                        userJid:
                            sock.user.id
                    }
                );

            return await sock.relayMessage(
                jid,
                messageContent.message,
                {

                    messageId:
                        messageContent.key.id,

                    additionalNodes: [
                        {

                            tag:
                                "biz",

                            attrs:
                                {},

                            content: [
                                {

                                    tag:
                                        "interactive",

                                    attrs: {
                                        type:
                                            "native_flow",

                                        v:
                                            "1"
                                    },

                                    content: [
                                        {

                                            tag:
                                                "native_flow",

                                            attrs: {
                                                name:
                                                    "quick_reply"
                                            }

                                        }
                                    ]

                                }
                            ]

                        }
                    ]

                }
            );
        };
}

// ═══════════════════════════════════════
// 🔌 PLUGINS
// ═══════════════════════════════════════

async function getPlugins(sock) {

    try {

        const plugins =
            await loadPlugins(
                sock
            );

        return Array.isArray(
            plugins
        )
            ? plugins.filter(Boolean)
            : [];

    } catch (error) {

        console.log(
            "❌ SubBot Loader Error:",
            error?.message ||
            error
        );

        return [];
    }
}

// ═══════════════════════════════════════
// 🔑 PAIRING CODE
// ═══════════════════════════════════════

async function getPairingCode(
    sock,
    number
) {

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                PAIRING_DELAY
            )
    );

    try {

        const code =
            await sock.requestPairingCode(
                number
            );

        if (!code) {

            throw new Error(
                "WhatsApp لم يرجع كود الربط"
            );
        }

        return String(
            code
        );

    } catch (error) {

        console.log(
            `❌ Pairing Error [${number}]:`,
            error?.message ||
            error
        );

        throw error;
    }
}

// ═══════════════════════════════════════
// 🤖 START SUBBOT
// ═══════════════════════════════════════

export async function startSubBot(
    inputNumber
) {

    const number =
        cleanNumber(
            inputNumber
        );

    if (
        !number ||
        number.length < 7
    ) {

        throw new Error(
            "رقم الهاتف غير صالح"
        );
    }

    // ═══════════════════════════════
    // 🚫 MAIN BOT
    // ═══════════════════════════════

    const mainNumber =
        cleanNumber(
            mainSocket?.user?.id
        );

    if (
        mainNumber &&
        mainNumber === number
    ) {

        throw new Error(
            "هذا الرقم هو البوت الرئيسي بالفعل"
        );
    }

    // ═══════════════════════════════
    // 🚫 ALREADY INSTALLING
    // ═══════════════════════════════

    if (
        startingBots.has(number)
    ) {

        throw new Error(
            "هذا الرقم قيد التنصيب بالفعل، انتظر قليلًا"
        );
    }

    // ═══════════════════════════════
    // 🟢 ALREADY RUNNING
    // ═══════════════════════════════

    const existing =
        runningBots.get(
            number
        );

    if (
        existing
    ) {

        if (
            existing.connected &&
            existing.sock?.user
        ) {

            return {
                sock:
                    existing.sock,

                pairingCode:
                    null,

                alreadyRunning:
                    true,

                number,

                sessionDir:
                    existing.sessionDir
            };
        }
    }

    // ═══════════════════════════════
    // 💾 CHECK SAVED SESSION
    // ═══════════════════════════════

    const sessionDir =
        getSessionDir(
            number
        );

    const sessionExists =
        await fs.pathExists(
            sessionDir
        );

    if (
        sessionExists
    ) {

        /*
         * إذا كانت هناك جلسة محفوظة
         * لا ننشئ جلسة جديدة.
         *
         * سنحاول تشغيلها فقط.
         */

        console.log(
            `♻️ تم العثور على جلسة محفوظة | ${number}`
        );
    }

    startingBots.add(
        number
    );

    let sock = null;

    try {

        await ensureDatabase();

        await fs.ensureDir(
            sessionDir
        );

        // ═══════════════════════════════
        // 🔐 AUTH
        // ═══════════════════════════════

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                sessionDir
            );

        // ═══════════════════════════════
        // 📦 VERSION
        // ═══════════════════════════════

        const {
            version
        } =
            await fetchLatestBaileysVersion();

        // ═══════════════════════════════
        // 🤖 SOCKET
        // ═══════════════════════════════

        sock =
            makeWASocket({

                version,

                auth:
                    state,

                logger:
                    pino({
                        level:
                            "silent"
                    }),

                browser: [
                    "MacOs",
                    "Chrome",
                    "1.0.0"
                ],

                markOnlineOnConnect:
                    true,

                generateHighQualityLinkPreview:
                    true,

                syncFullHistory:
                    false,

                connectTimeoutMs:
                    60000,

                defaultQueryTimeoutMs:
                    60000,

                keepAliveIntervalMs:
                    25000

            });

        // ═══════════════════════════════
        // 🔘 BUTTONS
        // ═══════════════════════════════

        installRealButtons(
            sock
        );

        // ═══════════════════════════════
        // 💾 CREDS
        // ═══════════════════════════════

        sock.ev.on(
            "creds.update",
            saveCreds
        );

        // ═══════════════════════════════
        // 🧠 REGISTER
        // ═══════════════════════════════

        runningBots.set(
            number,
            {

                sock,

                number,

                sessionDir,

                connected:
                    false,

                registered:
                    state.creds.registered

            }
        );

        // ═══════════════════════════════
        // 💬 MESSAGES
        // ═══════════════════════════════

        sock.ev.on(
            "messages.upsert",
            async m => {

                try {

                    await handleMessages(
                        sock,
                        m
                    );

                } catch (error) {

                    console.log(
                        `❌ SubBot Message Error [${number}]:`,
                        error?.message ||
                        error
                    );
                }
            }
        );

        // ═══════════════════════════════
        // 👥 GROUP PARTICIPANTS
        // ═══════════════════════════════

        sock.ev.on(
            "group-participants.update",
            async update => {

                try {

                    const plugins =
                        await getPlugins(
                            sock
                        );

                    for (
                        const plugin
                        of plugins
                    ) {

                        if (
                            typeof plugin?.onGroupParticipantsUpdate !==
                            "function"
                        ) {
                            continue;
                        }

                        Promise.resolve(
                            plugin.onGroupParticipantsUpdate(
                                sock,
                                update
                            )
                        ).catch(
                            error => {

                                console.log(
                                    `❌ Group Plugin Error [${number}]:`,
                                    error?.message ||
                                    error
                                );

                            }
                        );
                    }

                } catch (error) {

                    console.log(
                        `❌ Group Event Error [${number}]:`,
                        error?.message ||
                        error
                    );
                }
            }
        );

        // ═══════════════════════════════
        // 🔗 JOIN REQUEST
        // ═══════════════════════════════

        sock.ev.on(
            "group.join-request",
            async update => {

                try {

                    const plugins =
                        await getPlugins(
                            sock
                        );

                    for (
                        const plugin
                        of plugins
                    ) {

                        if (
                            typeof plugin?.onGroupJoinRequest !==
                            "function"
                        ) {
                            continue;
                        }

                        Promise.resolve(
                            plugin.onGroupJoinRequest(
                                sock,
                                update
                            )
                        ).catch(
                            error => {

                                console.log(
                                    `❌ Join Request Error [${number}]:`,
                                    error?.message ||
                                    error
                                );

                            }
                        );
                    }

                } catch (error) {

                    console.log(
                        `❌ Join Request Event Error [${number}]:`,
                        error?.message ||
                        error
                    );
                }
            }
        );

        // ═══════════════════════════════
        // 🔌 CONNECTION
        // ═══════════════════════════════

        sock.ev.on(
            "connection.update",
            update => {

                const {
                    connection,
                    lastDisconnect
                } = update;

                const info =
                    runningBots.get(
                        number
                    );

                if (!info) {
                    return;
                }

                // ═══════════════════
                // ⏳ CONNECTING
                // ═══════════════════

                if (
                    connection ===
                    "connecting"
                ) {

                    console.log(
                        `⏳ SubBot Connecting | ${number}`
                    );
                }

                // ═══════════════════
                // 🟢 OPEN
                // ═══════════════════

                if (
                    connection ===
                    "open"
                ) {

                    info.connected =
                        true;

                    info.registered =
                        true;

                    console.log(
                        `🟢 SubBot ONLINE | ${number}`
                    );

                    saveNumber(
                        number
                    ).catch(
                        () => {}
                    );
                }

                // ═══════════════════
                // 🔴 CLOSE
                // ═══════════════════

                if (
                    connection ===
                    "close"
                ) {

                    info.connected =
                        false;

                    const status =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                    const reason =
                        lastDisconnect
                            ?.error
                            ?.message ||
                        "Unknown";

                    console.log(
                        `🔴 SubBot CLOSED | ${number} | ${status || "unknown"}`
                    );

                    console.log(
                        `🔴 السبب: ${reason}`
                    );

                    runningBots.delete(
                        number
                    );

                    // ═══════════════════
                    // 🚪 LOGGED OUT
                    // ═══════════════════

                    if (
                        status ===
                        DisconnectReason.loggedOut
                    ) {

                        console.log(
                            `🚪 SubBot Logged Out | ${number}`
                        );

                        removeNumber(
                            number
                        ).catch(
                            () => {}
                        );

                        return;
                    }

                    // ═══════════════════
                    // 🔄 RECONNECT
                    // ═══════════════════

                    setTimeout(
                        () => {

                            startSubBot(
                                number
                            ).catch(
                                error => {

                                    console.log(
                                        `❌ SubBot Reconnect Error [${number}]:`,
                                        error?.message ||
                                        error
                                    );

                                }
                            );

                        },
                        RECONNECT_DELAY
                    );
                }
            }
        );

        // ═══════════════════════════════
        // 🔑 PAIRING
        // ═══════════════════════════════

        let pairingCode =
            null;

        if (
            !state.creds.registered
        ) {

            console.log(
                `⌛ تجهيز كود الربط | ${number}`
            );

            pairingCode =
                await getPairingCode(
                    sock,
                    number
                );

            console.log(
                `
╔════════════════════════════════════╗
║       👑 ARTHUR SUB BOT 👑         ║
╠════════════════════════════════════╣
║ 📱 NUMBER : ${number}
║ 🔑 CODE   : ${pairingCode}
╠════════════════════════════════════╣
║ WhatsApp > الأجهزة المرتبطة        ║
║ اختر "ربط جهاز" وأدخل الكود        ║
╚════════════════════════════════════╝
`
            );

        } else {

            console.log(
                `♻️ جلسة موجودة | ${number}`
            );
        }

        return {

            sock,

            pairingCode,

            alreadyRunning:
                false,

            number,

            sessionDir

        };

    } catch (error) {

        console.log(
            `❌ SubBot Start Error [${number}]:`,
            error?.message ||
            error
        );

        runningBots.delete(
            number
        );

        throw error;

    } finally {

        startingBots.delete(
            number
        );
    }
}

// ═══════════════════════════════════════
// 🔄 RESTORE
// ═══════════════════════════════════════

export async function startAllSubBots(
    mainSock
) {

    setMainSocket(
        mainSock
    );

    const numbers =
        await getSubBots();

    if (
        !numbers.length
    ) {

        console.log(
            "ℹ️ لا توجد جلسات SubBot محفوظة"
        );

        return;
    }

    console.log(
        `♻️ استعادة ${numbers.length} جلسة فرعية...`
    );

    for (
        const number
        of numbers
    ) {

        try {

            await startSubBot(
                number
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1500
                    )
            );

        } catch (error) {

            console.log(
                `❌ Restore Failed [${number}]:`,
                error?.message ||
                error
            );
        }
    }
}

// ═══════════════════════════════════════
// 🛑 STOP
// ═══════════════════════════════════════

export async function stopSubBot(
    inputNumber,
    deleteSession = false
) {

    const number =
        cleanNumber(
            inputNumber
        );

    const info =
        runningBots.get(
            number
        );

    if (
        info?.sock
    ) {

        try {

            info.sock.end(
                undefined
            );

        } catch {}
    }

    runningBots.delete(
        number
    );

    if (
        deleteSession
    ) {

        await removeNumber(
            number
        );

        try {

            await fs.remove(
                getSessionDir(
                    number
                )
            );

        } catch {}
    }

    return true;
}

// ═══════════════════════════════════════
// 🗑️ DELETE SESSION
// ═══════════════════════════════════════

export async function deleteSubBotSession(
    inputNumber
) {

    return await stopSubBot(
        inputNumber,
        true
    );
}

// ═══════════════════════════════════════
// 📊 STATUS
// ═══════════════════════════════════════

export function getSubBotStatus(
    inputNumber
) {

    const number =
        cleanNumber(
            inputNumber
        );

    const info =
        runningBots.get(
            number
        );

    return {

        number,

        running:
            !!info,

        connected:
            info?.connected === true,

        registered:
            info?.registered === true

    };
}

// ═══════════════════════════════════════
// 📱 NORMALIZE
// ═══════════════════════════════════════

export function normalizeSubBotNumber(
    value
) {

    return cleanNumber(
        value
    );
}
