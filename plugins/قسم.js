import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تسجيل وقت بدء تشغيل البوت
const startTime = Date.now();

export default {

    command: "ق",

    category: "النظام",

    description: "عرض أقسام وأوامر البوت",

    execute: async(sock, msg, data) => {

        const pluginsPath = path.join(__dirname, "../plugins");
        const imagesPath = path.join(__dirname, "../صور"); // مسار مجلد الصور بجانب مجلد البلجنات

        const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"));

        let categories = {};
        let order = [];

        for (const file of files) {
            try {
                const plugin = await import(`../plugins/${file}?${Date.now()}`);
                const cmd = plugin.default;

                if (!cmd || !cmd.command || !cmd.category) continue;

                if (!categories[cmd.category]) {
                    categories[cmd.category] = [];
                    order.push(cmd.category);
                }

                categories[cmd.category].push({
                    command: cmd.command,
                    description: cmd.description || "لا يوجد وصف"
                });
            } catch {}
        }

        const input = data.text.trim();

        const args = input
            .replace(/^ق/, "ق ")
            .trim()
            .split(/\s+/);

        const now = new Date();

        const date = now.toLocaleDateString("ar-SA");

        const day = now.toLocaleDateString(
            "ar-SA",
            {
                weekday: "long"
            }
        );

        const time = now.toLocaleTimeString("ar-SA");

        // حساب وقت التشغيل (Uptime)
        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeFormatted = `${hours}س ${minutes}د ${seconds}ث`;

        const sender = data.sender || msg.key.participant || msg.key.remoteJid;

        const mention = sender.split("@")[0];

        // إعدادات القناة (Newsletter / Channel Forwarding)
        const newsletterConfig = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363410672713016@newsletter',
                newsletterName: 'ARTHUR BOT',
                serverMessageId: -1
            }
        };

        // دمج إعدادات القناة مع المنشن
        const context = {
            ...newsletterConfig,
            mentionedJid: [sender]
        };

        const react = async (emoji) => {
            try {
                await sock.sendMessage(
                    data.jid,
                    {
                        react: {
                            text: emoji,
                            key: msg.key
                        }
                    }
                );
            } catch {}
        };

        // دالة لجلب صورة عشوائية أو صورة خاصة بالقسم من مجلد الصور
        const getRandomImage = () => {
            try {
                if (fs.existsSync(imagesPath)) {
                    const imgFiles = fs.readdirSync(imagesPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
                    if (imgFiles.length > 0) {
                        const randomFile = imgFiles[Math.floor(Math.random() * imgFiles.length)];
                        return path.join(imagesPath, randomFile);
                    }
                }
            } catch {}
            return null;
        };

        // رموز الأقسام الذكية (مع إضافة الأقسام الجديدة مثل الدين، الأغاني، الخطبة والزواج، إلخ)
        const getIcon = (name) => {

            const n = name
                .toLowerCase()
                .replace(/[أإآ]/g, "ا")
                .replace(/ة/g, "ه")
                .replace(/\s+/g, "");

            const icons = {
                "ادار": "⚙️",
                "المطور": "👑",
                "مطور": "👑",
                "dev": "👑",
                "ادوات": "🛠️",
                "tool": "🛠️",
                "النظام": "⭐",
                "nad": "⭐",
                "تحميل": "📥",
                "download": "📥",
                "نقاب": "⚔️",
                "guild": "⚔️",
                "بوت": "🤖",
                "bot": "🤖",
                "حما": "🛡️",
                "protect": "🛡️",
                "نخب": "👑",
                "elite": "👑",
                "العاب": "🎮",
                "لعب": "🎮",
                "game": "🎮",
                "زرف": "💸",
                "مجموع": "👥",
                "group": "👥",
                "بنك": "🏦",
                "bank": "🏦",
                "rpg": "⚔️",
                "قتال": "⚔️",
                "الدين": "🕌",
                "دين": "🕌",
                "اسلامي": "🕌",
                "الاغاني": "🎵",
                "اغاني": "🎵",
                "صوتيات": "🎵",
                "زواج": "💍",
                "غزل": "💍",
                "خطبه": "💍",
                "الفديوهات": "🎬",
                "فيديو": "🎬"
            };

            for (const key in icons) {
                if (n.includes(key))
                    return icons[key];
            }

            return "📂";

        };

        // =================
        // .ق
        // =================

        if (args.length === 1) {

            await react("👑");

            let menu =
`━╼╃⌬〔 👑𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 〕⌬╄╾━
*┤━━━━━━━━━━━━━━···*
*┤✧ مرحباً بك @${mention} 👋✧*
*┤✧ نظام ARTHUR جاهز للعمل*
*┤━━━━━━━━━━━━━━···*
*┤ 🤖┊الإسم : 𝐀𝐑𝐓𝐇𝐔𝐑 ❄*
*┤ 👑┊المالك : ARTHUR*
*┤ ⚡┊الحالة : ONLINE*
*┤ ⏱┊العمل : ${uptimeFormatted}*
*┤ 📦┊الإصدار : 1.0.0*
*┤ 📅┊التاريخ : ${date}*
*┤ 📆┊اليوم : ${day}*
*┤ ⏱┊الوقت : ${time}*
*┤━━━━━━━━━━━━━━···*
\`✦ اختر القسم لعرض الأوامر ✦\`
`;

            order.forEach((cat, index) => {
                menu +=
`
*┤${getIcon(cat)}┊【 ${index + 1} 】*
*┤ ✦ قسم ${cat}*
`;
            });

            menu +=
`
*┤━━━━━━━━━━━━━━···*
*⋅ ───━ • ﹝❄ 𖤍 ❄﹞ • ━─── ⋅*
*┇ 𓆩 ⚜ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐒𝐘𝐒𝐓𝐄𝐌 ⚜ 𓆪 👑*`;

            const imagePath = getRandomImage();

            if (imagePath) {
                return sock.sendMessage(
                    data.jid,
                    {
                        image: { url: imagePath },
                        caption: menu,
                        contextInfo: context
                    },
                    { quoted: msg }
                );
            } else {
                return sock.sendMessage(
                    data.jid,
                    {
                        text: menu,
                        contextInfo: context
                    },
                    { quoted: msg }
                );
            }

        }

        // =================
        // .ق رقم
        // =================

        const index = parseInt(args[1]) - 1;

        if (
            isNaN(index) ||
            index < 0 ||
            index >= order.length
        ) {

            return sock.sendMessage(
                data.jid,
                {
                    text:
`*╭━━〔 ❌ خطأ 〕━━╮*
*┤ القسم غير موجود*
*┤ استخدم .ق*
*╰━━━━━━━━━━━━╯*`,
                    contextInfo: context
                },
                { quoted: msg }
            );

        }

        const category = order[index];

        await react(getIcon(category));

        let text =
`━━━╼╃⌬〔  👑𝐀𝐑𝐓𝐇𝐔𝐑 👑 〕⌬╄━━━
*✧━━━〔 ${getIcon(category)} قسم ${category} 〕━━━✧*

`;

        for (const cmd of categories[category]) {
            text +=
`*┤ ⭐┊.${cmd.command}*
*┤ ◈ ${cmd.description}*

`;
        }

        text +=
`
*┤━━━━━━━━━━━━━━···*
*⋅ ───━ • ﹝❄ 𖤍 ❄﹞ • ━─── ⋅*
*┇ 𓆩 ⚜ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 ⚜ 𓆪 👑*`;

        const imagePath = getRandomImage();

        if (imagePath) {
            return sock.sendMessage(
                data.jid,
                {
                    image: { url: imagePath },
                    caption: text,
                    contextInfo: context
                },
                { quoted: msg }
            );
        } else {
            return sock.sendMessage(
                data.jid,
                {
                    text,
                    contextInfo: context
                },
                { quoted: msg }
            );
        }

    }

};
