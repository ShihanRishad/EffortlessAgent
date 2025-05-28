import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageSquare, Settings, User, Menu, X, Mail, RefreshCw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';

const GmailAgentUI = () => {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hi! I\'m your AI Agent. I can help you:\n\n• Write and send emails\n• Reply to messages\n• Search your inbox\n• Summarize conversations\n\nJust tell me what you need!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [emailContext, setEmailContext] = useState([]);
  const [conversations, setConversations] = useState([
    { 
      id: 'gmail',
      title: 'Gmail',
      icon: 'Mail',
      active: true,
      description: 'Manage your emails',
      enabled: true
    },
    { 
      id: 'twitter',
      title: 'Twitter',
      icon: 'MessageSquare',
      active: false,
      description: 'Coming soon',
      enabled: false
    },
    { 
      id: 'linkedin',
      title: 'LinkedIn',
      icon: 'User',
      active: false,
      description: 'Coming soon',
      enabled: false
    }
  ]);
  const [mounted, setMounted] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [lastWelcomeTime, setLastWelcomeTime] = useState(null);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState({
    emailsSent: 0,
    lastActive: null,
    totalInteractions: 0
  });
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const quickPrompts = {
    mobile: [
      "Show unread emails",
      "Draft a reply",
      "Search inbox"
    ],
    desktop: [
      "Is there any Job related email?",
      "Send email to support@openai.com",
      "Draft a response to the latest email"
    ]
  };

  const handleQuickPrompt = (prompt) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  // Logo components
  const logos = {
    gmail: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    )
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    if (!mounted) return '';
    
    const hours = timestamp.getHours();
    const minutes = timestamp.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const connectGmail = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { 
        callbackUrl: window.location.origin,
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session) {
      setGmailConnected(true);
      loadEmails();
    } else {
      setGmailConnected(false);
      setEmailContext([]);
      setHasShownWelcome(false);
      setLastWelcomeTime(null);
    }
  }, [session, status, mounted]);

  const loadEmails = async () => {
    try {
      const response = await fetch('/api/gmail/messages?maxResults=10');
      const data = await response.json();
      
      if (data.messages) {
        const sortedMessages = data.messages.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setEmailContext(sortedMessages);
        const unreadCount = sortedMessages.filter(email => email.unread).length;
        
        const now = Date.now();
        const shouldShowWelcome = !hasShownWelcome || 
          (lastWelcomeTime && (now - lastWelcomeTime) > 10 * 60 * 1000);
        
        if (shouldShowWelcome) {
          const connectionMessage = {
            id: Date.now(),
            type: 'assistant',
            content: `Connected to Gmail! You have ${unreadCount} unread emails. How can I help you today?`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, connectionMessage]);
          setHasShownWelcome(true);
          setLastWelcomeTime(now);
        }
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      if (!gmailConnected) {
        const aiResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          content: 'I need to connect to your Gmail first to help you with email-related tasks. Would you like me to connect now? Click the "Connect Gmail" button to get started.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
        return;
      }

      // Check if this is a new email request
      const emailMatch = currentInput.match(/send.*email.*to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch) {
        const toEmail = emailMatch[1];
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            action: 'send_email',
            to: toEmail,
            subject: 'New Message',
            body: currentInput.replace(/send.*email.*to\s+[^\s]+\s*/i, '').trim()
          }),
        });

        const data = await response.json();
        
        const aiResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.response || 'Email sent successfully!',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false);
        return;
      }

      // Handle other types of requests
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          action: 'analyze'
        }),
      });

      const data = await response.json();
      
      // Extract action from the request body or default to 'analyze'
      const action = data.action || 'analyze';
      
      // Only update email context and show cards for specific actions
      const shouldShowEmailCards = ['analyze', 'search'].includes(action) && 
                                  (currentInput.toLowerCase().includes('emails') || 
                                   currentInput.toLowerCase().includes('unread') ||
                                   currentInput.toLowerCase().includes('summary'));
      
      if (data.emailContext && shouldShowEmailCards) {
        setEmailContext(data.emailContext);
        setSelectedEmailIndex(0);
      }

      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
        emails: shouldShowEmailCards ? (data.emailContext || []) : []
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'I\'m sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    const newConv = {
      id: Date.now(),
      title: 'New Gmail Task',
      active: true
    };
    setConversations(prev => [
      newConv,
      ...prev.map(c => ({ ...c, active: false }))
    ]);
    setMessages([{
      id: 1,
      type: 'assistant',
      content: gmailConnected 
        ? 'Hello! I\'m your AI Agent. What would you like me to do?'
        : 'Hello! I\'m your AI Agent. Connect your Gmail account to get started.',
      timestamp: new Date()
    }]);
    setHasShownWelcome(false);
  };

  const selectConversation = (id) => {
    const conversation = conversations.find(c => c.id === id);
    if (!conversation?.enabled) return;
    
    setConversations(prev => prev.map(c => ({
      ...c,
      active: c.id === id
    })));
  };

  // Email card component
  const EmailCard = ({ email, index, total }) => {
    const formatEmailDate = (dateStr) => {
      if (!mounted) return '';
      try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
      } catch {
        return '';
      }
    };

    const getEmailDomain = (email) => {
      try {
        return email.split('@')[1];
      } catch {
        return '';
      }
    };

    const handleReply = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Draft a reply to this email',
            action: 'draft_response',
            emailId: email.id,
            originalEmail: {
              from: email.from,
              subject: email.subject,
              body: email.snippet
            }
          }),
        });

        const data = await response.json();
        
        if (data.response) {
          const replyMessage = {
            id: Date.now(),
            type: 'assistant',
            content: data.response,
            timestamp: new Date(),
            emails: [email],
            isDraft: true,
            draftData: {
              to: email.from,
              subject: `Re: ${email.subject}`,
              body: data.response
            }
          };
          setMessages(prev => [...prev, replyMessage]);
        }
      } catch (error) {
        console.error('Error drafting reply:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleAIDraft = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Help me compose a better response to this email',
            action: 'compose',
            emailId: email.id,
            originalEmail: {
              from: email.from,
              subject: email.subject,
              body: email.snippet
            }
          }),
        });

        const data = await response.json();
        
        if (data.response) {
          const draftMessage = {
            id: Date.now(),
            type: 'assistant',
            content: data.response,
            timestamp: new Date(),
            emails: [email],
            isDraft: true,
            draftData: {
              to: email.from,
              subject: `Re: ${email.subject}`,
              body: data.response
            }
          };
          setMessages(prev => [...prev, draftMessage]);
        }
      } catch (error) {
        console.error('Error drafting with AI:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 mb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {email.unread && <div className="w-2 h-2 bg-black rounded-full flex-shrink-0 mt-2"></div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {email.from.includes('@') ? email.from.split('@')[0] : email.from}
                </span>
                <span className="text-xs text-gray-500">
                  @{getEmailDomain(email.from)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {formatEmailDate(email.date)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{index + 1} of {total}</span>
          </div>
        </div>
        
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
            {email.subject}
          </h4>
          <p className="text-sm text-gray-600 line-clamp-3">
            {email.snippet}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {email.unread && (
              <span className="px-2 py-1 bg-black text-black text-xs rounded-full font-medium">
                Unread
              </span>
            )}
            {email.important && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                Important
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAIDraft}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              title="Let AI help compose a response"
            >
              <MessageSquare size={14} />
            </button>
            <button 
              onClick={handleReply}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              title="Quick reply"
            >
              <Send size={14} />
            </button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced message component
  const MessageComponent = ({ message }) => {
    const emails = message.emails || [];
    
    return (
      <div className={`mb-8 ${message.type === 'user' ? 'flex justify-end' : ''}`}>
        <div className={`flex gap-4 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            message.type === 'assistant' ? 'bg-black' : 'bg-gray-200'
          }`}>
            {message.type === 'assistant' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" className="text-white">
                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.022 4.347a18.452 18.452 0 0 0-1.93 1.686C1.248 8.877-.192 12.046.874 13.113c1.066 1.066 4.236-.375 7.079-3.218a18.452 18.452 0 0 0 1.686-1.931"/>
                  <path d="M9.639 7.964c1.677 2.226 2.36 4.32 1.532 5.148c-1.067 1.067-4.236-.374-7.08-3.217C1.249 7.05-.191 3.882.875 2.815c.828-.827 2.922-.144 5.148 1.532"/>
                  <path d="M5.522 7.964a.5.5 0 1 0 1 0a.5.5 0 0 0-1 0m2.51-4.354c-.315-.055-.315-.506 0-.56a2.843 2.843 0 0 0 2.29-2.193L10.34.77c.068-.31.51-.312.58-.003l.024.101a2.858 2.858 0 0 0 2.296 2.18c.316.055.316.509 0 .563a2.858 2.858 0 0 0-2.296 2.18l-.024.101c-.07.31-.512.308-.58-.002l-.02-.087A2.843 2.843 0 0 0 8.03 3.61Z"/>
                </g>
              </svg>
            ) : (
              <User size={14} className="text-gray-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`rounded-2xl px-4 py-3 ${
              message.type === 'user' 
                ? 'bg-black text-white' 
                : 'bg-[#f8f9fa] text-gray-900'
            }`}>
              <p className="whitespace-pre-wrap text-[15px] leading-6">{message.content}</p>
              <div className={`mt-1 text-xs ${message.type === 'user' ? 'text-black' : 'text-gray-500'}`}>
                {formatTime(message.timestamp)}
              </div>
              {message.isDraft && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleSendDraft(message.draftData)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black text-sm font-medium"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
            
            {/* Email cards for assistant messages */}
            {message.type === 'assistant' && emails.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-700">
                    Related Emails ({emails.length})
                  </h5>
                  {emails.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEmailIndex(Math.max(0, selectedEmailIndex - 1))}
                        disabled={selectedEmailIndex === 0}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setSelectedEmailIndex(Math.min(emails.length - 1, selectedEmailIndex + 1))}
                        disabled={selectedEmailIndex === emails.length - 1}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {emails[selectedEmailIndex] && (
                  <EmailCard 
                    email={emails[selectedEmailIndex]} 
                    index={selectedEmailIndex}
                    total={emails.length}
                  />
                )}
                
                {emails.length > 1 && (
                  <div className="flex justify-center mt-2">
                    <div className="flex gap-1">
                      {emails.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedEmailIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === selectedEmailIndex ? 'bg-black' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    const conversationsToStore = conversations.map(({ id, title, icon, active, description, enabled }) => ({
      id, title, icon, active, description, enabled
    }));
    localStorage.setItem('conversations', JSON.stringify(conversationsToStore));
  }, [conversations]);

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('agentStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('agentStats', JSON.stringify(stats));
  }, [stats]);

  const updateStats = (type) => {
    setStats(prev => {
      const newStats = {
        ...prev,
        lastActive: new Date().toISOString(),
        totalInteractions: prev.totalInteractions + 1
      };
      if (type === 'email') {
        newStats.emailsSent = prev.emailsSent + 1;
      }
      return newStats;
    });
  };

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'Mail':
        return <Mail size={18} />;
      case 'MessageSquare':
        return <MessageSquare size={18} />;
      case 'User':
        return <User size={18} />;
      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen bg-white items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white" data-theme="light">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-4 z-30">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-3 ml-4">
          {conversations.find(c => c.active) && (
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <div className={`${
                conversations.find(c => c.active)?.id === 'gmail' ? 'text-red-500' :
                conversations.find(c => c.active)?.id === 'twitter' ? 'text-black' :
                conversations.find(c => c.active)?.id === 'linkedin' ? 'text-black' : ''
              }`}>
                {logos[conversations.find(c => c.active)?.id]}
              </div>
            </div>
          )}
          <h1 className="text-lg font-medium text-gray-900">
            {showProfile ? 'Profile' : (conversations.find(c => c.active)?.title || 'Chat')}
          </h1>
        </div>
        {gmailConnected && (
          <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Connected
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:relative h-full w-80 bg-[#f7f7f8] flex flex-col z-50`}>
        <div className="p-4 border-b border-gray-200">
          {!gmailConnected ? (
            <button
              onClick={connectGmail}
              disabled={isLoading || status === 'loading'}
              className="w-full px-4 py-2.5 bg-black text-white rounded-lg hover:bg-black flex items-center gap-3 font-medium disabled:opacity-50"
            >
              <Mail size={20} />
              {isLoading || status === 'loading' ? 'Connecting...' : 'Connect Gmail'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <Mail size={16} />
                  Gmail Connected
                </div>
                <div className="text-green-600 text-xs mt-1">
                  {emailContext.filter(e => e.unread).length} unread emails
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-3 font-medium text-sm"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  selectConversation(conv.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 ${
                  conv.enabled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-gray-400 cursor-not-allowed opacity-60'
                } ${conv.active ? 'bg-[#f0f0f0]' : ''}`}
                disabled={!conv.enabled}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  conv.enabled ? 'bg-gray-100' : 'bg-gray-50'
                }`}>
                  <div className={`${
                    conv.id === 'gmail' ? 'text-red-500' :
                    conv.id === 'twitter' ? 'text-black' :
                    conv.id === 'linkedin' ? 'text-black' : ''
                  }`}>
                    {logos[conv.id]}
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{conv.title}</div>
                  <div className="text-xs text-gray-500">{conv.description}</div>
                </div>
                {!conv.enabled && (
                  <div className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    Soon
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            <button 
              onClick={() => {
                setShowProfile(!showProfile);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className="w-full px-4 py-2.5 rounded-lg flex items-center gap-3 text-gray-700 hover:bg-gray-100"
            >
              <User size={18} />
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full md:w-auto pt-16 md:pt-0">
        {/* Desktop Header */}
        <div className="hidden md:flex h-16 border-b border-gray-200 items-center px-6 bg-white">
          <div className="flex items-center gap-3">
            {conversations.find(c => c.active) && (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <div className={`${
                  conversations.find(c => c.active)?.id === 'gmail' ? 'text-red-500' :
                  conversations.find(c => c.active)?.id === 'twitter' ? 'text-black' :
                  conversations.find(c => c.active)?.id === 'linkedin' ? 'text-black' : ''
                }`}>
                  {logos[conversations.find(c => c.active)?.id]}
                </div>
              </div>
            )}
            <h1 className="text-lg font-medium text-gray-900">
              {showProfile ? 'Profile' : (conversations.find(c => c.active)?.title || 'Chat')}
            </h1>
          </div>
          {gmailConnected && (
            <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {showProfile ? (
            <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Profile & Statistics</h2>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Back to Chat
                  </button>
                </div>
                
                {/* Connection Status */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Connected Services</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <div className="text-red-500">{logos.gmail}</div>
                        </div>
                        <div>
                          <div className="font-medium">Gmail</div>
                          <div className="text-sm text-gray-500">
                            {gmailConnected ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      {gmailConnected ? (
                        <div className="text-sm text-green-600">Active</div>
                      ) : (
                        <button
                          onClick={connectGmail}
                          className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-black"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <div className="text-black">{logos.twitter}</div>
                        </div>
                        <div>
                          <div className="font-medium">Twitter</div>
                          <div className="text-sm text-gray-500">Coming soon</div>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Soon
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <div className="text-black">{logos.linkedin}</div>
                        </div>
                        <div>
                          <div className="font-medium">LinkedIn</div>
                          <div className="text-sm text-gray-500">Coming soon</div>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Soon
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Statistics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-semibold text-gray-900">{stats.emailsSent}</div>
                      <div className="text-sm text-gray-500">Emails Sent</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-semibold text-gray-900">{stats.totalInteractions}</div>
                      <div className="text-sm text-gray-500">Total Interactions</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900">
                        {stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-sm text-gray-500">Last Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="mb-8">
                  <div className="flex gap-4 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                      <RefreshCw size={14} className="text-white animate-spin" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-[#f8f9fa]">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          {gmailConnected ? 'Analyzing your emails...' : 'Connecting to Gmail...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {!showProfile && (
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-4xl mx-auto p-4">
              {/* Quick Prompts - Now above input */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {/* Mobile prompts */}
                  <div className="md:hidden flex flex-wrap gap-2 justify-center w-full">
                    {quickPrompts.mobile.map((prompt, index) => (
                      <button
                        key={`mobile-${index}`}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 transition-colors duration-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  {/* Desktop prompts */}
                  <div className="hidden md:flex flex-wrap gap-2 justify-center w-full">
                    {quickPrompts.desktop.map((prompt, index) => (
                      <button
                        key={`desktop-${index}`}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 transition-colors duration-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={gmailConnected ? "Ask me about your emails..." : "Connect Gmail first to get started..."}
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none"
                  rows="3"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-3 bottom-3 p-2 rounded-lg bg-black text-white hover:bg-blackdisabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default GmailAgentUI; 