# WhatsApp Business API - Quick Reference

## API Endpoints

### Send Message

```
POST https://graph.facebook.com/v21.0/{phone-number-id}/messages
```

### Upload Media

```
POST https://graph.facebook.com/v21.0/{phone-number-id}/media
```

## Request Headers

```json
{
  "Authorization": "Bearer {access-token}",
  "Content-Type": "application/json"
}
```

## Send OTP Template Message

### Request Payload

```json
{
  "messaging_product": "whatsapp",
  "to": "+919876543210",
  "type": "template",
  "template": {
    "name": "otp_verification",
    "language": {
      "code": "en"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "123456"
          },
          {
            "type": "text",
            "text": "10"
          }
        ]
      }
    ]
  }
}
```

### Success Response

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "+919876543210",
      "wa_id": "919876543210"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQzg5RjdGNEY0RjY5MjlGNjdEAA=="
    }
  ]
}
```

### Error Response

```json
{
  "error": {
    "message": "Template does not exist in the translation",
    "type": "OAuthException",
    "code": 131031,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Template name or language not found"
    },
    "fbtrace_id": "AXYz123..."
  }
}
```

## Webhook Events

### Webhook Verification (GET)

**Query Parameters:**

- `hub.mode`: "subscribe"
- `hub.verify_token`: Your verify token
- `hub.challenge`: Random string to return

**Response:**
Return the `hub.challenge` value as plain text.

### Message Status Update (POST)

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQzg5RjdGNEY0RjY5MjlGNjdEAA==",
                "status": "delivered",
                "timestamp": "1234567890",
                "recipient_id": "919876543210",
                "conversation": {
                  "id": "CONVERSATION_ID",
                  "origin": {
                    "type": "business_initiated"
                  }
                },
                "pricing": {
                  "billable": true,
                  "pricing_model": "CBP",
                  "category": "authentication"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Message Status Types

- **sent**: Message sent to WhatsApp server
- **delivered**: Message delivered to recipient's device
- **read**: Message read by recipient
- **failed**: Message delivery failed

### Failed Message Status

```json
{
  "statuses": [
    {
      "id": "wamid.HBgLOTE5ODc2NTQzMjEwFQIAERgSQzg5RjdGNEY0RjY5MjlGNjdEAA==",
      "status": "failed",
      "timestamp": "1234567890",
      "recipient_id": "919876543210",
      "errors": [
        {
          "code": 131047,
          "title": "Re-engagement message",
          "message": "Re-engagement message",
          "error_data": {
            "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
          }
        }
      ]
    }
  ]
}
```

## Common Error Codes

| Code   | Error                    | Description                        | Solution                                 |
| ------ | ------------------------ | ---------------------------------- | ---------------------------------------- |
| 131031 | Template does not exist  | Template not found or not approved | Verify template name and approval status |
| 131047 | Re-engagement message    | 24-hour window expired             | User needs to initiate conversation      |
| 131051 | Unsupported message type | Invalid message format             | Check message structure                  |
| 133016 | Rate limit exceeded      | Too many requests                  | Implement rate limiting                  |
| 100    | Invalid parameter        | Missing or invalid parameter       | Check request payload                    |
| 190    | Access token expired     | Token is invalid or expired        | Generate new access token                |

## Phone Number Format

### E.164 Format

**Format**: `+[country code][number]`

**Examples:**

- India: `+919876543210`
- US: `+14155551234`
- UK: `+447911123456`

**Validation Regex:**

```regex
^\+[1-9]\d{1,14}$
```

## Template Variables

### Body Parameters

```json
{
  "type": "body",
  "parameters": [
    {
      "type": "text",
      "text": "value1"
    },
    {
      "type": "text",
      "text": "value2"
    }
  ]
}
```

### Header Parameters (if needed)

```json
{
  "type": "header",
  "parameters": [
    {
      "type": "text",
      "text": "Header value"
    }
  ]
}
```

### Button Parameters (if needed)

```json
{
  "type": "button",
  "sub_type": "url",
  "index": "0",
  "parameters": [
    {
      "type": "text",
      "text": "dynamic-url-part"
    }
  ]
}
```

## Rate Limits

### Cloud API Limits

- **Messaging**: 1000 messages per second per phone number
- **Business Account**: 250 phone numbers per business account
- **Template Messages**: Tier-based (1K, 10K, 100K, unlimited)

### Tier Progression

1. **Tier 1**: 1,000 unique customers in 24 hours
2. **Tier 2**: 10,000 unique customers in 24 hours
3. **Tier 3**: 100,000 unique customers in 24 hours
4. **Tier 4**: Unlimited

## Testing

### Test Numbers

Add test numbers in Meta for Developers:

1. Go to WhatsApp > API Setup
2. Add phone numbers under "Test Numbers"
3. Verify the numbers via SMS
4. Use these numbers for testing

### Sandbox Mode

- Available for testing before business verification
- Limited to 5 test numbers
- Same API endpoints and structure
- No cost for messages

## Best Practices

1. **Always validate phone numbers** before sending
2. **Implement exponential backoff** for retries
3. **Log all API responses** for debugging
4. **Monitor webhook events** for delivery status
5. **Use template messages** for business-initiated conversations
6. **Respect rate limits** to avoid blocking
7. **Handle errors gracefully** with user-friendly messages
8. **Secure your access token** (never commit to version control)
9. **Use HTTPS** for all webhook endpoints
10. **Implement proper logging** for audit trails

## Environment Variables Template

```env
# WhatsApp Business API Configuration
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBO...
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my_secure_random_token_12345

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_PER_HOUR=3
```

## cURL Examples

### Send OTP Message

```bash
curl -X POST \
  'https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "otp_verification",
      "language": {
        "code": "en"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "123456"
            },
            {
              "type": "text",
              "text": "10"
            }
          ]
        }
      ]
    }
  }'
```

### Verify Webhook

```bash
curl -X GET \
  'https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING'
```

## Useful Links

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
