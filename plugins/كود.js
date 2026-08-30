import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار ملف النخبة الموحد
const eliteFile = path.join(
    process.cwd(),
    "data/النخبة.json"
);

function getElite() {
    try {
        if (!fs.existsSync(eliteFile)) {
            const dir = path.dirname(eliteFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(
                eliteFile,
                JSON.stringify([], null, 2)
            );
        }
        return JSON.parse(
            fs.readFileSync(
                eliteFile,
                "utf-8"
            )
        );
    } catch {
        return [];
    }
}

const checkElitePermission = (senderJid) => {
    if (!senderJid) return false;
    const cleanSender = senderJid.replace(/[^0-9]/g, "");
    const eliteUsers = getElite();
    return eliteUsers.some(num => num.replace(/[^0-9]/g, "") === cleanSender);
};

const getAllSystemFiles = () => {
    const rootDir = path.join(__dirname, "..");
    const pluginsDir = path.join(rootDir, "plugins");
    const utilsDir = path.join(rootDir, "utils");
    const dataDir = path.join(rootDir, "data");

    let fileList = [];

    if (fs.existsSync(pluginsDir)) {
        fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js")).forEach(f => {
            fileList.push({ name: f, path: path.join(pluginsDir, f), category: "Plugins" });
        });
    }

    if (fs.existsSync(utilsDir)) {
        fs.readdirSync(utilsDir).filter(f => f.endsWith(".js")).forEach(f => {
            fileList.push({ name: f, path: path.join(utilsDir, f), category: "Utils" });
        });
    }

    if (fs.existsSync(dataDir)) {
        fs.readdirSync(dataDir).filter(f => !f.includes("session") && !f.includes("ملف_الاتصال")).forEach(f => {
            const fullP = path.join(dataDir, f);
            if (fs.lstatSync(fullP).isFile()) {
                fileList.push({ name: f, path: fullP, category: "Data" });
            }
        });
    }

    fs.readdirSync(rootDir).forEach(f => {
        const fullP = path.join(rootDir, f);
        if (fs.lstatSync(fullP).isFile() && (f.endsWith(".js") || f === "package.json")) {
            fileList.push({ name: f, path: fullP, category: "Root" });
        }
    });

    return fileList;
};

