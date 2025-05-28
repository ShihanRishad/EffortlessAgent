import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { GmailService } from '../../../lib/gmail';
import { AIService } from '../../../lib/ai';

export default async function handler(req, res) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in with Google' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { message, action, emailId } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Processing AI chat request:', { action, message: message.substring(0, 100) + '...' });

    // Initialize services
    const gmailService = new GmailService(session.accessToken);
    const aiService = new AIService();

    // Determine how many emails to fetch based on the query
    let maxResults = 20;
    if (message.toLowerCase().includes('all') || message.toLowerCase().includes('search')) {
      maxResults = 50; // Fetch more for comprehensive searches
    }

    // Fetch recent emails for context
    console.log('Fetching emails from Gmail...');
    const emails = await gmailService.getMessages('', maxResults);
    console.log(`Fetched ${emails.length} emails for analysis`);
    
    let response;

    // Handle different types of requests
    switch (action) {
      case 'compose':
        console.log('Composing new email...');
        response = await aiService.composeEmail(message);
        break;

      case 'send_email':
        // Handle actual email sending
        const { to, subject, body } = req.body;
        if (to && subject && body) {
          try {
            await gmailService.sendMessage(to, subject, body);
            response = `✅ Email sent successfully to ${to}!`;
          } catch (error) {
            console.error('Error sending email:', error);
            response = `❌ Failed to send email: ${error.message}`;
          }
        } else {
          response = "Please provide recipient (to), subject, and body to send an email.";
        }
        break;

      case 'draft_response':
        if (!emailId) {
          response = "Please specify which email you'd like me to draft a response to.";
          break;
        }
        
        // Find the specific email to respond to
        const email = emails.find(e => e.id === emailId);
        if (email) {
          console.log('Drafting response for email:', email.subject);
          response = await aiService.draftResponse(email, message);
        } else {
          response = "I couldn't find that email to respond to. Please try again.";
        }
        break;

      case 'search':
        console.log('Searching emails for:', message);
        response = await aiService.searchSpecificSender(emails.map(email => ({
          id: email.id,
          from: email.from,
          subject: email.subject,
          snippet: email.snippet,
          unread: email.unread,
          date: email.date
        })), message);
        break;

      case 'analyze':
      default:
        // General email analysis
        console.log('Analyzing emails with AI...');
        response = await aiService.analyzeEmails(emails, message);
        break;
    }

    // Prepare email context for UI
    const emailContext = emails.slice(0, 10).map(email => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      unread: email.unread,
      date: email.date
    }));

    console.log('AI response generated successfully');

    res.status(200).json({ 
      response,
      emailContext,
      metadata: {
        totalEmails: emails.length,
        unreadCount: emails.filter(e => e.unread).length,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in AI chat handler:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') // Truncate stack trace
    });

    // Provide specific error responses based on error type
    let errorMessage = 'I encountered an error processing your request. Please try again.';
    let statusCode = 500;

    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      errorMessage = 'Your Gmail session has expired. Please reconnect your account.';
      statusCode = 401;
    } else if (error.message.includes('GEMINI_API_KEY')) {
      errorMessage = 'AI service is not properly configured. Please contact support.';
      statusCode = 503;
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      errorMessage = 'Service is temporarily busy. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
      statusCode = 503;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      type: 'ai_processing_error',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to determine query intent
function analyzeQueryIntent(message) {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('draft') || messageLower.includes('respond') || messageLower.includes('reply')) {
    return 'draft_response';
  }
  
  if (messageLower.includes('search') || messageLower.includes('find') || messageLower.includes('look for')) {
    return 'search';
  }
  
  return 'analyze';
}