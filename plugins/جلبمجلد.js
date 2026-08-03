import fs from "fs";
import path from "path";
import archiver from "archiver";

export default {
  command: 'جلبمجلد',
  description: 'جلب المجلدات عبر كتابة اسمها أو رقمها الترتيبي في المشروع',
  category: 'المطور',

  execute: async (sock, msg, data) => {
    try {
      const jid = data?.jid || msg.key.remoteJid;
      
      const args = data?.text
        ? data.text.trim().split(/\s+/).slice(1)
        : [];

      // جلب جميع المجلدات الموجودة في المسار الحالي
      const items = fs.readdirSync(process.cwd(), { withFileTypes: true });
      const folders = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));

      if (!args[0]) {
        let listText = '📂 قائمة المجلدات المتاحة:\n\n';
        folders.forEach((folder, index) => {
          listText += `${index + 1}. ${folder.name}\n`;
        });
        listText += '\nطريقة الاستخدام:\n.جلبمجلد [الاسم أو الرقم]\nمثال: .جلبمجلد 1 أو .جلبمجلد data';

        return sock.sendMessage(jid, { text: listText }, { quoted: msg });
      }

      const input = args.join(' ').trim();
      let targetFolderName = '';

      // التحقق مما إذا كان المدخل رقماً أم نصاً
      if (!isNaN(input)) {
        const index = parseInt(input) - 1;
        if (index >= 0 && index < folders.length) {
          targetFolderName = folders[index].name;
        }
      } else {
        // البحث بالاسم المباشر
        const found = folders.find(f => f.name.toLowerCase() === input.toLowerCase());
        if (found) {
          targetFolderName = found.name;
        }
      }

      if (!targetFolderName) {
        return sock.sendMessage(
          jid,
          { text: `❌ عذراً، المجلد "${input}" غير موجود أو رقم القائمة غير صحيح.` },
          { quoted: msg }
        );
      }

      const targetPath = path.join(process.cwd(), targetFolderName);

      await sock.sendMessage(jid, { text: `📦 جاري ضغط المجلد "${targetFolderName}"، يرجى الانتظار...` }, { quoted: msg });

      const zipName = `${targetFolderName}_backup.zip`;
      const outputPath = path.join(process.cwd(), zipName);

      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          try {
            await sock.sendMessage(
              jid,
              {
                document: fs.readFileSync(outputPath),
                mimetype: 'application/zip',
                fileName: zipName,
                caption: `✅ تم جلب المجلد بنجاح: ${targetFolderName}`
              },
              { quoted: msg }
            );

            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            resolve();
          } catch (err) {
            console.error('Send zip error:', err);
            reject(err);
          }
        });

        archive.on('error', (err) => {
          console.error('Archive error:', err);
          reject(err);
        });

        archive.pipe(output);
        archive.directory(targetPath, false);
        archive.finalize();
      });

    } catch (e) {
      console.error("أمر جلبمجلد خطأ:", e);
      return sock.sendMessage(
        data?.jid || msg.key.remoteJid,
        { text: '❌ حدث خطأ أثناء تنفيذ عملية الضغط والإرسال.' },
        { quoted: msg }
      );
    }
  }
};