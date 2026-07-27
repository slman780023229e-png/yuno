import fs from "fs";
import path from "path";

const baseDir = process.cwd();
const dataDir = path.join(baseDir, "data");
const stateFile = path.join(dataDir, "workRegistration.json");
const استقبالFolder = path.join(baseDir, "استقبال_الألقاب");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(استقبالFolder)) {
    fs.mkdirSync(استقبالFolder, { recursive: true });
}

if (!fs.existsSync(stateFile)) {
    fs.writeFileSync(stateFile, JSON.stringify({}, null, 2));
}

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(stateFile, "utf8"));
    } catch {
        return {};
    }
}

function saveState(data) {
    fs.writeFileSync(stateFile, JSON.stringify(data, null, 2));
}

let listenerStarted = false;

export function initWorkListener(sock) {
    if (listenerStarted) return;
    listenerStarted = true;

    setInterval(async () => {
        try {
            const db = loadState();
            const activeGroups = Object.keys(db).filter(jid => db[jid]?.active);
            if (activeGroups.length === 0) return;

            if (!fs.existsSync(استقبالFolder)) return;
            const folders = fs.readdirSync(استقبالFolder, { withFileTypes: true });

            for (const folder of folders) {
                if (folder.isDirectory()) {
                    const folderName = folder.name;
                    const folderPath = path.join(استقبالFolder, folderName);

                    for (const jid of activeGroups) {
                        if (!db[jid].processed) {
                            db[jid].processed = [];
                        }

                        if (db[jid].processed.includes(folderName)) {
                            continue;
                        }

                        // قراءة الملفات واستخراج البيانات أولاً لمعرفة "من طرف"
                        const files = fs.readdirSync(folderPath);
                        let userJid = null;
                        let userPhone = null;
                        let invitedBy = "موطن فلوريا";

                        for (const file of files) {
                            if (file.endsWith(".txt")) {
                                try {
                                    const content = fs.readFileSync(path.join(folderPath, file), "utf8");
                                    const match = content.match(/(\d{10,15})/);
                                    if (match) {
                                        userPhone = match[1];
                                        userJid = `${userPhone}@s.whatsapp.net`;
                                    }
                                    if (content.includes("من طرف")) {
                                        const parts = content.split("من طرف");
                                        if (parts[1]) invitedBy = parts[1].trim().split("\n")[0];
                                    }
                                } catch (err) {}
                            }
                        }

                        // تفعيل العداد المستقل لكل "من طرف" على حدة، مع الحفاظ على عداد الاستقبال الكلي
                        if (!db[jid].inviterCounters) {
                            db[jid].inviterCounters = {};
                        }
                        if (!db[jid].inviterCounters[invitedBy]) {
                            db[jid].inviterCounters[invitedBy] = 0;
                        }

                        db[jid].inviterCounters[invitedBy]++;
                        const inviterCount = db[jid].inviterCounters[invitedBy];

                        db[jid].counter = (db[jid].counter || 0) + 1;
                        const totalReceptionCount = db[jid].counter;

                        db[jid].processed.push(folderName);
                        saveState(db);

                        // إرسال جهة الاتصال وضمان عملها بنجاح تام
                        if (userPhone) {
                            try {
                                await sock.sendMessage(jid, {
                                    contacts: {
                                        displayName: folderName,
                                        contacts: [{
                                            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${folderName}\nTEL;type=CELL;type=VOICE;waid=${userPhone}:+${userPhone}\nEND:VCARD`
                                        }]
                                    }
                                });
                            } catch (contactErr) {}
                        }

                        const currentDate = new Date().toLocaleDateString('ar-EG');

                        const registrationForm = 
`اسـتـمـارة تـسـجـيـل 
❉━═━╄━❪🪶❫━╃━═━❉

📜 مـعـلـومـات الـتـسـجـيـل ↶

الـقـب ↜〘 ${folderName} 〙⃤🪶

مـن طـرف ↜〘 ${invitedBy} 〙⃤👤 ( ${inviterCount} )

الـتـاريـخ ↜〘 ${currentDate} 〙⃤📅

الـعـدد ↜〘 ${inviterCount} 〙⃤🔢

الـمـسـؤول ↜〘 الـبـوت 〙⃤🤖

عـدد الاسـتـقـبـال ↜〘 ${totalReceptionCount} 〙⃤🌿

❉━═━╄━❪🪶❫━╃━═━❉
 
❖ 𝐅𝐋𝐎𝐑𝐈𝐀 𝐊𝐈𝐍𝐆𝐃𝐎𝐌 ❖`;

                        await sock.sendMessage(jid, {
                            text: registrationForm,
                            mentions: userJid ? [userJid] : []
                        });
                    }
                }
            }
        } catch (e) {}
    }, 5000);
};

export default {
    command: "ورك",
    category: "الإدارة",
    description: "مراقبة مجلد الاستقبال وتحويل العضو لجهة اتصال وإرسال استمارة التسجيل تلقائياً (خاص بالمشرفين)",

    initWorkListener: initWorkListener,

    onMessage: async (sock, msg) => {
        initWorkListener(sock);
    },

    execute: async (sock, msg, data) => {
        const jid = data.jid;
        const sender = data.sender || msg.key.participant || msg.participant;

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, { text: "❌ الأمر للمجموعات فقط" }, { quoted: msg });
        }

        try {
            const groupMetadata = await sock.groupMetadata(jid);
            const participants = groupMetadata.participants || [];
            const participantInfo = participants.find(p => p.id === sender);
            const isAdmin = participantInfo && (participantInfo.admin === "admin" || participantInfo.admin === "superadmin");

            if (!isAdmin) {
                return sock.sendMessage(jid, { text: "❌ هذا الأمر مخصص للمشرفين فقط!" }, { quoted: msg });
            }
        } catch (err) {
            return sock.sendMessage(jid, { text: "❌ تعذر التحقق من صلاحيات المشرفين في المجموعة." }, { quoted: msg });
        }

        initWorkListener(sock);

        const fullText = data.text ? data.text.trim() : "";
        const cleanText = fullText.replace(/^\./, "").trim();
        const db = loadState();

        if (cleanText === "ورك" || !cleanText) {
            const isActive = db[jid]?.active;
            return sock.sendMessage(
                jid,
                {
                    text: 
`🪶 حـالـة نـظـام ورك تـسـجـيـل

${isActive ? "✅ الـحـالـة: مـفـعـل" : "⛔ الـحـالـة: مـتـوقـف"}

طـريـقـة الاسـتـخـدام ↶
.ورك تسجيل
.ورك توقف عن التسجيل`
                },
                { quoted: msg }
            );
        }

        if (cleanText.includes("توقف عن التسجيل")) {
            if (!db[jid]?.active) {
                return sock.sendMessage(jid, { text: "⚠️ نظام ورك تسجيل متوقف بالفعل في هذه المجموعة" }, { quoted: msg });
            }

            delete db[jid];
            saveState(db);

            return sock.sendMessage(
                jid,
                { text: "⛔ تم إيقاف ورك تسجيل بنجاح في هذه المجموعة" },
                { quoted: msg }
            );
        }

        const isRegisterCommand = cleanText.includes("تسجيل") && !cleanText.includes("توقف");

        if (isRegisterCommand || cleanText === "ورك تسجيل") {
            db[jid] = {
                active: true,
                counter: db[jid]?.counter || 0,
                inviterCounters: db[jid]?.inviterCounters || {},
                processed: db[jid]?.processed || []
            };

            saveState(db);

            return sock.sendMessage(
                jid,
                {
                    text: 
`━━━╼╃⌬〔 🪶 𝐅𝐋𝐎𝐑𝐈𝐀 🪶 〕⌬╄━━━

✅ تـم تـفـعـيـل نـظـام الـتـسـجـيـل بـنـجـاح

🪶 سيتم مراقبة مجلد الاستقبال وإرسال جهة اتصال العضو يليه استمارة التسجيل تلقائياً

⚜️ 𝐅𝐋𝐎𝐑𝐈𝐀 𝐁𝐎𝐓`
                },
                { quoted: msg }
            );
        }
    }
};
