import process from "process";

export default {

    command: "فحص",

    category: "النظام",

    description: "فحص سرعة البوت، الحالة، وتقييم الأداء",

    execute: async (sock, msg, data) => {

        const start = Date.now();

        // إرسال رسالة مؤقتة لقياس سرعة الاستجابة الحقيقية
        const sentMsg = await sock.sendMessage(
            data.jid,
            { text: "⚡ جاري الفحص..." },
            { quoted: msg }
        );

        const ping = Date.now() - start;

        // حساب وقت التشغيل (Uptime)
        const uptimeSeconds = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeFormatted = `${hours}س ${minutes}د ${seconds}ث`;

        // تحديد الحالة بناءً على السرعة
        let statusText = "";
        let statusEmoji = "";

        if (ping < 300) {
            statusEmoji = "🚀";
            statusText = "سريع جداً وقوي";
        } else if (ping < 700) {
            statusEmoji = "🟢";
            statusText = "مستقر وممتاز";
        } else if (ping < 1500) {
            statusEmoji, statusText = "🟡", "جيد ولكن بطيء نسبياً";
        } else {
            statusEmoji = "🔴";
            statusText = "ضعيف أو يعاني من بطء شديد";
        }

        const sender = data.sender || msg.key.participant || msg.key.remoteJid;

        let text =
`━╼╃⌬〔 👑 فحص النظام 〕⌬╄╾━
*┤━━━━━━━━━━━━━━···*
*┤ ⚡ ¦ سرعة الاستجابة : ${ping}ms*
*┤ ${statusEmoji} ¦ حالة البوت : ${statusText}*
*┤ ⏱ ¦ مدة التشغيل : ${uptimeFormatted}*
*┤ 💻 ¦ الذاكرة المستخدمة : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB*
*┤━━━━━━━━━━━━━━···*
*⋅ ───━ • ﹝❄ 𖤍 ❄﹞ • ━─── ⋅*
*┇ 𓆩 ⚜ 𝐘𝐔𝐍𝐎 𝐒𝐘𝐒𝐓𝐄𝐌 ⚜ 𓆪 👑*`;

        // تعديل الرسالة المؤقتة بالنتيجة النهائية
        return sock.sendMessage(
            data.jid,
            {
                text: text,
                mentions: [sender],
                edit: sentMsg.key
            }
        );

    }

};
