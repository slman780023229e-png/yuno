import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 👑 ملفات نظام النخبة والأونر والجلسة
// =============================

const modeFile = path.join(__dirname, "../data/مود.json");
const eliteFile = path.join(__dirname, "../data/النخبة.json");
const ownerFile = path.join(__dirname, "../data/owner.json");

// =============================
// 🎨 𝐀𝐑𝐓𝐇𝐔𝐑 COLORS (ألوان آرثر الفاخرة)
// =============================

const COLORS = {
    reset: "\x1b[0m",
    gold: "\x1b[38;5;220m",
    green: "\x1b[38;5;46m",
    red: "\x1b[38;5;196m",
    cyan: "\x1b[38;5;51m",
    purple: "\x1b[38;5;141m",
    yellow: "\x1b[38;5;226m",
    blue: "\x1b[38;5;45m",
    white: "\x1b[38;5;255m",
    gray: "\x1b[38;5;245m"
};

function log(type, text) {
    const icons = {
        ok: "✅",
        cmd: "⚡",
        err: "❌",
        elite: "👑"
    };

    const colors = {
        ok: COLORS.green,
        cmd: COLORS.cyan,
        err: COLORS.red,
        elite: COLORS.gold
    };

    console.log(
        `${colors[type] || COLORS.cyan}
╭────────────────────────────────────────╮
│ 🛡️ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 🛡️
├────────────────────────────────────────┤
│ ${icons[type] || "•"} ${text}
╰────────────────────────────────────────╯
${COLORS.reset}`
    );
}

// =============================
// قراءة وضع النخبة
// =============================

function getMode() {
    if (!fs.existsSync(modeFile)) {
        fs.writeFileSync(modeFile, JSON.stringify({ elite: false }, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(modeFile, "utf-8"));
    } catch {
        return { elite: false };
    }
}

// =============================
// 👑 قراءة وإدارة النخبة (مع حماية تامة وحفظ رقم الجلسة)
// =============================

function getElite() {
    if (!fs.existsSync(eliteFile)) {
        fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(eliteFile, "utf-8"));
    } catch {
        return [];
    }
}

function addEliteAutomatically(number) {
    if (!number) return;
    try {
        let eliteList = getElite().map(n => n.toString());
        if (!eliteList.includes(number)) {
            eliteList.push(number);
            fs.writeFileSync(eliteFile, JSON.stringify(eliteList, null, 2));
            log("elite", `تمت إضافة رقم الجلسة (${number}) إلى النخبة تلقائياً 👑`);
        }
    } catch (e) {
        log("err", "فشل إضافة رقم الجلسة للنخبة: " + e.message);
    }
}

// =============================
// 🛡️ قراءة الأونر
// =============================

function getOwner() {
    if (fs.existsSync(ownerFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(ownerFile, "utf-8"));
            if (data.owner) return data.owner.toString().replace(/[^0-9]/g, "");
        } catch {}
    }
    
    if (process.env.OWNER_NUMBER) {
        return process.env.OWNER_NUMBER.replace(/[^0-9]/g, "");
    }

    return "967000000000"; 
}

// =============================
// 🚀 بداية ARTHUR HANDLER الآمنة والمحمية كلياً
// =============================

