Import { handleMessages } from "./utils/handler.js";
import { loadPlugins } from "./utils/loader.js";
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { MongoClient } from "mongodb";
import { useMongoDBAuthState } from "baileys-mongodb"; // أو حفظ الجلسة السحابي

import pino from "pino";
import chalk from "chalk";
import express from "express";

// ================================
// 🌐 RENDER KEEP-ALIVE SERVER
// ================================
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("YUNO BOT IS ONLINE!"));
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));

// ضع رابط مونغودي الخاص بك هنا (أو عبر Environment Variables في Render)
const MONGO_URI = process.env.MONGO_URI || "رابط_مونغودي_هنا";
const COLLECTION_NAME = "yuno_session";

async function startBot() {
    console.clear();
    console.log(chalk.magenta(`
╔════════════════════════════════════╗
║             𝐘𝐔𝐍𝐎 BOT             ║
║     Connecting via MongoDB...      ║
╚════════════════════════════════════╝
`));

    // الاتصال بقاعدة بيانات مونغودي لحفظ الجلسة سحابياً
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const db = mongoClient.db("YunoBotDB");
    const { state, saveCreds } = await useMongoDBAuthState(db.collection(COLLECTION_NAME));

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.04.0"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    if (!state.creds.registered) {
        let phone = "967715795639";
        phone = phone.replace(/[^0-9]/g, "");

        try {
            console.log(chalk.cyan("⌛ جاري تجهيز الربط..."));
            await new Promise(resolve => setTimeout(resolve, 5000));
            const code = await sock.requestPairingCode(phone);
            console.log(`🔑 𝐂𝐎𝐃𝐄 : ${code}`);
        } catch (err) {
            console.log(chalk.red("❌ فشل كود الربط: " + err.message));
        }
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log(chalk.green("✅ 𝐘𝐔𝐍𝐎 ONLINE & Connected to MongoDB!"));
            try {
                await loadPlugins(sock);
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
                console.log(chalk.red("تم تسجيل الخروج من الحساب، يلزم مسح قاعدة البيانات للربط من جديد."));
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
