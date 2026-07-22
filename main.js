import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { useFirebaseAuthState } from "./firebase-store.js";

import pino from "pino";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

// ================================
// 🌐 RENDER KEEP-ALIVE SERVER & SELF-PING
// ================================
import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("✨ YUNO BOT IS ONLINE & ACTIVE! ✨"));

app.listen(PORT, () => {
    console.log(`🌐 [KEEP-ALIVE] Server listening on port ${PORT}`);
});

// حلقة ذاتية لإبقاء البوت مستيقظاً على ريندر (تمنع النوم)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
setInterval(() => {
    http.get(RENDER_URL, (res) => {
        console.log(`🔄 [KEEP-ALIVE] Pinged self | Status: ${res.statusCode}`);
    }).on("error", (err) => {
        console.log(`⚠️ [KEEP-ALIVE] Ping error: ${err.message}`);
    });
}, 600000); // كل 10 دقائق

// ================================
// 🕒 YUNO LIVE CLOCK
// ================================
setInterval(() => {
    const now = new Date();
    const time = now.toLocaleTimeString("ar-SA");
    const date = now.toLocaleDateString("ar-SA");
    console.log(`🕒 [YUNO] ❯❯ ${date} ── ${time} ── 🟢 ONLINE`);
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
╔════════════════════════════════════╗
║          ✨ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ✨          ║
║         Starting System...         ║
╚════════════════════════════════════╝
`));

    // ربط الجلسة بقاعدة بيانات فايربيس سحابياً
    const { state, saveCreds } = await useFirebaseAuthState("yuno_session");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: [
            "MacOs",
            "Chrome",
            "1.0.0"
        ],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered) {
        console.log(chalk.cyan("\n⏳ جاري إدخال الرقم وتجهيز كود الربط..."));

        let phone = "967715795639";
        phone = phone.replace(/[^0-9]/g, "");

        try {
            await sleep(6000);
            const code = await sock.requestPairingCode(phone);

            console.log(`
╭────────────────────────────────────╮
│        💎 𝐘𝐔𝐍𝐎 𝐏𝐀𝐈𝐑𝐈𝐍𝐆 💎        │
├────────────────────────────────────┤
│ 📱 𝐍𝐔𝐌𝐁𝐄𝐑 : ${phone}                │
│ 🔑 𝐂𝐎𝐃𝐄   : ${code}                │
╰────────────────────────────────────╯
`);
            console.log(chalk.green("✨ بانتظار تأكيد الربط من تطبيق واتساب..."));

        } catch (err) {
            console.log(chalk.red("❌ فشل كود الربط: " + err.message));
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log(chalk.yellow("⏳ جاري الاتصال بالخادم..."));
        }

        if (connection === "open") {
            console.log(chalk.green(`
╭────────────────────────────────────╮
│          🚀 𝐘𝐔𝐍𝐎 ONLINE            │
│       Connected Successfully       │
╰────────────────────────────────────╯
`));

            const restartFile = path.join(
                process.cwd(),
                "data",
                "restart.json"
            );

            if (fs.existsSync(restartFile)) {
                try {
                    const info = JSON.parse(
                        fs.readFileSync(restartFile, "utf8")
                    );

                    if (Date.now() - info.time < 60000) {
                        await sock.sendMessage(
                            info.jid,
                            {
                                text: "╭━━━━━━[ 🚀 ]━━━━━━╮\n✨ **𝐘𝐔𝐍𝐎 ONLINE**\n🚀 تمت إعادة تشغيل البوت بنجاح\n╰━━━━━━━━━━━━━━━━━━╯"
                            }
                        );
                    }
                    fs.unlinkSync(restartFile);
                } catch (err) {
                    console.log("Restart Message Error:", err.message);
                }
            }

            try {
                await loadPlugins(sock);
                console.log(chalk.green("📂 تم تحميل البلجنات بنجاح ✨"));
            } catch (err) {
                console.log(chalk.red("❌ خطأ تحميل البلجنات: " + err.message));
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red("❌ انقطع الاتصال | الكود : " + reason));

            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow("🔄 جاري إعادة الاتصال تلقائياً..."));
                setTimeout(startBot, 3000);
            } else {
                console.log(chalk.red("⚠️ تم تسجيل الخروج من الحساب."));
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
}

startBot();
