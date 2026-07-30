import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// دالة ذكية للبحث التلقائي عن ملف مفاتيح.js داخل مجلد data أينما كان
function findKeysFile(dir) {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                const found = findKeysFile(fullPath);
                if (found) return found;
            } else if (file.name === "مفاتيح.js") {
                return fullPath;
            }
        }
    } catch (e) {}
    return null;
}

// استخراج جميع المفاتيح من ملف مفاتيح.js
let apiKeysArray = [];
try {
    const dataDir = path.join(process.cwd(), "data");
    const keysPath = findKeysFile(dataDir);
    if (keysPath && fs.existsSync(keysPath)) {
        const fileContent = fs.readFileSync(keysPath, "utf8");
        
        const arrayMatch = fileContent.match(/geminiApiKey\s*:\s*\[([\s\S]*?)\]/);
        if (arrayMatch) {
            const matches = arrayMatch[1].match(/["']([^"']+)["']/g);
            if (matches) {
                apiKeysArray = matches.map(m => m.replace(/["']/g, ""));
            }
        } 
        
        if (apiKeysArray.length === 0) {
            const singleMatch = fileContent.match(/geminiApiKey\s*:\s*["']([^"']+)["']/);
            if (singleMatch) {
                apiKeysArray = [singleMatch[1]];
            }
        }
    }
} catch (err) {}

let currentKeyIndex = 0;

export default {
    command: "ذكاء",
    category: "الذكاء الاصطناعي",
    description: "الدردشة وسؤال الذكاء الاصطناعي جيميني",

    execute: async (sock, msg, data) => {
        const jid = data.jid;

        const text =
        data.text ||
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

        const query = text.replace(/^\.?(ذكاء|AI)/i, "").trim();

        if (!query) {
            return sock.sendMessage(
                jid,
                { text: "⚠️ يرجى كتابة السؤال بعد الأمر.\nمثال: .ذكاء ما هي عاصمة فرنسا؟" },
                { quoted: msg }
            );
        }

        if (apiKeysArray.length === 0) {
            return sock.sendMessage(
                jid,
                { text: "❌ تنبيه: لم يتم العثور على مفاتيح صالحة داخل ملف مفاتيح.js في مجلد data" },
                { quoted: msg }
            );
        }

        await sock.sendMessage(
            jid,
            { text: "🤖 جاري التفكير..." },
            { quoted: msg }
        );

        let attempts = 0;
        let success = false;
        let replyText = "";
        let lastError = "";

        while (attempts < apiKeysArray.length && !success) {
            try {
                const currentApiKey = apiKeysArray[currentKeyIndex];
                const genAI = new GoogleGenerativeAI(currentApiKey);
                
                // استخدام الموديل المدعوم حالياً
                const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
                const result = await model.generateContent(query);
                const response = await result.response;
                replyText = response.text();
                
                success = true;
            } catch (e) {
                lastError = e.message;
                console.warn(`⚠️ المفتاح رقم ${currentKeyIndex + 1} واجه خطأ: ${e.message} - جاري الانتقال للمفتاح التالي...`);
                
                currentKeyIndex = (currentKeyIndex + 1) % apiKeysArray.length;
                attempts++;
            }
        }

        if (success) {
            await sock.sendMessage(
                jid,
                { text: replyText },
                { quoted: msg }
            );
        } else {
            await sock.sendMessage(
                jid,
                { text: `❌ تعذّر إتمام الطلب بجميع المفاتيح.\nالخطأ الأخير: ${lastError}` },
                { quoted: msg }
            );
        }
    }
};