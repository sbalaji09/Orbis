import threading
import time
import requests
from typing import List, Dict, Any
from queue import Queue, Empty
from ..core.span import Span
from .config import get_config


class SpanCollector:
    """
    Collects spans and sends them to the backend in batches.
    Runs in a background thread to avoid blocking the user's code.
    """
    
    def __init__(self):
        self.config = get_config()
        self.queue: Queue = Queue()
        self.batch: List[Dict[str, Any]] = []
        self.lock = threading.Lock()
        
        # background thread
        self.worker_thread: threading.Thread = None
        self.running = False
        
        # start the worker if enabled
        if self.config.enabled:
            self.start()
    
    # start the background worker thread
    def start(self) -> None:
        if self.running:
            return
        
        self.running = True
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
        
        if self.config.debug:
            print("span collector started")
    
    # stop the background worker and flush the remaining spans
    def stop(self) -> None:
        if not self.running:
            return
        
        self.running = False
        self.flush()
        
        if self.worker_thread:
            self.worker_thread.join(timeout=5.0)
        
        if self.config.debug:
            print("span collector stopped")
    
    # add a span to the collection queue
    def collect(self, span: Span) -> None:
        if not self.config.enabled:
            return
        
        self.queue.put(span.to_dict())
        
        if self.config.debug:
            print(f"span queued: {span.name}")
    
    # background worker that batches and sends spans
    def _worker(self) -> None:
        last_flush = time.time()
        
        while self.running:
            try:
                try:
                    span_data = self.queue.get(timeout=0.5)
                    
                    with self.lock:
                        self.batch.append(span_data)
                    
                    # flush if batch is full
                    if len(self.batch) >= self.config.batch_size:
                        self.flush()
                        last_flush = time.time()
                
                except Empty:
                    pass
                
                # flush if enough time has passed
                if time.time() - last_flush >= self.config.flush_interval:
                    self.flush()
                    last_flush = time.time()
            
            except Exception as e:
                if self.config.debug:
                    print(f"worker error: {e}")
    
    # Send all batched spans to the backend
    def flush(self) -> None:
        with self.lock:
            if not self.batch:
                return
            
            spans_to_send = self.batch.copy()
            self.batch.clear()
        
        self._send_batch(spans_to_send)
    
    # Send a batch of spans to the backend API
    def _send_batch(self, spans: List[Dict[str, Any]]) -> None:
        if not spans:
            return
        
        url = f"{self.config.api_url}/span"
        
        # send each span individually (sid's endpoint expects one span per req)
        for span_data in spans:
            for attempt in range(self.config.max_retries):
                try:
                    headers = {"Content-Type": "application/json"}
                    if self.config.api_key:
                        headers["X-API-Key"] = self.config.api_key
                    
                    response = requests.post(
                        url,
                        json=span_data,
                        headers=headers,
                        timeout=5.0
                    )
                    
                    if response.status_code == 202:
                        if self.config.debug:
                            print(f"span sent: {span_data['name']}")
                        break  # success
                    else:
                        if self.config.debug:
                            print(f"failed to send span: {response.status_code}")
                            print(f"✗ Response body: {response.text}")
                        
                        # retry on server errors
                        if response.status_code >= 500 and attempt < self.config.max_retries - 1:
                            time.sleep(self.config.retry_delay)
                            continue
                        break
                
                except requests.exceptions.RequestException as e:
                    if self.config.debug:
                        print(f"request failed: {e}")
                    
                    # retry on network errors
                    if attempt < self.config.max_retries - 1:
                        time.sleep(self.config.retry_delay)
                    else:
                        # give up after max retries
                        if self.config.debug:
                            print(f"giving up on span: {span_data['name']}")


# Global collector instance
_collector = SpanCollector()


def get_collector() -> SpanCollector:
    """Get the global collector instance"""
    return _collector