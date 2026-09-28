/* ---------- formatação ---------- */
const nf = (v, d = 2) => (v == null || !isFinite(v)) ? '—' :
  v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const r2 = v => Math.round(v * 100) / 100;
const smart = v => nf(v, Number.isInteger(r2(v)) ? 0 : (Number.isInteger(r2(v) * 10) ? 1 : 2));
const INCH = {3.18:'1/8',4.76:'3/16',6.35:'1/4',7.94:'5/16',9.52:'3/8',11.11:'7/16',12.7:'1/2',15.88:'5/8',19.05:'3/4',
  22.2:'7/8',22.22:'7/8',25.4:'1',31.75:'1.1/4',38.1:'1.1/2',44.45:'1.3/4',50.8:'2',63.5:'2.1/2',76.2:'3',88.9:'3.1/2',
  101.6:'4',127:'5',152.4:'6',203.2:'8',254:'10',305:'12'};
const inch = mm => INCH[r2(mm)] ? INCH[r2(mm)] + '"' : smart(mm) + ' mm';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
