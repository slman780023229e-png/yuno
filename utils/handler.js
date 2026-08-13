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
// قراءة وضع النخبة (مع التخزين المؤقت لمنع الضغط)
// =============================

let cachedMode = null;
let lastModeCheck = 0;

function getMode() {
    const now = Date.now();
    if (cachedMode && (now - lastModeCheck < 2000)) {
        return cachedMode;
    }
    if (!fs.existsSync(modeFile)) {
        try {
            fs.writeFileSync(modeFile, JSON.stringify({ elite: false }, null, 2));
        } catch {}
    }
    try {
        cachedMode = JSON.parse(fs.readFileSync(modeFile, "utf-8"));
        lastModeCheck = now;
        return cachedMode;
    } catch {
        return { elite: false };
    }
}

// =============================
// 👑 قراءة وإدارة النخبة الفائقة (دعم التزامن والكتابة الآمنة)
// =============================

let eliteCache = null;
let lastEliteCheck = 0;

function getElite() {
    const now = Date.now();
    if (eliteCache && (now - lastEliteCheck < 3000)) {
        return eliteCache;
    }

    if (!fs.existsSync(eliteFile)) {
        try {
            fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
        } catch {}
    }
    try {
        const fileContent = fs.readFileSync(eliteFile, "utf-8");
        if (!fileContent.trim()) return [];

        const data = JSON.parse(fileContent);
        let eliteNumbers = [];
        
        if (Array.isArray(data)) {
            eliteNumbers = data.map(n => {
                if (typeof n === "object" && n !== null) {
                    return String(n.number || n.id || "").replace(/\D/g, "");
                }
                return String(n).replace(/\D/g, "");
            });
        } else if (typeof data === "object" && data !== null) {
            const stringified = JSON.stringify(data);
            eliteNumbers = stringified.match(/[0-9]+/g) || [];
        } else {
            eliteNumbers = fileContent.match(/[0-9]+/g) || [];
        }

        eliteCache = eliteNumbers.filter(Boolean);
        lastEliteCheck = now;
        return eliteCache;
    } catch {
        return eliteCache || [];
    }
}

let isWritingElite = false;
function addEliteAutomatically(number) {
    if (!number || isWritingElite) return;
    try {
        const cleanNum = String(number).replace(/\D/g, "");
        if (!cleanNum) return;

        let eliteList = [];
        if (fs.existsSync(eliteFile)) {
            try {
                const content = fs.readFileSync(eliteFile, "utf-8");
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    eliteList = parsed;
                }
            } catch {}
        }

        const exists = eliteList.some(n => {
            const str = typeof n === "object" && n !== null ? String(n.number || "") : String(n);
            return str.replace(/\D/g, "") === cleanNum;
        });

        if (!exists) {
            isWritingElite = true;
            eliteList.push({
                number: cleanNum,
                type: "SYSTEM_BOT",
                label: "🤖 بوت آرثر الرسمي"
            });
            fs.writeFileSync(eliteFile, JSON.stringify(eliteList, null, 2));
            eliteCache = null; // إعادة تعيين الكاش لتحديث البيانات فوراً
            isWritingElite = false;
            log("elite", `تمت إضافة رقم الجلسة (${cleanNum}) إلى النخبة بصيغة نظام بوت مميزة 👑`);
        }
    } catch (e) {
        isWritingElite = false;
        log("err", "فشل إضافة رقم الجلسة للنخبة: " + e.message);
    }
}

// =============================
// 🛡️ قراءة الأونر (مع التخزين المؤقت للسرعة القصوى)
// =============================

let cachedOwner = null;
function getOwner() {
    if (cachedOwner) return cachedOwner;

    if (fs.existsSync(ownerFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(ownerFile, "utf-8"));
            if (data.owner) {
                cachedOwner = String(data.owner).replace(/\D/g, "");
                return cachedOwner;
            }
        } catch {}
    }
    
    if (process.env.OWNER_NUMBER) {
        cachedOwner = String(process.env.OWNER_NUMBER).replace(/\D/g, "");
        return cachedOwner;
    }

    return "967000000000"; 
}

// =============================
// 🔍 نظام مطابقة الأرقام الخارق (دعم النهايات والأجزاء بكل الصيغ)
// =============================
function isSameNumber(num1, num2) {
    if (!num1 || !num2) return false;
    const clean1 = String(num1).replace(/\D/g, "");
    const clean2 = String(num2).replace(/\D/g, "");
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
}

