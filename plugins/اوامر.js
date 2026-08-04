import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startTime = Date.now();

export default {
    command: "اوامر",
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
        let totalCommandsCount = 0;

        for (const file of files) {
            try {
                const plugin = await import(`../plugins/${file}?${Date.now()}`);
                const cmd = plugin.default;

                if (!cmd || !cmd.command || !cmd.category) continue;
                if (file === "قسم.js" || file === "ق.js" || file === "اوامر.js") continue;

                if (!categories[cmd.category]) {
                    categories[cmd.category] = [];
                    order.push(cmd.category);
                }

                categories[cmd.category].push({
                    command: cmd.command,
                    description: cmd.description || "لا يوجد وصف"
                });
                totalCommandsCount++;
            } catch {}
        }

        const input = data.text ? data.text.trim() : "";
        const args = input.replace(/^\.اوامر/, "").trim().split(/\s+/);
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

        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + "MB";

        const arthurReactions = ["👑", "⚡", "❄️", "🛡️", "⚜️", "⚔️"];
        const react = async (emoji) => {
            try {
                const chosenEmoji = emoji || arthurReactions[Math.floor(Math.random() * arthurReactions.length)];
                await sock.sendMessage(data.jid, { react: { text: chosenEmoji, key: msg.key } });
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

        const sendResponse = async (textMessage, buttonsArray) => {
            const imagePath = getRandomImage();

            if (imagePath && fs.existsSync(imagePath)) {
                try {
                    await sock.sendMessage(data.jid, { image: { url: imagePath } });
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

            return await sock.sendMessage(data.jid, { text: textMessage });
        };

        // ==========================================
        // 1. القائمة الرئيسية (.اوامر) - معلومات النظام فقط
        // ==========================================
        if (!subCommand) {
            react("👑");

            let menu =
`*╔═══════════╗*
*  👑 𝐀𝐑𝐓𝐇𝐔𝐑 👑*
*╚═══════════╝*

*╭━━━━━━━━━━━╮*
*┃ 🤖 البوت : Arthur*
*┃ 👑 المطور : Arthur*
*┃ ⚡ الحالة : 🟢 Online*
*┃ 📦 الإصدار : 2.0.0*
*┃ ⏳ التشغيل : ${uptimeFormatted}*
*┃ 💾 الذاكرة : ${memoryUsage}*
*┃ 🚀 السرعة : 0.18s*
*┃ 📂 الأقسام : ${order.length} أقسام*
*┃ 📜 الأوامر : ${totalCommandsCount} أمر*
*┃ 📅 التاريخ : ${date}*
*┃ 📆 اليوم : ${day}*
*┃ 🕒 الوقت : ${time}*
*╰━━━━━━━━━━━╯*

*╭━━━━━━━━━━━╮*
*┃ اضغط أحد الأزرار 👇*
*╰━━━━━━━━━━━╯*`;

            const buttonsArray = [
                { displayText: "📂 قائمة الأقسام", id: ".اوامر الاقسام" },
                { displayText: "🌟 كل الأقسام", id: ".اوامر كل_الاقسام" },
                { displayText: "📊 معلومات النظام", id: ".اوامر" },
                { displayText: "📢 قناة البوت", id: "https://whatsapp.com/channel/YOUR_CHANNEL_ID" }
            ];

            return await sendResponse(menu, buttonsArray);
        }

        // ==========================================
        // 1.5. عرض كل الأقسام دفعة واحدة (.اوامر كل_الاقسام)
        // ==========================================
        if (subCommand === "كل_الاقسام" || subCommand === "كل") {
            react("📚");

            let allText = 
`*╔═══════════╗*
*  📚 كل الأقسام*
*╚═══════════╝*\n`;

            order.forEach((cat, index) => {
                const cmdCount = categories[cat].length;
                allText += 
`
*╭──〔 ${index + 1} 〕──╮*
*┃ ${getIcon(cat)} ${cat}*
*┃ 📌 ${cmdCount} أمر*
*╰─────────╯*`;
            });

            allText += `\n\n*━━━━━━━━━━━━━*\n*💡 جميع أقسام البوت المتاحة.*`;

            const buttonsArray = [
                { displayText: "📂 صفحة الأقسام", id: ".اوامر الاقسام" },
                { displayText: "📜 الرئيسية", id: ".اوامر" }
            ];

            return await sendResponse(allText, buttonsArray);
        }

        // ==========================================
        // 2. عرض جميع الأقسام مع نظام الصفحات (.اوامر الاقسام أو .اوامر الاقسام 2)
        // ==========================================
        if (subCommand === "الاقسام" || subCommand === "الأقسام") {
            react("📁");

            const itemsPerPage = 3;
            const totalPages = Math.ceil(order.length / itemsPerPage);
            const currentPage = isNaN(pageArg) || pageArg < 1 ? 1 : (pageArg > totalPages ? totalPages : pageArg);

            const startIndex = (currentPage - 1) * itemsPerPage;
            const currentCategories = order.slice(startIndex, startIndex + itemsPerPage);

            let listText = 
`*╔═══════════╗*
*  📂 أقسام البوت*
*╚═══════════╝*\n`;

            currentCategories.forEach((cat, index) => {
                const absoluteIndex = startIndex + index + 1;
                const cmdCount = categories[cat].length;
                listText += 
`
*╭───〔 ${absoluteIndex} 〕───╮*
*┃ ${getIcon(cat)} ${cat}*
*┃ 📌 ${cmdCount} أمر*
*╰───────────╯*`;
            });

            listText += `\n\n*━━━━━━━━━━━━━*\n*💡 صفحة ${currentPage} من ${totalPages} | اضغط رقم القسم أو الزر.*`;

            let buttonsArray = currentCategories.map((cat, index) => {
                const absoluteIndex = startIndex + index + 1;
                return {
                    displayText: `${getIcon(cat)} ${cat.length > 15 ? cat.substring(0, 12) + ".." : cat}`,
                    id: `.اوامر ${absoluteIndex}`
                };
            });

            if (currentPage < totalPages) {
                buttonsArray.push({ displayText: `➡️ التالي (${currentPage + 1})`, id: `.اوامر الاقسام ${currentPage + 1}` });
            }
            if (currentPage > 1) {
                buttonsArray.push({ displayText: `⬅️ السابق (${currentPage - 1})`, id: `.اوامر الاقسام ${currentPage - 1}` });
            }

            buttonsArray.push({ displayText: "🌟 كل الأقسام", id: ".اوامر كل_الاقسام" });
            buttonsArray.push({ displayText: "📜 الرئيسية", id: ".اوامر" });

            return await sendResponse(listText, buttonsArray);
        }

        // ==========================================
        // 3. عرض أوامر القسم المحدد (.اوامر 1, .اوامر 2...)
        // ==========================================
        const index = parseInt(subCommand) - 1;

        if (isNaN(index) || index < 0 || index >= order.length) {
            return sock.sendMessage(data.jid, {
                text: `*╭━━〔 ❌ خطأ 〕━━╮*\n*┤ القسم غير موجود*\n*┤ استخدم .اوامر للقائمة الرئيسية*\n*╰━━━━━━━━━━━━╯*`
            });
        }

        const category = order[index];
        react(getIcon(category));

        let text =
`*╔═══════════╗*
*  ${getIcon(category)} ${category}*
*╚═══════════╝*

*┏━━━━━━━━━━┓*\n`;

        for (const cmd of categories[category]) {
            text += `*┃ ⭐ .${cmd.command}*\n`;
        }

        text += 
`*┗━━━━━━━━━━┛*

*📌 عدد الأوامر : ${categories[category].length}*`;

        const categoryButtons = [
            { displayText: "📂 قائمة الأقسام", id: ".اوامر الاقسام" },
            { displayText: "🌟 كل الأقسام", id: ".اوامر كل_الاقسام" },
            { displayText: "📜 الرئيسية", id: ".اوامر" }
        ];

        return await sendResponse(text, categoryButtons);
    }
};
