# MyUI ParaThinker Image Input Feature - Product Requirements Document

## 📋 Project Overview

**Feature**: Add image upload capability to MyUI ParaThinker application to enable visual context in AI prompts
**Target**: Two integration points - AI Prompt Generator and Main Prompt Input
**Priority**: High - Extends app capability to vision-enabled AI models
**Estimated Effort**: 5-7 hours for full implementation, 30 minutes for MVP

## 🎯 Feature Requirements

### Functional Requirements

#### FR1: Image Upload Components
- **FR1.1**: Add image upload to AI Prompt Generator section (Step 6)
- **FR1.2**: Add image upload below main prompt input area
- **FR1.3**: Support common image formats: PNG, JPG, JPEG, GIF, WebP
- **FR1.4**: Display image preview thumbnail after upload
- **FR1.5**: Provide "Remove Image" functionality

#### FR2: Vision Model Integration
- **FR2.1**: Convert uploaded images to base64 encoding
- **FR2.2**: Send images to vision-enabled models only (🎨 indicator models)
- **FR2.3**: Modify OpenRouter API calls to support vision message format
- **FR2.4**: Filter model selection to vision-capable models when images are present

#### FR3: User Experience
- **FR3.1**: Show clear visual indicators for vision model compatibility
- **FR3.2**: Provide helpful error messages and warnings
- **FR3.3**: Auto-resize large images to optimize token usage
- **FR3.4**: Maintain existing text-only workflow when no images uploaded

### Technical Requirements

#### TR1: Image Processing
- **TR1.1**: Use PIL (Pillow) for image processing
- **TR1.2**: Implement base64 encoding for API transmission
- **TR1.3**: Add image size validation and automatic resizing
- **TR1.4**: Maximum image size: 1024x1024 pixels to manage token limits

#### TR2: API Integration  
- **TR2.1**: Modify `query_model()` function to handle vision messages
- **TR2.2**: Use OpenRouter vision API format for image-enabled requests
- **TR2.3**: Maintain backward compatibility for text-only prompts
- **TR2.4**: Handle mixed model scenarios (some vision, some text-only)

#### TR3: State Management
- **TR3.1**: Store uploaded images in session state
- **TR3.2**: Clear images when user removes them
- **TR3.3**: Persist image state through app interactions
- **TR3.4**: Handle image data in export functionality

## 🏗️ Implementation Guide

### Phase 1: Basic Image Upload (MVP - 30 minutes)

#### Step 1: Add Image Upload Components
**Location**: `myui-app.py` around line 1376 (after main prompt input)

```python
# Add after main prompt input
uploaded_image = st.file_uploader(
    "📸 Upload Image (Optional)",
    type=['png', 'jpg', 'jpeg', 'gif', 'webp'],
    help="Upload an image to provide visual context for your prompt",
    key="main_image_upload"
)

if uploaded_image is not None:
    # Store in session state
    st.session_state.uploaded_image = uploaded_image
    
    # Show preview
    col1, col2 = st.columns([1, 3])
    with col1:
        st.image(uploaded_image, width=100, caption="Preview")
    with col2:
        st.info("🎨 Image will be sent to vision-enabled models only")
        if st.button("❌ Remove Image", key="remove_main_image"):
            st.session_state.uploaded_image = None
            st.rerun()
```

#### Step 2: Add Image Processing Functions
**Location**: Add near other utility functions (around line 270)

```python
import base64
import io
from PIL import Image

def encode_image_to_base64(image_file):
    """Convert uploaded image to base64 string for API"""
    try:
        # Open and process image
        image = Image.open(image_file)
        
        # Resize if too large (max 1024x1024)
        if image.width > 1024 or image.height > 1024:
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Save to bytes
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        
        # Encode to base64
        return base64.b64encode(buffer.getvalue()).decode()
    
    except Exception as e:
        st.error(f"Error processing image: {e}")
        return None

def filter_vision_models(selected_models, models_config):
    """Filter models to only vision-capable ones when image is present"""
    vision_models = []
    for model_id in selected_models:
        if model_id in models_config["models"]:
            if models_config["models"][model_id].get("vision_support", False):
                vision_models.append(model_id)
    return vision_models
```

