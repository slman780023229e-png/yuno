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
    description: "جلب أكواد النظام والبلجنات بالاسم أو الرقم لأعضاء النخبة حصرياً",

    execute: async (sock, msg, data) => {
        const chatId = data.jid;
        const senderJid = data.sender || msg.key.participant || msg.key.remoteJid;

        if (!checkElitePermission(senderJid)) {
            return await sock.sendMessage(chatId, {
                text: "❌ *عذراً، هذا الأمر مخصص حصرياً لأعضاء فئة (النخبة) فقط!*"
            }, { quoted: msg });
        }

        // تفاعل بالدم 🩸 على رسالة العضو فوراً
        await sock.sendMessage(chatId, {
            react: { text: "🩸", key: msg.key }
        }).catch(() => {});

        let rawText = data.text ? data.text.trim() : "";
        const parts = rawText.split(/\s+/);
        parts.shift();
        const subCommand = parts[0] ? parts[0].toLowerCase() : "";
        const queryArg = parts.join(" ").trim();

        const allFiles = getAllSystemFiles();

        // 1. أمر العرض بإطار أنيق وأقصر لضمان التنسيق المثالي في واتساب
        if (subCommand === "عرض" || subCommand === "الكل" || !queryArg) {
            if (!queryArg || subCommand === "عرض" || subCommand === "الكل") {
                let listText = 
`┌─── 🩸 𝕬𝕽𝕿𝕳𝖀𝕽 𝕰𝖑𝖎𝖙𝖊 ───┐\n`;
                
                allFiles.forEach((file, index) => {
                    listText += `│ 🩸 [${index + 1}] \`${file.name}\`\n`;
                });

                listText += 
`└─────────────────────┘\n` +
`💡 استخدم: \`.كود [الرقم أو الاسم]\``;

                return await sock.sendMessage(chatId, { text: listText }, { quoted: msg });
            }
        }

        // 2. جلب الملف بالرقم أو بالاسم
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
                text: `❌ *لم يتم العثور على أي ملف مطابق لـ:* \`${queryArg}\`\n\n*اكتب:* \`.كود عرض\` لمعرفة الأرقام والأسماء المتاحة.`
            }, { quoted: msg });
        }

        try {
            let fileContent = fs.readFileSync(targetFile.path, "utf8");
            if (fileContent.length > 60000) {
                fileContent = fileContent.slice(0, 60000) + "\n\n// ... [تم اقتصاص المحتوى لحجمه الضخم]";
            }

            const interactiveMessage = {
                body: { text: `🩸 *[ 𝕬𝕽𝕿𝕳𝖀𝕽 ]* ── ⟨ ملف: ${targetFile.name} ⟩` },
                footer: { text: "✦ 🩸 𝕬𝕽𝕿𝕳𝖀𝕽 𝕰𝖑𝖎𝖙𝖊 2026 ✦" },
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
                text: `❌ *حدث خطأ أثناء قراءة الملف:* ${err.message}`
            }, { quoted: msg });
        }
    }
};