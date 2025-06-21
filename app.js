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
    const tabButtons = document.querySelectorAll('.tab-btn');
    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    // --- データ管理 (変更なし) ---
    function saveData() {
        localStorage.setItem('kakeiboData', JSON.stringify(data));
    }

    function loadData() {
        const savedData = localStorage.getItem('kakeiboData');
        if (savedData) {
            data = JSON.parse(savedData);
        }
    }

    // --- 日付関連 (変更なし) ---
    function getFormattedDate(date) {
        const y = date.getFullYear();
        const m = ('0' + (date.getMonth() + 1)).slice(-2);
        const d = ('0' + date.getDate()).slice(-2);
        return `${y}-${m}-${d}`;
    }

    function updateCurrentMonthDisplay() {
        currentMonthYearEl.textContent = `${current_date.getFullYear()}年 ${current_date.getMonth() + 1}月`;
    }

    // --- ページ切り替え (変更なし) ---
    function showPage(pageId) {
        Object.values(pageElements).forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        pageElements[pageId].classList.add('active');
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
        renderAll();
    }

    // --- モーダル制御 (変更なし) ---
    function openModal() {
        document.getElementById('expense-date').value = getFormattedDate(new Date());
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        expenseForm.reset();
        incomeForm.reset();
    }
    
    // --- 描画・更新 ---
    function renderAll() {
        const year = current_date.getFullYear();
        const month = current_date.getMonth();

        const monthlyExpenses = data.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const monthlyIncomes = data.incomes.filter(i => {
            const d = new Date(i.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

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
        
        // データがなくても全カテゴリをラベルとして使用
        const expenseChartData = {
            labels: CATEGORIES,
            datasets: [{
                label: '支出',
                data: CATEGORIES.map(c => categoryTotals[c] || 0),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8AC926', '#1982C4', '#6A4C93', '#F94144', '#F3722C', '#F8961E', '#F9C74F'],
                borderColor: '#fff',
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
                        position: 'bottom', // 凡例を下に表示してスペースを確保
                        labels: {
                            padding: 10
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

        // データがなくても固定ラベルで表示
        const summaryChartData = {
            labels: ['支出(投資除く)', '投資', '貯金額'],
            datasets: [{
                label: '財務状況',
                data: [totalOtherExpenses, totalInvestment, Math.max(0, savings)],
                backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB'],
                borderColor: '#fff',
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

    // ▼▼▼ `renderCategoryList` 関数を更新 ▼▼▼
    function renderCategoryList(expenses) {
        const tbody = document.querySelector('#category-summary-table tbody');
        tbody.innerHTML = '';
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        // データがなくても全カテゴリを表示
        CATEGORIES.forEach(category => {
            const total = categoryTotals[category] || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${category}</td><td>${total.toLocaleString()} 円</td>`;
            tbody.appendChild(tr);
        });
    }
    // ▲▲▲ `renderCategoryList` 関数ここまで ▲▲▲

    // ▼▼▼ `renderExpenseList` 関数を更新 ▼▼▼
    function renderExpenseList(expenses) {
        const tbody = document.querySelector('#expense-list-table tbody');
        tbody.innerHTML = '';
        const MIN_ROWS = 20;

        expenses.sort((a, b) => new Date(a.date) - new Date(b.date)); // 日付昇順にソート

        let rowCount = 0;
        expenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>${e.amount.toLocaleString()} 円</td>
                <td>${e.method}</td>
                <td>${e.memo || ''}</td>
            `;
            tbody.appendChild(tr);
            rowCount++;
        });

        // 最低20行になるまで空行を追加
        const rowsToAdd = Math.max(0, MIN_ROWS - rowCount);
        for (let i = 0; i < rowsToAdd; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
                <td> </td>
            `;
            tbody.appendChild(tr);
        }
    }
    // ▲▲▲ `renderExpenseList` 関数ここまで ▲▲▲

    // ▼▼▼ `renderYearlySummary` 関数を更新 ▼▼▼
    function renderYearlySummary() {
        const year = current_date.getFullYear();
        document.getElementById('current-year-summary').textContent = year;
        
        const yearlyExpenses = data.expenses.filter(e => new Date(e.date).getFullYear() === year);
        const yearlyIncomes = data.incomes.filter(i => new Date(i.date).getFullYear() === year);

        const totalIncome = yearlyIncomes.reduce((sum, i) => sum + i.amount, 0);
        const totalInvestment = yearlyExpenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalExpenseExclInvestment = yearlyExpenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);

        const tbody = document.querySelector('#yearly-summary-table tbody');
        // データがなくてもテーブルは表示される
        tbody.innerHTML = `
            <tr><td>収入合計</td><td>${totalIncome.toLocaleString()} 円</td></tr>
            <tr><td>支出合計（投資除く）</td><td>${totalExpenseExclInvestment.toLocaleString()} 円</td></tr>
            <tr><td>投資合計</td><td>${totalInvestment.toLocaleString()} 円</td></tr>
        `;
    }
    // ▲▲▲ `renderYearlySummary` 関数ここまで ▲▲▲

    // --- イベントリスナー (大きな変更なし) ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            showPage(btn.dataset.page);
        });
    });

    addBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            closeModal();
        }
    });

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
        const newExpense = {
            id: Date.now(),
            date: document.getElementById('expense-date').value,
            category: document.getElementById('expense-category').value,
            amount: parseInt(document.getElementById('expense-amount').value, 10),
            memo: document.getElementById('expense-memo').value,
            method: document.getElementById('expense-method').value,
        };
        data.expenses.push(newExpense);
        saveData();
        // 現在表示中のページを再描画
        const currentPage = document.querySelector('.nav-btn.active').dataset.page;
        showPage(currentPage);
        closeModal();
    });

    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // 収入の日付は表示中の月にする
        const incomeDate = new Date(current_date);
        const newIncome = {
            id: Date.now(),
            date: getFormattedDate(incomeDate), 
            person: document.getElementById('income-person').value,
            amount: parseInt(document.getElementById('income-amount').value, 10),
        };
        data.incomes.push(newIncome);
        saveData();
        // 現在表示中のページを再描画
        const currentPage = document.querySelector('.nav-btn.active').dataset.page;
        showPage(currentPage);
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
    
    // --- 初期化 (変更なし) ---
    function init() {
        loadData();
        updateCurrentMonthDisplay();
        showPage('dashboard');

        // Service Workerの登録
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js') // 相対パスに変更
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    }

    init();
});