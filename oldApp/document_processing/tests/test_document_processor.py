"""
Unit tests for VoiceCoach Document Processor
"""

import unittest
import tempfile
import os
from pathlib import Path
import sys

# Add document_processing to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from document_processing.document_processor import DocumentProcessor, ProcessedDocument

class TestDocumentProcessor(unittest.TestCase):
    """Test cases for DocumentProcessor"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.processor = DocumentProcessor()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_file(self, filename: str, content: str) -> str:
        """Create a temporary test file"""
        file_path = os.path.join(self.temp_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path
    
    def test_supported_formats(self):
        """Test supported format detection"""
        # Test supported formats
        self.assertTrue(self.processor.is_supported_format("test.pdf"))
        self.assertTrue(self.processor.is_supported_format("test.docx"))
        self.assertTrue(self.processor.is_supported_format("test.txt"))
        self.assertTrue(self.processor.is_supported_format("test.md"))
        self.assertTrue(self.processor.is_supported_format("test.markdown"))
        
        # Test unsupported formats
        self.assertFalse(self.processor.is_supported_format("test.exe"))
        self.assertFalse(self.processor.is_supported_format("test.jpg"))
        self.assertFalse(self.processor.is_supported_format("test.mp4"))
    
    def test_text_file_processing(self):
        """Test text file processing"""
        content = """
        # Sales Objection Handling Guide
        
        When customers raise price objections, use these proven techniques:
        
        1. Acknowledge their concern
        2. Ask clarifying questions
        3. Present value proposition
        4. Handle the specific objection
        
        Remember: Always listen first before responding.
        """
        
        file_path = self.create_test_file("test_guide.txt", content)
        
        # Process the file
        result = self.processor.process_document(file_path)
        
        # Verify result
        self.assertIsInstance(result, ProcessedDocument)
        self.assertIn("objection", result.content.lower())
        self.assertIn("price", result.content.lower())
        self.assertGreater(result.word_count, 0)
        self.assertGreater(result.token_count, 0)
        self.assertEqual(result.file_type, "Text Document")
        self.assertGreater(result.processing_time, 0)
    
    def test_markdown_file_processing(self):
        """Test markdown file processing"""
        content = """
        # SPIN Selling Methodology
        
        ## Situation Questions
        - What is your current process?
        - How long have you been doing this?
        
        ## Problem Questions  
        - What challenges do you face?
        - What's not working well?
        
        ## Implication Questions
        - What's the cost of this problem?
        - How does this impact your team?
        
        ## Need-Payoff Questions
        - What would solving this mean?
        - How would this help your business?
        """
        
        file_path = self.create_test_file("spin_methodology.md", content)
        
        # Process the file
        result = self.processor.process_document(file_path)
        
        # Verify result
        self.assertIsInstance(result, ProcessedDocument)
        self.assertIn("spin", result.content.lower())
        self.assertIn("questions", result.content.lower())
        self.assertEqual(result.file_type, "Markdown Document")
    
    def test_sales_content_analysis(self):
        """Test sales-specific content analysis"""
        content = """
        Objection Handling for Price Concerns
        
        When prospects say "your price is too high", follow these steps:
        
        1. Use SPIN methodology to understand their budget
        2. Present ROI calculations  
        3. Compare total cost of ownership
        4. Share success stories from similar clients
        
        Common objections:
        - "Too expensive compared to competitors"
        - "Not in our budget this quarter"
        - "Need to think about it"
        
        Closing techniques:
        - Assumptive close: "When shall we start?"
        - Alternative close: "Monthly or annual billing?"
        """
        
        file_path = self.create_test_file("objection_guide.txt", content)
        result = self.processor.process_document(file_path)
        
        # Check metadata contains sales keywords
        metadata = result.metadata
        
        # Should detect objection handling content
        self.assertGreater(metadata.get('objection_handling_keywords', []), 0)
        
        # Should detect SPIN methodology
        self.assertIn('spin', str(metadata).lower())
        
        # Should detect closing techniques
        self.assertGreater(metadata.get('closing_techniques_keywords', []), 0)
    
    def test_metadata_extraction(self):
        """Test metadata extraction"""
        content = "Sample sales content with MEDDIC methodology and pricing information."
        file_path = self.create_test_file("sample.txt", content)
        
        result = self.processor.process_document(file_path)
        metadata = result.metadata
        
        # Check basic metadata
        self.assertIn('filename', metadata)
        self.assertIn('file_size', metadata)
        self.assertIn('processed_date', metadata)
        self.assertIn('primary_category', metadata)
        
        # Check content analysis
        self.assertIn('total_sales_keywords', metadata)
        self.assertIn('contains_numbers', metadata)
        self.assertIn('contains_questions', metadata)
    
    def test_content_cleaning(self):
        """Test content cleaning functionality"""
        dirty_content = """
        
        
        This   has    excessive     whitespace.
        
        
        
        And multiple line breaks.
        
        
        Special characters: \x00\x01\x02
        """
        
        file_path = self.create_test_file("dirty.txt", dirty_content)
        result = self.processor.process_document(file_path)
        
        # Content should be cleaned
        self.assertNotIn('\x00', result.content)
        self.assertNotIn('   ', result.content)  # No triple spaces
        self.assertNotIn('\n\n\n', result.content)  # No triple newlines
    
    def test_file_not_found(self):
        """Test handling of non-existent files"""
        with self.assertRaises(FileNotFoundError):
            self.processor.process_document("nonexistent_file.txt")
    
    def test_unsupported_format(self):
        """Test handling of unsupported file formats"""
        file_path = self.create_test_file("test.xyz", "content")
        
        with self.assertRaises(ValueError):
            self.processor.process_document(file_path)
    
    def test_token_counting(self):
        """Test token counting functionality"""
        content = "This is a test document with some content for token counting."
        file_path = self.create_test_file("token_test.txt", content)
        
        result = self.processor.process_document(file_path)
        
        # Should have reasonable token count
        self.assertGreater(result.token_count, 0)
        self.assertGreater(result.token_count, result.word_count * 0.5)  # Rough lower bound
        self.assertLess(result.token_count, result.word_count * 2)      # Rough upper bound
    
    def test_processing_stats(self):
        """Test processing statistics generation"""
        # Create multiple test documents
        docs = []
        for i in range(3):
            content = f"Test document {i} with sales objection handling content."
            file_path = self.create_test_file(f"test_{i}.txt", content)
            result = self.processor.process_document(file_path)
            docs.append(result)
        
        # Generate stats
        stats = self.processor.get_processing_stats(docs)
        
        # Verify stats
        self.assertEqual(stats['total_documents'], 3)
        self.assertGreater(stats['total_words'], 0)
        self.assertGreater(stats['total_tokens'], 0)
        self.assertGreater(stats['total_processing_time'], 0)
        self.assertIn('file_type_distribution', stats)
        self.assertIn('category_distribution', stats)

class TestSalesContentAnalysis(unittest.TestCase):
    """Test sales-specific content analysis"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.processor = DocumentProcessor()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_file(self, filename: str, content: str) -> str:
        """Create a temporary test file"""
        file_path = os.path.join(self.temp_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path
    
    def test_objection_handling_detection(self):
        """Test detection of objection handling content"""
        content = """
        How to Handle Price Objections
        
        When customers say "too expensive":
        1. Acknowledge their concern
        2. Ask about their budget range
        3. Present value proposition
        4. Share ROI examples
        
        Common pushback: "Your competitor is cheaper"
        Response: Focus on total value, not just price.
        """
        
        file_path = self.create_test_file("objections.txt", content)
        result = self.processor.process_document(file_path)
        
        # Should detect high objection handling score
        metadata = result.metadata
        objection_score = metadata.get('category_scores', {}).get('objection_handling', 0)
        self.assertGreater(objection_score, 0)
    
    def test_methodology_detection(self):
        """Test detection of sales methodologies"""
        methodologies = {
            'SPIN': "Use SPIN selling with situation questions, problem questions, implication questions, and need payoff questions.",
            'MEDDIC': "Qualify prospects using MEDDIC: Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion.",
            'Challenger': "Use challenger sale methodology to teach, tailor, and take control of the conversation.",
            'Sandler': "Apply Sandler selling system with pain funnel and up front contract.",
            'BANT': "Qualify leads using BANT criteria: Budget, Authority, Need, Timeline."
        }
        
        for methodology, content in methodologies.items():
            with self.subTest(methodology=methodology):
                file_path = self.create_test_file(f"{methodology.lower()}.txt", content)
                result = self.processor.process_document(file_path)
                
                # Should detect the methodology in content
                content_lower = result.content.lower()
                self.assertIn(methodology.lower(), content_lower)
    
    def test_sales_stage_detection(self):
        """Test detection of sales stages"""
        stages = {
            'prospecting': "Cold calling and lead generation strategies for prospecting new clients.",
            'discovery': "Discovery questions to understand customer needs and pain points.",
            'presentation': "Product presentation and demo techniques for showcasing solutions.",
            'closing': "Closing techniques and decision-making strategies for final agreements.",
            'follow_up': "Follow up strategies and relationship building for ongoing accounts."
        }
        
        for stage, content in stages.items():
            with self.subTest(stage=stage):
                file_path = self.create_test_file(f"{stage}.txt", content)
                result = self.processor.process_document(file_path)
                
                # Should detect the stage in content
                metadata = result.metadata
                stage_scores = metadata.get('category_scores', {})
                
                # Check if any stage-related keywords were detected
                self.assertGreater(sum(stage_scores.values()), 0)

if __name__ == '__main__':
    unittest.main()