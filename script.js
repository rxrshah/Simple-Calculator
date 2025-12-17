(function() {
  'use strict';
  
  const state = {
    currentValue: '0',
    previousValue: '',
    operation: null,
    shouldResetDisplay: false,
    fullExpression: '',
    powerMode: false,
    powerBase: '',
    showingResult: false
  };
  
  let history = [];
  let theme = 'purple';
  const today = new Date().toDateString();
  let toastTimeout;
  
  const $id = id => document.getElementById(id);
  const $all = sel => document.querySelectorAll(sel);
  
  const el = {
    display: $id('display'),
    historyDisplay: $id('historyDisplay'),
    displayMode: $id('displayMode'),
    historyPanel: $id('historyPanel'),
    historyList: $id('historyList'),
    historyBadge: $id('historyBadge'),
    toast: $id('toast'),
    totalCalc: $id('totalCalc'),
    todayCalc: $id('todayCalc'),
    scientificRow: $id('scientificRow'),
    themeMenu: $id('themeMenu'),
    clearHistoryBtn: $id('clearHistory')
  };
  
  const themes = {
    purple: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    blue: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    green: { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    orange: { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    red: { bg: 'linear-gradient(135deg, #f85032 0%, #e73827 100%)' },
    pink: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    teal: { bg: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)' },
    sunset: { bg: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)' },
    darkPurple: { bg: 'linear-gradient(135deg, #1a0033 0%, #0d001a 100%)' },
    darkBlue: { bg: 'linear-gradient(135deg, #0a1929 0%, #030b14 100%)' },
    darkGreen: { bg: 'linear-gradient(135deg, #0d1f1a 0%, #040a08 100%)' },
    midnight: { bg: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' },
    amoled: { bg: '#000000' }
  };
  
  function loadStorage() {
    try {
      const savedHistory = localStorage.getItem('calcHistory');
      const savedTheme = localStorage.getItem('calcTheme');
      
      if (savedHistory) history = JSON.parse(savedHistory);
      if (savedTheme && themes[savedTheme]) {
        theme = savedTheme;
        applyTheme(theme, true);
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  
  function saveStorage() {
    try {
      localStorage.setItem('calcHistory', JSON.stringify(history));
      localStorage.setItem('calcTheme', theme);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  
  function showToast(msg, type = 'default') {
    el.toast.textContent = msg;
    el.toast.className = 'toast show';
    if (type === 'error') el.toast.classList.add('error');
    else if (type === 'success') el.toast.classList.add('success');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.toast.classList.remove('show'), 2500);
  }
  
  function updateDisplay() {
    if (state.showingResult) {
      el.display.textContent = '= ' + state.currentValue;
    } else {
      el.display.textContent = state.currentValue;
    }
    el.historyDisplay.textContent = state.fullExpression;
    el.display.classList.remove('error', 'success');
    el.historyDisplay.scrollTop = el.historyDisplay.scrollHeight;
    
    if (state.powerMode) {
      el.displayMode.classList.add('power-active');
      el.displayMode.textContent = 'POWER MODE';
    } else {
      el.displayMode.classList.remove('power-active');
      const activeMode = $all('.toggle-btn.active')[0];
      el.displayMode.textContent = activeMode?.dataset.mode === 'scientific' ? 'SCIENTIFIC' : 'STANDARD';
    }
  }
  
  function formatNumber(num) {
    if (!isFinite(num)) return 'Error';
    if (num === 0) return '0';
    
    const abs = Math.abs(num);
    const str = num.toString();
    
    if (str.length > 12) {
      if (abs < 0.000001 || abs > 999999999999) {
        return num.toExponential(6);
      }
      return parseFloat(num.toPrecision(10)).toString();
    }
    return str;
  }
  
  function appendNumber(digit) {
    if (state.currentValue === 'Error') clear();
    
    if (state.showingResult) {
      state.currentValue = digit;
      state.fullExpression = digit;
      state.showingResult = false;
      state.shouldResetDisplay = false;
      updateDisplay();
      return;
    }
    
    if (state.shouldResetDisplay) {
      state.currentValue = digit;
      state.shouldResetDisplay = false;
      
      if (state.fullExpression && /\s[+\-×÷]\s$/.test(state.fullExpression)) {
        state.fullExpression += digit;
      } else if (state.powerMode) {
        state.fullExpression += digit;
      } else {
        state.fullExpression = digit;
      }
    } else {
      if (state.currentValue === '0' && digit !== '.') {
        state.currentValue = digit;
      } else if (digit === '.' && state.currentValue.includes('.')) {
        showToast('Already has decimal point', 'error');
        return;
      } else if (state.currentValue.length < 15) {
        state.currentValue += digit;
      } else {
        showToast('Maximum 15 digits reached', 'error');
        return;
      }
      
      if (!state.fullExpression || state.fullExpression === '0') {
        state.fullExpression = state.currentValue;
      } else {
        const parts = state.fullExpression.split(/(\s[+\-×÷]\s)/);
        parts[parts.length - 1] = state.currentValue;
        state.fullExpression = parts.join('');
      }
    }
    updateDisplay();
  }
  
  function setOperator(op) {
    if (state.currentValue === 'Error') return;
    
    if (state.showingResult) {
      state.showingResult = false;
    }
    
    if (state.powerMode) {
      completePower();
      return;
    }
    
    if (state.operation && !state.shouldResetDisplay) {
      executeCalc(true);
    }
    
    state.previousValue = state.currentValue;
    state.operation = op;
    
    const sym = {'+': ' + ', '-': ' − ', '*': ' × ', '/': ' ÷ '}[op];
    
    if (!state.fullExpression || state.fullExpression === '0') {
      state.fullExpression = state.currentValue + sym;
    } else if (state.shouldResetDisplay || /\s[+\-×÷]\s$/.test(state.fullExpression)) {
      state.fullExpression = state.fullExpression.replace(/\s[+\-×÷]\s$/, sym);
    } else {
      state.fullExpression += sym;
    }
    
    state.shouldResetDisplay = true;
    
    $all('.btn-operator').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.btn-operator[data-value="${op}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    updateDisplay();
  }
  
  function executeCalc(chaining) {
    if (!state.operation || !state.previousValue || state.currentValue === 'Error') return;
    
    const prev = parseFloat(state.previousValue);
    const curr = parseFloat(state.currentValue);
    
    if (isNaN(prev) || isNaN(curr)) return;
    
    let result;
    
    switch(state.operation) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '*': result = prev * curr; break;
      case '/':
        if (curr === 0) {
          state.currentValue = 'Error';
          el.display.classList.add('error');
          showToast('Cannot divide by zero!', 'error');
          setTimeout(clear, 1500);
          updateDisplay();
          return;
        }
        result = prev / curr;
        break;
      default: return;
    }
    
    const formatted = formatNumber(result);
    
    if (!chaining) {
      const expr = state.fullExpression || `${state.previousValue} ${state.operation} ${state.currentValue}`;
      addHistory(expr, formatted);
      el.display.classList.add('success');
      state.fullExpression = expr;
      state.showingResult = true;
    }
    
    state.currentValue = formatted;
    state.previousValue = formatted;
    
    if (!chaining) {
      state.operation = null;
      state.shouldResetDisplay = true;
      $all('.btn-operator').forEach(btn => btn.classList.remove('active'));
    }
    
    updateDisplay();
  }
  
  function calculate() {
    if (state.powerMode) {
      completePower();
    } else {
      executeCalc(false);
    }
  }
  
  function clear() {
    state.currentValue = '0';
    state.previousValue = '';
    state.operation = null;
    state.shouldResetDisplay = false;
    state.fullExpression = '';
    state.powerMode = false;
    state.powerBase = '';
    state.showingResult = false;
    $all('.btn-operator').forEach(btn => btn.classList.remove('active'));
    updateDisplay();
  }
  
  function backspace() {
    if (state.currentValue === 'Error' || state.showingResult) {
      clear();
      return;
    }
    
    if (state.currentValue.length > 1 && !state.shouldResetDisplay) {
      state.currentValue = state.currentValue.slice(0, -1);
      if (state.fullExpression) {
        const parts = state.fullExpression.split(/(\s[+\-×÷]\s)/);
        if (parts.length > 0) {
          parts[parts.length - 1] = state.currentValue;
          state.fullExpression = parts.join('');
        }
      }
    } else if (state.currentValue !== '0' && !state.shouldResetDisplay) {
      state.currentValue = '0';
      if (state.fullExpression) {
        const parts = state.fullExpression.split(/(\s[+\-×÷]\s)/);
        if (parts.length > 0) {
          parts[parts.length - 1] = '0';
          state.fullExpression = parts.join('');
        }
      }
    }
    updateDisplay();
  }
  
  function percent() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(num / 100);
      if (state.fullExpression && state.operation) {
        const parts = state.fullExpression.split(/(\s[+\-×÷]\s)/);
        parts[parts.length - 1] = result;
        state.fullExpression = parts.join('');
      }
      state.currentValue = result;
      updateDisplay();
    }
  }
  
  function sqrt() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num) && num >= 0) {
      const result = formatNumber(Math.sqrt(num));
      state.fullExpression = `√(${state.currentValue})`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    } else {
      showToast('√ requires non-negative number', 'error');
    }
  }
  
  function square() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(num * num);
      state.fullExpression = `(${state.currentValue})²`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function cube() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(num * num * num);
      state.fullExpression = `(${state.currentValue})³`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function inverse() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num) && num !== 0) {
      const result = formatNumber(1 / num);
      state.fullExpression = `1/(${state.currentValue})`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    } else {
      showToast('Cannot divide by zero', 'error');
    }
  }
  
  function power() {
    if (state.currentValue === 'Error') return;
    if (!state.powerMode) {
      state.powerMode = true;
      state.powerBase = state.currentValue;
      state.fullExpression = `${state.currentValue} ^ `;
      state.shouldResetDisplay = true;
      updateDisplay();
      showToast('Enter exponent, then press = or Enter', 'success');
    }
  }
  
  function completePower() {
    if (!state.powerMode) return;
    const base = parseFloat(state.powerBase);
    const exp = parseFloat(state.currentValue);
    
    if (!isNaN(base) && !isNaN(exp)) {
      const result = formatNumber(Math.pow(base, exp));
      const expr = `${state.powerBase} ^ ${state.currentValue}`;
      addHistory(expr, result);
      
      state.currentValue = result;
      state.previousValue = '';
      state.operation = null;
      state.powerMode = false;
      state.powerBase = '';
      state.shouldResetDisplay = true;
      state.showingResult = true;
      state.fullExpression = expr;
      updateDisplay();
      el.display.classList.add('success');
    } else {
      showToast('Invalid power calculation', 'error');
    }
  }
  
  function pi() {
    state.currentValue = formatNumber(Math.PI);
    state.fullExpression = 'π';
    state.shouldResetDisplay = true;
    updateDisplay();
  }
  
  function euler() {
    state.currentValue = formatNumber(Math.E);
    state.fullExpression = 'e';
    state.shouldResetDisplay = true;
    updateDisplay();
  }
  
  function sin() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(Math.sin(num * Math.PI / 180));
      state.fullExpression = `sin(${state.currentValue}°)`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function cos() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(Math.cos(num * Math.PI / 180));
      state.fullExpression = `cos(${state.currentValue}°)`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function tan() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const rad = num * Math.PI / 180;
      if (Math.abs(Math.cos(rad)) < 1e-10) {
        showToast('Undefined: tan(90°) = ∞', 'error');
        return;
      }
      const result = formatNumber(Math.tan(rad));
      state.fullExpression = `tan(${state.currentValue}°)`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function log10() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num) && num > 0) {
      const result = formatNumber(Math.log10(num));
      state.fullExpression = `log(${state.currentValue})`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    } else {
      showToast('log requires positive number', 'error');
    }
  }
  
  function ln() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num) && num > 0) {
      const result = formatNumber(Math.log(num));
      state.fullExpression = `ln(${state.currentValue})`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    } else {
      showToast('ln requires positive number', 'error');
    }
  }
  
  function factorial() {
    if (state.currentValue === 'Error') return;
    const num = parseInt(state.currentValue);
    if (!isNaN(num) && num >= 0 && num <= 170 && num === parseFloat(state.currentValue)) {
      let result = 1;
      for (let i = 2; i <= num; i++) result *= i;
      const formatted = formatNumber(result);
      state.fullExpression = `${state.currentValue}!`;
      state.currentValue = formatted;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    } else {
      showToast('n! requires integer: 0 ≤ n ≤ 170', 'error');
    }
  }
  
  function abs() {
    if (state.currentValue === 'Error') return;
    const num = parseFloat(state.currentValue);
    if (!isNaN(num)) {
      const result = formatNumber(Math.abs(num));
      state.fullExpression = `|${state.currentValue}|`;
      state.currentValue = result;
      state.shouldResetDisplay = true;
      state.showingResult = true;
      updateDisplay();
    }
  }
  
  function rand() {
    const result = formatNumber(Math.random());
    state.currentValue = result;
    state.fullExpression = 'rand()';
    state.shouldResetDisplay = true;
    updateDisplay();
  }
  
  function addHistory(expr, result) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toDateString();
    
    history.unshift({ expression: expr, result: result, timestamp: time, date: date });
    if (history.length > 100) history.pop();
    
    saveStorage();
    renderHistory();
    updateBadge();
  }
  
  function updateBadge() {
    const count = history.length;
    if (count > 0) {
      el.historyBadge.textContent = count > 99 ? '99+' : count;
      el.historyBadge.style.display = 'block';
    } else {
      el.historyBadge.style.display = 'none';
    }
  }
  
  function renderHistory() {
    const total = history.length;
    const todayCount = history.filter(item => item.date === today).length;
    
    el.totalCalc.textContent = total;
    el.todayCalc.textContent = todayCount;
    
    if (history.length === 0) {
      el.historyList.innerHTML = '<div class="history-empty"><div class="history-empty-icon">📊</div>No calculations yet<br><small style="color: #6b6f7f; font-size: 13px; margin-top: 8px; display: inline-block;">Start calculating to build history</small></div>';
      return;
    }
    
    el.historyList.innerHTML = history.map((item, idx) => {
      const isToday = item.date === today;
      return `<div class="history-item" data-idx="${idx}" title="Click to use: ${esc(item.result)}">
        <div class="history-item-header">
          <div class="history-expression">${esc(item.expression)}</div>
          <div class="history-timestamp">${isToday ? item.timestamp : item.date.split(' ').slice(1,3).join(' ')}</div>
        </div>
        <div class="history-result">= ${esc(item.result)}</div>
      </div>`;
    }).join('');
    
    $all('.history-item').forEach(item => {
      item.addEventListener('click', function() {
        const idx = parseInt(this.dataset.idx);
        const result = history[idx].result;
        if (result !== 'Error') {
          state.currentValue = result;
          state.fullExpression = '';
          state.shouldResetDisplay = true;
          state.showingResult = false;
          state.powerMode = false;
          updateDisplay();
          el.historyPanel.classList.remove('open');
          showToast(`Using: ${result}`, 'success');
        }
      });
    });
  }
  
  function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function applyTheme(newTheme, silent = false) {
    theme = newTheme;
    document.body.style.background = themes[theme].bg;
    
    $all('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    
    el.themeMenu.classList.remove('open');
    if (!silent) {
      showToast(`Theme: ${theme}`, 'success');
      saveStorage();
    }
  }
  
  $all('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      $all('.toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      if (this.dataset.mode === 'scientific') {
        el.scientificRow.classList.add('visible');
        if (!state.powerMode) el.displayMode.textContent = 'SCIENTIFIC';
      } else {
        el.scientificRow.classList.remove('visible');
        if (!state.powerMode) el.displayMode.textContent = 'STANDARD';
      }
    });
  });
  
  $id('historyToggle').addEventListener('click', () => {
    el.historyPanel.classList.add('open');
    el.themeMenu.classList.remove('open');
  });
  
  $id('closeHistory').addEventListener('click', () => {
    el.historyPanel.classList.remove('open');
  });
  
  el.clearHistoryBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (history.length === 0) {
      showToast('History is already empty', 'error');
      return;
    }
    
    if (confirm(`Clear all ${history.length} calculations from history?`)) {
      history = [];
      saveStorage();
      renderHistory();
      updateBadge();
      showToast('History cleared successfully!', 'success');
    }
  });
  
  $id('themeToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    el.themeMenu.classList.toggle('open');
    el.historyPanel.classList.remove('open');
  });
  
  $all('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => applyTheme(opt.dataset.theme));
  });
  
  document.addEventListener('click', (e) => {
    if (!el.themeMenu.contains(e.target) && e.target.id !== 'themeToggle') {
      el.themeMenu.classList.remove('open');
    }
  });
  
  el.historyPanel.addEventListener('click', (e) => {
    if (e.target === el.historyPanel) el.historyPanel.classList.remove('open');
  });
  
  const actions = {
    clear, back: backspace, percent, equals: calculate,
    sqrt, square, cube, inverse, power, pi, e: euler,
    sin, cos, tan, log: log10, ln, factorial, abs, rand
  };
  
  $all('.btn, .btn-scientific').forEach(btn => {
    btn.addEventListener('click', function() {
      const val = this.dataset.value;
      const act = this.dataset.action;
      
      if (val) {
        if (['+', '-', '*', '/'].includes(val)) {
          setOperator(val);
        } else {
          appendNumber(val);
        }
      } else if (act && actions[act]) {
        actions[act]();
      }
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if (el.historyPanel.classList.contains('open') || el.themeMenu.classList.contains('open')) return;
    
    if (e.key >= '0' && e.key <= '9' || e.key === '.') {
      appendNumber(e.key);
    } else if (e.key === '+' || e.key === '-') {
      setOperator(e.key);
    } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
      setOperator('*');
    } else if (e.key === '/' || e.key === '÷') {
      setOperator('/');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      calculate();
    } else if (e.key === 'Escape') {
      clear();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (e.key === '%') {
      percent();
    } else if (e.key.toLowerCase() === 'r') {
      sqrt();
    } else if (e.key.toLowerCase() === 'q') {
      square();
    } else if (e.key.toLowerCase() === 'p') {
      pi();
    } else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
      euler();
    } else if (e.key.toLowerCase() === 'i') {
      inverse();
    } else if (e.key === '^') {
      power();
    } else if (e.key === '!') {
      factorial();
    }
  });
  
  loadStorage();
  renderHistory();
  updateBadge();
  updateDisplay();
  
})();
