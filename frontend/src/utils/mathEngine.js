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
