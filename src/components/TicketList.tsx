import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Ticket } from '../types/ticket';

interface TicketListProps {
  onSelectTicket: (ticket: Ticket) => void;
}

const TicketList: React.FC<TicketListProps> = ({ onSelectTicket }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTickets(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching tickets:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    const ticketSubscription = supabase
      .channel('tickets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketSubscription);
    };
  }, []);

  if (loading) return <div className="loading">Cargando tickets...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="ticket-list p-4">
      <h2 className="text-xl font-bold mb-4">Tickets de Soporte</h2>
      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p>No hay tickets disponibles</p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-item p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectTicket(ticket)}
            >
              <h3 className="font-medium">{ticket.subject}</h3>
              <p className="text-sm text-gray-600">{ticket.status}</p>
              <small className="text-xs text-gray-400">
                {new Date(ticket.created_at).toLocaleDateString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketList;
