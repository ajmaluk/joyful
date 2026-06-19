import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { getAll, getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db';
import { saveProjectMeta, updateProjectMeta, syncFromIndexedDB } from './project-metadata';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

/**
 * On startup, sync the localStorage project index from IndexedDB.
 * This ensures the sidebar always has the latest list from the database.
 */
if (db) {
  getAll(db)
    .then((list) => {
      const metas = list
        .map(({ id, urlId, description, timestamp, messages }) => {
          const firstUserMessage = messages?.find((m) => m.role === 'user')?.content ?? '';
          const fallbackTitle = firstUserMessage 
            ? (firstUserMessage.slice(0, 40) + (firstUserMessage.length > 40 ? '...' : '')) 
            : 'New Chat';
          return {
            id,
            urlId: urlId || id,
            description: description || fallbackTitle,
            timestamp: timestamp || new Date().toISOString(),
          };
        });
      syncFromIndexedDB(metas);
    })
    .catch(() => {
      // silent — localStorage index already exists
    });
}

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        toast.error(`Chat persistence is unavailable`);
      }

      return;
    }

    if (mixedId) {
      getMessages(db, mixedId)
        .then((storedMessages) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            setInitialMessages(storedMessages.messages);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate(`/`, { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;

      let currentUrlId = urlId;
      if (!currentUrlId && firstArtifact?.id) {
        currentUrlId = await getUrlId(db, firstArtifact.id);
        navigateChat(currentUrlId);
        setUrlId(currentUrlId);
      }

      if (!description.get()) {
        const firstUserMessage = messages.find(m => m.role === 'user')?.content ?? '';
        const fallbackTitle = firstUserMessage 
          ? (firstUserMessage.slice(0, 40) + (firstUserMessage.length > 40 ? '...' : '')) 
          : 'New Chat';
        description.set(firstArtifact?.title || fallbackTitle);
      }

      let currentChatId = chatId.get();
      if (initialMessages.length === 0 && !currentChatId) {
        const nextId = await getNextId(db);
        currentChatId = nextId;
        chatId.set(nextId);

        if (!currentUrlId) {
          navigateChat(nextId);
        }
      }

      const finalUrlId = currentUrlId || (currentChatId as string);

      // Sync description to localStorage when it changes
      if (description.get() && currentChatId) {
        updateProjectMeta(currentChatId, {
          description: description.get(),
          timestamp: new Date().toISOString(),
        });
      }

      await setMessages(db, currentChatId as string, messages, finalUrlId, description.get());

      // Sync lightweight metadata to localStorage for instant sidebar loading
      saveProjectMeta({
        id: currentChatId as string,
        urlId: finalUrlId,
        description: description.get(),
        timestamp: new Date().toISOString(),
      });
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