// =============================
// 🚀 نظام طابور العمليات المتزامنة (Queue Handler) لتحمل الضغط الفلكي دون تعليق
// =============================

const messageQueue = [];
let isProcessingQueue = false;

async function processQueue(sock) {
    if (isProcessingQueue || messageQueue.length === 0) return;
    isProcessingQueue = true;

    while (messageQueue.length > 0) {
        const { sockInstance, m } = messageQueue.shift();
        try {
            await executeHandlerLogic(sockInstance, m);
        } catch (err) {
            log("err", "Queue Execution Error: " + err.message);
        }
    }

    isProcessingQueue = false;
}

export async function handleMessages(sock, m) {
    // إضافة الرسالة إلى الطابور فوراً لمنع الانهيار أو التعليق عند تدفق آلاف الرسائل في نفس اللحظة
    messageQueue.push({ sockInstance: sock, m });
    processQueue(sock);
}

// =============================
// ⚡ المنطق الأساسي للـ Handler المعالج للرسائل والأوامر
// =============================

async function executeHandlerLogic(sock, m) {
    try {
        const start = Date.now();

        // استخراج رقم الجلسة وضمه للنخبة بصيغة مخصصة بأمان تامة
        const botJid = sock.user?.id;
        const currentBotNumber = botJid ? botJid.split(":")[0].replace(/\D/g, "") : "";
        if (currentBotNumber) {
            addEliteAutomatically(currentBotNumber);
        }

        const msg = m.messages?.[0];
        if (!msg || !msg.message) return;

        const jid = msg.key.remoteJid;
        if (!jid) return;

        const isGroup = jid.endsWith("@g.us");
        const isPrivate = jid.endsWith("@s.whatsapp.net");

        // تحديد المرسل بدقة تامة ودعم تنفيذ البوت لأوامره بنفسه
        const sender = msg.key.fromMe 
            ? (currentBotNumber ? currentBotNumber + "@s.whatsapp.net" : (msg.key.participant || jid))
            : (isGroup ? (msg.key.participant || jid) : jid);

        const number = sender.split("@")[0].replace(/\D/g, "");

        const ownerNumber = getOwner();
        const isOwner = isSameNumber(number, ownerNumber);

        const eliteList = getElite();
        const isElite = isOwner || isSameNumber(number, currentBotNumber) || eliteList.some(el => isSameNumber(number, el));

        // =============================
        // ⚡ جلب البلجنات عبر محمل آرثر المحصن
        // =============================

        const plugins = await loadPlugins(sock);

        // =============================
        // 🔒 تشغيل مستمعات البلجنات (بشكل متوازي غير معرقل)
        // =============================

        if (plugins && plugins.length > 0) {
            Promise.all(plugins.map(async (cmd) => {
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
                            message: msg,
                            isElite
                        });
                    }
                } catch (e) {}
            })).catch(() => {});
        }

        // =============================
        // 👑 وضع النخبة العام
        // =============================

        const mode = getMode();

        if (mode.elite === true && !isOwner && !isSameNumber(number, currentBotNumber)) {
            if (!isElite) {
                return;
            }
        }

        // =============================
        // 📝 قراءة النص أو الأزرار أو القوائم بذكاء فائق
        // =============================

        const rawText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message.templateButtonReplyMessage?.selectedId ||
            "";

        if (!rawText) return;

        const text = rawText.trim();
        const hasPrefix = /^[./\\#,!^&+=]/.test(text);
        const noPrefixText = text.replace(/^[./\\#,!^&+=]/, "").trim();
        const commandName = noPrefixText.split(" ")[0].toLowerCase();

        // =============================
        // ⚡ تنفيذ الأوامر بكفاءة خارقة وسرعة قصوى
        // =============================

        for (const cmd of plugins) {
            try {
                if (cmd && cmd.command) {
                    const validCmds = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
                    const isMatched = validCmds.some(c => c.toLowerCase() === commandName);

                    if (isMatched) {
                        if (!hasPrefix && !isElite) {
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
                            isElite
                        });

                        const time = Date.now() - start;

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

                        return;
                    }
                }
            } catch (err) {
                log("err", "خطأ في تنفيذ الأمر : " + err.message);
            }
        }

    } catch (error) {
        log("err", "Arthur Handler Crash: " + error.message);
    }
}
