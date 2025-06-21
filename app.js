document.addEventListener('DOMContentLoaded', () => {
    // グローバル変数と定数 (変更なし)
    const CATEGORIES = ["食費", "日用品", "すまい", "外食費", "交通費", "保険", "光熱費", "通信費", "交際費", "投資", "医療費", "お小遣い", "子供", "その他"];
    let current_date = new Date();
    let data = {
        expenses: [],
        incomes: []
    };
    let expenseChart = null;
    let summaryChart = null;

    // DOM要素 (変更なし)
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
    const tabButtons = document.querySelectorAll('.tab-btn');
    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    // データ管理、日付関連、ページ切り替え、モーダル制御 (変更なし)
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
    function updateCurrentMonthDisplay() {
        currentMonthYearEl.textContent = `${current_date.getFullYear()}年 ${current_date.getMonth() + 1}月`;
    }
    function showPage(pageId) {
        Object.values(pageElements).forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        pageElements[pageId].classList.add('active');
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
        renderAll();
    }
    function openModal() {
        document.getElementById('expense-date').value = getFormattedDate(new Date());
        modal.style.display = 'block';
    }
    function closeModal() {
        modal.style.display = 'none';
        expenseForm.reset();
        incomeForm.reset();
    }
    
    // 描画・更新
    function renderAll() {
        const year = current_date.getFullYear();
        const month = current_date.getMonth();
        const monthlyExpenses = data.expenses.filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month);
        const monthlyIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === year && new Date(i.date).getMonth() === month);
        renderDashboard(monthlyExpenses, monthlyIncomes);
        renderCategoryList(monthlyExpenses);
        renderExpenseList(monthlyExpenses);
        renderYearlySummary();
        updateCurrentMonthDisplay();
    }

    // ▼▼▼ `renderDashboard` 関数を更新 ▼▼▼
    function renderDashboard(expenses, incomes) {
        // --- 支出カテゴリ円グラフ ---
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

        const expenseChartData = {
            labels: CATEGORIES,
            datasets: [{
                label: '支出',
                data: CATEGORIES.map(c => categoryTotals[c] || 0),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#F94144', '#F3722C', '#F8961E', '#F9C74F', '#8AC926', '#1982C4', '#6A4C93', '#E7E9ED'],
                borderColor: '#cccccc', // 枠線をグレーに設定
                borderWidth: 1
            }]
        };

        if (expenseChart) expenseChart.destroy();
        const expenseCtx = document.getElementById('expense-category-chart').getContext('2d');
        expenseChart = new Chart(expenseCtx, { 
            type: 'pie', 
            data: expenseChartData, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true, // 凡例を強制的に表示
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            // 凡例に割合を表示するフォーマッター
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const {labels, datasets} = data;
                                    const total = datasets[0].data.reduce((a, b) => a + b, 0);
                                    
                                    return labels.map((label, i) => {
                                        const value = datasets[0].data[i];
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                        return {
                                            text: `${label}: ${percentage}%`,
                                            fillStyle: datasets[0].backgroundColor[i],
                                            hidden: !chart.isDatasetVisible(0) || chart.getDatasetMeta(0).data[i].hidden,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                         callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed.toLocaleString() + ' 円';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // --- 財務状況円グラフ ---
        const totalInvestment = expenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalOtherExpenses = expenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const savings = totalIncome - totalOtherExpenses - totalInvestment;

        const summaryChartData = {
            labels: ['支出(投資除く)', '投資', '貯金額'],
            datasets: [{
                label: '財務状況',
                data: [totalOtherExpenses, totalInvestment, Math.max(0, savings)],
                backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB'],
                borderColor: '#cccccc', // 枠線をグレーに設定
                borderWidth: 1
            }]
        };
        if (summaryChart) summaryChart.destroy();
        const summaryCtx = document.getElementById('financial-summary-chart').getContext('2d');
        summaryChart = new Chart(summaryCtx, { 
            type: 'pie', 
            data: summaryChartData, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                 plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20
                        }
                    }
                }
            }
        });
        
        // --- 家族口座入金額 ---
        const kosukeIncome = incomes.filter(i => i.person === '浩介').reduce((sum, i) => sum + i.amount, 0);
        const mayuIncome = incomes.filter(i => i.person === '真由').reduce((sum, i) => sum + i.amount, 0);
        const kosukeExpense = expenses.filter(e => e.method === '浩介').reduce((sum, e) => sum + e.amount, 0);
        const mayuExpense = expenses.filter(e => e.method === '真由').reduce((sum, e) => sum + e.amount, 0);
        document.getElementById('kosuke-deposit').textContent = `${(kosukeIncome - kosukeExpense).toLocaleString()} 円`;
        document.getElementById('mayu-deposit').textContent = `${(mayuIncome - mayuExpense).toLocaleString()} 円`;
    }
    // ▲▲▲ `renderDashboard` 関数ここまで ▲▲▲

    // `renderCategoryList` 関数 (変更なし)
    function renderCategoryList(expenses) {
        const tbody = document.querySelector('#category-summary-table tbody');
        tbody.innerHTML = '';
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });
        CATEGORIES.forEach(category => {
            const total = categoryTotals[category] || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${category}</td><td>${total.toLocaleString()} 円</td>`;
            tbody.appendChild(tr);
        });
    }

    // ▼▼▼ `renderExpenseList` 関数を更新 ▼▼▼
    function renderExpenseList(expenses) {
        const tbody = document.querySelector('#expense-list-table tbody');
        tbody.innerHTML = '';
        const MIN_ROWS = 20;

        expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

        let rowCount = 0;
        expenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>${e.amount.toLocaleString()} 円</td>
                <td>${e.method}</td>
            `; // メモのセルを削除
            tbody.appendChild(tr);
            rowCount++;
        });

        const rowsToAdd = Math.max(0, MIN_ROWS - rowCount);
        for (let i = 0; i < rowsToAdd; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
            `; // メモのセルを削除
            tbody.appendChild(tr);
        }
    }
    // ▲▲▲ `renderExpenseList` 関数ここまで ▲▲▲

    // `renderYearlySummary` 関数 (変更なし)
    function renderYearlySummary() {
        const year = current_date.getFullYear();
        document.getElementById('current-year-summary').textContent = year;
        const yearlyExpenses = data.expenses.filter(e => new Date(e.date).getFullYear() === year);
        const yearlyIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === year);
        const totalIncome = yearlyIncomes.reduce((sum, i) => sum + i.amount, 0);
        const totalInvestment = yearlyExpenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalExpenseExclInvestment = yearlyExpenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);
        const tbody = document.querySelector('#yearly-summary-table tbody');
        tbody.innerHTML = `
            <tr><td>収入合計</td><td>${totalIncome.toLocaleString()} 円</td></tr>
            <tr><td>支出合計（投資除く）</td><td>${totalExpenseExclInvestment.toLocaleString()} 円</td></tr>
            <tr><td>投資合計</td><td>${totalInvestment.toLocaleString()} 円</td></tr>
        `;
    }

    // イベントリスナー (大きな変更なし)
    navButtons.forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    addBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target == modal) closeModal(); });
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${btn.dataset.form}-form`).classList.add('active');
        });
    });
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
        saveData();
        showPage(document.querySelector('.nav-btn.active').dataset.page);
        closeModal();
    });
    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        data.incomes.push({
            id: Date.now(),
            date: getFormattedDate(current_date),
            person: document.getElementById('income-person').value,
            amount: parseInt(document.getElementById('income-amount').value, 10),
        });
        saveData();
        showPage(document.querySelector('.nav-btn.active').dataset.page);
        closeModal();
    });
    prevMonthBtn.addEventListener('click', () => {
        current_date.setMonth(current_date.getMonth() - 1);
        renderAll();
    });
    nextMonthBtn.addEventListener('click', () => {
        current_date.setMonth(current_date.getMonth() + 1);
        renderAll();
    });
    
    // 初期化 (変更なし)
    function init() {
        loadData();
        updateCurrentMonthDisplay();
        showPage('dashboard');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    }
    init();
});