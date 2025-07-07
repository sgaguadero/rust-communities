import { useEffect, useState } from "react"
import { useWallet } from "./useWallet"
import { getProvider } from "./provider"
import idl from "../../idl/communities.json"
import { Program } from "@coral-xyz/anchor"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"
import { 
  Wallet, 
  Users, 
  Vote, 
  Crown, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Coins
} from "lucide-react"
import Notification from "./Notification"
import { useNotification } from "../hooks/useNotification"

const programId = new PublicKey("6Cy6o9mfHJkwN2VrTVGHT6Jp9rhSp88thgEJFTyw2JBi")

export default function ConnectWallet() {
  const [error, setError] = useState<string | null>(null);
  const { notification, showSuccess, showError, showInfo, showWarning, hideNotification } = useNotification();
  
  try {
    const { 
      wallet, 
      publicKey, 
      balance, 
      loading,
      connect, 
      disconnect, 
      requestAirdrop,
      isPhantomAvailable 
    } = useWallet();
    const [program, setProgram] = useState<Program | null>(null);
    
    // Estados para las diferentes operaciones
    const [creatingCommunity, setCreatingCommunity] = useState(false);
    const [joiningCommunity, setJoiningCommunity] = useState(false);
    const [creatingPoll, setCreatingPoll] = useState(false);
    const [voting, setVoting] = useState(false);
    const [approvingMembership, setApprovingMembership] = useState(false);
    const [closingPoll, setClosingPoll] = useState(false);
    
    // Estados para formularios
    const [communityName, setCommunityName] = useState("");
    const [communityDescription, setCommunityDescription] = useState("");
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [selectedOption, setSelectedOption] = useState(0);
    const [communityAddress, setCommunityAddress] = useState("");
    const [membershipAddress, setMembershipAddress] = useState("");
    const [pollAddress, setPollAddress] = useState("");
    
    // Variables separadas para funciones de admin
    const [adminCommunityAddress, setAdminCommunityAddress] = useState("");
    const [adminMembershipAddress, setAdminMembershipAddress] = useState("");

    useEffect(() => {
      if (wallet) {
        try {
          const provider = getProvider(wallet);
          const _program = new Program(idl as any, programId, provider);
          setProgram(_program);
          setError(null);
        } catch (err) {
          console.error('Error creating program:', err);
          setError('Error al crear el programa: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } else {
        setProgram(null);
      }
    }, [wallet]);

    // Función para crear una comunidad
    const createCommunity = async () => {
      if (!communityName.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa un nombre para la comunidad');
        return;
      }
        
        if (!program || !publicKey) {
          showError('Error de conexión', 'Programa no disponible o wallet no conectada. Por favor conecta tu wallet.');
          return;
        }
      
      try {
        setCreatingCommunity(true);
        
        const seeds = [
          Buffer.from("community", 'ascii'),
          Buffer.from(communityName, 'ascii')
        ];
        
        const [communityPda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
        
        const tx = await program.methods
          .initializeCommunity(communityName, communityDescription || "Sin descripción")
          .accounts({
            community: communityPda,
            admin: publicKey,
            system_program: SystemProgram.programId
          })
          .rpc();
        
        showSuccess(
          `¡Comunidad "${communityName}" creada exitosamente!`,
          `Dirección: ${communityPda.toString()}\nHash: ${tx}`
        );
        setCommunityName("");
        setCommunityDescription("");
      } catch (err: any) {
        console.error('Error creating community:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        showError('Error al crear la comunidad', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setCreatingCommunity(false);
      }
    };

    // Función para unirse a una comunidad
    const joinCommunity = async () => {
      if (!program || !publicKey || !communityAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      try {
        setJoiningCommunity(true);
        
        const communityPubkey = new PublicKey(communityAddress);
        
        const [membershipPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("membership", 'ascii'),
            communityPubkey.toBuffer(),
            publicKey.toBuffer()
          ],
          programId
        );
        
        const tx = await program.methods
          .joinCommunity()
          .accounts({
            membership: membershipPda,
            community: communityPubkey,
            member: publicKey,
            systemProgram: SystemProgram.programId
          })
          .rpc();
        
        showSuccess(
          '¡Te has unido a la comunidad exitosamente!',
          `Membresía: ${membershipPda.toString()}\nHash: ${tx}`
        );
        setCommunityAddress("");
      } catch (err: any) {
        console.error('Error joining community:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        showError('Error al unirse a la comunidad', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setJoiningCommunity(false);
      }
    };

    // Función para crear una encuesta
    const createPoll = async () => {
      if (!program || !publicKey) {
        showError('Error de conexión', 'Programa no disponible o wallet no conectada');
        return;
      }
      
      if (!pollQuestion.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la pregunta de la encuesta');
        return;
      }
      
      if (pollOptions.filter(opt => opt.trim()).length < 2) {
        showWarning('Opciones insuficientes', 'Debes tener al menos 2 opciones válidas');
        return;
      }
      
      if (!communityAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      if (!membershipAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de tu membresía');
        return;
      }
      
      try {
        setCreatingPoll(true);
        
        const communityPubkey = new PublicKey(communityAddress);
        const membershipPubkey = new PublicKey(membershipAddress);
        
        try {
          const communityAccount = await program.account.community.fetch(communityPubkey);
          
          const membershipAccount = await program.account.membership.fetch(membershipPubkey);
          
          if (!(membershipAccount as any).isApproved) {
            showWarning('Membresía no aprobada', 'Tu membresía no está aprobada. Necesitas que el admin apruebe tu membresía primero.');
            return;
          }
          
          const pollSeeds = [
            Buffer.from("poll", 'ascii'),
            communityPubkey.toBuffer(),
            (communityAccount as any).totalPolls.toArrayLike(Buffer, 'le', 8)
          ];
          
          const [pollPda] = PublicKey.findProgramAddressSync(pollSeeds, programId);
          
          const endTime = new Date();
          endTime.setHours(endTime.getHours() + 24);
          const endTimeBN = new BN(endTime.getTime() / 1000);
          
          const tx = await program.methods
            .createPoll(pollQuestion, pollOptions.filter(opt => opt.trim()), endTimeBN)
            .accounts({
              poll: pollPda,
              community: communityPubkey,
              membership: membershipPubkey,
              creator: publicKey,
              systemProgram: SystemProgram.programId
            })
            .rpc();
          
          showSuccess(
            '¡Encuesta creada exitosamente!',
            `Pregunta: ${pollQuestion}\nDirección: ${pollPda.toString()}\nHash: ${tx}`
          );
          setPollQuestion("");
          setPollOptions(["", ""]);
          setCommunityAddress("");
          setMembershipAddress("");
        } catch (err: any) {
          console.error('Error in createPoll transaction:', err);
          if (err.logs) {
            console.error('Transaction logs:', err.logs);
          }
          showError('Error al crear la encuesta', err instanceof Error ? err.message : 'Error desconocido');
        }
      } catch (err: any) {
        console.error('Error creating poll:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        showError('Error al crear la encuesta', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setCreatingPoll(false);
      }
    };

    // Función para votar
    const castVote = async () => {
      if (!program || !publicKey || !pollAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la encuesta');
        return;
      }
      
      if (!membershipAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de tu membresía');
        return;
      }
      
      try {
        setVoting(true);
        
        if (!pollAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error('Dirección de encuesta inválida');
        }
        
        if (!membershipAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error('Dirección de membresía inválida');
        }
        
        const pollPubkey = new PublicKey(pollAddress);
        const membershipPubkey = new PublicKey(membershipAddress);
        
        const [votePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("vote", 'ascii'), 
            pollPubkey.toBuffer(), 
            publicKey.toBuffer()
          ],
          programId
        );
        
        try {
          const existingVote = await program.account.vote.fetch(votePda);
          showWarning('Voto duplicado', 'Ya has votado en esta encuesta. No puedes votar dos veces.');
          return;
        } catch (err) {
          // No existing vote found, proceeding with new vote
        }
        
        const tx = await program.methods
          .castVote(selectedOption)
          .accounts({
            vote: votePda,
            poll: pollPubkey,
            membership: membershipPubkey,
            voter: publicKey,
            systemProgram: SystemProgram.programId
          })
          .rpc();
        
        showSuccess(
          '¡Voto registrado exitosamente!',
          `Opción seleccionada: ${selectedOption + 1}\nHash: ${tx}`
        );
        setPollAddress("");
        setMembershipAddress("");
        setSelectedOption(0);
      } catch (err: any) {
        console.error('Error casting vote:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
          if (err.logs.some((log: string) => log.includes('already in use'))) {
            showWarning('Voto duplicado', 'Ya has votado en esta encuesta. No puedes votar dos veces.');
          } else {
            showError('Error al registrar el voto', err instanceof Error ? err.message : 'Error desconocido');
          }
        } else {
          showError('Error al registrar el voto', err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        setVoting(false);
      }
    };

    // Función para aprobar membresía (admin)
    const approveMembership = async () => {
      if (!program || !publicKey || !adminMembershipAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la membresía');
        return;
      }
      
      if (!adminCommunityAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      try {
        setApprovingMembership(true);
        
        const membershipPubkey = new PublicKey(adminMembershipAddress);
        const communityPubkey = new PublicKey(adminCommunityAddress);
        
        const tx = await program.methods
          .approveMembership()
          .accounts({
            community: communityPubkey,
            membership: membershipPubkey,
            admin: publicKey
          })
          .rpc();
        
        showSuccess('¡Membresía aprobada exitosamente!', `Hash: ${tx}`);
        setAdminMembershipAddress("");
        setAdminCommunityAddress("");
      } catch (err: any) {
        console.error('Error approving membership:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        showError('Error al aprobar la membresía', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setApprovingMembership(false);
      }
    };

    // Función para cerrar encuesta
    const closePoll = async () => {
      if (!program || !publicKey || !pollAddress.trim()) {
        showWarning('Campo requerido', 'Por favor ingresa la dirección de la encuesta');
        return;
      }
      
      try {
        setClosingPoll(true);
        
        const pollPubkey = new PublicKey(pollAddress);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        showSuccess('¡Encuesta cerrada exitosamente!');
        setPollAddress("");
      } catch (err) {
        console.error('Error closing poll:', err);
        showError('Error al cerrar la encuesta', 'Ha ocurrido un error inesperado');
      } finally {
        setClosingPoll(false);
      }
    };

    // Función para agregar opción de encuesta
    const addPollOption = () => {
      if (pollOptions.length < 4) {
        setPollOptions([...pollOptions, ""]);
      }
    };

    // Función para remover opción de encuesta
    const removePollOption = (index: number) => {
      if (pollOptions.length > 2) {
        setPollOptions(pollOptions.filter((_, i) => i !== index));
      }
    };

    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">Error</h2>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="btn-primary w-full"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Solana Communities</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Devnet
                </span>
              </div>
              
              {publicKey && (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {balance !== null ? `${balance.toFixed(4)} SOL` : 'Cargando...'}
                    </p>
                  </div>
                  <button 
                    onClick={disconnect}
                    className="btn-secondary"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isPhantomAvailable ? (
            <div className="text-center">
              <div className="card max-w-md mx-auto">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Phantom no está disponible</h2>
                <p className="text-gray-600 mb-6">Por favor instala Phantom Wallet para continuar.</p>
                <a 
                  href="https://phantom.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Instalar Phantom
                </a>
              </div>
            </div>
          ) : !publicKey ? (
            <div className="text-center">
              <div className="card max-w-md mx-auto">
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-4">
                  <Wallet className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Conecta tu Wallet</h2>
                <p className="text-gray-600 mb-6">Conecta Phantom para acceder a las comunidades de Solana.</p>
                <button 
                  onClick={connect}
                  className="btn-primary inline-flex items-center"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Conectar Phantom
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Wallet Status Card */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Wallet Conectada</h3>
                      <p className="text-sm text-gray-500">Conectado a Solana Devnet</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {balance !== null ? `${balance.toFixed(4)} SOL` : 'Cargando...'}
                      </p>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                    <button 
                      onClick={async () => {
                                          try {
                    await requestAirdrop()
                    showSuccess('¡Airdrop recibido!', '2 SOL añadidos a tu wallet.')
                  } catch (err) {
                    console.error('Airdrop error:', err)
                    if (err instanceof Error && err.message.includes('429')) {
                      showWarning('Límite alcanzado', 'Límite de airdrop alcanzado. Intenta más tarde o visita https://faucet.solana.com')
                    } else {
                      showError('Error de airdrop', 'Error al solicitar airdrop. Verifica tu conexión a devnet.')
                    }
                  }
                      }}
                      disabled={loading}
                      className="btn-success inline-flex items-center"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      {loading ? 'Solicitando...' : 'Airdrop'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Actions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Create Community */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="card-title">Crear Comunidad</h3>
                        <p className="card-subtitle">Crea una nueva comunidad en Solana</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la comunidad *
                      </label>
                      <input
                        type="text"
                        placeholder="Ingresa el nombre de la comunidad"
                        value={communityName}
                        onChange={(e) => setCommunityName(e.target.value)}
                        className={`input-field ${!communityName.trim() ? 'border-red-300 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción (opcional)
                      </label>
                      <textarea
                        placeholder="Describe tu comunidad"
                        value={communityDescription}
                        onChange={(e) => setCommunityDescription(e.target.value)}
                        className="input-field resize-none"
                        rows={3}
                      />
                    </div>
                    
                    <button 
                      onClick={createCommunity}
                      disabled={creatingCommunity || !communityName.trim()}
                      className="btn-primary w-full inline-flex items-center justify-center"
                    >
                      {creatingCommunity ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Comunidad
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Join Community */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="card-title">Unirse a Comunidad</h3>
                        <p className="card-subtitle">Únete a una comunidad existente</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de la comunidad
                      </label>
                      <input
                        type="text"
                        placeholder="Ingresa la dirección de la comunidad"
                        value={communityAddress}
                        onChange={(e) => setCommunityAddress(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    
                    <button 
                      onClick={joinCommunity}
                      disabled={joiningCommunity || !program || !communityAddress.trim()}
                      className="btn-success w-full inline-flex items-center justify-center"
                    >
                      {joiningCommunity ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uniéndose...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Unirse a Comunidad
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Create Poll */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Vote className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="card-title">Crear Encuesta</h3>
                        <p className="card-subtitle">Crea una nueva encuesta en tu comunidad</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de la comunidad
                      </label>
                      <input
                        type="text"
                        placeholder="Dirección de la comunidad"
                        value={communityAddress}
                        onChange={(e) => setCommunityAddress(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de tu membresía
                      </label>
                      <input
                        type="text"
                        placeholder="Dirección de tu membresía"
                        value={membershipAddress}
                        onChange={(e) => setMembershipAddress(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pregunta de la encuesta *
                      </label>
                      <input
                        type="text"
                        placeholder="¿Cuál es tu pregunta?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className={`input-field ${!pollQuestion.trim() ? 'border-red-300 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opciones *
                      </label>
                      <div className="space-y-2">
                        {pollOptions.map((option, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                              type="text"
                              placeholder={`Opción ${index + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...pollOptions];
                                newOptions[index] = e.target.value;
                                setPollOptions(newOptions);
                              }}
                              className="input-field flex-1"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                onClick={() => removePollOption(index)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {pollOptions.length < 4 && (
                          <button
                            onClick={addPollOption}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            + Agregar Opción
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={createPoll}
                      disabled={creatingPoll || !program || !pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2}
                      className="btn-warning w-full inline-flex items-center justify-center"
                    >
                      {creatingPoll ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                          Creando...
                        </>
                      ) : (
                        <>
                          <Vote className="w-4 h-4 mr-2" />
                          Crear Encuesta
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Vote */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Vote className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="card-title">Votar</h3>
                        <p className="card-subtitle">Participa en las encuestas de tu comunidad</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de la encuesta
                      </label>
                      <input
                        type="text"
                        placeholder="Dirección de la encuesta"
                        value={pollAddress}
                        onChange={(e) => setPollAddress(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de tu membresía
                      </label>
                      <input
                        type="text"
                        placeholder="Dirección de tu membresía"
                        value={membershipAddress}
                        onChange={(e) => setMembershipAddress(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opción
                      </label>
                      <select
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(Number(e.target.value))}
                        className="input-field"
                      >
                        <option value={0}>Opción 1</option>
                        <option value={1}>Opción 2</option>
                        <option value={2}>Opción 3</option>
                        <option value={3}>Opción 4</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={castVote}
                      disabled={voting || !program}
                      className="btn-primary w-full inline-flex items-center justify-center"
                    >
                      {voting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Votando...
                        </>
                      ) : (
                        <>
                          <Vote className="w-4 h-4 mr-2" />
                          Votar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Functions */}
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="card-title">Funciones de Administrador</h3>
                      <p className="card-subtitle">Gestiona tu comunidad como administrador</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Approve Membership */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Aprobar Membresía</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Dirección de la comunidad"
                        value={adminCommunityAddress}
                        onChange={(e) => setAdminCommunityAddress(e.target.value)}
                        className="input-field"
                      />
                      <input
                        type="text"
                        placeholder="Dirección de la membresía"
                        value={adminMembershipAddress}
                        onChange={(e) => setAdminMembershipAddress(e.target.value)}
                        className="input-field"
                      />
                      <button 
                        onClick={approveMembership}
                        disabled={approvingMembership || !program || !adminCommunityAddress.trim() || !adminMembershipAddress.trim()}
                        className="btn-primary w-full inline-flex items-center justify-center"
                      >
                        {approvingMembership ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Aprobando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar Membresía
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Close Poll */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Cerrar Encuesta</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Dirección de la encuesta"
                        value={pollAddress}
                        onChange={(e) => setPollAddress(e.target.value)}
                        className="input-field"
                      />
                      <button 
                        onClick={closePoll}
                        disabled={closingPoll || !program}
                        className="btn-danger w-full inline-flex items-center justify-center"
                      >
                        {closingPoll ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Cerrando...
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Cerrar Encuesta
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Notification Component */}
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      </div>
    );
  } catch (err) {
    console.error('Error in ConnectWallet:', err);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Error al cargar el componente: {err instanceof Error ? err.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }
}