export async function handleMessages(sock, m) {
    try {
        const start = Date.now();

        // استخراج رقم البوت (رقم الجلسة المتصل حالياً) تلقائياً وضمه للنخبة بلطف ودون أي مساس بملفات الجلسة
        const botJid = sock.user?.id;
        const currentBotNumber = botJid ? botJid.split(":")[0].replace(/[^0-9]/g, "") : "";
        if (currentBotNumber) {
            addEliteAutomatically(currentBotNumber);
        }

        const msg = m.messages?.[0];
        if (!msg || !msg.message) return;

        const jid = msg.key.remoteJid;
        if (!jid) return;

        const isGroup = jid.endsWith("@g.us");
        const isPrivate = jid.endsWith("@s.whatsapp.net");

        // تحديد المرسل بدقة تامة ودعم تفاعل البوت مع نفسه أو غيره
        const sender = msg.key.fromMe 
            ? (currentBotNumber ? currentBotNumber + "@s.whatsapp.net" : (msg.key.participant || jid))
            : (isGroup ? (msg.key.participant || jid) : jid);

        const number = sender.split("@")[0].replace(/[^0-9]/g, "");

        const ownerNumber = getOwner();
        const isOwner = number === ownerNumber;

        // =============================
        // ⚡ جلب البلجنات عبر محمل آرثر المحصن
        // =============================

        const plugins = await loadPlugins(sock);

        // =============================
        // 🔒 تشغيل مستمعات البلجنات
        // =============================

        for (const cmd of plugins) {
            try {
                if (cmd?.onMessage) {
                    await cmd.onMessage(sock, msg, {
                        jid,
                        sender,
                        number,
                        isOwner,
                        ownerNumber,
                        isGroup,
                        isPrivate,
                        message: msg
                    });
                }
            } catch (e) {
                log("err", "Listener Error : " + e.message);
            }
        }

        // =============================
        // 👑 وضع النخبة (البوت والأونر مستثنون دائماً لحماية الجلسة والتحكم)
        // =============================

        const mode = getMode();

        if (mode.elite === true && !isOwner && number !== currentBotNumber) {
            const elite = getElite().map(n => n.toString());

            if (!elite.includes(number)) {
                console.log(
                    `${COLORS.gold}
╭────────────────────────────────────────╮
│ 👑 𝐀𝐑𝐓𝐇𝐔𝐑 𝐄𝐋𝐈𝐓𝐄 𝐌𝐎𝐃𝐄
├────────────────────────────────────────┤
│ 🚫 تم تجاهل الرسالة
│ 👤 الرقم : ${number}
│ ❌ ليس من النخبة
╰────────────────────────────────────────╯
${COLORS.reset}`
                );
                return;
            }
        }

        // =============================
        // 📝 قراءة النص أو الأزرار أو القوائم بذكاء فائق
        // =============================

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message.templateButtonReplyMessage?.selectedId ||
            "";

        if (!text) return;

        // =============================
        // ⚡ تنفيذ الأوامر داخل كبسولة آرثر الملكية المربعة
        // =============================

        for (const cmd of plugins) {
            try {
                if (
                    cmd &&
                    cmd.command &&
                    text.startsWith("." + cmd.command)
                ) {
                    await cmd.execute(sock, msg, {
                        text,
                        jid,
                        sender,
                        number,
                        isOwner,
                        ownerNumber,
                        isGroup,
                        isPrivate
                    });

                    const time = Date.now() - start;

                    console.log(
                        `${COLORS.purple}
╭────────────────────────────────────────╮
│ ⚜ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 ⚜
├────────────────────────────────────────┤
│ ⚡ الأمر : ${cmd.command}
│ 👤 الرقم : ${number} ${number === currentBotNumber ? "(🤖 البوت)" : ""}
│ ⏱ السرعة : ${time}ms
│ 💬 المكان : ${isGroup ? "مجموعة 👥" : "خاص 🔒"}
│ ✅ الحالة : تم التنفيذ بنجاح
╰────────────────────────────────────────╯
${COLORS.reset}`
                    );

                    return;
                }
            } catch (err) {
                log("err", "خطأ في تنفيذ الأمر : " + err.message);
            }
        }

        // =============================
        // ❌ أمر غير موجود (داخل كبسولة التحذير المربعة)
        // =============================

        if (text.startsWith(".")) {
            const time = Date.now() - start;

            console.log(
                `${COLORS.red}
╭────────────────────────────────────────╮
│ ❌ 𝐔𝐍𝐊𝐍𝐎𝐖𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃
├────────────────────────────────────────┤
│ ⚡ الأمر : ${text}
│ 👤 الرقم : ${number} ${number === currentBotNumber ? "(🤖 البوت)" : ""}
│ ⏱ السرعة : ${time}ms
│ 💬 المكان : ${isGroup ? "مجموعة 👥" : "خاص 🔒"}
│ 🔎 الحالة : NOT FOUND
╰────────────────────────────────────────╯
${COLORS.reset}`
            );
        }
    } catch (error) {
        log("err", "Arthur Handler Crash: " + error.message);
    }
}
