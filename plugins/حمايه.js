import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "../data");
const file = path.join(dataDir, "contactGuard.json");
const eliteFile = path.join(dataDir, "النخبة.json");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
}

function loadData() {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const cleanJid = (jid) => {
    if (!jid) return "";
    return jid.replace(/:[0-9]+@/, "@");
};

// دالة فحص النخبة مطابقة تماماً لطريقة تخزين ملف نخبة.json
const isEliteUser = (userJid) => {
    try {
        if (!fs.existsSync(eliteFile)) return false;
        const eliteUsers = JSON.parse(fs.readFileSync(eliteFile, "utf-8"));
        const senderNumber = cleanJid(userJid).split("@")[0];
        return Array.isArray(eliteUsers) && eliteUsers.includes(senderNumber);
    } catch {
        return false;
    }
};

export default {
    command: "حمايه",
    category: "الحماية",
    description: "حماية جهات الاتصال",

    execute: async (sock, msg, data) => {
        const jid = data.jid;

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, {
                text: `*╭━━〔 ❌ خطأ 〕━━╮*\n*┤ الأمر للمجموعات فقط*\n*╰━━━━━━━━━━━━╯*`
            });
        }

        const sender = cleanJid(data.sender || msg.key.participant || msg.participant);

        try {
            const metadata = await sock.groupMetadata(jid);
            const participant = metadata.participants.find(p => cleanJid(p.id) === sender);

            const isAdmin = participant && Boolean(participant.admin);
            const isElite = isEliteUser(sender);

            // الشرط: لو لم يكن مشرفاً وليس نخبة، يرفض الأمر
            if (!isAdmin && !isElite) {
                return sock.sendMessage(jid, {
                    text: `*╭━━〔 ❌ خطأ 〕━━╮*\n*┤ الأمر للمشرفين والنخبة فقط*\n*╰━━━━━━━━━━━━╯*`
                });
            }

            const db = loadData();
            db[jid] = !db[jid];
            saveData(db);

            const statusText = db[jid]
                ? `*╔═══════════╗*\n  *✨ 🛡️ حماية جهات الاتصال ✨*\n*╚═══════════╝*\n\n*╭━━━━━━━━━━━╮*\n*┃ ✅ تم تشغيل الحماية*\n*┃ 📱 حذف جهات الاتصال*\n*┃ 🚫 طرد المرسل الفوري*\n*┃ ⚡ سرعة فائقة جداً*\n*╰━━━━━━━━━━━╯*`
                : `*╔═══════════╗*\n  *✨ 🛡️ حماية جهات الاتصال ✨*\n*╚═══════════╝*\n\n*╭━━━━━━━━━━━╮*\n*┃ 🔓 تم إيقاف الحماية*\n*╰━━━━━━━━━━━╯*`;

            await sock.sendMessage(jid, { text: statusText });

        } catch (e) {
            console.log("خطأ في التحقق من الصلاحيات:", e.message);
            await sock.sendMessage(jid, {
                text: `*╭━━〔 ❌ خطأ 〕━━╮*\n*┤ تعذر التحقق من الصلاحيات*\n*╰━━━━━━━━━━━━╯*`
            });
        }
    },

    onMessage: async (sock, msg) => {
        const jid = msg.key.remoteJid;

        if (!jid || !jid.endsWith("@g.us")) return;

        const db = loadData();
        if (!db[jid]) return;

        const botNumber = cleanJid(sock.user?.id);
        const sender = cleanJid(msg.key.participant || msg.participant);
        if (msg.key.fromMe || (botNumber && sender === botNumber)) return;

        const message = msg.message;
        if (!message) return;

        let hasContact = false;
        let contactCount = 0;

        if (message.contactMessage) {
            hasContact = true;
            contactCount = 1;
        } else if (message.contactsArrayMessage) {
            hasContact = true;
            contactCount = message.contactsArrayMessage.contacts?.length || 1;
        }

        if (!hasContact) return;
        if (!sender) return;

        try {
            await Promise.all([
                sock.sendMessage(jid, {
                    delete: {
                        remoteJid: jid,
                        id: msg.key.id,
                        participant: msg.key.participant || msg.participant
                    }
                }),
                sock.groupParticipantsUpdate(jid, [msg.key.participant || msg.participant], "remove")
            ]);

            console.log(
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🛡️ 𝐘𝐔𝐍𝐎 𝐒𝐄𝐂𝐔𝐑Ｉ𝐓𝐘
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🚫 تم منع جهة اتصال بسرعة قصوى
┃ 👤 ${sender}
┃ 📦 العدد : ${contactCount}
┃ ⚡ تم التنفيذ الفوري
╰━━━━━━━━━━━━━━━━━━━━━━╯`
            );

        } catch (e) {
            console.log("حماية جهات الاتصال:", e.message);
        }
    }
};