const express = require("express");
const axios = require("axios");
const fs = require("fs");

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

// 🧠 AI CHATBOT KEY (Aapki Nayi AQ Key) 🧠
const GEMINI_API_KEY = "AQ.Ab8RN6JXUV5EzsqswEL1UVJZWtzTqlJKLnptQVtTQOWPcerSvA"; 
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
// 🧠 AI CHAT ENGINE (Lambi Baat ke liye)
// ==========================================
async function getSmartAIReply(userMessage) {
    try {
        const prompt = `You are an extremely polite, highly educated, and respectful digital assistant for 'Ranjeet Royal Academy (RRA)' located in Pada, Alwar, Rajasthan. 
        School Directors/Managers are Kailash Ji and Rohitashv Ji.
        Rules:
        1. Be extremely polite (use '🙏', 'जी', 'आप', 'सधन्यवाद'). Never say a blunt "No".
        2. Only discuss education, school activities, student motivation, and positive learning environments. Do not answer harmful or unrelated political questions.
        3. Answer in clear Hindi.
        4. Keep the reply helpful, educational, and reputed (like a respected teacher).
        User's message: "${userMessage}"`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        return `राम-राम सा! 🙏 रंजीत रॉयल एकेडमी (RRA) मैनेजमेंट टीम आपके संदेश का सम्मान करती है। आपके इस विशेष सवाल या चर्चा के संदर्भ में उचित मार्गदर्शन के लिए आप सीधे हमारे विद्यालय कार्यालय में संपर्क कर सकते हैं। मुख्य मेनू के लिए *0* दबाएं।`;
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
            replyMessage = `🏫 *Ranjeet Royal Academy (RRA) में आपका हार्दिक स्वागत है!* 🏫\n\nराम-राम सा! 🙏 मैं RRA का डिजिटल असिस्टेंट हूँ।\n\n*1* 📝 एडमिशन की जानकारी\n*2* 💳 फीस और छात्र रिकॉर्ड खोजें\n*3* 🏖️ छुट्टियों की जानकारी\n*4* 📞 स्कूल मैनेजमेंट नंबर\n*5* ✍️ शिकायत या सुझाव\n*6* 🚌 स्कूल गाड़ी / ड्राइवर नंबर\n*7* 🏫 स्कूल खुलने का समय\n\n_कृपया अपनी आवश्यकता अनुसार नंबर दबाएं।_`;
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
            if(userText.length >= 3 || !isNaN(userText)) { 
                let allRecords = Object.values(unifiedData);
                let queryWords = userText.split(' ');

                for (let r of allRecords) {
                    let rName = (r.name || "").toLowerCase();
                    let rVill = (r.village || "").toLowerCase();
                    let rSr = (r.sr || "").toLowerCase();
                    let rMob = (r.mobile || "").toLowerCase();
                    let isMatch = false;

                    if (rSr === userText || (userText.length >= 8 && rMob.includes(userText)) || rVill === userText) { isMatch = true; }
                    else if (rName.includes(userText) || rVill.includes(userText)) { isMatch = true; }
                    else {
                        let nameWords = rName.split(' ');
                        for(let nw of nameWords) {
                            for(let qw of queryWords) {
                                if (qw.length >= 4 && nw.length >= 4 && getEditDistance(qw, nw) <= 1) { isMatch = true; break; }
                            }
                            if(isMatch) break;
                        }
                    }
                    if (isMatch) matches.push(r);
                }
            }

            // Agar Excel mein record mil gaya:
            if(matches.length > 0) {
                replyMessage = `🔍 *Aapke Data ke Natije:*\n\n`;
                for(let i=0; i < Math.min(matches.length, 4); i++) {
                    let m = matches[i];
                    replyMessage += `👤 *Naam:* ${m.name}\n🆔 *SR:* ${m.sr} | *Class:* ${m.cls}\n👨‍💼 *Pita:* ${m.father}\n📱 *Mobile:* ${m.mobile}\n🏡 *Gaon:* ${m.village}\n💰 *Bakaya Fees:* ₹${m.balance}\n〰️〰️〰️\n`;
                }
                if(matches.length > 4) { replyMessage += `*+ ${matches.length - 4} aur bachche mile hain.*\n`; }
                replyMessage += `\n🙏 _(मेनू के लिए *0* भेजें)_`;
            } 
            // Agar record nahi mila, to AI se "Lambi Baat" karein:
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
