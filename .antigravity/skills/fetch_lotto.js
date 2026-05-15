/**
 * fetch_lotto.js — Skill Script (Interactive CLI Edition)
 * เลิกง้อ API ภายนอก! เปลี่ยนมาใช้ระบบถาม-ตอบผ่าน Terminal ที่รวดเร็วและชัวร์ 100%
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, "../../frontend/src/data/history.js");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("========================================");
  console.log("🎰 ฐานข้อมูลหวยไทย - CLI Updater");
  console.log("========================================\n");

  try {
    const d = await question("📅 งวดวันที่ (เช่น 2568-04-16) : ");
    if (!d) throw new Error("ยกเลิกการทำรายการ");

    const first = await question("🏆 รางวัลที่ 1 (6 หลัก)         : ");
    const back2 = await question("🔴 2 ตัวล่าง (2 หลัก)           : ");
    
    console.log("\n--- หมวด 3 ตัว (พิมพ์ติดกัน เว้นวรรค หรือ / ก็ได้) ---");
    const front3Raw = await question("🟢 3 ตัวหน้า 2 รางวัล           : ");
    const back3Raw  = await question("🔵 3 ตัวล่าง 2 รางวัล           : ");

    rl.close();

    // ดึงเฉพาะตัวเลขออกมา
    const get3 = (str) => {
      const nums = str.match(/\d{3}/g);
      return nums && nums.length >= 2 ? [nums[0], nums[1]] : ["000", "000"];
    };

    const newEntry = {
      d: d.trim(),
      first: first.replace(/\D/g, ""),
      front3: get3(front3Raw),
      back3: get3(back3Raw),
      back2: back2.replace(/\D/g, "")
    };

    console.log("\n📋 ตรวจสอบข้อมูล:");
    console.log(newEntry);

    // ── อ่านประวัติเดิม ──
    const content = readFileSync(HISTORY_PATH, "utf-8");
    const insertAfter = content.includes("export const RAW = [") ? "export const RAW = [" : "const RAW = [";
    const newLine = `\n  { d:"${newEntry.d}", first:"${newEntry.first}", front3:["${newEntry.front3[0]}","${newEntry.front3[1]}"], back3:["${newEntry.back3[0]}","${newEntry.back3[1]}"], back2:"${newEntry.back2}" },`;

    if (content.includes(`d:"${newEntry.d}"`)) {
      console.log("\n⚠️  งวดนี้มีข้อมูลแล้ว ไม่ได้เพิ่มซ้ำ");
      return; 
    }

    const updated = content.replace(insertAfter, insertAfter + newLine);
    writeFileSync(HISTORY_PATH, updated, "utf-8");
    
    console.log(`\n✅ บันทึกงวด ${newEntry.d} ลงไฟล์ history.js สำเร็จแล้ว!`);
  } catch (err) {
    console.log(`\n❌ ${err.message}`);
    rl.close();
  }
}

main();