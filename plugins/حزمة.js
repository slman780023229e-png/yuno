import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import JSZip from 'jszip';

/* ========= إعدادات Pinterest ========= */
const base = "https://www.pinterest.com";
const search = "/resource/BaseSearchResource/get/";

const headers = {
  accept: "application/json, text/javascript, */*, q=0.01",
  referer: "https://www.pinterest.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "x-app-version": "a9522f",
  "x-pinterest-appstate": "active",
  "x-pinterest-pws-handler": "www/[username]/[slug].js",
  "x-requested-with": "XMLHttpRequest",
};

async function getCookies() {
  try {
    const response = await axios.get(base);
    const setHeaders = response.headers["set-cookie"];
    if (setHeaders) {
      return setHeaders.map(v => v.split(";")[0]).join("; ");
    }
    return null;
  } catch {
    return null;
  }
}

async function searchPinterest(query) {
  try {
    const cookies = await getCookies();
    if (!cookies) return { status: false, message: "فشل جلب الكوكيز." };

    const params = {
      source_url: `/search/pins/?q=${query}`,
      data: JSON.stringify({
        options: {
          isPrefetch: false,
          query,
          scope: "pins",
          bookmarks: [""],
          page_size: 40, 
        },
        context: {},
      }),
      _: Date.now(),
    };

    const { data } = await axios.get(`${base}${search}`, {
      headers: { ...headers, cookie: cookies },
      params,
    });

    const results = data.resource_response.data.results.filter(
      v => v.images?.orig
    );

    if (!results.length)
      return { status: false, message: "لم يتم العثور على نتائج." };

    return {
      status: true,
      pins: results.map(v => ({
        id: v.id,
        image: v.images.orig.url,
      })),
    };
  } catch (e) {
    return { status: false, message: "حدث خطأ في البحث." };
  }
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

function toB64Url(buffer) {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

async function makeTrayWebp(buffer) {
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) throw new Error('يرجى تثبيت مكتبة sharp');

    return await sharpMod.default(buffer, { animated: false })
        .resize(252, 252, { fit: 'cover' })
        .webp()
        .toBuffer();
}

async function makeStickerWebp(buffer) {
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) throw new Error('يرجى تثبيت مكتبة sharp');

    // ضبط الملصق ليكون عريضًا واحترافيًا بخلفية شفافة متناسقة
    return await sharpMod.default(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp()
        .toBuffer();
}

async function makeThumbnailJpeg(buffer) {
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) throw new Error('يرجى تثبيت مكتبة sharp');

    return await sharpMod.default(buffer)
        .resize(252, 252, { fit: 'cover' })
        .jpeg()
        .toBuffer();
}

async function uploadToServer(conn, buffer, { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) }) {
    const expanded = Buffer.from(
        crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(hkdf), 112),
    );

    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const macKey = expanded.subarray(48, 80);

    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const mac = crypto
        .createHmac('sha256', macKey)
        .update(iv)
        .update(encrypted)
        .digest()
        .subarray(0, 10);

    const encBuffer = Buffer.concat([encrypted, mac]);
    const fileEncSha256 = sha256(encBuffer);

    const iq = await conn.query({
        tag: 'iq',
        attrs: {
            id: conn.generateMessageTag?.() ?? Date.now().toString(),
            to: 's.whatsapp.net',
            type: 'set',
            xmlns: 'w:m',
        },
        content: [{ tag: 'media_conn', attrs: {} }],
    });

    const mediaConn = iq.content?.find(v => v.tag === 'media_conn');
    if (!mediaConn) throw new Error('media_conn tidak ditemukan');

    const auth = mediaConn.attrs?.auth;
    const hosts = (mediaConn.content || [])
        .filter(v => v.tag === 'host')
        .map(v => v.attrs?.hostname)
        .filter(Boolean);

    if (!hosts.length) throw new Error('host upload tidak ditemukan');

    const token = encodeURIComponent(
        fileEncSha256.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
    );

    for (const host of hosts) {
        try {
            const json = await new Promise((resolve, reject) => {
                const url = new URL(`https://${host}${mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`);
                const req = https.request({
                    hostname: url.hostname,
                    port: 443,
                    path: url.pathname + url.search,
                    method: 'POST',
                    headers: {
                        Origin: 'https://web.whatsapp.com',
                        Referer: 'https://web.whatsapp.com/',
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': encBuffer.length,
                    },
                }, (res) => {
                    let body = '';
                    res.on('data', c => body += c);
                    res.on('end', () => {
                        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('Upload failed'));
                        resolve(JSON.parse(body));
                    });
                });
                req.on('error', reject);
                req.write(encBuffer);
                req.end();
            });

            const directPath = json.direct_path ?? json.directPath ?? json.url ?? json.path;
            if (directPath) return { mediaKey, fileLength: buffer.length, fileSha256: sha256(buffer), fileEncSha256, directPath, ...json };
        } catch {}
    }
    throw new Error('فشلت محاولات الرفع للسيرفر');
}

