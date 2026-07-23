import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import pino from "pino";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

// ================================
// 🌐 KEEP ALIVE SERVER (لابقاء المنصة شغالة)
// ================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("YUNO BOT IS RUNNING 🟢\n");
}).listen(PORT, () => {
    console.log(`🌐 Keep-alive server is listening on port ${PORT}`);
});

// ================================
// 🕒 YUNO LIVE CLOCK
// ================================

setInterval(() => {
    const now = new Date();  
    const time = now.toLocaleTimeString("ar-SA");  
    const date = now.toLocaleDateString("ar-SA");  

    console.log(`🕒 𝐘𝐔𝐍𝐎 | ${date} | ${time} | 🟢 ONLINE`);
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startBot() {
    console.clear();  

    console.log(chalk.magenta(`
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃      𝐘𝐔𝐍𝐎 BOT
┃      Starting...
╰━━━━━━━━━━━━━━━━━━━━━━╯
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

    if (!state.creds.registered) {
        let phone = "967715795639";  
        phone = phone.replace(/[^0-9]/g, "");  

        try {  
            console.log(chalk.cyan("⌛ جاري تجهيز الربط تلقائياً للرقم: " + phone));  
            await sleep(5000);

            const code = await sock.requestPairingCode(phone);

            console.log(`
${chalk.cyan("╔════════════════════════════════════╗")}
${chalk.blue("║                                    ║")}
${chalk.green("║        🔗 𝐘𝐔𝐍𝐎 𝐏𝐀𝐈𝐑𝐈𝐍𝐆 🔗       ║")}
${chalk.blue("║                                    ║")}
${chalk.cyan("╠════════════════════════════════════╣")}
${chalk.white("║                                    ║")}
${chalk.yellow("║ 📱 𝐍𝐔𝐌𝐁𝐄𝐑 : ")}${chalk.bold.white(phone)}
${chalk.white("║                                    ║")}
${chalk.green("║ 🔑 𝐂𝐎𝐃𝐄   : ")}${chalk.bold.green(code)}
${chalk.white("║                                    ║")}
${chalk.magenta("║ ⚡ 𝐒𝐓𝐀𝐓𝐔𝐒 : WAITING             ║")}
${chalk.red("║ 🛡️ 𝐒𝐄𝐂𝐔𝐑𝐈𝐓𝐘 : PROTECTED        ║")}
${chalk.white("║                                    ║")}
${chalk.cyan("╠════════════════════════════════════╣")}
${chalk.yellow("║ WhatsApp > الأجهزة المرتبطة        ║")}
${chalk.yellow("║ اختر ربط جهاز وأدخل الكود          ║")}
${chalk.cyan("╚════════════════════════════════════╝")}
`);

            console.log(chalk.green("╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃ ✅ 𝐘𝐔𝐍𝐎 𝐂𝐎𝐑𝐄 𝐑𝐄𝐀𝐃𝐘   ┃\n┃ 🔗 بانتظار تأكيد الربط   ┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯"));

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
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   𝐘𝐔𝐍𝐎 ONLINE ✅
┃   Connected
╰━━━━━━━━━━━━━━━━━━━━━━╯
`));

            const restartFile = path.join(process.cwd(), "data", "restart.json");

            if (fs.existsSync(restartFile)) {
                try {  
                    const info = JSON.parse(fs.readFileSync(restartFile, "utf8"));  

                    if (Date.now() - info.time < 60000) {  
                        await sock.sendMessage(info.jid, {  
                            text: "╭━━━━━━━━━━━━━━╮\n┃ ✅ تم التشغيل   ┣━━━━━━━━━━━━━━┫\n┃ 👑 𝐘𝐔𝐍𝐎 ONLINE   ┃\n┃ 🚀 تمت إعادة تشغيل البوت بنجاح   ┃\n╰━━━━━━━━━━━━━━╯"
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
                console.log(chalk.red("تم تسجيل الخروج من الحساب"));  
            }  
        }  
    });  

    // ===============================  
    // MESSAGE HANDLER  
    // ===============================  

    sock.ev.on("messages.upsert", async (m) => {  
        try {  
            await handleMessages(sock, m);  
        } catch (err) {  
            console.log(chalk.red("❌ خطأ استقبال الرسالة: " + err.message));  
        }  
    });
}

startBot();
