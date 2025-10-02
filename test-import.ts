/**
 * Test if module imports work without errors
 */

console.log('TEST 1: Import ToolTemplateEngine...');
import { ToolTemplateEngine } from './src/services/coaching/ToolTemplateEngine';
console.log('✅ ToolTemplateEngine imported successfully');

console.log('TEST 2: Import PatternMatchingLibrary...');
import { PatternMatchingLibrary } from './src/services/coaching/PatternMatchingLibrary';
console.log('✅ PatternMatchingLibrary imported successfully');

console.log('TEST 3: Import SentimentToolSelector...');
import { SentimentToolSelector } from './src/services/coaching/sentiment-tool-selector';
console.log('✅ SentimentToolSelector imported successfully');

console.log('TEST 4: Import LiveCoachingService...');
import { LiveCoachingService } from './src/services/coaching/live-coaching-service';
console.log('✅ LiveCoachingService imported successfully');

console.log('✅ ALL IMPORTS SUCCESSFUL');
