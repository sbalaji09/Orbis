"""
Prompt versioning system for tracking and managing AI prompts.
Treats prompts like version-controlled software artifacts.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import hashlib
import json


@dataclass
class PromptVersion:
    """Represents a versioned prompt"""
    prompt_id: str
    version: str
    prompt_text: str
    prompt_hash: str = field(init=False)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def __post_init__(self):
        """Compute hash after initialization"""
        self.prompt_hash = self._compute_hash(self.prompt_text)
    
    def _compute_hash(self, text: str) -> str:
        """Generate SHA-256 hash of prompt for change detection"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "prompt_id": self.prompt_id,
            "version": self.version,
            "prompt_text": self.prompt_text,
            "prompt_hash": self.prompt_hash,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }

    def persist_to_backend(self, agent_id: str, api_key: str, api_url: str = "http://localhost:8000") -> bool:
        """
        Persist this prompt version to the backend database.
        Called automatically when registering a prompt.
        """
        try:
            import requests
            
            response = requests.post(
                f"{api_url}/prompts/prompts",
                params={
                    "agent_id": agent_id,
                    "name": self.prompt_id,
                    "content": self.prompt_text
                },
                headers={
                    "X-API-Key": api_key,
                    "Content-Type": "application/json"
                },
                timeout=5.0
            )
            
            if response.status_code in [200, 201]:
                print(f"✓ Prompt persisted to backend: {self.prompt_id} v{self.version}")
                return True
            else:
                print(f"⚠ Failed to persist prompt: {response.status_code}")
                print(f"⚠ Error details: {response.text}")  # ← ADD THIS LINE
                return False
        
        except Exception as e:
            print(f"⚠ Error persisting prompt: {e}")
            return False
    
    def __str__(self) -> str:
        return f"PromptVersion(id='{self.prompt_id}', version='{self.version}', hash='{self.prompt_hash[:8]}...')"


class PromptRegistry:
    """
    Singleton registry for managing prompt versions.
    Tracks prompts in-memory before they're persisted to backend.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize the registry storage"""
        self._prompts: Dict[str, PromptVersion] = {}
        self._prompt_families: Dict[str, List[PromptVersion]] = {}
    
    
    def register_prompt(
        self,
        prompt_id: str,
        version: str,
        prompt_text: str,
        metadata: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> PromptVersion:
        """
        Register a new prompt version.
        
        Args:
            prompt_id: Unique identifier for the prompt family (e.g., "summarization_prompt")
            version: Version string (e.g., "v1.0", "2024-11-25")
            prompt_text: The actual prompt template text
            metadata: Optional metadata (author, purpose, etc.)
        
        Returns:
            PromptVersion object
        """
        key = f"{prompt_id}:{version}"
        
        # Only create new version if it doesn't exist
        if key not in self._prompts:
            prompt_version = PromptVersion(
                prompt_id=prompt_id,
                version=version,
                prompt_text=prompt_text,
                metadata=metadata or {}
            )
            self._prompts[key] = prompt_version
            
            # Track in prompt family
            if prompt_id not in self._prompt_families:
                self._prompt_families[prompt_id] = []
            self._prompt_families[prompt_id].append(prompt_version)
            
            print(f"✓ Registered prompt: {prompt_version}")

            # Persist to backend if credentials provided
            if agent_id and api_key:
                prompt_version.persist_to_backend(agent_id, api_key, api_url="http://localhost:8000")
        
        return self._prompts[key]
    
    def get_prompt(self, prompt_id: str, version: str) -> Optional[PromptVersion]:
        """Get a specific prompt version"""
        key = f"{prompt_id}:{version}"
        return self._prompts.get(key)
    
    def list_versions(self, prompt_id: str) -> List[PromptVersion]:
        """List all versions of a prompt family"""
        return self._prompt_families.get(prompt_id, [])
    
    def get_latest_version(self, prompt_id: str) -> Optional[PromptVersion]:
        """Get the most recently registered version of a prompt"""
        versions = self.list_versions(prompt_id)
        return versions[-1] if versions else None
    
    def detect_changes(self, prompt_id: str, current_text: str) -> bool:
        """
        Detect if prompt text has changed from latest version.
        
        Args:
            prompt_id: The prompt family ID
            current_text: Current prompt text to check
            
        Returns:
            True if text differs from latest version, False otherwise
        """
        latest = self.get_latest_version(prompt_id)
        if not latest:
            return True  # No previous version = changed
        
        current_hash = hashlib.sha256(current_text.encode('utf-8')).hexdigest()
        return current_hash != latest.prompt_hash
    
    def get_all_prompts(self) -> Dict[str, List[PromptVersion]]:
        """Get all prompt families and their versions"""
        return self._prompt_families.copy()
    
    def clear(self):
        """Clear all registered prompts (useful for testing)"""
        self._prompts.clear()
        self._prompt_families.clear()


# Global singleton instance
def get_prompt_registry() -> PromptRegistry:
    """Get the global prompt registry instance"""
    return PromptRegistry()