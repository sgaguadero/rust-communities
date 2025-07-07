import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection } from "@solana/web3.js"

export function getProvider(wallet: any) {
  const connection = new Connection("https://api.devnet.solana.com", "processed")
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "processed"
  })
  return provider
}
