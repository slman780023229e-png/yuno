import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    proto
} from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startTime = Date.now();

// ═══════════════════════════════════════════════════════
// 🖼️ جلب صورة عشوائية
// ═══════════════════════════════════════════════════════

const getRandomImageBuffer = () => {
    const possibleFolders = [
        path.join(__dirname, "../صور"),
        path.join(__dirname, "صور"),
        path.join(process.cwd(), "صور"),
        path.join(process.cwd(), "images")
    ];

    for (const folderPath of possibleFolders) {
        try {
            if (
                fs.existsSync(folderPath) &&
                fs.lstatSync(folderPath).isDirectory()
            ) {
                const files = fs
                    .readdirSync(folderPath)
                    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

                if (files.length > 0) {
                    const randomFile =
                        files[Math.floor(Math.random() * files.length)];

                    return fs.readFileSync(
                        path.join(folderPath, randomFile)
                    );
                }
            }
        } catch {}
    }

    return null;
};

// ═══════════════════════════════════════════════════════
// 📂 الأمر
// ═══════════════════════════════════════════════════════

export default {
    command: "اوامر",
    category: "النظام",
    description: "عرض واجهة القائمة والأقسام التفاعلية",

    execute: async (sock, msg, data) => {

        // ═══════════════════════════════════════════════════════
        // ⚡ تفاعل بالدم فقط
        // ═══════════════════════════════════════════════════════

        try {
            await sock.sendMessage(data.jid, {
                react: {
                    text: "🩸",
                    key: msg.key
                }
            });
        } catch {}

        const input = data.text ? data.text.trim() : "";

        // ═══════════════════════════════════════════════════════
        // 🔗 روابط
        // ═══════════════════════════════════════════════════════

        if (
            input === ".رابط_القناة" ||
            input.includes("رابط القناة")
        ) {
            return await sock.sendMessage(data.jid, {
                text:
`📢 *قناة المطور Salman الرسمية:*

https://whatsapp.com/channel/0029Vb8ejXH7oQhXeLW2Kd1H`
            });
        }

        if (
            input === ".رابط_المطور" ||
            input.includes("رابط المطور")
        ) {
            return await sock.sendMessage(data.jid, {
                text:
`📞 *للتواصل المباشر مع المطور Salman:*

https://wa.me/967780023229`
            });
        }

        // ═══════════════════════════════════════════════════════
        // 📁 مجلد الإضافات
        // ═══════════════════════════════════════════════════════

        const pluginsPath = path.join(__dirname, "../plugins");

        let files = [];

        try {
            if (fs.existsSync(pluginsPath)) {
                files = fs
                    .readdirSync(pluginsPath)
                    .filter(f => f.endsWith(".js"));
            }
        } catch {}

        // ═══════════════════════════════════════════════════════
        // 📂 الأقسام
        // ═══════════════════════════════════════════════════════

        let categories = Object.create(null);
        let order = [];
        let totalCommandsCount = 0;

        const normalizeCategoryName = (name) => {

            if (!name) return "أخرى";

            const clean = name
                .trim()
                .replace(/[أإآ]/g, "ا")
                .replace(/ة/g, "ه");

            if (/^(مطور|المطور|dev)$/i.test(clean))
                return "المطور";

            if (/^(الادوات|ادوات|tools?)$/i.test(clean))
                return "الادوات";

            if (/^(النخبه|نخبه|النخب|elite)$/i.test(clean))
                return "النخبة";

            if (/^(الادار|اداره|إدارة|admin)$/i.test(clean))
                return "الإدارة";

            if (/^(التحميل|تحميل|download)$/i.test(clean))
                return "التحميل";

            if (/^(العاب|لعب|games?)$/i.test(clean))
                return "الألعاب";

            if (/^(اسلامي|دين|الدين|islamic)$/i.test(clean))
                return "الإسلامي";

            return name.trim();
        };

        // ═══════════════════════════════════════════════════════
        // 🔍 قراءة البلجنات تلقائياً
        // ═══════════════════════════════════════════════════════

        for (const file of files) {

            if (
                file === "قسم.js" ||
                file === "ق.js" ||
                file === "اوامر.js"
            ) continue;

            try {

                const plugin =
                    await import(
                        `../plugins/${file}?t=${Date.now()}`
                    );

                const cmd = plugin.default;

                if (
                    !cmd ||
                    !cmd.command ||
                    !cmd.category
                ) continue;

                const formattedCategory =
                    normalizeCategoryName(cmd.category);

                if (!categories[formattedCategory]) {
                    categories[formattedCategory] = [];
                    order.push(formattedCategory);
                }

                categories[formattedCategory].push({
                    command: cmd.command,
                    description:
                        cmd.description || "لا يوجد وصف"
                });

                totalCommandsCount++;

            } catch {}
        }

        // ═══════════════════════════════════════════════════════
        // 🎯 معرفة القسم المختار
        // ═══════════════════════════════════════════════════════

        const args = input
            .replace(/^\.اوامر/, "")
            .trim()
            .split(/\s+/);

        const subCommand =
            args[0] ? args[0].toLowerCase() : "";

        // ═══════════════════════════════════════════════════════
        // ⏱️ وقت التشغيل
        // ═══════════════════════════════════════════════════════

        const uptimeSeconds =
            Math.floor((Date.now() - startTime) / 1000);

        const hours =
            Math.floor(uptimeSeconds / 3600);

        const minutes =
            Math.floor((uptimeSeconds % 3600) / 60);

        const seconds =
            uptimeSeconds % 60;

        const uptimeFormatted =
            `${hours}س ${minutes}د ${seconds}ث`;

        // ═══════════════════════════════════════════════════════
        // ⚡ حالة البوت
        // ═══════════════════════════════════════════════════════

        let botMode = "عام";

        try {

            const possibleModePaths = [
                path.join(__dirname, "../data/مود"),
                path.join(__dirname, "data/مود"),
                path.join(process.cwd(), "data/مود")
            ];

            for (const modePath of possibleModePaths) {

                if (fs.existsSync(modePath)) {

                    const modeFiles =
                        fs.readdirSync(modePath);

                    if (modeFiles.length > 0) {
                        botMode = "خاص";
                        break;
                    }
                }
            }

        } catch {}

        // ═══════════════════════════════════════════════════════
        // 🎨 أيقونات الأقسام
        // ═══════════════════════════════════════════════════════

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

                "تحميل": "📥",
                "download": "📥",

                "النخب": "👑",
                "elite": "👑",

                "العاب": "🎮",
                "لعب": "🎮",
                "game": "🎮",

                "الدين": "🕌",
                "اسلامي": "🕌"
            };

            for (const key in icons) {
                if (n.includes(key))
                    return icons[key];
            }

            return "📂";
        };

        // ═══════════════════════════════════════════════════════
        // 🖼️ الصورة
        // ═══════════════════════════════════════════════════════

        const imageBuffer = getRandomImageBuffer();

        // ═══════════════════════════════════════════════════════
        // 📂 القائمة الرئيسية
        // ═══════════════════════════════════════════════════════

        if (!subCommand) {

            let media = null;

            if (imageBuffer) {
                try {

                    media = await prepareWAMessageMedia(
                        { image: imageBuffer },
                        {
                            upload:
                                sock.waUploadToServer
                        }
                    );

                } catch {}
            }

            // تصميم مرتب بالإطارات القصيرة المتناسقة المطلوبة
            const textBody = 
`*╭━━━━━━━━━━━━╮*
*┃          🩸 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 🩸     ┃*
*╰━━━━━━━━━━━━╯*

      *🩸 𝐓𝐇𝐄 𝐃𝐀𝐑𝐊 𝐊𝐈𝐍𝐆 🩸*

*「 على عرش الدماء والجبروت، حيث تركع السلاطين وتصمت الأساطير، يُبنى قانون أرثر الأبدي.. لا مرجعية تعلو فوق سيادة الظلام. 」*

*╭━━〔نظام الملك ارثر〕━━╮*
*┃*
*┃  ⚔️ البوت   :* 𝐀𝐑𝐓𝐇𝐔𝐑
*┃  👑 المطور   :* 𝐒𝐚𝐥𝐦𝐚𝐧
*┃  🩸 الحالة   : ${botMode}*
*┃  ⏳ التشغيل  :* ${uptimeFormatted}
*┃  🏰 الأقسام  :* ${order.length}
*┃  ⚔️ الأوامر   :* ${totalCommandsCount}
*┃*
*╰━━━━━━━━━━━╯*

   🩸 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓🔥`;

            // ═══════════════════════════════════════════════════
            // 📋 ترتيب الأقسام تلقائياً مع عرض تفصيلي مرتب داخل القائمة المندلجة
            // ═══════════════════════════════════════════════════

            const rows = order.map((cat, index) => {

                const cmdCount =
                    categories[cat].length;

                return {
                    header: getIcon(cat),

                    title: `【 ${cat} 】`,

                    description:
                        `⚡ قسم مخصص يضم (${cmdCount}) أمرًا لخدمتك باحترافية`,

                    id: `.اوامر ${index + 1}`
                };
            });

            // ═══════════════════════════════════════════════════
            // 📱 القائمة المندمجة
            // ═══════════════════════════════════════════════════

            const interactiveMessage = {

                body: {
                    text: textBody
                },

                footer: {
                    text:
                        "✦ 🩸 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓"
                },

                header: {
                    title:
                        "🩸 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓 𝟐𝟎𝟐𝟔",

                    hasMediaAttachment:
                        media ? true : false,

                    imageMessage:
                        media
                            ? media.imageMessage
                            : null
                },

                nativeFlowMessage: {

                    buttons: [

                        {
                            name: "single_select",

                            buttonParamsJson:
                                JSON.stringify({

                                    title:
                                        "📂 الأقـسـام",

                                    sections: [
                                        {
                                            title: "⚡ الأقسام الرئيسية والخدمية",

                                            rows: rows
                                        }
                                    ]
                                })
                        },

                        {
                            name: "cta_url",

                            buttonParamsJson:
                                JSON.stringify({

                                    display_text:
                                        "👑 المطور",

                                    url:
                                        "https://wa.me/967780023229",

                                    merchant_url:
                                        "https://wa.me/967780023229"
                                })
                        },

                        {
                            name: "cta_url",

                            buttonParamsJson:
                                JSON.stringify({

                                    display_text:
                                        "📢 القناة",

                                    url:
                                        "https://whatsapp.com/channel/0029Vb8ejXH7oQhXeLW2Kd1H",

                                    merchant_url:
                                        "https://whatsapp.com/channel/0029Vb8ejXH7oQhXeLW2Kd1H"
                                })
                        }
                    ],

                    messageParamsJson: ""
                }
            };

            const msgEnv =
                generateWAMessageFromContent(
                    data.jid,

                    {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage:
                                    proto.Message
                                        .InteractiveMessage
                                        .fromObject(
                                            interactiveMessage
                                        )
                            }
                        }
                    },

                    {
                        userJid:
                            sock.user.jid,

                        quoted:
                            msg
                    }
                );

            return await sock.relayMessage(
                data.jid,
                msgEnv.message,
                {
                    messageId:
                        msgEnv.key.id,

                    additionalNodes: [
                        {
                            tag: "biz",

                            attrs: {},

                            content: [
                                {
                                    tag: "interactive",

                                    attrs: {
                                        type:
                                            "native_flow",

                                        v: "1"
                                    },

                                    content: [
                                        {
                                            tag:
                                                "native_flow",

                                            attrs: {
                                                name:
                                                    "quick_reply"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            );
        }

        // ═══════════════════════════════════════════════════════
        // ❌ القسم غير موجود
        // ═══════════════════════════════════════════════════════

        const index =
            parseInt(subCommand) - 1;

        if (
            isNaN(index) ||
            index < 0 ||
            index >= order.length
        ) {

            return await sock.sendMessage(
                data.jid,
                {
                    text:
                        "*❌ القسم غير موجود يا سلمان! استخدم .اوامر للعودة.*"
                }
            );
        }

        // ═══════════════════════════════════════════════════════
        // 📂 بيانات القسم
        // ═══════════════════════════════════════════════════════

        const category =
            order[index];

        const cmdList =
            categories[category];

        // ═══════════════════════════════════════════════════════
        // 📝 بناء نص الأوامر بنفس الإطارات القصيرة المتناسقة
        // ═══════════════════════════════════════════════════════

        let text =
`*╭━━━━━━━━━━━━╮*
*┃  ${getIcon(category)} قسم : ${category}  ┃*
*╰━━━━━━━━━━━━╯*\n`;

        for (let i = 0; i < cmdList.length; i++) {
            text += `◈ .${cmdList[i].command}\n  └ 🏷️ _${cmdList[i].description}_\n`;
        }

        text +=
`*╭━━━━━━━━━━━━╮*
*┃ 📌 الإجمالي : ${cmdList.length} ┃*
*╰━━━━━━━━━━━━╯*`;

        // ═══════════════════════════════════════════════════════
        // 🖼️ تجهيز الصورة
        // ═══════════════════════════════════════════════════════

        let media = null;

        if (imageBuffer) {

            try {

                media = await prepareWAMessageMedia(
                    {
                        image: imageBuffer
                    },
                    {
                        upload:
                            sock.waUploadToServer
                    }
                );

            } catch {}
        }

        // ═══════════════════════════════════════════════════════
        // 🔘 أزرار القسم
        // ═══════════════════════════════════════════════════════

        const categoryInteractiveMessage = {

            body: {
                text: text
            },

            footer: {
                text:
                    "✦ ARTHUR BOT ✦"
            },

            header: {
                title:
                    `${getIcon(category)} ${category}`,

                hasMediaAttachment:
                    media ? true : false,

                imageMessage:
                    media
                        ? media.imageMessage
                        : null
            },

            nativeFlowMessage: {

                buttons: [

                    // ═══════════════════════════════════════
                    // 👑 زر التنصيب
                    // ═══════════════════════════════════════

                    {
                        name: "quick_reply",

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    "👑 تنصيب",

                                id:
                                    ".تنصيب"
                            })
                    },

                    // ═══════════════════════════════════════
                    // 👨‍💻 زر المطور
                    // ═══════════════════════════════════════

                    {
                        name: "quick_reply",

                        buttonParamsJson:
                            JSON.stringify({

                                display_text:
                                    "👨‍💻 المطور",

                                id:
                                    ".المطور"
                            })
                    }
                ],

                messageParamsJson: ""
            }
        };

        // ═══════════════════════════════════════════════════════
        // 📤 إنشاء رسالة القسم
        // ═══════════════════════════════════════════════════════

        const categoryMsg =
            generateWAMessageFromContent(

                data.jid,

                {
                    viewOnceMessage: {
                        message: {

                            interactiveMessage:
                                proto.Message
                                    .InteractiveMessage
                                    .fromObject(
                                        categoryInteractiveMessage
                                    )
                        }
                    }
                },

                {
                    userJid:
                        sock.user.jid,

                    quoted:
                        msg
                }
            );

        // ═══════════════════════════════════════════════════════
        // 🚀 إرسال القسم مع الزرين
        // ═══════════════════════════════════════════════════════

        return await sock.relayMessage(
            data.jid,
            categoryMsg.message,
            {
                messageId:
                    categoryMsg.key.id,

                additionalNodes: [
                    {
                        tag: "biz",

                        attrs: {},

                        content: [
                            {
                                tag: "interactive",

                                attrs: {
                                    type:
                                        "native_flow",

                                    v: "1"
                                },

                                content: [
                                    {
                                        tag:
                                            "native_flow",

                                        attrs: {
                                            name:
                                                "quick_reply"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        );
    }
};
