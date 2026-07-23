import axios from 'axios';
import https from 'https';

// إنشاء نسخة من axios تتجاهل أخطاء شهادة الأمان لضمان عدم توقف الطلب
const agent = new https.Agent({  
  rejectUnauthorized: false
});

export default {
    command: "اغنيه",
    category: "التحميل",
    description: "تحميل أغنية MP3 بسرعة قصوى عبر البحث 🎵",

    execute: async (sock, msg, data) => {
        const jid = data.jid;
        const sender = data.sender || msg.key.participant || msg.key.remoteJid;

        const head =
`*╭━━━〔 👑 𝐀𝐑𝐓𝐇𝐔R LEYWIN 〕━━━╮*
*┃ 🎧 نظام التحميل السريع*
*╰━━━━━━━━━━━━━━━━━━╯*`;

        const query = data.text.replace(/^[.,،]?(اغنيه|اغنية)\s*/i, '').trim();

        if (!query) {
            return await sock.sendMessage(jid, {
                text:
`${head}

*┃ ❌ يرجى كتابة اسم الأغنية المطلوبة*
*┃ 📌 مثال:*
*┃ .اغنيه ماهر زين*
*┃ .اغنيه عمرو دياب*
*╰━━━━━━━━━━━━━━━━━━╯*`
            }, { quoted: msg });
        }

        try {
            // تفاعل فوري بالسرعة القصوى
            await sock.sendMessage(jid, { react: { text: "⚡", key: msg.key } });

            // استخدام واجهة tikwm المضمونة 100% لجلب الصوت بالاسم
            const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=1`, { httpsAgent: agent });
            
            if (!res.data?.data?.videos?.[0]) {
                return await sock.sendMessage(jid, { 
                    text: 
`${head}

*┃ ⚠️ لم يتم العثور على نتائج*
*┃ 🔍 تأكد من اسم الأغنية وحاول مجدداً*
*╰━━━━━━━━━━━━━━━━━━╯*` 
                }, { quoted: msg });
            }

            const best = res.data.data.videos[0];
            const musicUrl = best.music || best.play;

            if (!musicUrl) {
                throw new Error("رابط الصوت غير متوفر.");
            }

            // إرسال الصوت مباشرة بالإطار المنسق باسم أرثر لوين
            await sock.sendMessage(
                jid,
                {
                    audio: { url: musicUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    caption: 
`${head}
*┃ ✅ تم جلب الأغنية بنجاح*
*┃ 🎶 البحث : ${query}*
*┃ 👑 الطلب : بواسطة ARTHUR LEYWIN BOT*
*╰━━━━━━━━━━━━━━━━━━╯*`,
                    mentions: [sender]
                },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error('Turbo Error:', err.message);
            await sock.sendMessage(jid, {
                text: 
`${head}

*┃ ❌ حدث خطأ أثناء التحميل*
*┃ ⚠️ تعذر الاتصال بالسيرفر حالياً*
*╰━━━━━━━━━━━━━━━━━━╯*`
            }, { quoted: msg });
        }
    }
};
