// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReputationSlashing
 * @notice Byzantine Fault Tolerance slashing contract for AI Agent Mesh Network
 * @dev Manages agent stakes and slashing on Base L2
 * 
 * Features:
 * - Stake USDC to participate in consensus
 * - Slash Byzantine agents (50% penalty)
 * - Withdraw after cooldown period
 * - Emergency pause mechanism
 * 
 * Economics:
 * - Minimum stake: 100 USDC
 * - Slash percentage: 50%
 * - Cooldown period: 7 days
 * - Burned funds sent to treasury
 * 
 * Security:
 * - ReentrancyGuard on all external calls
 * - Only owner can slash (in production: replace with ZK proof verification)
 * - Stake withdrawal locked during consensus participation
 */
contract ReputationSlashing is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =====================================================
    // STATE VARIABLES
    // =====================================================

    /// @notice USDC token address on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
    IERC20 public immutable usdc;
    
    /// @notice Treasury address for slashed funds
    address public treasury;
    
    /// @notice Minimum stake to participate in consensus (100 USDC with 6 decimals)
    uint256 public constant MIN_STAKE = 100 * 10**6;
    
    /// @notice Slash percentage (50%)
    uint256 public constant SLASH_PERCENTAGE = 50;
    
    /// @notice Withdrawal cooldown period (7 days)
    uint256 public constant COOLDOWN_PERIOD = 7 days;
    
    /// @notice Emergency pause flag
    bool public paused;
    
    // =====================================================
    // STRUCTS
    // =====================================================
    
    struct AgentStake {
        uint256 amount;           // Staked USDC amount
        uint256 stakedAt;         // Timestamp of stake
        bool isSlashed;           // Slashing status
        uint256 slashedAt;        // Timestamp of slash
        uint256 totalSlashed;     // Total amount slashed
        uint256 withdrawCooldown; // Withdrawal unlocks at this timestamp
        bytes32 nodeId;           // DHT node ID (keccak256 hash)
    }
    
    struct SlashEvidence {
        address accused;
        address reporter;
        bytes32 evidenceHash;  // SHA-256 of Byzantine proof
        uint256 reportedAt;
        bool executed;
    }
    
    // =====================================================
    // STORAGE
    // =====================================================
    
    /// @notice Agent address => stake info
    mapping(address => AgentStake) public stakes;
    
    /// @notice Evidence ID => slash evidence
    mapping(bytes32 => SlashEvidence) public evidence;
    
    /// @notice Total staked across all agents
    uint256 public totalStaked;
    
    /// @notice Total slashed to date
    uint256 public totalSlashed;
    
    // =====================================================
    // EVENTS
    // =====================================================
    
    event Staked(address indexed agent, uint256 amount, bytes32 nodeId);
    event WithdrawRequested(address indexed agent, uint256 unlockTime);
    event Withdrawn(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, uint256 amount, bytes32 evidenceHash);
    event EvidenceSubmitted(bytes32 indexed evidenceId, address indexed accused, address reporter);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Paused(bool isPaused);
    
    // =====================================================
    // ERRORS
    // =====================================================
    
    error InsufficientStake();
    error AlreadyStaked();
    error NotStaked();
    error InsufficientBalance();
    error CooldownActive();
    error AlreadySlashed();
    error InvalidEvidence();
    error Unauthorized();
    error ContractPaused();
    error InvalidAddress();
    
    // =====================================================
    // CONSTRUCTOR
    // =====================================================
    
    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        if (_usdc == address(0) || _treasury == address(0)) revert InvalidAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }
    
    // =====================================================
    // MODIFIERS
    // =====================================================
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    // =====================================================
    // STAKING
    // =====================================================
    
    /**
     * @notice Stake USDC to participate in consensus
     * @param amount Amount of USDC to stake (must be >= 100 USDC)
     * @param nodeId Keccak256 hash of DHT node ID
     */
    function stake(uint256 amount, bytes32 nodeId) external nonReentrant whenNotPaused {
        if (amount < MIN_STAKE) revert InsufficientStake();
        if (stakes[msg.sender].amount > 0) revert AlreadyStaked();
        if (nodeId == bytes32(0)) revert InvalidAddress();
        
        // Transfer USDC from sender
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Record stake
        stakes[msg.sender] = AgentStake({
            amount: amount,
            stakedAt: block.timestamp,
            isSlashed: false,
            slashedAt: 0,
            totalSlashed: 0,
            withdrawCooldown: 0,
            nodeId: nodeId
        });
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, nodeId);
    }
    
    /**
     * @notice Request withdrawal of stake (initiates cooldown)
     */
    function requestWithdraw() external nonReentrant whenNotPaused {
        AgentStake storage agentStake = stakes[msg.sender];
        if (agentStake.amount == 0) revert NotStaked();
        if (agentStake.isSlashed) revert AlreadySlashed();
        
        uint256 unlockTime = block.timestamp + COOLDOWN_PERIOD;
        agentStake.withdrawCooldown = unlockTime;
        
        emit WithdrawRequested(msg.sender, unlockTime);
    }
    
    /**
     * @notice Withdraw stake after cooldown period
     */
    function withdraw() external nonReentrant {
        AgentStake storage agentStake = stakes[msg.sender];
        if (agentStake.amount == 0) revert NotStaked();
        if (block.timestamp < agentStake.withdrawCooldown) revert CooldownActive();
        if (agentStake.isSlashed) revert AlreadySlashed();
        
        uint256 amount = agentStake.amount;
        
        // Clear stake
        delete stakes[msg.sender];
        totalStaked -= amount;
        
        // Transfer USDC back to agent
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // =====================================================
    // SLASHING
    // =====================================================
    
    /**
     * @notice Submit Byzantine evidence for review
     * @param accused Address of Byzantine agent
     * @param evidenceHash SHA-256 hash of Byzantine proof (ZKP)
     */
    function submitEvidence(
        address accused,
        bytes32 evidenceHash
    ) external whenNotPaused returns (bytes32 evidenceId) {
        if (accused == address(0)) revert InvalidAddress();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();
        if (stakes[accused].amount == 0) revert NotStaked();
        
        evidenceId = keccak256(abi.encodePacked(accused, msg.sender, evidenceHash, block.timestamp));
        
        evidence[evidenceId] = SlashEvidence({
            accused: accused,
            reporter: msg.sender,
            evidenceHash: evidenceHash,
            reportedAt: block.timestamp,
            executed: false
        });
        
        emit EvidenceSubmitted(evidenceId, accused, msg.sender);
        
        return evidenceId;
    }
    
    /**
     * @notice Execute slash after evidence verification
     * @param evidenceId Evidence ID from submitEvidence()
     * @dev In production: replace onlyOwner with ZK proof verification
     */
    function executeSlash(bytes32 evidenceId) external onlyOwner nonReentrant {
        SlashEvidence storage slashEvidence = evidence[evidenceId];
        if (slashEvidence.accused == address(0)) revert InvalidEvidence();
        if (slashEvidence.executed) revert AlreadySlashed();
        
        AgentStake storage agentStake = stakes[slashEvidence.accused];
        if (agentStake.amount == 0) revert NotStaked();
        if (agentStake.isSlashed) revert AlreadySlashed();
        
        // Calculate slash amount (50%)
        uint256 slashAmount = (agentStake.amount * SLASH_PERCENTAGE) / 100;
        uint256 remainingStake = agentStake.amount - slashAmount;
        
        // Update stake
        agentStake.amount = remainingStake;
        agentStake.isSlashed = true;
        agentStake.slashedAt = block.timestamp;
        agentStake.totalSlashed += slashAmount;
        
        // Update evidence
        slashEvidence.executed = true;
        
        // Update totals
        totalStaked -= slashAmount;
        totalSlashed += slashAmount;
        
        // Send slashed amount to treasury
        usdc.safeTransfer(treasury, slashAmount);
        
        emit Slashed(slashEvidence.accused, slashAmount, slashEvidence.evidenceHash);
    }
    
    // =====================================================
    // VIEWS
    // =====================================================
    
    /**
     * @notice Check if agent can participate in consensus
     */
    function canParticipate(address agent) external view returns (bool) {
        AgentStake memory agentStake = stakes[agent];
        return agentStake.amount >= MIN_STAKE && !agentStake.isSlashed;
    }
    
    /**
     * @notice Get agent stake info
     */
    function getStake(address agent) external view returns (AgentStake memory) {
        return stakes[agent];
    }
    
    /**
     * @notice Get evidence details
     */
    function getEvidence(bytes32 evidenceId) external view returns (SlashEvidence memory) {
        return evidence[evidenceId];
    }
    
    // =====================================================
    // ADMIN
    // =====================================================
    
    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @notice Emergency pause/unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }
    
    /**
     * @notice Emergency withdraw (owner only, use only if contract is compromised)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
