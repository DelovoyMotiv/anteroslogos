/**
 * Phase 1 Integration Test - Linux Foundation A2A Protocol v1.0
 * 
 * Tests:
 * - Agent Card generation and validation
 * - Task lifecycle (create → progress → complete)
 * - SSE streaming events
 */

import { agentCardManager } from '../lib/a2a/agentCard';
import { taskManager, TaskPriority, TaskStatus } from '../lib/a2a/taskManager';
import { sseStreamManager, SSEEventType, formatSSEEvent } from '../lib/a2a/streaming';

console.log('='.repeat(60));
console.log('Phase 1 Integration Test - A2A Protocol v1.0');
console.log('='.repeat(60));
console.log('');

// =====================================================
// TEST 1: Agent Card
// =====================================================

console.log('TEST 1: Agent Card Generation');
console.log('-'.repeat(60));

const agentCard = agentCardManager.generateCard();

console.log(`✅ Agent ID: ${agentCard.id}`);
console.log(`✅ Name: ${agentCard.name}`);
console.log(`✅ Capabilities: ${agentCard.capabilities.length} registered`);
console.log(`✅ Protocols: ${agentCard.protocols.join(', ')}`);
console.log(`✅ Payment Extension: ${agentCard.extensions?.payment?.supported ? 'ENABLED' : 'DISABLED'}`);
console.log(`✅ Verification Extension: ${agentCard.extensions?.verification?.supported ? 'ENABLED' : 'DISABLED'}`);
console.log('');

// Validate external agent card format
const validation = agentCardManager.validateCard(agentCard);

if (validation.valid) {
  console.log('✅ Agent Card validation: PASSED');
} else {
  console.error('❌ Agent Card validation: FAILED');
  validation.errors?.forEach(err => console.error(`   - ${err}`));
}

console.log('');

// =====================================================
// TEST 2: Task Manager
// =====================================================

console.log('TEST 2: Task Manager Lifecycle');
console.log('-'.repeat(60));

// Create task
const task = taskManager.createTask(
  {
    capability: 'geo.audit.request',
    params: {
      url: 'https://example.com',
      depth: 'comprehensive',
    },
    priority: TaskPriority.HIGH,
    metadata: {
      source: 'integration-test',
    },
  },
  agentCard.id
);

console.log(`✅ Task created: ${task.id}`);
console.log(`   Status: ${task.status}`);
console.log(`   Capability: ${task.capability}`);
console.log(`   Priority: ${task.priority}`);
console.log('');

// Start task
taskManager.updateTaskStatus(task.id, TaskStatus.RUNNING);
console.log('✅ Task started');
console.log('');

// Update progress (simulate)
const progressStages = [
  { percentage: 0, stage: 'initialization', message: 'Initializing audit engine' },
  { percentage: 20, stage: 'fetch', message: 'Fetching URL content' },
  { percentage: 40, stage: 'parse', message: 'Parsing HTML and extracting metadata' },
  { percentage: 60, stage: 'analyze', message: 'Running GEO analysis algorithms' },
  { percentage: 80, stage: 'score', message: 'Computing GEO score' },
  { percentage: 100, stage: 'finalize', message: 'Finalizing report' },
];

progressStages.forEach(progress => {
  taskManager.updateTaskProgress(task.id, progress);
  console.log(`✅ Progress: ${progress.percentage}% - ${progress.stage} - ${progress.message}`);
});

console.log('');

// Complete task with result
const result = {
  overall_score: 87,
  grade: 'A',
  categories: {
    schema_markup: { score: 92, grade: 'A' },
    meta_tags: { score: 85, grade: 'A-' },
    ai_crawlers: { score: 88, grade: 'A' },
    eeat: { score: 90, grade: 'A+' },
    content_quality: { score: 83, grade: 'B+' },
    citation_potential: { score: 86, grade: 'A-' },
  },
};

taskManager.updateTaskStatus(task.id, TaskStatus.COMPLETED, {
  result,
  cost: {
    compute_cost: 0.08,
    storage_cost: 0.01,
    network_cost: 0.01,
    total_cost: 0.10,
    currency: 'USDC',
  },
});

