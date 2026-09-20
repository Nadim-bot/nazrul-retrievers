import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { getFallbackData, createAdminNotification, createUserNotification } from '../db';
import { isMongoDBActive, MChatThread, MConversationReport } from '../db/mongodb';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ChatThread, Message, MessageAttachment } from '../../src/types';
import { sanitizeInput, validateMessage } from '../../src/utils/validation';

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'server-uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration for Chat Attachments
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, 'chat-' + uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|xls|xlsx|csv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedExtensions.test(ext)) {
      return cb(null, true);
    }
    cb(new Error('Supported file types: Images (JPG, PNG, WEBP, GIF) and Documents (PDF, DOC, DOCX, TXT).'));
  }
});

// Helper to format file size
const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 0. CHAT ATTACHMENT UPLOAD (PHOTO & DOCUMENT / PDF)
router.post('/upload', authenticateToken, chatUpload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Multipart file upload via form-data
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isImage = /jpeg|jpg|png|webp|gif/.test(ext.replace('.', ''));
      const fileType: 'image' | 'document' | 'pdf' | 'file' = isImage 
        ? 'image' 
        : (ext === '.pdf' ? 'pdf' : 'document');
      
      let finalUrl = `/server-uploads/${req.file.filename}`;
      const fileSize = formatBytes(req.file.size);

      // If it's an image, attempt ImgBB upload for high-availability CDN delivery if key is set
      if (isImage) {
        try {
          const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || 'eeae5ac8abaf61efd5cadc10b0fd0922';
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Data = fileBuffer.toString('base64');
          const form = new URLSearchParams();
          form.append('image', base64Data);

          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString()
          });
          const imgbbData: any = await imgbbRes.json();
          if (imgbbData && imgbbData.success && imgbbData.data?.url) {
            finalUrl = imgbbData.data.url;
          }
        } catch (imgbbErr) {
          console.warn('ImgBB chat upload failed, using local static storage:', imgbbErr);
        }
      }

      return res.json({
        success: true,
        url: finalUrl,
        name: req.file.originalname,
        type: fileType,
        size: fileSize
      });
    }

    // 2. Base64 payload upload (e.g., from clipboard paste or drag & drop)
    const { base64, fileName, mimeType, fileSize: clientSize } = req.body || {};
    if (base64) {
      let cleanBase64 = base64;
      let detectedExt = '.png';
      if (base64.startsWith('data:')) {
        const mimeMatch = base64.match(/data:([^;]+);/);
        if (mimeMatch) {
          const mime = mimeMatch[1];
          if (mime.includes('pdf')) detectedExt = '.pdf';
          else if (mime.includes('jpeg') || mime.includes('jpg')) detectedExt = '.jpg';
          else if (mime.includes('webp')) detectedExt = '.webp';
          else if (mime.includes('gif')) detectedExt = '.gif';
          else if (mime.includes('word') || mime.includes('doc')) detectedExt = '.docx';
          else if (mime.includes('text/plain')) detectedExt = '.txt';
        }
        cleanBase64 = base64.split(',')[1];
      }
      cleanBase64 = cleanBase64.replace(/\s/g, '');

      const isImage = /jpg|jpeg|png|webp|gif/.test(detectedExt.replace('.', ''));
      const finalFileName = fileName || `chat-${Date.now()}${detectedExt}`;
      const isPdf = detectedExt === '.pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'));
      const fileType: 'image' | 'document' | 'pdf' | 'file' = isImage 
        ? 'image' 
        : (isPdf ? 'pdf' : 'document');

      let finalUrl = '';
      const buffer = Buffer.from(cleanBase64, 'base64');
      const sizeStr = clientSize || formatBytes(buffer.length);

      // Attempt ImgBB for images
      if (isImage) {
        try {
          const imgbbApiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY || 'eeae5ac8abaf61efd5cadc10b0fd0922';
          const form = new URLSearchParams();
          form.append('image', cleanBase64);

          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString()
          });
          const imgbbData: any = await imgbbRes.json();
          if (imgbbData && imgbbData.success && imgbbData.data?.url) {
            finalUrl = imgbbData.data.url;
          }
        } catch (imgbbErr) {
          console.warn('ImgBB base64 upload failed, writing locally:', imgbbErr);
        }
      }

      if (!finalUrl) {
        const uniqueName = `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${detectedExt}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), buffer);
        finalUrl = `/server-uploads/${uniqueName}`;
      }

      return res.json({
        success: true,
        url: finalUrl,
        name: finalFileName,
        type: fileType,
        size: sizeStr
      });
    }

    return res.status(400).json({ error: 'No file or base64 data provided.' });
  } catch (err: any) {
    console.error('Error handling chat upload:', err);
    return res.status(500).json({ error: 'Failed to upload chat file: ' + err.message });
  }
});

// Helper to format a thread for a specific user viewing it
function formatThreadForUser(t: any, userId: string, store: any, currentUser?: any): ChatThread {
  const otherId = (t.participants || []).find((pId: string) => String(pId) !== String(userId));
  const otherUser = store.users ? store.users.find((u: any) => String(u.id) === String(otherId)) : undefined;
  
  const otherName = otherUser?.full_name || otherUser?.fullName || t.name || 'Campus User';
  const otherAvatar = otherUser?.avatar || t.avatar || '';
  const otherInitials = otherAvatar || otherName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const validRawMessages = (t.messages || []).filter((m: any) =>
    !(m.deletedForUsers || []).map(String).includes(String(userId))
  );

  const threadUnreadCount = validRawMessages.filter((m: any) => {
    const isMe = String(m.senderId) === String(userId) || m.senderId === 'me';
    if (isMe) return false;
    if (m.isDeleted || m.deletedForEveryone) return false;
    if (m.readBy && Array.isArray(m.readBy)) {
      return !m.readBy.map(String).includes(String(userId));
    }
    if (m.isRead !== undefined) {
      return !m.isRead;
    }
    return false;
  }).length;

  const messages: Message[] = validRawMessages.map((m: any) => {
    const isMe = String(m.senderId) === String(userId) || m.senderId === 'me';
    const senderUser = store.users ? store.users.find((u: any) => String(u.id) === String(m.senderId)) : undefined;
    const sName = isMe ? (currentUser?.fullName || 'Me') : (senderUser?.full_name || senderUser?.fullName || m.senderName || otherName);
    const sInitials = isMe 
      ? (currentUser?.avatar || (currentUser?.fullName || 'Me').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase())
      : (senderUser?.avatar || m.senderInitials || sName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || otherInitials);

    const isDeleted = !!(m.isDeleted || m.deletedForEveryone);

    let attachmentObj: MessageAttachment | undefined = undefined;
    if (m.attachment && m.attachment.url) {
      attachmentObj = m.attachment;
    } else if (m.imageUrl) {
      attachmentObj = {
        url: m.imageUrl,
        name: m.fileName || 'Photo.png',
        type: 'image',
        size: m.fileSize
      };
    } else if (m.fileUrl) {
      attachmentObj = {
        url: m.fileUrl,
        name: m.fileName || 'Document.pdf',
        type: (m.fileType as any) || (m.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document'),
        size: m.fileSize
      };
    }

    return {
      id: String(m.id || `msg-${Date.now()}-${Math.random()}`),
      senderId: isMe ? 'me' : String(m.senderId),
      senderName: sName,
      senderInitials: sInitials,
      text: isDeleted ? 'This message was deleted' : m.text,
      time: m.time || 'Just now',
      attachment: isDeleted ? undefined : attachmentObj,
      imageUrl: isDeleted ? undefined : (m.imageUrl || (attachmentObj?.type === 'image' ? attachmentObj.url : undefined)),
      fileUrl: isDeleted ? undefined : (m.fileUrl || (attachmentObj && attachmentObj.type !== 'image' ? attachmentObj.url : undefined)),
      fileName: isDeleted ? undefined : (m.fileName || attachmentObj?.name),
      fileType: isDeleted ? undefined : (m.fileType || attachmentObj?.type),
      fileSize: isDeleted ? undefined : (m.fileSize || attachmentObj?.size),
      isDeleted,
      deletedForEveryone: !!m.deletedForEveryone
    };
  });

  const lastMsg = messages[messages.length - 1];

  return {
    id: String(t.id),
    name: otherName,
    initials: otherInitials,
    preview: lastMsg 
      ? (lastMsg.isDeleted ? 'This message was deleted' : (lastMsg.attachment ? (lastMsg.attachment.type === 'image' ? '📷 Photo' : `📎 ${lastMsg.attachment.name}`) : lastMsg.text)) 
      : (t.preview || 'No messages yet'),
    time: t.time || 'Just now',
    unreadCount: threadUnreadCount,
    itemTitle: t.itemTitle || 'General Inquiry',
    online: true,
    otherUserId: otherId ? String(otherId) : undefined,
    participants: t.participants ? t.participants.map(String) : [],
    messages
  };
}

// 1. GET ALL CHAT THREADS FOR LOGGED IN USER
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { store } = getFallbackData();
    
    // Filter threads where logged-in user is one of the participants and thread is not deleted for user
    const userThreads = (store.threads || []).filter((t: any) => 
      t && t.participants && t.participants.map(String).includes(String(userId)) &&
      !(t.deletedForUsers || []).map(String).includes(String(userId))
    );

    const mappedThreads: ChatThread[] = userThreads.map((t: any) => 
      formatThreadForUser(t, String(userId), store, req.user)
    );
    
    return res.json({ threads: mappedThreads });
  } catch (err: any) {
    console.error('Error fetching chats:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 1B. INITIATE OR LOCATE A PERSISTENT CHAT THREAD (CALLED ON "SEND MESSAGE" FROM LISTING)
router.post('/initiate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const senderId = String(req.user?.id);
  const { 
    itemId, 
    itemTitle, 
    itemType, 
    recipientId: rawRecipientId, 
    recipientName: rawRecipientName, 
    recipientAvatar, 
    recipientEmail,
    draftMessage,
    threadId: clientThreadId
  } = req.body;

  try {
    const { store, save } = getFallbackData();

    // 1. Resolve recipient user
    let recipientUser: any = undefined;
    if (rawRecipientId) {
      recipientUser = store.users.find((u: any) => String(u.id) === String(rawRecipientId));
    }
    if (!recipientUser && recipientEmail) {
      recipientUser = store.users.find((u: any) => (u.email || '').toLowerCase() === String(recipientEmail).toLowerCase());
    }
    if (!recipientUser && rawRecipientName) {
      recipientUser = store.users.find((u: any) => 
        (u.full_name || u.fullName || '').toLowerCase() === String(rawRecipientName).toLowerCase()
      );
    }

    let finalRecipientId = recipientUser ? String(recipientUser.id) : String(rawRecipientId || `user-${String(rawRecipientName || 'poster').toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    let finalRecipientName = recipientUser ? (recipientUser.full_name || recipientUser.fullName) : (rawRecipientName || 'Campus User');
    let finalRecipientAvatar = recipientUser?.avatar || recipientAvatar || '';

    // If sender and recipient are the same
    if (String(senderId) === String(finalRecipientId)) {
      return res.status(400).json({ error: 'You cannot initiate a chat with yourself.' });
    }

    // 2. Check if a thread between these two already exists
    let targetThread = store.threads.find((t: any) => 
      t && t.participants &&
      t.participants.map(String).includes(String(senderId)) &&
      t.participants.map(String).includes(String(finalRecipientId)) &&
      (!itemTitle || (t.itemTitle && t.itemTitle.trim().toLowerCase() === String(itemTitle).trim().toLowerCase()))
    );

    if (!targetThread) {
      targetThread = store.threads.find((t: any) => 
        t && t.participants &&
        t.participants.map(String).includes(String(senderId)) &&
        t.participants.map(String).includes(String(finalRecipientId))
      );
    }

    if (targetThread) {
      // Un-delete for sender if it was hidden
      targetThread.deletedForUsers = (targetThread.deletedForUsers || []).filter((uId: any) => String(uId) !== String(senderId));
      if (itemTitle && (!targetThread.itemTitle || targetThread.itemTitle === 'General Inquiry')) {
        targetThread.itemTitle = itemTitle;
      }
      save();
      return res.json({ thread: formatThreadForUser(targetThread, senderId, store, req.user) });
    }

    // 3. Create new persisted thread
    const newThreadId = clientThreadId || `thread-${Date.now()}`;
    const newThread: any = {
      id: newThreadId,
      name: finalRecipientName,
      initials: finalRecipientAvatar || finalRecipientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
      avatar: finalRecipientAvatar,
      itemTitle: itemTitle || 'Campus Listing',
      preview: draftMessage || 'Inquiry regarding listing',
      time: 'Just now',
      unreadCount: 0,
      online: true,
      otherUserId: finalRecipientId,
      participants: [String(senderId), String(finalRecipientId)],
      messages: [],
      deletedForUsers: [],
      createdAt: new Date().toISOString()
    };

    store.threads.unshift(newThread);
    save();

    return res.json({ thread: formatThreadForUser(newThread, senderId, store, req.user) });
  } catch (err: any) {
    console.error('Error initiating chat thread:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 2. SEND NEW MESSAGE TO A THREAD (OR START NEW THREAD)
router.post('/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  let { recipientName, itemTitle, messageText, threadId, attachment, imageUrl, fileUrl, fileName, fileType, fileSize } = req.body;
  const senderId = req.user?.id;
  const senderName = req.user?.fullName || 'Anonymous';
  const senderInitials = req.user?.avatar || 'U';

  // Handle normalize attachment from body if provided
  let normalizedAttachment: MessageAttachment | undefined = undefined;
  if (attachment && attachment.url) {
    normalizedAttachment = attachment;
  } else if (imageUrl) {
    normalizedAttachment = {
      url: imageUrl,
      name: fileName || 'Photo.png',
      type: 'image',
      size: fileSize
    };
  } else if (fileUrl) {
    normalizedAttachment = {
      url: fileUrl,
      name: fileName || 'Document.pdf',
      type: (fileType as any) || (fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document'),
      size: fileSize
    };
  }

  // If no text is provided but attachment is present, give a friendly label
  if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
    if (normalizedAttachment) {
      messageText = normalizedAttachment.type === 'image' 
        ? '📷 Photo' 
        : `📎 ${normalizedAttachment.name || 'Document'}`;
    } else {
      return res.status(400).json({ error: 'Message body or file attachment cannot be empty.' });
    }
  }

  messageText = sanitizeInput(messageText);
  const messageErr = validateMessage(messageText);
  if (messageErr && !normalizedAttachment) {
    return res.status(400).json({ error: messageErr });
  }

  if (recipientName) recipientName = sanitizeInput(recipientName);
  if (itemTitle) itemTitle = sanitizeInput(itemTitle);

  try {
    const { store, save } = getFallbackData();

    let targetThread: any = undefined;
    let recipientId: string | null = null;
    let realRecipientName = recipientName;
    let recipientAvatar = '';

    if (threadId) {
      targetThread = store.threads.find((t: any) => String(t.id) === String(threadId));
      if (targetThread && targetThread.participants) {
        const otherId = targetThread.participants.find((pId: string) => String(pId) !== String(senderId));
        if (otherId) {
          recipientId = String(otherId);
          const foundRecipient = store.users.find(u => String(u.id) === String(otherId));
          if (foundRecipient) {
            realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
            recipientAvatar = foundRecipient.avatar || '';
          }
        }
      }
    }

    if (!recipientId && (req.body.recipientId || req.body.otherUserId)) {
      const idToTry = String(req.body.recipientId || req.body.otherUserId);
      const foundRecipient = store.users.find(u => String(u.id) === idToTry);
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || '';
      } else {
        recipientId = idToTry;
        realRecipientName = recipientName || 'Poster';
      }
    }

    if (!recipientId && req.body.recipientEmail) {
      const foundRecipient = store.users.find(u => (u.email || '').toLowerCase() === String(req.body.recipientEmail).toLowerCase());
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || '';
      }
    }

    if (!recipientId && recipientName) {
      const foundRecipient = store.users.find(u => 
        (u.full_name || u.fullName || '').toLowerCase() === recipientName.toLowerCase() ||
        (u.full_name || u.fullName || '').toLowerCase().includes(recipientName.toLowerCase()) ||
        recipientName.toLowerCase().includes((u.full_name || u.fullName || '').toLowerCase())
      );
      if (foundRecipient) {
        recipientId = String(foundRecipient.id);
        realRecipientName = foundRecipient.full_name || foundRecipient.fullName;
        recipientAvatar = foundRecipient.avatar || '';
      } else {
        recipientId = `user-${recipientName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        realRecipientName = recipientName;
      }
    }

    if (recipientId && String(senderId) === String(recipientId)) {
      return res.status(400).json({ error: 'You cannot send a message to yourself.' });
    }

    if (!targetThread && recipientId) {
      // Find existing thread between these two participants matching itemTitle if possible
      targetThread = store.threads.find((t: any) => 
        t.participants && 
        t.participants.map(String).includes(String(senderId)) && 
        t.participants.map(String).includes(String(recipientId)) &&
        (!itemTitle || (t.itemTitle && t.itemTitle.toLowerCase() === itemTitle.toLowerCase()))
      );

      if (!targetThread) {
        targetThread = store.threads.find((t: any) => 
          t.participants && 
          t.participants.map(String).includes(String(senderId)) && 
          t.participants.map(String).includes(String(recipientId))
        );
      }
    }

    const newMessage: any = {
      id: `m-${Date.now()}-${Math.random()}`,
      senderId: String(senderId),
      senderName,
      senderInitials,
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      readBy: [String(senderId)],
      isRead: false,
      attachment: normalizedAttachment,
      imageUrl: normalizedAttachment?.type === 'image' ? normalizedAttachment.url : undefined,
      fileUrl: normalizedAttachment && normalizedAttachment.type !== 'image' ? normalizedAttachment.url : undefined,
      fileName: normalizedAttachment?.name,
      fileType: normalizedAttachment?.type,
      fileSize: normalizedAttachment?.size
    };

    const threadPreview = normalizedAttachment 
      ? (normalizedAttachment.type === 'image' ? '📷 Photo' : `📎 ${normalizedAttachment.name}`)
      : messageText;

    if (targetThread) {
      if (!targetThread.messages) targetThread.messages = [];
      targetThread.messages.push(newMessage);
      targetThread.preview = threadPreview;
      targetThread.time = 'Just now';
      targetThread.deletedForUsers = [];
    } else {
      if (!recipientId) {
        return res.status(404).json({ error: 'Recipient user not found in local user registry.' });
      }

      // Create new thread
      const newThread: any = {
        id: threadId || `thread-${Date.now()}`,
        name: realRecipientName || recipientName || 'Anonymous',
        initials: (realRecipientName || recipientName || 'Anonymous').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
        participants: [String(senderId), String(recipientId)],
        preview: threadPreview,
        time: 'Just now',
        unreadCount: 0,
        itemTitle: itemTitle || 'General Listing',
        online: true,
        messages: [newMessage],
        createdAt: new Date().toISOString()
      };
      store.threads.unshift(newThread);
      targetThread = newThread;
    }

    // Add in-app notification for the recipient about the incoming message
    if (recipientId && String(recipientId) !== String(senderId)) {
      const notifSnippet = normalizedAttachment 
        ? (normalizedAttachment.type === 'image' ? 'sent you a photo 📷' : `sent you a document (${normalizedAttachment.name}) 📎`)
        : (messageText.length > 50 ? `${messageText.substring(0, 47)}...` : messageText);

      await createUserNotification({
        userId: String(recipientId),
        title: `Message from ${senderName}`,
        message: `${senderName}: ${notifSnippet}`,
        text: `💬 <strong>${senderName}</strong> sent you a message regarding <em>"${targetThread.itemTitle || 'Item'}"</em>: "${notifSnippet}"`,
        type: 'chat_message'
      });
    }

    save();
    
    // Return formatted thread using unified helper
    const responseThread = formatThreadForUser(targetThread, String(senderId), store, req.user);
    return res.status(201).json({ message: 'Message sent successfully!', thread: responseThread });
  } catch (err: any) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 3. DELETE A MESSAGE (DELETE FOR EVERYONE OR DELETE FOR ME)
router.delete('/messages/:messageId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { messageId } = req.params;
  const { threadId, deleteType = 'everyone' } = req.body || {};
  const userId = req.user?.id;
  const userRole = req.user?.role || 'student';

  try {
    const { store, save } = getFallbackData();

    // Find thread containing messageId
    let targetThread = (store.threads || []).find((t: any) =>
      (threadId ? String(t.id) === String(threadId) : true) &&
      (t.messages || []).some((m: any) => String(m.id) === String(messageId))
    );

    if (!targetThread) {
      return res.status(404).json({ error: 'Message or thread not found.' });
    }

    const targetMessage = (targetThread.messages || []).find((m: any) => String(m.id) === String(messageId));
    if (!targetMessage) {
      return res.status(404).json({ error: 'Message not found in conversation.' });
    }

    const isMessageSender = String(targetMessage.senderId) === String(userId) || targetMessage.senderId === 'me';
    const isAdminOrMod = userRole === 'admin' || userRole === 'moderator';

    if (deleteType === 'everyone') {
      if (!isMessageSender && !isAdminOrMod) {
        return res.status(403).json({ error: 'You can only delete your own messages for everyone.' });
      }
      targetMessage.deletedForEveryone = true;
      targetMessage.isDeleted = true;
      targetMessage.text = 'This message was deleted';
    } else {
      // deleteType === 'for_me'
      if (!targetMessage.deletedForUsers) {
        targetMessage.deletedForUsers = [];
      }
      if (!targetMessage.deletedForUsers.map(String).includes(String(userId))) {
        targetMessage.deletedForUsers.push(String(userId));
      }
    }

    // Recompute targetThread preview
    const validMessagesForSender = targetThread.messages.filter((m: any) =>
      !(m.deletedForUsers || []).map(String).includes(String(userId))
    );
    const lastMsg = validMessagesForSender[validMessagesForSender.length - 1];
    if (lastMsg) {
      targetThread.preview = lastMsg.isDeleted || lastMsg.deletedForEveryone ? 'This message was deleted' : lastMsg.text;
    } else {
      targetThread.preview = 'No messages in conversation';
    }

    // Sync with MongoDB if active
    if (isMongoDBActive()) {
      try {
        if (deleteType === 'everyone') {
          await MChatThread.updateOne(
            { id: String(targetThread.id), 'messages.id': String(messageId) },
            { 
              $set: { 
                'messages.$.deletedForEveryone': true, 
                'messages.$.isDeleted': true, 
                'messages.$.text': 'This message was deleted',
                preview: targetThread.preview
              } 
            }
          );
        } else {
          await MChatThread.updateOne(
            { id: String(targetThread.id), 'messages.id': String(messageId) },
            { 
              $addToSet: { 'messages.$.deletedForUsers': String(userId) },
              $set: { preview: targetThread.preview }
            }
          );
        }
      } catch (mErr: any) {
        console.warn('⚠️ Failed to sync message deletion with MongoDB:', mErr.message);
      }
    }

    save();

    return res.json({
      message: deleteType === 'everyone' ? 'Message deleted for everyone successfully.' : 'Message deleted for you.',
      messageId,
      deleteType
    });
  } catch (err: any) {
    console.error('Error deleting message:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 4. DELETE / CLEAR ENTIRE THREAD
router.delete('/:threadId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();

    const threadIndex = (store.threads || []).findIndex((t: any) => String(t.id) === String(threadId));
    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const thread = store.threads[threadIndex];
    if (!thread.deletedForUsers) {
      thread.deletedForUsers = [];
    }
    if (!thread.deletedForUsers.map(String).includes(String(userId))) {
      thread.deletedForUsers.push(String(userId));
    }

    // If all participants have deleted the thread, we can remove it entirely from store
    const participants = thread.participants || [];
    const allDeleted = participants.every((pId: string) =>
      (thread.deletedForUsers || []).map(String).includes(String(pId))
    );

    if (allDeleted) {
      store.threads.splice(threadIndex, 1);
    }

    // Sync with MongoDB if active
    if (isMongoDBActive()) {
      try {
        if (allDeleted) {
          await MChatThread.deleteOne({ id: String(threadId) });
        } else {
          await MChatThread.updateOne(
            { id: String(threadId) },
            { $addToSet: { deletedForUsers: String(userId) } }
          );
        }
      } catch (mErr: any) {
        console.warn('⚠️ Failed to sync thread deletion with MongoDB:', mErr.message);
      }
    }

    save();

    return res.json({ message: 'Conversation thread deleted successfully.', threadId });
  } catch (err: any) {
    console.error('Error deleting thread:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 5. REPORT A CONVERSATION
router.post('/:threadId/report', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { threadId } = req.params;
  const { reason, description } = req.body;
  const reporterId = req.user?.id;
  const reporterName = req.user?.fullName || 'Anonymous';

  if (!reason) {
    return res.status(400).json({ error: 'Please specify a reason for reporting the conversation.' });
  }

  try {
    const { store, save } = getFallbackData();
    
    const thread = store.threads.find(t => String(t.id) === String(threadId));
    if (!thread) {
      return res.status(404).json({ error: 'Chat thread not found.' });
    }

    // Mark thread as under review
    (thread as any).status = 'under_review';
    (thread as any).reportStatus = 'pending';

    // Find the reported user in the fallback users
    let reportedUserId = '1'; // Default fallback
    const otherId = (thread as any).participants?.find((pId: string) => String(pId) !== String(reporterId));
    const otherUser = otherId ? store.users.find(u => String(u.id) === String(otherId)) : null;
    if (otherUser) {
      reportedUserId = otherUser.id;
    }

    const reportedName = otherUser ? (otherUser.full_name || otherUser.fullName) : 'Other User';

    // Save report
    if (!store.conversation_reports) {
      store.conversation_reports = [];
    }
    const newReport = {
      reportId: `rep-${Date.now()}`,
      conversationId: threadId,
      reportedBy: reporterId,
      reportedByName: reporterName,
      reportedUser: reportedUserId,
      reportedUserName: reportedName,
      reason,
      description: description || '',
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
    store.conversation_reports.push(newReport);
    
    save();

    if (isMongoDBActive()) {
      MConversationReport.create(newReport).catch(mErr => console.warn('MConversationReport create error:', mErr));
    }

    // Create admin notification
    await createAdminNotification({
      title: `🚨 Conversation Reported: ${reason}`,
      message: `Chat between ${reporterName} and ${reportedName} has been reported for "${reason}". Content is now open for admin review.`,
      type: 'conversation_reported',
      category: 'Messages',
      priority: 'high',
      relatedUserId: reporterId,
      relatedConversationId: threadId
    });

    return res.status(201).json({ message: 'Conversation reported successfully. It is now under administrator review.', report: newReport });
  } catch (err: any) {
    console.error('Error reporting conversation:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 5b. MARK ALL THREADS AS READ / SEEN ACROSS INBOX
router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();
    (store.threads || []).forEach((t: any) => {
      if (t.participants && t.participants.map(String).includes(String(userId))) {
        (t.messages || []).forEach((m: any) => {
          if (!m.readBy) {
            m.readBy = [String(m.senderId)];
          }
          if (userId && !m.readBy.map(String).includes(String(userId))) {
            m.readBy.push(String(userId));
          }
          m.isRead = true;
        });
        t.unreadCount = 0;
      }
    });
    save();
    return res.json({ success: true, message: 'All conversations marked as read.' });
  } catch (err: any) {
    console.error('Error marking all conversations as read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 6. MARK ALL MESSAGES IN A THREAD AS READ / SEEN
router.post('/:threadId/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();
    const targetThread = (store.threads || []).find((t: any) => String(t.id) === String(threadId));
    if (targetThread) {
      (targetThread.messages || []).forEach((m: any) => {
        if (!m.readBy) {
          m.readBy = [String(m.senderId)];
        }
        if (userId && !m.readBy.map(String).includes(String(userId))) {
          m.readBy.push(String(userId));
        }
        m.isRead = true;
      });
      targetThread.unreadCount = 0;
      save();
    }
    return res.json({ success: true, threadId, message: 'Thread marked as read.' });
  } catch (err: any) {
    console.error('Error marking thread as read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

router.put('/:threadId/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { threadId } = req.params;
  const userId = req.user?.id;

  try {
    const { store, save } = getFallbackData();
    const targetThread = (store.threads || []).find((t: any) => String(t.id) === String(threadId));
    if (targetThread) {
      (targetThread.messages || []).forEach((m: any) => {
        if (!m.readBy) {
          m.readBy = [String(m.senderId)];
        }
        if (userId && !m.readBy.map(String).includes(String(userId))) {
          m.readBy.push(String(userId));
        }
        m.isRead = true;
      });
      targetThread.unreadCount = 0;
      save();
    }
    return res.json({ success: true, threadId, message: 'Thread marked as read.' });
  } catch (err: any) {
    console.error('Error marking thread as read:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

export default router;
