const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai"); 

const app = express();
app.use(express.json());

// ==========================================
// 🔴 Aapki Secret Details 🔴
// ==========================================
const VERIFY_TOKEN = "RRA_ERP_SECRET_TOKEN_2026"; 
const FB_ACCESS_TOKEN = "EAAUeE0z0JlgBRtihbXVCTLIHh5Mx3oXwkYxZCxCQg0W9eNcD2yPcVRqIpdfrIqBvAoGKneEqnonojZB8TPRIpNErvQBX9wwuOtibQQV0j1OzbmrKPLvBmmCxytZAERMg1VZASnJHTSFaNu8oTqnG10n2FnkVGW5Oa7fDYZBEveZBtYyhHKOOeo4O9htmQ7hwZDZD"; 
const PHONE_NUMBER_ID = "1152692744596700"; 
const KAILASH_JI = "918955250697"; 
const ROHITASHV_JI = "918058039415"; 

// 🧠 AI CHATBOT KEY (Render se aayegi) 🧠
const rawKey = process.env.GEMINI_API_KEY || "";
const GEMINI_API_KEY = rawKey.trim(); 
let genAI = null;
if(GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY); 
}
// ==========================================

// ==========================================
// 🧠 SMART SPELLING CHECKER
// ==========================================
function getEditDistance(a, b) {
    if(a.length === 0) return b.length; 
    if(b.length === 0) return a.length; 
    let matrix = [];
    for(let i = 0; i <= b.length; i++){ matrix[i] = [i]; }
    for(let j = 0; j <= a.length; j++){ matrix[0][j] = j; }
    for(let i = 1; i <= b.length; i++){
        for(let j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

// ==========================================
// 📂 DATA LOAD KARNA
// ==========================================
let unifiedData = {};
let holidaysByMonth = {};

function loadExcelData() {
    unifiedData = {};
    try {
        let sLines = fs.readFileSync('students.csv', 'utf8').split('\n');
        let sStarted = false;
        for(let line of sLines) {
            if(line.includes('Admission Id,Class,Student Name')) { sStarted = true; continue; }
            if(sStarted && line.trim().length > 10) {
                let parts = line.split(',');
                if(parts.length >= 13) {
                    let sr = parts[0].trim();
                    unifiedData[sr] = { sr: sr, cls: parts[1].trim(), name: parts[2].trim(), father: parts[4].trim(), mobile: parts[7].trim(), village: parts[12].trim(), balance: "Record N/A" };
                }
            }
        }
    } catch(e) {}

    try {
        let fLines = fs.readFileSync('fees.csv', 'utf8').split('\n');
        let fStarted = false;
        for(let line of fLines) {
            if(line.includes('Name,Admission Id,Class')) { fStarted = true; continue; }
            if(fStarted && line.trim().length > 10) {
                let parts = line.split(',');
                if(parts.length >= 9) {
                    let sr = parts[1].trim();
                    let balanceAmount = parts[8].trim();
                    if(unifiedData[sr]) { unifiedData[sr].balance = balanceAmount; } 
                    else { unifiedData[sr] = { sr: sr, cls: parts[2].trim(), name: parts[0].trim(), father: "N/A", mobile: "N/A", village: "N/A", balance: balanceAmount }; }
                }
            }
        }
    } catch(e) {}

    try {
        let hLines = fs.readFileSync('holidays.csv', 'utf8').split('\n');
        const monthNames = {"01":"January", "02":"February", "03":"March", "04":"April", "05":"May", "06":"June", "07":"July", "08":"August", "09":"September", "10":"October", "11":"November", "12":"December"};
        for(let line of hLines) {
            let parts = line.split(',');
            if(parts.length >= 3) {
                let datePart = parts[0].trim(); 
                if(datePart.includes('-')) {
                    let monthCode = datePart.split('-')[1];
                    let monthName = monthNames[monthCode] || "Other";
                    if(!holidaysByMonth[monthName]) holidaysByMonth[monthName] = [];
                    holidaysByMonth[monthName].push(`🔸 ${datePart} (${parts[1].trim()}) - ${parts[2].trim()}`);
                }
            }
        }
    } catch(e) {}
}
loadExcelData();

// ==========================================
// 🧠 AI CHAT ENGINE (Lambi Baat, Sanskar aur School Hith)
// ==========================================
async function getSmartAIReply(userMessage) {
    if (!genAI) {
        sendWhatsAppMessage(ROHITASHV_JI, `🚨 *Admin Alert:* Render mein GEMINI_API_KEY set nahi hai ya khali hai!`);
        return `राम-राम सा! 🙏 कृपया सिस्टम एडमिन को सूचित करें कि AI Key सर्वर में सेट नहीं है।`;
    }
    try {
        let holidayKnowledge = "";
        if (Object.keys(holidaysByMonth).length > 0) {
            for(let month in holidaysByMonth) {
                holidayKnowledge += `\n🗓️ ${month} की छुट्टियां:\n${holidaysByMonth[month].join("\n")}\n`;
            }
        } else {
            holidayKnowledge = "अभी छुट्टियों की कोई विशेष सूची अपडेटेड नहीं है, केवल प्रत्येक रविवार को विद्यालय में अवकाश रहता है।";
        }

        const prompt = `आप रंजीत रॉयल एकेडमी (RRA), पाड़ा (अलवर, राजस्थान) के एक बेहद प्रतिष्ठित, सुशिक्षित, संस्कारी और आदरणीय वरिष्ठ शिक्षक (Senior Teacher) डिजिटल सहायक हैं। 
        विद्यालय के डायरेक्टर कैलाश जी हैं और मैनेजर रोहितशव जी हैं।
        
        विद्यालय की आधारभूत जानकारी (School Knowledge):
        - स्कूल खुलने की तारीख: विद्यालय 29 जून से नए सत्र के लिए पुनः खुल रहे हैं।
        - स्कूल का समय: सुबह 08:00 बजे से दोपहर 02:00 बजे तक रहेगा।
        - स्कूल की आधिकारिक छुट्टियां (Holidays Data): ${holidayKnowledge}

        बातचीत के कड़े नियम (Strict Rules for Response):
        1. बातचीत की शुरुआत हमेशा आदरपूर्वक 'राम-राम सा! 🙏' से करें। वाक्य में 'जी', 'आप', 'सधन्यवाद' का भरपूर सम्मानजनक उपयोग करें। आपका लहजा ऐसा होना चाहिए जैसे कोई आदरणीय गुरुजी साक्षात बात कर रहे हों।
        2. यदि यूजर स्कूल की छुट्टियों (Holidays), स्कूल दोबारा खुलने की तारीख या समय के बारे में प्राकृतिक भाषा में पूछे (जैसे: 'छुट्टी कब है', 'स्कूल कब खुलेगा', 'जून में कब छुट्टी है'), तो ऊपर दिए गए 'School Knowledge' को ध्यान से पढ़ें और सटीक तारीख व जानकारी अत्यंत आदर के साथ शुद्ध हिंदी में बताएं।
        3. यदि माता-पिता या बच्चे मोबाइल की लत से छुटकारा, पढ़ाई में मन न लगना, एकाग्रता बढ़ाना, लंबे समय तक बैठकर पूरा अध्याय कैसे पढ़ें, सुबह जल्दी उठना (ब्रह्म मुहूर्त के लाभ), समय पर पौष्टिक और ताजा भोजन करने, अच्छी नींद लेने तथा प्रतिदिन 5-10 मिनट ध्यान (Meditation) या प्राणायाम करने जैसी दिनचर्या के बारे में पूछें, तो उन्हें बहुत ही सुंदर, व्यावहारिक, मनोवैज्ञानिक और शिक्षाप्रद तरीके से पूरा विस्तार से समझाएं। 
        4. बातचीत में स्वामी विवेकानंद, डॉ. एपीजे अब्दुल कलाम या महान विद्वानों के सकारात्मक और ऊर्जावान प्रेरक विचार (Motivational Quotes) शामिल करें ताकि बच्चों और पेरेंट्स में सकारात्मक ऊर्जा का संचार हो।
        5. यदि कोई यूजर बिना किसी नाम या एसआर नंबर के केवल फीस या रिकॉर्ड की सामान्य बात करे (जैसे: 'मेरे बच्चे की फीस बताओ', 'डिटेल दिखाओ', 'फीस कितनी है'), तो उन्हें बहुत प्यार से समझाएं कि वे छात्र का नाम, एसआर नंबर (SR Number) या पंजीकृत मोबाइल नंबर लिखकर भेजें ताकि कंप्यूटर सिस्टम से सटीक रिकॉर्ड निकाला जा सके।
        6. हमेशा सकारात्मक, मर्यादित और शिक्षाप्रद बातें करें जो स्कूल के हित में हों। किसी भी अभद्र या गैर-शैक्षणिक बात का उत्तर न दें। पूरा जवाब केवल साफ और स्पष्ट हिंदी में होना चाहिए।

        यूजर का संदेश: "${userMessage}"`;

        // 🌟 MODEL WAPAS GEMINI-1.5-FLASH KAR DIYA HAI JO 100% SUPPORTED HAI 🌟
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI Error:", error.message);
        
        sendWhatsAppMessage(ROHITASHV_JI, `🚨 *AI API FAIL ALERT:*\nGoogle API ne kaam karne se mana kar diya hai.\n*Error Ka Kaaran:* ${error.message}`);
        
        return `राम-राम सा! 🙏 रंजीत रॉयल एकेडमी (RRA) मैनेजमेंट टीम आपके संदेश का पूरा सम्मान करती है। आपके इस विशेष सवाल या चर्चा के संदर्भ में उचित मार्गदर्शन के लिए आप सीधे हमारे विद्यालय कार्यालय में संपर्क कर सकते हैं या मुख्य मेनू के लिए *0* दबाएं। सधन्यवाद!`;
    }
}

// ==========================================
// 📨 Message Bhejne Ka System
// ==========================================
async function sendWhatsAppMessage(toNumber, messageText) {
    try {
        await axios({
            method: "POST",
            url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            data: { messaging_product: "whatsapp", to: toNumber, text: { body: messageText } },
            headers: { Authorization: `Bearer ${FB_ACCESS_TOKEN}`, "Content-Type": "application/json" }
        });
    } catch (error) { console.error("❌ Error:", error.message); }
}

app.get("/webhook", (req, res) => {
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
        res.status(200).send(req.query["hub.challenge"]);
    } else { res.sendStatus(403); }
});

app.post("/webhook", async (req, res) => {
    let body = req.body;
    if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        let message = body.entry[0].changes[0].value.messages[0];
        let from = message.from; 
        let rawUserText = message.type === "text" && message.text ? message.text.body.trim() : "";
        let userText = rawUserText.toLowerCase();
        let replyMessage = "";

        if (userText === "") {
            sendWhatsAppMessage(from, `🙏 सधन्यवाद! कृपया अपनी बात लिखकर (Text) भेजें। मेनू के लिए *0* भेजें।`);
            return res.sendStatus(200);
        }

        // ==========================================
        // 🌟 ICEBREAKERS (BUTTONS) KA LOGIC 🌟
        // ==========================================
        if (userText === "school management number") {
            replyMessage = "🏫 *Ranjeet Royal Academy Management*\n\n👨‍💼 Kailash Ji (Director): +91 8955250697\n👨‍💻 Rohitashv Ji (Manager): +91 8058039415\n\n🙏 आप किसी भी समय शिक्षा संबंधी जानकारी के लिए संपर्क कर सकते हैं।";
            await sendWhatsAppMessage(from, replyMessage);
            return res.sendStatus(200);
        }
        else if (userText === "💰 मेरी बकाया फीस चेक करें" || userText.includes("बकाया फीस")) {
            replyMessage = "🙏 अपनी फीस की जानकारी के लिए कृपया विद्यार्थी का *SR Number*, *Mobile Number* या *नाम* लिखकर भेजें।";
            await sendWhatsAppMessage(from, replyMessage);
            return res.sendStatus(200);
        }
        else if (userText === "📅 छुट्टियों की लिस्ट दिखाएं" || userText.includes("छुट्टियों की लिस्ट")) {
            replyMessage = "🙏 छुट्टियों की जानकारी के लिए कृपया मुख्य मेनू से *3* दबाएं।";
            await sendWhatsAppMessage(from, replyMessage);
            return res.sendStatus(200);
        }
        else if (userText.includes("एडमिशन की जानकारी दें")) {
            replyMessage = "🏫 *Ranjeet Royal Academy* में नए सत्र के लिए प्रवेश प्रारंभ हैं!\n\n🙏 अधिक जानकारी के लिए कृपया मैनेजमेंट नंबर पर कॉल करें या अपना सवाल यहाँ विस्तार से लिखें।";
            await sendWhatsAppMessage(from, replyMessage);
            return res.sendStatus(200);
        }

        // ==========================================
        // 🚨 COMPLAINT (Shikayat) LOGIC - English & Hindi
        // ==========================================
        if (userText.includes("shikayat") || userText.includes("शिकायत") || userText.includes("complaint") || userText.includes("sujhav") || userText.includes("सुझाव") || userText.includes("problem")) {
            replyMessage = `🙏 हम आपकी बात का पूरा सम्मान करते हैं। आपकी समस्या या सुझाव को सीधे मैनेजमेंट (कैलाश जी और रोहितशव जी) तक पहुँचा दिया गया है। हम जल्द ही इस पर उचित और सकारात्मक कदम उठाएंगे।`;
            
            let mgmtMsg = `🚨 *RRA ERP Alert: Nayi Shikayat/Sujhav*\n\n*Parent/Number:* +${from}\n*Message:* ${rawUserText}\n\n_Kripya is par dhyan dein._`;
            sendWhatsAppMessage(KAILASH_JI, mgmtMsg);
            sendWhatsAppMessage(ROHITASHV_JI, mgmtMsg);
            
            await sendWhatsAppMessage(from, replyMessage);
            return res.sendStatus(200);
        }

        // ==========================================
        // 🤖 BOT MENU
        // ==========================================
        if (["hi", "hello", "नमस्ते", "namaste", "0", "help", "राम राम", "हाय"].includes(userText)) {
            replyMessage = `🏫 *Ranjeet Royal Academy (RRA) में आपका हार्दिक स्वागत है!* 🏫\n\nराम-राम सा! 🙏 मैं RRA का digital assistant हूँ।\n\n*1* 📝 एडमिशन की जानकारी\n*2* 💳 फीस और छात्र रिकॉर्ड खोजें\n*3* 🏖️ छुट्टियों की जानकारी\n*4* 📞 स्कूल मैनेजमेंट नंबर\n*5* ✍️ शिकायत या सुझाव\n*6* 🚌 स्कूल गाड़ी / ड्राइवर नंबर\n*7* 🏫 स्कूल खुलने का समय\n\n_कृपया अपनी आवश्यकता अनुसार नंबर दबाएं।_`;
        } 
        else if (userText === "1") { replyMessage = `📝 *Admission ki Jankari:*\nNursery se 10th tak ke admission chalu hain.\n🔗 *Online Form Link:* https://core.uolo.com/enquiry/MTE1Mjk \nAap school aakar bhi form le sakte hain.`; }
        else if (userText === "2") { replyMessage = `🔍 *Data Khojne ka Tareeka:*\nFees aur detail janne ke liye bachche ka:\n*Name*, *SR Number*, *Mobile Number* ya *Gaon ka naam* type karke bhejein.\n*(Udaharann: Rahul ya 0400 ya Pada)*`; }
        else if (userText === "3") { 
            replyMessage = `🏖️ *School ki Chhuttiyan:*\n* Har Sunday ko school band rahega.\n* Shivira panchang ke anusar chhuttiyan rahengi.\n\n`;
            if(Object.keys(holidaysByMonth).length > 0) {
                for(let month in holidaysByMonth) {
                    replyMessage += `🗓️ *${month} ki chhuttiyan:*\n`;
                    holidaysByMonth[month].forEach(h => replyMessage += `${h}\n`);
                    replyMessage += `\n`;
                }
            } else { replyMessage += `Abhi kisi vishesh chhutti ka data update nahi hai.`; }
        }
        else if (userText === "4") { replyMessage = `📞 *Sampark karein:*\n* Kailash Ji (Director): 8955250697\n* Rohitashv Ji (Manager): 8058039415`; }
        else if (userText === "5") { replyMessage = `✍️ *Shikayat/Sujhav:*\nApni shikayat ke aage 'शिकायत' ya 'Complaint' likhkar bhejein.\nExample: *शिकायत: Mere bachche (SR 0400) ka I-Card nahi mila.*`; }
        else if (userText === "6") { 
            replyMessage = `🚌 *स्कूल गाड़ी / ड्राइवर और रूट की जानकारी:* \n\n` +
                           `* 🧑‍✈️ बलराम जी: 9928997400 (रूट: खोहरा, नांगल)\n` +
                           `* 🧑‍✈️ गणेश जी: 7610015076 (रूट: भगत का बास)\n` +
                           `* 🧑‍✈️ रामू जी: 9784136402 (रूट: लापला, नयागांव)\n` +
                           `* 🧑‍✈️ राजेश जी: 9772161126 (रूट: ईसवाना, माचड़ी)\n` +
                           `* 🧑‍✈️ मनोहर जी: 8058123195 (रूट: बेरवांडा, नांगल)\n` +
                           `* 🧑‍✈️ धंसी जी: 9024283273 (रूट: गूलर का बास, माचड़ी)\n\n` +
                           `🙏 _(मेनू के लिए *0* भेजें)_`;
        }
        else if (userText === "7") { replyMessage = `🏫 *School Khulne ki Suchna:*\nSchool *29 June* se punah khul rahe hain.\n⏰ *Samay:* Subah 08:00 se Dophar 02:00 baje tak.\n🙏 सभी बच्चों का स्वागत है!`; }
        
        // ==========================================
        // 🧠 SMART SEARCH & AI CHAT
        // ==========================================
        else {
            let matches = [];
            
            let numbersInText = rawUserText.match(/\d+/g);
            let searchSR = "";
            let searchMob = "";
            if (numbersInText) {
                for (let num of numbersInText) {
                    if (num.length >= 8) searchMob = num; 
                    else if (num.length >= 1 && num.length <= 5) searchSR = num; 
                }
            }

            let stopWords = ['ki', 'ka', 'ko', 'fees', 'fee', 'balance', 'record', 'detail', 'batao', 'bataiye', 'bataen', 'dikhao', 'check', 'karein', 'karo', 'hai', 'hain', 'की', 'का', 'को', 'फीस', 'बताओ', 'बताइए', 'बताएं', 'दिखाओ', 'चेक', 'करो', 'करें', 'है', 'हैं', 'मेरे', 'बच्चे', 'रिकॉर्ड', 'बकाया', 'डिटेल', 'जानकारी', 'दिखाइए'];
            let cleanWords = userText.split(' ').filter(w => !stopWords.includes(w) && w.trim().length > 0);
            let cleanQuery = cleanWords.join(' ').trim();

            let allRecords = Object.values(unifiedData);

            for (let r of allRecords) {
                let rName = (r.name || "").toLowerCase();
                let rVill = (r.village || "").toLowerCase();
                let rSr = (r.sr || "").toLowerCase();
                let rMob = (r.mobile || "").toLowerCase();
                let isMatch = false;

                if (searchSR !== "" && rSr === searchSR) { isMatch = true; }
                else if (searchMob !== "" && rMob.includes(searchMob)) { isMatch = true; }
                else if (cleanQuery.length >= 2 && (rName.includes(cleanQuery) || rVill.includes(cleanQuery))) { isMatch = true; }
                else if (cleanWords.length > 0) {
                    let nameWords = rName.split(' ');
                    for(let nw of nameWords) {
                        for(let qw of cleanWords) {
                            if (qw.length >= 4 && nw.length >= 4 && getEditDistance(qw, nw) <= 1) { isMatch = true; break; }
                        }
                        if(isMatch) break;
                    }
                }
                if (isMatch) matches.push(r);
            }

            if(matches.length > 0) {
                replyMessage = `🔍 *Aapke Data ke Natije:*\n\n`;
                for(let i=0; i < Math.min(matches.length, 4); i++) {
                    let m = matches[i];
                    replyMessage += `👤 *Naam:* ${m.name}\n🆔 *SR:* ${m.sr} | *Class:* ${m.cls}\n👨‍💼 *Pita:* ${m.father}\n📱 *Mobile:* ${m.mobile}\n🏡 *Gaon:* ${m.village}\n💰 *Bakaya Fees:* ₹${m.balance}\n〰️〰️〰️\n`;
                }
                if(matches.length > 4) { replyMessage += `*+ ${matches.length - 4} aur bachche mile hain.*\n`; }
                replyMessage += `\n🙏 _(मेनू के लिए *0* भेजें)_`;
            } 
            else {
                replyMessage = await getSmartAIReply(rawUserText);
            }
        }

        if (replyMessage !== "") {
            await sendWhatsAppMessage(from, replyMessage);
            console.log(`✅ Reply bheja gaya: ${from}`);
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 RRA Server port ${PORT} par chalu hai`));
            
