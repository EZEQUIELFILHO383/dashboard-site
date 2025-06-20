class FinanceDB {
    constructor() {
        this.dbName = 'neonFinanceDB';
        this.initDB();
    }

    initDB() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                transactions: [
                    {
                        id: 1,
                        type: "income",
                        amount: 5000,
                        description: "Salário",
                        category: "salary",
                        date: new Date().toISOString()
                    },
                    {
                        id: 2,
                        type: "expense",
                        amount: 1200,
                        description: "Aluguel",
                        category: "housing",
                        date: new Date().toISOString()
                    }
                ],
                balance: 3800,
                income: 5000,
                expenses: 1200,
                categories: {
                    salary: 5000,
                    housing: 1200,
                    food: 0,
                    transport: 0,
                    other: 0
                },
                settings: {
                    darkMode: false,
                    currency: "BRL"
                }
            };
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    addTransaction(transaction) {
        const db = this.getData();
        
        // Gera ID único
        transaction.id = db.transactions.length > 0 
            ? Math.max(...db.transactions.map(t => t.id)) + 1 
            : 1;
        
        // Adiciona data atual se não fornecida
        transaction.date = transaction.date || new Date().toISOString();
        
        db.transactions.unshift(transaction);
        
        // Atualiza totais
        if (transaction.type === 'income') {
            db.income += transaction.amount;
            db.balance += transaction.amount;
        } else {
            db.expenses += transaction.amount;
            db.balance -= transaction.amount;
        }
        
        // Atualiza categoria
        db.categories[transaction.category] += transaction.amount;
        
        this.saveData(db);
        return db;
    }

    deleteTransaction(id) {
        const db = this.getData();
        const transaction = db.transactions.find(t => t.id === id);
        
        if (!transaction) return db;
        
        // Reverte totais
        if (transaction.type === 'income') {
            db.income -= transaction.amount;
            db.balance -= transaction.amount;
        } else {
            db.expenses -= transaction.amount;
            db.balance += transaction.amount;
        }
        
        // Reverte categoria
        db.categories[transaction.category] -= transaction.amount;
        
        // Remove transação
        db.transactions = db.transactions.filter(t => t.id !== id);
        
        this.saveData(db);
        return db;
    }

    getRecentTransactions(limit = 5) {
        const db = this.getData();
        return db.transactions.slice(0, limit);
    }
}

class FinanceApp {
    constructor() {
        this.db = new FinanceDB();
        this.currentPage = 'dashboard';
        this.initElements();
        this.initEventListeners();
        this.initCharts();
        this.loadData();
        this.setupServiceWorker();
    }

    initElements() {
        this.elements = {
            // Elementos principais
            loadingScreen: document.getElementById('loading-screen'),
            themeToggle: document.getElementById('theme-toggle'),
            currentBalance: document.getElementById('current-balance'),
            totalIncome: document.getElementById('total-income'),
            totalExpenses: document.getElementById('total-expenses'),
            transactionsList: document.getElementById('transactions-list'),
            
            // Navegação
            sidebar: document.querySelector('.sidebar'),
            menuItems: document.querySelectorAll('.menu li'),
            
            // Modal
            transactionModal: document.getElementById('transaction-modal'),
            transactionForm: document.getElementById('transaction-form'),
            newTransactionBtn: document.getElementById('new-transaction-btn'),
            closeModalBtns: document.querySelectorAll('.close-modal'),
            
            // Gráfico
            mainChart: document.getElementById('main-chart'),
            chartPeriod: document.getElementById('chart-period')
        };
    }

    initEventListeners() {
        // Toggle Theme
        this.elements.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            this.elements.themeToggle.innerHTML = isDarkMode 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
            
            // Salva preferência
            const db = this.db.getData();
            db.settings.darkMode = isDarkMode;
            this.db.saveData(db);
        });

        // Nova Transação
        this.elements.newTransactionBtn.addEventListener('click', () => {
            this.elements.transactionModal.classList.add('active');
        });

        // Fechar Modal
        this.elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.transactionModal.classList.remove('active');
            });
        });

        // Formulário de Transação
        this.elements.transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit();
        });

        // Tipo de Transação (Receita/Despesa)
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Navegação
        this.elements.menuItems.forEach(item => {
            item.addEventListener('click', () => {
                this.elements.menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentPage = item.querySelector('a').getAttribute('href').substring(1);
                this.updatePageTitle();
            });
        });
    }

    initCharts() {
        this.chart = new Chart(this.elements.mainChart, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [
                    {
                        label: 'Receitas',
                        data: [5000, 4000, 6000, 5500, 7000, 6500],
                        borderColor: '#38ef7d',
                        backgroundColor: 'rgba(56, 239, 125, 0.1)',
                        tension: 0.3
                    },
                    {
                        label: 'Despesas',
                        data: [2000, 2500, 1800, 3000, 2200, 2800],
                        borderColor: '#ff416c',
                        backgroundColor: 'rgba(255, 65, 108, 0.1)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    loadData() {
        const db = this.db.getData();
        
        // Aplica tema salvo
        if (db.settings.darkMode) {
            document.body.classList.add('dark-mode');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Atualiza totais
        this.elements.currentBalance.textContent = this.formatCurrency(db.balance);
        this.elements.totalIncome.textContent = this.formatCurrency(db.income);
        this.elements.totalExpenses.textContent = this.formatCurrency(db.expenses);
        
        // Atualiza transações
        this.updateTransactionsList(db.transactions);
        
        // Esconde loading screen
        setTimeout(() => {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 300);
        }, 500);
    }

    updateTransactionsList(transactions) {
        this.elements.transactionsList.innerHTML = transactions
            .map(transaction => `
                <tr>
                    <td>${new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                    <td>${transaction.description}</td>
                    <td>${this.formatCategory(transaction.category)}</td>
                    <td class="${transaction.type === 'income' ? 'positive' : 'negative'}">
                        ${transaction.type === 'income' ? '+' : '-'} ${this.formatCurrency(transaction.amount)}
                    </td>
                </tr>
            `)
            .join('');
    }

    handleTransactionSubmit() {
        const type = document.querySelector('.type-btn.active').dataset.type;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const description = document.getElementById('transaction-description').value.trim();
        const category = document.getElementById('transaction-category').value;
        const date = document.getElementById('transaction-date').value || new Date().toISOString();

        if (!amount || !description || !category) {
            alert('Por favor, preencha todos os campos!');
            return;
        }

        this.db.addTransaction({
            type,
            amount,
            description,
            category,
            date
        });

        this.loadData();
        this.elements.transactionForm.reset();
        this.elements.transactionModal.classList.remove('active');
    }

    updatePageTitle() {
        const pageTitles = {
            'dashboard': 'Dashboard',
            'transactions': 'Transações',
            'goals': 'Metas',
            'reports': 'Relatórios'
        };
        document.getElementById('page-title').textContent = pageTitles[this.currentPage] || 'Dashboard';
    }

    formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    formatCategory(category) {
        const categories = {
            'salary': 'Salário',
            'food': 'Alimentação',
            'transport': 'Transporte',
            'housing': 'Moradia',
            'other': 'Outros'
        };
        return categories[category] || category;
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registrado com sucesso:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Falha ao registrar ServiceWorker:', error);
                    });
            });
        }
    }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new FinanceApp();
});