#### Step 3: Modify API Call Function
**Location**: Update `query_model()` function around line 176

```python
async def query_model(session, model_id, prompt, context="", image_base64=None):
    """Query a single AI model via OpenRouter with optional image support"""
    start_time = time.time()
    
    headers = {
        "Authorization": f"Bearer {st.session_state.config['api_key']}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8501",
        "X-Title": "MyUI ParaThinker Interface"
    }
    
    # Combine context and prompt
    full_prompt = f"{context}\n\n{prompt}" if context else prompt
    
    # Build message content
    if image_base64:
        # Vision-enabled message format
        content = [
            {"type": "text", "text": full_prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
        ]
    else:
        # Text-only message format
        content = full_prompt
    
    data = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant focused on providing accurate, actionable coding advice."},
            {"role": "user", "content": content}
        ],
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    # Rest of function remains the same...
```

### Phase 2: AI Prompt Generator Integration

#### Step 4: Add Image Upload to Prompt Generator
**Location**: Inside AI Prompt Generator expander around line 1298

```python
# Add after deliverables text area
st.markdown("**Step 6: Reference Image (Optional)**")
pg_uploaded_image = st.file_uploader(
    "Upload Reference Image:",
    type=['png', 'jpg', 'jpeg', 'gif', 'webp'],
    help="Upload a screenshot, mockup, or reference image to guide prompt generation",
    key="pg_image_upload"
)

if pg_uploaded_image is not None:
    col1, col2 = st.columns([1, 3])
    with col1:
        st.image(pg_uploaded_image, width=100, caption="Reference")
    with col2:
        st.info("🎨 Image context will be included in generated prompt")
        if st.button("❌ Remove Reference", key="remove_pg_image"):
            st.rerun()
```

### Phase 3: Smart Model Filtering

#### Step 5: Update Model Selection Logic
**Location**: Around line 1698 in the Start ParaThinker button logic

```python
if st.button("🚀 Start ParaThinker", type="primary", disabled=not api_key or not prompt):
    if not api_key:
        st.error("Please enter your OpenRouter API key")
    elif not prompt:
        st.error("Please enter a prompt")
    else:
        # Get selected models for each panel
        selected_models = st.session_state.get('selected_models', list(MODELS.keys())[:panel_count])
        
        # Check for uploaded image
        has_image = st.session_state.get('uploaded_image') is not None
        image_base64 = None
        
        if has_image:
            # Filter to vision-enabled models only
            models_config = load_models_config()
            vision_models = filter_vision_models(selected_models, models_config)
            
            if not vision_models:
                st.error("❌ No vision-enabled models selected! Please select models with 🎨 vision support.")
                st.stop()
            
            # Encode image
            image_base64 = encode_image_to_base64(st.session_state.uploaded_image)
            if not image_base64:
                st.error("❌ Failed to process image. Please try a different image.")
                st.stop()
                
            selected_models = vision_models
            st.info(f"🎨 Using {len(vision_models)} vision-enabled models for image analysis")
        
        # Continue with existing logic...
```

## 🧪 Testing Instructions with Playwright

### Prerequisites
1. Ensure MyUI app is running at `http://localhost:8501`
2. Have test images ready in common formats (PNG, JPG)
3. Configure at least one vision-enabled model in `myui_models.json`

### Test Plan

#### Test 1: Basic Image Upload
```javascript
// Navigate to app
await page.goto('http://localhost:8501');
await page.waitForSelector('text=ParaThinker Multi-AI Interface');

// Enter a basic text prompt
await page.fill('textarea[placeholder*="Enter your coding question"]', 'Analyze this image and create a function');

// Test image upload
const fileInput = page.locator('input[type="file"][key="main_image_upload"]');
await fileInput.setInputFiles('path/to/test-image.png');

// Verify image preview appears
await page.waitForSelector('img[caption="Preview"]');

// Verify vision indicator appears
await page.waitForSelector('text=🎨 Image will be sent to vision-enabled models only');
```

