import fs from "fs";
import path from "path";
import axios from "axios";

/* ═══════════════════════════════════════
   📺 YOUTUBE ULTIMATE SYSTEM (WORKING BUTTONS)
═══════════════════════════════════════ */

const MAX_RESULTS = 5; 
const CACHE_TIME = 30 * 60 * 1000; // 30 دقيقة

if (!globalThis.youtubeSelections) {
    globalThis.youtubeSelections = new Map();
}

function cleanName(name) {
    return String(name || "YouTube")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function createID() {
    return (
        "yt_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function cleanupSelections() {
    const now = Date.now();
    for (const [id, item] of globalThis.youtubeSelections) {
        if (now - item.time > CACHE_TIME) {
            globalThis.youtubeSelections.delete(id);
        }
    }
}

async function searchYouTube(query) {
    try {
        const response = await axios.get(`https://api.ryzendev.com/api/search/youtube?query=${encodeURIComponent(query)}`, {
            timeout: 30000,
            headers: {
                "User-Agent": "YUNO-BOT/1.0"
            }
        });
        const data = response.data;
        const results = data?.results || data?.data || data?.videos || [];
        return Array.isArray(results) ? results : [];
    } catch {
        return [];
    }
}

async function getYouTubeDownloadUrl(videoUrl) {
    try {
        const response = await axios.get(`https://api.ryzendev.com/api/downloader/ytmp4?url=${encodeURIComponent(videoUrl)}`, {
            timeout: 30000,
            headers: {
                "User-Agent": "YUNO-BOT/1.0"
            }
        });
        return response.data?.data?.dl_url || response.data?.dl_url || response.data?.url || null;
    } catch {
        return null;
    }
}

async function downloadVideo(url, output) {
    const response = await axios.get(url, {
        responseType: "stream",
        timeout: 120000,
        maxRedirects: 10,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "video/mp4,video/*,*/*"
        }
    });

    const type = String(response.headers["content-type"] || "").toLowerCase();
    
    if (type.includes("text/html") || type.includes("application/json")) {
        throw new Error("رابط التحميل لم يرجع ملف فيديو مباشر.");
    }

    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(output);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
        response.data.on("error", reject);
    });

    if (!fs.existsSync(output)) {
        throw new Error("لم يتم إنشاء ملف الفيديو.");
    }

    const stats = fs.statSync(output);
    if (stats.size <= 0) {
        throw new Error("ملف الفيديو فارغ.");
    }

    return stats;
}

