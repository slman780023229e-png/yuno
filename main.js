import serialize from "./utils/serialize.js";
import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
import { Button, ButtonV2, Carousel, AIRich, Toolkit } from "./utils/nixcode.js";
import "./utils/memory-cleaner.js";
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

// مسار مجلد الجلسة الثابت والنظيف
const sessionDir = path.join(__dirname, "ملف_الاتصال");
await fs.ensureDir(sessionDir);

// ================================
// 🌐 KEEP ALIVE SERVER
// ================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
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
    if (err && String(err).includes("Bad MAC")) return;
    console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    if (err && String(err).includes("Bad MAC")) return;
    console.error("Uncaught Exception:", err);
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startBot() {
    console.clear();  

    console.log(chalk.magenta(`
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
║         👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 👑          ║
║         System Initializing...     ║
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
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

    // حفظ بيانات الجلسة مباشرة ودون أي تداخل
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

    sock.sendRealButtons = async (jid, text, footerText, buttonsArray) => {
        try {
            const btn = new Button(sock);
            btn.setBody(`*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n${text}\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*`);
            if (footerText) btn.setFooter(`✦ 🩸 ${footerText} 🩸 ✦`);

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
                    body: proto.Message.InteractiveMessage.Body.create({ text: `*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n${text}\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*` }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: footerText || "✦ 🩸 ARTHUR BOT 🩸 ✦" }),
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
                additionalNodes: [{ tag: "biz", attrs: {}, content: [{ tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { name: "quick_reply" } }] }] }]
            });
        }
    };

    global.NixCode = { Button, ButtonV2, Carousel, AIRich, Toolkit };
    global.sock = sock;

    if (!state.creds.registered) {
        let phone = "967780023229".replace(/[^0-9]/g, "");  

        try {  
            console.log(chalk.cyan("⌛ جاري تجهيز الربط تلقائياً للرقم: " + phone));  
            await sleep(5000);

            const code = await sock.requestPairingCode(phone);

            console.log(`
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
${chalk.green("        👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐏𝐀𝐈𝐑𝐈𝐍𝐆 👑        ")}
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
${chalk.white(" 📱 NUMBER : ")}${chalk.bold.white(phone)}
${chalk.green(" 🔑 CODE   : ")}${chalk.bold.green(code)}
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
`);
        } catch (err) {  
            console.log(chalk.red("❌ فشل كود الربط: " + err.message));  
        }  
    }  

    sock.ev.on("connection.update", async (update) => {  
        const { connection, lastDisconnect } = update;  

        if (connection === "open") {  
            console.log(chalk.green(`
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
║   👑 𝐀𝐑𝐓𝐇𝐔𝐑 ONLINE ✅     ║
║   Successfully Connected   ║
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
`));
            await getActivePlugins();
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;  
            console.log(chalk.red("❌ Connection closed with status code: " + statusCode));  

            if (statusCode === DisconnectReason.loggedOut) {  
                console.log(chalk.red("⚠️ تم تسجيل الخروج. جاري مسح الجلسة..."));
                await fs.remove(sessionDir);
                setTimeout(startBot, 3000);  
            } else {  
                setTimeout(startBot, 5000);  
            }  
        }  
    });  

    sock.ev.on("messages.upsert", async (chatUpdate) => {  
        try {  
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            await handleMessages(sock, chatUpdate);  
        } catch (err) {  
            console.log(chalk.red("❌ خطأ استقبال الرسالة: " + err.message));  
        }  
    });

    sock.ev.on("group-participants.update", async (update) => {
        try {
            const plugins = await getActivePlugins();
            for (const plugin of plugins) {
                if (plugin.onGroupParticipantsUpdate) await plugin.onGroupParticipantsUpdate(sock, update);
            }
        } catch (e) {}
    });

    sock.ev.on("group.join-request", async (update) => {
        try {
            const plugins = await getActivePlugins();
            for (const plugin of plugins) {
                if (typeof plugin.onGroupJoinRequest === "function") await plugin.onGroupJoinRequest(sock, update);
            }
        } catch (e) {}
    });
}

startBot();
