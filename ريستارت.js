import fs from "fs";
import path from "path";
import { exec } from "child_process";


export default {

    command: "ريستارت",

    category: "النظام",

    description: "إعادة تشغيل البوت",


    execute: async(sock,msg,data)=>{


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

                    elite = JSON.parse(
                        fs.readFileSync(
                            filePath,
                            "utf8"
                        )
                    );

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



        elite = elite.map(
            x=>String(x).replace(/\D/g,"")
        );



        // ==========================
        // رقم المرسل
        // ==========================

        const sender =
        data.sender ||
        data.jid;


        const number =
        sender
        .split("@")[0]
        .replace(/\D/g,"");



        console.log(
            "رقم المرسل:",
            number
        );

        console.log(
            "النخبة:",
            elite
        );



        if(!elite.includes(number)){


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
                jid:data.jid,
                time:Date.now()
            })
        );



        await sock.sendMessage(
            data.jid,
            {
                text:
`╭━━━━━━━━━━━━━━╮
┃ 🔄 𝐘𝐔𝐍𝐎 𝐑𝐄𝐒𝐓𝐀𝐑𝐓
┣━━━━━━━━━━━━━━┫
┃ ⏳ جاري إعادة التشغيل...
╰━━━━━━━━━━━━━━╯`
            }
        );



        setTimeout(()=>{

            exec(
                "pm2 restart yuno"
            );

        },2000);



    }

};