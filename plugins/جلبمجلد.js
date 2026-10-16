import fs from "fs";
import path from "path";
import archiver from "archiver";

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
    const cleanSender = String(senderJid).replace(/[^0-9]/g, "");
    const eliteUsers = getElite();
    return eliteUsers.some(num => String(num).replace(/[^0-9]/g, "") === cleanSender);
};

export default {
  command: ['جلبمجلد', 'جلب_مجلد'],
  description: 'جلب مجلد معين أو المشروع بالكامل عبر كتابة bot أو الكل (خاص بالنخبة فقط)',
  category: 'النخبة',

  execute: async (sock, msg, data) => {
    try {
      const chatId = data?.jid || msg.key.remoteJid;
      const senderJid = data?.sender || msg.key.participant || msg.key.remoteJid;

      // التحقق من صلاحيات النخبة
      if (!checkElitePermission(senderJid)) {
        return await sock.sendMessage(chatId, {
            text: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n❌ *هذا الأمر مخصص لأعضاء النخبة فقط.*\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*`,
            quoted: msg
        });
      }

      // تفاعل بالدم 🩸
      await sock.sendMessage(chatId, {
          react: { text: "🩸", key: msg.key }
      }).catch(() => {});

      let rawText = data?.text ? data.text.trim() : "";
      const args = rawText.split(/\s+/);
      args.shift(); // إزالة اسم الأمر الرئيسي
      const queryArg = args.join(" ").trim();

      // جلب جميع المجلدات الموجودة في المسار الحالي
      const items = fs.readdirSync(process.cwd(), { withFileTypes: true });
      const folders = items.filter(item => item.isDirectory());

      // 1. عرض القائمة إذا لم يحدد شيئاً
      if (!queryArg) {
        let listText = `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n`;
        listText += `       *𝚫𝚪𝚻𝚮𝚼𝚪 • 𝚩𝚯𝚻 2026*\n`;
        listText += `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n`;
        listText += `📂 *قائمة المجلدات المتاحة:*\n\n`;
        listText += `📦 \`.جلبمجلد bot\` ⬅️ *لجلب كامل البوت دفعة واحدة (باستثناء المخفي)*\n\n`;
        
        folders.forEach((folder, index) => {
          listText += `*${index + 1}-* 📁 \`${folder.name}\`\n`;
        });

        listText += `\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n`;
        listText += `💡 *طريقة الاستخدام:*\n`;
        listText += `• لجلب الكل: \`.جلبمجلد bot\`\n`;
        listText += `• لجلب مجلد محدد: \`.جلبمجلد [الاسم أو الرقم]\`\n`;
        listText += `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*`;

        return sock.sendMessage(chatId, { text: listText }, { quoted: msg });
      }

      // 2. إذا كتب bot أو الكل لجلب المشروع بالكامل
      const lowerQuery = queryArg.toLowerCase();
      if (lowerQuery === 'bot' || lowerQuery === 'الكل' || lowerQuery === 'all' || lowerQuery === 'full') {
        await sock.sendMessage(chatId,
            { text: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n⏳ *جاري ضغط وحزم كامل ملفات ومكتبة البوت (باستثناء الملفات المخفية)...*\n*قد يستغرق بعض الوقت.*\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*` },
            { quoted: msg });

        const zipName = `Bot_Full_Backup_${Date.now()}.zip`;
        const outputPath = path.join(process.cwd(), zipName);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              await sock.sendMessage(
                chatId,
                {
                  document: { url: outputPath },
                  mimetype: 'application/zip',
                  fileName: zipName,
                  caption: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n✅ *تم جلب كامل البوت والمكتبة بنجاح.*\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*`
                },
                { quoted: msg }
              );

              if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
              }
              resolve();
            } catch (err) {
              console.error('Send full zip error:', err);
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              reject(err);
            }
          });

          archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            reject(err);
          });

          archive.pipe(output);

          // حزم كل الملفات مع استثناء أي ملف أو مجلد مخفي مثل .git و .github وغيرها
          archive.glob('**/*', {
            cwd: process.cwd(),
            ignore: [
              '**/.*',             // استثناء المخفي في أي مسار فرعي
              '.*',                // استثناء المخفي في الجذر
              path.basename(outputPath) // عدم تضمين الملف المضغوط نفسه
            ]
          });

          archive.finalize();
        });
      }

      // 3. البحث عن مجلد محدد (بالاسم أو الرقم)
      let targetFolderName = '';

      if (!isNaN(queryArg)) {
        const index = parseInt(queryArg) - 1;
        if (index >= 0 && index < folders.length) {
          targetFolderName = folders[index].name;
        }
      } else {
        const found = folders.find(f => f.name.toLowerCase() === queryArg.toLowerCase());
        if (found) {
          targetFolderName = found.name;
        }
      }

      if (!targetFolderName) {
        return sock.sendMessage(
          chatId,
          { text: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n❌ *لم يتم العثور على مجلد باسم أو رقم:* \`${queryArg}\`\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*` },
          { quoted: msg }
        );
      }

      const targetPath = path.join(process.cwd(), targetFolderName);

      if (!path.resolve(targetPath).startsWith(process.cwd())) {
        return sock.sendMessage(chatId, { text: '❌ مسار غير مسموح به!' }, { quoted: msg });
      }

      await sock.sendMessage(chatId,
          { text: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n⏳ *جاري ضغط وحزم المجلد:* \`${targetFolderName}\`...\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*` },
          { quoted: msg });

      const zipName = `${targetFolderName}_backup.zip`;
      const outputPath = path.join(process.cwd(), zipName);

      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          try {
            await sock.sendMessage(
              chatId,
              {
                document: { url: outputPath },
                mimetype: 'application/zip',
                fileName: zipName,
                caption: `*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n✅ *تم جلب المجلد بنجاح:* \`${targetFolderName}\`\n*◇❐ ═━╾ 🩸 ╼━═ ❐◇*`
              },
              { quoted: msg }
            );

            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            resolve();
          } catch (err) {
            console.error('Send zip error:', err);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            reject(err);
          }
        });

        archive.on('error', (err) => {
          console.error('Archive error:', err);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
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
        { text: '*◇❐ ═━╾ 🩸 ╼━═ ❐◇*\n❌ حدث خطأ أثناء تنفيذ الأمر.' },
        { quoted: msg }
      );
    }
  }
};