import axios from 'axios';

export default {
  command: 'تيك',
  description: 'البحث وتحميل فيديوهات تيك توك بالاسم مع أزرار سريعة',
  category: 'التحميل',

  execute: async (sock, msg, data) => {
    try {
      const jid = data?.jid || msg.key.remoteJid;
      
      const args = data?.text
        ? data.text.trim().split(/\s+/).slice(1)
        : [];

      if (!args[0]) {
        return sock.sendMessage(
          jid,
          { text: '❌ يرجى إرسال اسم الفيديو أو الأيديت للبحث عنه.\nمثال: .تيك ايديت غوكو' },
          { quoted: msg }
        );
      }

      let query = args.join(' ');

      // 1. التحميل المباشر عند اختيار الفيديو
      if (data?.text && data.text.startsWith('.تيكتحميل')) {
        const videoUrl = args[0];
        await sock.sendMessage(jid, { text: '⏳ جاري إرسال الفيديو المطلوب...' }, { quoted: msg });
        
        return await sock.sendMessage(
          jid,
          {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: '✅ تم جلب الفيديو بنجاح بواسطة 𝐀𝐑𝐓𝐇𝐔𝐑'
          },
          { quoted: msg }
        );
      }

      // 2. التحميل عبر الرابط المباشر
      if (query.includes('tiktok.com') || query.includes('vm.tiktok.com') || query.includes('vt.tiktok.com') || query.startsWith('http')) {
        await sock.sendMessage(jid, { text: '⏳ جاري تحميل الفيديو من الرابط...' }, { quoted: msg });
        const response = await axios.post('https://www.tikwm.com/api/', 
          new URLSearchParams({ url: query }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        if (response.data && response.data.code === 0 && response.data.data) {
          const directVideoUrl = response.data.data.play || response.data.data.hd;
          return await sock.sendMessage(
            jid,
            {
              video: { url: directVideoUrl },
              mimetype: 'video/mp4',
              caption: '✅ تم جلب فيديو تيك توك بنجاح بواسطة 𝐀𝐑𝐓𝐇𝐔𝐑'
            },
            { quoted: msg }
          );
        }
      }

      // 3. البحث بالاسم وعرض النتائج بأمان تام وسرعة عالية
      await sock.sendMessage(jid, { text: `🔍 جاري البحث عن نتائج لـ "${query}"...` }, { quoted: msg });

      const searchResponse = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=5`);
      
      if (!searchResponse.data || searchResponse.data.code !== 0 || !searchResponse.data.data || searchResponse.data.data.videos.length === 0) {
        return sock.sendMessage(jid, { text: '❌ عذراً، لم يتم العثور على أي نتائج بهذا الاسم.' }, { quoted: msg });
      }

      const videos = searchResponse.data.data.videos;
      let menuText = `━╼╃⌬〔 🎬 نتائج بحث تيك توك 〕⌬╄╾━\n*الكلمة:* \`${query}\`\n\n*اختر الفيديو المناسب بالضغط على الزر أدناه:*👇\n\n`;

      let buttonsArray = [];

      videos.forEach((vid, index) => {
        const title = vid.title ? (vid.title.length > 30 ? vid.title.substring(0, 27) + '...' : vid.title) : `فيديو رقم ${index + 1}`;
        menuText += `*【 ${index + 1} 】* ⟵ ${title}\n`;
        
        const videoDownloadUrl = vid.play || vid.hd;
        buttonsArray.push({
          displayText: `🎬 تحميل (${index + 1})`,
          id: `.تيكتحميل ${videoDownloadUrl}`
        });
      });

      menuText += `\n*━━━━━━━━━━━━━━━━━━━*\n*💡 اضغط على الزر لتحميل الفيديو فوراً.*`;

      if (typeof sock.sendRealButtons === "function") {
        try {
          return await sock.sendRealButtons(
            jid,
            menuText,
            "ARTHUR BOT SYSTEM 2026",
            buttonsArray
          );
        } catch (e) {}
      }

      return await sock.sendMessage(jid, { text: menuText }, { quoted: msg });

    } catch (e) {
      console.error("خطأ في أمر تيك:", e);
      return sock.sendMessage(
        data?.jid || msg.key.remoteJid,
        { text: '❌ حدث خطأ في الاتصال بالمصدر. حاول مرة أخرى.' },
        { quoted: msg }
      );
    }
  }
};