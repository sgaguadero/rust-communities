import { useEffect, useState } from "react"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"

export function useWallet() {
  const [wallet, setWallet] = useState<any>(null)
  const [publicKey, setPublicKey] = useState<any>(null)
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Conexión a Solana devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed")

  // Función para obtener el balance
  const getBalance = async (pubKey: string) => {
    try {
      const balance = await connection.getBalance(new (await import("@solana/web3.js")).PublicKey(pubKey))
      setBalance(balance / LAMPORTS_PER_SOL)
    } catch (err) {
      console.error('Error getting balance:', err)
      setBalance(null)
    }
  }

  // Función para solicitar airdrop usando el faucet oficial
  const requestAirdrop = async () => {
    if (!publicKey) return
    
    try {
      setLoading(true)
      
      // Intentar primero con el método directo
      try {
        const signature = await connection.requestAirdrop(
          new (await import("@solana/web3.js")).PublicKey(publicKey),
          2 * LAMPORTS_PER_SOL // 2 SOL
        )
        await connection.confirmTransaction(signature)
        await getBalance(publicKey)
        return signature
      } catch (directError: any) {
        // Si falla, usar el faucet oficial
        if (directError.message.includes('429') || directError.message.includes('limit')) {
          console.log('Usando faucet alternativo...')
          
          const response = await fetch('https://faucet.solana.com/api/request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: publicKey,
              amount: 2
            })
          })
          
          if (!response.ok) {
            throw new Error('Error al solicitar airdrop del faucet oficial')
          }
          
          const result = await response.json()
          if (result.success) {
            // Esperar un poco para que la transacción se procese
            await new Promise(resolve => setTimeout(resolve, 3000))
            await getBalance(publicKey)
            return result.signature
          } else {
            throw new Error('Faucet oficial no disponible')
          }
        } else {
          throw directError
        }
      }
    } catch (err) {
      console.error('Error requesting airdrop:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if ("solana" in window) {
      const provider = (window as any).solana
      if (provider.isPhantom) {
        setIsPhantomAvailable(true)
        provider.connect({ onlyIfTrusted: true }).then(({ publicKey }: any) => {
          setWallet(provider)
          setPublicKey(publicKey)
          getBalance(publicKey.toString())
        }).catch((err: any) => {
          console.log('No auto-connect:', err)
        })
      }
    }
  }, [])

  const connect = async () => {
    try {
      const provider = (window as any).solana
      if (!provider) {
        throw new Error('Phantom no está instalado')
      }
      const resp = await provider.connect()
      setWallet(provider)
      setPublicKey(resp.publicKey)
      await getBalance(resp.publicKey.toString())
    } catch (err) {
      console.error('Error connecting to Phantom:', err)
      throw err
    }
  }

  const disconnect = async () => {
    try {
      const provider = (window as any).solana
      if (provider) {
        await provider.disconnect()
        setWallet(null)
        setPublicKey(null)
        setBalance(null)
      }
    } catch (err) {
      console.error('Error disconnecting from Phantom:', err)
      throw err
    }
  }

  return { 
    wallet, 
    publicKey, 
    balance, 
    loading,
    connect, 
    disconnect, 
    requestAirdrop,
    isPhantomAvailable 
  }
}
