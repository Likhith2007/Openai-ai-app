import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io as createSocket } from 'socket.io-client';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  LayoutDashboard,
  Send,
  Loader,
  Sparkles,
  User,
  Bot,
  BellRing,
  IndianRupee,
  Plus,
  Calendar,
  Activity
} from 'lucide-react';

// Razorpay Global Type
declare global {
  interface Window { Razorpay: any; }
}

// --- TYPES ---
interface Payment {
  id: string;
  amount: number;
  status: 'captured' | 'failed' | 'created';
  created_at: number;
  method: string;
  email: string;
  contact: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface LoanReminder {
  id?: string;
  name: string;
  dueDate: string;
  amount: number;
}


// --- API HELPER ---
const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`http://localhost:3000/api${endpoint}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  post: async (endpoint: string, body: object) => {
    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }
};


// --- MAIN APP COMPONENT ---
const App = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pay' | 'ai' | 'loans'>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <PaymentDashboard />;
      case 'pay':
        return <PaymentInterface />;
      case 'ai':
        return <AiAssistant />;
      case 'loans':
        return <LoanReminders />;
      default:
        return <PaymentDashboard />;
    }
  };

  const NavItem = ({ tabName, icon: Icon, label }: { tabName: 'dashboard' | 'pay' | 'ai' | 'loans', icon: React.ElementType, label: string }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-all duration-200 ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white p-4 border-r border-gray-200 flex flex-col space-y-4">
        <div className="flex items-center space-x-2 p-2 mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Money AI</h1>
        </div>
        <nav className="flex-grow space-y-2">
          <NavItem tabName="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem tabName="pay" icon={CreditCard} label="Make Payment" />
          <NavItem tabName="loans" icon={BellRing} label="Loan Reminders" />
          <NavItem tabName="ai" icon={MessageSquare} label="AI Assistant" />
        </nav>
        <div className="text-center text-xs text-gray-400 p-4">
          <p>&copy; {new Date().getFullYear()} Money AI Inc.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};


// --- MOCK DATABASE ---
const mockPayments: Payment[] = [
    { id: 'pay_OgbHe2b93Y2fCq', amount: 2000, status: 'captured', created_at: 1723469882, method: 'Card', email: 'customer1@example.com', contact: '9999999999' },
    { id: 'pay_OgbHe2c98Y2dDr', amount: 1500, status: 'captured', created_at: 1723469582, method: 'UPI', email: 'user2@test.dev', contact: '9999999999' },
    { id: 'pay_OgbHe2d99Y2eEs', amount: 3500, status: 'failed', created_at: 1723469282, method: 'Card', email: 'contact@acme.inc', contact: '9999999999' },
    { id: 'pay_OgbHe2e90Y2fFt', amount: 500, status: 'created', created_at: 1723468982, method: 'Card', email: 'new.customer@web.com', contact: '9999999999' },
    { id: 'pay_OgbHe2f91Y2gGu', amount: 8000, status: 'captured', created_at: 1723468682, method: 'UPI', email: 'another.user@mail.io', contact: '9999999999' },
];

const mockLoans: LoanReminder[] = [
    { id: 'loan_1', name: 'Home Loan', amount: 25000, dueDate: '2025-09-30' },
    { id: 'loan_2', name: 'Car EMI', amount: 12000, dueDate: '2025-10-15' },
];


// --- AI ASSISTANT COMPONENT ---
const AiAssistant = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const processedResponse = await processAiQuery(currentInput);
            if (processedResponse) {
                setMessages(prev => [...prev, { role: 'model', text: processedResponse }]);
            } else {
                const responseData = await api.post('/openai/chat', { prompt: currentInput });
                const modelResponse = responseData.choices[0].message.content;
                const modelMessage: ChatMessage = { role: 'model', text: modelResponse };
                setMessages(prev => [...prev, modelMessage]);
            }
        } catch (error) {
            console.error("Error communicating with AI:", error);
            const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I'm having trouble connecting to the AI. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const processAiQuery = async (query: string): Promise<string | null> => {
      const lowerCaseQuery = query.toLowerCase();

      // Check for keywords for balance or total payments
      if (lowerCaseQuery.includes('balance') || lowerCaseQuery.includes('total payments')) {
        const totalRevenue = mockPayments
          .filter(p => p.status === 'captured')
          .reduce((sum, p) => sum + p.amount, 0);
        return `Your total captured payments amount to ₹${(totalRevenue / 100).toLocaleString()}.`;
      }

      // Check for keywords for failed payments
      if (lowerCaseQuery.includes('failed payments')) {
        const failedPayments = mockPayments.filter(p => p.status === 'failed').length;
        return `You have had ${failedPayments} payments that failed.`;
      }

      // Check for keywords for upcoming loans
      if (lowerCaseQuery.includes('upcoming loans') || lowerCaseQuery.includes('loan reminder')) {
        if (mockLoans.length === 0) {
          return "You don't have any upcoming loan reminders. You can add one in the 'Loan Reminders' tab.";
        }
        const loansList = mockLoans.map(loan => {
          return `- ${loan.name}: ₹${loan.amount.toLocaleString()} due on ${loan.dueDate}`;
        });
        return `Here are your upcoming loan reminders:\n${loansList.join('\n')}`;
      }
      
      // Check for specific transactions by name (simple keyword search)
      if (lowerCaseQuery.includes('paid to')) {
          const recipient = lowerCaseQuery.split('paid to')[1]?.trim();
          if (!recipient) {
              return "Please specify who you paid. For example: 'how much did i paid to new.customer@web.com?'";
          }
          
          const transactionsFound = mockPayments.filter(p => p.email.toLowerCase().includes(recipient) || p.contact.toLowerCase().includes(recipient));
          
          if(transactionsFound.length > 0) {
              const transactionsList = transactionsFound.map(p => 
                  `- ID: ${p.id}, Amount: ₹${p.amount / 100}, Status: ${p.status}, Paid To: ${p.email}`
              );
              return `Here are the transactions found for "${recipient}":\n${transactionsList.join('\n')}`;
          } else {
              return `I couldn't find any payments to "${recipient}".`;
          }
      }

      return null;
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Sparkles className="w-6 h-6 text-blue-600 mr-3" />
                    AI Financial Assistant
                </h2>
                <p className="text-gray-600 mt-1">Ask me about your transactions, revenue, or payments!</p>
            </div>
            <div className="flex-grow p-6 overflow-y-auto">
                <div className="space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                    <Bot className="w-6 h-6 text-blue-600" />
                                </div>
                            )}
                            <div className={`max-w-lg p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                                    <User className="w-6 h-6 text-gray-600" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                                <Bot className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="max-w-lg p-4 rounded-2xl bg-gray-100 text-gray-800">
                                <Loader className="w-5 h-5 animate-spin text-blue-600" />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., How much did I pay to new.customer@web.com?"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-5 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- LOAN REMINDERS COMPONENT ---
const LoanReminders = () => {
    const [loans, setLoans] = useState<LoanReminder[]>([
      { id: 'loan_1', name: 'Home Loan', amount: 25000, dueDate: '2025-09-30' },
      { id: 'loan_2', name: 'Car EMI', amount: 12000, dueDate: '2025-10-15' },
    ]);
    const [loanName, setLoanName] = useState('');
    const [loanAmount, setLoanAmount] = useState('');
    const [loanDate, setLoanDate] = useState('');

    const handleAddLoan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loanName || !loanAmount || !loanDate) return;
        const newLoan = {
            id: `loan_${Date.now()}`,
            name: loanName,
            amount: parseFloat(loanAmount),
            dueDate: loanDate
        };
        setLoans(prevLoans => [...prevLoans, newLoan]);
        setLoanName('');
        setLoanAmount('');
        setLoanDate('');
    };

    const handleRemoveLoan = (id: string) => {
        setLoans(prevLoans => prevLoans.filter(loan => loan.id !== id));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Reminders</h1>
            <p className="text-gray-600 mb-6">Your personal space for managing loan payments.</p>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add a New Reminder</h2>
                <form onSubmit={handleAddLoan} className="space-y-4">
                    <input
                        type="text"
                        value={loanName}
                        onChange={(e) => setLoanName(e.target.value)}
                        placeholder="Loan Name (e.g., Home Loan, Car EMI)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(e.target.value)}
                            placeholder="Amount (₹)"
                            min="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <input
                            type="date"
                            value={loanDate}
                            onChange={(e) => setLoanDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!loanName || !loanAmount || !loanDate}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Reminder</span>
                    </button>
                </form>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Payments</h2>
                <div className="space-y-4">
                    {loans.length > 0 ? loans.map((loan) => (
                        <div key={loan.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <div className="flex items-center space-x-4">
                                <BellRing className="w-6 h-6 text-yellow-600" />
                                <div>
                                    <p className="font-medium text-gray-900">{loan.name}</p>
                                    <p className="text-sm text-gray-600 flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{loan.dueDate}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex items-center space-x-4">
                                <p className="font-semibold text-gray-900 flex items-center space-x-1">
                                    <IndianRupee className="w-4 h-4" />
                                    <span>{loan.amount.toLocaleString()}</span>
                                </p>
                                <button onClick={() => handleRemoveLoan(loan.id!)} className="text-red-500 hover:text-red-700 transition-colors">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )) : (
                      <p className="text-center text-gray-500">No loan reminders set. Add one above!</p>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- PAYMENT DASHBOARD COMPONENT ---
const PaymentDashboard = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, successfulPayments: 0, failedPayments: 0, pendingPayments: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // This is a local state polling mechanism to simulate real-time updates.
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await api.get('/razorpay/payments');
        setPayments(data.items || []);
      } catch (error) {
        console.error("Failed to fetch payments:", error);
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
    const intervalId = setInterval(fetchPayments, 10000); // Poll every 10 seconds for new payments

    // websocket for instant updates
    const socket = createSocket('http://localhost:3000', { transports: ['websocket'] });
    socket.on('connect', () => {
      // no-op
    });
    socket.on('payment:verified', () => {
      // immediately refresh on verified payment
      fetchPayments();
    });
    socket.on('disconnect', () => {
      // no-op
    });

    return () => {
      clearInterval(intervalId);
      try { socket.disconnect(); } catch {}
    };
  }, []);

  useEffect(() => {
    const totalRevenue = payments
      .filter(p => p.status === 'captured')
      .reduce((sum, p) => sum + p.amount / 100, 0);
    
    const successfulPayments = payments.filter(p => p.status === 'captured').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const pendingPayments = payments.filter(p => p.status === 'created').length;

    setStats({ totalRevenue, successfulPayments, failedPayments, pendingPayments });
  }, [payments]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'captured': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'created': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'created': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-600 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Dashboard</h1>
        <p className="text-gray-600">Real-time payment monitoring and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="bg-green-100 text-green-600" />
        <StatCard title="Successful" value={stats.successfulPayments} icon={CheckCircle} color="bg-blue-100 text-blue-600" />
        <StatCard title="Pending" value={stats.pendingPayments} icon={Clock} color="bg-yellow-100 text-yellow-600" />
        <StatCard title="Failed" value={stats.failedPayments} icon={XCircle} color="bg-red-100 text-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {payments.length > 0 ? payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.email || 'No Email'}</p>
                      <p className="text-sm text-gray-600">{payment.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{payment.amount / 100}</p>
                    <p className="text-xs text-gray-500">{new Date(payment.created_at * 1000).toLocaleString()}</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500">No transactions found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// --- PAYMENT INTERFACE COMPONENT ---
const PaymentInterface = () => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
    const [paymentDetails, setPaymentDetails] = useState<any>(null);

    const handlePayment = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            console.error('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setPaymentStatus('processing');

        try {
            const orderData = await api.post('/razorpay/create-order', {
                amount: parseFloat(amount),
            });

            if (!orderData.success) throw new Error(orderData.error);
            
            const options = {
                key: orderData.key_id,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Money AI',
                description: 'Financial Services Payment',
                order_id: orderData.order.id,
                handler: async function (response: any) {
                    try {
                        const verifyData = await api.post('/razorpay/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyData.success) {
                            setPaymentStatus('success');
                            setPaymentDetails(response);
                        } else {
                            setPaymentStatus('failed');
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        setPaymentStatus('failed');
                    }
                },
                prefill: { name: 'Test User', email: 'test.user@example.com', contact: '9999999999' },
                theme: { color: '#3b82f6' },
                modal: {
                    ondismiss: function() {
                        if (paymentStatus === 'processing') {
                            setPaymentStatus('idle');
                        }
                        setLoading(false);
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();

        } catch (error) {
            console.error('Payment initiation error:', error);
            setPaymentStatus('failed');
        } finally {
            // setLoading(false) is handled by modal ondismiss or handler
        }
    };
    
    const resetPayment = () => {
        setPaymentStatus('idle');
        setPaymentDetails(null);
        setAmount('');
        setLoading(false);
    };

    const StatusDisplay = ({ status, icon: Icon, title, message, buttonText, onButtonClick, buttonColor }: any) => (
        <div className="text-center space-y-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 bg-${buttonColor}-100 rounded-full`}>
                <Icon className={`w-10 h-10 text-${buttonColor}-600 ${status === 'processing' ? 'animate-spin' : ''}`} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600">{message}</p>
            {onButtonClick && (
                <button onClick={onButtonClick} className={`w-full bg-${buttonColor}-600 hover:bg-${buttonColor}-700 text-white font-medium py-3 px-4 rounded-lg transition-colors`}>
                    {buttonText}
                </button>
            )}
            {status === 'success' && paymentDetails && (
                <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 border">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Payment ID:</span>
                        <span className="font-medium text-gray-900 font-mono text-xs">{paymentDetails.razorpay_payment_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium text-gray-900">₹{amount}</span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex items-center justify-center h-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200">
                {paymentStatus === 'idle' && (
                    <div className="space-y-6">
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold text-gray-900">Secure Payment</h1>
                            <p className="text-gray-600">Powered by Razorpay</p>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                min="1"
                            />
                        </div>
                        <button
                            onClick={handlePayment}
                            disabled={loading || !amount}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                        >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                            <span>{loading ? 'Processing...' : 'Pay Now'}</span>
                        </button>
                    </div>
                )}
                {paymentStatus === 'processing' && <StatusDisplay status="processing" icon={Loader} title="Processing Payment" message="Please wait, do not close this window." buttonColor="blue" />}
                {paymentStatus === 'success' && <StatusDisplay status="success" icon={CheckCircle} title="Payment Successful!" message="Thank you for your payment." buttonText="Make Another Payment" onButtonClick={resetPayment} buttonColor="green" />}
                {paymentStatus === 'failed' && <StatusDisplay status="failed" icon={XCircle} title="Payment Failed" message="Something went wrong. Please try again." buttonText="Try Again" onButtonClick={resetPayment} buttonColor="red" />}
            </div>
        </div>
    );
};

export default App;

