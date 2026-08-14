import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadPlugins } from "./loader.js";
// استيراد نظام النخبة المنفصل الجديد
import { isElite, addEliteNumber, getEliteNumbers } from "./eliteManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// 👑 ملفات نظام الأونر والمود
// =============================

const modeFile = path.join(__dirname, "../data/مود.json");
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
    try {
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
    } catch {}
}

// =============================
// 🔍 دالة استخراج الرقم النقي (متوافقة تماماً)
// =============================
export const extractPureNumber = (jid) => {
    try {
        if (!jid) return "";
        return jid.toString().replace(/[@:].*/g, "").replace(/\D/g, "");
    } catch {
        return "";
    }
};

// =============================
// قراءة وضع النخبة (مع التخزين المؤقت الذكي)
// =============================

let cachedMode = null;
let lastModeCheck = 0;

function getMode() {
    try {
        const now = Date.now();
        if (cachedMode && (now - lastModeCheck < 5000)) {
            return cachedMode;
        }
        if (!fs.existsSync(modeFile)) {
            try {
                fs.writeFileSync(modeFile, JSON.stringify({ elite: false }, null, 2));
            } catch {}
        }
        cachedMode = JSON.parse(fs.readFileSync(modeFile, "utf-8"));
        lastModeCheck = now;
        return cachedMode;
    } catch {
        return { elite: false };
    }
}

// =============================
// 🛡️ قراءة الأونر (تخزين مؤقت للسرعة)
// =============================

let cachedOwner = null;
function getOwner() {
    try {
        if (cachedOwner) return cachedOwner;

        if (fs.existsSync(ownerFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(ownerFile, "utf-8"));
                if (data.owner) {
                    cachedOwner = extractPureNumber(data.owner);
                    return cachedOwner;
                }
            } catch {}
        }
        
        if (process.env.OWNER_NUMBER) {
            cachedOwner = extractPureNumber(process.env.OWNER_NUMBER);
            return cachedOwner;
        }

        return "967000000000"; 
    } catch {
        return "967000000000";
    }
}

// =============================
// 🔍 نظام مطابقة الأرقام الخارق (فائق السرعة)
// =============================
function isSameNumber(num1, num2) {
    try {
        if (!num1 || !num2) return false;
        const clean1 = extractPureNumber(num1);
        const clean2 = extractPureNumber(num2);
        if (!clean1 || !clean2) return false;
        
        if (clean1.length < 3 || clean2.length < 3) {
            return clean1 === clean2;
        }

        return (
            clean1 === clean2 || 
            clean1.endsWith(clean2) || 
            clean2.endsWith(clean1) ||
            clean1.includes(clean2) ||
            clean2.includes(clean1)
        );
    } catch {
        return false;
    }
}

// =============================
// 🚀 نظام طابور العمليات المتزامنة (Queue Handler فائق السرعة - منع تعليق تام)
// =============================

const messageQueue = [];
let isProcessingQueue = false;

async function processQueue(sock) {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    while (messageQueue.length > 0) {
        const item = messageQueue.shift();
        if (!item) continue;
        const { sockInstance, m } = item;
        try {
            await executeHandlerLogic(sockInstance, m);
        } catch (err) {}
    }

    isProcessingQueue = false;
}

export async function handleMessages(sock, m) {
    try {
        if (messageQueue.length > 2000) {
            messageQueue.splice(0, 500);
        }
        messageQueue.push({ sockInstance: sock, m });
        setImmediate(() => processQueue(sock).catch(() => {}));
    } catch {}
}

// =============================
// ⚡ المنطق الأساسي للـ Handler المعالج للرسائل والأوامر
// =============================

