import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// دالة للتحقق مما إذا كان المستخدم من النخبة
const checkElitePermission = (msg, data) => {
    try {
        const senderJid = msg.key.participant || data.jid || "";
        const senderNumber = senderJid.replace(/[^0-9]/g, "");
        const dataDir = path.join(__dirname, "../data");

        if (!fs.existsSync(dataDir)) return false;

        const files = fs.readdirSync(dataDir);
        const eliteFile = files.find(f => /نخبة|elite/i.test(f));

        if (!eliteFile) return false;

        const filePath = path.join(dataDir, eliteFile);
        const fileContent = fs.readFileSync(filePath, "utf8");
        
        if (fileContent.includes("{") || fileContent.includes("[")) {
            const parsed = JSON.parse(fileContent);
            const stringified = JSON.stringify(parsed);
            return stringified.includes(senderNumber);
        } else {
            return fileContent.includes(senderNumber);
        }
    } catch (e) {
        return false;
    }
};

export default {
    command: "استبدال",
    category: "المطور",
    description: "عرض قائمة ملفات مجلد utils والبلجنات أو استبدال أي ملف بالرد على الكود برقم أو اسم الملف (خاص بالنخبة فقط)",

    execute: async (sock, msg, data) => {
        const jid = data?.jid || msg.key.remoteJid;

        // التحقق من صلاحيات النخبة
        const isElite = checkElitePermission(msg, data);
        if (!isElite) {
            return await sock.sendMessage(jid, {
                text: `*╭━━〔 ❌ عذراً 〕━━╮*\n*┤ هذا الأمر مخصص لقسم (النخبة) فقط*\n*┤ لست مسجلاً في قائمة النخبة لتنفيذ الاستبدال*\n*╰─────────────╯*`,
                quoted: msg
            });
        }

        const pluginsPath = path.join(__dirname, "../plugins");
        const utilsPath = path.join(__dirname, "../utils");

        let allFiles = [];
        try {
            // جلب ملفات مجلد utils (الهبلر، الهيدرا، وملفات المعالجة)
            if (fs.existsSync(utilsPath)) {
                const utilsFiles = fs.readdirSync(utilsPath)
                    .filter(f => f.endsWith(".js") || f.endsWith(".json"))
                    .map(f => ({ name: f, fullPath: path.join(utilsPath, f), type: "Utils / Handler" }));
                allFiles.push(...utilsFiles);
            }

            // جلب ملفات البلجنات
            if (fs.existsSync(pluginsPath)) {
                const pluginFiles = fs.readdirSync(pluginsPath)
                    .filter(f => f.endsWith(".js"))
                    .map(f => ({ name: f, fullPath: path.join(pluginsPath, f), type: "Plugin" }));
                
                for (const pf of pluginFiles) {
                    if (!allFiles.some(af => af.name === pf.name)) {
                        allFiles.push(pf);
                    }
                }
            }
        } catch (e) {}

        const input = data.text ? data.text.trim() : "";
        const args = input.replace(/^\.استبدال/, "").trim().split(/\s+/);
        const query = args[0] ? args[0].toLowerCase() : "";

        // إذا لم يتم كتابة رقم أو اسم، عرض قائمة ملفات utils والبلجنات المتاحة
        if (!query) {
            let listText = `╭━━━ ⚡ *قائمة ملفات النظام & Utils* ━━━╮\n\n`;
            allFiles.forEach((file, index) => {
                const icon = file.type === "Utils / Handler" ? "⚡" : "🧩";
                listText += `*${index + 1}-* ${icon} \`${file.name}\` (${file.type})\n`;
            });
            listText += `\n╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            listText += `💡 *للاستبدال:* رد على رسالة الكود الجديد واكتب:\n\`.استبدال [الرقم أو الاسم]\`\n*مثال:* \`.استبدال 1\` أو \`.استبدال handler.js\``;

            return await sock.sendMessage(jid, { text: listText }, { quoted: msg });
        }

        // التحقق من الرد على رسالة الكود
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return await sock.sendMessage(jid, {
                text: `*❌ يجب عليك الرد على رسالة تحتوي على الكود الجديد واستخدام الأمر مع رقم أو اسم الملف.*\n*مثال:* \`.استبدال 1\``,
                quoted: msg
            });
        }

        let newContent = quotedMsg.conversation || 
                         quotedMsg.extendedTextMessage?.text || 
                         quotedMsg.imageMessage?.caption || 
                         quotedMsg.documentMessage?.caption || "";

        // استخراج الكود الصافي إذا كان داخل كود بلوك
        if (newContent.includes("```")) {
            const match = newContent.match(/```(?:javascript|js|json)?\n([\s\S]*?)```/);
            if (match && match[1]) {
                newContent = match[1];
            }
        }

        if (!newContent.trim()) {
            return await sock.sendMessage(jid, {
                text: `*❌ الرسالة التي رددت عليها لا تحتوي على كود برمجي صالح!*`,
                quoted: msg
            });
        }

        let targetFileObj = null;
        const parsedIndex = parseInt(query);

        if (!isNaN(parsedIndex) && parsedIndex >= 1 && parsedIndex <= allFiles.length) {
            targetFileObj = allFiles[parsedIndex - 1];
        } else {
            targetFileObj = allFiles.find(f => f.name.toLowerCase() === query || f.name.toLowerCase().replace(/\.(js|json)$/, "") === query);
        }

        if (!targetFileObj) {
            return await sock.sendMessage(jid, {
                text: `*❌ الملف غير موجود! تأكد من الرقم أو الاسم (اكتب .استبدال وحدها لرؤية القائمة).*`,
                quoted: msg
            });
        }

        try {
            fs.writeFileSync(targetFileObj.fullPath, newContent, "utf8");

            await sock.sendMessage(jid, {
                text: `*✅ تم استبدال الملف بنجاح!*\n*📄 الملف:* \`${targetFileObj.name}\`\n\n*🛡️ تم تحديث وحفظ الملف في مجلد (${targetFileObj.type}) فوراً.*`,
                quoted: msg
            });

        } catch (e) {
            await sock.sendMessage(jid, {
                text: `*❌ حدث خطأ أثناء الاستبدال: ${e.message}*`,
                quoted: msg
            });
        }
    }
};
