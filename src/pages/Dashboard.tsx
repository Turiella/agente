import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { useChatAgent } from '../hooks/useChatAgent';
import { Message } from '../types/Message';
import ChatWindow from '../components/ChatWindow';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const { sendMessage, isTyping } = useChatAgent({
    openRouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    model: 'openai/gpt-3.5-turbo'
  });

  // Manejar mensajes de redirección
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', {
            state: {
              error: 'auth_required',
              message: 'Por favor inicia sesión para continuar'
            }
          });
          return;
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        navigate('/login', {
          state: {
            error: 'auth_error',
            message: 'Error al verificar tu sesión'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await sendMessage(input, user?.id);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Mensaje de éxito */}
      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{message}</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Soporte al Cliente</h1>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ChatWindow messages={messages} isTyping={isTyping} />
          </div>
          
          {/* Input de mensaje */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}