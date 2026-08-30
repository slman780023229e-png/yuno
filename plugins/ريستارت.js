import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    command: "ريستارت",
    category: "النظام",
    description: "إعادة تشغيل البوت على منصة Render (خاص بالنخبة فقط)",

    execute: async (sock, msg, data) => {
        const jid = data?.jid || msg.key.remoteJid;

        // ==========================
        // البحث عن ملف النخبة والتحقق
        // ==========================
        const dataPath = path.join(__dirname, "../data");
        let elite = [];

        const files = [
            "النخبة.json",
            "النخبه.json",
            "النخبة",
            "النخبه"
        ];

        for (const file of files) {
            const filePath = path.join(dataPath, file);
            if (fs.existsSync(filePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, "utf8");
                    if (fileContent.includes("{") || fileContent.includes("[")) {
                        const rawData = JSON.parse(fileContent);
                        elite = Array.isArray(rawData) ? rawData : Object.values(rawData);
                    } else {
                        elite = fileContent.split(/\r?\n/).filter(Boolean);
                    }
                    console.log("تم تحميل النخبة من:", filePath);
                    break;
                } catch (err) {
                    console.log("خطأ قراءة النخبة:", err.message);
                }
            }
        }

        const cleanElite = elite.map(x => String(x).replace(/\D/g, ""));

        // ==========================
        // استخراج رقم المرسل بدقة وتوافق تام
        // ==========================
        const senderJid = msg.key.participant || msg.key.remoteJid || data?.sender || data?.jid || "";
        const number = senderJid.replace(/[^0-9]/g, "");

        console.log("رقم المرسل:", number);
        console.log("النخبة المصفاة:", cleanElite);

        const isElite = cleanElite.some(el => {
            return number === el || 
                   (number.length > 8 && el.length > 8 && (number.endsWith(el) || el.endsWith(number)));
        });

        if (!isElite) {
            return await sock.sendMessage(jid, {
                text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n❌ *هذا الأمر مخصص لقسم (النخبة) فقط*\n*لست مسجلاً في قائمة النخبة لإعادة التشغيل*\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`,
                quoted: msg
            });
        }

        // ==========================
        // حفظ مكان الرسالة وقت الريستارت
        // ==========================
        const restartFile = path.join(dataPath, "restart.json");
        try {
            if (!fs.existsSync(dataPath)) {
                fs.mkdirSync(dataPath, { recursive: true });
            }
            fs.writeFileSync(
                restartFile,
                JSON.stringify({
                    jid: jid,
                    time: Date.now()
                })
            );
        } catch (e) {}

        await sock.sendMessage(jid, {
            text: `*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*\n♻️ *𝐀𝐑𝐓𝐇𝐔𝐑 𝐑𝐄𝐁𝐎𝐎𝐓 🛡️*\n⚡ *جاري إعادة تشغيل النواة الآن...*\n🔄 *يرجى الانتظار ثوانٍ معدودة...*\n*◇❐ ═━━━╾ 🩸 ╼━━━═ ❐◇*`,
            quoted: msg
        });

        // ==========================
        // إعادة التشغيل على Render
        // ==========================
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }
};