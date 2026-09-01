import serialize from "./utils/serialize.js";
import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
import { Button, ButtonV2, Carousel, AIRich, Toolkit } from "./utils/nixcode.js";
import "./utils/memory-cleaner.js"; // 🛡️ استدعاء وتشغيل نظام مراقبة وتنظيف الذاكرة تلقائياً
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys";

import pino from "pino";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 🛡️ مسار مجلد الجلسة المحلي (بدون الاعتماد على ملفات utils)
// ==========================================
const sessionDir = path.join(__dirname, "ملف_الاتصال");
await fs.ensureDir(sessionDir);

// ================================
// 🌐 KEEP ALIVE SERVER (معدل لمنع خمول المعالج)
// ================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    try {
        fs.existsSync("./package.json");
    } catch {}

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ARTHUR BOT IS RUNNING 🟢\n");
}).listen(PORT, () => {
    console.log(`🌐 Keep-alive server is listening on port ${PORT}`);
});

// ================================
// 🕒 ARTHUR LIVE CLOCK
// ================================

setInterval(() => {
    const now = new Date();  
    const time = now.toLocaleTimeString("ar-SA");  
    const date = now.toLocaleDateString("ar-SA");  

    console.log(`🕒 𝐀𝐑𝐓𝐇𝐔𝐑 | ${date} | ${time} | 🟢 ONLINE`);
}, 60000);

process.on("unhandledRejection", (err) => {
    if (err && String(err).includes("Bad MAC")) {
        console.log("⚠️ تجاهل خطأ Bad MAC");
        return;
    }
    console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    if (err && String(err).includes("Bad MAC")) {
        console.log("⚠️ تجاهل خطأ Bad MAC");
        return;
    }
    console.error("Uncaught Exception:", err);
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startBot() {
    console.clear();  

    console.log(chalk.magenta(`
╔════════════════════════════════════╗
║         👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 👑          ║
║         System Initializing...     ║
╚════════════════════════════════════╝
`));

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);  
    const { version } = await fetchLatestBaileysVersion();  

    const sock = makeWASocket({  
        version,  
        auth: state,  
        logger: pino({ level: "silent" }),  
        browser: ["MacOs", "Chrome", "1.0.0"],  
        markOnlineOnConnect: true,  
        generateHighQualityLinkPreview: true,  
        syncFullHistory: false  
    });  

    sock.ev.on("creds.update", saveCreds);  

    let activePlugins = [];

    async function getActivePlugins() {
        if (activePlugins.length === 0) {
            try {
                activePlugins = await loadPlugins(sock);
            } catch (err) {
                console.log(chalk.red("❌ خطأ تحميل البلجنات: " + err.message));
                activePlugins = [];
            }
        }
        return activePlugins;
    }

    // ==========================================
    // 🔘 دالة الأزرار الحقيقية والمتخطية للقيود
    // ==========================================
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
    };

    global.NixCode = { Button, ButtonV2, Carousel, AIRich, Toolkit };
    global.sock = sock;

    if (!state.creds.registered) {
        let phone = "967783028397";  
        phone = phone.replace(/[^0-9]/g, "");  

        try {  
            console.log(chalk.cyan("⌛ جاري تجهيز الربط تلقائياً للرقم: " + phone));  
            await sleep(5000);

            const code = await sock.requestPairingCode(phone);

            console.log(`
${chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.green("        👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐏𝐀𝐈𝐑𝐈𝐍𝐆 👑        ")}
${chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.white(" 📱 NUMBER : ")}${chalk.bold.white(phone)}
${chalk.green(" 🔑 CODE   : ")}${chalk.bold.green(code)}
${chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${chalk.yellow(" WhatsApp > الأجهزة المرتبطة")}
${chalk.yellow(" اختر ربط جهاز وأدخل الكود")}
${chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
`);

            console.log(chalk.green("╔════════════════════════════╗\n║ 👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐂𝐎𝐑𝐄 𝐑𝐄𝐀𝐃𝐘     ║\n║ 🔗 بانتظار تأكيد الربط     ║\n╚════════════════════════════╝"));

        } catch (err) {  
            console.log(chalk.red("❌ فشل كود الربط: " + err.message));  
        }  
    }  

    sock.ev.on("connection.update", async (update) => {  
        const { connection, lastDisconnect } = update;  

        if (connection === "connecting") {  
            console.log(chalk.yellow("⏳ جاري الاتصال..."));  
        }  

        if (connection === "open") {  
            console.log(chalk.green(`
╔════════════════════════════╗
║   👑 𝐀𝐑𝐓𝐇𝐔𝐑 ONLINE ✅     ║
║   Successfully Connected   ║
╚════════════════════════════╝
`));

            const restartFile = path.join(process.cwd(), "data", "restart.json");

            if (fs.existsSync(restartFile)) {
                try {  
                    const info = JSON.parse(fs.readFileSync(restartFile, "utf8"));  

                    if (Date.now() - info.time < 60000) {  
                        await sock.sendMessage(info.jid, {  
                            text: "◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n║ 👑 ✅ تم التشغيل بنجاح     ◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n║ *𝚫𝚪𝚻𝚮𝚼𝚪 • 𝚩𝚯𝚻*        ║\n║ 🚀 تمت إعادة تشغيل البوت   ║\n◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*"
                        });
                    }  

                    fs.unlinkSync(restartFile);  
                } catch (err) {  
                    console.log("Restart Message Error:", err.message);  
                }
            }

            await getActivePlugins();
            console.log(chalk.green("✅ تم تحميل البلجنات بنجاح"));
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;  
            console.log(chalk.red("❌ Connection closed : " + reason));  

            if (reason !== DisconnectReason.loggedOut) {  
                console.log(chalk.yellow("🔄 إعادة الاتصال..."));  
                setTimeout(startBot, 3000);  
            } else {  
                console.log(chalk.red("تم تسجيل الخروج من الحساب"));  
            }  
        }  
    });  

    // ===============================  
    // MESSAGE HANDLER  
    // ===============================  

    sock.ev.on("messages.upsert", async (chatUpdate) => {  
        try {  
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;

            serialize(sock, mek);  
            await handleMessages(sock, chatUpdate);  
        } catch (err) {  
            console.log(chalk.red("❌ خطأ استقبال الرسالة: " + err.message));  
        }  
    });

    // ===============================
    // 👥 GROUP EVENTS FOR ALL PLUGINS
    // ===============================

    sock.ev.on("group-participants.update", async (update) => {
        try {
            const plugins = await getActivePlugins();

            for (const plugin of plugins) {
                if (plugin.onGroupParticipantsUpdate) {
                    await plugin.onGroupParticipantsUpdate(sock, update);
                }
            }
        } catch (e) {
            console.log("Group Participants Update Error:", e.message);
        }
    });

    // ===============================
    // 🔗 GROUP JOIN REQUESTS EVENT
    // ===============================

    sock.ev.on("group.join-request", async (update) => {
        try {
            const plugins = await getActivePlugins();

            for (const plugin of plugins) {
                if (typeof plugin.onGroupJoinRequest === "function") {
                    await plugin.onGroupJoinRequest(sock, update);
                }
            }
        } catch (e) {
            console.log("Group Join Request Error:", e.message);
        }
    });
}

startBot();
