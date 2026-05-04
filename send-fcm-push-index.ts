// Supabase Edge Function: send-fcm-push
// Sends push notifications via Firebase Cloud Messaging V1 API
// Uses DATA-ONLY messages so Service Worker handles display (prevents duplicates)
// All keys use lowercase (postid, posttype) to match Supabase and client code

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_PROJECT_ID = 'umbrella-6b57a'
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || ''
const FIREBASE_PRIVATE_KEY = (Deno.env.get('FIREBASE_PRIVATE_KEY') || '').replace(/\\n/g, '\n')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }

  const base64UrlEncode = (obj: object) => {
    const json = JSON.stringify(obj)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const headerEncoded = base64UrlEncode(header)
  const payloadEncoded = base64UrlEncode(payload)
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`

  const pemContents = FIREBASE_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const jwt = `${unsignedToken}.${signatureEncoded}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenResponse.json()
  
  if (!tokenData.access_token) {
    console.error('Token exchange failed:', tokenData)
    throw new Error('Failed to get FCM access token')
  }

  return tokenData.access_token
}

async function sendFcmMessage(
  accessToken: string, 
  fcmToken: string, 
  title: string, 
  body: string, 
  data: Record<string, string> = {}
) {
  // DATA-ONLY message - no "notification" field
  // All keys lowercase to match client code expectations
  const message = {
    message: {
      token: fcmToken,
      data: {
        title: title,
        body: body,
        type: data.type || '',
        postid: data.postid || '',
        posttype: data.posttype || data.type || '',
        communityid: data.communityid || ''
      },
      webpush: {
        fcm_options: {
          link: `/Umbrella/resident.html?postid=${data.postid || ''}&posttype=${data.posttype || ''}`
        }
      },
      android: {
        priority: 'high'
      }
    }
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  )

  const result = await response.json()
  
  if (!response.ok) {
    return { success: false, error: result.error?.message || 'FCM send failed' }
  }

  return { success: true, messageId: result.name }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const record = payload.record || payload
    
    console.log('📤 FCM PUSH - Notification ID:', record.id)
    console.log('Community:', record.communityid, 'Type:', record.type)
    console.log('PostID:', record.postid, 'PostType:', record.posttype)

    if (!record.communityid) {
      throw new Error('Missing communityid')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let query = supabase
      .from('users')
      .select('id, name, fcmtoken')
      .eq('communityid', record.communityid)
      .eq('isapproved', true)
      .not('fcmtoken', 'is', null)
      .neq('fcmtoken', '')

    if (record.targetuserid) {
      query = query.eq('id', record.targetuserid)
    }
    
    if (record.createdby) {
      query = query.neq('id', record.createdby)
    }

    const { data: users, error: usersError } = await query

    if (usersError) throw usersError

    console.log(`📱 Found ${users?.length || 0} users with FCM tokens`)

    if (!users || users.length === 0) {
      await supabase
        .from('notifications')
        .update({ status: 'sent', sentat: new Date().toISOString(), error: 'No users with FCM tokens' })
        .eq('id', record.id)

      return new Response(JSON.stringify({ success: true, sent: 0 }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const accessToken = await getAccessToken()
    console.log('✅ Got FCM access token')

    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    const invalidTokens: string[] = []

    for (const user of users) {
      if (!user.fcmtoken) continue

      const result = await sendFcmMessage(
        accessToken, 
        user.fcmtoken, 
        record.title || 'New Notification',
        record.body || '',
        {
          type: record.type || '',
          postid: record.postid || '',
          posttype: record.posttype || record.type || '',
          communityid: record.communityid || ''
        }
      )

      if (result.success) {
        successCount++
        console.log(`✅ Sent to ${user.name}`)
      } else {
        failCount++
        errors.push(`${user.name}: ${result.error}`)
        console.log(`❌ Failed for ${user.name}: ${result.error}`)

        if (result.error?.includes('UNREGISTERED') || result.error?.includes('not found')) {
          invalidTokens.push(user.id)
        }
      }
    }

    if (invalidTokens.length > 0) {
      await supabase.from('users').update({ fcmtoken: null }).in('id', invalidTokens)
    }

    await supabase
      .from('notifications')
      .update({
        status: failCount === 0 ? 'sent' : (successCount > 0 ? 'partial' : 'failed'),
        sentat: new Date().toISOString(),
        error: errors.length > 0 ? errors.slice(0, 3).join('; ') : null
      })
      .eq('id', record.id)

    console.log(`📊 RESULT: ${successCount} sent, ${failCount} failed`)

    return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
