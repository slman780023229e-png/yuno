// main.js
// ✧ ARTHUR BOT - Main Entry Point
// ✧ Stable / Protected / Anti-Duplicate Session
// ✧ Baileys + NixCode + Plugin System

'use strict'

import serialize from './utils/serialize.js'
import {
    handleMessages,
    getLoadedPlugins,
    warmupHandler
} from './utils/handler.js'

import {
    Button,
    ButtonV2,
    Carousel,
    AIRich,
    Toolkit
} from './utils/nixcode.js'

import './utils/memory-cleaner.js'

import {
    scanAllProjectFiles
} from './utils/watcher.js'

import '@whiskeysockets/baileys'

import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    proto
} from '@whiskeysockets/baileys'

import pino from 'pino'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'


// ============================================================
// PATHS
// ============================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sessionDir = path.join(
    __dirname,
    'ملف_الاتصال'
)

const dataDir = path.join(
    __dirname,
    'data'
)


// ============================================================
// SESSION RESTORE FROM ENVIRONMENT VARIABLE
// ============================================================

if (process.env.SESSION_DATA) {
    try {
        fs.ensureDirSync(sessionDir);
        fs.writeFileSync(
            path.join(sessionDir, 'creds.json'),
            process.env.SESSION_DATA,
            'utf-8'
        );
        console.log(chalk.green('✅ تم استعادة الجلسة بنجاح من متغيرات البيئة (Environment Variables).'));
    } catch (e) {
        console.log(chalk.red('⚠️ فشل في استعادة الجلسة من متغير البيئة: ' + e.message));
    }
}


// ============================================================
// KEEP ALIVE
// ============================================================

const PORT = process.env.PORT || 3000

const keepAliveServer = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8'
    })

    res.end('ARTHUR BOT IS RUNNING 🟢\n')
})

keepAliveServer.listen(PORT, '0.0.0.0', () => {
    console.log(
        chalk.green(
            `🌐 Keep-Alive Server Running On Port ${PORT}`
        )
    )
})


// ============================================================
// LIVE CLOCK
// ============================================================

const liveClock = setInterval(() => {
    const now = new Date()

    const time = now.toLocaleTimeString(
        'en-US',
        {
            hour12: false
        }
    )

    console.log(
        chalk.gray(
            `🕒 ARTHUR BOT | ${time}`
        )
    )
}, 60000)


// ============================================================
// GLOBAL STATE
// ============================================================

let currentSock = null

let isStarting = false
let isShuttingDown = false

let reconnectTimer = null

let projectScanned = false


// ============================================================
// SETTINGS
// ============================================================

const RECONNECT_DELAY = 3000


// ============================================================
// HELPERS
// ============================================================

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
}


// ============================================================
// PLUGIN EVENT SYSTEM
// ============================================================
// IMPORTANT:
// لا يوجد هنا كاش مستقل للبلجنات.
// يتم الاعتماد على كاش handler.js حتى لا يتم تحميل
// نفس البلجنات مرتين لنفس الـ socket.
// ============================================================

async function runPluginEvent(sock, eventName, payload) {
    try {
        const plugins = await getLoadedPlugins(sock)

        if (!Array.isArray(plugins)) {
            return
        }

        for (const plugin of plugins) {
            if (!plugin) continue

            const eventHandler = plugin[eventName]

            if (typeof eventHandler !== 'function') {
                continue
            }

            try {
                await eventHandler(
                    sock,
                    payload
                )
            } catch (error) {
                console.error(
                    chalk.red(
                        `❌ Plugin Event Error [${eventName}]`
                    ),
                    error
                )
            }
        }

    } catch (error) {
        console.error(
            chalk.red(
                `❌ Failed To Run Plugin Event [${eventName}]`
            ),
            error
        )
    }
}


// ============================================================
// START BOT
// ============================================================

