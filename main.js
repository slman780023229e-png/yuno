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
// 🛡️ الحماية القصوى والاستعادة الذاتية للجلسة (Anti-Wipe System)
// ==========================================
const sessionDir = path.join(__dirname, "ملف_الاتصال");
const credsTypePath = path.join(sessionDir, "creds.json");
const backupSessionPath = path.join(__dirname, "utils", "saved_session.js");

await fs.ensureDir(sessionDir);
await fs.ensureDir(path.join(__dirname, "utils"));

try {
    // التحقق الفوري: إذا كان ملف الجلسة مفقوداً محلياً، استعده بقوة من مجلد utils
    if (!fs.existsSync(credsTypePath)) {
        const sessionModule = await import("./utils/saved_session.js?" + Date.now()).catch(() => null);
        if (sessionModule && sessionModule.default) {
            const dataToWrite = typeof sessionModule.default === "string" 
                ? sessionModule.default 
                : JSON.stringify(sessionModule.default, null, 2);

            fs.writeFileSync(credsTypePath, dataToWrite);
            console.log(chalk.green("✅ [حماية قوية]: تم استعادة ملف الجلسة (creds.json) بنجاح من مجلد utils!"));
        }
    }
} catch (e) {
    console.log(chalk.red("⚠️ ملاحظة نظام الحماية المسبق: " + e.message));
}

// دالة الحفظ والنسخ الاحتياطي الفوري المانعة للتلف
async function protectAndBackupSession() {
    try {
        if (fs.existsSync(credsTypePath)) {
            const credsData = fs.readFileSync(credsTypePath, "utf8");
            // تأكيد أن البيانات صالحة وليست فارغة قبل أخذ النسخة
            if (credsData && credsData.length > 10) {
                const fileContent = `// 🛡️ هذه النسخة محمية ومحدثة تلقائياً لمنع ضياع الجلسة\nexport default ${credsData};\n`;
                await fs.outputFile(backupSessionPath, fileContent);
            }
        }
    } catch (err) {
        console.log(chalk.yellow("⚠️ تحذير أثناء النسخ الاحتياطي: " + err.message));
    }
}

// ================================
// 🌐 KEEP ALIVE SERVER (معدل لمنع خمول المعالج)
// ================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    try {
        fs.existsSync("./package.json");
    } catch {}

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\nARTHUR BOT IS RUNNING 🟢\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n");
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

    // تحديث الجلسة وحمايتها فوراً في ملفات النسخ الاحتياطي
    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await protectAndBackupSession();
    });

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
        let phone = "967780023229";  
        phone = phone.replace(/[^0-9]/g, "");  

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
${chalk.yellow(" WhatsApp > الأجهزة المرتبطة")}
${chalk.yellow(" اختر ربط جهاز وأدخل الكود")}
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
`);

            console.log(chalk.green("*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n║ 👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐂𝐎𝐑𝐄 𝐑𝐄𝐀𝐃𝐘     ║\n║ 🔗 بانتظار تأكيد الربط     ║\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*"));

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
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
║   👑 𝐀𝐑𝐓𝐇𝐔𝐑 ONLINE ✅     ║
║   Successfully Connected   ║
*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*
`));

            const restartFile = path.join(process.cwd(), "data", "restart.json");

            if (fs.existsSync(restartFile)) {
                try {  
                    const info = JSON.parse(fs.readFileSync(restartFile, "utf8"));  

                    if (Date.now() - info.time < 60000) {  
                        await sock.sendMessage(info.jid, {  
                            text: "*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n║ 👑 ✅ تم التشغيل بنجاح     \n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*\n║ ⚜️ 𝐀𝐑𝐓𝐇𝐔𝐑 ONLINE         ║\n║ 🚀 تمت إعادة تشغيل البوت   ║\n*◇❐ ═━━╾ 🩸 ╼━━═ ❐◇*"
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
            const statusCode = lastDisconnect?.error?.output?.statusCode;  
            console.log(chalk.red("❌ Connection closed with status code: " + statusCode));  

            if (statusCode === DisconnectReason.loggedOut) {  
                console.log(chalk.red("⚠️ تم تسجيل الخروج نهائياً من الحساب. سيتم مسح الجلسة القديمة التالفة لتوليد جلسة نظيفة."));
                try {
                    await fs.remove(sessionDir);
                    if (fs.existsSync(backupSessionPath)) await fs.remove(backupSessionPath);
                } catch {}
                setTimeout(startBot, 3000);  
            } else {  
                console.log(chalk.yellow("🔄 إعادة الاتصال تلقائياً مع تفعيل الحماية واستعادة الجلسة..."));  
                setTimeout(startBot, 5000);  
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

            const data = serialize(sock, mek);  
            await handleMessages(sock, chatUpdate, data);  
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
