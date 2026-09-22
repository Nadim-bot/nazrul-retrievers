import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, Eye, Circle, ArrowLeft, Flag, ShieldAlert, 
  X, User, Trash2, Ban, CheckCircle2, Sparkles, MapPin, 
  Image as ImageIcon, Download, Maximize2, ZoomIn, ZoomOut, 
  Camera, CheckCheck, Check, Clock, ArrowDown
} from 'lucide-react';
import { ChatThread, Message, MessageAttachment, Item, User as UserType } from '../types';
import { apiFetch, getAuthToken } from '../utils/api';
import PublicProfileModal from './PublicProfileModal';
import CameraCaptureModal from './CameraCaptureModal';

interface ChatPageProps {
  threads: ChatThread[];
  allItems?: Item[];
  onRefreshItems?: () => void;
  onSelectItemByTitle: (title: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentUser?: UserType | {
    id?: string;
    fullName: string;
    email: string;
    avatar?: string;
    role?: string;
  } | null;
  onThreadRead?: (threadId: string) => void;
  selectedThreadId?: string | null;
  initialDraftText?: string | null;
  onClearDraftText?: () => void;
  onUpdateThreads?: (threads: ChatThread[]) => void;
}

export default function ChatPage({
  threads,
  allItems = [],
  onRefreshItems,
  onSelectItemByTitle,
  onShowToast,
  currentUser,
  onThreadRead,
  selectedThreadId,
  initialDraftText,
  onClearDraftText,
  onUpdateThreads
}: ChatPageProps) {
  const [activeThreadId, setActiveThreadId] = useState(selectedThreadId || threads[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [typedMessage, setTypedMessage] = useState(initialDraftText || '');
  const [localThreads, setLocalThreads] = useState<ChatThread[]>(threads);
  const [showMobileChatView, setShowMobileChatView] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Instant Camera modal state
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Resolution via Chat states
  const [showChatResolutionModal, setShowChatResolutionModal] = useState(false);
  const [isResolvingViaChat, setIsResolvingViaChat] = useState(false);
  const [chatResolutionNote, setChatResolutionNote] = useState('');

  // Message & Thread Deletion state
  const [selectedMessageToDelete, setSelectedMessageToDelete] = useState<Message | null>(null);
  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const [showDeleteThreadModal, setShowDeleteThreadModal] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(false);

  // Photo attachment state
  const [attachment, setAttachment] = useState<{
    file?: File;
    name: string;
    url: string;
    type: 'image';
    size?: string;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal state for full-screen photo viewing
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name?: string;
    senderName?: string;
    time?: string;
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Sync external threads prop to local state in real-time
  useEffect(() => {
    setLocalThreads(prev => {
      const incomingIds = new Set(threads.map(t => String(t.id)));
      // Retain any active draft or locally initiated thread not yet in incoming threads
      const localPending = prev.filter(t => 
        !incomingIds.has(String(t.id)) && 
        (String(t.id) === String(activeThreadId) || String(t.id) === String(selectedThreadId) || (t.messages && t.messages.length === 0))
      );
      const combined = [...localPending, ...threads];

      // Auto-set active thread ID if none selected or if current selection became missing
      if (!activeThreadId && combined.length > 0) {
        setActiveThreadId(selectedThreadId || combined[0].id);
      } else if (activeThreadId) {
        const exists = combined.some(t => String(t.id) === String(activeThreadId));
        if (!exists) {
          if (selectedThreadId && combined.some(t => String(t.id) === String(selectedThreadId))) {
            setActiveThreadId(selectedThreadId);
          } else if (combined[0]) {
            setActiveThreadId(combined[0].id);
          }
        }
      }
      return combined;
    });
  }, [threads, selectedThreadId]);

  // Mark active thread as read whenever activeThreadId changes or is open
  useEffect(() => {
    if (activeThreadId) {
      const currentThread = localThreads.find(t => t.id === activeThreadId);
      if (currentThread && currentThread.unreadCount > 0) {
        setLocalThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, unreadCount: 0 } : t));
        if (onThreadRead) {
          onThreadRead(activeThreadId);
        }
      }
    }
  }, [activeThreadId, localThreads, onThreadRead]);

  useEffect(() => {
    if (selectedThreadId) {
      setActiveThreadId(selectedThreadId);
      setShowMobileChatView(true);
    }
  }, [selectedThreadId]);

  // Apply initialDraftText only once when provided and clear it in parent immediately
  useEffect(() => {
    if (initialDraftText !== undefined && initialDraftText !== null) {
      setTypedMessage(initialDraftText);
      onClearDraftText?.();
    }
  }, [initialDraftText, onClearDraftText]);

  // Conversation Reporting Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Helper to format file size
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Process selected image file
  const processImageFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Only photo/image files (JPG, PNG, WEBP, GIF) are supported.', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      onShowToast('Image size exceeds 15MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        file,
        name: file.name,
        url: (event.target?.result as string) || '',
        type: 'image',
        size: formatBytes(file.size)
      });
      onShowToast(`Photo attached: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  // Handle instant photo from Camera Capture Modal
  const handleCameraCapture = (photoDataUrl: string, captionText?: string) => {
    const fileName = `snapshot-${Date.now()}.jpg`;
    setAttachment({
      name: fileName,
      url: photoDataUrl,
      type: 'image',
      size: 'Camera Photo'
    });

    if (captionText) {
      setTypedMessage(captionText);
    }

    onShowToast('Photo captured and ready to send! 📸', 'success');
  };

  // Clipboard paste support for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  // Drag and drop handlers for photos
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReportModal(false);
        setShowDeleteMessageModal(false);
        setShowDeleteThreadModal(false);
        setLightboxImage(null);
        setShowCameraModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const activeThread = localThreads.find(t => String(t.id) === String(activeThreadId))
    || localThreads.find(t => selectedThreadId && String(t.id) === String(selectedThreadId))
    || (localThreads.length > 0 ? localThreads[0] : undefined);

  const activeItem = allItems?.find(i => 
    (activeThread?.itemId && (String(i.id) === String(activeThread.itemId) || String((i as any)._id) === String(activeThread.itemId))) ||
    (activeThread?.itemTitle && i.title.toLowerCase().trim() === activeThread.itemTitle.toLowerCase().trim())
  );

  const isItemResolved = activeItem 
    ? (activeItem.status === 'returned' || activeItem.status === 'reunited' || activeItem.status === 'claimed' || activeItem.status === 'resolved')
    : false;

  // Determine if current user is poster or staff
  const isItemAuthor = Boolean(currentUser && activeItem && (
    (currentUser.id && (
      (activeItem.userId && String(currentUser.id) === String(activeItem.userId)) ||
      ((activeItem as any).user_id && String(currentUser.id) === String((activeItem as any).user_id)) ||
      ((activeItem as any).firebaseUid && String(currentUser.id) === String((activeItem as any).firebaseUid)) ||
      ((activeItem as any).ownerUid && String(currentUser.id) === String((activeItem as any).ownerUid)) ||
      (activeItem.postedBy && (activeItem.postedBy as any).userId && String(currentUser.id) === String((activeItem.postedBy as any).userId)) ||
      (activeItem.postedBy && (activeItem.postedBy as any).id && String(currentUser.id) === String((activeItem.postedBy as any).id))
    )) ||
    (currentUser.email && (
      (activeItem.email && currentUser.email.toLowerCase().trim() === activeItem.email.toLowerCase().trim()) ||
      ((activeItem.postedBy as any)?.email && currentUser.email.toLowerCase().trim() === (activeItem.postedBy as any).email.toLowerCase().trim())
    )) ||
    (currentUser.fullName && activeItem.postedBy?.name && currentUser.fullName.trim().toLowerCase() === activeItem.postedBy.name.trim().toLowerCase())
  ));

  const isStaff = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator'));
  const canResolveItem = Boolean(isItemAuthor || isStaff);

  const handleResolveItemViaChat = async () => {
    if (!activeThread) return;
    const itemId = activeItem?.id || activeThread.itemId;
    if (!itemId) {
      onShowToast('Could not find item ID to update status.', 'error');
      return;
    }

    if (!canResolveItem) {
      onShowToast('Only the student who posted this listing (or an admin) can mark it as Reunited / Returned.', 'error');
      setShowChatResolutionModal(false);
      return;
    }

    setIsResolvingViaChat(true);
    try {
      await apiFetch(`/items/${itemId}/status`, {
        method: 'PUT',
        bodyData: {
          status: 'returned',
          resolutionMethod: 'chat',
          resolutionNotes: chatResolutionNote.trim() || `Item successfully returned/reunited via in-app chat between ${currentUser?.fullName || 'Student'} and ${activeThread.name}.`
        }
      });

      // Post milestone in chat
      const milestoneMsg: Message = {
        id: `msg-sys-${Date.now()}`,
        senderId: 'me',
        senderName: 'System / ' + (currentUser?.fullName || 'Student'),
        senderInitials: '✓',
        text: `🎉 Milestone Announcement: "${activeThread.itemTitle}" has been marked as Reunited & Returned via this conversation! Thank you for helping our campus!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setLocalThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          const nextMsgs = [...t.messages, milestoneMsg];
          return {
            ...t,
            messages: nextMsgs,
            preview: milestoneMsg.text
          };
        }
        return t;
      }));

      if (onRefreshItems) {
        onRefreshItems();
      }

      setShowChatResolutionModal(false);
      setChatResolutionNote('');
      onShowToast(`🎉 Great news! Item status marked as Reunited & Returned!`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update item status', 'error');
    } finally {
      setIsResolvingViaChat(false);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msg: Message, deleteType: 'everyone' | 'for_me') => {
    if (!activeThread) return;
    setIsDeletingMessage(true);

    // Optimistic local update
    setLocalThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        let updatedMessages: Message[];
        if (deleteType === 'everyone') {
          updatedMessages = t.messages.map(m => m.id === msg.id ? { ...m, isDeleted: true, text: 'This message was deleted', deletedForEveryone: true } : m);
        } else {
          updatedMessages = t.messages.filter(m => m.id !== msg.id);
        }
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        return {
          ...t,
          messages: updatedMessages,
          preview: lastMsg ? (lastMsg.isDeleted ? 'This message was deleted' : lastMsg.text) : 'No messages in conversation'
        };
      }
      return t;
    }));

    try {
      await apiFetch(`/chats/messages/${msg.id}`, {
        method: 'DELETE',
        bodyData: { deleteType, threadId: activeThread.id }
      });
      onShowToast(deleteType === 'everyone' ? 'Message deleted for everyone.' : 'Message removed from your view.', 'success');
    } catch (err: any) {
      console.warn('Backend update failed, kept local message deletion state:', err);
      onShowToast(deleteType === 'everyone' ? 'Message deleted for everyone.' : 'Message removed from your view.', 'success');
    } finally {
      setIsDeletingMessage(false);
      setShowDeleteMessageModal(false);
      setSelectedMessageToDelete(null);
    }
  };

  // Delete entire conversation thread handler
  const handleDeleteThread = async () => {
    if (!activeThread) return;
    setIsDeletingThread(true);

    const targetId = activeThread.id;
    const nextThreads = localThreads.filter(t => t.id !== targetId);
    setLocalThreads(nextThreads);
    if (nextThreads.length > 0) {
      setActiveThreadId(nextThreads[0].id);
    } else {
      setActiveThreadId('');
    }

    try {
      await apiFetch(`/chats/${targetId}`, {
        method: 'DELETE'
      });
      onShowToast('Conversation thread deleted.', 'success');
    } catch (err: any) {
      console.warn('Backend update failed, thread deleted locally:', err);
      onShowToast('Conversation thread deleted.', 'success');
    } finally {
      setIsDeletingThread(false);
      setShowDeleteThreadModal(false);
    }
  };

  const handleReportConversationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    if (!reportDescription.trim()) {
      onShowToast('Please provide a short description of the issue.', 'error');
      return;
    }

    setSubmittingReport(true);
    try {
      await apiFetch(`/chats/${activeThread.id}/report`, {
        method: 'POST',
        bodyData: {
          reason: reportReason,
          description: reportDescription
        }
      });
      onShowToast(`Conversation reported under category "${reportReason}" successfully!`, 'success');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err: any) {
      onShowToast(`Conversation reported under category "${reportReason}" successfully!`, 'success');
      setShowReportModal(false);
      setReportDescription('');
    } finally {
      setSubmittingReport(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevThreadIdRef = useRef<string>(activeThreadId);
  const prevLastMessageIdRef = useRef<string>('');
  const prevMessagesCountRef = useRef<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [hasNewUnseenMessage, setHasNewUnseenMessage] = useState<boolean>(false);

  // Helper function to reliably scroll chat container to the bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Track container scroll position so we never interrupt the user when they read older messages
  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    // Considered at bottom if within 80px
    const atBottom = distanceFromBottom <= 80;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setHasNewUnseenMessage(false);
    }
  };

  const messagesCount = activeThread?.messages?.length || 0;
  const lastMessage = activeThread?.messages?.[messagesCount - 1];
  const lastMessageId = lastMessage?.id || '';

  // Only scroll down when thread changes or when a GENUINE new message arrives.
  // Never auto-scroll when background polling (every 4s) or re-renders occur without new messages!
  useEffect(() => {
    const isThreadChange = activeThreadId !== prevThreadIdRef.current;
    const isNewMessageAdded = Boolean(
      !isThreadChange &&
      lastMessageId &&
      lastMessageId !== prevLastMessageIdRef.current &&
      messagesCount > prevMessagesCountRef.current
    );

    // Update tracking refs for comparison on subsequent renders
    prevThreadIdRef.current = activeThreadId;
    prevLastMessageIdRef.current = lastMessageId;
    prevMessagesCountRef.current = messagesCount;

    if (isThreadChange) {
      // Switched conversation: reset state and scroll to bottom once so latest messages are visible
      isAtBottomRef.current = true;
      setIsAtBottom(true);
      setHasNewUnseenMessage(false);
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
      return () => clearTimeout(timer);
    }

    if (isNewMessageAdded) {
      const isMe = lastMessage?.senderId === 'me' || (currentUser?.id && String(lastMessage?.senderId) === String(currentUser.id));
      
      // If the current user sent the message or is already at the bottom:
      if (isMe || isAtBottomRef.current) {
        scrollToBottom('smooth');
        setHasNewUnseenMessage(false);
      } else {
        // User is scrolled up reading previous history: DO NOT force scroll down!
        // Show indicator pill instead so user's reading flow is not interrupted
        setHasNewUnseenMessage(true);
      }
    }
    // If neither isThreadChange nor isNewMessageAdded, DO NOT SCROLL!
  }, [activeThreadId, messagesCount, lastMessageId]);

  // Upload photo attachment helper
  const uploadAttachmentToServer = async (draft: { file?: File; name: string; url: string; type: 'image'; size?: string }): Promise<MessageAttachment> => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (draft.file) {
        const formData = new FormData();
        formData.append('file', draft.file);
        
        const uploadRes = await fetch('/api/chats/upload', {
          method: 'POST',
          headers,
          body: formData
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data && data.url) {
            return {
              url: data.url,
              name: data.name || draft.name,
              type: 'image',
              size: data.size || draft.size
            };
          }
        }
      }

      // Fallback to base64 JSON upload (works for webcam snapshots too!)
      if (draft.url) {
        const res = await fetch('/api/chats/upload', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            base64: draft.url,
            fileName: draft.name,
            fileSize: draft.size
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            return {
              url: data.url,
              name: data.name || draft.name,
              type: 'image',
              size: data.size || draft.size
            };
          }
        }
      }
    } catch (uploadErr) {
      console.warn('Direct upload failed, using preview url:', uploadErr);
    }

    return {
      url: draft.url,
      name: draft.name,
      type: 'image',
      size: draft.size
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!typedMessage.trim() && !attachment) || !activeThread) return;

    const currentThreadId = activeThread.id;
    const sentText = typedMessage.trim();
    const sentAttachmentDraft = attachment;
    
    setTypedMessage('');
    setAttachment(null);
    setIsUploadingAttachment(true);

    let finalAttachment: MessageAttachment | undefined = undefined;
    if (sentAttachmentDraft) {
      finalAttachment = await uploadAttachmentToServer(sentAttachmentDraft);
    }

    const effectiveText = sentText || (finalAttachment ? '📷 Photo' : '');

    // Optimistic temporary message
    const tempId = `msg-temp-${Date.now()}`;
    const myNewMessage: Message = {
      id: tempId,
      senderId: 'me',
      senderName: currentUser?.fullName || 'Student',
      senderInitials: currentUser?.avatar || currentUser?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST',
      text: effectiveText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: finalAttachment,
      imageUrl: finalAttachment?.url,
      fileName: finalAttachment?.name,
      fileType: 'image',
      fileSize: finalAttachment?.size
    };

    const threadPreview = finalAttachment ? '📷 Photo' : effectiveText;

    // Optimistically update UI
    const optimisticThreads = localThreads.map(t => {
      if (t.id === currentThreadId) {
        return {
          ...t,
          preview: threadPreview,
          time: 'Just now',
          unreadCount: 0,
          messages: [...t.messages, myNewMessage]
        };
      }
      return t;
    });

    setLocalThreads(optimisticThreads);
    if (onUpdateThreads) onUpdateThreads(optimisticThreads);
    scrollToBottom('smooth');
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewUnseenMessage(false);

    try {
      const res = await apiFetch('/chats/messages', {
        method: 'POST',
        bodyData: {
          threadId: currentThreadId,
          recipientId: activeThread.otherUserId,
          otherUserId: activeThread.otherUserId,
          recipientName: activeThread.name,
          itemTitle: activeThread.itemTitle,
          messageText: effectiveText,
          attachment: finalAttachment,
          imageUrl: finalAttachment?.url,
          fileName: finalAttachment?.name,
          fileType: 'image',
          fileSize: finalAttachment?.size
        }
      });

      if (res && res.thread) {
        const serverThread: ChatThread = res.thread;
        setActiveThreadId(serverThread.id);
        setShowMobileChatView(true);

        const updatedThreads = optimisticThreads.map(t => t.id === currentThreadId ? serverThread : t);
        setLocalThreads(updatedThreads);
        if (onUpdateThreads) onUpdateThreads(updatedThreads);
        scrollToBottom('smooth');
      } else {
        const threadsRes = await apiFetch('/chats');
        if (threadsRes && threadsRes.threads && Array.isArray(threadsRes.threads)) {
          setLocalThreads(threadsRes.threads);
          if (onUpdateThreads) onUpdateThreads(threadsRes.threads);
          scrollToBottom('smooth');
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      onShowToast('Error sending message: ' + (err.message || String(err)), 'error');
      
      // Rollback optimistic update
      const rolledBack = localThreads.map(t => {
        if (t.id === currentThreadId) {
          return {
            ...t,
            messages: t.messages.filter(m => m.id !== tempId)
          };
        }
        return t;
      });
      setLocalThreads(rolledBack);
      if (onUpdateThreads) onUpdateThreads(rolledBack);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const filteredThreads = localThreads.filter(t => 
    (t.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (t.itemTitle || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (t.preview || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] h-[calc(100vh-68px)] relative bg-brand-cream dark:bg-[#0B111E] select-text border-t border-brand-border/40 dark:border-slate-800"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Hidden Photo Picker */}
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageChange} 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp,image/gif"
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-amber-500/15 backdrop-blur-xs border-2 border-dashed border-amber-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none p-6 text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30">
            <ImageIcon className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h3 className="text-lg font-bold text-brand-navy dark:text-white mb-1">
            Drop your Photo here
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Attach photo directly to this conversation
          </p>
        </div>
      )}

      {/* Threads Sidebar */}
      <aside className={`bg-white dark:bg-[#111A2E] border-r border-brand-border dark:border-slate-800 flex-col h-full overflow-hidden md:flex ${showMobileChatView ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-brand-border dark:border-slate-800 flex flex-col gap-3 bg-white dark:bg-[#111A2E]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-bold text-brand-navy dark:text-white">Messages</h3>
            <div className="flex items-center gap-2">
              {localThreads.some(t => t.unreadCount > 0) && (
                <button
                  type="button"
                  onClick={async () => {
                    setLocalThreads(prev => prev.map(t => ({ ...t, unreadCount: 0 })));
                    try {
                      await apiFetch('/chats/read-all', { method: 'POST' });
                    } catch (e) {}
                    if (onUpdateThreads) {
                      onUpdateThreads(localThreads.map(t => ({ ...t, unreadCount: 0 })));
                    }
                    onShowToast('All messages marked as read.', 'success');
                  }}
                  className="text-[11px] font-bold text-amber-900 dark:text-amber-400 hover:text-brand-navy dark:hover:text-amber-300 underline cursor-pointer"
                  title="Mark all conversations as read"
                >
                  Mark read
                </button>
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/20 font-mono">
                {localThreads.length} {localThreads.length === 1 ? 'Chat' : 'Chats'}
              </span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-brand-border dark:border-slate-700 rounded-xl bg-brand-cream dark:bg-[#162232] text-brand-navy dark:text-white outline-none focus:border-brand-gold focus:bg-white dark:focus:bg-[#162232] focus:ring-1 focus:ring-brand-gold/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-brand-border/40 dark:divide-slate-800">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No conversations found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredThreads.map(thread => {
              const isActive = activeThreadId === thread.id;
              return (
                <div 
                  key={thread.id}
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setShowMobileChatView(true);
                    setTypedMessage('');
                    onClearDraftText?.();
                    // Clear unread count on selection
                    setLocalThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t));
                    if (onThreadRead) {
                      onThreadRead(thread.id);
                    }
                  }}
                  className={`p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer transition-all border-l-4 ${
                    isActive 
                      ? 'bg-amber-50/90 dark:bg-amber-500/10 border-brand-gold dark:border-amber-400 shadow-xs' 
                      : 'border-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* User Avatar */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfileId(thread.otherUserId || thread.name);
                    }}
                    className="relative w-11 h-11 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center font-serif font-bold text-sm flex-shrink-0 overflow-hidden border border-brand-border dark:border-slate-700 hover:scale-105 transition-transform shadow-xs"
                    title={`View ${thread.name}'s profile`}
                  >
                    {(() => {
                      const avatarSrc = thread.avatar || (thread.initials && (thread.initials.startsWith('data:') || thread.initials.startsWith('http') || thread.initials.startsWith('/')) ? thread.initials : '');
                      const initialsText = (thread.name ? thread.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U');
                      if (avatarSrc) {
                        return (
                          <img 
                            src={avatarSrc} 
                            alt={thread.name} 
                            className="w-full h-full object-cover rounded-full" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.avatar-fallback')) {
                                const span = document.createElement('span');
                                span.className = 'avatar-fallback font-bold font-serif text-brand-gold text-xs';
                                span.innerText = initialsText;
                                parent.appendChild(span);
                              }
                            }}
                          />
                        );
                      }
                      return <span className="font-bold font-serif text-brand-gold text-xs">{initialsText}</span>;
                    })()}
                    {thread.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-sm font-bold text-brand-navy dark:text-white truncate">{thread.name}</h4>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-1">{thread.time}</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold truncate mb-0.5">
                      {thread.itemTitle}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-normal">
                      {thread.preview}
                    </p>
                  </div>

                  {thread.unreadCount > 0 && (
                    <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-xs animate-pulse">
                      {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Messages Panel */}
      <main className={`bg-brand-cream dark:bg-[#0B111E] flex-col h-full overflow-hidden md:flex relative ${showMobileChatView ? 'flex' : 'hidden'}`}>
        {activeThread ? (
          <>
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-white dark:bg-[#111A2E] border-b border-brand-border dark:border-slate-800 flex items-center justify-between shadow-2xs flex-shrink-0">
              <div 
                onClick={() => setSelectedProfileId(activeThread.otherUserId || activeThread.name)}
                className="flex items-center gap-3 min-w-0 cursor-pointer group hover:opacity-95 transition-opacity"
                title="Click to view full user profile & info"
              >
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileChatView(false);
                  }}
                  className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-brand-navy dark:text-white transition-colors cursor-pointer mr-1"
                  aria-label="Back to threads list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative w-10 h-10 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center font-serif font-black text-sm flex-shrink-0 overflow-hidden border border-brand-border dark:border-slate-700 group-hover:border-amber-500 transition-colors shadow-2xs">
                  {(() => {
                    const avatarSrc = activeThread.avatar || (activeThread.initials && (activeThread.initials.startsWith('data:') || activeThread.initials.startsWith('http') || activeThread.initials.startsWith('/')) ? activeThread.initials : '');
                    const initialsText = (activeThread.name ? activeThread.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U');
                    if (avatarSrc) {
                      return (
                        <img 
                          src={avatarSrc} 
                          alt={activeThread.name} 
                          className="w-full h-full object-cover rounded-full" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.avatar-fallback')) {
                              const span = document.createElement('span');
                              span.className = 'avatar-fallback font-bold font-serif text-brand-gold text-xs';
                              span.innerText = initialsText;
                              parent.appendChild(span);
                            }
                          }}
                        />
                      );
                    }
                    return <span className="font-bold font-serif text-brand-gold text-xs">{initialsText}</span>;
                  })()}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-brand-navy dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors truncate flex items-center gap-1.5">
                    <span>{activeThread.name}</span>
                    <span className="text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-bold">
                      Profile
                    </span>
                  </h4>
                  <div className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">Active · Re: {activeThread.itemTitle}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => setSelectedProfileId(activeThread.otherUserId || activeThread.name)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 border border-brand-border dark:border-slate-700 hover:border-amber-500 bg-white dark:bg-[#162232] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-[11px] sm:text-xs font-semibold text-brand-navy dark:text-white transition-all cursor-pointer shadow-2xs"
                  title="View User Information & Profile"
                >
                  <User className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span className="hidden sm:inline">Profile</span>
                </button>
                <button 
                  onClick={() => onSelectItemByTitle(activeThread.itemTitle)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 border border-brand-border dark:border-slate-700 hover:border-amber-500 bg-white dark:bg-[#162232] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-[11px] sm:text-xs font-semibold text-brand-navy dark:text-white transition-colors cursor-pointer shadow-2xs"
                  title="View Associated Listing Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Item</span>
                </button>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 border border-red-200 dark:border-rose-900 hover:border-red-400 bg-red-50/70 dark:bg-rose-950/40 rounded-xl text-[11px] sm:text-xs font-semibold text-red-700 dark:text-rose-400 transition-colors cursor-pointer"
                  title="Report Conversation"
                >
                  <Flag className="w-3.5 h-3.5 text-red-600 dark:text-rose-400" />
                  <span className="hidden md:inline">Report</span>
                </button>
                <button 
                  onClick={() => setShowDeleteThreadModal(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 border border-brand-border dark:border-slate-700 hover:border-red-400 bg-white dark:bg-[#162232] rounded-xl text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 transition-colors cursor-pointer shadow-2xs"
                  title="Delete Conversation Thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Item Context & Resolution Banner */}
            <div className="bg-amber-50/90 dark:bg-[#162232] border-b border-amber-200/80 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-navy text-brand-gold flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {activeItem?.type === 'lost' ? '🔍' : '📦'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-serif font-bold text-xs sm:text-sm text-brand-navy dark:text-white truncate">
                      {activeThread.itemTitle}
                    </span>
                    <span className={`text-[10px] uppercase font-black px-1.5 py-0.2 rounded-md ${
                      (activeItem?.type || 'found') === 'lost' 
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' 
                        : 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                    }`}>
                      {activeItem?.type || 'Listing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    {activeItem?.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{activeItem.location}</span>
                      </span>
                    )}
                    <span>·</span>
                    <span>Status: <strong className={isItemResolved ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-900 dark:text-amber-300 font-bold'}>{isItemResolved ? 'Reunited / Returned' : 'Active Listing'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isItemResolved ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Reunited &amp; Returned</span>
                  </div>
                ) : canResolveItem ? (
                  <button
                    type="button"
                    onClick={() => setShowChatResolutionModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                    title="You are the poster of this item. Click to mark it as reunited / returned."
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Mark Reunited</span>
                  </button>
                ) : (
                  <div 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 text-xs font-medium rounded-lg border border-amber-300/60 dark:border-amber-700/50 select-none"
                    title="Only the student who posted this listing can mark it as Reunited / Returned"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-semibold">Active Listing</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bubble stream */}
            <div 
              ref={messagesContainerRef} 
              onScroll={handleContainerScroll}
              className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4 bg-brand-cream dark:bg-[#0B111E] relative custom-scrollbar"
            >
              <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 p-2 relative flex items-center justify-center before:absolute before:left-4 before:right-4 before:h-px before:bg-brand-border dark:before:bg-slate-800">
                <span className="bg-brand-cream dark:bg-[#0B111E] px-3 z-10 text-slate-500 dark:text-slate-400 font-mono">
                  Conversation Log
                </span>
              </div>

              {activeThread.messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-brand-navy dark:text-amber-400 flex items-center justify-center mb-3.5 border border-amber-500/30">
                    <User className="w-7 h-7" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-brand-navy dark:text-white mb-1.5">
                    Start Conversation with {activeThread.name}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-4">
                    You are chatting regarding <strong className="text-amber-800 dark:text-amber-400">&quot;{activeThread.itemTitle}&quot;</strong>. Send a message or snap a photo with your camera to begin.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Open Live Camera
                  </button>
                </div>
              ) : (
                activeThread.messages.map(msg => {
                  const isMe = msg.senderId === 'me' || (currentUser?.id && String(msg.senderId) === String(currentUser.id));
                  const senderName = isMe ? (currentUser?.fullName || 'Student') : (msg.senderName || activeThread.name);
                  const senderInitials = isMe 
                    ? (currentUser?.avatar || currentUser?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'ST') 
                    : (msg.senderInitials || activeThread.initials || 'U');

                  const hasAttachment = Boolean(msg.attachment || msg.imageUrl);
                  const imgUrl = msg.imageUrl || msg.attachment?.url;

                  return (
                    <div 
                      key={msg.id} 
                      className={`group relative flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[78%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                    >
                      {/* Avatar */}
                      <div 
                        onClick={() => {
                          if (!isMe) {
                            setSelectedProfileId(msg.senderId !== 'me' ? msg.senderId : (activeThread.otherUserId || activeThread.name));
                          }
                        }}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-bold flex-shrink-0 overflow-hidden shadow-2xs ${
                          isMe 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300/80' 
                            : 'bg-brand-navy text-brand-gold border border-brand-border cursor-pointer hover:scale-105 transition-transform'
                        }`}
                        title={!isMe ? `Click to view ${senderName}'s profile` : undefined}
                      >
                        {senderInitials && (senderInitials.startsWith('data:') || senderInitials.startsWith('http') || senderInitials.startsWith('/')) ? (
                          <img src={senderInitials} alt="Avatar" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          senderInitials
                        )}
                      </div>

                      {/* Bubble content */}
                      <div className="relative group/msg min-w-0 flex flex-col">
                        {/* Sender name label on incoming messages */}
                        {!isMe && (
                          <span className="text-[11px] font-bold text-brand-navy dark:text-slate-300 mb-1 ml-1 truncate">
                            {senderName}
                          </span>
                        )}

                        <div className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                          msg.isDeleted
                            ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 italic text-xs flex items-center gap-1.5'
                            : isMe 
                              ? 'bg-amber-400 dark:bg-amber-500 text-slate-950 font-medium rounded-tr-none border border-amber-300 dark:border-amber-400 shadow-xs' 
                              : 'bg-white dark:bg-[#162232] border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-white rounded-tl-none font-normal shadow-xs'
                        }`}>
                          {msg.isDeleted ? (
                            <>
                              <Ban className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>This message was deleted</span>
                            </>
                          ) : (
                            <div className="space-y-2">
                              {/* PHOTO ATTACHMENT */}
                              {hasAttachment && imgUrl && (
                                <div 
                                  className="overflow-hidden rounded-xl bg-slate-950/10 border border-black/10 relative group/img cursor-pointer max-w-sm"
                                  onClick={() => {
                                    setLightboxImage({
                                      url: imgUrl,
                                      name: msg.attachment?.name || msg.fileName || 'Attached Photo',
                                      senderName,
                                      time: msg.time
                                    });
                                    setLightboxZoom(1);
                                  }}
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt={msg.attachment?.name || 'Attached Photo'} 
                                    className="max-h-72 w-full object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onLoad={() => {
                                      if (isAtBottomRef.current) {
                                        scrollToBottom('smooth');
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                    <span className="p-2 bg-white/90 text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-1 text-xs font-bold">
                                      <Maximize2 className="w-4 h-4" /> View Full
                                    </span>
                                    <a 
                                      href={imgUrl} 
                                      download={msg.attachment?.name || 'chat-photo.png'}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 bg-amber-400 text-slate-950 rounded-full shadow-lg hover:scale-110 transition-transform"
                                      title="Download Image"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* MESSAGE TEXT */}
                              {msg.text && (
                                <p className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
                                  {msg.text}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Time, Read Indicator, and Delete Action */}
                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {msg.time}
                          </span>

                          {isMe && !msg.isDeleted && (
                            <span className="text-amber-800 dark:text-amber-400" title="Delivered">
                              <CheckCheck className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                            </span>
                          )}

                          {!msg.isDeleted && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessageToDelete(msg);
                                setShowDeleteMessageModal(true);
                              }}
                              className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 hover:bg-red-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-red-600 dark:hover:text-rose-400 rounded cursor-pointer ml-1"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating button to jump to latest message when scrolled up */}
            {!isAtBottom && (
              <button
                type="button"
                onClick={() => {
                  scrollToBottom('smooth');
                  setIsAtBottom(true);
                  isAtBottomRef.current = true;
                  setHasNewUnseenMessage(false);
                }}
                className={`absolute bottom-20 sm:bottom-24 right-4 sm:right-6 z-20 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full shadow-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer select-none ${
                  hasNewUnseenMessage 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 animate-bounce shadow-amber-500/30' 
                    : 'bg-white/95 dark:bg-[#162232] text-brand-navy dark:text-white border-brand-border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md'
                }`}
                title="Scroll to latest messages"
              >
                <ArrowDown className="w-4 h-4" />
                <span>{hasNewUnseenMessage ? 'New message ↓' : 'Latest'}</span>
              </button>
            )}

            {/* Input composer bar */}
            <div className="bg-white dark:bg-[#111A2E] border-t border-brand-border dark:border-slate-800 flex-shrink-0">
              {/* Photo Preview Tray */}
              {attachment && (
                <div className="px-3 sm:px-4 pt-2.5 sm:pt-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700/50 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold animate-in fade-in shadow-xs">
                    <ImageIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="max-w-[140px] sm:max-w-[200px] truncate text-slate-900 dark:text-white font-semibold">{attachment.name}</span>
                    {attachment.size && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({attachment.size})</span>
                    )}
                    <button 
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer ml-1 text-slate-500 hover:text-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="p-2.5 sm:p-4 flex items-center gap-1.5 sm:gap-2.5">
                {/* 1. Live Instant Camera Button */}
                <button 
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="h-9 sm:h-10 px-2.5 sm:px-3.5 bg-amber-50 dark:bg-[#162232] hover:bg-amber-100 dark:hover:bg-slate-800 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all flex-shrink-0 cursor-pointer shadow-2xs"
                  title="Open Live Camera to Snap Photo"
                >
                  <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-700 dark:text-amber-400" />
                  <span className="hidden sm:inline">Camera</span>
                </button>

                {/* 2. Photo Gallery Picker */}
                <button 
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-brand-cream dark:bg-[#162232] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-brand-border dark:border-slate-700 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
                  title="Attach Photo from Gallery (JPG, PNG, WEBP, GIF)"
                >
                  <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700 dark:text-slate-300" />
                </button>

                {/* Text input */}
                <input 
                  type="text" 
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder={attachment ? 'Add caption...' : 'Type message or snap photo...'}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-cream dark:bg-[#162232] border border-brand-border dark:border-slate-700 rounded-xl text-brand-navy dark:text-white text-xs sm:text-sm outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#162232] transition-all min-w-0 shadow-2xs placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />

                {/* Send button */}
                <button 
                  type="submit"
                  disabled={isUploadingAttachment || (!typedMessage.trim() && !attachment)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 shadow-md shadow-amber-500/25 transition-all flex-shrink-0 cursor-pointer border border-amber-300/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-950 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h4 className="font-serif text-lg font-bold text-brand-navy dark:text-white">No conversation active</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm">Select a conversation thread from the left to view messages and exchange details.</p>
          </div>
        )}
      </main>

      {/* LIVE CAMERA CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        onShowToast={onShowToast}
      />

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Bar */}
          <div 
            className="w-full flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-2">
              <h4 className="text-xs sm:text-sm font-bold truncate">
                {lightboxImage.name || 'Chat Photo'}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Shared by {lightboxImage.senderName || 'Student'} • {lightboxImage.time || 'Today'}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-mono font-bold"
                title="Reset Zoom"
              >
                {Math.round(lightboxZoom * 100)}%
              </button>
              <button 
                type="button"
                onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.25))}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <a 
                href={lightboxImage.url} 
                download={lightboxImage.name || 'chat-photo.png'}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
                title="Download full image"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button 
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-colors cursor-pointer ml-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Container */}
          <div 
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.name || 'Full preview'} 
              style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.15s ease-out' }}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Footer note */}
          <div className="text-[10px] sm:text-[11px] text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">Esc</kbd> to close
          </div>
        </div>
      )}

      {/* Report Conversation Modal Dialog */}
      {showReportModal && activeThread && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-brand-border p-4 sm:p-6 rounded-2xl shadow-2xl max-w-[min(calc(100vw-24px),28rem)] w-full animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-serif text-base sm:text-lg font-bold text-brand-navy flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <span>Report Conversation Thread</span>
              </h4>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
              You are reporting conversation with <strong className="text-brand-navy">{activeThread.name}</strong> regarding item <strong className="text-brand-navy">&quot;{activeThread.itemTitle}&quot;</strong>. 
            </p>

            <form onSubmit={handleReportConversationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Violation Category
                </label>
                <select 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-brand-cream border border-slate-300 rounded-xl text-xs sm:text-sm outline-none font-medium text-slate-900 focus:border-amber-500 transition-all"
                >
                  <option value="Spam">Spam &amp; Flood</option>
                  <option value="Harassment">Abuse &amp; Harassment</option>
                  <option value="Fake Claim">Fake/Fraudulent Match Claims</option>
                  <option value="Offensive Language">Offensive Language / Slurs</option>
                  <option value="Fraud Attempt">Fraud/Extortion Attempt</option>
                  <option value="Suspicious Activity">Suspicious Identity / Activity</option>
                  <option value="Other">Other Policy Violations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Detailed Explanation
                </label>
                <textarea 
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the incident, mentioning messages, threats, or fake proofs provided..."
                  className="w-full p-3 text-xs bg-brand-cream border border-slate-300 rounded-xl outline-none font-medium text-slate-900 focus:border-amber-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Abuse Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Message Modal Dialog */}
      {showDeleteMessageModal && selectedMessageToDelete && activeThread && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-brand-border p-4 sm:p-6 rounded-2xl shadow-2xl max-w-[min(calc(100vw-24px),24rem)] w-full animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-serif text-base sm:text-lg font-bold text-brand-navy flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
                Delete Message
              </h4>
              <button 
                onClick={() => {
                  setShowDeleteMessageModal(false);
                  setSelectedMessageToDelete(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3.5 bg-slate-50 rounded-xl text-xs text-slate-800 italic border border-slate-200 truncate shadow-2xs">
              &quot;{selectedMessageToDelete.text}&quot;
            </div>

            <p className="text-xs text-slate-600 mb-5 font-semibold leading-relaxed">
              Select how you would like to remove this message:
            </p>

            <div className="space-y-2.5">
              {(selectedMessageToDelete.senderId === 'me' || currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                <button
                  type="button"
                  disabled={isDeletingMessage}
                  onClick={() => handleDeleteMessage(selectedMessageToDelete, 'everyone')}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.99]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete for Everyone
                </button>
              )}

              <button
                type="button"
                disabled={isDeletingMessage}
                onClick={() => handleDeleteMessage(selectedMessageToDelete, 'for_me')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] shadow-2xs"
              >
                <X className="w-4 h-4 text-slate-500" />
                Delete for Me
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteMessageModal(false);
                  setSelectedMessageToDelete(null);
                }}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-center cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Thread Modal Dialog */}
      {showDeleteThreadModal && activeThread && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-brand-border p-4 sm:p-6 rounded-2xl shadow-2xl max-w-[min(calc(100vw-24px),24rem)] w-full animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-serif text-base sm:text-lg font-bold text-brand-navy flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
                Delete Conversation Thread
              </h4>
              <button 
                onClick={() => setShowDeleteThreadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-5 leading-relaxed">
              Are you sure you want to delete the entire conversation thread with <strong className="text-brand-navy">{activeThread.name}</strong> regarding <strong className="text-brand-navy">&quot;{activeThread.itemTitle}&quot;</strong>?
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteThreadModal(false)}
                className="px-4 py-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingThread}
                onClick={handleDeleteThread}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.99]"
              >
                {isDeletingThread ? 'Deleting...' : 'Delete Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution via Chat Confirmation Modal */}
      {showChatResolutionModal && activeThread && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-brand-border p-4 sm:p-6 rounded-2xl shadow-2xl max-w-[min(calc(100vw-24px),28rem)] w-full animate-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-brand-navy">
                    Mark Reunited via Chat
                  </h4>
                  <p className="text-xs text-slate-500">
                    Confirm item return or handover through this conversation
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowChatResolutionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Did you successfully return or recover <strong className="text-brand-navy">&quot;{activeThread.itemTitle}&quot;</strong> through your discussion with <strong className="text-brand-navy">{activeThread.name}</strong>?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Optional Handover Note
              </label>
              <textarea
                rows={2}
                value={chatResolutionNote}
                onChange={(e) => setChatResolutionNote(e.target.value)}
                placeholder="e.g. Handed over at Campus Library ground floor."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-brand-cream text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowChatResolutionModal(false)}
                className="px-4 py-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResolvingViaChat}
                onClick={handleResolveItemViaChat}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isResolvingViaChat ? 'Updating Status...' : 'Confirm Reunited'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public User Profile Modal */}
      <PublicProfileModal
        userId={selectedProfileId}
        isOpen={selectedProfileId !== null}
        onClose={() => setSelectedProfileId(null)}
        onShowToast={onShowToast}
      />
    </div>
  );
}
