use std::collections::VecDeque;
use std::sync::Mutex;
use crate::ipc::CommandRequest;

/// Bounded, thread-safe FIFO queue for pending requests.
pub struct RequestQueue {
    queue: Mutex<VecDeque<CommandRequest>>,
    max_size: usize,
}

impl RequestQueue {
    /// Creates a new `RequestQueue` with the specified maximum capacity.
    pub fn new(max_size: usize) -> Self {
        Self {
            queue: Mutex::new(VecDeque::new()),
            max_size,
        }
    }

    /// Enqueues a request. Returns an error if the queue is full.
    pub fn push(&self, req: CommandRequest) -> Result<usize, String> {
        let mut guard = self.queue.lock().unwrap_or_else(|e| e.into_inner());
        if guard.len() >= self.max_size {
            return Err("Queue overflow".to_string());
        }
        guard.push_back(req);
        let size = guard.len();
        Ok(size)
    }

    /// Pops the oldest request from the queue.
    pub fn pop(&self) -> Option<CommandRequest> {
        let mut guard = self.queue.lock().unwrap_or_else(|e| e.into_inner());
        guard.pop_front()
    }
}