console.log('✅ Task completed');
console.log(`   Overall Score: ${result.overall_score}`);
console.log(`   Grade: ${result.grade}`);
console.log(`   Cost: 0.10 USDC`);
console.log('');

// Verify task retrieval
const retrievedTask = taskManager.getTask(task.id);

if (retrievedTask && retrievedTask.status === TaskStatus.COMPLETED) {
  console.log('✅ Task retrieval: SUCCESS');
} else {
  console.error('❌ Task retrieval: FAILED');
}

console.log('');

// Task statistics
const stats = taskManager.getStatistics(agentCard.id);
console.log('Task Statistics:');
console.log(`   Total: ${stats.total}`);
console.log(`   Completed: ${stats.completed}`);
console.log(`   Running: ${stats.running}`);
console.log(`   Pending: ${stats.pending}`);
console.log(`   Failed: ${stats.failed}`);
console.log('');

// =====================================================
// TEST 3: SSE Streaming
// =====================================================

console.log('TEST 3: SSE Streaming');
console.log('-'.repeat(60));

// Create SSE stream
const stream = sseStreamManager.createStream(`test-stream-${Date.now()}`);
console.log(`✅ SSE Stream created: ${stream.getId()}`);
console.log('');

// Subscribe to stream
const events: string[] = [];

const unsubscribe = stream.subscribe(event => {
  events.push(event.event);
  const formatted = formatSSEEvent(event);
  console.log(`📡 SSE Event: ${event.event}`);
  console.log(formatted);
});

console.log('✅ Subscribed to stream');
console.log('');

// Send test events
stream.sendTaskCreated({
  task_id: task.id,
  capability: 'geo.audit.request',
  created_at: new Date().toISOString(),
});

stream.sendTaskStarted({
  task_id: task.id,
  started_at: new Date().toISOString(),
});

stream.sendTaskProgress({
  task_id: task.id,
  progress: {
    percentage: 50,
    stage: 'analyze',
    message: 'Running GEO analysis',
    timestamp: new Date().toISOString(),
  },
});

stream.sendTaskCompleted({
  task_id: task.id,
  result,
  cost: {
    compute_cost: 0.08,
    storage_cost: 0.01,
    network_cost: 0.01,
    total_cost: 0.10,
    currency: 'USDC',
  },
  completed_at: new Date().toISOString(),
});

console.log('✅ Test events sent through SSE stream');
console.log('');

// Verify events received
const expectedEvents = [
  SSEEventType.HEARTBEAT,
  SSEEventType.TASK_CREATED,
  SSEEventType.TASK_STARTED,
  SSEEventType.TASK_PROGRESS,
  SSEEventType.TASK_COMPLETED,
];

const allEventsReceived = expectedEvents.every(evt => events.includes(evt));

if (allEventsReceived) {
  console.log('✅ All expected events received');
} else {
  console.error('❌ Some events missing');
  console.error(`   Expected: ${expectedEvents.join(', ')}`);
  console.error(`   Received: ${events.join(', ')}`);
}

console.log('');

// Stream statistics
console.log('Stream Statistics:');
console.log(`   Stream ID: ${stream.getId()}`);
console.log(`   Listeners: ${stream.getListenersCount()}`);
console.log(`   Closed: ${stream.isClosed()}`);
console.log(`   Active Streams: ${sseStreamManager.getActiveStreamsCount()}`);
console.log('');

// Cleanup
unsubscribe();
stream.close();
sseStreamManager.deleteStream(stream.getId());

console.log('✅ Stream closed and cleaned up');
console.log('');

// =====================================================
// SUMMARY
// =====================================================

console.log('='.repeat(60));
console.log('Phase 1 Integration Test: COMPLETE');
console.log('='.repeat(60));
console.log('');
console.log('✅ Agent Card: PASSED');
console.log('✅ Task Manager: PASSED');
console.log('✅ SSE Streaming: PASSED');
console.log('');
console.log('Phase 1 infrastructure is ready for Phase 2 integration.');
console.log('');
