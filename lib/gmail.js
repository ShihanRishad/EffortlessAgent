import { google } from 'googleapis';

export class GmailService {
  constructor(accessToken) {
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  async getMessages(query = '', maxResults = 10) {
    try {
      console.log(`Fetching messages with query: "${query}", maxResults: ${maxResults}`);
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log('No messages found');
        return [];
      }

      console.log(`Found ${response.data.messages.length} messages, fetching details...`);

      // Fetch message details in batches to avoid rate limits
      const batchSize = 10;
      const messages = [];
      
      for (let i = 0; i < response.data.messages.length; i += batchSize) {
        const batch = response.data.messages.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (msg) => {
          try {
            const fullMessage = await this.gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'full'
            });

            return this.parseMessage(fullMessage.data, msg.id);
          } catch (error) {
            console.error(`Error fetching message ${msg.id}:`, error.message);
            return null; // Skip this message if there's an error
          }
        });

        const batchResults = await Promise.all(batchPromises);
        messages.push(...batchResults.filter(msg => msg !== null));
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < response.data.messages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Successfully processed ${messages.length} messages`);
      return messages;

    } catch (error) {
      console.error('Error fetching messages:', error);
      
      if (error.code === 401) {
        throw new Error('Gmail authentication expired. Please reconnect your account.');
      } else if (error.code === 403) {
        throw new Error('Gmail access denied. Please check your permissions.');
      } else if (error.code === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      
      throw error;
    }
  }

  parseMessage(messageData, messageId) {
    try {
      const headers = messageData.payload.headers || [];
      const subject = this.getHeader(headers, 'Subject') || 'No Subject';
      const from = this.getHeader(headers, 'From') || 'Unknown Sender';
      const to = this.getHeader(headers, 'To') || '';
      const date = this.getHeader(headers, 'Date') || '';
      const messageId = this.getHeader(headers, 'Message-ID') || '';

      // Extract message body
      const body = this.extractBody(messageData.payload);
      
      // Check if message is unread
      const isUnread = messageData.labelIds?.includes('UNREAD') || false;
      
      // Check if message is important
      const isImportant = messageData.labelIds?.includes('IMPORTANT') || false;
      
      // Get thread ID for conversation tracking
      const threadId = messageData.threadId;

      return {
        id: messageId,
        threadId,
        subject,
        from: this.cleanEmailAddress(from),
        to: this.cleanEmailAddress(to),
        date: this.formatDate(date),
        body: body.substring(0, 1000), // Limit body length
        snippet: messageData.snippet || '',
        unread: isUnread,
        important: isImportant,
        messageId,
        labels: messageData.labelIds || []
      };
    } catch (error) {
      console.error('Error parsing message:', error);
      return {
        id: messageId,
        subject: 'Error parsing message',
        from: 'Unknown',
        date: new Date().toISOString(),
        body: '',
        snippet: 'Error parsing this message',
        unread: false,
        important: false
      };
    }
  }

  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }

  extractBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      // Single part message
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload.parts && payload.parts.length > 0) {
      // Multi-part message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        } else if (part.mimeType === 'text/html' && part.body && part.body.data && !body) {
          // Fallback to HTML if no plain text found
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Simple HTML to text conversion
          body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }

    return body || '';
  }

  cleanEmailAddress(emailStr) {
    if (!emailStr) return '';
    
    // Extract just the email part if it's in format "Name <email@domain.com>"
    const match = emailStr.match(/<([^>]+)>/);
    if (match) {
      return match[1];
    }
    
    // Remove extra whitespace and return
    return emailStr.trim();
  }

  formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    
    try {
      return new Date(dateStr).toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateStr);
      return new Date().toISOString();
    }
  }

  async sendMessage(to, subject, body) {
    try {
      const message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        `To: ${to}\n`,
        `Subject: ${subject}\n\n`,
        body
      ].join('');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('Email sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async getUnreadCount() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 1
      });

      return response.data.resultSizeEstimate || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
      
      console.log(`Marked message ${messageId} as read`);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async markAsUnread(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });
      
      console.log(`Marked message ${messageId} as unread`);
    } catch (error) {
      console.error('Error marking message as unread:', error);
      throw error;
    }
  }

  async searchMessages(searchQuery, maxResults = 20) {
    try {
      // Enhanced search with Gmail search operators
      let query = searchQuery;
      
      // Add common search operators if not already present
      if (!query.includes('from:') && !query.includes('to:') && !query.includes('subject:')) {
        // Search in from, subject, and body
        query = `(from:${searchQuery} OR subject:${searchQuery} OR ${searchQuery})`;
      }

      return await this.getMessages(query, maxResults);
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
}