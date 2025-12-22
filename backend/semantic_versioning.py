"""
Semantic versioning for prompts with auto-detection of major vs minor changes.

The system uses a hybrid approach:
- Semantic version format: MAJOR.MINOR (e.g., 1.0, 1.1, 2.0)
- Auto-detects change magnitude using multiple factors
- Minor changes (1.0 -> 1.1): Small edits, parameter tweaks, formatting
- Major changes (1.0 -> 2.0): Structural changes, role changes, significant rewrites
"""

import difflib
import re
from typing import Tuple, Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class VersionChange:
    """Represents the analysis of changes between two prompt versions"""
    old_version: str
    new_version: str
    change_type: str  # 'major' or 'minor'
    diff_ratio: float  # 0.0 to 1.0, higher = more different
    structural_changes: int
    semantic_changes: int
    details: Dict[str, Any]


class SemanticVersionAnalyzer:
    """
    Analyzes prompt changes to determine if they constitute a major or minor version bump.

    Change magnitude factors:
    1. Structural changes (role, format, instructions structure)
    2. Semantic changes (meaning, intent, constraints)
    3. Size of diff (percentage of content changed)
    4. Key phrase modifications (system role, output format, etc.)
    """

    # Keywords that indicate structural/major changes
    MAJOR_CHANGE_INDICATORS = [
        r'\brole\s*:',
        r'\bsystem\b',
        r'\bformat\s*:',
        r'\boutput\s+format',
        r'\bresponse\s+format',
        r'\bconstraints?\s*:',
        r'\brules?\s*:',
        r'\bmust\s+(?:not\s+)?',
        r'\balways\s+',
        r'\bnever\s+',
        r'\brequired?\s*:',
    ]

    # Thresholds for change classification
    MAJOR_DIFF_THRESHOLD = 0.4  # 40% or more content changed
    MINOR_DIFF_THRESHOLD = 0.1  # 10% to 40% changed
    STRUCTURAL_CHANGE_THRESHOLD = 2  # 2+ structural indicators changed

    @staticmethod
    def parse_version(version_str: str) -> Tuple[int, int]:
        """Parse version string like '1.2' or '2.0' into (major, minor)"""
        try:
            if '.' not in version_str:
                version_str = f"{version_str}.0"
            parts = version_str.split('.')
            return int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            return 1, 0

    @staticmethod
    def format_version(major: int, minor: int) -> str:
        """Format version tuple into string"""
        return f"{major}.{minor}"

    def analyze_changes(self, old_content: str, new_content: str, old_version: str = "1.0") -> VersionChange:
        """
        Analyze changes between two prompt versions.

        Args:
            old_content: Previous prompt content
            new_content: New prompt content
            old_version: Current version string (e.g., "1.2")

        Returns:
            VersionChange object with analysis details
        """
        # Calculate diff ratio
        diff_ratio = self._calculate_diff_ratio(old_content, new_content)

        # Detect structural changes
        structural_changes = self._detect_structural_changes(
            old_content, new_content)

        # Detect semantic changes
        semantic_changes = self._detect_semantic_changes(
            old_content, new_content)

        # Determine change type
        change_type = self._classify_change(
            diff_ratio, structural_changes, semantic_changes)

        # Calculate new version
        old_major, old_minor = self.parse_version(old_version)
        if change_type == 'major':
            new_major, new_minor = old_major + 1, 0
        else:
            new_major, new_minor = old_major, old_minor + 1

        new_version = self.format_version(new_major, new_minor)

        return VersionChange(
            old_version=old_version,
            new_version=new_version,
            change_type=change_type,
            diff_ratio=diff_ratio,
            structural_changes=structural_changes,
            semantic_changes=semantic_changes,
            details={
                'lines_added': self._count_diff_lines(old_content, new_content, 'added'),
                'lines_removed': self._count_diff_lines(old_content, new_content, 'removed'),
                'lines_modified': self._count_diff_lines(old_content, new_content, 'modified'),
                'structural_indicators_changed': structural_changes,
                'diff_percentage': round(diff_ratio * 100, 2)
            }
        )

    def _calculate_diff_ratio(self, old: str, new: str) -> float:
        """Calculate how different two strings are (0.0 = identical, 1.0 = completely different)"""
        if not old and not new:
            return 0.0
        if not old or not new:
            return 1.0

        # Use SequenceMatcher to get similarity ratio
        matcher = difflib.SequenceMatcher(None, old, new)
        similarity = matcher.ratio()

        # Return difference ratio (inverse of similarity)
        return 1.0 - similarity

    def _detect_structural_changes(self, old: str, new: str) -> int:
        """Count how many structural indicators have changed"""
        changes = 0

        for pattern in self.MAJOR_CHANGE_INDICATORS:
            old_matches = len(re.findall(pattern, old, re.IGNORECASE))
            new_matches = len(re.findall(pattern, new, re.IGNORECASE))

            if old_matches != new_matches:
                changes += 1

        return changes

    def _detect_semantic_changes(self, old: str, new: str) -> int:
        """Detect semantic changes by analyzing sentence structure"""
        old_sentences = self._split_sentences(old)
        new_sentences = self._split_sentences(new)

        # Count sentences that changed
        old_set = set(old_sentences)
        new_set = set(new_sentences)

        # Sentences removed or added
        removed = len(old_set - new_set)
        added = len(new_set - old_set)

        return removed + added

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences, normalized"""
        # Simple sentence splitting
        sentences = re.split(r'[.!?]\s+', text)
        # Normalize whitespace and filter empty
        return [s.strip().lower() for s in sentences if s.strip()]

    def _classify_change(self, diff_ratio: float, structural_changes: int, semantic_changes: int) -> str:
        """Classify whether this is a major or minor change"""

        # Major change if:
        # 1. Significant diff ratio (>40% changed)
        # 2. Multiple structural indicators changed (>= 2)
        # 3. Large semantic changes (>= 5 sentences changed)

        if diff_ratio >= self.MAJOR_DIFF_THRESHOLD:
            return 'major'

        if structural_changes >= self.STRUCTURAL_CHANGE_THRESHOLD:
            return 'major'

        if semantic_changes >= 5:
            return 'major'

        # Otherwise it's a minor change
        return 'minor'

    def _count_diff_lines(self, old: str, new: str, diff_type: str) -> int:
        """Count lines added, removed, or modified"""
        differ = difflib.Differ()
        diff = list(differ.compare(old.splitlines(), new.splitlines()))

        if diff_type == 'added':
            return sum(1 for line in diff if line.startswith('+ '))
        elif diff_type == 'removed':
            return sum(1 for line in diff if line.startswith('- '))
        elif diff_type == 'modified':
            # Lines that appear in both added and removed (modified)
            return sum(1 for line in diff if line.startswith('? '))

        return 0


def get_next_version(current_version: str, old_content: str, new_content: str) -> Tuple[str, VersionChange]:
    """
    Convenience function to get the next version number based on content changes.

    Args:
        current_version: Current version string (e.g., "1.2")
        old_content: Previous prompt content
        new_content: New prompt content

    Returns:
        Tuple of (next_version_string, change_analysis)
    """
    analyzer = SemanticVersionAnalyzer()
    change = analyzer.analyze_changes(
        old_content, new_content, current_version)
    return change.new_version, change


def should_create_new_version(old_hash: str, new_hash: str, old_content: Optional[str] = None, new_content: Optional[str] = None) -> bool:
    """
    Determine if a new version should be created.

    Args:
        old_hash: Hash of existing prompt content
        new_hash: Hash of new prompt content
        old_content: Optional - actual old content for analysis
        new_content: Optional - actual new content for analysis

    Returns:
        True if hashes differ (content changed), False otherwise
    """
    # If hashes are different, content has changed
    if old_hash != new_hash:
        return True

    # If hashes are same but we have content, double-check
    if old_content and new_content:
        return old_content.strip() != new_content.strip()

    return False
