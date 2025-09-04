#  URL Shortener Microservice  

A microservice that provides robust HTTP URL shortening functionality with logging, validation, redirection, and analytics.  

---

## Features & Requirements  

### 1. Mandatory Logging Integration
- Uses a **custom Logging Middleware** (not `console.log` or built-in loggers).  
- Logs:  
  - Requests  
  - Responses  
  - Errors  
  - Business events (creation of short URLs, redirects, etc.)  

### 2. Microservice Architecture
- A single microservice exposing RESTful API endpoints.  

### 3. Authentication
- APIs are **pre-authorized** (no login/registration required).  

### 4. Short Link Uniqueness
- Each shortcode is **globally unique**.  

### 5. Default Validity
- If no validity provided → defaults to **30 minutes**.  
- Validity must always be an **integer (minutes)**.  

### 6. Custom Shortcodes
- User may provide a **custom shortcode** (alphanumeric, reasonable length).  
- If invalid or already taken → return error.  
- If not provided → service **generates automatically**.  

---

## API Endpoints  

### 1. Create Short URL  
- **Method**: `POST`  
- **Route**: `/shorturls`  

#### Request Body:
```json
{
  "url": "https://example.com/very/long/link",
  "validity": 30,
  "shortcode": "abcd1"
}

```
#### Response
<img width="1380" height="724" alt="Screenshot 2025-09-04 121148" src="https://github.com/user-attachments/assets/09a54b67-ecb6-4fa7-a0ef-244abca46dca" />

### 2. Retrieve Short URL Statistics
- **Method**: `GET`  
- **Route**: `/shorturls/:code`

#### Response
<img width="1338" height="710" alt="Screenshot 2025-09-04 121207" src="https://github.com/user-attachments/assets/5a7b8187-f26c-445d-b6ae-4fa8e8ace5ad" />


### 3. Preview
- **Method**: `GET`  
- **Route**: `/shorturls/:code`

#### Response
<img width="1349" height="649" alt="Screenshot 2025-09-04 121252" src="https://github.com/user-attachments/assets/36b2f33e-dffc-4dfd-8d2a-66bfdfb0ca15" />

