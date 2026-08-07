import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
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

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ARTHUR BOT IS RUNNING 🟢\n");
}).listen(PORT, () => {
    console.log(chalk.gray(`[KEEP-ALIVE] Server is listening on port ${PORT}`));
});

setInterval(() => {
    const now = new Date();  
    const time = now.toLocaleTimeString("ar-SA");  
    const date = now.toLocaleDateString("ar-SA");  

    console.log(chalk.blue(`[ARTHUR CLOCK] ${date} - ${time} | 🟢 ONLINE`));
}, 60000);

process.on("unhandledRejection", (err) => {
    if (err && String(err).includes("Bad MAC")) {
        console.log(chalk.yellow("[WARN] تجاهل خطأ Bad MAC"));
        return;
    }
    console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
    if (err && String(err).includes("Bad MAC")) {
        console.log(chalk.yellow("[WARN] تجاهل خطأ Bad MAC"));
        return;
    }
    console.error("Uncaught Exception:", err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startBot() {
    console.clear();  

    console.log(chalk.magenta(`
┌─────────────────────────────────┐
│         👑 ARTHUR BOT 👑        │
│      System Initializing...     │
└─────────────────────────────────┘
`));

    const sessionDir = path.join(__dirname, "ملف_الاتصال");  
    await fs.ensureDir(sessionDir);  

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

    sock.sendRealButtons = async (jid, text, footerText, buttonsArray) => {
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
    };

    global.sock = sock;

    if (!state.creds.registered) {
        let phone = "967714084466";  
        phone = phone.replace(/[^0-9]/g, "");  

        try {  
            console.log(chalk.cyan("⌛ جاري تجهيز الربط تلقائياً للرقم: " + phone));  
            await sleep(5000);

            const code = await sock.requestPairingCode(phone);

            console.log(`
${chalk.bold.yellow("========================================")}
${chalk.bold.green("   👑 ARTHUR PAIRING CODE 👑")}
${chalk.bold.yellow("========================================")}
${chalk.bold.white(" 📱 الرقم : " + phone)}
${chalk.bold.cyan(" 🔑 الكود : " + code)}
${chalk.bold.yellow("========================================")}
`);

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
┌─────────────────────────────────┐
│        👑 ARTHUR ONLINE ✅      │
│      Successfully Connected     │
└─────────────────────────────────┘
`));

            const restartFile = path.join(process.cwd(), "data", "restart.json");

            if (fs.existsSync(restartFile)) {
                try {  
                    const info = JSON.parse(fs.readFileSync(restartFile, "utf8"));  

                    if (Date.now() - info.time < 60000) {  
                        await sock.sendMessage(info.jid, {  
                            text: "👑 *ARTHUR ONLINE* ✅\n🚀 تمت إعادة تشغيل البوت بنجاح."
                        });
                    }  

                    fs.unlinkSync(restartFile);  
                } catch (err) {  
                    console.log("Restart Message Error:", err.message);  
                }
            }

            try {
                await loadPlugins(sock);
                console.log(chalk.green("✅ تم تحميل البلجنات بنجاح"));
            } catch (err) {  
                console.log(chalk.red("❌ خطأ تحميل البلجنات: " + err.message));  
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;  
            console.log(chalk.red("❌ Connection closed : " + reason));  

            if (reason !== DisconnectReason.loggedOut) {  
                console.log(chalk.yellow("🔄 إعادة الاتصال..."));  
                setTimeout(startBot, 3000);  
            } else {  
                console.log(chalk.red("❌ تم تسجيل الخروج من الحساب"));  
            }  
        }  
    });  

    sock.ev.on("messages.upsert", async (m) => {  
        try {  
            await handleMessages(sock, m);  
        } catch (err) {  
            console.log(chalk.red("❌ خطأ استقبال الرسالة: " + err.message));  
        }  
    });

    sock.ev.on(
        "group-participants.update",
        async (update) => {
            try {
                const plugins = await loadPlugins(sock);

                for (const plugin of plugins) {
                    if (plugin.onGroupParticipantsUpdate) {
                        await plugin.onGroupParticipantsUpdate(
                            sock,
                            update
                        );
                    }
                }
            } catch (e) {
                console.log(
                    "Group Participants Update Error:",
                    e.message
                );
            }
        }
    );

    sock.ev.on("group.join-request", async (update) => {
        try {
            const plugins = await loadPlugins(sock);

            for (const plugin of plugins) {
                if (typeof plugin.onGroupJoinRequest === "function") {
                    await plugin.onGroupJoinRequest(sock, update);
                }
            }
        } catch (e) {
            console.log(
                "Group Join Request Error:",
                e.message
            );
        }
    });
}

startBot();
