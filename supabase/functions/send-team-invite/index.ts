// Using npm: prefix for AWS SDK (per Supabase docs recommendation)
import { SESClient, SendEmailCommand } from 'npm:@aws-sdk/client-ses@3.321.1'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
    restaurantId: string
    restaurantName: string
    inviterName: string
    inviteeEmail: string
    invitationToken: string
}

// ============================================================================
// Email Templates
// ============================================================================

function generateEmailHtml(
    restaurantName: string,
    inviterName: string,
    invitationToken: string,
    isNewUser: boolean
): string {
    const deepLink = `troodie://invite/${invitationToken}`
    const appStoreLink = 'https://apps.apple.com/us/app/troodie/id6746138280'

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation - Troodie</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FFAD27 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"> Troodie</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                                You're Invited! 🎉
                            </h2>
                            
                            <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                <strong>${inviterName}</strong> has invited you to join the team at <strong>${restaurantName}</strong> on Troodie.
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                As a team member, you'll be able to:
                            </p>
                            
                            <ul style="margin: 0 0 30px; padding-left: 20px; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                                <li>Manage the restaurant profile</li>
                                <li>View analytics and insights</li>
                                <li>Respond to customer reviews</li>
                                <li>Collaborate with the team</li>
                            </ul>

                             ${isNewUser ? `
                            <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                                <strong>New user?</strong> After installing and creating your account, return to this email to accept the invitation.
                            </p>
                            ` : `
                            <p style="margin: 20px 0 0; color: #888888; font-size: 14px; line-height: 1.6; text-align: center;">
                                You'll be asked to sign in to your account when you open the app.
                            </p>
                            `}
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="${deepLink}" style="display: inline-block; background: linear-gradient(135deg, #FFAD27 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);">
                                            Open in Troodie
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- App Download Section -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <table role="presentation" style="width: 100%; background-color: #f8f9fa; border-radius: 12px; padding: 20px;">
                                <tr>
                                    <td style="text-align: center; padding: 20px;">
                                        <p style="margin: 0 0 15px; color: #666666; font-size: 14px;">
                                            Don't have the app yet?
                                        </p>
                                        <a href="${appStoreLink}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
                                            Download on App Store
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 10px; color: #888888; font-size: 12px;">
                                This invitation was sent by ${inviterName} via Troodie.
                            </p>
                            <p style="margin: 0; color: #888888; font-size: 12px;">
                                © ${new Date().getFullYear()} Troodie. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `
}

function generateEmailText(
    restaurantName: string,
    inviterName: string,
    invitationToken: string,
    isNewUser: boolean
): string {
    const deepLink = `troodie://invite/${invitationToken}`
    const appStoreLink = 'https://apps.apple.com/us/app/troodie/id6746138280'

    return `
You're Invited to Join ${restaurantName} on Troodie! 🎉

${inviterName} has invited you to join the team at ${restaurantName}.

As a team member, you'll be able to:
• Manage the restaurant profile
• View analytics and insights
• Respond to customer reviews
• Collaborate with the team

Open in Troodie: ${deepLink}

${isNewUser ? "New user? After installing and creating your account, return to this email to accept the invitation." : "You'll be asked to sign in to your account when you open the app."}

Don't have the app yet?
Download on App Store: ${appStoreLink}

---
This invitation was sent by ${inviterName} via Troodie.
© ${new Date().getFullYear()} Troodie. All rights reserved.
    `.trim()
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('[SendTeamInvite] Function started')

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // AWS SES Configuration
        const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!
        const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!
        const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-2'
        const sesFromEmail = Deno.env.get('SES_FROM_EMAIL') || 'team@troodieapp.com'
        const sesFromName = Deno.env.get('SES_FROM_NAME') || 'Troodie'

        console.log('[SendTeamInvite] AWS Config:', {
            region: awsRegion,
            accessKeyId: awsAccessKeyId ? `${awsAccessKeyId.substring(0, 8)}...` : 'NOT SET',
            fromEmail: sesFromEmail,
        })

        // Initialize SES client
        const sesClient = new SESClient({
            region: awsRegion,
            credentials: {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            },
        })

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { restaurantId, restaurantName, inviterName, inviteeEmail, invitationToken }: InviteRequest = await req.json()

        console.log('[SendTeamInvite] Invite details:', {
            restaurantName,
            inviterName,
            inviteeEmail,
            token: invitationToken?.substring(0, 8) + '...',
        })

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const userExists = existingUsers?.users?.some(
            (u: { email?: string }) => u.email?.toLowerCase() === inviteeEmail.toLowerCase()
        )
        const isNewUser = !userExists
        console.log('[SendTeamInvite] User exists:', !isNewUser)

        // Generate email content
        const emailHtml = generateEmailHtml(restaurantName, inviterName, invitationToken, isNewUser)
        const emailText = generateEmailText(restaurantName, inviterName, invitationToken, isNewUser)
        const subject = `You've been invited to join ${restaurantName} on Troodie`
        const fromAddress = `${sesFromName} <${sesFromEmail}>`

        // Create and send email command
        console.log('[SendTeamInvite] Sending email via AWS SES...')
        const sendEmailCommand = new SendEmailCommand({
            Source: fromAddress,
            Destination: {
                ToAddresses: [inviteeEmail],
            },
            Message: {
                Subject: {
                    Charset: 'UTF-8',
                    Data: subject,
                },
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: emailHtml,
                    },
                    Text: {
                        Charset: 'UTF-8',
                        Data: emailText,
                    },
                },
            },
        })

        const result = await sesClient.send(sendEmailCommand)

        console.log('[SendTeamInvite] ✅ Email sent! MessageId:', result.MessageId)

        return new Response(
            JSON.stringify({
                success: true,
                method: isNewUser ? 'invite_new' : 'invite_existing',
                message: `Invitation email sent to ${isNewUser ? 'new' : 'existing'} user.`,
                mobileLink: `troodie://invite/${invitationToken}`,
                messageId: result.MessageId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('[SendTeamInvite] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
