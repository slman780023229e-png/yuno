import fs from "fs";
import path from "path";

// مسار ملف النخبة للتحقق من الصلاحيات
const eliteFile = path.join(process.cwd(), "data", "النخبة.json");

function getElite() {
    try {
        if (!fs.existsSync(eliteFile)) {
            fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
        }
        const data = JSON.parse(fs.readFileSync(eliteFile, "utf-8"));
        if (Array.isArray(data)) {
            return data.map(n => String(n).replace(/\D/g, ""));
        }
        return [];
    } catch {
        return [];
    }
}

export default {
    command: "خفض",
    category: "المجموعات",
    description: "خفض مشرف إلى عضو أو خفض رقمك الشخصي (خاص بأعضاء النخبة والمشرفين) 👑",

    execute: async(sock, msg, data) => {
        const jid = data.jid;

        const head =
`*╭━━━━━━━━━━━━━━╮*
*┃ 👑 𝐀𝐑𝐓𝐇𝐔R LEYWIN*
*┣━━━━━━━━━━━━━━┫*`;

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ❌ خطأ*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ الأمر للمجموعات فقط*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        const sender = (data.sender || msg.key.participant || msg.key.remoteJid).split("@")[0].replace(/\D/g, "");
        
        // استخراج رقم البوت الحقيقي وتنظيفه
        const botJid = sock.user?.id || "";
        const currentBotNumber = botJid.split(":")[0].replace(/\D/g, "");

        // جلب معلومات المجموعة المحدثة عبر فحص الـ Server مباشرة
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants;

        const args = data.text.trim().split(/\s+/);
        const subAction = args[1]; // التأكد مما إذا كتب "رقمي"

        // فحص ما إذا كان المستخدم يريد خفض رقمه الشخصي
        if (subAction === "رقمي") {
            const eliteUsers = getElite();
            
            const senderParticipant = participants.find(p => p.id.replace(/\D/g, "") === sender);
            const isSenderAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";
            const isUserElite = eliteUsers.includes(sender) || sender === currentBotNumber || data.isElite;

            // السماح للبوت أو عضو النخبة أو المشرف الحقيقي بالتنفيذ فوراً
            if (!isUserElite && !isSenderAdmin) {
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ 🚫 تنبيه الصلاحية*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ هذا الأمر مخصص*
*┃ لأعضاء النخبة والمشرفين فقط*
*╰━━━━━━━━━━━━━━╯*`
                    },
                    { quoted: msg }
                );
            }

            // منع خفض البوت لنفسه
            if (sender === currentBotNumber) {
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ 🤖 تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ 🤖 لا يمكن خفض البوت*
*╰━━━━━━━━━━━━━━╯*`
                    },
                    { quoted: msg }
                );
            }

            const senderJid = data.sender || msg.key.participant || msg.key.remoteJid;

            try {
                await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

                await sock.groupParticipantsUpdate(jid, [senderJid], "demote");

                await sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ ✅ نجاح العمليات*
*┃ ⬇️ تم خفض رقمك الشخصي*
*┃ إلى عضو عادي بنجاح*
*┃ 👤 العضو : @${sender}¦*
*╰━━━━━━━━━━━━━━╯*`,
                        mentions: [senderJid]
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;

            } catch (err) {
                console.error("Demote Self Error:", err);
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ ❌ خطأ*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ حدث خطأ أثناء خفض رقمك*
*┃ ⚠️ تأكد أن البوت مشرف*
*╰━━━━━━━━━━━━━━╯*`
                    },
                    { quoted: msg }
                );
            }
        }

        // الأوامر العادية للمشرفين لخفض عضو آخر بالرد أو المنشن
        const senderParticipant = participants.find(p => p.id.replace(/\D/g, "") === sender);
        const isSenderAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin" || sender === currentBotNumber || data.isElite;

        if (!isSenderAdmin) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ 🚫 تنبيه الصلاحية*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ هذا الأمر للمشرفين*
*┃ فقط في المجموعة*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        let target = contextInfo?.participant;

        if (!target && contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
            target = contextInfo.mentionedJid[0];
        }

        if (!target) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ 📌 طريقة الاستخدام*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ قم بالرد على رسالة*
*┃ المشرف أو منشنه ثم اكتب:*
*┃ 📝 .خفض*
*┃ أو لخفض رقمك (للنخبة):*
*┃ 📝 .خفض رقمي*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        const targetNumber = target.split("@")[0].replace(/\D/g, "");
        const targetParticipant = participants.find(p => {
            const pNum = p.id.split("@")[0].replace(/\D/g, "");
            return p.id === target || pNum === targetNumber;
        });

        // التحقق أن المستهدف مشرف أساساً
        if (!targetParticipant || !targetParticipant.admin) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ⚠️ تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ ⚠️ العضو ليس مشرفاً*
*┃ 👤 العضو : @${targetNumber}¦*
*╰━━━━━━━━━━━━━━╯*`,
                    mentions: [targetParticipant?.id || target]
                },
                { quoted: msg }
            );
        }

        // منع خفض مالك المجموعة
        if (metadata.owner === targetParticipant.id || metadata.owner === target) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ 👑 تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ 👑 لا يمكن خفض مالك المجموعة*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        // منع خفض البوت
        if (targetNumber === currentBotNumber) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ 🤖 تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ 🤖 لا يمكن خفض البوت*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        // منع خفض أعضاء النخبة
        const eliteUsers = getElite();
        if (eliteUsers.includes(targetNumber) && targetNumber !== sender) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ 👑 حماية النخبة*
*┣━━━━━━━━━━━━━━┫*
*┃ 👑 لا يمكن خفض عضو من النخبة*
*┃ 👤 العضو : @${targetNumber}¦*
*╰━━━━━━━━━━━━━━╯*`,
                    mentions: [target]
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            await sock.groupParticipantsUpdate(jid, [target], "demote");

            await sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ✅ نجاح العمليات*
*┃ ⬇️ تم خفض المشرف*
*┃ إلى عضو عادي بنجاح*
*┃ 👤 العضو : @${targetNumber}¦*
*╰━━━━━━━━━━━━━━╯*`,
                    mentions: [target]
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Demote Error:", err);
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ❌ خطأ*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ حدث خطأ أثناء خفض العضو*
*┃ ⚠️ تأكد أن البوت مشرف*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }
    }
};