#### Test 2: Vision Model Filtering
```javascript
// Upload image first (from Test 1)
// Check that only vision-enabled models are used
await page.click('button:has-text("🚀 Start ParaThinker")');

// Verify vision model notification
await page.waitForSelector('text=🎨 Using');
await page.waitForSelector('text=vision-enabled models');

// Wait for Stage 1 completion
await page.waitForSelector('text=✅ Stage 1 completed!', { timeout: 60000 });
```

#### Test 3: Prompt Generator with Image
```javascript
// Navigate to prompt generator
await page.click('text=🤖 AI Prompt Generator');

// Fill basic information
await page.fill('textarea[key="pg_feature_request"]', 'Create a UI component based on this design mockup');

// Upload reference image
const pgFileInput = page.locator('input[type="file"][key="pg_image_upload"]');
await pgFileInput.setInputFiles('path/to/design-mockup.png');

// Verify preview and generate prompt
await page.waitForSelector('img[caption="Reference"]');
await page.click('button:has-text("✨ Generate Professional Prompt")');

// Wait for generated prompt
await page.waitForSelector('textarea[key="generated_prompt_edit"]');
```

#### Test 4: Remove Image Functionality
```javascript
// Upload image first
await fileInput.setInputFiles('path/to/test-image.png');
await page.waitForSelector('img[caption="Preview"]');

// Click remove button
await page.click('button:has-text("❌ Remove Image")');

// Verify image is removed
await page.waitForTimeout(1000);
const imagePreview = page.locator('img[caption="Preview"]');
await expect(imagePreview).toHaveCount(0);
```

#### Test 5: Error Handling
```javascript
// Test with no vision models selected
await page.selectOption('select:nth-of-type(1)', 'deepseek/deepseek-chat-v3.1'); // Non-vision model
await fileInput.setInputFiles('path/to/test-image.png');
await page.click('button:has-text("🚀 Start ParaThinker")');

// Verify error message
await page.waitForSelector('text=❌ No vision-enabled models selected');
```

## 📊 Acceptance Criteria

### Must Have (MVP)
- ✅ Image upload works in main prompt area
- ✅ Images display as previews
- ✅ Vision-enabled models receive images via API
- ✅ Remove image functionality works
- ✅ Basic error handling for upload failures

### Should Have (Full Feature)
- ✅ Image upload in AI Prompt Generator
- ✅ Automatic model filtering for vision capabilities
- ✅ Image optimization (resizing, format conversion)
- ✅ Clear user feedback about vision model usage
- ✅ Export functionality includes image context

### Nice to Have (Future Enhancement)
- ⏳ Multiple image support
- ⏳ Image annotation tools
- ⏳ Drag-and-drop upload
- ⏳ Image history/recent images

## 🚨 Critical Implementation Notes

1. **Security**: Images are processed client-side and sent as base64 - no server storage
2. **Performance**: Implement image compression to manage token limits
3. **Compatibility**: Test with all vision-enabled models (Claude, GPT-4V, Gemini, etc.)
4. **Error Handling**: Graceful failures when vision models are unavailable
5. **State Management**: Clear image state appropriately to prevent memory leaks

## 📁 Files to Modify

1. `myui-app.py` - Main application file (primary changes)
2. `myui_models.json` - Ensure vision_support flags are accurate
3. Requirements: Add `Pillow` to dependencies if not present

## 🔗 Dependencies

```python
# Add to requirements if not present
Pillow>=9.0.0  # For image processing
```

## 📝 Implementation Checklist

- [ ] Phase 1: Basic image upload (MVP)
- [ ] Phase 2: API integration with vision models
- [ ] Phase 3: AI Prompt Generator integration
- [ ] Phase 4: Smart model filtering
- [ ] Phase 5: Error handling and edge cases
- [ ] Phase 6: Playwright test suite
- [ ] Phase 7: User acceptance testing
- [ ] Phase 8: Documentation updates

This PRD provides a complete roadmap for implementing image input functionality in MyUI ParaThinker with comprehensive testing instructions.