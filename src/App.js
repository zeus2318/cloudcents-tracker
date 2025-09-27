import React, { useState, useEffect } from 'react';
import { PlusCircle, DollarSign, TrendingUp, Calendar, Download, Trash2, Edit3, User, LogOut, Lock, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import awsconfig from './aws-exports.js'; // or ./aws-exports.js if you prefer
import * as queries from './graphql/queries.js';
import * as mutations from './graphql/mutations.js';
import './App.css';

// Initialize Amplify and API client
Amplify.configure(awsconfig); //will be temporarily remove for local testing
const client = generateClient();

const CloudCentsBudgetTracker = () => {
  const [expenses, setExpenses] = useState([]);
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
  
  // Form validation and enhancement states
  const [formErrors, setFormErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // FIXED: Load expenses from AWS DynamoDB
  const loadFromAWS = async () => {
    setIsLoading(true);
    setSyncStatus('loading');
    
    try {
      console.log('Loading expenses from DynamoDB...');
      
      const response = await client.graphql({
        query: queries.listExpenses
      });
      
      console.log('DynamoDB response:', response);
      
      const awsExpenses = response.data.listExpenses.items;
      
      // FIXED: Actually set the expenses instead of clearing them
      if (awsExpenses && awsExpenses.length > 0) {
        console.log('Found expenses in DynamoDB:', awsExpenses.length);
        setExpenses(awsExpenses);
      } else {
        console.log('No expenses found in DynamoDB');
        setExpenses([]);
      }
      
      setSyncStatus('success');
      const syncTime = new Date();
      setLastSyncTime(syncTime);
      localStorage.setItem('cloudcents_last_sync', syncTime.toISOString());
      
    } catch (error) {
      console.error('Error loading from AWS:', error);
      setSyncStatus('error');
      
      // Fallback to localStorage if AWS fails
      const savedExpenses = localStorage.getItem('cloudcents_expenses');
      if (savedExpenses) {
        try {
          setExpenses(JSON.parse(savedExpenses));
        } catch (parseError) {
          console.error('Error parsing saved expenses:', parseError);
          setExpenses([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Form validation functions
  const validateExpenseForm = () => {
    const errors = {};
    
    if (!newExpense.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!newExpense.amount) {
      errors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
      if (amount > 100000) {
        errors.amount = 'Amount seems to large. Please verify.';
      }
    }
    
    if (!newExpense.date) {
      errors.date = 'Date is required';
    } else if (new Date(newExpense.date) > new Date()) {
      errors.date = 'Date cannot be in the future';
    }
    
    return errors;
  };

  // Auto-complete suggestions
  const getDescriptionSuggestions = (input) => {
    const commonExpenses = {
      supplies: [
        'Nail polish bottles',
        'Acrylic powder',
        'Nail files and buffers',
        'UV/LED lamp bulbs',
        'Cuticle oil',
        'Base and top coat',
        'Nail art supplies',
        'Cotton pads and swabs'
      ],
      equipment: [
        'UV/LED nail lamp',
        'Nail drill machine',
        'Sterilizer equipment',
        'Manicure table',
        'Client chairs',
        'Storage cabinets'
      ],
      marketing: [
        'Social media ads',
        'Business cards',
        'Flyers and posters',
        'Website maintenance',
        'Photography session'
      ],
      utilities: [
        'Electricity bill',
        'Water bill',
        'Internet service',
        'Phone service'
      ],
      maintenance: [
        'Equipment repair',
        'Cleaning supplies',
        'Air conditioning service',
        'Plumbing repairs'
      ]
    };

    const categoryExpenses = commonExpenses[newExpense.category] || [];
    return categoryExpenses.filter(expense => 
      expense.toLowerCase().includes(input.toLowerCase())
    );
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

  // Form utility functions
  const clearForm = () => {
    setNewExpense({
      description: '',
      amount: '',
      category: 'supplies',
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setShowSuggestions(false);
  };

  const copyLastExpense = () => {
    if (expenses.length > 0) {
      const lastExpense = expenses[0];
      setNewExpense({
        description: lastExpense.description,
        amount: lastExpense.amount.toString(),
        category: lastExpense.category,
        date: new Date().toISOString().split('T')[0] // Use today's date
      });
    }
  };

  const setQuickAmount = (amount) => {
    setNewExpense({...newExpense, amount: amount.toString()});
  };

  // ENHANCED: Add expense with proper DynamoDB integration
const addExpense = async () => {
  const errors = validateExpenseForm();
  setFormErrors(errors);
  if (Object.keys(errors).length > 0) return;

  // Only include schema fields
  const expenseData = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: newExpense.description.trim(),
    amount: parseFloat(newExpense.amount),
    category: newExpense.category,
    date: newExpense.date,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    if (isAuthenticated) {
      await client.graphql({
        query: mutations.createExpense,
        variables: { input: expenseData }
      });
      await loadFromAWS();
    } else {
      setExpenses([expenseData, ...expenses]);
    }
    clearForm();
  } catch (error) {
    console.error("Error adding expense:", error);
    setExpenses([expenseData, ...expenses]); // fallback
  }
};


const updateExpense = async (id, updatedExpense) => {
  const expenseInput = {
    id,
    description: updatedExpense.description,
    amount: parseFloat(updatedExpense.amount),
    category: updatedExpense.category,
    date: updatedExpense.date,
    updatedAt: new Date().toISOString()
  };

  try {
    if (isAuthenticated) {
      await client.graphql({
        query: mutations.updateExpense,
        variables: { input: expenseInput }
      });
      await loadFromAWS();
    } else {
      setExpenses(expenses.map(exp => exp.id === id ? { ...exp, ...expenseInput } : exp));
    }
  } catch (error) {
    console.error("Error updating expense:", error);
    setExpenses(expenses.map(exp => exp.id === id ? { ...exp, ...expenseInput } : exp));
  }
  setEditingId(null);
};


const deleteExpense = async (id) => {
  try {
    if (isAuthenticated) {
      await client.graphql({
        query: mutations.deleteExpense,
        variables: { input: { id } }
      });
      await loadFromAWS();
    } else {
      setExpenses(expenses.filter(exp => exp.id !== id));
    }
  } catch (error) {
    console.error("Error deleting expense:", error);
    setExpenses(expenses.filter(exp => exp.id !== id));
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

  // Edit expense states and functions
  const [editExpense, setEditExpense] = useState({
    description: '',
    amount: '',
    category: 'supplies',
    date: ''
  });

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

  // Handle Enter key submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addExpense();
    }
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
                {syncStatus === 'loading' && <RefreshCw className="spin" size={16} />}
                {syncStatus === 'success' && <Cloud size={16} color="#10b981" />}
                {syncStatus === 'error' && <CloudOff size={16} color="#ef4444" />}
                
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

        {/* Enhanced Add Expense Form */}
        {isAuthenticated && (
          <div className="controls-section">
            <div className="form-row">
              {/* Description with auto-complete */}
              <div className="form-group flex-grow">
                <label className="form-label">
                  Description
                  {formErrors.description && <span className="error-text"> *</span>}
                </label>
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => {
                      setNewExpense({...newExpense, description: e.target.value});
                      const suggestions = getDescriptionSuggestions(e.target.value);
                      setSuggestions(suggestions);
                      setShowSuggestions(suggestions.length > 0 && e.target.value.length > 0);
                      if (formErrors.description) {
                        setFormErrors({...formErrors, description: ''});
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="e.g., Nail polish supplies"
                    className={`form-input ${formErrors.description ? 'error' : ''}`}
                  />
                  
                  {/* Auto-complete dropdown */}
                  {showSuggestions && (
                    <div className="suggestions-dropdown">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="suggestion-item"
                          onClick={() => {
                            setNewExpense({...newExpense, description: suggestion});
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formErrors.description && (
                  <span className="error-message">{formErrors.description}</span>
                )}
              </div>
              
              {/* Amount input */}
              <div className="form-group amount-input">
                <label className="form-label">
                  Amount (₱)
                  {formErrors.amount && <span className="error-text"> *</span>}
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => {
                    setNewExpense({...newExpense, amount: e.target.value});
                    if (formErrors.amount) {
                      setFormErrors({...formErrors, amount: ''});
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="0.00"
                  step="0.01"
                  className={`form-input ${formErrors.amount ? 'error' : ''}`}
                />
                
                {formErrors.amount && (
                  <span className="error-message">{formErrors.amount}</span>
                )}
              </div>
              
              {/* Category selection */}
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
              
              {/* Date input */}
              <div className="form-group date-input">
                <label className="form-label">
                  Date
                  {formErrors.date && <span className="error-text"> *</span>}
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => {
                    setNewExpense({...newExpense, date: e.target.value});
                    if (formErrors.date) {
                      setFormErrors({...formErrors, date: ''});
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className={`form-input ${formErrors.date ? 'error' : ''}`}
                />
                
                {formErrors.date && (
                  <span className="error-message">{formErrors.date}</span>
                )}
              </div>
              
              {/* Enhanced submit button */}
              <div className="submit-buttons">
                <button
                  onClick={addExpense}
                  className="add-button"
                  disabled={isSubmitting || isSyncing}
                  style={{ opacity: (isSubmitting || isSyncing) ? 0.6 : 1 }}
                >
                  <PlusCircle size={20} />
                  {isSubmitting ? 'Adding...' : 'Add to DynamoDB'}
                </button>
              </div>
            </div>
            
            {/* Form summary */}
            <div className="form-summary">
              {syncStatus === 'error' && (
                <span style={{ color: '#ef4444', marginLeft: '20px' }}>
                  ⚠️ Sync failed - data saved locally
                </span>
              )}
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
                      <button
                        onClick={loadFromAWS}
                        className="sync-button"
                        disabled={isSyncing}
                      >
                        <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync AWS'}
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
              <div className="expense-list-header">
                <h3 className="section-title">Recent Expenses</h3>
                {isLoading && (
                  <div className="loading-indicator">
                    <RefreshCw size={16} className="spin" />
                    Loading from DynamoDB...
                  </div>
                )}
              </div>
              
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
                            {expense.createdAt && (
                              <span className="expense-timestamp">
                                Added: {new Date(expense.createdAt).toLocaleDateString()}
                              </span>
                            )}
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
                  <p className="empty-title">
                    {isLoading ? 'Loading expenses...' : 'No expenses recorded yet'}
                  </p>
                  <p className="empty-subtitle">
                    {isLoading 
                      ? 'Fetching data from DynamoDB...'
                      : isAuthenticated 
                      ? "Start tracking your expenses above" 
                      : "Login as admin to start adding expenses"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
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
    </div>
  );
};

export default CloudCentsBudgetTracker;