async function executeHandlerLogic(sock, m) {
    try {
        const start = Date.now();

        const botJid = sock.user?.id;
        const currentBotNumber = extractPureNumber(botJid);
        
        // إضافة رقم الجلسة تلقائياً عبر الملف الخارجي الجديد بشكل نظيف
        if (currentBotNumber) {
            setImmediate(() => {
                try {
                    addEliteNumber(currentBotNumber);
                } catch {}
            });
        }

        const msg = m.messages?.[0];
        if (!msg || !msg.message) return;

        const jid = msg.key.remoteJid;
        if (!jid) return;

        const isGroup = jid.endsWith("@g.us");
        const isPrivate = jid.endsWith("@s.whatsapp.net");

        const sender = msg.key.fromMe 
            ? (currentBotNumber ? currentBotNumber + "@s.whatsapp.net" : (msg.key.participant || jid))
            : (isGroup ? (msg.key.participant || jid) : jid);

        const number = extractPureNumber(sender);

        const ownerNumber = getOwner();
        const isOwner = isSameNumber(number, ownerNumber);

        // التحقق من النخبة والأونر وبوت الجلسة باستخدام الملف الخارجي
        const isEliteUser = isOwner || isSameNumber(number, currentBotNumber) || isElite(number);

        // =============================
        // ⚡ جلب البلجنات (بأقصى سرعة مع معالجة الأخطاء)
        // =============================

        let plugins = [];
        try {
            plugins = await loadPlugins(sock);
        } catch {
            plugins = [];
        }

        // =============================
        // 🔒 تشغيل مستمعات البلجنات (بشكل متوازي غير معرقل نهائياً)
        // =============================

        if (plugins && plugins.length > 0) {
            for (let i = 0; i < plugins.length; i++) {
                const cmd = plugins[i];
                try {
                    if (cmd?.onMessage) {
                        Promise.resolve(cmd.onMessage(sock, msg, {
                            jid,
                            sender,
                            number,
                            isOwner,
                            ownerNumber,
                            isGroup,
                            isPrivate,
                            message: msg,
                            isElite: isEliteUser
                        })).catch(() => {});
                    }
                } catch {}
            }
        }

        // =============================
        // 👑 وضع النخبة العام
        // =============================

        const mode = getMode();

        if (mode.elite === true && !isOwner && !isSameNumber(number, currentBotNumber)) {
            if (!isEliteUser) {
                return;
            }
        }

        // =============================
        // 📝 قراءة النص أو الأزرار أو القوائم بذكاء فائق وسرعة
        // =============================

        const rawText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message.templateButtonReplyMessage?.selectedId ||
            "";

        if (!rawText) return;

        const text = String(rawText).trim();
        const hasPrefix = /^[./\\#,!^&+=]/.test(text);
        const noPrefixText = text.replace(/^[./\\#,!^&+=]/, "").trim();
        const commandName = noPrefixText.split(" ")[0].toLowerCase();

        // =============================
        // ⚡ تنفيذ الأوامر بكفاءة خارقة وسرعة قصوى
        // =============================

        for (let i = 0; i < plugins.length; i++) {
            const cmd = plugins[i];
            try {
                if (cmd && cmd.command) {
                    const validCmds = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
                    const isMatched = validCmds.some(c => c && c.toLowerCase() === commandName);

                    if (isMatched) {
                        if (!hasPrefix && !isEliteUser) {
                            return; 
                        }

                        await cmd.execute(sock, msg, {
                            text,
                            noPrefixText,
                            commandName,
                            jid,
                            sender,
                            number,
                            isOwner,
                            ownerNumber,
                            isGroup,
                            isPrivate,
                            hasPrefix,
                            isElite: isEliteUser
                        });

                        const time = Date.now() - start;

                        try {
                            console.log(
                                `${COLORS.purple}
╭────────────────────────────────────────╮
│ ⚜ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 ⚜
├────────────────────────────────────────┤
│ ⚡ الأمر : ${commandName}
│ 👤 الرقم : ${number} ${isSameNumber(number, currentBotNumber) ? "(🤖 البوت)" : ""}
│ ⏱ السرعة : ${time}ms
│ 💬 المكان : ${isGroup ? "مجموعة 👥" : "خاص 🔒"}
│ ✅ الحالة : تم التنفيذ بنجاح (${hasPrefix ? "مع بادئة" : "بدون بادئة 👑"})
╰────────────────────────────────────────╯
${COLORS.reset}`
                            );
                        } catch {}

                        return;
                    }
                }
            } catch (err) {}
        }

    } catch (error) {}
    }
