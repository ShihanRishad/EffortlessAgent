import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { GmailService } from '../../../lib/gmail';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { query = '', maxResults = 10 } = req.query;
      const gmailService = new GmailService(session.accessToken);
      const messages = await gmailService.getMessages(query, parseInt(maxResults));
      
      res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else if (req.method === 'POST') {
    try {
      const { to, subject, body } = req.body;
      const gmailService = new GmailService(session.accessToken);
      const result = await gmailService.sendMessage(to, subject, body);
      
      res.status(200).json({ success: true, messageId: result.id });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}