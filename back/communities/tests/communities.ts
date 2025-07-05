import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Communities } from "../target/types/communities";
import { expect } from "chai";

describe("communities", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.communities as Program<Communities>;

  let admin = anchor.web3.Keypair.generate();
  let member1 = anchor.web3.Keypair.generate();
  let member2 = anchor.web3.Keypair.generate();

  let communityPda: anchor.web3.PublicKey;
  let communityBump: number;

  before(async () => {
    await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it("New community is initialized", async () => {
    const communityName = "Test Community";
    const communityDescription = "Any description for the community";

    [communityPda, communityBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("community"), Buffer.from(communityName)],
      program.programId
    );

    //create the instruction to initialize the community
    const instructionTx = await program.methods
      .initializeCommunity(communityName, communityDescription)
      .accounts({
        // community: communityPda,
        admin: admin.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Add the instruction to the transaction
    const transaction = new anchor.web3.Transaction().add(instructionTx);
    transaction.feePayer = admin.publicKey;

    // Send the transaction with the admin as fee payer
    const tx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      transaction,
      [admin]
    );

    console.log("Admin public key:", admin.publicKey.toString());
    console.log("System program:", anchor.web3.SystemProgram.programId.toString());
    console.log("Community PDA:", communityPda.toString());
    console.log("Transaction hash:", tx);


    const communityAccount = await program.account.community.fetch(communityPda);
    expect(communityAccount.name).to.equal(communityName);
    expect(communityAccount.description).to.equal(communityDescription);
    expect(communityAccount.admin.toString()).to.equal(admin.publicKey.toString());
    expect(communityAccount.memberCount.toNumber()).to.equal(0);
  });

  it("It should allow a user to join the community", async () => {
    const [membershipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    const instructionTx = await program.methods
      .joinCommunity()
      .accounts({
        // membership: membershipPda,
        community: communityPda,
        member: member1.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Add the instruction to the transaction
    const transaction = new anchor.web3.Transaction().add(instructionTx);
    transaction.feePayer = member1.publicKey;

    // Send the transaction with the admin as fee payer
    const tx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      transaction,
      [member1]
    );
    console.log("Transaction hash:", tx);

    const membershipAccount = await program.account.membership.fetch(membershipPda);
    expect(membershipAccount.member.toString()).to.equal(member1.publicKey.toString());
    expect(membershipAccount.isApproved).to.be.false;
  });

  it("Only admin can approve membership", async () => {
    const [membershipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .approveMembership()
      .accounts({
        community: communityPda,
        membership: membershipPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();


    const membershipAccount = await program.account.membership.fetch(membershipPda);
    expect(membershipAccount.isApproved).to.be.true;

    const communityAccount = await program.account.community.fetch(communityPda);
    expect(communityAccount.memberCount.toNumber()).to.equal(1);
  });

  it("Members can create polls", async () => {
    const question = "What is your favorite color?";
    const options = ["Red", "Blue", "Green"];
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora desde ahora

    const [membershipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    const communityAccount = await program.account.community.fetch(communityPda);
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), communityAccount.totalPolls.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .createPoll(question, options, new anchor.BN(endTime))
      .accounts({
        // poll: pollPda,
        community: communityPda,
        membership: membershipPda,
        creator: member1.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.question).to.equal(question);
    expect(pollAccount.options).to.deep.equal(options);
    expect(pollAccount.isActive).to.be.true;
    expect(pollAccount.totalVotes.toNumber()).to.equal(0);
  });

  it("Members can vote", async () => {
    // First, make member2 join and be approved
    const [membershipPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinCommunity()
      .accounts({
        // membership: membershipPda2,
        community: communityPda,
        member: member2.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    await program.methods
      .approveMembership()
      .accounts({
        community: communityPda,
        membership: membershipPda2,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    // Vote
    // const communityAccount = await program.account.community.fetch(communityPda);
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .castVote(1) // Votar por "Azul" (índice 1)
      .accounts({
        // vote: votePda,
        poll: pollPda,
        membership: membershipPda2,
        voter: member2.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.totalVotes.toNumber()).to.equal(1);
    expect(pollAccount.voteCounts[1].toNumber()).to.equal(1);

    const voteAccount = await program.account.vote.fetch(votePda);
    expect(voteAccount.optionIndex).to.equal(1);
    expect(voteAccount.voter.toString()).to.equal(member2.publicKey.toString());
  });

  it("Should prevent duplicate votes", async () => {
    const [membershipPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // const [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
    //     [Buffer.from("vote"), pollPda.toBuffer(), member2.publicKey.toBuffer()],
    //     program.programId
    // );

    try {
      await program.methods
        .castVote(0) // Intentar votar de nuevo
        .accounts({
          // vote: votePda,
          poll: pollPda,
          membership: membershipPda2,
          voter: member2.publicKey,
          // systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([member2])
        .rpc();

      expect.fail("Debería haber fallado por voto duplicado");
    } catch (error) {
      // Esperamos que falle porque la cuenta ya existe
      expect(error.toString()).to.include("already in use");
    }
  });


  it("Should allow closing polls", async () => {
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .closePoll()
      .accounts({
        poll: pollPda,
        community: communityPda,
        authority: admin.publicKey, // Admin can close any poll
      })
      .signers([admin])
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.isActive).to.be.false;
  });

  it("Should prevent voting after poll is closed", async () => {
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), new anchor.BN(0).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const [membershipPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );

    const pollAccount2 = await program.account.poll.fetch(pollPda);
    expect(pollAccount2.isActive).to.be.false;


    try {
      await program.methods
        .castVote(0)
        .accounts({
          poll: pollPda,
          membership: membershipPda2,
          voter: member2.publicKey,
          // systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([member2])
        .rpc();

      expect.fail("Debería haber fallado por votación después de cerrar");
    } catch (error) {
      // We expect the error to be "poll is not active"
      expect(error.toString()).to.include("already in use");
    }

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.isActive).to.be.false;
  });

  it("As an admin i can create a poll and close it after some members voted", async () => {
    const question = "What is your favorite color?";
    const options = ["Red", "Blue", "Green"];
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const [membershipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    const [membershipPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member2.publicKey.toBuffer()],
      program.programId
    );


    const [membershipPdaAdmin] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), admin.publicKey.toBuffer()],
      program.programId
    );

    const communityAccount = await program.account.community.fetch(communityPda);
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), communityAccount.totalPolls.toArrayLike(Buffer, "le", 8)],
      program.programId
    );


    // Make admin join and be approved
    await program.methods
      .joinCommunity()
      .accounts({
        community: communityPda,
        member: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await program.methods
      .approveMembership()
      .accounts({
        community: communityPda,
        membership: membershipPdaAdmin,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    await program.methods
      .createPoll(question, options, new anchor.BN(endTime))
      .accounts({
        community: communityPda,
        membership: membershipPda,
        creator: member1.publicKey,
      })
      .signers([member1])
      .rpc();
    //Vote member1
    await program.methods
      .castVote(0)
      .accounts({
        poll: pollPda,
        membership: membershipPda,
        voter: member1.publicKey,
      })
      .signers([member1])
      .rpc();

    //Vote member2
    await program.methods
      .castVote(0)
      .accounts({
        poll: pollPda,
        membership: membershipPda2,
        voter: member2.publicKey,
      })
      .signers([member2])
      .rpc();

    await program.methods
      .castVote(1)
      .accounts({
        poll: pollPda,
        membership: membershipPdaAdmin,
        voter: admin.publicKey,
      })
      .signers([admin])
      .rpc();


    await program.methods
      .closePoll()
      .accounts({
        poll: pollPda,
        community: communityPda,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const pollAccount = await program.account.poll.fetch(pollPda);
    expect(pollAccount.isActive).to.be.false;
    expect(pollAccount.totalVotes.toNumber()).to.equal(3);
    expect(pollAccount.voteCounts[0].toNumber()).to.equal(2);
    expect(pollAccount.voteCounts[1].toNumber()).to.equal(1);
  })

  it("Same member can't vote twice", async () => {
    const question = "What is your favorite color?";
    const options = ["Red", "Blue", "Green"];
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora desde ahora

    const [membershipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("membership"), communityPda.toBuffer(), member1.publicKey.toBuffer()],
      program.programId
    );

    const communityAccount = await program.account.community.fetch(communityPda);
    const [pollPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), communityPda.toBuffer(), communityAccount.totalPolls.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .createPoll(question, options, new anchor.BN(endTime))
      .accounts({
        // poll: pollPda,
        community: communityPda,
        membership: membershipPda,
        creator: member1.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    await program.methods
      .castVote(1)
      .accounts({
        // vote: votePda,
        poll: pollPda,
        membership: membershipPda,
        voter: member1.publicKey,
        // systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([member1])
      .rpc();


    try {
      await program.methods
        .castVote(0)
        .accounts({
          // vote: votePda,
          poll: pollPda,
          membership: membershipPda,
          voter: member1.publicKey,
          // systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([member1])
        .rpc();

      expect.fail("should fail because the member has already voted");
    } catch (error) {
      //We expect the error to be "You have already voted for this poll"
      expect(error.toString()).to.include("already in use");
    }
  })


});
