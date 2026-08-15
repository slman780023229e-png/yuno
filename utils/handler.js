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
// 🔍 دالة استخراج الرقم النقي الموحدة
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
// قراءة وضع النخبة (تخزين مؤقت سريع)
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
// 👑 قراءة وإدارة النخبة الفائقة
// =============================

let eliteCache = null;
let lastEliteCheck = 0;

function getElite() {
    try {
        const now = Date.now();
        if (eliteCache && (now - lastEliteCheck < 5000)) {
            return eliteCache;
        }

        if (!fs.existsSync(eliteFile)) {
            try {
                fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
            } catch {}
        }
        
        const fileContent = fs.readFileSync(eliteFile, "utf-8");
        if (!fileContent.trim()) return eliteCache || [];

        const data = JSON.parse(fileContent);
        let eliteNumbers = [];
        
        if (Array.isArray(data)) {
            eliteNumbers = data.map(n => {
                if (typeof n === "object" && n !== null) {
                    return extractPureNumber(n.number || n.id || Object.values(n)[0] || "");
                }
                return extractPureNumber(n);
            });
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
        const cleanNum = extractPureNumber(number);
        if (!cleanNum || cleanNum.length < 5) return;

        let eliteList = getElite();
        const exists = eliteList.includes(cleanNum);

        if (!exists) {
            isWritingElite = true;
            eliteList.push(cleanNum);
            fs.writeFileSync(eliteFile, JSON.stringify(eliteList, null, 2));
            eliteCache = null; 
            isWritingElite = false;
            log("elite", `تمت إضافة رقم الجلسة (${cleanNum}) إلى النخبة بشكل نقي وصحيح 👑`);
        }
    } catch (e) {
        isWritingElite = false;
    }
}

// =============================
// 🛡️ قراءة الأونر
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
// 🔍 نظام مطابقة الأرقام الخارق
// =============================
function isSameNumber(num1, num2) {
    try {
        if (!num1 || !num2) return false;
        const clean1 = extractPureNumber(num1);
        const clean2 = extractPureNumber(num2);
        if (!clean1 || !clean2) return false;
        
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
// 🚀 نظام التخزين المؤقت الآمن للبلجنات (منع التحميل المتكرر مع الرسائل)
// =============================

let loadedPluginsCache = null;

async function getLoadedPlugins(sock) {
    if (loadedPluginsCache) return loadedPluginsCache;
    try {
        loadedPluginsCache = await loadPlugins(sock);
    } catch {
        loadedPluginsCache = [];
    }
    return loadedPluginsCache;
}

export function clearPluginsCache() {
    loadedPluginsCache = null;
}

// =============================
// 🚀 نظام طابور العمليات المتزامنة (Queue Handler)
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
        const botJid = sock.user?.id;
        const currentBotNumber = extractPureNumber(botJid);
        if (currentBotNumber) {
            setImmediate(() => addEliteAutomatically(currentBotNumber));
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

        const eliteList = getElite();
        const isEliteUser = isOwner || isSameNumber(number, currentBotNumber) || eliteList.some(el => isSameNumber(number, el));

        // تحميل البلجنات من الكاش المحمي لمنع استهلاك الرام
        let plugins = await getLoadedPlugins(sock);

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

        const mode = getMode();

        if (mode.elite === true && !isOwner && !isSameNumber(number, currentBotNumber)) {
            if (!isEliteUser) {
                return;
            }
        }

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

                        return;
                    }
                }
            } catch (err) {}
        }

    } catch (error) {}
}
