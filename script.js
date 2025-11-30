// Simple Calculator logic
(function(){
let expr = '';
let lastResult = null;

const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

function updateDisplay(){
  display.textContent = expr || '0';
}

function safeEval(str){
  const normalized = str.trim();
  if(!normalized) return 0;
  
  // Sanitize: only allow numbers, operators, dots, parens, percent, spaces
  if(!/^[0-9+\-*/().%\s]*$/.test(normalized)){
    throw new Error('Invalid characters');
  }
  
  // Handle percent: convert `number%` to `(number/100)`
  const withPercent = normalized.replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
  
  // Use Function constructor for controlled evaluation
  return Function(`"use strict"; return (${withPercent});`)();
}

function appendToken(token){
  // prevent multiple dots in a number
  if(token === '.'){
    // get last token (after last operator)
    const parts = expr.split(/[^0-9.]/);
    const last = parts[parts.length-1] || '';
    if(last.includes('.')) return;
  }
  expr += token;
  updateDisplay();
}

function doBack(){
  expr = expr.slice(0,-1);
  updateDisplay();
}

function doClear(){ 
  expr = ''; 
  updateDisplay(); 
}

function doEquals(){
  if(expr.trim() === '') return;
  try{
    const val = safeEval(expr);
    lastResult = val;
    expr = String(Number.isFinite(val) ? +val.toPrecision(12) : val);
    updateDisplay();
  }catch(e){
    expr = 'Error';
    updateDisplay();
    setTimeout(()=>{ expr=''; updateDisplay(); }, 1100);
  }
}

buttons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const v = btn.dataset.value;
    const action = btn.dataset.action;
    if(action === 'clear') return doClear();
    if(action === 'back') return doBack();
    if(action === 'equals') return doEquals();
    if(v) return appendToken(v);
  })
});

// Keyboard support
window.addEventListener('keydown', (ev)=>{
  if(ev.key >= '0' && ev.key <= '9') { appendToken(ev.key); ev.preventDefault(); return; }
  if(['+','-','*','/','(',')','.'].includes(ev.key)){ appendToken(ev.key); ev.preventDefault(); return; }
  if(ev.key === 'Enter'){ doEquals(); ev.preventDefault(); return; }
  if(ev.key === 'Backspace'){ doBack(); ev.preventDefault(); return; }
  if(ev.key === 'Escape'){ doClear(); ev.preventDefault(); return; }
  if(ev.key === '%'){ appendToken('%'); ev.preventDefault(); return; }
});

// initialize
updateDisplay();
})();