export default {
    command: "حزمه",
    category: "تحميل",
    description: "جلب حزمة ملصقات عريضة ومنوعة (30 ملصق) من بينترست",

    execute: async (sock, msg, data) => {
        const input = data.text ? data.text.trim() : "";
        const args = input.replace(/^\.حزمه/, "").trim().split(/\s+/);
        const query = args[0] ? args[0] : "";
        const style = args[1] ? args[1].toLowerCase() : "";

        if (!query) {
            return await sock.sendMessage(data.jid, {
                text: `*╭━━〔 ⚡ 𝐀𝐑𝐓𝐇𝐔𝐑 ⚡ 〕━━╮*\n*┃ ❌ يرجى كتابة اسم الشخصية*\n*┃ 📌 مثال: .حزمه ايزن*\n*╰━━━━━━━━━━━━━╯*`
            }, { quoted: msg });
        }

        // إذا لم يتم اختيار الستايل، نقوم بعرض أزرار لثلاثة أنواع/أنماط مختلفة تماماً للصور (كلها 30 ملصق لكن صور مختلفة)
        if (!style) {
            try {
                await sock.sendMessage(data.jid, { react: { text: '👑', key: msg.key } });
            } catch {}

            let menuText = 
`*╔═══════════╗*
*👑 اختيار نمط حزمة ${query}*
*╚═══════════╝*

*╭━━━━━━━━━━━╮*
*┃ 📌 كل حزمة تحتوي على 30 ملصق*
*┃ 🎨 اختر النمط المناسب للصور:*
*╰━━━━━━━━━━━╯*`;

            const buttonsArray = [
                { displayText: `⚡ ${query} (ستايل 1 : منوع)`, id: `.حزمه ${query} style1` },
                { displayText: `🔥 ${query} (ستايل 2 : فخم)`, id: `.حزمه ${query} style2` },
                { displayText: `💎 ${query} (ستايل 3 : قتال)`, id: `.حزمه ${query} style3` }
            ];

            if (typeof sock.sendRealButtons === "function") {
                try {
                    return await sock.sendRealButtons(
                        data.jid,
                        menuText,
                        "ARTHUR BOT SYSTEM 2026",
                        buttonsArray
                    );
                } catch (e) {}
            }

            return await sock.sendMessage(data.jid, { text: menuText });
        }

        // تخصيص كلمات البحث بدقة بناءً على النمط المختار لضمان اختلاف الصور تماماً لكل حزمة
        let searchQuery = query;
        let packNameSuffix = "منوع";
        if (style === "style1") {
            searchQuery = `${query} aesthetic wallpaper`;
            packNameSuffix = "Aesthetic";
        } else if (style === "style2") {
            searchQuery = `${query} dark badass icon`;
            packNameSuffix = "Badass";
        } else if (style === "style3") {
            searchQuery = `${query} anime fight pose`;
            packNameSuffix = "Fight";
        }

        try {
            await sock.sendMessage(data.jid, { react: { text: '⏳', key: msg.key } });
        } catch {}

        let result = await searchPinterest(searchQuery);
        if (!result.status) {
            // محاولة احتياطية ثانية في حال لم يجد نتائج بالبحث المتقدم
            result = await searchPinterest(query);
            if (!result.status) {
                return await sock.sendMessage(data.jid, { text: `[❌] ${result.message}` }, { quoted: msg });
            }
        }

        let pins = result.pins;
        if (pins.length === 0) {
            return await sock.sendMessage(data.jid, { text: '❌ لم يتم العثور على صور صالحة لصناعة الحزمة.' }, { quoted: msg });
        }

        // ضمان جلب 30 ملصق بالضبط (أو الحد الأقصى المتوفر إذا كان أقل بقليل)
        let selectedPins = pins.slice(0, 30);
        let stickersMetadata = [];
        const zip = new JSZip();

        for (let i = 0; i < selectedPins.length; i++) {
            try {
                let imgRes = await axios.get(selectedPins[i].image, { responseType: 'arraybuffer' });
                let originalBuffer = Buffer.from(imgRes.data);
                let stickerBuffer = await makeStickerWebp(originalBuffer);
                const fileName = `${toB64Url(sha256(stickerBuffer))}.webp`;

                zip.file(fileName, stickerBuffer);

                stickersMetadata.push({
                    fileName,
                    isAnimated: false,
                    emojis: ['⚡', '👑'],
                    accessibilityLabel: '',
                    isLottie: false,
                    mimetype: 'image/webp',
                });
            } catch {}
        }

        if (stickersMetadata.length === 0) {
            return await sock.sendMessage(data.jid, { text: '❌ فشل تحويل الصور إلى ملصقات.' }, { quoted: msg });
        }

        try {
            let firstSticker = zip.file(stickersMetadata[0].fileName);
            let firstStickerBuffer = await firstSticker.async('nodebuffer');
            let trayBuffer = await makeTrayWebp(firstStickerBuffer);
            
            const trayIconFileName = 'tray_icon.webp';
            zip.file(trayIconFileName, trayBuffer);

            const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

            const packUpload = await uploadToServer(sock, archive, {
                hkdf: 'WhatsApp Sticker Pack Keys',
                mediaPath: '/mms/sticker-pack',
            });

            const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer);
            const thumbUpload = await uploadToServer(sock, thumbnailBuffer, {
                hkdf: 'WhatsApp Sticker Pack Thumbnail Keys',
                mediaPath: '/mms/thumbnail-sticker-pack',
                mediaKey: packUpload.mediaKey,
            });

            await sock.relayMessage(
                data.jid,
                {
                    messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                    stickerPackMessage: {
                        stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
                        name: `Arthur | ${query.toUpperCase()} ⚡`, 
                        publisher: '𝐴𝑟𝑡𝘩𝑢𝑟 𝐵𝑜𝑡 ⚡', 
                        packDescription: `حزمة ملصقات ${packNameSuffix} لـ ${query} (30 ملصق عريض)`, 
                        stickers: stickersMetadata,
                        fileLength: packUpload.fileLength,
                        fileSha256: packUpload.fileSha256,
                        fileEncSha256: packUpload.fileEncSha256,
                        mediaKey: packUpload.mediaKey,
                        directPath: packUpload.directPath,
                        mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                        stickerPackSize: packUpload.fileLength,
                        stickerPackOrigin: 2,
                        trayIconFileName,
                        thumbnailDirectPath: thumbUpload.directPath,
                        thumbnailSha256: thumbUpload.fileSha256,
                        thumbnailEncSha256: thumbUpload.fileEncSha256,
                        thumbnailHeight: 252,
                        thumbnailWidth: 252,
                        imageDataHash: thumbUpload.fileSha256.toString('base64'),
                    },
                },
                { quoted: msg }
            );

            try {
                await sock.sendMessage(data.jid, { react: { text: '✅', key: msg.key } });
            } catch {}

        } catch (e) {
            try {
                await sock.sendMessage(data.jid, { react: { text: '❌', key: msg.key } });
            } catch {}
            await sock.sendMessage(data.jid, { text: `❌ فشل إرسال الحزمة: ${e.message}` }, { quoted: msg });
        }
    }
};