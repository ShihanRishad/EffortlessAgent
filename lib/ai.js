import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with safety checks
const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

export class AIService {
  constructor() {
    this.genAI = initializeGemini();
    // Updated model name - use gemini-1.5-flash for better performance
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
  }

  async analyzeEmails(emails, userQuery) {
    if (!emails || emails.length === 0) {
      return "I don't see any emails to analyze. Please make sure your Gmail is connected and you have emails in your inbox.";
    }

    const emailContext = emails.map(email => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      body: email.body ? email.body.substring(0, 300) : email.snippet,
      unread: email.unread,
      date: email.date
    }));

    // Check for specific, focused queries first
    const queryLower = userQuery.toLowerCase();
    
    // Handle specific sender searches
    if (queryLower.includes('mobbin') && (queryLower.includes('email') || queryLower.includes('from'))) {
      return this.searchSpecificSender(emailContext, 'mobbin');
    }
    
    // Handle other specific sender searches
    const senderMatch = queryLower.match(/(?:any|from|email.*from)\s+([a-zA-Z0-9@.-]+)/);
    if (senderMatch) {
      return this.searchSpecificSender(emailContext, senderMatch[1]);
    }

    // For general queries, use AI analysis
    const prompt = `
You are a helpful Gmail AI assistant. Give FOCUSED, CONCISE responses. Only provide what the user specifically asks for.

User Query: "${userQuery}"

Email Context (${emailContext.length} emails):
${JSON.stringify(emailContext, null, 2)}

Instructions:
1. Be direct and specific - only answer what was asked
2. If asking about specific emails/senders, give exact matches
3. If asking for summaries, be concise
4. If asking about unread emails, list them clearly
5. Don't provide extra information unless requested
6. Use simple, clean formatting

Respond directly to the user's question:
    `;

    try {
      console.log('Attempting to analyze emails with Gemini 1.5 Flash...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (text && text.trim()) {
        console.log('Successfully analyzed emails');
        return text;
      }
      throw new Error('Empty response from Gemini');
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.getFallbackResponse(emailContext, userQuery);
    }
  }

  searchSpecificSender(emailContext, searchTerm) {
    const senderEmails = emailContext.filter(email => 
      email.from.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (senderEmails.length === 0) {
      return `No emails found from "${searchTerm}".`;
    }
    
    if (senderEmails.length === 1) {
      const email = senderEmails[0];
      return `Yes, I found 1 email from ${searchTerm}:

**From:** ${email.from}
**Subject:** ${email.subject}
**Date:** ${new Date(email.date).toLocaleDateString()}
**Status:** ${email.unread ? 'Unread' : 'Read'}`;
    }
    
    return `Yes, I found ${senderEmails.length} emails from ${searchTerm}:

${senderEmails.slice(0, 3).map((email, index) => 
  `${index + 1}. **${email.subject}** (${new Date(email.date).toLocaleDateString()}) - ${email.unread ? 'Unread' : 'Read'}`
).join('\n')}

${senderEmails.length > 3 ? `... and ${senderEmails.length - 3} more emails.` : ''}`;
  }

  getFallbackResponse(emailContext, userQuery) {
    const queryLower = userQuery.toLowerCase();
    
    if (queryLower.includes('mobbin')) {
      const mobbinEmails = emailContext.filter(email => 
        email.from.toLowerCase().includes('mobbin')
      );
      
      if (mobbinEmails.length > 0) {
        const latest = mobbinEmails[0];
        return `Yes, I found ${mobbinEmails.length} email(s) from Mobbin. The latest is:

**From:** ${latest.from}
**Subject:** ${latest.subject}
**Date:** ${new Date(latest.date).toLocaleDateString()}
**Status:** ${latest.unread ? 'Unread' : 'Read'}`;
      } else {
        return "No emails found from Mobbin.";
      }
    }
    
    if (queryLower.includes('unread')) {
      const unreadEmails = emailContext.filter(e => e.unread);
      if (unreadEmails.length === 0) {
        return "You have no unread emails.";
      }
      return `You have ${unreadEmails.length} unread emails:

${unreadEmails.slice(0, 5).map((email, index) => 
  `${index + 1}. **${email.from}** - "${email.subject}"`
).join('\n')}`;
    }
    
    return "I can help you with your emails. What would you like me to do?";
  }

  async draftResponse(originalEmail, instruction) {
    if (!originalEmail || !instruction) {
      return "I need both the original email and your instructions to draft a response. Could you provide both?";
    }

    const prompt = `
Draft a professional email response based on the following:

Original Email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body || originalEmail.snippet}
Date: ${originalEmail.date}

User Instruction: "${instruction}"

Instructions:
1. Keep the response professional and appropriate for the context
2. Address all points mentioned in the user's instruction
3. Maintain a friendly but professional tone
4. Include a proper greeting and sign-off
5. Keep it concise but complete
6. Format the response clearly

Draft the email response now:
    `;

    try {
      console.log('Attempting to draft response with Gemini 1.5 Flash...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || !text.trim()) {
        throw new Error('Empty response from Gemini');
      }
      
      console.log('Successfully drafted response');
      return text;
    } catch (error) {
      console.error('Gemini Draft Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Enhanced fallback for draft responses
      const senderName = originalEmail.from.split('@')[0].split('<')[0].trim();
      
      return `**Draft Response to ${senderName}:**

Subject: Re: ${originalEmail.subject}

Hi ${senderName},

Thank you for your email regarding "${originalEmail.subject}".

${instruction.includes('acknowledge') ? 'I acknowledge receipt of your message and ' : ''}
${instruction.includes('schedule') ? 'I will check my calendar and get back to you with available times.' : ''}
${instruction.includes('review') ? 'I will review the information you provided and respond accordingly.' : ''}
${instruction.includes('urgent') ? 'I understand this is urgent and will prioritize accordingly.' : ''}

I will ${instruction.toLowerCase().includes('follow up') ? 'follow up' : 'get back to you'} ${instruction.includes('today') ? 'today' : 'soon'}.

Best regards,
[Your Name]

---
*Note: This is a draft response. Please review and modify as needed before sending.*`;
    }
  }

  async composeEmail(instruction) {
    const prompt = `
Help the user compose an email based on their instruction: "${instruction}"

Extract the following information:
1. Recipient email address (if mentioned)
2. Subject line
3. Email body content

If any information is missing, ask the user for clarification.

Format your response as:
- If all information is available, provide a complete email draft
- If information is missing, ask specific questions

Instructions for drafting:
1. Keep it professional and appropriate
2. Use clear, concise language
3. Include proper greeting and sign-off
4. Make the subject line descriptive

Draft the email now:
    `;

    try {
      console.log('Composing email with AI...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || !text.trim()) {
        throw new Error('Empty response from Gemini');
      }
      
      console.log('Successfully composed email');
      return text;
    } catch (error) {
      console.error('Gemini Compose Error:', error);
      
      // Parse instruction for basic email composition
      const instructionLower = instruction.toLowerCase();
      
      // Try to extract email address
      const emailMatch = instruction.match(/(?:to|send.*to)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      
      if (emailMatch) {
        const email = emailMatch[1];
        return `**Draft Email:**

**To:** ${email}
**Subject:** [Please specify subject]

Hi,

${instructionLower.includes('meeting') ? 'I would like to schedule a meeting to discuss...' : ''}
${instructionLower.includes('follow up') ? 'I wanted to follow up on...' : ''}
${instructionLower.includes('thank') ? 'Thank you for...' : ''}

Please let me know your thoughts.

Best regards,
[Your Name]

---
*What subject would you like for this email?*`;
      } else {
        return `To compose an email, I need:

1. **Recipient email address** (who should receive it?)
2. **Subject line** (what's it about?)
3. **Message content** (what do you want to say?)

Please provide these details, for example:
"Send email to john@example.com about meeting tomorrow"`;
      }
    }
  }
}