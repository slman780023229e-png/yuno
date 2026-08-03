import youtubedl from 'youtube-dl-exec';
import fs from 'fs';
import path from 'path';

export default {
  command: 'انستا',
  description: 'تحميل فيديو من انستغرام بدون أخطاء',
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
          { text: '❌ يرجى إرسال رابط انستغرام أو اسم الفيديو.\nمثال: .انستا https://www.instagram.com/reel/...' },
          { quoted: msg }
        );
      }

      let query = args.join(' ');

      // إذا لم يكن رابطاً، نحوله إلى بحث مباشر داخل انستغرام
      if (!query.startsWith('http')) {
        query = `ytsearch1:${query} instagram reel`;
      }

      await sock.sendMessage(
        jid,
        { text: '⏳ جاري تحميل الفيديو، يرجى الانتظار...' },
        { quoted: msg }
      );

      const outputFileName = `insta_${Date.now()}.mp4`;
      const outputPath = path.join(process.cwd(), outputFileName);

      // تحميل الفيديو باستخدام محرك youtube-dl القوي
      await youtubedl(query, {
        output: outputPath,
        format: 'best',
        noCheckCertificates: true,
        geoBypass: true,
      });

      if (!fs.existsSync(outputPath)) {
        return sock.sendMessage(
          jid,
          { text: '❌ عذراً، لم نتمكن من جلب الفيديو. تأكد من صحة الرابط.' },
          { quoted: msg }
        );
      }

      // إرسال الفيديو للمستخدم
      await sock.sendMessage(
        jid,
        {
          video: { url: outputPath },
          mimetype: 'video/mp4',
          caption: '✅ تم جلب الفيديو بنجاح بواسطة 𝐀𝐑𝐓𝐇𝐔𝐑'
        },
        { quoted: msg }
      );

      // حذف الملف من التخزين المؤقت بعد الإرسال
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 5000);

    } catch (e) {
      console.error("خطأ في أمر انستا:", e);
      return sock.sendMessage(
        data?.jid || msg.key.remoteJid,
        { text: '❌ حدث خطأ أثناء التحميل. تأكد أن الرابط عام وليس لحساب خاص.' },
        { quoted: msg }
      );
    }
  }
};