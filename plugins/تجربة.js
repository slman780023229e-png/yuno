import { ButtonV2 } from "../utils/nixcode.js"; // مسار مكتبة النيكس كود لديك

export default {
    command: 'تجربة',
    description: 'أمر تجريبي لعرض الأزرار جنباً إلى جنب باستخدام nixcode',
    usage: '.تجربة',
    category: 'تجربة',

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;

            const text = `╭━━━━━━━━━━━━━━╮
┃ 👑 أهلاً بك يا سلمان 
┣━━━━━━━━━━━━━━┫
┃ ⚡ هذا أمر تجريبي لاختبار 
┃ الأزرار عبر مكتبة nixcode.
╰━━━━━━━━━━━━━━╯`;


            // استخدام كلاس الـ ButtonV2 الموجود في مكتبة nixcode.js لديك
            await new ButtonV2(sock)
                .setBody(text)
                .setFooter('© 𝐀𝐑𝐓𝐇𝐔𝐑 𝐁𝐎𝐓')
                .setThumbnail(imageUrl)
                .addButton('👑 المطور', '.المطور')
                .addButton('📁 القائمة', '.اوامر')
                .send(chatId);

        } catch (e) {
            console.error("تجربة خطأ:", e);
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: `❌ حدث خطأ:\n${e.message}` },
                { quoted: msg }
            );
        }
    }
};
