Developed a microservice of url shortener with 
Mandatory Logging Integration

MUST use the custom Logging Middleware (not console.log / default loggers).

Log requests, responses, errors, and business events (like creation, redirect).

Microservice Architecture

A single microservice that exposes specified RESTful API endpoints.

Authentication

Assume APIs are pre-authorized (no login/signup needed).

Short Link Uniqueness

Every shortcode must be globally unique.

Default Validity

If no validity is provided → default = 30 minutes.

Validity is always an integer representing minutes.

Custom Shortcodes

User can provide a shortcode (alphanumeric, reasonable length).

If invalid or already taken → reject with error.

If not provided → generate automatically.

According to the problem statement

1. Create Short URL

Method: POST

Route: /shorturls

Request body:

<img width="1380" height="724" alt="Screenshot 2025-09-04 121148" src="https://github.com/user-attachments/assets/5feb30f1-faf9-49e1-ab36-e6b5b0226710" />
2. Retrieve Short URL Statistics

Method: GET

Route: /shorturls/:code

Response JSON must include:

total clicks

original URL

creation date

expiry date

detailed click data:

timestamp of click

referrer (source)

coarse-grained geographical location

<img width="1338" height="710" alt="Screenshot 2025-09-04 121207" src="https://github.com/user-attachments/assets/0d04f4fc-bef8-4bee-a685-83ea44b007f0" />

Redirection

Method: GET

Route: /:code

<img width="1349" height="649" alt="Screenshot 2025-09-04 121252" src="https://github.com/user-attachments/assets/1b3772b1-ba28-4047-bce9-0402260000f7" />


