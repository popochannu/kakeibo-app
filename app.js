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
    
    // --- データ管理 ---
    function saveData() {
        localStorage.setItem('kakeiboData', JSON.stringify(data));
    }

    function loadData() {
        const savedData = localStorage.getItem('kakeiboData');
        if (savedData) {
            data = JSON.parse(savedData);
        }
    }

    // --- 日付関連 ---
    function getFormattedDate(date) {
        const y = date.getFullYear();
        const m = ('0' + (date.getMonth() + 1)).slice(-2);
        const d = ('0' + date.getDate()).slice(-2);
        return `${y}-${m}-${d}`;
    }

    function updateCurrentMonthDisplay() {
        currentMonthYearEl.textContent = `${current_date.getFullYear()}年 ${current_date.getMonth() + 1}月`;
    }

    // --- ページ切り替え ---
    function showPage(pageId) {
        Object.values(pageElements).forEach(page => page.classList.remove('active'));
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        pageElements[pageId].classList.add('active');
        document.querySelector(`.nav-btn[data-page="${pageId}"]`).classList.add('active');
        renderAll();
    }

    // --- モーダル制御 ---
    function openModal() {
        // デフォルトの日付を今日に設定
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

    function renderDashboard(expenses, incomes) {
        // カテゴリ別支出円グラフ
        const categoryTotals = {};
        CATEGORIES.forEach(c => categoryTotals[c] = 0);
        expenses.forEach(e => {
            if (categoryTotals.hasOwnProperty(e.category)) {
                categoryTotals[e.category] += e.amount;
            }
        });

        const expenseChartData = {
            labels: CATEGORIES.filter(c => categoryTotals[c] > 0),
            datasets: [{
                data: CATEGORIES.filter(c => categoryTotals[c] > 0).map(c => categoryTotals[c]),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8AC926', '#1982C4', '#6A4C93', '#F94144', '#F3722C', '#F8961E', '#F9C74F']
            }]
        };

        if (expenseChart) expenseChart.destroy();
        const expenseCtx = document.getElementById('expense-category-chart').getContext('2d');
        expenseChart = new Chart(expenseCtx, { type: 'pie', data: expenseChartData, options: { responsive: true, maintainAspectRatio: false } });

        // 財務状況円グラフ
        const totalInvestment = expenses.filter(e => e.category === '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalOtherExpenses = expenses.filter(e => e.category !== '投資').reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const savings = totalIncome - totalOtherExpenses - totalInvestment;

        const summaryChartData = {
            labels: ['支出(投資除く)', '投資', '貯金額'],
            datasets: [{
                data: [totalOtherExpenses, totalInvestment, Math.max(0, savings)],
                backgroundColor: ['#FF6384', '#FFCE56', '#36A2EB']
            }]
        };
        if (summaryChart) summaryChart.destroy();
        const summaryCtx = document.getElementById('financial-summary-chart').getContext('2d');
        summaryChart = new Chart(summaryCtx, { type: 'pie', data: summaryChartData, options: { responsive: true, maintainAspectRatio: false } });
        
        // 家族口座入金額
        const kosukeIncome = incomes.filter(i => i.person === '浩介').reduce((sum, i) => sum + i.amount, 0);
        const mayuIncome = incomes.filter(i => i.person === '真由').reduce((sum, i) => sum + i.amount, 0);
        const kosukeExpense = expenses.filter(e => e.method === '浩介').reduce((sum, e) => sum + e.amount, 0);
        const mayuExpense = expenses.filter(e => e.method === '真由').reduce((sum, e) => sum + e.amount, 0);

        document.getElementById('kosuke-deposit').textContent = (kosukeIncome - kosukeExpense).toLocaleString();
        document.getElementById('mayu-deposit').textContent = (mayuIncome - mayuExpense).toLocaleString();
    }

    function renderCategoryList(expenses) {
        const tbody = document.querySelector('#category-summary-table tbody');
        tbody.innerHTML = '';
        const categoryTotals = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        for (const category in categoryTotals) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${category}</td><td>${categoryTotals[category].toLocaleString()} 円</td>`;
            tbody.appendChild(tr);
        }
    }

    function renderExpenseList(expenses) {
        const tbody = document.querySelector('#expense-list-table tbody');
        tbody.innerHTML = '';
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date)); // 日付順にソート

        expenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>${e.amount.toLocaleString()} 円</td>
                <td>${e.method}</td>
                <td>${e.memo}</td>
            `;
            tbody.appendChild(tr);
        });
    }

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


    // --- イベントリスナー ---
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
        renderAll();
        closeModal();
    });

    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newIncome = {
            id: Date.now(),
            date: getFormattedDate(current_date), // 収入は当月で登録
            person: document.getElementById('income-person').value,
            amount: parseInt(document.getElementById('income-amount').value, 10),
        };
        data.incomes.push(newIncome);
        saveData();
        renderAll();
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
    
    // --- 初期化 ---
    function init() {
        loadData();
        updateCurrentMonthDisplay();
        showPage('dashboard');

        // Service Workerの登録
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }
    }

    init();
});