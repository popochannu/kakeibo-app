document.addEventListener('DOMContentLoaded', () => {
    // --- グローバル変数と定数 ---
    const CATEGORIES = ["食費", "日用品", "すまい", "外食費", "交通費", "保険", "光熱費", "通信費", "交際費", "投資", "医療費", "お小遣い", "子供", "その他"];
    let current_date = new Date();
    let data = {
        expenses: [],
        incomes: []
    };
    let expenseChart = null;
    let summaryChart = null;

    // --- DOM要素 ---
    const pageElements = {
        dashboard: document.getElementById('page-dashboard'),
        categoryList: document.getElementById('page-category-list'),
        expenseList: document.getElementById('page-expense-list'),
        yearlySummary: document.getElementById('page-yearly-summary'),
    };
    const navButtons = document.querySelectorAll('.nav-btn');
    const modal = document.getElementById('input-modal');
    const addBtn = document.getElementById('add-btn');
    const closeBtn = document.querySelector('.close-btn');
    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    // --- データ管理 & ユーティリティ (変更なし) ---
    function saveData() { localStorage.setItem('kakeiboData', JSON.stringify(data)); }
    function loadData() {
        const savedData = localStorage.getItem('kakeiboData');
        if (savedData) { data = JSON.parse(savedData); }
    }
    function getFormattedDate(date) {
        const y = date.getFullYear();
        const m = ('0' + (date.getMonth() + 1)).slice(-2);
        const d = ('0' + date.getDate()).slice(-2);
        return `${y}-${m}-${d}`;
    }
    
    // --- 各ページの描画関数 ---

    function renderDashboard(expenses, incomes) {
        if (expenseChart) expenseChart.destroy();
        if (summaryChart) summaryChart.destroy();

        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        const expenseChartData = {
            labels: CATEGORIES,
            datasets: [{
                label: '支出',
                data: CATEGORIES.map(c => categoryTotals[c] || 0),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#F94144', '#F3722C', '#F8961E', '#F9C74F', '#8AC926', '#1982C4', '#6A4C93', '#E7E9ED'],
                borderColor: '#cccccc', borderWidth: 1
            }]
        };
        const expenseCtx = document.getElementById('expense-category-chart').getContext('2d');
        expenseChart = new Chart(expenseCtx, { 
            type: 'pie', data: expenseChartData, options: { responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom', labels: { padding: 8, font: { size: 10 },
                    generateLabels: function(chart) {
                        const {labels, datasets} = chart.data;
                        if (!labels.length || !datasets.length) return [];
                        const total = datasets[0].data.reduce((a, b) => a + b, 0);
                        return labels.map((label, i) => {
                            const value = datasets[0].data[i];
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                            return { text: `${label}: ${percentage}%`, fillStyle: datasets[0].backgroundColor[i], index: i };
                        });
                    }
                }}, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toLocaleString()} 円` }}}
            }
        });

        const totalInvestment = expenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalOtherExpenses = expenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const savings = totalIncome - totalOtherExpenses - totalInvestment;
        const summaryChartData = {
            labels: ['支出(投資除く)', '投資', '貯金額'],
            datasets: [{ data: [totalOtherExpenses, totalInvestment, Math.max(0, savings)], backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB'], borderColor: '#cccccc', borderWidth: 1 }]
        };
        const summaryCtx = document.getElementById('financial-summary-chart').getContext('2d');
        summaryChart = new Chart(summaryCtx, { 
            type: 'pie', data: summaryChartData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 20 }}}}
        });
        
        const kosukeIncome = incomes.filter(i => i.person === '浩介').reduce((s, i) => s + i.amount, 0) - expenses.filter(e => e.method === '浩介').reduce((s, e) => s + e.amount, 0);
        const mayuIncome = incomes.filter(i => i.person === '真由').reduce((s, i) => s + i.amount, 0) - expenses.filter(e => e.method === '真由').reduce((s, e) => s + e.amount, 0);
        document.getElementById('kosuke-deposit').textContent = `${kosukeIncome.toLocaleString()} 円`;
        document.getElementById('mayu-deposit').textContent = `${mayuIncome.toLocaleString()} 円`;
    }

    function renderCategoryList(expenses) {
        const tbody = document.querySelector('#category-summary-table tbody');
        tbody.innerHTML = '';
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        CATEGORIES.forEach(category => {
            const total = categoryTotals[category] || 0;
            tbody.innerHTML += `<tr><td>${category}</td><td>${total.toLocaleString()} 円</td></tr>`;
        });
    }

    function renderExpenseList(expenses) {
        const tbody = document.querySelector('#expense-list-table tbody');
        tbody.innerHTML = '';
        if (expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">この月の支出はありません</td></tr>`;
        } else {
            expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
            expenses.forEach(e => {
                tbody.innerHTML += `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.amount.toLocaleString()} 円</td><td>${e.method}</td></tr>`;
            });
        }
    }

    function renderYearlySummary() {
        const year = current_date.getFullYear();
        const yearlyExpenses = data.expenses.filter(e => new Date(e.date).getFullYear() === year);
        const yearlyIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === year);
        const totalIncome = yearlyIncomes.reduce((sum, i) => sum + i.amount, 0);
        const totalInvestment = yearlyExpenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalExpense = yearlyExpenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);
        
        document.getElementById('current-year-summary').textContent = year;
        const tbody = document.querySelector('#yearly-summary-table tbody');
        tbody.innerHTML = `
            <tr><td>収入合計</td><td>${totalIncome.toLocaleString()} 円</td></tr>
            <tr><td>支出合計</td><td>${totalExpense.toLocaleString()} 円</td></tr>
            <tr><td>投資合計</td><td>${totalInvestment.toLocaleString()} 円</td></tr>
        `;
    }

    // --- 表示更新のメインロジック ---
    function updateDisplay() {
        currentMonthYearEl.textContent = `${current_date.getFullYear()}年 ${current_date.getMonth() + 1}月`;
        
        const currentPageId = document.querySelector('.nav-btn.active').dataset.page;
        const year = current_date.getFullYear();
        const month = current_date.getMonth();

        const monthlyExpenses = data.expenses.filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month);
        const monthlyIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === year && new Date(i.date).getMonth() === month);
        
        switch (currentPageId) {
            case 'dashboard': renderDashboard(monthlyExpenses, monthlyIncomes); break;
            case 'category-list': renderCategoryList(monthlyExpenses); break;
            case 'expense-list': renderExpenseList(monthlyExpenses); break;
            case 'yearly-summary': renderYearlySummary(); break;
        }
    }

    // --- イベントリスナー設定 ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            const pageId = event.currentTarget.dataset.page;
            
            navButtons.forEach(b => b.classList.remove('active'));
            event.currentTarget.classList.add('active');

            Object.values(pageElements).forEach(p => p.classList.remove('active'));
            pageElements[pageId].classList.add('active');
            
            updateDisplay(); // 表示を切り替えた後に描画
        });
    });

    const handleFormSubmit = () => {
        saveData();
        modal.style.display = 'none';
        expenseForm.reset();
        incomeForm.reset();
        alert('入力完了しました');

        // 表紙タブをアクティブにする
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-btn[data-page="dashboard"]').classList.add('active');
        Object.values(pageElements).forEach(p => p.classList.remove('active'));
        pageElements.dashboard.classList.add('active');

        updateDisplay(); // 表紙を描画
    };

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        data.expenses.push({
            id: Date.now(),
            date: document.getElementById('expense-date').value,
            category: document.getElementById('expense-category').value,
            amount: parseInt(document.getElementById('expense-amount').value, 10),
            memo: document.getElementById('expense-memo').value,
            method: document.getElementById('expense-method').value,
        });
        handleFormSubmit();
    });

    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        data.incomes.push({
            id: Date.now(),
            date: getFormattedDate(current_date),
            person: document.getElementById('income-person').value,
            amount: parseInt(document.getElementById('income-amount').value, 10),
        });
        handleFormSubmit();
    });

    prevMonthBtn.addEventListener('click', () => {
        current_date.setMonth(current_date.getMonth() - 1);
        updateDisplay();
    });

    nextMonthBtn.addEventListener('click', () => {
        current_date.setMonth(current_date.getMonth() + 1);
        updateDisplay();
    });
    
    addBtn.addEventListener('click', () => {
        document.getElementById('expense-date').value = getFormattedDate(new Date());
        modal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

    // --- 初期化処理 ---
    function init() {
        loadData();
        // 初期表示タブを設定
        pageElements.dashboard.classList.add('active');
        document.querySelector('.nav-btn[data-page="dashboard"]').classList.add('active');
        updateDisplay(); // アプリ起動時に最初の描画を行う
    }

    init();
});