import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`products/${productId}`)
      const stock = await api.get<Stock>(`stock/${productId}`)
      if(!response.data || !stock.data){
        toast.error('Erro na adição do produto');
        return
      }
      const cartFind = cart.findIndex(prod => prod.id === productId);
      if(cartFind >= 0){
        if(cart[cartFind].amount >= stock.data.amount){
          toast.error('Quantidade solicitada fora de estoque'); 
          return
        }
        const newCart = cart
        newCart[cartFind].amount += 1
        setCart([...newCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }else{
        setCart([...cart, {...response.data, amount:1}])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...response.data, amount:1}]))
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartFind = cart.findIndex(prod => prod.id === productId)
      if(cartFind < 0){
        toast.error('Erro na remoção do produto');
        return
      }
      const newCart = cart.filter(prod => prod.id !== productId)
      setCart([...newCart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        return
      }
      const stock = await api.get<Stock>(`stock/${productId}`)
      const cartFind = cart.findIndex(prod => prod.id === productId)
      if(cartFind >=0){
        if(amount > stock.data.amount){
          toast.error('Quantidade solicitada fora de estoque');
          return
        }
        const updatedCart = cart.map(prod => prod.id === productId ? {...prod, amount}:prod)
        setCart([...updatedCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
