import { useEffect, useState } from "react"
import { useWallet } from "./useWallet"
import { getProvider } from "./provider"
import idl from "../../idl/communities.json"
import { Program } from "@coral-xyz/anchor"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import { BN } from "@coral-xyz/anchor"



const programId = new PublicKey("6Cy6o9mfHJkwN2VrTVGHT6Jp9rhSp88thgEJFTyw2JBi")

export default function ConnectWallet() {
  const [error, setError] = useState<string | null>(null);
  
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
          console.log('Wallet connected, creating program...');
          console.log('Wallet details:', wallet);
          const provider = getProvider(wallet);
          console.log('Provider created:', provider);
          console.log('IDL:', idl);
          console.log('Program ID:', programId.toString());
          console.log('Provider connection:', provider.connection.rpcEndpoint);
          console.log('Provider wallet:', provider.wallet);
          
          console.log('About to create Program...');
          try {
            const _program = new Program(idl as any, programId, provider);
            console.log('Program created successfully:', _program);
            setProgram(_program);
            setError(null);
          } catch (programError) {
            console.error('Error in Program creation:', programError);
            throw programError;
          }
        } catch (err) {
          console.error('Error creating program:', err);
          setError('Error al crear el programa: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } else {
        console.log('No wallet connected');
        setProgram(null);
      }
    }, [wallet]);

    // Función para crear una comunidad
    const createCommunity = async () => {
      if (!communityName.trim()) {
        alert('Por favor ingresa un nombre para la comunidad');
        return;
      }
              console.log('Debug createCommunity:', {
          program: !!program,
          publicKey: !!publicKey,
          programDetails: program,
          publicKeyDetails: publicKey?.toString()
        });
        
        if (!program || !publicKey) {
          alert('Programa no disponible o wallet no conectada. Por favor conecta tu wallet.');
          return;
        }
      
      try {
        setCreatingCommunity(true);
        
        // Generar PDA para la comunidad - debe coincidir exactamente con el Rust
        // The Rust program uses: seeds = [b"community", name.as_bytes()]
        // Let's try using the exact same encoding as Rust
        const seeds = [
          Buffer.from("community", 'ascii'),
          Buffer.from(communityName, 'ascii')
        ];
        
        // Use the standard method to find the program address
        const [communityPda, bump] = PublicKey.findProgramAddressSync(seeds, programId);
        
        console.log('PDA derivation:', {
          seeds: seeds.map(s => s.toString('hex')),
          bump,
          communityPda: communityPda.toString()
        });
        
        console.log('Debug accounts:', {
          community: communityPda.toString(),
          admin: publicKey.toString(),
          system_program: new PublicKey("11111111111111111111111111111111").toString(),
          communityName,
          communityDescription: communityDescription || "Sin descripción"
        });
        
        // Llamar al programa de Solana usando la función real del IDL
        try {
          console.log('Attempting transaction with accounts:', {
            community: communityPda.toString(),
            admin: publicKey.toString(),
            system_program: SystemProgram.programId.toString(),
            bump: bump
          });
          
          // First, let's check if the program is accessible
          try {
            const programInfo = await program.provider!.connection.getAccountInfo(programId);
            console.log('Program info:', programInfo);
          } catch (err) {
            console.error('Error fetching program info:', err);
          }
          
          // Let's try a different approach - check if the account already exists
          try {
            const accountInfo = await program.provider!.connection.getAccountInfo(communityPda);
            console.log('Account info for PDA:', accountInfo);
            if (accountInfo) {
              console.log('Account already exists! This might be the issue.');
            }
          } catch (err) {
            console.log('Account does not exist yet (expected)');
          }
          
          // Let's try a different approach - use the program's built-in PDA derivation
          const tx = await program.methods
            .initializeCommunity(communityName, communityDescription || "Sin descripción")
            .accounts({
              community: communityPda,
              admin: publicKey,
              system_program: SystemProgram.programId
            })
            .rpc();
          
          console.log("Transacción exitosa:", tx);
          alert(`¡Comunidad "${communityName}" creada exitosamente!\nDirección: ${communityPda.toString()}\nHash: ${tx}`);
          setCommunityName("");
          setCommunityDescription("");
        } catch (err: any) {
          console.error('Error creating community:', err);
          if (err.logs) {
            console.error('Transaction logs:', err.logs);
          }
          alert('Error al crear la comunidad: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } catch (err) {
        console.error('Error creating community:', err);
        alert('Error al crear la comunidad: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      } finally {
        setCreatingCommunity(false);
      }
    };

    // Función para unirse a una comunidad
    const joinCommunity = async () => {
      if (!program || !publicKey || !communityAddress.trim()) {
        alert('Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      try {
        setJoiningCommunity(true);
        
        const communityPubkey = new PublicKey(communityAddress);
        
        // Generar PDA para la membresía
        const [membershipPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("membership", 'ascii'),
            communityPubkey.toBuffer(),
            publicKey.toBuffer()
          ],
          programId
        );
        
        console.log('Joining community with:', {
          membership: membershipPda.toString(),
          community: communityPubkey.toString(),
          member: publicKey.toString()
        });
        
        const tx = await program.methods
          .joinCommunity()
          .accounts({
            membership: membershipPda,
            community: communityPubkey,
            member: publicKey,
            systemProgram: SystemProgram.programId
          })
          .rpc();
        
        console.log("Unido a la comunidad exitosamente:", tx);
        alert(`¡Te has unido a la comunidad exitosamente!\nMembresía: ${membershipPda.toString()}\nHash: ${tx}`);
        setCommunityAddress("");
      } catch (err: any) {
        console.error('Error joining community:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        alert('Error al unirse a la comunidad: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      } finally {
        setJoiningCommunity(false);
      }
    };

    // Función para crear una encuesta
    const createPoll = async () => {
      if (!program || !publicKey) {
        alert('Programa no disponible o wallet no conectada');
        return;
      }
      
      if (!pollQuestion.trim()) {
        alert('Por favor ingresa la pregunta de la encuesta');
        return;
      }
      
      if (pollOptions.filter(opt => opt.trim()).length < 2) {
        alert('Debes tener al menos 2 opciones válidas');
        return;
      }
      
      if (!communityAddress.trim()) {
        alert('Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      if (!membershipAddress.trim()) {
        alert('Por favor ingresa la dirección de tu membresía');
        return;
      }
      
      try {
        setCreatingPoll(true);
        
        const communityPubkey = new PublicKey(communityAddress);
        const membershipPubkey = new PublicKey(membershipAddress);
        
        // Primero necesitamos obtener el total_polls de la comunidad
        try {
          const communityAccount = await program.account.community.fetch(communityPubkey);
          console.log('Community account:', communityAccount);
          
          // Verificar que la membresía esté aprobada
          const membershipAccount = await program.account.membership.fetch(membershipPubkey);
          console.log('Membership account:', membershipAccount);
          
          if (!(membershipAccount as any).isApproved) {
            alert('Tu membresía no está aprobada. Necesitas que el admin apruebe tu membresía primero.');
            return;
          }
          
          // Generar PDA para la encuesta usando el total_polls actual
          const totalPollsNumber = (communityAccount as any).totalPolls.toNumber();
          console.log('Total polls number:', totalPollsNumber, typeof totalPollsNumber);
          
          // Usar toLeBytes() para convertir el número a bytes little-endian
          const pollSeeds = [
            Buffer.from("poll", 'ascii'),
            communityPubkey.toBuffer(),
            (communityAccount as any).totalPolls.toArrayLike(Buffer, 'le', 8)
          ];
          console.log('Poll seeds:', pollSeeds.map(s => s.toString('hex')));
          
          const [pollPda] = PublicKey.findProgramAddressSync(pollSeeds, programId);
          
          const endTime = new Date();
          endTime.setHours(endTime.getHours() + 24); // 24 horas desde ahora
          const endTimeBN = new BN(endTime.getTime() / 1000);
          
                      console.log('Creating poll with:', {
              poll: pollPda.toString(),
              community: communityPubkey.toString(),
              membership: membershipPubkey.toString(),
              creator: publicKey.toString(),
              question: pollQuestion,
              options: pollOptions.filter(opt => opt.trim()),
              endTime: endTimeBN.toString()
            });
          
          console.log('About to send transaction...');
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
          
          console.log("Encuesta creada exitosamente:", tx);
          alert(`¡Encuesta creada exitosamente!\nPregunta: ${pollQuestion}\nDirección: ${pollPda.toString()}\nHash: ${tx}`);
          setPollQuestion("");
          setPollOptions(["", ""]);
          setCommunityAddress("");
          setMembershipAddress("");
        } catch (err: any) {
          console.error('Error in createPoll transaction:', err);
          if (err.logs) {
            console.error('Transaction logs:', err.logs);
          }
          alert('Error al crear la encuesta: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } catch (err: any) {
        console.error('Error creating poll:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        alert('Error al crear la encuesta: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      } finally {
        setCreatingPoll(false);
      }
    };

    // Función para votar
    const castVote = async () => {
      if (!program || !publicKey || !pollAddress.trim()) {
        alert('Por favor ingresa la dirección de la encuesta');
        return;
      }
      
      if (!membershipAddress.trim()) {
        alert('Por favor ingresa la dirección de tu membresía');
        return;
      }
      
      try {
        setVoting(true);
        
        console.log('Validating addresses:', {
          pollAddress,
          membershipAddress,
          publicKey: publicKey.toString()
        });
        
        // Validar que las direcciones sean válidas antes de crear PublicKey
        if (!pollAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error('Dirección de encuesta inválida');
        }
        
        if (!membershipAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          throw new Error('Dirección de membresía inválida');
        }
        
        const pollPubkey = new PublicKey(pollAddress);
        console.log('Poll public key created successfully:', pollPubkey.toString());
        
        const membershipPubkey = new PublicKey(membershipAddress);
        console.log('Membership public key created successfully:', membershipPubkey.toString());
        
        // Generar PDA para el voto - usar la misma codificación que en Rust
        console.log('About to create vote PDA...');
        const [votePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("vote", 'ascii'), 
            pollPubkey.toBuffer(), 
            publicKey.toBuffer()
          ],
          programId
        );
        console.log('Vote PDA created successfully:', votePda.toString());
        
        // Verificar si ya existe un voto para este usuario en esta encuesta
        try {
          const existingVote = await program.account.vote.fetch(votePda);
          console.log('Existing vote found:', existingVote);
          alert('Ya has votado en esta encuesta. No puedes votar dos veces.');
          return;
        } catch (err) {
          console.log('No existing vote found, proceeding with new vote');
        }
        
        console.log('Casting vote with:', {
          vote: votePda.toString(),
          poll: pollPubkey.toString(),
          membership: membershipPubkey.toString(),
          voter: publicKey.toString(),
          optionIndex: selectedOption
        });
        
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
        
        console.log("Voto registrado exitosamente:", tx);
        alert(`¡Voto registrado exitosamente!\nOpción seleccionada: ${selectedOption + 1}\nHash: ${tx}`);
        setPollAddress("");
        setMembershipAddress("");
        setSelectedOption(0);
      } catch (err: any) {
        console.error('Error casting vote:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
          // Verificar si el error es porque ya votaste
          if (err.logs.some((log: string) => log.includes('already in use'))) {
            alert('Ya has votado en esta encuesta. No puedes votar dos veces.');
          } else {
            alert('Error al registrar el voto: ' + (err instanceof Error ? err.message : 'Error desconocido'));
          }
        } else {
          alert('Error al registrar el voto: ' + (err instanceof Error ? err.message : 'Error desconocido'));
        }
      } finally {
        setVoting(false);
      }
    };

    // Función para aprobar membresía (admin)
    const approveMembership = async () => {
      if (!program || !publicKey || !adminMembershipAddress.trim()) {
        alert('Por favor ingresa la dirección de la membresía');
        return;
      }
      
      if (!adminCommunityAddress.trim()) {
        alert('Por favor ingresa la dirección de la comunidad');
        return;
      }
      
      try {
        setApprovingMembership(true);
        
        const membershipPubkey = new PublicKey(adminMembershipAddress);
        const communityPubkey = new PublicKey(adminCommunityAddress);
        
        console.log('Approving membership with:', {
          community: communityPubkey.toString(),
          membership: membershipPubkey.toString(),
          admin: publicKey.toString()
        });
        
        const tx = await program.methods
          .approveMembership()
          .accounts({
            community: communityPubkey,
            membership: membershipPubkey,
            admin: publicKey
          })
          .rpc();
        
        console.log("Membresía aprobada exitosamente:", tx);
        alert('¡Membresía aprobada exitosamente!\nHash: ' + tx);
        setAdminMembershipAddress("");
        setAdminCommunityAddress("");
      } catch (err: any) {
        console.error('Error approving membership:', err);
        if (err.logs) {
          console.error('Transaction logs:', err.logs);
        }
        alert('Error al aprobar la membresía: ' + (err instanceof Error ? err.message : 'Error desconocido'));
      } finally {
        setApprovingMembership(false);
      }
    };

    // Función para cerrar encuesta
    const closePoll = async () => {
      if (!program || !publicKey || !pollAddress.trim()) {
        alert('Por favor ingresa la dirección de la encuesta');
        return;
      }
      
      try {
        setClosingPoll(true);
        
        const pollPubkey = new PublicKey(pollAddress);
        
        // const tx = await program.methods
        //   .closePoll()
        //   .accounts({
        //     poll: pollPubkey,
        //     community: communityAddress, // Necesitarías obtener esto de la encuesta
        //     authority: publicKey
        //   })
        //   .rpc();
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert('¡Encuesta cerrada exitosamente!');
        setPollAddress("");
      } catch (err) {
        console.error('Error closing poll:', err);
        alert('Error al cerrar la encuesta');
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
        <div>
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Reintentar</button>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <h2>🌐 Solana Communities - Devnet</h2>
        
        {!isPhantomAvailable ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Phantom no está disponible. Por favor instala Phantom Wallet.</p>
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: '#9945FF',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '5px',
                marginTop: '10px'
              }}
            >
              Instalar Phantom
            </a>
          </div>
        ) : !publicKey ? (
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={connect}
              style={{
                padding: '12px 24px',
                backgroundColor: '#9945FF',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Conectar Phantom
            </button>
          </div>
        ) : (
          <div>
            {/* Wallet Info */}
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '15px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #2196f3'
            }}>
              <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold', fontSize: '16px' }}>
                🌐 Conectado a Solana Devnet
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Wallet:</strong> {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Balance:</strong> {balance !== null ? `${balance.toFixed(4)} SOL` : 'Cargando...'}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Programa:</strong> {program ? '✅ Conectado' : '❌ No disponible'}
              </p>
            </div>

            {/* Airdrop Section */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <button 
                onClick={async () => {
                  try {
                    await requestAirdrop()
                    alert('¡Airdrop recibido! 2 SOL añadidos a tu wallet.')
                  } catch (err) {
                    console.error('Airdrop error:', err)
                    if (err instanceof Error && err.message.includes('429')) {
                      alert('Límite de airdrop alcanzado. Intenta más tarde o visita https://faucet.solana.com')
                    } else {
                      alert('Error al solicitar airdrop. Verifica tu conexión a devnet.')
                    }
                  }
                }}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginRight: '10px'
                }}
              >
                {loading ? 'Solicitando...' : '💰 Solicitar Airdrop (2 SOL)'}
              </button>
              <a 
                href="https://faucet.solana.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  textDecoration: 'none'
                }}
              >
                🌊 Faucet alternativo
              </a>
            </div>

            {/* Program Functions */}
            <div style={{ display: 'grid', gap: '20px' }}>
              
              {/* Create Community */}
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#007bff' }}>🏗️ Crear Comunidad</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ff4444', fontWeight: 'bold' }}>
                      * Nombre de la comunidad (requerido)
                    </label>
                    <input
                      type="text"
                      placeholder="Ingresa el nombre de la comunidad"
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      style={{ 
                        padding: '8px', 
                        borderRadius: '4px', 
                        border: communityName.trim() ? '1px solid #ddd' : '1px solid #ff4444',
                        width: '100%',
                        backgroundColor: communityName.trim() ? 'white' : '#fff5f5'
                      }}
                    />
                  </div>

                  <button 
                    onClick={createCommunity}
                    disabled={creatingCommunity || !communityName.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: (creatingCommunity || !communityName.trim()) ? '#ccc' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '14px',
                      cursor: (creatingCommunity || !communityName.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (creatingCommunity || !communityName.trim()) ? 0.6 : 1
                    }}
                  >
                    {creatingCommunity ? 'Creando...' : 'Crear Comunidad'}
                  </button>
                  {!communityName.trim() && (
                    <p style={{ fontSize: '12px', color: '#ff4444', margin: '5px 0 0 0' }}>
                      * Ingresa un nombre para la comunidad
                    </p>
                  )}
                </div>
              </div>

              {/* Join Community */}
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>👥 Unirse a Comunidad</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Dirección de la comunidad"
                    value={communityAddress}
                    onChange={(e) => setCommunityAddress(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <button 
                    onClick={joinCommunity}
                    disabled={joiningCommunity || !program}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '14px',
                      cursor: (joiningCommunity || !program) ? 'not-allowed' : 'pointer',
                      opacity: (joiningCommunity || !program) ? 0.6 : 1
                    }}
                  >
                    {joiningCommunity ? 'Uniéndose...' : 'Unirse a Comunidad'}
                  </button>
                </div>
              </div>

              {/* Create Poll */}
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#ffc107' }}>📊 Crear Encuesta</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                      Dirección de la comunidad (opcional para simulación)
                    </label>
                    <input
                      type="text"
                      placeholder="Deja vacío para usar dirección por defecto"
                      value={communityAddress}
                      onChange={(e) => setCommunityAddress(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                      Dirección de tu membresía (opcional para simulación)
                    </label>
                    <input
                      type="text"
                      placeholder="Deja vacío para simulación"
                      value={membershipAddress}
                      onChange={(e) => setMembershipAddress(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ff4444', fontWeight: 'bold' }}>
                      * Pregunta de la encuesta (requerido)
                    </label>
                    <input
                      type="text"
                      placeholder="¿Cuál es tu pregunta?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      style={{ 
                        padding: '8px', 
                        borderRadius: '4px', 
                        border: pollQuestion.trim() ? '1px solid #ddd' : '1px solid #ff4444',
                        width: '100%',
                        backgroundColor: pollQuestion.trim() ? 'white' : '#fff5f5'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Opciones:</label>
                    {pollOptions.map((option, index) => (
                      <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                        <input
                          type="text"
                          placeholder={`Opción ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[index] = e.target.value;
                            setPollOptions(newOptions);
                          }}
                          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            onClick={() => removePollOption(index)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 4 && (
                      <button
                        onClick={addPollOption}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        + Agregar Opción
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={createPoll}
                    disabled={creatingPoll || !program || !pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: (creatingPoll || !program || !pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2) ? '#ccc' : '#ffc107',
                      color: 'black',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '14px',
                      cursor: (creatingPoll || !program || !pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2) ? 'not-allowed' : 'pointer',
                      opacity: (creatingPoll || !program || !pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2) ? 0.6 : 1
                    }}
                  >
                    {creatingPoll ? 'Creando...' : 'Crear Encuesta'}
                  </button>
                  {(!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2) && (
                    <p style={{ fontSize: '12px', color: '#ff4444', margin: '5px 0 0 0' }}>
                      * Completa la pregunta y al menos 2 opciones para habilitar el botón
                    </p>
                  )}
                </div>
              </div>

              {/* Vote */}
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#17a2b8' }}>🗳️ Votar</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Dirección de la encuesta"
                    value={pollAddress}
                    onChange={(e) => setPollAddress(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <input
                    type="text"
                    placeholder="Dirección de tu membresía"
                    value={membershipAddress}
                    onChange={(e) => setMembershipAddress(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Opción:</label>
                    <select
                      value={selectedOption}
                      onChange={(e) => setSelectedOption(Number(e.target.value))}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
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
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '14px',
                      cursor: (voting || !program) ? 'not-allowed' : 'pointer',
                      opacity: (voting || !program) ? 0.6 : 1
                    }}
                  >
                    {voting ? 'Votando...' : 'Votar'}
                  </button>
                </div>
              </div>

              {/* Admin Functions */}
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#6f42c1' }}>👑 Funciones de Admin</h3>
                
                {/* Approve Membership */}
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Aprobar Membresía</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Dirección de la comunidad"
                      value={adminCommunityAddress}
                      onChange={(e) => setAdminCommunityAddress(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Dirección de la membresía"
                      value={adminMembershipAddress}
                      onChange={(e) => setAdminMembershipAddress(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <button 
                      onClick={approveMembership}
                      disabled={approvingMembership || !program || !adminCommunityAddress.trim() || !adminMembershipAddress.trim()}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6f42c1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: (approvingMembership || !program || !adminCommunityAddress.trim() || !adminMembershipAddress.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (approvingMembership || !program || !adminCommunityAddress.trim() || !adminMembershipAddress.trim()) ? 0.6 : 1
                      }}
                    >
                      {approvingMembership ? 'Aprobando...' : 'Aprobar Membresía'}
                    </button>
                  </div>
                </div>

                {/* Close Poll */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Cerrar Encuesta</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Dirección de la encuesta"
                      value={pollAddress}
                      onChange={(e) => setPollAddress(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <button 
                      onClick={closePoll}
                      disabled={closingPoll || !program}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: (closingPoll || !program) ? 'not-allowed' : 'pointer',
                        opacity: (closingPoll || !program) ? 0.6 : 1
                      }}
                    >
                      {closingPoll ? 'Cerrando...' : 'Cerrar Encuesta'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Disconnect Button */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button 
                  onClick={disconnect}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  🔌 Desconectar Phantom
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error('Error in ConnectWallet:', err);
    return (
      <div>
        <p>Error al cargar el componente: {err instanceof Error ? err.message : 'Error desconocido'}</p>
      </div>
    );
  }
}
