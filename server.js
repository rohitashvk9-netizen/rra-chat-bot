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
// ==========================================

// ==========================================
// 🧠 SMART SPELLING CHECKER (AI Logic) 🧠
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
// 📂 DATA LOAD KARNA (Fees + Students ko Milana)
// ==========================================
let unifiedData = {};
let holidaysByMonth = {};

function loadExcelData() {
    unifiedData = {};
    
    // 1. Students.csv padhna
    try {
        let sLines = fs.readFileSync('students.csv', 'utf8').split('\n');
        let sStarted = false;
        for(let line of sLines) {
            if(line.includes('Admission Id,Class,Student Name')) { sStarted = true; continue; }
            if(sStarted && line.trim().length > 10) {
                let parts = line.split(',');
                if(parts.length >= 13) {
                    let sr = parts[0].trim();
                    unifiedData[sr] = {
                        sr: sr, cls: parts[1].trim(), name: parts[2].trim(),
                        father: parts[4].trim(), mobile: parts[7].trim(), village: parts[12].trim(),
                        balance: "Record N/A"
                    };
                }
            }
        }
        console.log(`✅ students.csv load ho gayi (Student Details)`);
    } catch(e) { console.log("⚠️ students.csv nahi mili"); }

    // 2. Fees.csv padhna aur Data Milana
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
                    if(unifiedData[sr]) {
                        unifiedData[sr].balance = balanceAmount; // Purane data mein balance jod diya
                    } else {
                        // Agar koi bachcha sirf fees list mein hai
                        unifiedData[sr] = {
                            sr: sr, cls: parts[2].trim(), name: parts[0].trim(),
                            father: "N/A", mobile: "N/A", village: "N/A", balance: balanceAmount
                        };
                    }
                }
            }
        }
        console.log(`✅ fees.csv load ho gayi (Fees Details)`);
    } catch(e) { console.log("⚠️ fees.csv nahi mili"); }

    // 3. Holidays padhna
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

