import fs from "fs";
import path from "path";

// مسار ملف النخبة للتحقق من الصلاحيات
const eliteFile = path.join(process.cwd(), "data", "النخبة.json");

function getElite() {
    if (!fs.existsSync(eliteFile)) {
        fs.writeFileSync(eliteFile, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(eliteFile, "utf-8"));
}

export default {
    command: "رفع",
    category: "المجموعات",
    description: "رفع عضو إلى مشرف أو رفع رقمك الشخصي (خاص بأعضاء النخبة والمشرفين) 👑",

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

        // جلب معلومات المجموعة المحدثة عبر فحص الـ Server مباشرة
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants;

        const args = data.text.trim().split(/\s+/);
        const subAction = args[1]; // التأكد مما إذا كتب "رقمي"

        // فحص ما إذا كان المستخدم يريد رفع رقمه الشخصي
        if (subAction === "رقمي") {
            const eliteUsers = getElite();
            
            const senderParticipant = participants.find(p => p.id.replace(/\D/g, "") === sender);
            const isSenderAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";
            const isElite = eliteUsers.includes(sender);

            if (!isElite && !isSenderAdmin) {
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

            // التحقق الدقيق الحاسم من كون المرسل مشرفاً بالفعل
            if (senderParticipant && senderParticipant.admin) {
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ ⚠️ تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ ⚠️ العضو مشرف بالفعل*
*┃ 👤 العضو : @${sender}¦*
*╰━━━━━━━━━━━━━━╯*`,
                        mentions: [senderParticipant.id]
                    },
                    { quoted: msg }
                );
            }

            const senderJid = data.sender || msg.key.participant || msg.key.remoteJid;

            try {
                await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

                await sock.groupParticipantsUpdate(jid, [senderJid], "promote");

                await sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ ✅ نجاح العمليات*
*┣━━━━━━━━━━━━━━┫*
*┃ ✅ تم رفع رقمك الشخصي*
*┃ إلى مشرف بنجاح*
*┃ 👤 العضو : @${sender}¦*
*╰━━━━━━━━━━━━━━╯*`,
                        mentions: [senderJid]
                    },
                    { quoted: msg }
                );

                await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
                return;

            } catch (err) {
                console.error("Promote Self Error:", err);
                return sock.sendMessage(
                    jid,
                    {
                        text:
`${head}
*┃ ❌ خطأ*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ حدث خطأ أثناء رفع رقمك*
*┃ ⚠️ تأكد أن البوت مشرف*
*╰━━━━━━━━━━━━━━╯*`
                    },
                    { quoted: msg }
                );
            }
        }

        // الأوامر العادية للمشرفين لرفع عضو آخر بالرد أو المنشن
        const senderParticipant = participants.find(p => p.id.replace(/\D/g, "") === sender);
        const isSenderAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";

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
*┃ العضو أو منشنه ثم اكتب:*
*┃ 📝 .رفع*
*┃ أو لرفع رقمك (للنخبة):*
*┃ 📝 .رفع رقمي*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }

        // استخراج الرقم المجرد وتوحيد شكل الـ JID للبحث المطابق في القائمة
        const targetNumber = target.split("@")[0].replace(/\D/g, "");
        const targetParticipant = participants.find(p => {
            const pNum = p.id.split("@")[0].replace(/\D/g, "");
            return p.id === target || pNum === targetNumber;
        });

        // التحقق القاطع قبل أي خطوة ترقية لمعرفة هل هو مشرف مسبقاً (admin أو superadmin)
        if (targetParticipant && targetParticipant.admin) {
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ⚠️ تنبيه*
*┣━━━━━━━━━━━━━━┫*
*┃ ⚠️ العضو مشرف بالفعل*
*┃ 👤 العضو : @${targetNumber}¦*
*╰━━━━━━━━━━━━━━╯*`,
                    mentions: [targetParticipant.id || target]
                },
                { quoted: msg }
            );
        }

        try {
            await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

            await sock.groupParticipantsUpdate(jid, [target], "promote");

            await sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ✅ نجاح العمليات*
*┣━━━━━━━━━━━━━━┫*
*┃ ✅ تم رفع العضو*
*┃ إلى مشرف بنجاح*
*┃ 👤 العضو : @${targetNumber}¦*
*╰━━━━━━━━━━━━━━╯*`,
                    mentions: [target]
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Promote Error:", err);
            return sock.sendMessage(
                jid,
                {
                    text:
`${head}
*┃ ❌ خطأ*
*┣━━━━━━━━━━━━━━┫*
*┃ ❌ حدث خطأ أثناء رفع العضو*
*┃ ⚠️ تأكد أن البوت مشرف*
*╰━━━━━━━━━━━━━━╯*`
                },
                { quoted: msg }
            );
        }
    }
};