export default {
    command: ["كود", "عرض_الكود"],
    category: "النخبة",
    description: "جلب وحذف أكواد النظام والبلجنات بالاسم أو الرقم لأعضاء النخبة حصرياً",

    execute: async (sock, msg, data) => {
        const chatId = data.jid;
        const senderJid = data.sender || msg.key.participant || msg.key.remoteJid;

        if (!checkElitePermission(senderJid)) {
            return await sock.sendMessage(chatId, {
                text: "*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n⚔️ *عذراً، هذا الأمر خاص بأعضاء النخبة فقط!*\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*"
            }, { quoted: msg });
        }

        // تفاعل بالدم 🩸 على رسالة العضو فوراً
        await sock.sendMessage(chatId, {
            react: { text: "🩸", key: msg.key }
        }).catch(() => {});

        let rawText = data.text ? data.text.trim() : "";
        const parts = rawText.split(/\s+/);
        parts.shift(); // إزالة اسم الأمر الرئيسي
        
        const subCommand = parts[0] ? parts[0].toLowerCase() : "";
        parts.shift(); // إزالة الكلمة الفرعية (عرض أو حذف)
        const queryArg = parts.join(" ").trim();

        const allFiles = getAllSystemFiles();

        // 1. أمر العرض بالتصميم الأسطوري المتناسق
        if (subCommand === "عرض" || subCommand === "الكل" || (!subCommand && !queryArg)) {
            let listText = 
`*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n` +
`       *𝚫𝚪𝚻𝚮𝚼𝚪 • 𝚩𝚯𝚻 2026*\n` +
`*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n` +
`⚡ *قائمة ملفات النظام النشطة:* \n`;

            allFiles.forEach((file, index) => {
                listText += `❖ [${index + 1}] \`${file.name}\`\n`;
            });

            listText += 
`*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n` +
`💡 *طريقة الاستخدام:*\n` +
`• لجلب الكود: \`.كود [الرقم أو الاسم]\`\n` +
`• لحذف ملف: \`.كود حذف [الرقم أو الاسم]\`\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`;

            return await sock.sendMessage(chatId, { text: listText }, { quoted: msg });
        }

        // 2. أمر الحذف
        if (subCommand === "حذف") {
            if (!queryArg) {
                return await sock.sendMessage(chatId, {
                    text: "*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *يرجى تحديد اسم أو رقم الملف المراد حذفه.*\n💡 *مثال:* \`.كود حذف plugin.js\`\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*"
                }, { quoted: msg });
            }

            let targetFile = null;

            if (!isNaN(queryArg)) {
                const index = parseInt(queryArg) - 1;
                if (index >= 0 && index < allFiles.length) {
                    targetFile = allFiles[index];
                }
            } else {
                targetFile = allFiles.find(f => f.name.toLowerCase().includes(queryArg.toLowerCase()));
            }

            if (!targetFile || !fs.existsSync(targetFile.path)) {
                return await sock.sendMessage(chatId, {
                    text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *لم يتم العثور على أي ملف مطابق لـ:* \`${queryArg}\`\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
                }, { quoted: msg });
            }

            // حماية المجلدات والملفات الأساسية الحساسة جداً من الحذف الخاطئ
            const criticalFiles = ["package.json", "index.js", "main.js"];
            if (criticalFiles.includes(targetFile.name.toLowerCase()) || targetFile.category === "Root") {
                return await sock.sendMessage(chatId, {
                    text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n⚠️ *لا يمكن حذف هذا الملف الأساسي (${targetFile.name}) حمايةً لاستقرار النظام!*\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
                }, { quoted: msg });
            }

            try {
                fs.unlinkSync(targetFile.path);
                return await sock.sendMessage(chatId, {
                    text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n✅ *تم حذف الملف بنجاح تام:*\n📁 \`${targetFile.name}\`\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
                }, { quoted: msg });
            } catch (err) {
                return await sock.sendMessage(chatId, {
                    text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *حدث خطأ أثناء محاولة حذف الملف:* ${err.message}\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
                }, { quoted: msg });
            }
        }

        // معالجة البحث المباشر
        const directQuery = subCommand ? `${subCommand} ${queryArg}`.trim() : queryArg;
        let targetFile = null;

        if (!isNaN(directQuery)) {
            const index = parseInt(directQuery) - 1;
            if (index >= 0 && index < allFiles.length) {
                targetFile = allFiles[index];
            }
        } else {
            targetFile = allFiles.find(f => f.name.toLowerCase().includes(directQuery.toLowerCase()));
        }

        if (!targetFile || !fs.existsSync(targetFile.path)) {
            return await sock.sendMessage(chatId, {
                text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *لم يتم العثور على أي ملف مطابق لـ:* \`${directQuery}\`\n\n*اكتب:* \`.كود عرض\` لمعرفة الأسماء المتاحة.\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
            }, { quoted: msg });
        }

        try {
            // جلب محتوى الملف كاملاً بدون أي اقتصاص
            const fileContent = fs.readFileSync(targetFile.path, "utf8");

            const interactiveMessage = {
                body: { text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n*𝚫𝚪𝚻𝚮𝚼𝚪 • 𝚩𝚯𝚻*\n📁 *الملف:* \`${targetFile.name}\`\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*` },
                footer: { text: "✦ 𝚫𝚪𝚻𝚮𝚼𝚪 𝕰𝖑𝖎𝖙𝖊 2026 ✦" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: `📋 نسخ كود ${targetFile.name}`,
                                copy_code: fileContent
                            })
                        }
                    ],
                    messageParamsJson: ""
                }
            };

            const msgEnv = generateWAMessageFromContent(
                chatId,
                { viewOnceMessage: { message: { interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMessage) } } },
                { userJid: sock.user.jid, quoted: msg }
            );

            return await sock.relayMessage(chatId, msgEnv.message, {
                messageId: msgEnv.key.id,
                additionalNodes: [{ tag: "biz", attrs: {}, content: [{ tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [{ tag: "native_flow", attrs: { name: "quick_reply" } }] }] }]
            });

        } catch (err) {
            return await sock.sendMessage(chatId, {
                text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *حدث خطأ أثناء قراءة الملف:* ${err.message}\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`
            }, { quoted: msg });
        }
    }
};