loadExcelData(); // Server start hote hi data load hoga

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
        let userText = message.type === "text" && message.text ? message.text.body.toLowerCase().trim() : "";
        let replyMessage = "";

        if (userText === "") {
            sendWhatsAppMessage(from, `🙏 Kripya kewal likhkar (Text) message bhejein. Menu ke liye *0* bhejein.`);
            return res.sendStatus(200);
        }

        // ==========================================
        // 🤖 BOT MENU
        // ==========================================
        if (["hi", "hello", "नमस्ते", "namaste", "0", "help", "राम राम", "हाय"].includes(userText)) {
            replyMessage = `🏫 *Ranjeet Royal Academy (RRA) mein aapka swagat hai!* 🏫\n\nRam-Ram Sa! 🙏 Main RRA ka digital assistant hoon.\n\n*1* 📝 Admission ki Jankari\n*2* 💳 Fees aur Student Record (Naam/Mobile/Gaon se khojein)\n*3* 🏖️ Chhuttiyon ki Jankari\n*4* 📞 School Management Number\n*5* ✍️ Shikayat ya Sujhav\n*6* 🚌 School Gadi / Driver Numbers\n*7* 🏫 School Reopening Time\n\n_Wapas menu ke liye *0* bhejein._`;
        } 
        else if (userText === "1") {
            replyMessage = `📝 *Admission ki Jankari:*\n\nNursery se 10th tak ke admission chalu hain.\n🔗 *Online Form Link:* https://core.uolo.com/enquiry/MTE1Mjk \n\nAap school aakar bhi form le sakte hain.`;
        }
        else if (userText === "2") {
            replyMessage = `🔍 *Data Khojne ka Tareeka:*\n\nFees aur poori detail ek sath janne ke liye bachche ka:\n*Name* (Spelling galat hogi to bhi chalega)\n*SR Number*\n*Mobile Number*\nya *Gaon ka naam* sidha type karke bhejein.\n\n*(Udaharann: Rahul ya 0400 ya Pada ya 9876543210)*`;
        }
        else if (userText === "3") {
            replyMessage = `🏖️ *School ki Chhuttiyan:*\n\n* Har Sunday ko school band rahega.\n* Shivira panchang ke anusar chhuttiyan rahengi.\n\n`;
            if(Object.keys(holidaysByMonth).length > 0) {
                for(let month in holidaysByMonth) {
                    replyMessage += `🗓️ *${month} ki chhuttiyan:*\n`;
                    holidaysByMonth[month].forEach(h => replyMessage += `${h}\n`);
                    replyMessage += `\n`;
                }
            } else { replyMessage += `Abhi kisi vishesh chhutti ka data update nahi hai.`; }
        }
        else if (userText === "4") {
            replyMessage = `📞 *Sampark karein (Subah 9 - Dophar 2):*\n\n* Kailash Ji (Director): 8955250697\n* Rohitashv Ji (Manager): 8058039415`;
        }
        else if (userText === "5") {
            replyMessage = `✍️ *Shikayat ya Sujhav (Complaint):*\n\nAapki baat seedhe Kailash Ji aur Rohitashv Ji tak pahuchegi.\n\n*Sahi Tareeka (Example):*\nशिकायत: Mere bachche (SR: 0400) ki gaadi aaj late aayi thi, kripya check karein.`;
        }
        else if (userText.startsWith("शिकायत") || userText.startsWith("shikayat") || userText.startsWith("सुझाव") || userText.startsWith("sujhav")) {
            replyMessage = `🙏 Dhanyawad! Aapki baat seedhe Management (Kailash Ji aur Rohitashv Ji) tak pahuncha di gayi hai. Hum jald hi is par dhyan denge.`;
            let mgmtMsg = `🚨 *Nayi Shikayat/Sujhav (RRA ERP):*\n\n*Number:* +${from}\n*Message:* ${message.text.body}`;
            sendWhatsAppMessage(KAILASH_JI, mgmtMsg);
            sendWhatsAppMessage(ROHITASHV_JI, mgmtMsg);
        }
        else if (userText === "6") {
            replyMessage = `🚌 *School Gadi / Driver:*\n\n* Balram Ji: 9928997400 (Khohra, Nangal)\n* Ganesh Ji: 7610015076 (Bhagat ka Bas)\n* Ramu Ji: 9784136402 (Lapala, Nayagaon)\n* Rajesh Ji: 9772161126 (Eswana, Machari)\n* Manohar Ji: 8058123195 (Berawanda, Nangal)\n* Dhansi Ji: 9024283273 (Gular ka Bas, Machari)`;
        }
        else if (userText === "7") {
            replyMessage = `🏫 *School Khulne ki Suchna:*\n\nSchool *29 June* se punah khul rahe hain.\n⏰ *Samay:* Subah 08:00 se Dophar 02:00 baje tak.\nSabhi bachchon ka swagat hai! 🎉`;
        }
        // ==========================================
        // 🧠 SMART SEARCH ENGINE (Sab kuch ek sath)
        // ==========================================
        else {
            let query = userText;
            if(query.length >= 3 || !isNaN(query)) { 
                let matches = [];
                let allRecords = Object.values(unifiedData);
                let queryWords = query.split(' ');

                for (let r of allRecords) {
                    let rName = (r.name || "").toLowerCase();
                    let rVill = (r.village || "").toLowerCase();
                    let rSr = (r.sr || "").toLowerCase();
                    let rMob = (r.mobile || "").toLowerCase();
                    let isMatch = false;

                    // 1. Exact Mobile, SR ya Gaon Match
                    if (rSr === query || (query.length >= 8 && rMob.includes(query)) || rVill === query) { 
                        isMatch = true; 
                    }
                    // 2. Exact ya Substring Naam Match (eg. 'priya' in 'priyanka')
                    else if (rName.includes(query) || rVill.includes(query)) { 
                        isMatch = true; 
                    }
                    // 3. AI Spelling Check (Agar spelling thodi galat ho)
                    else {
                        let nameWords = rName.split(' ');
                        for(let nw of nameWords) {
                            for(let qw of queryWords) {
                                if (qw.length >= 4 && nw.length >= 4) {
                                    if (getEditDistance(qw, nw) <= 1) { // 1 letter ki galti maaf hai
                                        isMatch = true; break;
                                    }
                                }
                            }
                            if(isMatch) break;
                        }
                    }

                    if (isMatch) matches.push(r);
                }

                // ==========================================
                // 📊 RESULT DIKHANE KA TARIQA
                // ==========================================
                if(matches.length > 0) {
                    replyMessage = `🔍 *Aapke Data ke Natije (Milte-julte naam):*\n\n`;
                    for(let i=0; i < Math.min(matches.length, 4); i++) {
                        let m = matches[i];
                        replyMessage += `👤 *Naam:* ${m.name}\n🆔 *SR:* ${m.sr} | *Class:* ${m.cls}\n👨‍💼 *Pita:* ${m.father}\n📱 *Mobile:* ${m.mobile}\n🏡 *Gaon:* ${m.village}\n💰 *Bakaya Fees:* ₹${m.balance}\n〰️〰️〰️\n`;
                    }
                    
                    if(matches.length > 4) {
                        replyMessage += `*+ ${matches.length - 4} aur bachche mile hain.* Kripya poora naam ya SR number type karein.\n`;
                    }
                    replyMessage += `\n_(Menu ke liye *0* bhejein)_`;
                } else {
                    replyMessage = `Maaf karein, mujhe "${message.text.body}" se milta-julta koi record nahi mila. 🤔\n\nKripya sahi naam (kam se kam 3 akshar), SR Number ya Mobile Number bhejein. (Menu ke liye *0* dabayein)`;
                }
            } else {
                replyMessage = `Maaf karein, main samajh nahi paya. Kripya kam se kam 3 akshar type karein ya menu ke liye *0* bhejein.`;
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