"""
Test suite for semantic versioning auto-detection.
Run: python -m pytest backend/test_semantic_versioning.py -v
"""

import pytest
from semantic_versioning import SemanticVersionAnalyzer, get_next_version, VersionChange


class TestSemanticVersioning:
    """Test suite for auto-versioning functionality"""

    def setup_method(self):
        """Initialize analyzer for each test"""
        self.analyzer = SemanticVersionAnalyzer()

    # ==================== Minor Change Tests ====================

    def test_minor_change_small_text_edit(self):
        """Small text edits should be minor changes"""
        old = "You are a helpful assistant."
        new = "You are a helpful, friendly assistant."

        change = self.analyzer.analyze_changes(old, new, "1.0")

        assert change.change_type == "minor"
        assert change.new_version == "1.1"
        assert change.diff_ratio < 0.4

    def test_minor_change_adding_example(self):
        """Adding examples should be minor change"""
        old = "Summarize the text concisely."
        new = "Summarize the text concisely. For example: 'The report shows...'"

        change = self.analyzer.analyze_changes(old, new, "1.2")

        assert change.change_type == "minor"
        assert change.new_version == "1.3"

    def test_minor_change_formatting(self):
        """Formatting changes should be minor"""
        old = "Task: Analyze sentiment. Output: positive/negative/neutral"
        new = """Task: Analyze sentiment
Output: positive/negative/neutral"""

        change = self.analyzer.analyze_changes(old, new, "2.0")

        assert change.change_type == "minor"
        assert change.new_version == "2.1"

    # ==================== Major Change Tests ====================

    def test_major_change_role_modification(self):
        """Changing role should be major change"""
        old = "You are a helpful assistant."
        new = "You are an expert code reviewer with 10 years of experience."

        change = self.analyzer.analyze_changes(old, new, "1.5")

        assert change.change_type == "major"
        assert change.new_version == "2.0"
        assert change.structural_changes > 0

    def test_major_change_output_format(self):
        """Changing output format should be major"""
        old = "Respond naturally."
        new = "Output format: JSON with fields 'summary' and 'sentiment'."

        change = self.analyzer.analyze_changes(old, new, "1.0")

        assert change.change_type == "major"
        assert change.new_version == "2.0"

    def test_major_change_new_constraints(self):
        """Adding constraints should be major"""
        old = "Summarize the text."
        new = """Summarize the text.
Rules:
- Must be under 100 words
- Must include key metrics
- Never use first person"""

        change = self.analyzer.analyze_changes(old, new, "3.2")

        assert change.change_type == "major"
        assert change.new_version == "4.0"

    def test_major_change_large_rewrite(self):
        """Large rewrites (>40% diff) should be major"""
        old = "You are a helpful assistant."
        new = """You are an expert technical writer specializing in API documentation.
Your task is to create clear, concise documentation that developers can easily understand.
Always include code examples and explain edge cases."""

        change = self.analyzer.analyze_changes(old, new, "1.0")

        assert change.change_type == "major"
        assert change.new_version == "2.0"
        assert change.diff_ratio >= 0.4

    # ==================== Edge Cases ====================

    def test_identical_prompts(self):
        """Identical prompts should have 0 diff ratio"""
        old = "You are a helpful assistant."
        new = "You are a helpful assistant."

        diff_ratio = self.analyzer._calculate_diff_ratio(old, new)

        assert diff_ratio == 0.0

    def test_empty_to_content(self):
        """Empty to content should be major"""
        old = ""
        new = "You are a helpful assistant."

        diff_ratio = self.analyzer._calculate_diff_ratio(old, new)

        assert diff_ratio == 1.0

    def test_version_parsing(self):
        """Test version string parsing"""
        assert self.analyzer.parse_version("1.2") == (1, 2)
        assert self.analyzer.parse_version("10.5") == (10, 5)
        assert self.analyzer.parse_version("3") == (3, 0)
        assert self.analyzer.parse_version("invalid") == (1, 0)  # Default

    def test_version_formatting(self):
        """Test version formatting"""
        assert self.analyzer.format_version(1, 2) == "1.2"
        assert self.analyzer.format_version(10, 0) == "10.0"

    # ==================== Integration Tests ====================

    def test_get_next_version_helper(self):
        """Test the convenience function"""
        old = "You are a helpful assistant."
        new = "You are a helpful, concise assistant."

        next_version, change = get_next_version("1.0", old, new)

        assert next_version == "1.1"
        assert isinstance(change, VersionChange)
        assert change.change_type == "minor"

    def test_sequential_versioning(self):
        """Test sequential version increments"""
        v1_content = "You are a helpful assistant."

        # Minor change
        v2_content = "You are a helpful, friendly assistant."
        _, change1 = get_next_version("1.0", v1_content, v2_content)
        assert change1.new_version == "1.1"

        # Another minor change
        v3_content = "You are a helpful, friendly, and patient assistant."
        _, change2 = get_next_version("1.1", v2_content, v3_content)
        assert change2.new_version == "1.2"

        # Major change
        v4_content = "You are an expert code reviewer."
        _, change3 = get_next_version("1.2", v3_content, v4_content)
        assert change3.new_version == "2.0"

        # Minor after major
        v5_content = "You are an expert code reviewer with focus on security."
        _, change4 = get_next_version("2.0", v4_content, v5_content)
        assert change4.new_version == "2.1"

    # ==================== Real-World Scenarios ====================

    def test_real_world_prompt_evolution(self):
        """Test realistic prompt evolution"""

        # v1.0: Initial simple prompt
        v1 = "Summarize the following text concisely."

        # v1.1: Add tone guidance (minor)
        v2 = "Summarize the following text concisely in a professional tone."
        _, c1 = get_next_version("1.0", v1, v2)
        assert c1.new_version == "1.1"

        # v2.0: Complete restructure with rules (major)
        v3 = """You are a professional summarizer.
        
Task: Create a concise summary
Rules:
- Maximum 3 sentences
- Focus on key insights
- Maintain neutral tone"""
        _, c2 = get_next_version("1.1", v2, v3)
        assert c2.new_version == "2.0"

        # v2.1: Add example (minor)
        v4 = v3 + "\n\nExample output: 'The report indicates...'"
        _, c3 = get_next_version("2.0", v3, v4)
        assert c3.new_version == "2.1"

    def test_change_details_populated(self):
        """Verify change details are populated"""
        old = "Line 1\nLine 2\nLine 3"
        new = "Line 1\nModified Line 2\nLine 3\nLine 4"

        change = self.analyzer.analyze_changes(old, new, "1.0")

        assert "lines_added" in change.details
        assert "lines_removed" in change.details
        assert "diff_percentage" in change.details
        assert change.details["lines_added"] >= 0
        assert change.details["diff_percentage"] > 0


class TestStructuralChangeDetection:
    """Test structural change detection patterns"""

    def setup_method(self):
        self.analyzer = SemanticVersionAnalyzer()

    def test_detect_role_keyword(self):
        """Detect role: keyword changes"""
        old = "Summarize text"
        new = "Role: Expert summarizer\nSummarize text"

        changes = self.analyzer._detect_structural_changes(old, new)
        assert changes > 0

    def test_detect_system_keyword(self):
        """Detect system keyword changes"""
        old = "You are helpful"
        new = "System: You are an expert"

        changes = self.analyzer._detect_structural_changes(old, new)
        assert changes > 0

    def test_detect_format_keyword(self):
        """Detect format: keyword changes"""
        old = "Analyze sentiment"
        new = "Analyze sentiment\nFormat: JSON"

        changes = self.analyzer._detect_structural_changes(old, new)
        assert changes > 0

    def test_detect_constraint_keywords(self):
        """Detect constraint keywords (must, always, never)"""
        old = "Summarize"
        new = "Summarize. You must always be concise and never use jargon."

        changes = self.analyzer._detect_structural_changes(old, new)
        assert changes >= 2  # 'must' and 'never'


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
