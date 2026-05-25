/**
 * Math Engine — ฟังก์ชันคำนวณสถิติหวยไทยทั้งหมด
 * ห้ามเขียน Logic ซ้ำซ้อนใน UI — ให้เรียกใช้จากที่นี่เท่านั้น
 * @module utils/mathEngine
 */

/**
 * คำนวณสถิติทั้งหมดจาก history array
 * @param {Array} history - HISTORY array จาก src/data/history.js
 * @returns {Object} stats object
 */
export function getStats(history) {
  const N = history.length;

  // ── 1. Frequency per prize type ──
  const back2Freq = {};
  const back3Freq = {};
  const front3Freq = {};

  // Digit frequency across ALL numbers
  const digFreq = Array(10).fill(0);
  const lastDigSeen = {};

  // Positional for back2 (2 pos), back3 (3 pos), first6 (6 pos)
  const back2PosFreq  = [Array(10).fill(0), Array(10).fill(0)];
  const back3PosFreq  = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];
  const front3PosFreq = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];
  const first6PosFreq = Array.from({length:6}, () => Array(10).fill(0));

  const pairFreq = {}; // back2 pair frequency
  const pairLast = {};

  let odd=0, even=0, hi=0, lo=0, dbl2=0, totDig=0;

  history.forEach((row, i) => {
    // back2
    const b2 = row.back2;
    back2Freq[b2] = (back2Freq[b2]||0) + 1;
    if (!(b2 in pairLast)) pairLast[b2] = i;
    pairFreq[b2] = (pairFreq[b2]||0) + 1;
    if (b2[0] === b2[1]) dbl2++;
    b2.split("").forEach((d, p) => back2PosFreq[p][+d]++);

    // back3
    row.back3.forEach(b3 => {
      back3Freq[b3] = (back3Freq[b3]||0) + 1;
      b3.split("").forEach((d, p) => back3PosFreq[p][+d]++);
    });

    // front3
    row.front3.forEach(f3 => {
      front3Freq[f3] = (front3Freq[f3]||0) + 1;
      f3.split("").forEach((d, p) => front3PosFreq[p][+d]++);
    });

    // first6
    row.first.split("").forEach((d, p) => first6PosFreq[p][+d]++);

    // digit freq (from back2 + back3 + front3 + first)
    const allNums = [b2, ...row.back3, ...row.front3, row.first];
    allNums.forEach(num => {
      num.split("").forEach(d => {
        const n = +d;
        digFreq[n]++;
        if (!(n in lastDigSeen)) lastDigSeen[n] = i;
        n%2===0 ? even++ : odd++;
        n>=5 ? hi++ : lo++;
        totDig++;
      });
    });
  });

  const digArr = digFreq.map((count, n) => ({ d:n, count, gap: lastDigSeen[n]??999 }));
  const hot     = [...digArr].sort((a,b) => b.count-a.count).slice(0,4);
  const cold    = [...digArr].sort((a,b) => a.count-b.count).slice(0,4);
  const overdue = [...digArr].sort((a,b) => b.gap-a.gap).slice(0,4);

  // back2 sorted
  const back2Arr  = Object.entries(back2Freq).map(([n,count]) => ({n,count,gap:pairLast[n]??999})).sort((a,b) => b.count-a.count);
  const back3Arr  = Object.entries(back3Freq).map(([n,count]) => ({n,count})).sort((a,b) => b.count-a.count);
  const front3Arr = Object.entries(front3Freq).map(([n,count]) => ({n,count})).sort((a,b) => b.count-a.count);

  // Combo score for back2 (freq 40% + gap 30% + recency 30%)
  const trend = {};
  history.forEach((row, i) => {
    const w = i<5?5:i<15?3:i<30?2:1;
    trend[row.back2] = (trend[row.back2]||0) + w;
  });
  const mxF = back2Arr[0]?.count||1;
  const mxG = Math.max(...back2Arr.map(x => x.gap), 1);
  const mxT = Math.max(...Object.values(trend), 1);
  const cmap = {};
  back2Arr.forEach(x => {
    cmap[x.n] = (x.count/mxF)*40 + (x.gap/mxG)*30 + ((trend[x.n]||0)/mxT)*30;
  });
  const combo = Object.entries(cmap).map(([n,s]) => ({n,s:Math.round(s)})).sort((a,b) => b.s-a.s);

  // Day pattern (1st vs 16th)
  const day1   = history.filter(r => r.drawDay===1).map(r => r.back2);
  const day16  = history.filter(r => r.drawDay===16).map(r => r.back2);
  const day1Freq={}, day16Freq={};
  day1.forEach(n  => { day1Freq[n]  = (day1Freq[n]||0)+1; });
  day16.forEach(n => { day16Freq[n] = (day16Freq[n]||0)+1; });

  return {
    digArr, hot, cold, overdue,
    back2Arr, back3Arr, front3Arr,
    combo,
    back2PosFreq, back3PosFreq, front3PosFreq, first6PosFreq,
    deep: {
      oddPct:  Math.round(odd/totDig*100),
      evenPct: Math.round(even/totDig*100),
      hiPct:   Math.round(hi/totDig*100),
      loPct:   Math.round(lo/totDig*100),
      dbl2Pct: Math.round(dbl2/N*100),
    },
    lastDigSeen,
    hotSet:  new Set(hot.map(h => h.d)),
    coldSet: new Set(cold.map(c => c.d)),
    day1Freq, day16Freq,
    N,
  };
}

