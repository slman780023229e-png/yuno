import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startTime = Date.now();

export default {
    command: "ق",
    category: "النظام",
    description: "عرض واجهة القائمة والأقسام",

    execute: async(sock, msg, data) => {
        const pluginsPath = path.join(__dirname, "../plugins");

        let files = [];
        try {
            files = fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"));
        } catch {}

        let categories = {};
        let order = [];

        for (const file of files) {
            try {
                const plugin = await import(`../plugins/${file}?${Date.now()}`);
                const cmd = plugin.default;

                if (!cmd || !cmd.command || !cmd.category) continue;
                if (file === "قسم.js" || file === "ق.js") continue;

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

        const input = data.text ? data.text.trim() : "";
        const args = input.replace(/^\.ق/, "").trim().split(/\s+/);
        const subCommand = args[0] ? args[0].toLowerCase() : "";
        const pageArg = args[1] ? parseInt(args[1]) : 1;

        const now = new Date();
        const date = now.toLocaleDateString("ar-SA");
        const day = now.toLocaleDateString("ar-SA", { weekday: "long" });
        const time = now.toLocaleTimeString("ar-SA");

        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeFormatted = `${hours}س ${minutes}د ${seconds}ث`;

        const sender = data.sender || msg.key.participant || msg.key.remoteJid;
        const mention = sender ? sender.split("@")[0] : "مستخدم";

        const react = async (emoji) => {
            try {
                await sock.sendMessage(data.jid, { react: { text: emoji, key: msg.key } });
            } catch {}
        };

        const getRandomImage = () => {
            try {
                const possiblePaths = [
                    path.join(__dirname, "../صور"),
                    path.join(__dirname, "صور"),
                    path.join(process.cwd(), "صور")
                ];

                for (const targetPath of possiblePaths) {
                    if (fs.existsSync(targetPath)) {
                        const imgFiles = fs.readdirSync(targetPath).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
                        if (imgFiles.length > 0) {
                            const randomFile = imgFiles[Math.floor(Math.random() * imgFiles.length)];
                            return path.join(targetPath, randomFile);
                        }
                    }
                }
            } catch {}
            return null;
        };

        const getIcon = (name) => {
            const n = name.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, "");
            const icons = {
                "ادار": "⚙️", "المطور": "👑", "مطور": "👑", "dev": "👑",
                "ادوات": "🛠️", "tool": "🛠️", "النظام": "⭐", "nad": "⭐",
                "تحميل": "📥", "download": "📥", "نقاب": "⚔️", "guild": "⚔️",
                "بوت": "🤖", "bot": "🤖", "حما": "🛡️", "protect": "🛡️",
                "نخب": "👑", "elite": "👑", "العاب": "🎮", "لعب": "🎮",
                "game": "🎮", "زرف": "💸", "مجموع": "👥", "group": "👥",
                "بنك": "🏦", "bank": "🏦", "rpg": "⚔️", "قتال": "⚔️",
                "الدين": "🕌", "دين": "🕌", "اسلامي": "🕌", "الاغاني": "🎵",
                "اغاني": "🎵", "صوتيات": "🎵", "زواج": "💍", "غزل": "💍",
                "خطبه": "💍", "الفديوهات": "🎬", "فيديو": "🎬",
                "الذكاء": "🧠", "ai": "🧠", "تسلية": "🎯", "رفاهية": "🎉",
                "صانع": "⚡", "مميزات": "💎", "تفاعل": "💬", "تخزين": "🗄️"
            };
            for (const key in icons) {
                if (n.includes(key)) return icons[key];
            }
            return "📂";
        };

        const sendWithImageAndButtons = async (textMessage, buttonsArray) => {
            const imagePath = getRandomImage();

            if (imagePath && fs.existsSync(imagePath)) {
                try {
                    await sock.sendMessage(data.jid, { 
                        image: { url: imagePath }, 
                        mentions: [sender] 
                    });
                } catch (e) {}
            }

            if (buttonsArray && typeof sock.sendRealButtons === "function") {
                try {
                    return await sock.sendRealButtons(
                        data.jid,
                        textMessage,
                        "ARTHUR BOT SYSTEM 2026",
                        buttonsArray
                    );
                } catch (e) {}
            }

            return await sock.sendMessage(data.jid, { text: textMessage, mentions: [sender] });
        };

        // ==========================================
        // 1. القائمة الرئيسية (.ق)
        // ==========================================
        if (!subCommand) {
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
*┤ 📦┊الإصدار : 2.0.0*
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
*┇ 𓆩 ⚜ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 ⚜ 𓆪 👑*`;

            const buttonsArray = [
                { displayText: "📋 قائمة الأقسام", id: ".ق الاقسام" },
                { displayText: "⭐ تقييم البوت", id: ".تقييم" },
                { displayText: "📢 قناة البوت", id: "https://whatsapp.com/channel/YOUR_CHANNEL_ID" }
            ];

            return await sendWithImageAndButtons(menu, buttonsArray);
        }

        // ==========================================
        // 2. عرض جميع الأقسام مع نظام الصفحات (.ق الاقسام أو .ق الاقسام 2)
        // ==========================================
        if (subCommand === "الاقسام" || subCommand === "الأقسام") {
            await react("📋");

            const itemsPerPage = 3;
            const totalPages = Math.ceil(order.length / itemsPerPage);
            const currentPage = isNaN(pageArg) || pageArg < 1 ? 1 : (pageArg > totalPages ? totalPages : pageArg);

            const startIndex = (currentPage - 1) * itemsPerPage;
            const currentCategories = order.slice(startIndex, startIndex + itemsPerPage);

            let listText = 
`━╼╃⌬〔 📋 قائمة أقسام 〕⌬╄╾━ (${currentPage}/${totalPages}) 〕⌬╄╾━
*┤ اختر القسم الذي تريد دخوله بالرقم أو الزر:*
`;

            currentCategories.forEach((cat, index) => {
                const absoluteIndex = startIndex + index + 1;
                listText += `\n*【 ${absoluteIndex} 】* ⟵ ${getIcon(cat)} قسم *${cat}*`;
            });

            listText += `\n\n*━━━━━━━━━━━━━━━━━━━*\n*💡 صفحة ${currentPage} من ${totalPages}*`;

            let buttonsArray = currentCategories.map((cat, index) => {
                const absoluteIndex = startIndex + index + 1;
                return {
                    displayText: `${getIcon(cat)} ${cat.length > 15 ? cat.substring(0, 12) + ".." : cat}`,
                    id: `.ق ${absoluteIndex}`
                };
            });

            if (currentPage < totalPages) {
                buttonsArray.push({ displayText: `➡️ التالي (${currentPage + 1})`, id: `.ق الاقسام ${currentPage + 1}` });
            }
            if (currentPage > 1) {
                buttonsArray.push({ displayText: `⬅️ السابق (${currentPage - 1})`, id: `.ق الاقسام ${currentPage - 1}` });
            }

            buttonsArray.push({ displayText: "📜 الرئيسية", id: ".ق" });

            return await sendWithImageAndButtons(listText, buttonsArray);
        }

        // ==========================================
        // 3. عرض أوامر القسم المحدد (.ق 1, .ق 2...)
        // ==========================================
        const index = parseInt(subCommand) - 1;

        if (isNaN(index) || index < 0 || index >= order.length) {
            return sock.sendMessage(data.jid, {
                text: `*╭━━〔 ❌ خطأ 〕━━╮*\n*┤ القسم غير موجود*\n*┤ استخدم .ق للقائمة الرئيسية*\n*╰━━━━━━━━━━━━╯*`
            });
        }

        const category = order[index];
        await react(getIcon(category));

        let text =
`━━━╼╃⌬〔  👑𝐀𝐑𝐓𝐇𝐔𝐑 👑 〕⌬╄╾━━━
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

        const categoryButtons = [
            { displayText: "📋 قائمة الأقسام", id: ".ق الاقسام" },
            { displayText: "📜 الرئيسية", id: ".ق" },
                    { displayText: "🌐 القناة", id: "قناه" },
            { displayText: "⭐ تقييم البوت", id: ".تقييم" }
        ];

        return await sendWithImageAndButtons(text, categoryButtons);
    }
};
