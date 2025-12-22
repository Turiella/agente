import { useState } from 'react';
import { useMercadoLibre } from '../hooks/useMercadoLibre';

const ProductSearch = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, login, searchProducts, products } = useMercadoLibre();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await searchProducts(query);
    } catch (err) {
      setError('Error al buscar productos. Intenta nuevamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-64">
        <button 
          onClick={login}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md transition-colors"
        >
          Conectar con Mercado Libre
        </button>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center">Buscando productos...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="mb-8 flex justify-center">
        <div className="flex gap-2 w-full max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            type="submit" 
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Buscar
          </button>
        </div>
      </form>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img 
                src={product.thumbnail} 
                alt={product.title} 
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2" title={product.title}>
                  {product.title}
                </h3>
                <p className="text-green-600 font-bold">${product.price.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {query ? 'No se encontraron productos. Intenta con otra búsqueda.' : 'Ingresa un término de búsqueda para comenzar.'}
        </div>
      )}
     </div>
  );
};
export default ProductSearch;
