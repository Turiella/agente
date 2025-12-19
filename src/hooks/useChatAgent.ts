import { useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Message, Sender } from '../types/Message';
import axios from 'axios';

interface ChatAgentConfig {
  openRouterApiKey?: string;
  model?: string;
  temperature?: number;
}

export const useChatAgent = (config: ChatAgentConfig = {}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  // Configuración por defecto
  const defaultConfig = {
    model: 'openai/gpt-3.5-turbo',
    temperature: 0.7,
    ...config
  };


  // Base de conocimiento local como respaldo
  const knowledgeBase: Record<string, string> = {
    'hola': '¡Hola! ¿En qué puedo ayudarte hoy?',
    'cómo estás': '¡Estoy funcionando perfectamente! ¿En qué puedo ayudarte?',
    'gracias': '¡De nada! ¿Hay algo más en lo que pueda ayudarte?',
    'adiós': '¡Hasta luego! No dudes en volver si tienes más preguntas.'
  };

  // Función para obtener respuesta del modelo de OpenAI
  const getAIResponse = async (message: string): Promise<string> => {
    if (!defaultConfig.openRouterApiKey) {
      throw new Error('OpenRouter API key no configurada');
    }
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: defaultConfig.model,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente de soporte técnico muy útil y profesional.'
            },
            ...conversationHistory.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: message }
          ],
          temperature: defaultConfig.temperature,
        },
        {
          headers: {
            'Authorization': `Bearer ${defaultConfig.openRouterApiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Customer Support Bot'
          }
        }
      );
      return response.data.choices[0]?.message?.content || 'No pude generar una respuesta.';
    } catch (error) {
      console.error('Error al llamar a la API de OpenRouter:', error);
      // Respuesta de respaldo
      const lowerMessage = message.toLowerCase();
      for (const [key, response] of Object.entries(knowledgeBase)) {
        if (lowerMessage.includes(key)) {
          return response as string;
        }
      }
      return 'Lo siento, estoy teniendo problemas para procesar tu solicitud. ¿Podrías intentarlo de nuevo?';
    }
  };

  // Guardar mensaje en Supabase
  const saveMessage = async (message: Omit<Message, 'id' | 'timestamp'>, userId?: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{ ...message, user_id: userId }])
      .select();
    
    if (error) {
      console.error('Error al guardar el mensaje:', error);
      return null;
    }
    
    return data?.[0];
  };

  // Cargar historial de mensajes
  const loadMessages = async (userId: string, page = 0, pageSize = 20): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error al cargar mensajes:', error);
      return [];
    }

    const messages = data
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as Sender,
        timestamp: new Date(msg.created_at)
      }))
      .reverse();

    setConversationHistory(messages);
    return messages;
  };

  // Enviar mensaje
  const sendMessage = async (content: string, userId?: string): Promise<Message> => {
    if (!content.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }

    setIsTyping(true);
    
    try {
      // Guardar mensaje del usuario
      const userMessage = {
        content: content.trim(),
        sender: 'user' as Sender,
      };
      
      await saveMessage(userMessage, userId);
      
      // Obtener respuesta del asistente
      const aiResponse = await getAIResponse(content.trim());
      
      // Guardar respuesta del asistente
      const assistantMessage = {
        content: aiResponse,
        sender: 'assistant' as Sender,
      };
      
      const savedMessage = await saveMessage(assistantMessage, userId);
      
      // Actualizar historial de conversación
      setConversationHistory(prev => [
        ...prev,
        { ...userMessage, id: Date.now().toString(), timestamp: new Date() },
        { ...assistantMessage, id: savedMessage?.id || Date.now().toString(), timestamp: new Date() }
      ]);

      return {
        ...assistantMessage,
        id: savedMessage?.id || Date.now().toString(),
        timestamp: new Date(savedMessage?.created_at || new Date())
      };
    } catch (error) {
      console.error('Error en sendMessage:', error);
      throw error;
    } finally {
      setIsTyping(false);
    }
  };

  return { 
    sendMessage,
    loadMessages,
    isTyping,
    conversationHistory
  };   
};

export default useChatAgent;