async function startBot() {

    if (isStarting) {
        console.log(
            chalk.yellow(
                '⚠️ Bot is already starting. Skipping duplicate start.'
            )
        )

        return
    }

    if (isShuttingDown) {
        console.log(
            chalk.yellow(
                '⚠️ Shutdown is in progress. Start cancelled.'
            )
        )

        return
    }


    // --------------------------------------------------------
    // حماية إضافية من إنشاء Socket ثاني
    // --------------------------------------------------------

    if (
        currentSock &&
        currentSock.ws &&
        currentSock.ws.readyState === 1
    ) {
        console.log(
            chalk.yellow(
                '⚠️ Existing socket is already connected. Skipping duplicate socket.'
            )
        )

        return
    }


    isStarting = true

    clearReconnectTimer()


    try {

        // ====================================================
        // 🛡️ التأكد من جاهزية مجلد الجلسة وثباته
        // ====================================================
        try {
            await fs.ensureDir(sessionDir)
            await fs.ensureDir(dataDir)
        } catch (e) {
            console.log(chalk.red("⚠️ خطأ في إنشاء المجلدات الأساسية: " + e.message));
        }


        // ====================================================
        // PROJECT SCAN
        // ====================================================

        if (!projectScanned) {

            try {

                await scanAllProjectFiles()

                projectScanned = true

                console.log(
                    chalk.green(
                        '📂 Project files scanned successfully.'
                    )
                )

            } catch (error) {

                console.error(
                    chalk.red(
                        '❌ Project scan failed:'
                    ),
                    error
                )

                // لا نوقف البوت بسبب فشل الـ watcher/scan
            }
        }


        // ====================================================
        // BANNER
        // ====================================================

        console.log(
            chalk.cyan(
                '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
            )
        )

        console.log(
            chalk.cyan.bold(
                '        🩸 ARTHUR BOT 🩸'
            )
        )

        console.log(
            chalk.gray(
                '        Main Session Starting...'
            )
        )

        console.log(
            chalk.cyan(
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
            )
        )


        // ====================================================
        // AUTH STATE
        // ====================================================

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            sessionDir
        )


        // ====================================================
        // BAILEYS VERSION
        // ====================================================

        let version

        try {

            const latestVersion =
                await fetchLatestBaileysVersion()

            version = latestVersion.version

            console.log(
                chalk.gray(
                    `📦 Baileys Version: ${version.join('.')}`
                )
            )

        } catch (error) {

            console.log(
                chalk.yellow(
                    '⚠️ Could not fetch latest Baileys version. Using default.'
                )
            )

            version = undefined
        }


        // ====================================================
        // CREATE SOCKET
        // ====================================================

        const sock = makeWASocket({

            ...(version
                ? { version }
                : {}),

            auth: state,

            logger: pino({
                level: 'silent'
            }),

            browser: [
                'Mac OS',
                'Chrome',
                '1.0.0'
            ],

            markOnlineOnConnect: true,

            generateHighQualityLinkPreview: true,

            syncFullHistory: false
        })


        // ====================================================
        // PROTECT GLOBAL SOCKET
        // ====================================================

        currentSock = sock

        global.sock = sock


        // ====================================================
        // CREDENTIALS & AUTO SAVE (Stable)
        // ====================================================

        sock.ev.on(
            'creds.update',
            saveCreds
        )


        // ====================================================
        // NIXCODE
        // ====================================================

        global.NixCode = {
            Button,
            ButtonV2,
            Carousel,
            AIRich,
            Toolkit
        }


        // ====================================================
        // REAL BUTTONS
        // ====================================================

        sock.sendRealButtons = async (jid, text, footerText, buttonsArray) => {
            try {
                const btn = new Button(sock);
                btn.setBody(text);
                if (footerText) btn.setFooter(footerText);

                for (const b of buttonsArray) {
                    const displayText = b.displayText || b.text || "زر";
                    const id = b.id || b.command || "click";
                    const type = b.name || "quick_reply";

                    if (type === "quick_reply") {
                        btn.addReply(displayText, id);
                    } else if (type === "cta_url") {
                        btn.addUrl(displayText, b.url || "");
                    } else if (type === "cta_call") {
                        btn.addCall(displayText, id);
                    } else {
                        btn.addButton(type, { display_text: displayText, id });
                    }
                }

                return await btn.send(jid);
            } catch (e) {
                const messageContent = generateWAMessageFromContent(jid, {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({ text: text }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: footerText || "Arthur Bot Framework" }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: buttonsArray.map(btn => ({
                                name: btn.name || "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: btn.displayText || btn.text,
                                    id: btn.id || btn.command
                                })
                            }))
                        })
                    })
                }, { userJid: sock.user.id });

                return await sock.relayMessage(jid, messageContent.message, {
                    messageId: messageContent.key.id,
                    additionalNodes: [
                        {
                            tag: "biz",
                            attrs: {},
                            content: [
                                {
                                    tag: "interactive",
                                    attrs: { type: "native_flow", v: "1" },
                                    content: [
                                        {
                                            tag: "native_flow",
                                            attrs: { name: "quick_reply" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            }
        }


        // ====================================================
        // PAIRING
        // ====================================================

        if (!state.creds.registered) {

            const pairingNumber =
                String(
                    process.env.PAIRING_NUMBER ||
                    '967780023229'
                )
                .replace(/\D/g, '')


            if (!pairingNumber) {

                console.log(
                    chalk.red(
                        '❌ No valid pairing number found.'
                    )
                )

            } else {

                console.log(
                    chalk.yellow(
                        `📱 Pairing Number: ${pairingNumber}`
                    )
                )


                setTimeout(
                    async () => {

                        try {

                            if (
                                isShuttingDown ||
                                currentSock !== sock
                            ) {
                                return
                            }


                            if (
                                state.creds.registered
                            ) {
                                return
                            }


                            console.log(
                                chalk.cyan(
                                    '🔐 Requesting pairing code...'
                                )
                            )


                            const code =
                                await sock.requestPairingCode(
                                    pairingNumber
                                )


                            console.log(
                                chalk.green(
                                    `\n🔑 PAIRING CODE: ${code}\n`
                                )
                            )

                        } catch (error) {

                            console.error(
                                chalk.red(
                                    '❌ Pairing Code Error:'
                                ),
                                error
                            )
                        }

                    },
                    5000
                )
            }
        }


        // ====================================================
        // CONNECTION UPDATE
        // ====================================================

        sock.ev.on(
            'connection.update',
            async update => {

                const {
                    connection,
                    lastDisconnect
                } = update


                // --------------------------------------------
                // CONNECTING
                // --------------------------------------------

                if (connection === 'connecting') {

                    console.log(
                        chalk.yellow(
                            '🔄 Connecting to WhatsApp...'
                        )
                    )
                }


                // --------------------------------------------
                // OPEN
                // --------------------------------------------

                if (connection === 'open') {

                    console.log(
                        chalk.green.bold(
                            '\n╭──────────────────────────────╮'
                        )
                    )

                    console.log(
                        chalk.green.bold(
                            '│   🟢 ARTHUR BOT IS ONLINE     │'
                        )
                    )

                    console.log(
                        chalk.green.bold(
                            '╰──────────────────────────────╯\n'
                        )
                    )


                    // ----------------------------------------
                    // تثبيت رقم البوت الرئيسي للـ handler
                    // ----------------------------------------

                    try {

                        if (sock.user?.id) {

                            sock.mainBotNumber =
                                sock.user.id

                            sock.__mainBotNumber =
                                sock.user.id
                        }

                    } catch (error) {

                        console.log(
                            chalk.yellow(
                                '⚠️ Could not set main bot number.'
                            )
                        )
                    }


                    // ----------------------------------------
                    // WARMUP
                    // ----------------------------------------

                    try {

                        await warmupHandler(sock)

                        console.log(
                            chalk.green(
                                '✅ Handler warmup completed.'
                            )
                        )

                    } catch (error) {

                        console.error(
                            chalk.yellow(
                                '⚠️ Handler warmup failed:'
                            ),
                            error
                        )
                    }


                    // ----------------------------------------
                    // RESTART MESSAGE
                    // ----------------------------------------

                    try {

                        const restartFile =
                            path.join(
                                dataDir,
                                'restart.json'
                            )


                        if (
                            await fs.pathExists(
                                restartFile
                            )
                        ) {

                            let restartData = null

                            try {

                                restartData =
                                    await fs.readJson(
                                        restartFile
                                    )

                            } catch {
                                restartData = null
                            }


                            if (
                                restartData &&
                                restartData.jid
                            ) {

                                const restartText =
                                    restartData.message ||
                                    '*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n*║ 🩸 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 🩸*\n*║ 🚀 تمت إعادة تشغيل النواة بنجاح*\n*║ تم التشغيل والاتصال بالخادم ✅*\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*'


                                try {

                                    await sock.sendMessage(
                                        restartData.jid,
                                        {
                                            text:
                                                restartText
                                        }
                                    )

                                } catch (error) {

                                    console.error(
                                        chalk.red(
                                            '❌ Failed to send restart message:'
                                        ),
                                        error
                                    )
                                }
                            }


                            try {

                                await fs.remove(
                                    restartFile
                                )

                            } catch {}
                        }

                    } catch (error) {

                        console.error(
                            chalk.red(
                                '❌ Restart file handling error:'
                            ),
                            error
                        )
                    }
                }


                // --------------------------------------------
                // CLOSE
                // --------------------------------------------

                if (connection === 'close') {

                    const statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode


                    const errorMessage =
                        lastDisconnect
                            ?.error
                            ?.message ||
                        ''


                    const closeReason =
                        statusCode ?? errorMessage ?? 'UNKNOWN'


                    console.log(
                        chalk.red(
                            `❌ Connection closed : ${closeReason}`
                        )
                    )


                    // ----------------------------------------
                    // LOGGED OUT
                    // ----------------------------------------

                    if (
                        statusCode ===
                        DisconnectReason.loggedOut
                    ) {

                        console.log(
                            chalk.red(
                                '🚫 Session logged out. Automatic reconnect disabled.'
                            )
                        )


                        if (
                            currentSock === sock
                        ) {
                            currentSock = null
                        }


                        if (
                            global.sock === sock
                        ) {
                            global.sock = null
                        }


                        clearReconnectTimer()

                        return
                    }


                    // ----------------------------------------
                    // SHUTDOWN
                    // ----------------------------------------

                    if (isShuttingDown) {

                        if (
                            currentSock === sock
                        ) {
                            currentSock = null
                        }

                        return
                    }


                    // ----------------------------------------
                    // PROTECT AGAINST DUPLICATE RECONNECT
                    // ----------------------------------------

                    if (reconnectTimer) {

                        console.log(
                            chalk.yellow(
                                '⚠️ Reconnect already scheduled. Skipping duplicate reconnect.'
                            )
                        )

                        return
                    }


                    if (
                        currentSock === sock
                    ) {

                        currentSock = null
                    }


                    if (
                        global.sock === sock
                    ) {

                        global.sock = null
                    }


                    reconnectTimer =
                        setTimeout(
                            async () => {

                                reconnectTimer = null


                                if (
                                    isShuttingDown
                                ) {
                                    return
                                }


                                // --------------------------------
                                // حماية إضافية قبل إعادة الاتصال
                                // --------------------------------

                                if (
                                    currentSock &&
                                    currentSock.ws &&
                                    currentSock.ws.readyState === 1
                                ) {

                                    console.log(
                                        chalk.yellow(
                                            '⚠️ Another socket is already active. Reconnect cancelled.'
                                        )
                                    )

                                    return
                                }


                                console.log(
                                    chalk.cyan(
                                        '🔄 Restarting WhatsApp connection...'
                                    )
                                )


                                try {

                                    await startBot()

                                } catch (error) {

                                    console.error(
                                        chalk.red(
                                            '❌ Reconnect start failed:'
                                        ),
                                        error
                                    )
                                }

                            },
                            RECONNECT_DELAY
                        )
                }
            }
        )


        // ====================================================
        // MESSAGES
        // ====================================================

        sock.ev.on(
            'messages.upsert',
            async chatUpdate => {

                try {

                    if (
                        !chatUpdate ||
                        !Array.isArray(
                            chatUpdate.messages
                        )
                    ) {
                        return
                    }


                    if (
                        chatUpdate.messages.length === 0
                    ) {
                        return
                    }


                    // ----------------------------------------
                    // SERIALIZE
                    // ----------------------------------------

                    for (
                        const mek of chatUpdate.messages
                    ) {

                        if (!mek) {
                            continue
                        }

                        try {

                            serialize(
                                sock,
                                mek
                            )

                        } catch (error) {

                            console.error(
                                chalk.red(
                                    '❌ Serialize Error:'
                                ),
                                error
                            )
                        }
                    }


                    // ----------------------------------------
                    // HANDLER
                    // ----------------------------------------

                    await handleMessages(
                        sock,
                        chatUpdate
                    )

                } catch (error) {

                    console.error(
                        chalk.red(
                            '❌ messages.upsert Error:'
                        ),
                        error
                    )
                }
            }
        )


        // ====================================================
        // GROUP PARTICIPANTS
        // ====================================================

        sock.ev.on(
            'group-participants.update',
            async update => {

                try {

                    await runPluginEvent(
                        sock,
                        'onGroupParticipantsUpdate',
                        update
                    )

                } catch (error) {

                    console.error(
                        chalk.red(
                            '❌ group-participants.update Error:'
                        ),
                        error
                    )
                }
            }
        )


        // ====================================================
        // GROUP JOIN REQUEST
        // ====================================================

        sock.ev.on(
            'group.join-request',
            async update => {

                try {

                    await runPluginEvent(
                        sock,
                        'onGroupJoinRequest',
                        update
                    )

                } catch (error) {

                    console.error(
                        chalk.red(
                            '❌ group.join-request Error:'
                        ),
                        error
                    )
                }
            }
        )


        // ====================================================
        // SOCKET READY
        // ====================================================

        console.log(
            chalk.green(
                '✅ ARTHUR BOT socket initialized successfully.'
            )
        )


    } catch (error) {

        console.error(
            chalk.red.bold(
                '❌ Failed to start ARTHUR BOT:'
            ),
            error
        )


        // --------------------------------------------
        // إزالة socket الميت
        // --------------------------------------------

        if (
            currentSock &&
            currentSock === global.sock
        ) {
            currentSock = null
            global.sock = null
        }


        // --------------------------------------------
        // RETRY
        // --------------------------------------------

        if (
            !isShuttingDown &&
            !reconnectTimer
        ) {

            reconnectTimer =
                setTimeout(
                    async () => {

                        reconnectTimer = null

                        if (
                            isShuttingDown
                        ) {
                            return
                        }

                        try {

                            await startBot()

                        } catch (retryError) {

                            console.error(
                                chalk.red(
                                    '❌ Retry failed:'
                                ),
                                retryError
                            )
                        }

                    },
                    RECONNECT_DELAY
                )
        }

    } finally {

        isStarting = false
    }
}


// ============================================================
// PROCESS ERRORS
// ============================================================

process.on(
    'unhandledRejection',
    error => {

        console.error(
            chalk.red.bold(
                '❌ Unhandled Promise Rejection:'
            ),
            error
        )
    }
)


process.on(
    'uncaughtException',
    error => {

        console.error(
            chalk.red.bold(
                '❌ Uncaught Exception:'
            ),
            error
        )
    }
)


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function gracefulShutdown(
    signal
) {

    if (isShuttingDown) {
        return
    }


    isShuttingDown = true


    console.log(
        chalk.yellow(
            `\n🛑 ${signal} received. Shutting down ARTHUR BOT...`
        )
    )


    // --------------------------------------------
    // Stop reconnect
    // --------------------------------------------

    clearReconnectTimer()


    // --------------------------------------------
    // Stop clock
    // --------------------------------------------

    try {

        clearInterval(
            liveClock
        )

    } catch {}


    // --------------------------------------------
    // Close HTTP server
    // --------------------------------------------

    try {

        await new Promise(resolve => {

            keepAliveServer.close(
                () => resolve()
            )

        })

    } catch {}


    // --------------------------------------------
    // Close WhatsApp socket
    // --------------------------------------------

    try {

        if (currentSock) {

            try {

                if (
                    currentSock.ws &&
                    typeof currentSock.ws.close === 'function'
                ) {
                    currentSock.ws.close()
                }

            } catch {}

            currentSock = null
        }


        if (
            global.sock
        ) {
            global.sock = null
        }

    } catch {}


    console.log(
        chalk.green(
            '✅ ARTHUR BOT shutdown complete.'
        )
    )


    process.exit(0)
}


// ============================================================
// SIGNALS
// ============================================================

process.once(
    'SIGINT',
    () => gracefulShutdown('SIGINT')
)

process.once(
    'SIGTERM',
    () => gracefulShutdown('SIGTERM')
)


// ============================================================
// START
// ============================================================

startBot().catch(
    error => {

        console.error(
            chalk.red.bold(
                '❌ Fatal startup error:'
            ),
            error
        )
    }
)