/**
 * คำนวณสถิติทั้งหมดสำหรับหวยลาวพัฒนา
 * ใช้ 4 ฟิลด์หลัก: tail4 (4 ตัวท้าย), top3 (3 ตัวบน), top2 (2 ตัวบน), bottom2 (2 ตัวล่าง)
 * @param {Array} history - LAO_HISTORY array จาก src/data/laoHistory.js
 * @returns {Object} stats object
 */
export function getLaoStats(history) {
  const N = history.length;

  // Positional frequency arrays
  const tail4PosFreq = Array.from({length:4}, () => Array(10).fill(0));
  const top3PosFreq  = Array.from({length:3}, () => Array(10).fill(0));
  const top2PosFreq  = Array.from({length:2}, () => Array(10).fill(0));
  const bot2PosFreq  = Array.from({length:2}, () => Array(10).fill(0));

  // Digit frequency (from tail4 digits)
  const digFreq = Array(10).fill(0);
  const lastDigSeen = {};

  // Pair / combo frequency
  const tail4Freq   = {};
  const top2Freq    = {};
  const bottom2Freq = {};

  let odd=0, even=0, hi=0, lo=0, dbl2=0, totDig=0;

  history.forEach((row, i) => {
    // tail4 — positional + digit freq
    row.tail4.split("").forEach((ch, p) => {
      const d = +ch;
      tail4PosFreq[p][d]++;
      digFreq[d]++;
      if (!(d in lastDigSeen)) lastDigSeen[d] = i;
      d%2===0 ? even++ : odd++;
      d>=5 ? hi++ : lo++;
      totDig++;
    });

    // top3 positional
    row.top3.split("").forEach((ch, p) => { if(p<3) top3PosFreq[p][+ch]++; });

    // top2 positional + pair freq
    row.top2.split("").forEach((ch, p) => { if(p<2) top2PosFreq[p][+ch]++; });
    top2Freq[row.top2] = (top2Freq[row.top2]||0) + 1;

    // bottom2 positional + pair freq + double
    row.bottom2.split("").forEach((ch, p) => { if(p<2) bot2PosFreq[p][+ch]++; });
    bottom2Freq[row.bottom2] = (bottom2Freq[row.bottom2]||0) + 1;
    if (row.bottom2[0] === row.bottom2[1]) dbl2++;

    // tail4 pair freq
    tail4Freq[row.tail4] = (tail4Freq[row.tail4]||0) + 1;
  });

  // Hot / Cold / Overdue
  const digArr = digFreq.map((count, d) => ({ d, count, gap: lastDigSeen[d]??999 }));
  const hot     = [...digArr].sort((a,b) => b.count-a.count).slice(0,4);
  const cold    = [...digArr].sort((a,b) => a.count-b.count).slice(0,4);
  const overdue = [...digArr].sort((a,b) => b.gap-a.gap).slice(0,4);

  // Sorted pair arrays
  const tail4Arr   = Object.entries(tail4Freq).map(([n,count]) => ({n,count})).sort((a,b) => b.count-a.count);
  const top2Arr    = Object.entries(top2Freq).map(([n,count])  => ({n,count})).sort((a,b) => b.count-a.count);
  const bottom2Arr = Object.entries(bottom2Freq).map(([n,count]) => ({n,count})).sort((a,b) => b.count-a.count);

  // Combo score for bottom2 (freq 40% + gap 30% + recency 30%)
  const trend = {};
  history.forEach((row, i) => {
    const w = i<5?5:i<15?3:i<30?2:1;
    trend[row.bottom2] = (trend[row.bottom2]||0) + w;
  });
  const mxF = bottom2Arr[0]?.count||1;
  const mxT = Math.max(...Object.values(trend), 1);
  const cmap = {};
  bottom2Arr.forEach(x => {
    cmap[x.n] = (x.count/mxF)*50 + ((trend[x.n]||0)/mxT)*50;
  });
  const combo = Object.entries(cmap).map(([n,s]) => ({n,s:Math.round(s)})).sort((a,b) => b.s-a.s);

  return {
    digArr, hot, cold, overdue,
    tail4Arr, top2Arr, bottom2Arr, combo,
    tail4PosFreq, top3PosFreq, top2PosFreq, bot2PosFreq,
    deep: {
      oddPct:  Math.round(odd/totDig*100),
      evenPct: Math.round(even/totDig*100),
      hiPct:   Math.round(hi/totDig*100),
      loPct:   Math.round(lo/totDig*100),
      dbl2Pct: Math.round(dbl2/N*100),
    },
    lastDigSeen,
    hotSet:  new Set(hot.map(h => h.d)),
    coldSet: new Set(cold.map(c => c.d)),
    N,
  };
}

