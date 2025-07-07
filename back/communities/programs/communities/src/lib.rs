use anchor_lang::prelude::*;

declare_id!("6Cy6o9mfHJkwN2VrTVGHT6Jp9rhSp88thgEJFTyw2JBi");

#[program]
pub mod communities {
    use super::*;

    pub fn initialize_community(
        ctx: Context<InitializeCommunity>,
        name: String,
        description: String,
    ) -> Result<()> {
        let community = &mut ctx.accounts.community;
        community.admin = ctx.accounts.admin.key();
        community.name = name;
        community.description = description;
        community.member_count = 0;
        community.total_polls = 0;
        community.bump = ctx.bumps.community;

        Ok(())
    }

    pub fn join_community(ctx: Context<JoinCommunity>) -> Result<()> {
        let membership = &mut ctx.accounts.membership;
        membership.community = ctx.accounts.community.key();
        membership.member = ctx.accounts.member.key();
        membership.is_approved = false; // Requires admin to approve
        membership.joined_at = Clock::get()?.unix_timestamp;
        membership.bump = ctx.bumps.membership;

        Ok(())
    }

    // only admin
    pub fn approve_membership(ctx: Context<ApproveMembership>) -> Result<()> {
        require!(
            ctx.accounts.community.admin == ctx.accounts.admin.key(),
            CommunityError::Unauthorized
        );

        let membership = &mut ctx.accounts.membership;
        membership.is_approved = true;

        let community = &mut ctx.accounts.community;
        community.member_count += 1;

        Ok(())
    }

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        question: String,
        options: Vec<String>,
        end_time: i64,
    ) -> Result<()> {
        require!(
            options.len() >= 2 && options.len() <= 4,
            CommunityError::InvalidOptionCount
        );

        require!(
            end_time > Clock::get()?.unix_timestamp,
            CommunityError::InvalidEndTime
        );

        require!(
            ctx.accounts.membership.is_approved,
            CommunityError::NotApprovedMember
        );

        let poll = &mut ctx.accounts.poll;
        poll.community = ctx.accounts.community.key();
        poll.creator = ctx.accounts.creator.key();
        poll.question = question;
        poll.options = options.clone();
        poll.vote_counts = vec![0; options.len()];
        poll.end_time = end_time;
        poll.total_votes = 0;
        poll.is_active = true;
        poll.bump = ctx.bumps.poll;

        let community = &mut ctx.accounts.community;
        community.total_polls += 1;

        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        option_index: u8,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        require!(poll.is_active, CommunityError::PollNotActive);

        require!(
            Clock::get()?.unix_timestamp < poll.end_time,
            CommunityError::PollExpired
        );

        require!(
            (option_index as usize) < poll.options.len(),
            CommunityError::InvalidOptionIndex
        );

        require!(
            ctx.accounts.membership.is_approved,
            CommunityError::NotApprovedMember
        );

        require!(
            ctx.accounts.vote.poll != poll.key(),
            CommunityError::AlreadyVoted
        );

        let vote = &mut ctx.accounts.vote;
        vote.poll = poll.key();
        vote.voter = ctx.accounts.voter.key();
        vote.option_index = option_index;
        vote.voted_at = Clock::get()?.unix_timestamp;
        vote.bump = ctx.bumps.vote;

        poll.vote_counts[option_index as usize] += 1;
        poll.total_votes += 1;

        Ok(())
    }

     // (only creator || admin)
     pub fn close_poll(
        ctx: Context<ClosePoll>,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let community = &ctx.accounts.community;

        require!(
            poll.creator == ctx.accounts.authority.key() || 
            community.admin == ctx.accounts.authority.key(),
            CommunityError::UnauthorizedToClose
        );

        poll.is_active = false;

        Ok(())
    }

}

// ------> Structs
#[account]
pub struct Community {
    pub admin: Pubkey,
    pub name: String,
    pub description: String,
    pub member_count: u64,
    pub total_polls: u64,
    pub bump: u8,
}

#[account]
pub struct Membership {
    pub community: Pubkey,
    pub member: Pubkey,
    pub is_approved: bool,
    pub joined_at: i64,
    pub bump: u8,
}

#[account]
pub struct Poll {
    pub community: Pubkey,
    pub creator: Pubkey,
    pub question: String,
    pub options: Vec<String>,
    pub vote_counts: Vec<u64>,
    pub end_time: i64,
    pub total_votes: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
pub struct Vote {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
    pub voted_at: i64,
    pub bump: u8,
}

// Contexts
#[derive(Accounts)]
// This attribute allows the Anchor framework to pass the `name` argument
// to the `InitializeCommunity` context, so it can be used for PDA seeds
#[instruction(name: String)]
pub struct InitializeCommunity<'info> {
    // This attribute defines how the 'community' account is initialized.
    // - 'init': creates the account if it doesn't exist.
    // - 'payer = admin': the admin pays for the account creation.
    // - 'space': allocates enough space for the account data.
    // - 'seeds': uses "community" and the name as seeds for the PDA.
    // - 'bump': includes the bump seed for PDA derivation.
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 4 + name.len() + 4 + 200 + 8 + 8 + 1,
        seeds = [b"community", name.as_bytes()],
        bump
    )]
    pub community: Account<'info, Community>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinCommunity<'info> {
    #[account(
        init,
        payer = member,
        space = 8 + 32 + 32 + 1 + 8 + 1,
        seeds = [b"membership", community.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, Membership>,
    pub community: Account<'info, Community>,
    #[account(mut)]
    pub member: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveMembership<'info> {
    #[account(mut)]
    pub community: Account<'info, Community>,
    #[account(mut)]
    pub membership: Account<'info, Membership>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(question: String)]
pub struct CreatePoll<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 4 + question.len() + 200 + 100 + 8 + 8 + 1 + 1,
        seeds = [b"poll", community.key().as_ref(), &community.total_polls.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub community: Account<'info, Community>,
    #[account(
        constraint = membership.community == community.key(),
        constraint = membership.member == creator.key()
    )]
    pub membership: Account<'info, Membership>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1 + 8 + 1,
        seeds = [b"vote", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    #[account(mut)]
    pub poll: Account<'info, Poll>,
    #[account(
        constraint = membership.community == poll.community,
        constraint = membership.member == voter.key()
    )]
    pub membership: Account<'info, Membership>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
    pub community: Account<'info, Community>,
    pub authority: Signer<'info>,
}

// ------> Custom Errors
#[error_code]
pub enum CommunityError {
    #[msg("You are not authorized for this action")]
    Unauthorized,
    #[msg("Invalid number of options (must be between 2 and 4)")]
    InvalidOptionCount,
    #[msg("Invalid end date")]
    InvalidEndTime,
    #[msg("You are not an approved member of this community")]
    NotApprovedMember,
    #[msg("The poll is not active")]
    PollNotActive,
    #[msg("The poll has expired")]
    PollExpired,
    #[msg("Invalid option index")]
    InvalidOptionIndex,
    #[msg("You are not authorized to close this poll")]
    UnauthorizedToClose,
    #[msg("You have already voted for this poll")]
    AlreadyVoted,
}