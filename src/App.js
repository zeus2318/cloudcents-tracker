import React, { useState, useEffect } from 'react';
import { PlusCircle, DollarSign, TrendingUp, Calendar, Download, Trash2, Edit3, User, LogOut, Lock, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import expensesPlaceholder from './recentExpenses';
//import awsConfig from './aws-config';
import * as queries from './graphql/queries.js';
import * as mutations from './graphql/mutations.js';
import './App.css';

// Initialize Amplify and API client
//Amplify.configure(awsConfig); //will be temporarily remove for local testing
const client = generateClient();

console.log('Sample Data:', expensesPlaceholder.expenses); // Debug log moved after imports

const CloudCentsBudgetTracker = () => {
  const [expenses, setExpenses] = useState(() => {
    console.log('Setting initial expenses:', expensesPlaceholder.expenses); // Debug log
    return expensesPlaceholder.expenses;
  });
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  
  // AWS sync states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'loading', 'syncing', 'success', 'error'
  
  // Admin credentials (hardcoded)
  const adminCredentials = {
    username: 'admin',
    password: '3enails2024'
  };

  // Categories specific to 3E Nails business
  const categories = {
    supplies: 'Nail Supplies',
    equipment: 'Equipment',
    marketing: 'Marketing',
    utilities: 'Utilities',
    maintenance: 'Maintenance',
    other: 'Other'
  };

  // Load expenses from DynamoDB on mount
  useEffect(() => {
    const savedAuthState = localStorage.getItem('cloudcents_auth');
    if (savedAuthState === 'true') {
      setIsAuthenticated(true);
      loadFromAWS();
    }
    
    const savedSyncTime = localStorage.getItem('cloudcents_last_sync');
    if (savedSyncTime) {
      setLastSyncTime(new Date(savedSyncTime));
    }
  }, []);

  // Save to localStorage whenever expenses change (backup)
  useEffect(() => {
    localStorage.setItem('cloudcents_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Load expenses from AWS DynamoDB
  const loadFromAWS = async () => {
    setIsLoading(true);
    setSyncStatus('loading');
    
    try {
      const response = await client.graphql({
        query: queries.listExpenses
      });
      const awsExpenses = response.data.listExpenses.items;
      
      if (awsExpenses && awsExpenses.length > 0) {
        setExpenses(awsExpenses);
      } else {
        setExpenses(expensesPlaceholder.expenses);
      }
      
      setSyncStatus('success');
      const syncTime = new Date();
      setLastSyncTime(syncTime);
      localStorage.setItem('cloudcents_last_sync', syncTime.toISOString());
      
    } catch (error) {
      console.error('Error loading from AWS:', error);
      setSyncStatus('error');
      setExpenses(expensesPlaceholder.expenses);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    if (loginForm.username === adminCredentials.username && 
        loginForm.password === adminCredentials.password) {
      setIsAuthenticated(true);
      localStorage.setItem('cloudcents_auth', 'true');
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      
      // Load from AWS after successful login
      await loadFromAWS();
    } else {
      setLoginError('Invalid username or password');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('cloudcents_auth');
    setEditingId(null);
    setSyncStatus('idle');
    setLastSyncTime(null);
  };

  // Show login modal
  const showLogin = () => {
    setShowLoginModal(true);
    setLoginError('');
    setLoginForm({ username: '', password: '' });
  };

  const addExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    
    const expense = {
      id: Date.now().toString(),
      ...newExpense,
      amount: parseFloat(newExpense.amount),
      createdAt: new Date().toISOString()
    };
    
    if (isAuthenticated) {
      try {
        await client.graphql({
          query: mutations.createExpense,
          variables: { input: expense }
        });
        await loadFromAWS();
      } catch (error) {
        console.error('Error adding expense to AWS:', error);
        setExpenses([expense, ...expenses]);
      }
    } else {
      setExpenses([expense, ...expenses]);
    }
    
    setNewExpense({
      description: '',
      amount: '',
      category: 'supplies',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const updateExpense = async (id, updatedExpense) => {
    if (isAuthenticated) {
      try {
        await client.graphql({
          query: mutations.updateExpense,
          variables: { id, input: updatedExpense }
        });
        await loadFromAWS();
      } catch (error) {
        console.error('Error updating expense in AWS:', error);
        setExpenses(expenses.map(expense => 
          expense.id === id ? { ...expense, ...updatedExpense } : expense
        ));
      }
    } else {
      setExpenses(expenses.map(expense => 
        expense.id === id ? { ...expense, ...updatedExpense } : expense
      ));
    }
    setEditingId(null);
  };

  const deleteExpense = async (id) => {
    if (isAuthenticated) {
      try {
        await client.graphql({
          query: mutations.deleteExpense,
          variables: { id }
        });
        await loadFromAWS();
      } catch (error) {
        console.error('Error deleting expense from AWS:', error);
        setExpenses(expenses.filter(expense => expense.id !== id));
      }
    } else {
      setExpenses(expenses.filter(expense => expense.id !== id));
    }
  };

  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    
    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(expense => expense.category === filter);
    }
    
    // Apply date filter
    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(expense => new Date(expense.date) >= startDate);
    }
    
    // Sort by date (most recent first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getCategorySummary = () => {
    const filteredExpenses = getFilteredExpenses();
    const summary = {};
    
    Object.keys(categories).forEach(cat => {
      summary[cat] = filteredExpenses
        .filter(expense => expense.category === cat)
        .reduce((total, expense) => total + expense.amount, 0);
    });
    
    return summary;
  };

  const getTotalExpenses = () => {
    return getFilteredExpenses().reduce((total, expense) => total + expense.amount, 0);
  };

  const exportToCSV = () => {
    const filteredExpenses = getFilteredExpenses();
    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount'],
      ...filteredExpenses.map(expense => [
        expense.date,
        expense.description,
        categories[expense.category],
        expense.amount.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3e-nails-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredExpenses = getFilteredExpenses();
  const categorySummary = getCategorySummary();
  const totalExpenses = getTotalExpenses();

  // Add this state for editing
  const [editExpense, setEditExpense] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    date: ''
  });

  // Add these handler functions after your existing functions
  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditExpense({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date
    });
  };

  const handleUpdate = () => {
    const updatedExpense = {
      description: editExpense.description,
      amount: parseFloat(editExpense.amount),
      category: editExpense.category,
      date: editExpense.date
    };
    
    updateExpense(editingId, updatedExpense);
  };

  return (
    <div className="app-container">
      <div className="main-wrapper">
        {/* Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-icon">
                  <Lock size={24} />
                </div>
                <h2 className="modal-title">Admin Login</h2>
                <p className="modal-subtitle">Enter admin credentials to manage expenses</p>
              </div>
              
              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                    className="form-input"
                    placeholder="Enter username"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="form-input"
                    placeholder="Enter password"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="error-message">
                    {loginError}
                  </div>
                )}
                
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="login-button"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <DollarSign className="logo-icon" size={24} />
            </div>
            <div className="header-text">
              <h1 className="app-title">CloudCents</h1>
              <p className="app-subtitle">3E Nails Budget Tracker</p>
            </div>
            
            {/* Sync Status for authenticated users */}
            {isAuthenticated && (
              <div style={{ 
                position: 'absolute', 
                right: '280px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}>
                {lastSyncTime && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
                    Last sync: {lastSyncTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            
            {/* Auth Controls */}
            <div className="auth-controls">
              {isAuthenticated ? (
                <div className="auth-info">
                  <button
                    onClick={handleLogout}
                    className="logout-button"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="guest-info">
                  <button
                    onClick={showLogin}
                    className="login-trigger-button"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guest Notice */}
        {!isAuthenticated && (
          <div className="guest-notice">
            <Lock size={20} />
            <span>You must login as <strong>Admin</strong> to modify.</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-header">
              <DollarSign className="icon-green" size={24} />
              <h3 className="card-title">Total Expenses</h3>
            </div>
            <p className="summary-amount">₱{totalExpenses.toFixed(2)}</p>
            <p className="summary-subtitle">Current period</p>
          </div>
          
          <div className="summary-card">
            <div className="card-header">
              <TrendingUp className="icon-blue" size={24} />
              <h3 className="card-title">Transactions</h3>
            </div>
            <p className="summary-amount">{filteredExpenses.length}</p>
            <p className="summary-subtitle">Recorded entries</p>
          </div>
          
          <div className="summary-card">
            <div className="card-header">
              <Calendar className="icon-purple" size={24} />
              <h3 className="card-title">Top Category</h3>
            </div>
            <p className="top-category">
              {Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0]?.[0] 
                ? categories[Object.entries(categorySummary).sort((a, b) => b[1] - a[1])[0][0]]
                : 'No data'}
            </p>
            <p className="summary-subtitle">Highest spending</p>
          </div>
        </div>

        {/* Controls */}
        {isAuthenticated && (
          <div className="controls-section">
            <div className="form-row">
              {/* Add Expense Form */}
              <div className="form-group flex-grow">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="e.g., Nail polish supplies"
                  className="form-input"
                />
              </div>
              
              <div className="form-group amount-input">
                <label className="form-label">Amount (₱)</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                  className="form-input"
                />
              </div>
              
              <div className="form-group category-input">
                <label className="form-label">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="form-select"
                >
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group date-input">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <button
                onClick={addExpense}
                className="add-button"
                disabled={isSyncing}
                style={{ opacity: isSyncing ? 0.6 : 1 }}
              >
                <PlusCircle size={20} />
                Add
              </button>
            </div>
          </div>
        )}

        <div className="content-grid">
          {/* Filters and Actions */}
          <div className="sidebar">
            <div className="filters-card">
              <h3 className="section-title">Filters & Actions</h3>
              
              <div className="filter-controls">
                <div className="filter-group">
                  <label className="form-label">Time Period</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last 3 Months</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label className="form-label">Category</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(categories).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="action-buttons">
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={exportToCSV}
                        className="export-button"
                      >
                        <Download size={16} />
                        Export CSV
                      </button>
                    </>
                  ) : (
                    <div className="guest-actions">
                      <p className="guest-message">Login as admin to export data and sync with AWS DynamoDB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Summary */}
            <div className="category-summary">
              <h3 className="section-title">Category Breakdown</h3>
              <div className="category-list">
                {Object.entries(categorySummary).map(([category, amount]) => (
                  <div key={category} className="category-item">
                    <span className="category-name">{categories[category]}</span>
                    <span className="category-amount">₱{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expense List */}
          <div className="expense-list-section">
            <div className="expense-list-card">
              <h3 className="section-title">Recent Expenses</h3>
              
              {filteredExpenses && filteredExpenses.length > 0 ? (
                <div className="expense-list">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="expense-item">
                      <div className="expense-details">
                        <div className="expense-info">
                          <p className="expense-description">{expense.description}</p>
                          <div className="expense-meta">
                            <span className="expense-category">
                              {categories[expense.category]}
                            </span>
                            <span className="expense-date">{expense.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="expense-actions">
                        <span className="expense-amount">₱{expense.amount.toFixed(2)}</span>
                        {isAuthenticated && (
                          <div className="action-buttons-row">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="edit-button"
                              title="Edit expense"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this expense?')) {
                                  deleteExpense(expense.id);
                                }
                              }}
                              className="delete-button"
                              title="Delete expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <DollarSign size={48} className="empty-icon" />
                  <p className="empty-title">No expenses recorded yet</p>
                  <p className="empty-subtitle">
                    {isAuthenticated 
                      ? "Start tracking your expenses above" 
                      : "Login as admin to start adding expenses"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingId && (
          <div className="edit-modal-overlay">
            <div className="edit-modal-content">
              <div className="edit-modal-header">
                <h2 className="edit-modal-title">Edit Expense</h2>
              </div>
              
              <div className="edit-form-group">
                <label className="edit-form-label">Description</label>
                <input
                  type="text"
                  value={editExpense.description}
                  onChange={(e) => setEditExpense({...editExpense, description: e.target.value})}
                  className="edit-form-input"
                />
              </div>
              
              <div className="edit-form-group">
                <label className="edit-form-label">Amount (₱)</label>
                <input
                  type="number"
                  value={editExpense.amount}
                  onChange={(e) => setEditExpense({...editExpense, amount: e.target.value})}
                  step="0.01"
                  className="edit-form-input"
                />
              </div>
              
              <div className="edit-form-group">
                <label className="edit-form-label">Category</label>
                <select
                  value={editExpense.category}
                  onChange={(e) => setEditExpense({...editExpense, category: e.target.value})}
                  className="edit-form-select"
                >
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div className="edit-form-group">
                <label className="edit-form-label">Date</label>
                <input
                  type="date"
                  value={editExpense.date}
                  onChange={(e) => setEditExpense({...editExpense, date: e.target.value})}
                  className="edit-form-input"
                />
              </div>
              
              <div className="edit-modal-actions">
                <button
                  onClick={() => setEditingId(null)}
                  className="edit-cancel-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="edit-save-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Add CSS animation for spinning */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CloudCentsBudgetTracker;