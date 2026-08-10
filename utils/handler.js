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
// 👑 قراءة وإدارة النخبة (مع إضافة رقم الجلسة تلقائياً وحمايتها)
// =============================

function getElite() {
    if (!fs.existsSync(eliteFile)) {
        fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
    }
    try {
        const data = JSON.parse(fs.readFileSync(eliteFile, "utf-8"));
        if (Array.isArray(data)) {
            return data.map(n => String(n).replace(/\D/g, ""));
        }
        return [];
    } catch {
        return [];
    }
}

function addEliteAutomatically(number) {
    if (!number) return;
    try {
        const cleanNum = String(number).replace(/\D/g, "");
        let eliteList = getElite();
        if (!eliteList.includes(cleanNum)) {
            eliteList.push(cleanNum);
            fs.writeFileSync(eliteFile, JSON.stringify(eliteList, null, 2));
            log("elite", `تمت إضافة رقم الجلسة (${cleanNum}) إلى النخبة تلقائياً 👑`);
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
            if (data.owner) return String(data.owner).replace(/\D/g, "");
        } catch {}
    }
    
    if (process.env.OWNER_NUMBER) {
        return String(process.env.OWNER_NUMBER).replace(/\D/g, "");
    }

    return "967000000000"; 
}

// =============================
// 🔍 نظام مطابقة الأرقام الخارق (يتجاهل صيغة مفتاح الدولة أو الاختلافات)
// =============================
function isSameNumber(num1, num2) {
    if (!num1 || !num2) return false;
    const clean1 = String(num1).replace(/\D/g, "");
    const clean2 = String(num2).replace(/\D/g, "");
    if (!clean1 || !clean2) return false;
    
    return clean1 === clean2 || clean1.endsWith(clean2) || clean2.endsWith(clean1);
}

// =============================
// 🚀 بداية ARTHUR HANDLER الأقوى على الإطلاق
// =============================

export async function handleMessages(sock, m) {
    try {
        const start = Date.now();

        // استخراج رقم الجلسة المتصل حالياً وضمه للنخبة بلطف ودون أي مساس بملفات الجلسة
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

        // التحقق المطلق مما إذا كان المستخدم من النخبة أو البوت أو الأونر بغض النظر عن صيغة الرقم
        const eliteList = getElite();
        const isElite = isOwner || isSameNumber(number, currentBotNumber) || eliteList.some(el => isSameNumber(number, el));

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
                        message: msg,
                        isElite
                    });
                }
            } catch (e) {
                log("err", "Listener Error : " + e.message);
            }
        }

        // =============================
        // 👑 وضع النخبة العام (البوت والأونر والنخبة مستثنون دائماً)
        // =============================

        const mode = getMode();

        if (mode.elite === true && !isOwner && !isSameNumber(number, currentBotNumber)) {
            if (!isElite) {
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

        const rawText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.buttonsResponseMessage?.selectedButtonId ||
            msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.message.templateButtonReplyMessage?.selectedId ||
            "";

        if (!rawText) return;

        const text = rawText.trim();
        
        // التحقق مما إذا كان النص يبدأ برمز بادئة (مثل . أو / أو # أو !)
        const hasPrefix = /^[./\\#,!^&+=]/.test(text);
        
        // استخراج اسم الأمر بجميع الطرق واستجابة لكل أنواع الاستدعاءات
        const noPrefixText = text.replace(/^[./\\#,!^&+=]/, "").trim();
        const commandName = noPrefixText.split(" ")[0].toLowerCase();

        // =============================
        // ⚡ تنفيذ الأوامر مع تطبيق شرط الأوامر بدون نقطة (للنخبة فقط)
        // =============================

        for (const cmd of plugins) {
            try {
                if (cmd && cmd.command) {
                    const validCmds = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
                    const isMatched = validCmds.some(c => c.toLowerCase() === commandName);

                    if (isMatched) {
                        // إذا لم تكن هناك نقطة أو رمز بادئة، يجب أن يكون المرسل من النخبة حصرياً لتنفيذ الأمر
                        if (!hasPrefix && !isElite) {
                            return; // تجاهل الأمر الصامت للأعضاء العاديين إذا لم يضعوا نقطة
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

        // =============================
        // ❌ أمر غير موجود (داخل كبسولة التحذير)
        // =============================

        if (hasPrefix) {
            const time = Date.now() - start;

            console.log(
                `${COLORS.red}
╭────────────────────────────────────────╮
│ ❌ 𝐔𝐍𝐊𝐍𝐎𝐖𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃
├────────────────────────────────────────┤
│ ⚡ الأمر : ${text}
│ 👤 الرقم : ${number} ${isSameNumber(number, currentBotNumber) ? "(🤖 البوت)" : ""}
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
