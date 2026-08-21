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
        // التحقق مما إذا كان المستخدم ضغط على زر القناة الخاص بإرسال الرابط
        const input = data.text ? data.text.trim() : "";
        if (input === ".رابط_القناة" || input.includes("رابط القناة")) {
            return await sock.sendMessage(data.jid, { 
                text: `📢 *قناة المطور Salman الرسمية:*\nhttps://whatsapp.com/channel/0029Vb8ejXH7oQhXeLW2Kd1H` 
            });
        }

        const speedStart = process.hrtime();
        const pluginsPath = path.join(__dirname, "../plugins");

        let files = [];
        try {
            if (fs.existsSync(pluginsPath)) {
                files = fs.readdirSync(pluginsPath).filter(f => f.endsWith(".js"));
            }
        } catch {}

        let categories = Object.create(null);
        let order = [];
        let totalCommandsCount = 0;

        const normalizeCategoryName = (name) => {
            if (!name) return "أخرى";
            let clean = name.trim().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
            
            if (/^(مطور|المطور|dev)$/i.test(clean)) return "المطور";
            if (/^(الادوات|ادوات|tools?)$/i.test(clean)) return "الادوات";
            if (/^(النخبه|نخبه|النخب|elite)$/i.test(clean)) return "النخبة";
            if (/^(الادار|اداره|إدارة|admin)$/i.test(clean)) return "الإدارة";
            if (/^(التحميل|تحميل|download)$/i.test(clean)) return "التحميل";
            if (/^(العاب|لعب|games?)$/i.test(clean)) return "الألعاب";
            if (/^(اسلامي|دين|الدين|islamic)$/i.test(clean)) return "الإسلامي";

            return name.trim();
        };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file === "قسم.js" || file === "ق.js" || file === "اوامر.js") continue;
            
            try {
                const plugin = await import(`../plugins/${file}?t=${startTime}`);
                const cmd = plugin.default;

                if (!cmd || !cmd.command || !cmd.category) continue;

                const formattedCategory = normalizeCategoryName(cmd.category);

                if (!categories[formattedCategory]) {
                    categories[formattedCategory] = [];
                    order.push(formattedCategory);
                }

                categories[formattedCategory].push({
                    command: cmd.command,
                    description: cmd.description || "لا يوجد وصف"
                });
                totalCommandsCount++;
            } catch {}
        }

        const args = input.replace(/^\.اوامر/, "").trim().split(/\s+/);
        const subCommand = args[0] ? args[0].toLowerCase() : "";

        const now = new Date();
        const date = now.toLocaleDateString("ar-SA");
        const time = now.toLocaleTimeString("ar-SA");

        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const uptimeFormatted = `${hours}س ${minutes}د ${seconds}ث`;

        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + "MB";

        let botMode = "عام";
        try {
            const possibleModePaths = [
                path.join(__dirname, "../data/مود"),
                path.join(__dirname, "data/مود"),
                path.join(process.cwd(), "data/مود")
            ];
            
            for (const modePath of possibleModePaths) {
                if (fs.existsSync(modePath)) {
                    const modeFiles = fs.readdirSync(modePath);
                    if (modeFiles.length > 0) {
                        botMode = "خاص";
                        break;
                    }
                }
            }
        } catch {}

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

                for (let i = 0; i < possiblePaths.length; i++) {
                    const targetPath = possiblePaths[i];
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

        const newsletterConfig = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363410672713016@newsletter',
                newsletterName: '𝐍𝐎𝐓𝐄  𝐁𝐎𝐓',
                serverMessageId: -1
            }
        };

        const sendResponse = async (textMessage, buttonsArray) => {
            const imagePath = getRandomImage();

            if (imagePath && fs.existsSync(imagePath)) {
                try {
                    await sock.sendMessage(data.jid, { 
                        image: { url: imagePath },
                        ...newsletterConfig 
                    });
                } catch (e) {}
            }

            if (buttonsArray && typeof sock.sendRealButtons === "function") {
                try {
                    return await sock.sendRealButtons(
                        data.jid,
                        textMessage,
                        "𝐀𝐑𝐓𝐇𝐔𝐑 ✦ 𝐁𝐎𝐓 𝟐𝟎𝟐𝟔",
                        buttonsArray
                    );
                } catch (e) {}
            }

            return await sock.sendMessage(data.jid, { text: textMessage, ...newsletterConfig });
        };

        const endTime = process.hrtime(speedStart);
        const pingSpeed = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2) + "ms";

        // ==========================================
        // 1. القائمة الرئيسية (.اوامر)
        // ==========================================
        if (!subCommand) {
            react("👑");

            let menu =
`*╭━━━〔 𝐀𝐑𝐓𝐇𝐔𝐑 ✦ 𝐁𝐎𝐓 〕━━━╮*
*┃ 🤖 البوت : 𝐀𝐑𝐓𝐇𝐔𝐑*
*┃ 👑 المطور : Salman*
*┃ ⚡ الحالة : ${botMode}*
*┃ ⏳ التشغيل : ${uptimeFormatted}*
*┃ 🚀 السرعة : ${pingSpeed}*
*┃ 📂 الأقسام : ${order.length} | 📜 الأوامر : ${totalCommandsCount}*
*╰━━━━━━━━━━━━━╯*`;

            const buttonsArray = [
                { displayText: "📂 أقسام البوت", id: ".اوامر الاقسام" },
                { displayText: "📢 قناة Salman", id: ".رابط_القناة" }
            ];

            return await sendResponse(menu, buttonsArray);
        }

        // ==========================================
        // 2. عرض جميع الأقسام كإطارات منفصلة مرتبة (.اوامر الاقسام)
        // ==========================================
        if (subCommand === "الاقسام" || subCommand === "الأقسام") {
            react("📁");

            let listText = `*╭━━━〔 جـمـيـع الأقـسـام 〕━━━╮*`;

            for (let i = 0; i < order.length; i++) {
                const cat = order[i];
                const cmdCount = categories[cat].length;
                listText += `\n*┃ ${getIcon(cat)} ${cat} ⟸ (${cmdCount} أمر)*\n*╰━━━━━━━━━━━━━╯*`;
            }

            let buttonsArray = order.map((cat, index) => {
                const absoluteIndex = index + 1;
                return {
                    displayText: `${getIcon(cat)} ${cat.length > 13 ? cat.substring(0, 10) + ".." : cat}`,
                    id: `.اوامر ${absoluteIndex}`
                };
            });

            buttonsArray.push(
                { displayText: "📜 الرئيسية", id: ".اوامر" },
                { displayText: "📢 قناة Salman", id: ".رابط_القناة" }
            );

            return await sendResponse(listText, buttonsArray);
        }

        // ==========================================
        // 3. عرض أوامر القسم المحدد (.اوامر 1, .اوامر 2...)
        // ==========================================
        const index = parseInt(subCommand) - 1;

        if (isNaN(index) || index < 0 || index >= order.length) {
            return sock.sendMessage(data.jid, {
                text: `*❌ القسم غير موجود! استخدم .اوامر للعودة.*`,
                ...newsletterConfig
            });
        }

        const category = order[index];
        react(getIcon(category));

        let text =
`*╭━━━〔 ${getIcon(category)} ${category} 〕━━━╮*`;

        const cmdList = categories[category];
        for (let i = 0; i < cmdList.length; i++) {
            text += `\n*┃ ⚜️ .${cmdList[i].command}*`;
        }

        text += 
`\n*╰━━━━━━━━━━━━━╯*
*📌 الإجمالي : ${cmdList.length} أمر*`;

        const categoryButtons = [
            { displayText: "📂 الأقسام", id: ".اوامر الاقسام" },
            { displayText: "📜 الرئيسية", id: ".اوامر" },
            { displayText: "📢 قناة Salman", id: ".رابط_القناة" }
        ];

        return await sendResponse(text, categoryButtons);
    }
};