export default {
    command: ["يوتيوب", "تحميليوتيوب", "تحميلالكليوتيوب"],
    category: "التحميل",
    description: "البحث عن فيديوهات YouTube وتحميلها مباشرة مع 5 أزرار وزر تحميل الكل في الأسفل",

    execute: async (sock, m, { noPrefixText, jid }) => {
        let file = null;

        try {
            cleanupSelections();

            const rawText = String(noPrefixText || "").trim();
            const args = rawText ? rawText.split(/\s+/) : [];
            const command = String(args.shift() || "").replace(/^\./, "").toLowerCase();
            const query = args.join(" ").trim();

            if (!command && !query) {
                return await sock.sendMessage(
                    jid,
                    {
                        text:
                            "⚠️ اكتب اسم الفيديو.\n\n" +
                            "📌 مثال:\n" +
                            ".يوتيوب قرآن كريم"
                    },
                    { quoted: m }
                );
            }

            // 1. معالجة أمر "تحميل الكل"
            if (command === "تحميلالكليوتيوب") {
                const batchId = query;
                const itemsList = globalThis.youtubeSelections.get(batchId);

                if (!itemsList || !Array.isArray(itemsList)) {
                    try { await sock.sendMessage(jid, { react: { text: "❌", key: m.key } }); } catch {}
                    return await sock.sendMessage(
                        jid,
                        { text: "❌ انتهت صلاحية الأزرار أو قائمة التحميل. يرجى البحث من جديد." },
                        { quoted: m }
                    );
                }

                try { await sock.sendMessage(jid, { react: { text: "⏳", key: m.key } }); } catch {}

                setImmediate(async () => {
                    let successCount = 0;
                    for (let i = 0; i < itemsList.length; i++) {
                        const item = itemsList[i];
                        if (!item.url) continue;

                        let tempFile = path.join(process.cwd(), `yt_all_${Date.now()}_${i}.mp4`);
                        try {
                            const dlLink = await getYouTubeDownloadUrl(item.url);
                            if (!dlLink) continue;

                            await downloadVideo(dlLink, tempFile);
                            await sock.sendMessage(
                                jid,
                                {
                                    video: { url: tempFile },
                                    mimetype: "video/mp4",
                                    fileName: `${cleanName(item.title)}.mp4`,
                                    caption: `📺 ${item.title}\n👤 ${item.author}\n\n📱 YouTube (${i + 1}/${itemsList.length})`
                                },
                                { quoted: m }
                            );
                            successCount++;
                        } catch {}

                        try {
                            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                        } catch {}

                        await new Promise(res => setTimeout(res, 1500));
                    }

                    try { await sock.sendMessage(jid, { react: { text: successCount > 0 ? "✅" : "❌", key: m.key } }); } catch {}
                });

                return;
            }

            // 2. معالجة أمر "تحميل فيديو فردي"
            if (command === "تحميليوتيوب") {
                const targetId = query;
                const selected = globalThis.youtubeSelections.get(targetId);

                if (!selected) {
                    try { await sock.sendMessage(jid, { react: { text: "❌", key: m.key } }); } catch {}
                    return await sock.sendMessage(
                        jid,
                        { text: "❌ انتهت صلاحية هذا الزر. يرجى البحث مرة أخرى." },
                        { quoted: m }
                    );
                }

                try { await sock.sendMessage(jid, { react: { text: "📥", key: m.key } }); } catch {}

                if (!selected.url) {
                    throw new Error("لم يتم العثور على رابط الفيديو الأصلي.");
                }

                const dlLink = await getYouTubeDownloadUrl(selected.url);
                if (!dlLink) {
                    throw new Error("فشل في جلب رابط التحميل المباشر من يوتيوب.");
                }

                file = path.join(process.cwd(), `youtube_${Date.now()}.mp4`);
                await downloadVideo(dlLink, file);

                await sock.sendMessage(
                    jid,
                    {
                        video: { url: file },
                        mimetype: "video/mp4",
                        fileName: `${cleanName(selected.title)}.mp4`,
                        caption:
                            `📺 ${selected.title}\n` +
                            `👤 ${selected.author}\n\n` +
                            `📱 YouTube`
                    },
                    { quoted: m }
                );

                try { await sock.sendMessage(jid, { react: { text: "✅", key: m.key } }); } catch {}
                globalThis.youtubeSelections.delete(targetId);
                return;
            }

            // 3. عملية البحث الجديدة
            const searchInput = command === "يوتيوب" ? (query ? query : args.join(" ")) : (command + " " + query).trim();
            
            if (command === "يوتيوب" && !searchInput) {
                return await sock.sendMessage(
                    jid,
                    {
                        text:
                            "⚠️ اكتب اسم الفيديو.\n\n" +
                            "📌 مثال:\n" +
                            ".يوتيوب قرآن كريم"
                    },
                    { quoted: m }
                );
            }

            const finalQuery = searchInput || rawText;
            if (!finalQuery) {
                return await sock.sendMessage(
                    jid,
                    {
                        text:
                            "⚠️ اكتب اسم الفيديو.\n\n" +
                            "📌 مثال:\n" +
                            ".يوتيوب قرآن كريم"
                    },
                    { quoted: m }
                );
            }

            try { await sock.sendMessage(jid, { react: { text: "🔎", key: m.key } }); } catch {}

            const posts = await searchYouTube(finalQuery);

            if (!posts.length) {
                try { await sock.sendMessage(jid, { react: { text: "❌", key: m.key } }); } catch {}
                return await sock.sendMessage(
                    jid,
                    { text: `❌ لم أجد نتائج لـ: ${finalQuery}` },
                    { quoted: m }
                );
            }

            const results = posts
                .slice(0, MAX_RESULTS)
                .map(post => {
                    const id = createID();
                    const title = cleanName(post.title || "فيديو يوتيوب");
                    const author = cleanName(post.author?.name || post.channel || "YouTube");
                    const url = post.url || post.link || `https://youtube.com/watch?v=${post.videoId}`;

                    return {
                        id,
                        time: Date.now(),
                        title,
                        author,
                        url
                    };
                })
                .filter(x => x.url);

            if (!results.length) {
                try { await sock.sendMessage(jid, { react: { text: "❌", key: m.key } }); } catch {}
                return await sock.sendMessage(
                    jid,
                    { text: "❌ لم أجد روابط صالحة للتحميل." },
                    { quoted: m }
                );
            }

            const batchId = "all_" + Date.now().toString(36);
            globalThis.youtubeSelections.set(batchId, results);

            results.forEach(item => {
                globalThis.youtubeSelections.set(item.id, item);
            });

            const buttons = [
                ...results.map((item, index) => {
                    let title = item.title;
                    if (title.length > 25) {
                        title = title.slice(0, 22) + "...";
                    }
                    return {
                        displayText: `📺 ${index + 1} | ${title}`,
                        id: `.تحميليوتيوب ${item.id}`
                    };
                }),
                {
                    displayText: `📥 تحميل الكل (${results.length})`,
                    id: `.تحميلالكليوتيوب ${batchId}`
                }
            ];

            const menu =
                `📺 *نتائج YouTube*\n\n` +
                `🔎 البحث: *${finalQuery}*\n` +
                `📊 النتائج: ${results.length}\n\n` +
                `👇 اختر ما تريد تحميله:`;

            try { await sock.sendMessage(jid, { react: { text: "✅", key: m.key } }); } catch {}

            if (typeof sock.sendRealButtons === "function") {
                try {
                    return await sock.sendRealButtons(
                        jid,
                        menu,
                        "YUNO YOUTUBE",
                        buttons
                    );
                } catch {}
            }

            let fallback = menu + "\n\n";
            results.forEach((item, index) => {
                fallback += `*${index + 1}.* ${item.title}\n🔗 .تحميليوتيوب ${item.id}\n\n`;
            });
            fallback += `🔗 .تحميلالكليوتيوب ${batchId}\n`;

            return await sock.sendMessage(
                jid,
                { text: fallback },
                { quoted: m }
            );

        } catch (error) {
            try { await sock.sendMessage(jid, { react: { text: "❌", key: m.key } }); } catch {}
            let errorText = error?.message || String(error);

            return await sock.sendMessage(
                jid,
                { text: `❌ حدث خطأ:\n${String(errorText).slice(0, 1000)}` },
                { quoted: m }
            );

        } finally {
            if (file) {
                setTimeout(() => {
                    try {
                        if (fs.existsSync(file)) {
                            fs.unlinkSync(file);
                        }
                    } catch {}
                }, 20000);
            }
        }
    }
};
