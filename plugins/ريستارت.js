import fs from "fs";
import path from "path";

export default {

    command: "ريستارت",

    category: "النظام",

    description: "إعادة تشغيل البوت على منصة Render",


    execute: async(sock, msg, data)=>{


        // ==========================
        // البحث عن ملف النخبة
        // ==========================

        const dataPath =
        path.join(
            process.cwd(),
            "data"
        );


        let elite = [];


        const files = [
            "النخبة.json",
            "النخبه.json",
            "النخبة",
            "النخبه"
        ];



        for(const file of files){

            const filePath =
            path.join(
                dataPath,
                file
            );


            if(fs.existsSync(filePath)){

                try{

                    const rawData = JSON.parse(
                        fs.readFileSync(
                            filePath,
                            "utf8"
                        )
                    );
                    
                    // تحويل البيانات لدعم المصفوفات أو الكائنات بشكل سليم
                    elite = Array.isArray(rawData) ? rawData : Object.values(rawData);

                    console.log(
                        "تم تحميل النخبة من:",
                        filePath
                    );

                    break;


                }catch(err){

                    console.log(
                        "خطأ قراءة النخبة:",
                        err.message
                    );

                }

            }

        }



        // تنظيف أرقام النخبة تماماً من الرموز
        const cleanElite = elite.map(
            x=>String(x).replace(/\D/g,"")
        );



        // ==========================
        // رقم المرسل
        // ==========================

        const sender =
        data.sender ||
        data.jid ||
        "";


        const number =
        sender
        .split("@")[0]
        .replace(/\D/g,"");



        console.log(
            "رقم المرسل:",
            number
        );

        console.log(
            "النخبة المصفاة:",
            cleanElite
        );



        // ==========================
        // فحص قوي وذكي للنخبة (يتعرف على أي صيغة أو مفتاح دولة)
        // ==========================

        const isElite = cleanElite.some(el => {
            return number === el || 
                   (number.length > 8 && el.length > 8 && (number.endsWith(el) || el.endsWith(number)));
        });



        if(!isElite){


            return sock.sendMessage(
                data.jid,
                {
                    text:
`╭━━━━━━━━━━━━━━╮
┃ ❌ رفض الأمر
┣━━━━━━━━━━━━━━┫
┃ 👑 هذا الأمر للنخبة فقط
╰━━━━━━━━━━━━━━╯`
                }
            );

        }



        // ==========================
        // حفظ مكان الرسالة
        // ==========================

        const restartFile =
        path.join(
            dataPath,
            "restart.json"
        );


        fs.writeFileSync(
            restartFile,
            JSON.stringify({
                jid: data.jid,
                time: Date.now()
            })
        );



        await sock.sendMessage(
            data.jid,
            {
                text:
`╭━━━━━━━━━━━━━━╮
┃ ♻️ 𝐀𝐑𝐓𝐇𝐔𝐑 𝐑𝐄𝐁𝐎𝐎𝐓 🛡️
┣━━━━━━━━━━━━━━┫
┃ ⚡ جاري إعادة تشغيل النواة الآن...
┃ 🔄 يرجى الانتظار ثوانٍ معدودة...
╰━━━━━━━━━━━━━━╯`
            }
        );



        // ==========================
        // إعادة التشغيل على Render
        // ==========================

        setTimeout(()=>{

            // إيقاف العملية بإجبار Render على إعادة تشغيل الخدمة تلقائياً
            process.exit(0);

        }, 2000);



    }

};
