import axios from "axios";


export default {

    command: "صوره",

    category: "الأدوات",

    description: "جلب صورة أنمي",


    execute: async(sock,msg,data)=>{


        const text =
        data.text
        .replace(".صوره","")
        .trim();



        if(!text){

            return sock.sendMessage(
                data.jid,
                {
                    text:
`🖼️ 𝐘𝐔𝐍𝐎 𝐈𝐌𝐀𝐆𝐄

مثال:
.صوره ناروتو`
                }
            );

        }



        try{


            await sock.sendMessage(
                data.jid,
                {
                    text:
`🔎 جاري البحث عن ${text}...`
                }
            );



            const res =
            await axios.get(
                "https://api.waifu.pics/sfw/waifu"
            );


            const image =
            res.data.url;



            const img =
            await axios.get(
                image,
                {
                    responseType:"arraybuffer"
                }
            );



            await sock.sendMessage(
                data.jid,
                {
                    image:
                    Buffer.from(img.data),

                    caption:
`━━━ ╼╃ ⌬〔 ✦ ❄ 𝐘𝐔𝐍𝐎 𝐈𝐌𝐀𝐆𝐄 ❄ ✦ 〕⌬ ╄╾ ━━━

*┤ 🖼️ ${text}*

*┇ 𓆩 ⚜ 𝐘𝐔𝐍𝐎 𝐁𝐎𝐓 ⚜ 𓆪 👑*`
                }
            );


        }catch(e){

            console.log(e.message);

            await sock.sendMessage(
                data.jid,
                {
                    text:
`❌ فشل جلب الصورة`
                }
            );

        }


    }

};